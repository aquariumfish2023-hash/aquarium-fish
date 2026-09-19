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
    const value=new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(Number(n)||0);
    return `COP $${value}`;
  }

  // JARVIS siempre habla en pesos colombianos. Evita que el navegador
  // interprete el símbolo "$" como dólares al usar la voz.
  function moneyForSpeech(n){
    const value=new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(Number(n)||0);
    return `${value} pesos colombianos`;
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

  function isToday(value){
    if(!value) return false;
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return false;
    const n=new Date();
    return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
  }

  function paidSale(sale){
    if(sale?.paid!=null) return Math.max(0,Number(sale.paid)||0);
    if(sale?.abono!=null) return Math.max(0,Number(sale.abono)||0);
    if(String(sale?.status||'').toLowerCase().includes('pag')) return Number(sale?.total)||0;
    return 0;
  }

  function businessQuery(command){
    const t=normalize(command);
    const sales=Array.isArray(window.db?.sales)?window.db.sales:[];
    const products=Array.isArray(window.db?.products)?window.db.products:[];
    const customers=Array.isArray(window.db?.customers)?window.db.customers:[];
    const quotes=Array.isArray(window.db?.quotes)?window.db.quotes:[];
    const orders=Array.isArray(window.db?.orders)?window.db.orders:[];
    const cash=Array.isArray(window.db?.cash)?window.db.cash:[];

    // Resumen integral del negocio: reúne los indicadores más útiles en una sola respuesta.
    if(/\b(resumen|reporte|estado)\b.*\b(negocio|hoy|dia|día)\b/.test(t) || /\bcomo va (el )?negocio\b/.test(t) || /\bdame (el )?resumen\b/.test(t)){
      const todaySales=sales.filter(s=>isToday(s.date||s.createdAt));
      const todayTotal=todaySales.reduce((a,s)=>a+(Number(s.total)||0),0);
      const todayReceived=todaySales.reduce((a,s)=>a+paidSale(s),0);
      const todayExpenses=cash.filter(m=>String(m.type||'').toLowerCase()==='gasto' && isToday(m.date||m.createdAt)).reduce((a,m)=>a+(Number(m.amount)||0),0);
      const receivable=sales.reduce((a,s)=>a+Math.max(0,(Number(s.total)||0)-paidSale(s)),0);
      const zero=products.filter(p=>(Number(p.stock)||0)<=0);
      const low=products.filter(p=>(Number(p.stock)||0)>0 && (Number(p.stock)||0)<=(Number(p.min)||0));
      const pending=quotes.filter(q=>!q.convertedSaleId && !['Rechazada','Cancelada'].includes(String(q.status||'')));
      const active=orders.filter(o=>!['Entregado','Cancelado'].includes(String(o.status||'Pendiente')));
      const cashBalance=cash.reduce((a,m)=>a+(String(m.type||'').toLowerCase()==='gasto'?-Math.abs(Number(m.amount)||0):Math.abs(Number(m.amount)||0)),0);
      const net=todayReceived-todayExpenses;
      const text=[
        `Ventas de hoy: ${todaySales.length} por ${money(todayTotal)}.`,
        `Recibido hoy: ${money(todayReceived)}.`,
        `Gastos de hoy: ${money(todayExpenses)}.`,
        `Resultado de caja del día: ${money(net)}.`,
        `Por cobrar: ${money(receivable)}.`,
        `Inventario: ${low.length} productos con stock bajo y ${zero.length} agotados.`,
        `Cotizaciones pendientes: ${pending.length}.`,
        `Encargos activos: ${active.length}.`,
        `Saldo calculado de caja: ${money(cashBalance)}.`
      ].join(' ');
      return {title:'Resumen del negocio',text,speak:`Resumen de hoy. Vendiste ${moneyForSpeech(todayTotal)} en ${todaySales.length} ventas. Recibiste ${moneyForSpeech(todayReceived)}, tuviste ${moneyForSpeech(todayExpenses)} en gastos y el resultado de caja del día es ${moneyForSpeech(net)}. Hay ${pending.length} cotizaciones pendientes, ${active.length} encargos activos, ${low.length} productos con stock bajo y ${zero.length} agotados. Tienes ${moneyForSpeech(receivable)} por cobrar.`};
    }

    if(/\b(ventas?|vendimos|vendido)\b.*\b(hoy|dia|día)\b/.test(t) || /\bcuanto vendimos hoy\b/.test(t)){
      const rows=sales.filter(s=>isToday(s.date||s.createdAt));
      const total=rows.reduce((a,s)=>a+(Number(s.total)||0),0);
      return {title:'Ventas de hoy',text:`Hoy tienes ${rows.length} venta${rows.length===1?'':'s'} por ${money(total)}.`,speak:`Hoy tienes ${rows.length} ventas por ${moneyForSpeech(total)}.`};
    }
    if(/\b(inventario|stock)\b.*\b(bajo|bajos|agotado|agotados|alertas?|sin stock)\b/.test(t) || /\bproductos\b.*\b(esta|estan|está|están|con)\b.*\b(bajo|bajos|agotado|agotados|alerta|stock)\b/.test(t) || /\bproductos (bajos|agotados)\b/.test(t)){
      const zero=products.filter(p=>(Number(p.stock)||0)<=0);
      const low=products.filter(p=>(Number(p.stock)||0)>0 && (Number(p.stock)||0)<=(Number(p.min)||0));
      const names=[...zero.slice(0,4).map(p=>`${p.name} agotado`),...low.slice(0,4).map(p=>`${p.name} bajo`)];
      return {title:'Alertas de inventario',text:`Agotados: ${zero.length}. Stock bajo: ${low.length}.${names.length?` ${names.join(' · ')}`:''}`,speak:`Tienes ${zero.length} productos agotados y ${low.length} con stock bajo.`};
    }
    if(/\b(cotizaciones?|cotizacion)\b.*\b(pendientes?|abiertas?)\b/.test(t) || /\bcotizaciones pendientes\b/.test(t)){
      const pending=quotes.filter(q=>!q.convertedSaleId && !['Rechazada','Cancelada'].includes(String(q.status||'')));
      const total=pending.reduce((a,q)=>a+(Number(q.total)||0),0);
      return {title:'Cotizaciones pendientes',text:`Hay ${pending.length} cotización${pending.length===1?'':'es'} pendientes por ${money(total)}.`,speak:`Hay ${pending.length} cotizaciones pendientes por ${moneyForSpeech(total)}.`};
    }
    if(/\b(encargos?|pedidos?)\b.*\b(activos?|pendientes?)\b/.test(t) || /\bencargos activos\b/.test(t)){
      const active=orders.filter(o=>!['Entregado','Cancelado'].includes(String(o.status||'Pendiente')));
      return {title:'Encargos activos',text:`Tienes ${active.length} encargo${active.length===1?'':'s'} activo${active.length===1?'':'s'}.`,speak:`Tienes ${active.length} encargos activos.`};
    }
    if(/\b(clientes?|cliente)\b.*\b(saldo|deben|pendiente)\b/.test(t) || /\bsaldo pendiente\b/.test(t)){
      const balances=customers.map(c=>{
        const name=c.name||'Cliente';
        const bought=sales.filter(s=>s.client===name).reduce((a,s)=>a+(Number(s.total)||0),0);
        const paid=sales.filter(s=>s.client===name).reduce((a,s)=>a+paidSale(s),0);
        const extra=Array.isArray(c.payments)?c.payments.reduce((a,x)=>a+(Number(x.amount)||0),0):0;
        return {name,balance:Math.max(0,bought-paid-extra)};
      }).filter(x=>x.balance>0).sort((a,b)=>b.balance-a.balance);
      const total=balances.reduce((a,x)=>a+x.balance,0);
      const top=balances.slice(0,4).map(x=>`${x.name}: ${money(x.balance)}`).join(' · ');
      return {title:'Saldos pendientes',text:`Clientes con saldo: ${balances.length}. Total pendiente: ${money(total)}.${top?` ${top}`:''}`,speak:`Hay ${balances.length} clientes con saldo pendiente por ${moneyForSpeech(total)}.`};
    }
    if(/\b(caja|efectivo)\b/.test(t) && /\b(cuanto|cuánta|cuanto hay|saldo|total)\b/.test(t)){
      const balance=cash.reduce((a,m)=>a + (String(m.type||'').toLowerCase()==='gasto' ? -Math.abs(Number(m.amount)||0) : Math.abs(Number(m.amount)||0)),0);
      return {title:'Caja',text:`El saldo calculado de los movimientos de caja es ${money(balance)}.`,speak:`El saldo calculado de caja es ${moneyForSpeech(balance)}.`};
    }
    return null;
  }

  function actionQuery(command){
    const t=normalize(command);
    const actions=[
      {re:/\b(nueva|nuevo|crear|crea|agregar)\b.*\bventa\b|\babrir\b.*\bnueva venta\b/, fn:()=>window.openSale?.(), title:'Nueva venta', text:'Abrí el formulario para crear una nueva venta.', speak:'Listo. Abrí la nueva venta.'},
      {re:/\b(nueva|nuevo|crear|crea|agregar)\b.*\b(cotizacion|cotización)\b|\babrir\b.*\bcotizador\b/, fn:()=>window.show?.('cotizador'), title:'Cotizador', text:'Abrí el cotizador.', speak:'Listo. Abrí el cotizador.'},
      {re:/\b(nuevo|crear|crea|agregar)\b.*\bcliente\b/, fn:()=>window.openCustomer?.(), title:'Nuevo cliente', text:'Abrí el formulario para crear un cliente.', speak:'Listo. Abrí el formulario de nuevo cliente.'},
      {re:/\b(nuevo|crear|crea|agregar)\b.*\b(encargo|pedido)\b/, fn:()=>window.openOrder?.(), title:'Nuevo encargo', text:'Abrí el formulario para crear un encargo.', speak:'Listo. Abrí el formulario de nuevo encargo.'},
      {re:/\babrir\b.*\b(inventario|stock)\b|\bmu[eé]strame\b.*\binventario\b/, fn:()=>window.show?.('inventory'), title:'Inventario', text:'Abrí el inventario.', speak:'Listo. Abrí el inventario.'},
      {re:/\babrir\b.*\b(ventas?|ventas del negocio)\b|\bmu[eé]strame\b.*\bventas\b/, fn:()=>window.show?.('sales'), title:'Ventas', text:'Abrí el módulo de ventas.', speak:'Listo. Abrí ventas.'},
      {re:/\babrir\b.*\b(caja|efectivo)\b|\bmu[eé]strame\b.*\bcaja\b/, fn:()=>window.show?.('cash'), title:'Caja', text:'Abrí caja.', speak:'Listo. Abrí caja.'},
      {re:/\babrir\b.*\b(clientes?|clientes)\b|\bmu[eé]strame\b.*\bclientes\b/, fn:()=>window.show?.('customers'), title:'Clientes', text:'Abrí clientes.', speak:'Listo. Abrí clientes.'},
      {re:/\babrir\b.*\b(encargos?|pedidos?)\b|\bmu[eé]strame\b.*\bencargos\b/, fn:()=>window.show?.('orders'), title:'Encargos', text:'Abrí encargos.', speak:'Listo. Abrí encargos.'},
      {re:/\babrir\b.*\b(reportes?|informes?)\b|\bmu[eé]strame\b.*\breportes\b/, fn:()=>window.show?.('reports'), title:'Reportes', text:'Abrí reportes.', speak:'Listo. Abrí reportes.'},
      {re:/\babrir\b.*\b(m[aá]s|opciones)\b/, fn:()=>window.show?.('more'), title:'Más opciones', text:'Abrí Más opciones.', speak:'Listo. Abrí Más opciones.'},
      {re:/\bvolver\b.*\b(inicio|home)\b|\bir\b.*\binicio\b/, fn:()=>window.show?.('home'), title:'Inicio', text:'Volví al inicio.', speak:'Listo. Volví al inicio.'}
    ];
    const hit=actions.find(a=>a.re.test(t));
    if(!hit) return null;
    try{ hit.fn(); }catch(e){ console.error('JARVIS action',e); }
    return {title:hit.title,text:hit.text,speak:hit.speak};
  }

  function renderBusinessResult(result){
    const box=document.getElementById('jarvisResult');
    if(!box || !result) return;
    box.innerHTML=`<div class="jarvis-business"><div class="jarvis-business-title">📊 ${escapeHtml(result.title)}</div><div class="jarvis-business-text">${escapeHtml(result.text)}</div></div>`;
  }

  function processCommand(command){
    const action=actionQuery(command);
    if(action){
      renderBusinessResult(action);
      updateStatus(action.text);
      speak(action.speak);
      return action;
    }
    const q=businessQuery(command);
    if(q){
      renderBusinessResult(q);
      updateStatus(q.text);
      speak(q.speak);
      return q;
    }
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
            <p>Asistente del negocio: consulta ventas, caja, inventario, clientes y cotizaciones.</p>
          </div>
          <button type="button" class="jarvis-close" aria-label="Cerrar">×</button>
        </div>
        <div class="jarvis-input-row">
          <input id="jarvisInput" type="text" autocomplete="off"
            placeholder="Ej.: ¿cuánto vendimos hoy? o 3 bailarinas y 2 koi">
          <button type="button" id="jarvisMic" class="jarvis-mic" title="Hablar">🎙️</button>
        </div>
        <div id="jarvisStatus" class="jarvis-status">Listo.</div>
        <div id="jarvisResult" class="jarvis-result"></div>
        <div class="jarvis-foot">
          <span>Prueba: “¿cuánto vendimos hoy?”, “¿qué productos están bajos?”, “¿cuántas cotizaciones pendientes hay?” o dicta una venta.</span>
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
