const KEY="aquarium_fish_data_v1";
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],sales:[],moves:[]};
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));renderAll()};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function show(tab){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(tab).classList.add('active');document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab))}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.tab));

function renderAll(){renderHome();renderInventory();renderSales();renderMoves()}
function renderHome(){
 const total=db.sales.reduce((s,x)=>s+(+x.total||0),0);
 document.getElementById('salesTotal').textContent=money(total);
 document.getElementById('salesCount').textContent=`${db.sales.length} transacciones`;
 document.getElementById('productCount').textContent=db.products.length;
 document.getElementById('lowStock').textContent=db.products.filter(p=>(+p.stock||0)<=(+p.min||0)).length;
 const el=document.getElementById('recentSales');
 el.innerHTML=db.sales.length?db.sales.slice(-5).reverse().map(s=>`<div class="item"><div><b>${esc(s.product)}</b><div class="muted">${esc(s.client||'Sin cliente')} · ${s.qty} und.</div></div><strong>${money(s.total)}</strong></div>`).join(''):'<div class="empty">Todavía no hay ventas.</div>';
}
function renderInventory(){
 const q=(document.getElementById('search')?.value||'').toLowerCase();
 const rows=db.products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(q));
 document.getElementById('inventoryList').innerHTML=rows.length?rows.map(p=>`<div class="item"><div><b>${esc(p.name)}</b><div class="muted">${esc(p.category||'Sin categoría')} · ${money(p.price)}</div></div><span class="badge ${+p.stock<=+p.min?'low':''}">Stock: ${p.stock}</span></div>`).join(''):'<div class="empty">No hay productos. Agrega el primero.</div>';
}
function renderSales(){
 document.getElementById('salesList').innerHTML=db.sales.length?db.sales.slice().reverse().map(s=>`<div class="item"><div><b>${esc(s.product)}</b><div class="muted">${esc(s.client||'Sin cliente')} · ${esc(s.date)}</div></div><div><b>${money(s.total)}</b><div class="muted">${s.qty} und.</div></div></div>`).join(''):'<div class="empty">No hay ventas registradas.</div>';
}
function renderMoves(){
 document.getElementById('movesList').innerHTML=db.moves.length?db.moves.slice().reverse().map(m=>`<div class="item"><div><b>${esc(m.product)}</b><div class="muted">${esc(m.reason)} · ${esc(m.responsible||'')}</div></div><span class="badge">${esc(m.type)} ${m.qty}</span></div>`).join(''):'<div class="empty">No hay movimientos.</div>';
}
function modal(title,html){document.getElementById('modalTitle').textContent=title;document.getElementById('form').innerHTML=html;document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
function openProduct(){modal('Nuevo producto',`<label>Producto<input name="name" required placeholder="Ej. Guppy"></label><label>Categoría<input name="category" placeholder="Peces, alimento, accesorio..."></label><label>Precio de venta<input name="price" type="number" min="0" value="0"></label><label>Stock inicial<input name="stock" type="number" min="0" value="0"></label><label>Stock mínimo<input name="min" type="number" min="0" value="1"></label><div class="form-actions"><button type="button" onclick="closeModal()">Cancelar</button><button class="primary">Guardar</button></div>`);document.getElementById('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target);db.products.push(Object.fromEntries(f));save();closeModal()}}
function productOptions(){return db.products.map((p,i)=>`<option value="${i}">${esc(p.name)} (stock ${p.stock})</option>`).join('')}
function openSale(){
 if(!db.products.length){alert('Primero agrega un producto en Inventario.');return}
 modal('Nueva venta',`<label>Producto<select name="pi" required>${productOptions()}</select></label><label>Cantidad<input name="qty" type="number" min="1" value="1" required></label><label>Cliente<input name="client" placeholder="Nombre del cliente"></label><label>Forma de pago<select name="pay"><option>Efectivo</option><option>Transferencia</option><option>Nequi</option><option>Otro</option></select></label><div class="form-actions"><button type="button" onclick="closeModal()">Cancelar</button><button class="primary">Registrar venta</button></div>`);
 document.getElementById('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),p=db.products[+f.get('pi')],q=+f.get('qty');if(q>+p.stock){alert('No hay suficiente stock.');return}p.stock-=q;db.sales.push({product:p.name,qty:q,client:f.get('client'),pay:f.get('pay'),total:q*(+p.price||0),date:new Date().toLocaleString('es-CO')});db.moves.push({product:p.name,type:'Salida',qty:q,reason:'Venta',responsible:f.get('client'),date:new Date().toLocaleString('es-CO')});save();closeModal()}
}
function openMove(){
 if(!db.products.length){alert('Primero agrega un producto en Inventario.');return}
 modal('Registrar movimiento',`<label>Producto<select name="pi">${productOptions()}</select></label><label>Tipo<select name="type"><option>Entrada</option><option>Salida</option><option>Ajuste</option></select></label><label>Cantidad<input name="qty" type="number" min="1" value="1"></label><label>Motivo<input name="reason" required placeholder="Compra, pérdida, traslado..."></label><label>Responsable<input name="responsible" placeholder="Nombre"></label><div class="form-actions"><button type="button" onclick="closeModal()">Cancelar</button><button class="primary">Registrar movimiento</button></div>`);
 document.getElementById('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),p=db.products[+f.get('pi')],q=+f.get('qty'),t=f.get('type');if(t==='Entrada')p.stock+=q;else if(t==='Salida'){if(q>p.stock){alert('No hay suficiente stock.');return}p.stock-=q}else{p.stock=q}db.moves.push({product:p.name,type:t,qty:q,reason:f.get('reason'),responsible:f.get('responsible'),date:new Date().toLocaleString('es-CO')});save();closeModal()}
}
let deferred;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null}};
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
renderAll();
