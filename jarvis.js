/* =========================================================
   JARVIS — Asistente de ventas por voz para Aquarium Fish
   Capa independiente: no modifica la estructura de db ni app.js.
   ========================================================= */

(function(){
  "use strict";

  const NUMBER_WORDS = {
    "cero":0,"un":1,"uno":1,"una":1,"dos":2,"tres":3,"cuatro":4,
    "cinco":5,"seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,
    "once":11,"doce":12,"trece":13,"catorce":14,"quince":15,
    "dieciseis":16,"dieciséis":16,"diecisiete":17,"dieciocho":18,
    "diecinueve":19,"veinte":20
  };

  function normalize(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[¿?¡!.,;:()[\]{}]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function money(n){
    return new Intl.NumberFormat("es-CO",{
      style:"currency",currency:"COP",maximumFractionDigits:0
    }).format(Number(n)||0);
  }

  function numberFromText(text){
    const t=normalize(text);
    const m=t.match(/\b(\d+(?:[.,]\d+)?)\b/);
    if(m) return Math.max(0, Math.floor(Number(m[1].replace(",","."))));
    for(const [word,value] of Object.entries(NUMBER_WORDS)){
      if(new RegExp("\\b"+word+"\\b").test(t)) return value;
    }
    return null;
  }

  function productCandidates(){
    if(!Array.isArray(window.db?.products)) return [];
    return window.db.products
      .map((p,index)=>({p,index,name:normalize(p.name)}))
      .filter(x=>x.name)
      .sort((a,b)=>b.name.length-a.name.length);
  }

  function findProduct(segment){
    const s=normalize(segment);
    const candidates=productCandidates();
    let best=null;

    for(const c of candidates){
      if(s.includes(c.name)){
        best=c; break;
      }
      // Permite plural simple: "bailarinas" -> "bailarina".
      if(c.name.length>4 && s.includes(c.name+"s")){
        best=c; break;
      }
    }

    if(best) return best;

    // Coincidencia por palabras: útil cuando el usuario dice "comida para peces"
    const words=s.split(" ").filter(Boolean);
    return candidates.find(c=>{
      const cw=c.name.split(" ").filter(Boolean);
      return cw.length && cw.every(w=>words.includes(w) || words.includes(w+"s"));
    }) || null;
  }

  function parseCommand(command){
    const text=normalize(command);
    if(!text) return {items:[],unknown:[]};

    const segments=text
      .split(/\s*(?:,|\by\b|\be\b|\+\s*)\s*/i)
      .map(s=>s.trim())
      .filter(Boolean);

    const items=[];
    const unknown=[];

    for(const segment of segments){
      const product=findProduct(segment);
      if(!product){
        unknown.push(segment);
        continue;
      }
      const qty=numberFromText(segment) ?? 1;
      items.push({
        productIndex:product.index,
        name:product.p.name,
        qty:Math.max(1,qty),
        price:+product.p.price||0,
        cost:+product.p.cost||0,
        stock:+product.p.stock||0
      });
    }

    // Si la separación falló, intenta detectar varios productos directamente.
    if(!items.length){
      for(const c of productCandidates()){
        const plural=c.name.length>4 ? c.name+"s" : c.name;
        if(text.includes(c.name) || text.includes(plural)){
          const before=text.slice(Math.max(0,text.indexOf(c.name)-25), text.indexOf(c.name));
          items.push({
            productIndex:c.index,name:c.p.name,
            qty:Math.max(1,numberFromText(before) ?? 1),
            price:+c.p.price||0,cost:+c.p.cost||0,stock:+c.p.stock||0
          });
        }
      }
    }

    // Combina el mismo producto si fue detectado más de una vez.
    const merged=[];
    for(const item of items){
      const existing=merged.find(x=>x.productIndex===item.productIndex);
      if(existing) existing.qty+=item.qty;
      else merged.push({...item});
    }

    return {items:merged,unknown};
  }

  function openJarvis(){
    const modalEl=document.getElementById("jarvisPanel");
    if(modalEl) modalEl.classList.add("open");
    updateStatus("Listo. Dime qué productos quieres vender.");
    renderResult(null);
  }

  function closeJarvis(){
    const el=document.getElementById("jarvisPanel");
    if(el) el.classList.remove("open");
    stopListening();
  }

  function updateStatus(text){
    const el=document.getElementById("jarvisStatus");
    if(el) el.textContent=text;
  }

  function renderResult(result){
    const box=document.getElementById("jarvisResult");
    if(!box) return;
    if(!result){
      box.innerHTML='<div class="jarvis-empty">Ejemplo: <b>“3 bailarinas, 2 koi y una comida para peces”</b></div>';
      return;
    }

    if(!result.items.length){
      box.innerHTML='<div class="jarvis-error">No encontré productos con esos nombres en el inventario.</div>';
      return;
    }

    let total=0,profit=0,stockWarning=[];
    const rows=result.items.map(item=>{
      const subtotal=item.price*item.qty;
      total+=subtotal;
      profit+=(item.price-item.cost)*item.qty;
      if(item.qty>item.stock) stockWarning.push(`${item.name}: solicitas ${item.qty}, hay ${item.stock}`);
      return `<div class="jarvis-line"><span>${item.qty} × ${escapeHtml(item.name)}</span><b>${money(subtotal)}</b></div>`;
    }).join("");

    const unknown=result.unknown.length
      ? `<div class="jarvis-warning">No reconocí: ${result.unknown.map(escapeHtml).join(", ")}</div>`:"";
    const stock=stockWarning.length
      ? `<div class="jarvis-warning">⚠️ Stock insuficiente: ${stockWarning.map(escapeHtml).join(" · ")}</div>`:"";

    box.innerHTML=`
      <div class="jarvis-lines">${rows}</div>
      ${unknown}${stock}
      <div class="jarvis-total"><span>Total</span><b>${money(total)}</b></div>
      <div class="jarvis-actions">
        <button type="button" class="primary" id="jarvisPrepareSale">🧾 Preparar venta</button>
        <button type="button" id="jarvisClear">Limpiar</button>
      </div>
    `;

    document.getElementById("jarvisClear")?.addEventListener("click",()=>{
      const input=document.getElementById("jarvisInput");
      if(input) input.value="";
      renderResult(null);
      updateStatus("Listo para otra venta.");
    });

    document.getElementById("jarvisPrepareSale")?.addEventListener("click",()=>{
      // Solo prepara el formulario existente. La venta NO se registra
      // hasta que el usuario la confirme en Aquarium Fish.
      if(typeof window.openSale==="function"){
        window.openSale({
          customer:"",
          items:result.items.map(item=>({
            productIndex:item.productIndex,
            qty:item.qty
          }))
        });
        closeJarvis();
      }else{
        updateStatus("No pude abrir el formulario de ventas.");
      }
    });
  }

  function escapeHtml(s){
    return String(s??"").replace(/[&<>"']/g,m=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }

  let recognition=null;
  let listening=false;

  function getRecognition(){
    const R=window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!R) return null;
    if(recognition) return recognition;
    recognition=new R();
    recognition.lang="es-CO";
    recognition.interimResults=false;
    recognition.continuous=false;

    recognition.onstart=()=>{
      listening=true;
      updateStatus("🎙️ Te escucho…");
      document.getElementById("jarvisMic")?.classList.add("listening");
    };
    recognition.onend=()=>{
      listening=false;
      document.getElementById("jarvisMic")?.classList.remove("listening");
      if(!document.getElementById("jarvisStatus")?.textContent.includes("No pude"))
        updateStatus("Listo.");
    };
    recognition.onerror=(event)=>{
      listening=false;
      document.getElementById("jarvisMic")?.classList.remove("listening");
      updateStatus(event.error==="not-allowed"
        ? "Permite el micrófono en Chrome para usar la voz."
        : "No pude reconocer la voz. También puedes escribir el pedido.");
    };
    recognition.onresult=(event)=>{
      const transcript=event.results?.[0]?.[0]?.transcript || "";
      const input=document.getElementById("jarvisInput");
      if(input) input.value=transcript;
      processCommand(transcript);
    };
    return recognition;
  }

  function startListening(){
    const r=getRecognition();
    if(!r){
      updateStatus("La voz no está disponible en este navegador. Puedes escribir el pedido.");
      return;
    }
    if(listening) return;
    try{ r.start(); }catch(e){}
  }

  function stopListening(){
    if(recognition && listening){
      try{ recognition.stop(); }catch(e){}
    }
  }

  function speak(text){
    if(!("speechSynthesis" in window)) return;
    try{
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang="es-CO";
      u.rate=1;
      u.pitch=1;
      window.speechSynthesis.speak(u);
    }catch(e){}
  }

  function processCommand(command){
    const result=parseCommand(command);
    renderResult(result);
    if(result.items.length){
      const total=result.items.reduce((sum,item)=>sum+(item.price*item.qty),0);
      const resumen=result.items.map(item=>`${item.qty} ${item.name}`).join(", ");
      updateStatus(`Encontré ${result.items.length} producto(s). Total: ${money(total)}.`);
      speak(`Encontré ${resumen}. El total es ${money(total)}. ¿Deseas preparar la venta?`);
    }else{
      updateStatus("No encontré esos productos en el inventario.");
      speak("No encontré esos productos en el inventario.");
    }
    return result;
  }

  function buildUI(){
    if(document.getElementById("jarvisPanel")) return;

    const header=document.getElementById("appHeader");
    if(!header) return;

    const button=document.createElement("button");
    button.type="button";
    button.id="jarvisOpen";
    button.className="ghost jarvis-open";
    button.textContent="🤖 JARVIS";
    button.title="Asistente de ventas";
    button.addEventListener("click",openJarvis);

    const logout=document.getElementById("logoutBtn");
    if(logout) logout.insertAdjacentElement("beforebegin",button);
    else header.querySelector("div:last-child")?.appendChild(button);

    const panel=document.createElement("div");
    panel.id="jarvisPanel";
    panel.className="jarvis-overlay";
    panel.innerHTML=`
      <div class="jarvis-card" role="dialog" aria-modal="true" aria-labelledby="jarvisTitle">
        <div class="jarvis-head">
          <div>
            <div class="jarvis-kicker">AQUARIUM FISH</div>
            <h2 id="jarvisTitle">🤖 JARVIS</h2>
            <p>Asistente rápido para preparar ventas con tus precios reales.</p>
          </div>
          <button type="button" class="jarvis-close" aria-label="Cerrar">×</button>
        </div>
        <div class="jarvis-input-row">
          <input id="jarvisInput" type="text" autocomplete="off"
            placeholder="Ej.: 3 bailarinas, 2 koi y una comida">
          <button type="button" id="jarvisMic" class="jarvis-mic" title="Hablar">🎙️</button>
        </div>
        <div id="jarvisStatus" class="jarvis-status">Listo.</div>
        <div id="jarvisResult" class="jarvis-result"></div>
        <div class="jarvis-foot">
          <span>JARVIS no registra la venta automáticamente: primero prepara el formulario y tú confirmas.</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector(".jarvis-close").addEventListener("click",closeJarvis);
    panel.addEventListener("click",e=>{if(e.target===panel) closeJarvis();});
    document.getElementById("jarvisMic").addEventListener("click",startListening);
    document.getElementById("jarvisInput").addEventListener("keydown",e=>{
      if(e.key==="Enter") processCommand(e.target.value);
    });
  }

  function boot(){
    // app.js define db antes de que se cargue este archivo.
    buildUI();
  }

  window.JARVIS={
    open:openJarvis,
    close:closeJarvis,
    listen:startListening,
    process:processCommand,
    parse:parseCommand
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
