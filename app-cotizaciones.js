/* =========================================================
   COTIZADOR
   ========================================================= */

let quoteItems = [];
let quoteCategory = "Todas";
let quoteSearch = "";
let quoteCustomer = "";
let quotePhone = "";
let quoteNote = "";
let quoteDiscount = 0;
let quoteEditingId = null;
let quoteFollowupDate = "";
let quoteFollowupNote = "";

function setupCotizadorUI(){
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  if(!main || !nav){
    return;
  }

  let section = document.getElementById("cotizador");
  if(!section){
    section = document.createElement("section");
    section.id = "cotizador";
    section.className = "screen";
    main.appendChild(section);
  }

  let navButton = nav.querySelector('button[data-tab="cotizador"]');
  if(!navButton){
    navButton = document.createElement("button");
    navButton.type = "button";
    navButton.dataset.tab = "cotizador";
    navButton.innerHTML = `🧾<span>Cotizador</span>`;
    const moreButton = nav.querySelector('button[data-tab="more"]');
    if(moreButton) nav.insertBefore(navButton, moreButton);
    else nav.appendChild(navButton);
  }

  renderCotizador();
}

function quoteCategories(){
  return [
    "Todas",
    ...new Set(
      db.products
        .map(p => String(p.category || "").trim())
        .filter(Boolean)
    )
  ];
}

function nextQuoteNumber(){
  const nums = db.quotes.map(q =>
    parseInt(String(q.id || "").replace(/\D/g, ""), 10) || 0
  );
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `COT-${String(next).padStart(4, "0")}`;
}

function quoteSubtotal(){
  return quoteItems.reduce((sum,item) => {
    const qty = Math.max(0, +item.qty || 0);
    const unitPrice = Math.max(0, +item.unitPrice || 0);
    return sum + (qty * unitPrice);
  }, 0);
}


function quoteTotal(){
  const subtotal = quoteSubtotal();
  const discount = Math.min(subtotal, Math.max(0, +quoteDiscount || 0));
  return Math.max(0, subtotal - discount);
}

function quoteDiscountAmount(){
  const subtotal = quoteSubtotal();
  return Math.min(subtotal, Math.max(0, +quoteDiscount || 0));
}

function duplicateQuote(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  quoteEditingId=null;
  quoteCustomer=String(q.customer||"");
  quotePhone=String(q.phone||"");
  quoteNote=String(q.note||"");
  quoteDiscount=Number(q.discount||0);
  quoteFollowupDate="";
  quoteFollowupNote="";
  quoteItems=(Array.isArray(q.items)?q.items:[]).map((item,i)=>({
    key:`dup-${Date.now()}-${i}`, productIndex:Number(item.productIndex),
    name:String(item.name||"Producto"), qty:Math.max(1,Number(item.qty)||1),
    unitPrice:Math.max(0,Number(item.unitPrice)||0)
  }));
  renderCotizador();
  document.getElementById("cotizador")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function shareSavedQuoteWhatsApp(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  const lines=["🐠 AQUARIUM FISH","COTIZACIÓN",`N.º ${q.id}`,""];
  if(q.customer) lines.push(`Cliente: ${q.customer}`);
  if(q.phone) lines.push(`Teléfono: ${q.phone}`);
  if(q.customer||q.phone) lines.push("");
  (q.items||[]).forEach(item=>{ const qty=Math.max(1,Number(item.qty)||1); const price=Math.max(0,Number(item.unitPrice)||0); lines.push(`${qty} x ${item.name||"Producto"} — ${money(qty*price)}`); });
  lines.push("",`Subtotal: ${money(Number(q.subtotal||0))}`);
  if(Number(q.discount||0)>0) lines.push(`Descuento: -${money(Number(q.discount||0))}`);
  lines.push(`TOTAL: ${money(Number(q.total||0))}`);
  if(q.note) lines.push("",`Nota: ${q.note}`);
  lines.push("","Gracias por elegir Aquarium Fish 🐠");
  let phone=String(q.phone||"").replace(/\D/g,"");
  if(/^3\d{9}$/.test(phone)) phone="57"+phone;
  const url=phone?`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`:`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url,"_blank","noopener");
}

function printQuote(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  const rows=(q.items||[]).map(item=>{ const qty=Math.max(1,Number(item.qty)||1); const price=Math.max(0,Number(item.unitPrice)||0); return `<tr><td>${esc(item.name||"Producto")}</td><td>${qty}</td><td>${money(price)}</td><td>${money(qty*price)}</td></tr>`; }).join("");
  const win=window.open("","_blank");
  if(!win){ alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para esta app."); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(q.id)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#172024;max-width:800px;margin:auto}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.total{font-size:20px;font-weight:700;text-align:right;margin-top:18px}.muted{color:#68777b}</style></head><body><h1>🐠 AQUARIUM FISH</h1><div>COTIZACIÓN <strong>${esc(q.id)}</strong></div><p class="muted">${q.createdAt?esc(new Date(q.createdAt).toLocaleString("es-CO")):""}</p><p><strong>Cliente:</strong> ${esc(q.customer||"Cliente general")}<br>${q.phone?`<strong>Teléfono:</strong> ${esc(q.phone)}`:""}</p><table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right">Subtotal: <strong>${money(Number(q.subtotal||0))}</strong><br>${Number(q.discount||0)>0?`Descuento: <strong>-${money(Number(q.discount||0))}</strong><br>`:""}<span class="total">TOTAL: ${money(Number(q.total||0))}</span></p>${q.note?`<p><strong>Nota:</strong><br>${esc(q.note)}</p>`:""}<p style="margin-top:30px;text-align:center" class="muted">Gracias por elegir Aquarium Fish 🐠</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}

function quoteItemKey(index){
  return `${index}`;
}

function addQuoteItem(index){
  const product = db.products[index];
  if(!product){
    return;
  }

  const key = quoteItemKey(index);
  const existing = quoteItems.find(item => item.key === key);

  if(existing){
    existing.qty = Math.max(1, (+existing.qty || 0) + 1);
  }else{
    quoteItems.push({
      key,
      productIndex: index,
      name: String(product.name || "Producto"),
      qty: 1,
      unitPrice: Math.max(0, +product.price || 0)
    });
  }

  renderCotizador();
}

function updateQuoteItem(key, field, value){
  const item = quoteItems.find(i => i.key === String(key));
  if(!item){
    return;
  }

  if(field === "qty"){
    item.qty = Math.max(1, parseInt(value,10) || 1);
  }else if(field === "unitPrice"){
    item.unitPrice = Math.max(0, +value || 0);
  }

  renderCotizador();
}

function removeQuoteItem(key){
  quoteItems = quoteItems.filter(item => item.key !== String(key));
  renderCotizador();
}

function clearQuote(){
  if(!quoteItems.length && !quoteCustomer && !quotePhone && !quoteNote){
    return;
  }

  if(confirm("¿Limpiar la cotización actual?")){
    quoteItems = [];
    quoteCustomer = "";
    quotePhone = "";
    quoteNote = "";
    quoteDiscount = 0;
    quoteFollowupDate = "";
    quoteFollowupNote = "";
    quoteEditingId = null;
    renderCotizador();
  }
}

function buildQuoteText(){
  const lines = [
    "🐠 AQUARIUM FISH",
    "COTIZACIÓN",
    ""
  ];

  if(quoteCustomer.trim()){
    lines.push(`Cliente: ${quoteCustomer.trim()}`);
  }

  if(quotePhone.trim()){
    lines.push(`Teléfono: ${quotePhone.trim()}`);
  }

  if(quoteCustomer.trim() || quotePhone.trim()){
    lines.push("");
  }

  quoteItems.forEach(item => {
    const subtotal = (+item.qty || 0) * (+item.unitPrice || 0);
    lines.push(
      `${item.qty} x ${item.name} — ${money(subtotal)}`
    );
  });

  lines.push("");
  lines.push(`Subtotal: ${money(quoteSubtotal())}`);
  if(quoteDiscountAmount() > 0) lines.push(`Descuento: -${money(quoteDiscountAmount())}`);
  lines.push(`TOTAL: ${money(quoteTotal())}`);

  if(quoteNote.trim()){
    lines.push("");
    lines.push(`Nota: ${quoteNote.trim()}`);
  }

  lines.push("");
  lines.push("Gracias por elegir Aquarium Fish 🐠");

  return lines.join("\n");
}

async function copyQuote(){
  if(!quoteItems.length){
    alert("Agrega al menos un producto a la cotización.");
    return;
  }

  const text = buildQuoteText();

  try{
    await navigator.clipboard.writeText(text);
    alert("Cotización copiada. Puedes pegarla donde quieras.");
  }catch(_){
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try{
      document.execCommand("copy");
      alert("Cotización copiada.");
    }catch(__){
      alert("No se pudo copiar automáticamente. Puedes usar el botón de WhatsApp.");
    }
    area.remove();
  }
}

function shareQuoteWhatsApp(){
  if(!quoteItems.length){
    alert("Agrega al menos un producto a la cotización.");
    return;
  }

  const text = encodeURIComponent(buildQuoteText());
  let phone = quotePhone.replace(/\D/g, "");
  if(/^3\d{9}$/.test(phone)){
    phone = "57" + phone;
  }
  const url = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(url, "_blank", "noopener");
}


/* ===== COTIZACIONES: LISTADO + CONVERSIÓN A VENTA ===== */
function quoteStatusLabel(q){
  if(q.convertedSaleId) return 'Convertida en venta';
  return q.status || 'Pendiente';
}

function findQuoteById(id){
  return (db.quotes || []).find(q =>
    String(q.id || q.number || q.code) === String(id)
  );
}



function quoteFollowupState(q){
  if(!q || q.convertedSaleId) return {key:"done",label:"Convertida",icon:"✅"};
  const raw=String(q.followupDate || "").trim();
  if(!raw) return {key:"none",label:"Sin seguimiento",icon:"⚪"};
  const d=new Date(raw+"T23:59:59");
  if(Number.isNaN(d.getTime())) return {key:"none",label:"Sin seguimiento",icon:"⚪"};
  const today=new Date(); today.setHours(0,0,0,0);
  const target=new Date(d); target.setHours(0,0,0,0);
  const diff=Math.round((target-today)/86400000);
  if(diff<0) return {key:"late",label:"Atrasado",icon:"🔴"};
  if(diff===0) return {key:"today",label:"Hoy",icon:"🟠"};
  if(diff<=3) return {key:"soon",label:"Próximo",icon:"🟡"};
  return {key:"scheduled",label:"Programado",icon:"🟢"};
}

function formatFollowupDate(value){
  if(!value) return "";
  const d=new Date(String(value)+"T00:00:00");
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"});
}

function openQuoteFollowup(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  if(q.convertedSaleId){ alert("Esta cotización ya fue convertida en una venta."); return; }
  const date=String(q.followupDate || "");
  const note=String(q.followupNote || "");
  modal("📌 Seguimiento — "+q.id, `
    <div style="line-height:1.5">
      <p><strong>Cliente:</strong> ${esc(q.customer || "Cliente general")}</p>
      <p><strong>Valor:</strong> ${money(q.total || 0)}</p>
      <label style="display:block;margin-top:12px"><strong>Fecha de seguimiento</strong>
        <input id="followupDateInput" class="search" type="date" value="${esc(date)}" style="margin-top:6px;width:100%;box-sizing:border-box">
      </label>
      <label style="display:block;margin-top:12px"><strong>Nota interna</strong>
        <textarea id="followupNoteInput" rows="4" placeholder="Ej. Llamar para confirmar disponibilidad..." style="width:100%;box-sizing:border-box">${esc(note)}</textarea>
      </label>
      <p class="muted" style="margin-top:8px">Esta nota es interna y no se incluye en la cotización enviada al cliente.</p>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px">
      <button type="button" onclick="clearQuoteFollowup('${esc(String(q.id))}')">🧹 Limpiar</button>
      <button type="button" onclick="closeModal()">Cancelar</button>
      <button type="button" class="primary" onclick="saveQuoteFollowup('${esc(String(q.id))}')">💾 Guardar seguimiento</button>
    </div>
  `,null);
}

function saveQuoteFollowup(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  const date=String(document.getElementById("followupDateInput")?.value || "").trim();
  const note=String(document.getElementById("followupNoteInput")?.value || "").trim();
  q.followupDate=date;
  q.followupNote=note;
  q.followupUpdatedAt=now();
  q.followupCompleted=false;
  save();
  closeModal();
  renderCotizador();
  alert(date ? `Seguimiento programado para ${formatFollowupDate(date)}.` : "Seguimiento limpiado.");
}

function clearQuoteFollowup(quoteId){
  const q=findQuoteById(quoteId);
  if(!q) return;
  q.followupDate="";
  q.followupNote="";
  q.followupCompleted=false;
  q.followupUpdatedAt=now();
  save();
  closeModal();
  renderCotizador();
}

function markQuoteFollowupDone(quoteId){
  const q=findQuoteById(quoteId);
  if(!q) return;
  q.followupCompleted=true;
  q.followupCompletedAt=now();
  q.followupLastContactAt=now();
  q.followupHistory=Array.isArray(q.followupHistory)?q.followupHistory:[];
  q.followupHistory.push({date:now(),note:String(q.followupNote||'').trim()});
  save();
  renderCotizador();
}

function quoteFollowupStats(){
  const quotes=Array.isArray(db.quotes)?db.quotes:[];
  let pending=0, today=0, late=0, scheduled=0;
  quotes.forEach(q=>{
    if(q.convertedSaleId || q.followupCompleted) return;
    const st=quoteFollowupState(q);
    if(st.key==="late") late++;
    else if(st.key==="today") today++;
    else if(st.key==="soon" || st.key==="scheduled") scheduled++;
    if(q.followupDate) pending++;
  });
  return {pending,today,late,scheduled};
}

function renderQuotesList(){
  const el=document.getElementById("quotesList");
  if(!el) return;

  // Las cotizaciones convertidas se conservan en los datos y en Firebase
  // para mantener el historial, pero salen del listado activo para que
  // la pantalla de trabajo no se vuelva interminable.
  const allQuotes=Array.isArray(db.quotes)?db.quotes:[];
  const quotes=allQuotes.filter(q=>q && !q.convertedSaleId && String(q.status||"").toLowerCase()!=="convertida en venta");

  const countLabel=el.closest("details")?.querySelector("summary");
  if(countLabel){
    countLabel.innerHTML=`📋 Cotizaciones pendientes <span class="muted">· ${quotes.length}</span>`;
  }

  el.innerHTML=quotes.length ? quotes.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""))).map(q=>{
    const id=q.id||"";
    const customer=q.customer||"Cliente general";
    const dateObj=parseLocalDate(q.createdAt||q.date);
    const dateText=dateObj?dateObj.toLocaleDateString("es-CO"):"";
    const total=Number(q.total||0);
    const fs=quoteFollowupState(q);
    const followText=q.followupDate ? `${fs.icon} ${fs.label} · ${formatFollowupDate(q.followupDate)}` : `${fs.icon} ${fs.label}`;
    return `<div class="quote-row" style="display:grid;grid-template-columns:1.1fr .8fr .9fr 1.25fr;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.08);">
      <div><b>${esc(id)}</b><div class="muted">${esc(customer)}</div></div>
      <div class="muted">${esc(dateText)}</div>
      <div><b>${money(total)}</b><div class="muted">${esc(q.status||"Pendiente")}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span class="badge">${esc(followText)}</span>
        <button type="button" onclick="viewQuote('${esc(id)}')">👁️ Ver</button>
        <button type="button" onclick="openQuoteFollowup('${esc(id)}')">📌 Seguimiento</button>
        <button type="button" onclick="duplicateQuote('${esc(id)}')">📑 Duplicar</button>
        <button type="button" onclick="shareSavedQuoteWhatsApp('${esc(id)}')">📲 WhatsApp</button>
        <button type="button" onclick="printQuote('${esc(id)}')">🖨️</button>
        <button type="button" onclick="openQuoteStatus('${esc(id)}')">📌 Estado</button>
        <button type="button" onclick="editQuote('${esc(id)}')">✏️ Editar</button>
        <button type="button" class="primary" onclick="convertQuoteToSale('${esc(id)}')">➡️ Convertir</button>
        ${q.followupDate&&!q.followupCompleted?`<button type="button" onclick="markQuoteFollowupDone('${esc(id)}')">☑️ Listo</button>`:""}
        <button type="button" onclick="deleteQuote('${esc(id)}')">🗑️</button>
      </div></div>`;
  }).join("") : `<div class="empty"><b>No hay cotizaciones pendientes</b><div class="muted">Las cotizaciones convertidas en venta se retiran automáticamente de esta lista.</div></div>`;
}

function editQuote(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){
    alert("No se encontró la cotización.");
    return;
  }

  if(q.convertedSaleId){
    alert("Esta cotización ya fue convertida en una venta y no se puede editar.");
    return;
  }

  quoteEditingId=q.id;
  quoteCustomer=String(q.customer || "");
  quotePhone=String(q.phone || "");
  quoteNote=String(q.note || "");
  quoteDiscount=Number(q.discount || 0);
  quoteFollowupDate=String(q.followupDate || "");
  quoteFollowupNote=String(q.followupNote || "");

  quoteItems=(Array.isArray(q.items) ? q.items : []).map((item, i) => ({
    key: String(item.productIndex ?? i),
    productIndex: Number(item.productIndex),
    name: String(item.name || "Producto"),
    qty: Math.max(1, Number(item.qty) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0)
  }));

  renderCotizador();

  const section=document.getElementById("cotizador");
  if(section){
    section.scrollIntoView({behavior:"smooth", block:"start"});
  }
}

function viewQuote(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){
    alert("No se encontró la cotización.");
    return;
  }

  const customer=String(q.customer || "Cliente general");
  const phone=String(q.phone || "");
  const date=q.createdAt ? new Date(q.createdAt).toLocaleString("es-CO") : "";
  const items=Array.isArray(q.items) ? q.items : [];
  const subtotal=Number(q.subtotal || 0);
  const discount=Number(q.discount || 0);
  const total=Number(q.total || 0);

  const rows=items.map(item=>{
    const qty=Math.max(1, Number(item.qty)||1);
    const price=Math.max(0, Number(item.unitPrice)||0);
    return `
      <tr>
        <td>${String(item.name || "Producto")}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right">$${price.toLocaleString("es-CO")}</td>
        <td style="text-align:right">$${(qty*price).toLocaleString("es-CO")}</td>
      </tr>`;
  }).join("");

  modal(
    "Cotización " + q.id,
    `
      <div style="line-height:1.5">
        <p><strong>Cliente:</strong> ${customer}</p>
        ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ""}
        ${date ? `<p><strong>Fecha:</strong> ${date}</p>` : ""}
        <p><strong>Estado:</strong> ${quoteStatusLabel(q)}</p>
        ${q.followupDate ? `<p><strong>Seguimiento:</strong> ${formatFollowupDate(q.followupDate)}${q.followupCompleted ? " · Completado" : ""}</p>` : ""}
        ${q.followupNote ? `<p><strong>Nota interna:</strong> ${esc(q.followupNote)}</p>` : ""}

        <div style="overflow:auto;margin:14px 0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;border-bottom:1px solid #ddd;padding:7px">Producto</th>
                <th style="text-align:center;border-bottom:1px solid #ddd;padding:7px">Cant.</th>
                <th style="text-align:right;border-bottom:1px solid #ddd;padding:7px">Precio</th>
                <th style="text-align:right;border-bottom:1px solid #ddd;padding:7px">Importe</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div style="text-align:right">
          <div>Subtotal: <strong>$${subtotal.toLocaleString("es-CO")}</strong></div>
          ${discount > 0 ? `<div>Descuento: <strong>-$${discount.toLocaleString("es-CO")}</strong></div>` : ""}
          <div style="font-size:1.15em;margin-top:6px">Total: <strong>$${total.toLocaleString("es-CO")}</strong></div>
        </div>

        ${q.note ? `<div style="margin-top:14px"><strong>Nota:</strong><br>${String(q.note)}</div>` : ""}
        ${q.convertedSaleId ? `<p style="margin-top:14px"><strong>Venta asociada:</strong> ${q.convertedSaleId}</p>` : ""}
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
        <button type="button" onclick="closeModal()">Cerrar</button>
        <button type="button" onclick="printQuote('${String(q.id).replace(/'/g,"\'")}')">🖨️ Imprimir</button>
        <button type="button" onclick="shareSavedQuoteWhatsApp('${String(q.id).replace(/'/g,"\'")}')">📲 WhatsApp</button>
        ${!q.convertedSaleId
          ? `<button type="button" onclick="closeModal();convertQuoteToSale('${String(q.id).replace(/'/g,"\\'")}')">➡️ Convertir en venta</button>`
          : ""}
      </div>
    `,
    null
  );
}

function deleteQuote(quoteId){
  const index=(db.quotes || []).findIndex(q =>
    String(q.id || q.number || q.code) === String(quoteId)
  );

  if(index < 0){
    alert("No se encontró la cotización.");
    return;
  }

  const q=db.quotes[index];

  if(q.convertedSaleId){
    alert("Esta cotización ya fue convertida en una venta y no se puede eliminar desde aquí.");
    return;
  }

  if(!confirm(`¿Eliminar la cotización ${q.id}?\\n\\nEsta acción no se puede deshacer.`)){
    return;
  }

  db.quotes.splice(index,1);
  save();

  if(typeof renderCotizador === "function"){
    try{ renderCotizador(); }catch(e){ console.error(e); }
  }
  renderQuotesList();
}

function convertQuoteToSale(quoteId){
  const q = findQuoteById(quoteId);
  if(!q){ alert("No se encontró la cotización."); return; }
  if(q.convertedSaleId){
    alert(`Esta cotización ya fue convertida en la venta ${q.convertedSaleId}.`);
    return;
  }
  if(!Array.isArray(q.items) || !q.items.length){
    alert("La cotización no tiene productos.");
    return;
  }
  if(!confirm(`¿Convertir ${quoteId} en una venta?\n\nEl inventario y la caja solo se actualizarán cuando confirmes la venta.`)){
    return;
  }
  window.pendingQuoteToSale = {
    quoteId:q.id,
    customer:String(q.customer || "").trim(),
    phone:String(q.phone || "").trim(),
    items:q.items.map(item => ({
      productIndex:+item.productIndex,
      qty:Math.max(1,+item.qty || 1),
      unitPrice:Math.max(0,+item.unitPrice || 0),
      name:String(item.name || "Producto")
    })),
    total:+q.total || 0
  };
  // La cotización permanece pendiente hasta que la venta se guarde realmente.
  // Así, si el usuario cancela la venta, no queda marcada de forma incorrecta.
  openSale(window.pendingQuoteToSale);
}

function finalizeQuoteConversion(sale){
  const payload=window.pendingQuoteToSale;
  if(!payload) return;

  const q=findQuoteById(payload.quoteId);
  if(!q) return;

  const saleId=sale && (sale.id || sale.number || sale.code);
  if(!saleId) return;

  q.convertedSaleId=saleId;
  q.status='Convertida en venta';
  q.convertedAt=new Date().toISOString();
  q.fromQuoteId=payload.quoteId;

  save();

  window.pendingQuoteToSale=null;
  renderQuotesList();
}

function viewSaleFromQuote(saleId){
  if(typeof viewSale === 'function') return viewSale(saleId);
  if(typeof openSale === 'function') return openSale(saleId);
  alert('Venta asociada: ' + saleId);
}

function saveQuote(){
  try{
    if(!Array.isArray(db.quotes)) db.quotes = [];
    if(!quoteItems.length){
      alert("Agrega al menos un producto a la cotización.");
      return;
    }

    const subtotal = quoteSubtotal();
    const discount = Math.min(subtotal, Math.max(0, +quoteDiscount || 0));
    const existing = quoteEditingId
      ? db.quotes.find(q => q.id === quoteEditingId)
      : null;

    const quote = existing || {
      id: nextQuoteNumber(),
      createdAt: now(),
      status: "Pendiente"
    };

    quote.updatedAt = now();
    quote.customer = String(quoteCustomer || "").trim();
    quote.phone = String(quotePhone || "").trim();
    quote.note = String(quoteNote || "").trim();
    quote.followupDate = String(quoteFollowupDate || "").trim();
    quote.followupNote = String(quoteFollowupNote || "").trim();
    quote.followupUpdatedAt = quote.followupUpdatedAt || now();
    quote.discount = discount;
    quote.subtotal = subtotal;
    quote.total = Math.max(0, subtotal - discount);
    quote.items = quoteItems.map(item => ({
      productIndex: +item.productIndex,
      name: String(item.name || "Producto"),
      qty: Math.max(1, +item.qty || 1),
      unitPrice: Math.max(0, +item.unitPrice || 0)
    }));

    if(!existing){
      quote.status = quote.status || "Pendiente";
      quote.convertedSaleId = null;
      db.quotes.push(quote);
    }else{
      quote.convertedSaleId = quote.convertedSaleId || null;
    }

    // Guardar usando el mismo flujo de Firebase que utiliza el resto
    // de la aplicación. Esto hace que la cotización quede disponible
    // en PC, celular y tablet con la misma cuenta.
    save();

    quoteEditingId = quote.id;
    renderCotizador();

    alert(`${quote.id} guardada correctamente.`);
  }catch(error){
    console.error("Error guardando cotización:", error);
    alert("No se pudo guardar la cotización. Revisa la consola para más detalles.");
  }
}

function quoteReportData(){
  const quotes = Array.isArray(db.quotes) ? db.quotes : [];
  let pending=0, converted=0, rejected=0, totalQuoted=0, totalConverted=0;
  quotes.forEach(q=>{
    const total=Math.max(0, Number(q.total)||0);
    totalQuoted += total;
    if(q.convertedSaleId || String(q.status||'').toLowerCase()==='convertida en venta'){
      converted++;
      totalConverted += total;
    }else if(String(q.status||'').toLowerCase()==='rechazada'){
      rejected++;
    }else{
      pending++;
    }
  });
  return {total:quotes.length,pending,converted,rejected,totalQuoted,totalConverted,
    conversionRate:quotes.length ? (converted/quotes.length)*100 : 0};
}

function renderQuoteReports(){
  const el=document.getElementById('quoteReports');
  if(!el) return;
  const r=quoteReportData();
  const card=(label,value,sub='')=>`<div style="background:#f5f8f9;border-radius:14px;padding:13px;border:1px solid rgba(0,0,0,.06);"><div class="muted" style="font-size:.86rem;">${label}</div><strong style="display:block;font-size:1.18rem;margin-top:4px;">${value}</strong>${sub?`<div class="muted" style="font-size:.78rem;margin-top:3px;">${sub}</div>`:''}</div>`;
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;">
      ${card('📋 Cotizaciones',r.total)}
      ${card('⏳ Pendientes',r.pending)}
      ${card('✅ Convertidas',r.converted)}
      ${card('❌ Rechazadas',r.rejected)}
      ${card('💰 Total cotizado',money(r.totalQuoted))}
      ${card('💵 Total convertido',money(r.totalConverted))}
      ${card('📈 Conversión',`${r.conversionRate.toFixed(1)}%`,'sobre el total de cotizaciones')}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
      <button type="button" onclick="printQuoteReport()">🖨️ Imprimir reporte</button>
      <button type="button" class="primary" onclick="shareQuoteReportWhatsApp()">📲 WhatsApp</button>
    </div>`;
}

function buildQuoteReportText(){
  const r=quoteReportData();
  return [
    '📊 REPORTE DE COTIZACIONES',
    '',
    `Cotizaciones: ${r.total}`,
    `Pendientes: ${r.pending}`,
    `Convertidas en venta: ${r.converted}`,
    `Rechazadas: ${r.rejected}`,
    `Total cotizado: ${money(r.totalQuoted)}`,
    `Total convertido: ${money(r.totalConverted)}`,
    `Porcentaje de conversión: ${r.conversionRate.toFixed(1)}%`,
    '',
    'Aquarium Fish 🐠'
  ].join('\n');
}

function shareQuoteReportWhatsApp(){
  window.open('https://wa.me/?text='+encodeURIComponent(buildQuoteReportText()),'_blank','noopener');
}

function printQuoteReport(){
  const r=quoteReportData();
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de cotizaciones</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#17212b}h1{margin:0 0 6px;font-size:24px}.muted{color:#667781}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:24px}.card{border:1px solid #d9e0e4;border-radius:12px;padding:16px}.value{font-size:22px;font-weight:700;margin-top:6px}@media print{button{display:none}}</style></head><body><h1>AQUARIUM FISH</h1><div class="muted">Reporte de cotizaciones</div><div class="muted">Generado: ${new Date().toLocaleString('es-CO')}</div><div class="grid"><div class="card">Cotizaciones<div class="value">${r.total}</div></div><div class="card">Pendientes<div class="value">${r.pending}</div></div><div class="card">Convertidas<div class="value">${r.converted}</div></div><div class="card">Rechazadas<div class="value">${r.rejected}</div></div><div class="card">Total cotizado<div class="value">${money(r.totalQuoted)}</div></div><div class="card">Total convertido<div class="value">${money(r.totalConverted)}</div></div><div class="card">Porcentaje de conversión<div class="value">${r.conversionRate.toFixed(1)}%</div></div></div><p style="margin-top:28px">Este reporte es informativo y no modifica inventario, caja ni cotizaciones.</p><button onclick="window.print()">Imprimir</button><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
  const w=window.open('','_blank','noopener');
  if(!w){ alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.'); return; }
  w.document.write(html); w.document.close();
}


function quoteIntelligenceData(){
  const quotes=Array.isArray(db.quotes)?db.quotes:[];
  const active=quotes.filter(q=>q && !q.convertedSaleId && String(q.status||'').toLowerCase()!=='rechazada');
  const today=new Date(); today.setHours(0,0,0,0);
  let pending=0, overdue=0, todayCount=0, noFollowup=0, totalPending=0, convertedValue=0;
  const customerMap={};
  active.forEach(q=>{
    pending++;
    const total=Math.max(0,Number(q.total)||0);
    totalPending+=total;
    const key=String(q.phone||q.customer||'').trim().toLowerCase() || `quote:${q.id}`;
    customerMap[key]=(customerMap[key]||0)+1;
    if(q.followupCompleted) return;
    if(!q.followupDate){ noFollowup++; return; }
    const st=quoteFollowupState(q);
    if(st.key==='late') overdue++;
    else if(st.key==='today') todayCount++;
  });
  quotes.forEach(q=>{
    if(q && (q.convertedSaleId || String(q.status||'').toLowerCase()==='convertida en venta')) convertedValue+=Math.max(0,Number(q.total)||0);
  });
  const repeatedCustomers=Object.values(customerMap).filter(n=>n>1).length;
  const avg=active.length?totalPending/active.length:0;
  const highThreshold=Math.max(500000,avg*1.5);
  const highValue=active.filter(q=>Number(q.total)||0>=highThreshold).sort((a,b)=>(Number(b.total)||0)-(Number(a.total)||0));
  const opportunities=active.map(q=>{
    const total=Math.max(0,Number(q.total)||0);
    let priority=1;
    let reasons=[];
    if(!q.followupDate&&!q.followupCompleted){priority+=2;reasons.push('sin seguimiento');}
    else if(!q.followupCompleted){const st=quoteFollowupState(q); if(st.key==='late'){priority+=4;reasons.push('seguimiento vencido');}else if(st.key==='today'){priority+=3;reasons.push('seguimiento hoy');}}
    if(total>=highThreshold){priority+=2;reasons.push('valor alto');}
    if(String(q.customer||'').trim()){
      const key=String(q.phone||q.customer||'').trim().toLowerCase();
      if((customerMap[key]||0)>1){priority+=1;reasons.push('cliente recurrente');}
    }
    return {...q,__priority:priority,__reasons:reasons};
  }).sort((a,b)=>b.__priority-a.__priority || (Number(b.total)||0)-(Number(a.total)||0));
  return {activeCount:active.length,pending,overdue,today:todayCount,noFollowup,totalPending,convertedValue,repeatedCustomers,avg,highThreshold,highValue,opportunities};
}

function renderQuoteIntelligence(){
  const el=document.getElementById('quoteIntelligence');
  if(!el) return;
  const d=quoteIntelligenceData();
  const card=(icon,label,value,sub='')=>`<div style="background:#f5f8f9;border:1px solid rgba(0,0,0,.07);border-radius:14px;padding:12px;min-width:0"><div class="muted">${icon} ${label}</div><strong style="display:block;font-size:1.22rem;margin-top:3px">${value}</strong>${sub?`<small class="muted">${sub}</small>`:''}</div>`;
  const rows=d.opportunities.slice(0,10).map(q=>{
    const priority=q.__priority>=6?'🔴':q.__priority>=4?'🟠':'🟢';
    const reason=q.__reasons.length?q.__reasons.join(' · '):'seguimiento normal';
    const phone=String(q.phone||'').replace(/\D/g,'');
    return `<div class="item" style="align-items:center;gap:8px;margin-bottom:6px"><div style="flex:1;min-width:0"><b>${priority} ${esc(q.id||'')} · ${esc(q.customer||'Cliente general')}</b><div class="muted">${esc(reason)} · ${q.followupDate?esc(formatFollowupDate(q.followupDate)):'sin fecha'} </div></div><div class="right"><b>${money(q.total||0)}</b><div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;margin-top:5px"><button type="button" onclick="viewQuote('${esc(String(q.id))}')">👁️</button><button type="button" onclick="openQuoteFollowup('${esc(String(q.id))}')">📅</button>${phone?`<button type="button" onclick="shareQuoteFollowupWhatsApp('${esc(String(q.id))}')">📲</button>`:''}<button type="button" onclick="convertQuoteToSale('${esc(String(q.id))}')">💰</button></div></div></div>`;
  }).join('');
  const high=d.highValue.slice(0,5).map(q=>`<div class="item" style="margin-bottom:6px"><div style="flex:1"><b>${esc(q.id||'')} · ${esc(q.customer||'Cliente general')}</b><div class="muted">${q.followupDate?'Seguimiento '+esc(formatFollowupDate(q.followupDate)):'Sin seguimiento programado'}</div></div><div class="right"><b>${money(q.total||0)}</b></div></div>`).join('');
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px">
      ${card('🎯','Oportunidades',d.activeCount,'cotizaciones activas')}
      ${card('💰','Valor pendiente',money(d.totalPending))}
      ${card('🔴','Atención urgente',d.overdue+d.today,'vencidas + hoy')}
      ${card('📅','Sin seguimiento',d.noFollowup)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="item" style="display:block"><b>🔥 Oportunidades prioritarias</b><div class="muted" style="margin:4px 0 8px">Ordenadas por seguimiento, valor y actividad del cliente.</div>${rows||'<div class="empty">No hay cotizaciones activas.</div>'}</div>
      <div class="item" style="display:block"><b>💎 Cotizaciones de valor alto</b><div class="muted" style="margin:4px 0 8px">Umbral actual: ${money(d.highThreshold)} · ${d.highValue.length} detectadas</div>${high||'<div class="empty">No hay cotizaciones de valor alto.</div>'}<div class="muted" style="margin-top:10px">👥 Clientes con más de una cotización pendiente: <b>${d.repeatedCustomers}</b></div><div class="muted">📊 Promedio pendiente: <b>${money(d.avg)}</b></div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" onclick="printQuoteIntelligence()">🖨️ Imprimir análisis</button><button type="button" class="primary" onclick="shareQuoteIntelligenceWhatsApp()">📲 Compartir resumen</button></div>`;
}

function buildQuoteIntelligenceText(){
  const d=quoteIntelligenceData();
  return ['🧠 INTELIGENCIA COMERCIAL · COTIZADOR','',`Oportunidades activas: ${d.activeCount}`,`Valor pendiente: ${money(d.totalPending)}`,`Atención urgente: ${d.overdue+d.today}`,`Sin seguimiento: ${d.noFollowup}`,`Cotizaciones de valor alto: ${d.highValue.length}`,`Clientes con varias cotizaciones: ${d.repeatedCustomers}`,`Promedio pendiente: ${money(d.avg)}`,'','Aquarium Fish 🐠'].join('\n');
}
function shareQuoteIntelligenceWhatsApp(){ window.open('https://wa.me/?text='+encodeURIComponent(buildQuoteIntelligenceText()),'_blank','noopener'); }
function printQuoteIntelligence(){
  const d=quoteIntelligenceData();
  const rows=d.opportunities.slice(0,15).map(q=>`<tr><td>${esc(q.id||'')}</td><td>${esc(q.customer||'Cliente general')}</td><td>${money(q.total||0)}</td><td>${esc(q.__reasons.join(', ')||'Normal')}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Inteligencia comercial</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#17212b}h1{margin:0 0 6px}.muted{color:#667781}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0}.card{border:1px solid #d9e0e4;border-radius:10px;padding:14px}.value{font-size:20px;font-weight:700;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d9e0e4;padding:8px;text-align:left}th{font-weight:700}@media print{button{display:none}}</style></head><body><h1>AQUARIUM FISH</h1><div class="muted">Inteligencia comercial del cotizador · ${new Date().toLocaleString('es-CO')}</div><div class="grid"><div class="card">Oportunidades activas<div class="value">${d.activeCount}</div></div><div class="card">Valor pendiente<div class="value">${money(d.totalPending)}</div></div><div class="card">Atención urgente<div class="value">${d.overdue+d.today}</div></div><div class="card">Sin seguimiento<div class="value">${d.noFollowup}</div></div></div><h2>Oportunidades prioritarias</h2><table><thead><tr><th>Cotización</th><th>Cliente</th><th>Valor</th><th>Motivos</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No hay oportunidades activas.</td></tr>'}</tbody></table><p class="muted">Este análisis es informativo y no modifica inventario, caja, ventas ni clientes.</p><button onclick="window.print()">Imprimir</button><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
  const w=window.open('','_blank','noopener'); if(!w){alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.');return;} w.document.write(html);w.document.close();
}

function renderQuoteFollowupPanel(){
  const summary=document.getElementById("quoteFollowupSummary");
  const list=document.getElementById("quoteFollowupList");
  if(!summary || !list) return;
  const st=quoteFollowupStats();
  const card=(value,label)=>`<div class="item"><div><b>${value}</b><div class="muted">${label}</div></div></div>`;
  summary.innerHTML=card(st.pending,"Con seguimiento")+card(st.today,"Para hoy")+card(st.late,"Atrasados")+card(st.scheduled,"Próximos");
  const quotes=(Array.isArray(db.quotes)?db.quotes:[]).filter(q=>!q.convertedSaleId&&!q.followupCompleted&&q.followupDate).sort((a,b)=>String(a.followupDate).localeCompare(String(b.followupDate)));
  list.innerHTML=quotes.length ? quotes.map(q=>{
    const st=quoteFollowupState(q);
    return `<div class="item" style="align-items:center;gap:8px;margin-bottom:6px"><div style="flex:1"><b>${esc(q.id)} · ${esc(q.customer||"Cliente general")}</b><div class="muted">${st.icon} ${esc(st.label)} · ${esc(formatFollowupDate(q.followupDate))}${q.followupNote?` · ${esc(q.followupNote)}`:""}</div></div><div class="right"><b>${money(q.total||0)}</b><div style="display:flex;gap:6px;margin-top:5px"><button type="button" onclick="openQuoteFollowup('${esc(q.id)}')">✏️</button><button type="button" onclick="markQuoteFollowupDone('${esc(q.id)}')">☑️ Listo</button></div></div></div>`;
  }).join("") : `<div class="empty">No hay seguimientos pendientes.</div>`;
}

function quoteAutomationData(){
  const quotes=Array.isArray(db.quotes)?db.quotes:[];
  let overdue=0,today=0,soon=0,scheduled=0,noFollowup=0;
  const pending=[];
  quotes.forEach(q=>{
    if(!q || q.convertedSaleId) return;
    if(q.followupCompleted) return;
    const st=quoteFollowupState(q);
    if(st.key==='late'){ overdue++; pending.push(q); }
    else if(st.key==='today'){ today++; pending.push(q); }
    else if(st.key==='soon'){ soon++; pending.push(q); }
    else if(st.key==='scheduled'){ scheduled++; }
    else { noFollowup++; }
  });
  pending.sort((a,b)=>{
    const ad=String(a.followupDate||'9999-12-31');
    const bd=String(b.followupDate||'9999-12-31');
    return ad.localeCompare(bd);
  });
  return {overdue,today,soon,scheduled,noFollowup,pending};
}

function renderQuoteAutomationAlerts(){
  const el=document.getElementById('quoteAutomationAlerts');
  if(!el) return;
  const a=quoteAutomationData();
  const totalUrgent=a.overdue+a.today;
  const card=(icon,label,value,extra='')=>`<div style="background:#f5f8f9;border:1px solid rgba(0,0,0,.07);border-radius:14px;padding:12px;min-width:0"><div class="muted">${icon} ${label}</div><strong style="display:block;font-size:1.25rem;margin-top:3px">${value}</strong>${extra?`<small class="muted">${extra}</small>`:''}</div>`;
  const cards=`<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px">${card('🔴','Vencidos',a.overdue)}${card('🟠','Hoy',a.today)}${card('🟡','Próximos',a.soon)}${card('⚪','Sin fecha',a.noFollowup)}</div>`;
  const rows=a.pending.slice(0,8).map(q=>{
    const st=quoteFollowupState(q);
    const phone=String(q.phone||'').replace(/\D/g,'');
    return `<div class="item" style="align-items:center;gap:8px;margin-bottom:6px"><div style="flex:1;min-width:0"><b>${esc(q.id||'')}</b> · ${esc(q.customer||'Cliente general')}<div class="muted">${st.icon} ${esc(st.label)} · ${esc(formatFollowupDate(q.followupDate))}${q.followupNote?` · ${esc(q.followupNote)}`:''}</div></div><div class="right"><b>${money(q.total||0)}</b><div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;margin-top:5px"><button type="button" onclick="openQuoteFollowup('${esc(String(q.id))}')">📌</button>${phone?`<button type="button" onclick="shareQuoteFollowupWhatsApp('${esc(String(q.id))}')">📲</button>`:''}<button type="button" onclick="markQuoteFollowupDone('${esc(String(q.id))}')">☑️ Listo</button></div></div></div>`;
  }).join('');
  let empty='';
  if(!a.pending.length){
    empty=a.noFollowup ? `<div class="empty">No hay seguimientos vencidos ni para hoy. Hay ${a.noFollowup} cotización(es) sin fecha de seguimiento.</div>` : `<div class="empty">🎉 No tienes seguimientos pendientes de atención.</div>`;
  }
  const footer=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" onclick="requestQuoteNotifications()">🔔 Activar alertas del navegador</button>${totalUrgent?`<strong class="badge">${totalUrgent} requieren atención</strong>`:''}<span class="muted" style="align-self:center">Programadas próximas: ${a.scheduled}</span></div>`;
  el.innerHTML=cards+(rows||empty)+footer;
}

function shareQuoteFollowupWhatsApp(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){alert('No se encontró la cotización.');return;}
  const customer=q.customer||'Cliente';
  const total=money(q.total||0);
  const text=encodeURIComponent(`Hola ${customer}, te escribimos para dar seguimiento a la cotización ${q.id} por ${total}. ¿Deseas que avancemos con el pedido?`);
  let phone=String(q.phone||'').replace(/\D/g,'');
  if(/^3\d{9}$/.test(phone)) phone='57'+phone;
  const url=phone?`https://wa.me/${phone}?text=${text}`:`https://wa.me/?text=${text}`;
  window.open(url,'_blank','noopener');
}

function requestQuoteNotifications(){
  if(!('Notification' in window)){
    alert('Este navegador no admite notificaciones.');
    return;
  }
  if(Notification.permission==='granted'){
    showQuoteBrowserNotification(true);
    return;
  }
  Notification.requestPermission().then(permission=>{
    if(permission==='granted') showQuoteBrowserNotification(true);
    else alert('Las notificaciones quedaron desactivadas. Puedes habilitarlas desde los permisos del navegador.');
  }).catch(()=>alert('No fue posible solicitar el permiso de notificaciones.'));
}

function showQuoteBrowserNotification(force=false){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  const a=quoteAutomationData();
  const count=a.overdue+a.today;
  if(!force && !count) return;
  const title=count ? `🔔 ${count} cotización(es) requieren atención` : '🔔 Aquarium Fish';
  const body=count ? `${a.overdue} vencida(s) · ${a.today} para hoy` : 'No hay seguimientos urgentes.';
  try{
    const n=new Notification(title,{body});
    n.onclick=()=>{window.focus();show('cotizador');try{n.close();}catch(_){} };
  }catch(e){ console.warn('No se pudo mostrar la notificación:',e); }
}

function maybeNotifyQuoteFollowups(){
  try{
    if(localStorage.getItem('aquarium_quote_alerts_last')===new Date().toISOString().slice(0,10)) return;
    if(!('Notification' in window) || Notification.permission!=='granted') return;
    const a=quoteAutomationData();
    if(!(a.overdue+a.today)) return;
    showQuoteBrowserNotification(false);
    localStorage.setItem('aquarium_quote_alerts_last',new Date().toISOString().slice(0,10));
  }catch(e){ console.warn('Aviso de cotizaciones:',e); }
}

function renderCotizador(){
  const section = document.getElementById("cotizador");
  if(!section) return;

  const categories = quoteCategories();
  const q = quoteSearch.trim().toLowerCase();
  const products = db.products
    .map((product,index) => ({product,index}))
    .filter(({product}) => {
      const category = String(product.category || "").trim();
      if(quoteCategory !== "Todas" && category !== quoteCategory) return false;
      if(!q) return true;
      return `${product.name || ""} ${category}`.toLowerCase().includes(q);
    })
    .sort((a,b) => String(a.product.name || "").localeCompare(String(b.product.name || ""),"es"));

  const customerMatches = db.customers
    .map((customer,index) => ({customer,index}))
    .filter(({customer}) => customer && String(customer.name || "").trim())
    .sort((a,b) => String(a.customer.name || "").localeCompare(String(b.customer.name || ""),"es"));
  const registeredCustomer = customerMatches.some(({customer}) => String(customer.name || "").trim() === String(quoteCustomer || "").trim());
  const hasExtra = !!(quoteFollowupDate || quoteFollowupNote || quoteNote || quoteDiscount);

  section.innerHTML = `
    <div class="section-head" style="margin-bottom:10px;">
      <div>
        <h1 style="margin-bottom:2px;">🧾 Cotizador</h1>
        <div class="muted">${quoteEditingId ? `Editando ${esc(quoteEditingId)}` : "Crea una cotización rápida"}</div>
      </div>
      <button type="button" onclick="clearQuote()">🧹 Limpiar</button>
    </div>

    <div class="panel" style="padding:12px;">
      <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(150px,.8fr);gap:8px;align-items:start;">
        <div>
          <label class="muted" style="display:block;margin-bottom:4px;">Cliente</label>
          <select id="quoteCustomerSelect" class="search" style="width:100%;box-sizing:border-box;">
            <option value="">Cliente general</option>
            ${customerMatches.map(({customer,index}) => `
              <option value="${index}" ${String(customer.name || "").trim() === String(quoteCustomer || "").trim() ? "selected" : ""}>${esc(customer.name)}</option>
            `).join("")}
            <option value="__manual__" ${quoteCustomer && !registeredCustomer ? "selected" : ""}>✏️ Otro cliente</option>
          </select>
          <input id="quoteCustomer" class="search" placeholder="Nombre del cliente" value="${esc(quoteCustomer)}" style="width:100%;box-sizing:border-box;margin-top:6px;${registeredCustomer ? "display:none;" : ""}">
        </div>
        <div>
          <label class="muted" style="display:block;margin-bottom:4px;">WhatsApp / teléfono</label>
          <input id="quotePhone" class="search" type="tel" placeholder="300 000 0000" value="${esc(quotePhone)}" style="width:100%;box-sizing:border-box;">
        </div>
      </div>
    </div>

    <div class="panel" style="padding:12px;">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;">
        <div>
          <h2 style="margin:0;">🛒 Productos</h2>
          <div class="muted">Busca y toca <b>Agregar</b>. El stock no se modifica.</div>
        </div>
        <span class="badge">${quoteItems.length} ${quoteItems.length === 1 ? "producto" : "productos"}</span>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(130px,.7fr);gap:8px;margin-bottom:8px;">
        <input id="quoteSearch" class="search" placeholder="🔎 Buscar producto..." value="${esc(quoteSearch)}" style="width:100%;box-sizing:border-box;">
        <select id="quoteCategory" class="search" style="width:100%;box-sizing:border-box;">
          ${categories.map(category => `<option value="${esc(category)}" ${category === quoteCategory ? "selected" : ""}>${esc(category)}</option>`).join("")}
        </select>
      </div>

      <div class="list" style="max-height:250px;overflow:auto;">
        ${products.length ? products.map(({product,index}) => `
          <div class="item" style="align-items:center;gap:8px;padding:8px 0;">
            <div style="flex:1;min-width:0;">
              <b>${esc(product.name || "Producto")}</b>
              <div class="muted">${esc(product.category || "Sin categoría")} · ${money(product.price)}</div>
            </div>
            <button type="button" class="primary" onclick="addQuoteItem(${index})">+ Agregar</button>
          </div>
        `).join("") : `<div class="empty">No hay productos que coincidan.</div>`}
      </div>
    </div>

    <div class="panel" style="padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <h2 style="margin:0;">📋 Cotización</h2>
        <strong>${money(quoteTotal())}</strong>
      </div>

      ${quoteItems.length ? quoteItems.map(item => {
        const subtotal = (+item.qty || 0) * (+item.unitPrice || 0);
        return `
          <div class="item" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;">
            <div style="min-width:0;">
              <b>${esc(item.name)}</b>
              <div style="display:grid;grid-template-columns:72px minmax(100px,150px);gap:6px;margin-top:5px;">
                <input class="search" type="number" min="1" step="1" value="${+item.qty || 1}" aria-label="Cantidad" onchange="updateQuoteItem('${esc(item.key)}','qty',this.value)">
                <input class="search" type="number" min="0" step="1" value="${+item.unitPrice || 0}" aria-label="Precio unitario" onchange="updateQuoteItem('${esc(item.key)}','unitPrice',this.value)">
              </div>
            </div>
            <div style="text-align:right;white-space:nowrap;">
              <b>${money(subtotal)}</b><br>
              <button type="button" onclick="removeQuoteItem('${esc(item.key)}')" style="margin-top:4px;">🗑️</button>
            </div>
          </div>`;
      }).join("") : `<div class="empty">Agrega productos para comenzar.</div>`}

      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,.08);">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <span class="muted">Subtotal</span><strong>${money(quoteSubtotal())}</strong>
        </div>
        ${quoteDiscountAmount() > 0 ? `<div style="display:flex;justify-content:space-between;gap:10px;margin-top:4px;"><span class="muted">Descuento</span><strong>-${money(quoteDiscountAmount())}</strong></div>` : ""}
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:6px;font-size:1.25rem;">
          <b>Total</b><strong>${money(quoteTotal())}</strong>
        </div>
      </div>

      <details ${hasExtra ? "open" : ""} style="margin-top:10px;">
        <summary style="cursor:pointer;font-weight:700;padding:7px 0;">⚙️ Más opciones ${hasExtra ? "· configuradas" : ""}</summary>
        <div style="display:grid;gap:8px;padding-top:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label>Descuento
              <input id="quoteDiscount" class="search" type="number" min="0" step="1" placeholder="0" value="${quoteDiscount || 0}" style="width:100%;box-sizing:border-box;">
            </label>
            <label>Seguimiento
              <input id="quoteFollowupDate" class="search" type="date" value="${esc(quoteFollowupDate)}" style="width:100%;box-sizing:border-box;">
            </label>
          </div>
          <label>Nota interna de seguimiento
            <input id="quoteFollowupNote" class="search" placeholder="Ej. llamar, confirmar pedido..." value="${esc(quoteFollowupNote)}" style="width:100%;box-sizing:border-box;">
          </label>
          <label>Nota para el cliente
            <textarea id="quoteNote" rows="2" placeholder="Ej. domicilio, instalación, disponibilidad...">${esc(quoteNote)}</textarea>
          </label>
          <div class="muted">La nota interna no aparece en la cotización del cliente.</div>
        </div>
      </details>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;">
        <button type="button" class="primary" onclick="saveQuote()">${quoteEditingId ? "💾 Guardar cambios" : "💾 Guardar cotización"}</button>
        <button type="button" onclick="copyQuote()">📋 Copiar</button>
        <button type="button" class="primary" onclick="shareQuoteWhatsApp()">📲 WhatsApp</button>
        <button type="button" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})">📂 Ver guardadas</button>
      </div>
      <div class="muted" style="margin-top:8px;text-align:center;">Los precios y la ganancia interna no se muestran al cliente.</div>
    </div>

    <div class="panel" style="padding:0 12px;">
      <details>
        <summary style="cursor:pointer;font-weight:700;padding:12px 0;">📊 Resumen de cotizaciones</summary>
        <div id="quoteReports" style="padding-bottom:12px;"></div>
      </details>
    </div>

    <div class="panel" style="padding:0 12px;">
      <details>
        <summary style="cursor:pointer;font-weight:700;padding:12px 0;">🧠 Inteligencia comercial</summary>
        <div id="quoteIntelligence" style="padding-bottom:12px;"></div>
      </details>
    </div>

    <div class="panel" style="padding:0 12px;">
      <details>
        <summary style="cursor:pointer;font-weight:700;padding:12px 0;">📌 Seguimiento comercial</summary>
        <div id="quoteFollowupSummary" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px;"></div>
        <div id="quoteFollowupList" style="padding-bottom:12px;"></div>
      </details>
    </div>

    <div class="panel" style="padding:0 12px;">
      <details>
        <summary style="cursor:pointer;font-weight:700;padding:12px 0;">🔔 Automatización y alertas</summary>
        <div id="quoteAutomationAlerts" style="padding-bottom:12px;"></div>
      </details>
    </div>

    <div class="panel" style="padding:0 12px;">
      <details>
        <summary style="cursor:pointer;font-weight:700;padding:12px 0;">📋 Cotizaciones guardadas <span class="muted">· ${Array.isArray(db.quotes) ? db.quotes.length : 0}</span></summary>
        <div id="quotesList" style="padding-bottom:12px;"></div>
      </details>
    </div>
  `;

  renderQuotesList();
  renderQuoteReports();
  renderQuoteIntelligence();
  renderQuoteFollowupPanel();
  renderQuoteAutomationAlerts();

  const customerSelect = document.getElementById("quoteCustomerSelect");
  const customer = document.getElementById("quoteCustomer");
  const phone = document.getElementById("quotePhone");

  if(customerSelect){
    customerSelect.onchange = function(){
      const value = this.value;
      if(value === "__manual__"){
        quoteCustomer = "";
        if(customer){ customer.style.display = ""; customer.focus(); }
        quotePhone = "";
        if(phone) phone.value = "";
        return;
      }
      if(value === ""){
        quoteCustomer = "";
        quotePhone = "";
        if(customer){ customer.value = ""; customer.style.display = "none"; }
        if(phone) phone.value = "";
        return;
      }
      const selectedCustomer = db.customers[Number(value)];
      if(selectedCustomer){
        quoteCustomer = String(selectedCustomer.name || "").trim();
        quotePhone = String(selectedCustomer.phone || "").trim();
        if(customer){ customer.value = quoteCustomer; customer.style.display = "none"; }
        if(phone) phone.value = quotePhone;
      }
    };
  }
  if(customer) customer.oninput = function(){ quoteCustomer = this.value; };
  if(phone) phone.oninput = function(){ quotePhone = this.value; };
  const note = document.getElementById("quoteNote");
  if(note) note.oninput = function(){ quoteNote = this.value; };
  const followupDate = document.getElementById("quoteFollowupDate");
  if(followupDate) followupDate.oninput = function(){ quoteFollowupDate = this.value; };
  const followupNote = document.getElementById("quoteFollowupNote");
  if(followupNote) followupNote.oninput = function(){ quoteFollowupNote = this.value; };
  const discount = document.getElementById("quoteDiscount");
  if(discount) discount.oninput = function(){ quoteDiscount = Math.max(0, Number(this.value) || 0); renderCotizador(); };
  const search = document.getElementById("quoteSearch");
  if(search){
    search.oninput = function(){
      quoteSearch = this.value;
      const cursor = this.value.length;
      renderCotizador();
      const next = document.getElementById("quoteSearch");
      if(next){ next.focus(); try{ next.setSelectionRange(cursor,cursor); }catch(_){} }
    };
  }
  const category = document.getElementById("quoteCategory");
  if(category) category.onchange = function(){ quoteCategory = this.value; renderCotizador(); };
}


/* =========================================================
   MOVIMIENTOS
   ========================================================= */

/* =========================================================
   ENCARGOS
   ========================================================= */

let orderFilter = "Todos";
let orderSearch = "";

function orderStatusClass(status){
  const value = String(status || "Pendiente");
  if(value === "Listo" || value === "Entregado"){
    return "done";
  }
  return "";
}

function renderOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );

  if(!list){
    return;
  }

  let panel =
    document.getElementById(
      "ordersSmartPanel"
    );

  if(!panel){

    panel =
      document.createElement(
        "div"
      );

    panel.id =
      "ordersSmartPanel";

    list.insertAdjacentElement(
      "beforebegin",
      panel
    );

  }

  const pendingCount =
    db.orders.filter(
      order =>
        String(order.status || "Pendiente") !==
        "Entregado" &&
        String(order.status || "Pendiente") !==
        "Cancelado"
    ).length;

  const readyCount =
    db.orders.filter(
      order =>
        String(order.status || "") ===
        "Listo"
    ).length;

  const deliveredCount =
    db.orders.filter(
      order =>
        String(order.status || "") ===
        "Entregado"
    ).length;

  panel.innerHTML = `

    <div class="cards" style="margin:10px 0;">

      <div class="card">
        <b>📦 Activos</b>
        <strong>${pendingCount}</strong>
      </div>

      <div class="card">
        <b>✅ Listos</b>
        <strong>${readyCount}</strong>
      </div>

      <div class="card">
        <b>🤝 Entregados</b>
        <strong>${deliveredCount}</strong>
      </div>

    </div>

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:10px 0;
    ">

      <input
        id="orderSearch"
        class="search"
        placeholder="🔎 Buscar encargo o cliente"
        value="${esc(orderSearch)}"
      >

      <select
        id="orderFilter"
        class="search"
      >
        <option value="Todos" ${orderFilter === "Todos" ? "selected" : ""}>
          Todos
        </option>
        <option value="Pendiente" ${orderFilter === "Pendiente" ? "selected" : ""}>
          🕐 Pendientes
        </option>
        <option value="Conseguir" ${orderFilter === "Conseguir" ? "selected" : ""}>
          🔎 Por conseguir
        </option>
        <option value="Listo" ${orderFilter === "Listo" ? "selected" : ""}>
          ✅ Listos
        </option>
        <option value="Entregado" ${orderFilter === "Entregado" ? "selected" : ""}>
          🤝 Entregados
        </option>
        <option value="Cancelado" ${orderFilter === "Cancelado" ? "selected" : ""}>
          ❌ Cancelados
        </option>
      </select>

    </div>

    <button
      class="primary"
      type="button"
      onclick="openOrder()"
      style="margin-bottom:10px;"
    >
      ➕ Nuevo encargo
    </button>

  `;

  const searchInput =
    document.getElementById(
      "orderSearch"
    );

  if(searchInput){

    searchInput.oninput =
      function(){

        orderSearch =
          this.value;

        renderOrders();

        const input =
          document.getElementById(
            "orderSearch"
          );

        if(input){

          input.focus();

          try{
            input.setSelectionRange(
              input.value.length,
              input.value.length
            );
          }catch(_){}

        }

      };

  }

  const filterSelect =
    document.getElementById(
      "orderFilter"
    );

  if(filterSelect){

    filterSelect.onchange =
      function(){

        orderFilter =
          this.value;

        renderOrders();

      };

  }

  const searchText =
    orderSearch
      .trim()
      .toLowerCase();

  const rows =
    db.orders
      .map(
        (order,index) => ({
          order,
          index
        })
      )
      .filter(
        ({order}) => {

          const status =
            String(
              order.status ||
              "Pendiente"
            );

          if(
            orderFilter !==
            "Todos" &&
            status !==
            orderFilter
          ){
            return false;
          }

          if(!searchText){
            return true;
          }

          return (
            String(order.product || "")
              .toLowerCase()
              .includes(searchText) ||
            String(order.client || "")
              .toLowerCase()
              .includes(searchText) ||
            String(order.note || "")
              .toLowerCase()
              .includes(searchText)
          );

        }
      )
      .sort(
        (a,b) =>
          String(
            b.order.date ||
            ""
          ).localeCompare(
            String(
              a.order.date ||
              ""
            )
          )
      );

  list.innerHTML =
    rows.length

      ? rows.map(
          ({order,index}) => {

            const status =
              String(
                order.status ||
                "Pendiente"
              );

            const dueDate =
              String(
                order.dueDate ||
                ""
              );

            let dueText =
              "";

            if(dueDate){

              const parsed =
                parseLocalDate(
                  dueDate
                );

              if(parsed){

                const today =
                  startOfDay(
                    new Date()
                  );

                const due =
                  startOfDay(
                    parsed
                  );

                if(
                  due.getTime() ===
                  today.getTime()
                ){
                  dueText =
                    " · 📅 Para hoy";
                }else if(
                  due.getTime() <
                  today.getTime() &&
                  status !==
                  "Entregado" &&
                  status !==
                  "Cancelado"
                ){
                  dueText =
                    " · ⚠️ Vencido";
                }

              }

            }

            return `

              <div
                class="item"
                style="
                  align-items:flex-start;
                  gap:10px;
                "
              >

                <div
                  style="
                    flex:1;
                    min-width:0;
                  "
                >

                  <b>
                    ${esc(
                      order.product ||
                      "Encargo"
                    )}
                  </b>

                  <div class="muted">

                    👤 Cliente:
                    ${esc(
                      order.client ||
                      "Sin cliente"
                    )}

                    ·

                    📦 Cantidad:
                    ${esc(
                      order.qty ||
                      1
                    )}

                    ${dueText}

                  </div>

                  <div class="muted">

                    ${
                      order.dueDate
                        ? `📅 Fecha solicitada: ${esc(order.dueDate)} · `
                        : ""
                    }

                    ${esc(
                      order.note ||
                      "Sin nota"
                    )}

                  </div>

                  <div class="muted">
                    Registrado:
                    ${esc(
                      order.date ||
                      ""
                    )}
                  </div>

                  ${
                    (+order.price || 0) > 0
                      ? `
                        <div
                          style="
                            margin-top:4px;
                            font-weight:700;
                          "
                        >
                          Valor estimado:
                          ${money(order.price)}
                        </div>
                      `
                      : ""
                  }

                  <div
                    style="
                      display:flex;
                      gap:6px;
                      flex-wrap:wrap;
                      margin-top:8px;
                    "
                  >

                    <button
                      type="button"
                      onclick="editOrder(${index})"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      onclick="advanceOrderStatus(${index})"
                    >
                      🔄 Cambiar estado
                    </button>

                    <button
                      type="button"
                      onclick="deleteOrder(${index})"
                    >
                      🗑️
                    </button>

                  </div>

                </div>

                <button
                  type="button"
                  class="
                    badge
                    order-status
                    ${orderStatusClass(status)}
                  "
                  onclick="
                    advanceOrderStatus(
                      ${index}
                    )
                  "
                >
                  ${esc(status)}
                </button>

              </div>

            `;

          }
        ).join("")

      : `

        <div class="empty">
          ${
            db.orders.length
              ? "No hay encargos que coincidan con el filtro."
              : "No hay encargos registrados."
          }
        </div>

      `;

}


function advanceOrderStatus(index){

  if(!db.orders[index]){
    return;
  }

  const sequence = [
    "Pendiente",
    "Conseguir",
    "Listo",
    "Entregado"
  ];

  const current =
    String(
      db.orders[index].status ||
      "Pendiente"
    );

  let next;

  if(current === "Cancelado"){
    next = "Pendiente";
  }else{

    const position =
      sequence.indexOf(
        current
      );

    next =
      sequence[
        position < 0
          ? 0
          : (position + 1) % sequence.length
      ];

  }

  db.orders[index].status =
    next;

  db.orders[index].updated =
    now();

  save();

}


function toggleOrder(index) {

  advanceOrderStatus(index);

}


/* =========================================================
   MODAL
   ========================================================= */

function getModal() {

  return document.getElementById(
    "modal"
  );

}


function modal(
  title,
  html,
  submitHandler
) {

  const modalElement =
    getModal();


  const titleElement =
    document.getElementById(
      "modalTitle"
    );


  const formElement =
    document.getElementById(
      "form"
    );


  if(
    !modalElement ||
    !titleElement ||
    !formElement
  ){

    console.error(
      "No se encontró el modal."
    );

    return;

  }


  titleElement.textContent =
    title;


  formElement.innerHTML =
    html;


  modalElement.classList.remove(
    "hidden"
  );


  formElement.onsubmit =
    typeof submitHandler ===
    "function"

      ? submitHandler

      : null;

}


function closeModal() {

  const modalElement =
    getModal();


  if(modalElement){

    modalElement.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   PRODUCTOS
   ========================================================= */

function openProduct(
  index = null
) {

  const product =
    index === null

      ? {

          name: "",

          category:
            "Peces",

          cost: 0,

          price: 0,

          stock: 0,

          min: 1

        }

      : db.products[index];


  if(!product){

    return;

  }


  modal(

    index === null
      ? "Nuevo producto"
      : "Editar producto",


    `

      <label>

        Producto

        <input
          name="name"
          required
          value="${esc(
            product.name
          )}"
          placeholder="Ej. Guppy"
        >

      </label>


      <label>

        Categoría

        <select name="category">

          ${
            inventoryCategories()
              .map(
                category => `

                  <option
                    value="${esc(
                      category
                    )}"
                    ${
                      String(
                        product.category ||
                        ""
                      ) === category
                        ? "selected"
                        : ""
                    }
                  >

                    ${esc(
                      category
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <label>

        Costo

        <input
          name="cost"
          type="number"
          min="0"
          step="1"
          value="${
            +product.cost || 0
          }"
        >

      </label>


      <label>

        Precio de venta

        <input
          name="price"
          type="number"
          min="0"
          step="1"
          value="${
            +product.price || 0
          }"
        >

      </label>


      <label>

        Stock

        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          value="${
            +product.stock || 0
          }"
        >

      </label>


      <label>

        Stock mínimo

        <input
          name="min"
          type="number"
          min="0"
          step="1"
          value="${
            +product.min || 0
          }"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
          flex-wrap:wrap;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>


        ${
          index !== null

            ? `

              <button
                type="button"
                onclick="deleteProduct(
                  ${index}
                )"
              >
                🗑️ Eliminar
              </button>

            `

            : ""
        }

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const item = {

        name:
          form.name.value.trim(),

        category:
          form.category.value,

        cost:
          +form.cost.value || 0,

        price:
          +form.price.value || 0,

        stock:
          Math.max(
            0,
            +form.stock.value || 0
          ),

        min:
          Math.max(
            0,
            +form.min.value || 0
          )

      };


      if(!item.name){

        alert(
          "Escribe el nombre del producto."
        );

        return;

      }


      if(index === null){

        db.products.push(
          item
        );

      }else{

        db.products[index] =
          item;

      }


      save();

      closeModal();

    }

  );

}


function editProduct(index) {

  openProduct(index);

}


function deleteProduct(index) {

  if(!db.products[index]){

    return;

  }


  if(
    !confirm(
      `¿Eliminar "${db.products[index].name}"?`
    )
  ){

    return;

  }


  db.products.splice(
    index,
    1
  );


  save();

  closeModal();

}


