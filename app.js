const KEY="aquarium_fish_data_v5";

let db=JSON.parse(localStorage.getItem(KEY)||'null')||
JSON.parse(localStorage.getItem('aquarium_fish_data_v4')||'null')||
JSON.parse(localStorage.getItem('aquarium_fish_data_v3')||'null')||
JSON.parse(localStorage.getItem('aquarium_fish_data_v2')||'null')||
JSON.parse(localStorage.getItem('aquarium_fish_data_v1')||'null')||
{products:[],sales:[],moves:[],customers:[],orders:[]};

db.products=db.products||[];
db.sales=db.sales||[];
db.moves=db.moves||[];
db.customers=db.customers||[];
db.orders=db.orders||[];

const money=n=>new Intl.NumberFormat('es-CO',{
  style:'currency',
  currency:'COP',
  maximumFractionDigits:0
}).format(Number(n)||0);

const now=()=>new Date().toLocaleString('es-CO');

const save=()=>{
  localStorage.setItem(KEY,JSON.stringify(db));
  renderAll();
};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[m]));

function show(tab){
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.querySelectorAll('nav button').forEach(x=>
    x.classList.toggle('active',x.dataset.tab===tab)
  );
}

document.querySelectorAll('nav button').forEach(b=>
  b.onclick=()=>show(b.dataset.tab)
);

/* =========================================================
   INVENTARIO - FILTROS Y ORDEN
   ========================================================= */

let inventoryCategory='Todas';
let inventorySort='name-asc';

function inventoryCategories(){
  const base=[
    'Peces',
    'Acuarios',
    'Filtros',
    'Iluminación',
    'Sustratos',
    'Decoración',
    'Alimentos',
    'Accesorios',
    'Otros'
  ];

  const existing=db.products
    .map(p=>String(p.category||'').trim())
    .filter(Boolean);

  return [...new Set([...base,...existing])]
    .sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
}

function setInventoryCategory(value){
  inventoryCategory=value;
  renderInventory();
}

function setInventorySort(value){
  inventorySort=value;
  renderInventory();
}

/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll(){
  renderHome();
  renderInventory();
  renderSales();
  renderCustomers();
  renderMoves();
  renderOrders();
  renderInternal();
}

/* =========================================================
   VENTAS
   ========================================================= */

function saleLabel(s){
  return s.items&&s.items.length
    ?s.items.map(i=>i.product).join(', ')
    :s.product||'Venta';
}

function saleQty(s){
  return s.items&&s.items.length
    ?s.items.reduce((n,i)=>n+(+i.qty||0),0)
    :(+s.qty||0);
}

function salePaid(s){
  return s.paid===undefined
    ?(+s.total||0)
    :Math.max(0,Math.min(+s.paid||0,+s.total||0));
}

/* =========================================================
   INICIO
   ========================================================= */

function renderHome(){
  const total=db.sales.reduce((s,x)=>s+(+x.total||0),0);

  salesTotal.textContent=money(total);
  salesCount.textContent=`${db.sales.length} transacciones`;
  productCount.textContent=db.products.length;
  customerCount.textContent=db.customers.length;

  lowStock.textContent=db.products.filter(p=>
    (+p.stock||0)<=(+p.min||0)
  ).length;

  recentSales.innerHTML=db.sales.length
    ?db.sales.slice(-6).reverse().map(s=>`
      <div class="item">
        <div>
          <b>${esc(saleLabel(s))}</b>
          <div class="muted">
            ${esc(s.client||'Sin cliente')} ·
            ${saleQty(s)} und. ·
            ${esc(s.pay||'')}
          </div>
        </div>

        <div class="right">
          <strong>${money(s.total)}</strong>
          <small>
            ${
              s.status==='Pendiente'
              ?'Pendiente de pago'
              :s.status==='Abono'
              ?'Abono: '+money(salePaid(s))
              :'Pagada'
            }
          </small>
        </div>
      </div>
    `).join('')
    :'<div class="empty">Todavía no hay ventas.</div>';
}

/* =========================================================
   INVENTARIO
   ========================================================= */

function renderInventory(){

  const q=(search.value||'').toLowerCase().trim();

  let rows=db.products.filter(p=>
    `${p.name||''} ${p.category||''}`.toLowerCase().includes(q)
  );

  /* FILTRO POR CATEGORÍA */
  if(inventoryCategory!=='Todas'){
    rows=rows.filter(p=>
      String(p.category||'').trim().toLowerCase()===
      inventoryCategory.toLowerCase()
    );
  }

  /* ORDEN */
  if(inventorySort==='name-asc'){

    rows.sort((a,b)=>
      String(a.name||'').localeCompare(
        String(b.name||''),
        'es',
        {sensitivity:'base'}
      )
    );

  }else if(inventorySort==='name-desc'){

    rows.sort((a,b)=>
      String(b.name||'').localeCompare(
        String(a.name||''),
        'es',
        {sensitivity:'base'}
      )
    );

  }else if(inventorySort==='stock-desc'){

    rows.sort((a,b)=>
      (+b.stock||0)-(+a.stock||0)
    );

  }else if(inventorySort==='stock-asc'){

    rows.sort((a,b)=>
      (+a.stock||0)-(+b.stock||0)
    );
  }

  /* CREAR CONTROLES */
  let controls=document.getElementById('inventoryControls');

  if(!controls){
    controls=document.createElement('div');
    controls.id='inventoryControls';
    search.insertAdjacentElement('afterend',controls);
  }

  const categories=inventoryCategories();

  controls.innerHTML=`
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:10px 0;
    ">

      <select
        id="inventoryCategory"
        class="search"
        onchange="setInventoryCategory(this.value)"
      >

        <option value="Todas">
          📂 Todas las categorías
        </option>

        ${categories.map(c=>`
          <option
            value="${esc(c)}"
            ${
              c.toLowerCase()===inventoryCategory.toLowerCase()
              ?'selected'
              :''
            }
          >
            ${esc(c)}
          </option>
        `).join('')}

      </select>

      <select
        id="inventorySort"
        class="search"
        onchange="setInventorySort(this.value)"
      >

        <option
          value="name-asc"
          ${inventorySort==='name-asc'?'selected':''}
        >
          🔤 A-Z
        </option>

        <option
          value="name-desc"
          ${inventorySort==='name-desc'?'selected':''}
        >
          🔤 Z-A
        </option>

        <option
          value="stock-desc"
          ${inventorySort==='stock-desc'?'selected':''}
        >
          📈 Mayor stock
        </option>

        <option
          value="stock-asc"
          ${inventorySort==='stock-asc'?'selected':''}
        >
          📉 Menor stock
        </option>

      </select>

    </div>

    <div class="muted" style="margin:0 0 8px;">
      Mostrando ${rows.length} de ${db.products.length} productos
    </div>
  `;

  /* LISTA DE PRODUCTOS */

  inventoryList.innerHTML=rows.length

    ?rows.map(p=>`
      <div
        class="item clickable"
        onclick="editProduct(${db.products.indexOf(p)})"
      >

        <div>

          <b>${esc(p.name)}</b>

          <div class="muted">
            ${esc(p.category||'Sin categoría')}
          </div>

          <div class="muted">
            Costo ${money(p.cost)} ·
            Venta ${money(p.price)} ·
            Ganancia/u ${
              money((+p.price||0)-(+p.cost||0))
            }
          </div>

        </div>

        <span class="badge ${+p.stock<=+p.min?'low':''}">
          Stock: ${p.stock}
        </span>

      </div>
    `).join('')

    :'<div class="empty">No hay productos con estos filtros.</div>';
}

/* =========================================================
   FECHAS
   ========================================================= */

function dateKey(value){
  const d=new Date(value);

  if(!Number.isNaN(d.getTime()))
    return d.toLocaleDateString('es-CO',{
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    });

  const m=String(value||'').match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  );

  return m
    ?`${m[3].length===2?'20'+m[3]:m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`
    :'Sin fecha';
}

function dateLabel(key){
  if(key==='Sin fecha')return key;

  const parts=key.split('/');

  if(parts.length===3){
    const [d,m,y]=parts;

    return new Date(
      +y,
      +m-1,
      +d
    ).toLocaleDateString('es-CO',{
      weekday:'long',
      day:'numeric',
      month:'long',
      year:'numeric'
    });
  }

  return key;
}

/* =========================================================
   LISTA DE VENTAS
   ========================================================= */

function renderSales(){

  if(!db.sales.length){
    salesList.innerHTML=
      '<div class="empty">No hay ventas registradas.</div>';
    return;
  }

  const groups={};

  db.sales.forEach(s=>{
    const k=dateKey(s.date);
    (groups[k]||(groups[k]=[])).push(s);
  });

  const keys=Object.keys(groups).sort((a,b)=>{
    const pa=a.split('/');
    const pb=b.split('/');

    if(pa.length===3&&pb.length===3)
      return new Date(
        +pb[2],
        +pb[1]-1,
        +pb[0]
      )-
      new Date(
        +pa[2],
        +pa[1]-1,
        +pa[0]
      );

    return b.localeCompare(a);
  });

  salesList.innerHTML=keys.map((k,gi)=>{

    const list=groups[k].slice().reverse();

    const total=list.reduce(
      (n,s)=>n+(+s.total||0),
      0
    );

    return `
      <div class="date-group">

        <button
          class="date-group-head"
          type="button"
          onclick="toggleDateGroup(this)"
        >

          <span>
            <b>${esc(dateLabel(k))}</b>

            <small>
              ${list.length}
              ${list.length===1?'venta':'ventas'}
              · ${money(total)}
            </small>
          </span>

          <span class="date-chevron">
            ${gi===0?'▲':'▼'}
          </span>

        </button>

        <div class="date-group-body ${gi===0?'open':''}">

          ${list.map(s=>{

            const detail=
              s.items&&s.items.length
              ?s.items.map(i=>
                `${esc(i.product)} × ${i.qty}`
              ).join(' · ')
              :`${esc(s.product)} × ${s.qty||0}`;

            return `
              <div class="item">

                <div>

                  <b>
                    ${esc(s.client||'Sin cliente')}
                  </b>

                  <div class="muted">
                    ${detail}
                  </div>

                  <div class="muted">
                    ${esc(s.date)} ·
                    ${esc(s.pay||'')} ·
                    ${esc(s.status||'Pagada')}
                  </div>

                </div>

                <div class="right">

                  <b>${money(s.total)}</b>

                  <small>
                    ${
                      s.status==='Pendiente'
                      ?'Pendiente'
                      :s.status==='Abono'
                      ?'Abono '+money(salePaid(s))
                      :'Pagada'
                    }
                  </small>

                </div>

              </div>
            `;

          }).join('')}

        </div>

      </div>
    `;

  }).join('');
}

function toggleDateGroup(btn){
  const body=btn.nextElementSibling;
  const open=body.classList.toggle('open');

  btn.querySelector('.date-chevron').textContent=
    open?'▲':'▼';
}

/* =========================================================
   CLIENTES
   ========================================================= */

function customerStats(name){

  const sales=db.sales.filter(
    s=>s.client===name
  );

  const bought=sales.reduce(
    (n,s)=>n+(+s.total||0),
    0
  );

  const paid=sales.reduce(
    (n,s)=>n+salePaid(s),
    0
  );

  return {
    sales,
    bought,
    paid,
    balance:Math.max(0,bought-paid)
  };
}

function renderCustomers(){

  const q=(customerSearch.value||'').toLowerCase();

  const rows=db.customers.filter(c=>
    `${c.name} ${c.phone}`.toLowerCase().includes(q)
  );

  customersList.innerHTML=rows.length

    ?rows.slice().sort((a,b)=>
      a.name.localeCompare(b.name)
    ).map(c=>{

      const st=customerStats(c.name);

      return `
        <div
          class="item clickable"
          onclick="editCustomer(${db.customers.indexOf(c)})"
        >

          <div>

            <b>${esc(c.name)}</b>

            <div class="muted">
              ${esc(c.phone||'Sin teléfono')}
            </div>

            <div class="muted">
              Comprado ${money(st.bought)} ·
              Pagado ${money(st.paid)} ·
              Saldo ${money(st.balance)}
            </div>

            ${
              c.note
              ?`<div class="muted">
                  Nota: ${esc(c.note)}
                </div>`
              :''
            }

          </div>

          <span class="badge ${st.balance>0?'low':''}">
            ${st.sales.length} ventas
          </span>

        </div>
      `;

    }).join('')

    :'<div class="empty">No hay clientes. Agrega el primero.</div>';
}

/* =========================================================
   MOVIMIENTOS
   ========================================================= */

function renderMoves(){

  movesList.innerHTML=db.moves.length

    ?db.moves.slice().reverse().map(m=>`

      <div class="item">

        <div>

          <b>${esc(m.product)}</b>

          <div class="muted">
            ${esc(m.reason)} ·
            ${esc(m.responsible||'')} ·
            ${esc(m.date||'')}
          </div>

        </div>

        <span class="badge">
          ${esc(m.type)} ${m.qty}
        </span>

      </div>

    `).join('')

    :'<div class="empty">No hay movimientos.</div>';
}

/* =========================================================
   ENCARGOS
   ========================================================= */

function renderOrders(){

  const rows=db.orders.slice().reverse();

  ordersList.innerHTML=rows.length

    ?rows.map((o,i)=>`

      <div class="item">

        <div>

          <b>
            ${esc(o.product||'Encargo')}
          </b>

          <div class="muted">
            Cliente:
            ${esc(o.client||'Sin cliente')}
            · Cantidad:
            ${esc(o.qty||1)}
          </div>

          <div class="muted">
            ${esc(o.note||'Sin nota')} ·
            ${esc(o.date||'')}
          </div>

        </div>

        <button
          type="button"
          class="badge order-status ${o.status==='Listo'?'done':''}"
          onclick="toggleOrder(${db.orders.length-1-i})"
        >
          ${esc(o.status||'Pendiente')}
        </button>

      </div>

    `).join('')

    :'<div class="empty">No hay encargos pendientes.</div>';
}

function toggleOrder(i){
  db.orders[i].status=
    db.orders[i].status==='Listo'
    ?'Pendiente'
    :'Listo';

  save();
}

/* =========================================================
   MODALES
   ========================================================= */

function modal(title,html){
  modalTitle.textContent=title;
  form.innerHTML=html;
  modalEl.classList.remove('hidden');
}

function closeModal(){
  modalEl.classList.add('hidden');
}

const modalEl=document.getElementById('modal');

/* =========================================================
   PRODUCTOS
   ========================================================= */

function openProduct(idx=null){

  const p=idx===null
    ?{
      name:'',
      category:'',
      cost:0,
      price:0,
      stock:0,
      min:1
    }
    :db.products[idx];

  modal(
    idx===null
    ?'Nuevo producto'
    :'Editar producto',

    `
      <label>
        Producto
        <input
          name="name"
          required
          value="${esc(p.name)}"
          placeholder="Ej. Guppy"
        >
      </label>

      <label>
        Categoría
        <input
          name="category"
          value="${esc(p.category||'')}"
          placeholder="Peces, alimento, accesorio..."
        >
      </label>

      <div class="grid2">

        <label>
          Precio de costo
          <input
            name="cost"
            type="number"
            min="0"
            value="${+p.cost||0}"
          >
        </label>

        <label>
          Precio de venta
          <input
            name="price"
            type="number"
            min="0"
            value="${+p.price||0}"
          >
        </label>

      </div>

      <div class="grid2">

        <label>
          Stock
          <input
            name="stock"
            type="number"
            min="0"
            value="${+p.stock||0}"
          >
        </label>

        <label>
          Stock mínimo
          <input
            name="min"
            type="number"
            min="0"
            value="${+p.min||1}"
          >
        </label>

      </div>

      <div class="form-actions">

        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>

        <button class="primary">
          Guardar
        </button>

      </div>
    `
  );

  form.onsubmit=e=>{
    e.preventDefault();

    let x=Object.fromEntries(
      new FormData(e.target)
    );

    x.cost=+x.cost||0;
    x.price=+x.price||0;
    x.stock=+x.stock||0;
    x.min=+x.min||0;

    if(idx===null)
      db.products.push(x);
    else
      db.products[idx]=x;

    save();
    closeModal();
  };
}

function editProduct(i){
  openProduct(i);
}

/* =========================================================
   OPCIONES DE PRODUCTOS
   ========================================================= */

function productOptions(selected=''){

  return `
    <option value="">
      Selecciona un producto
    </option>

    ${db.products.map((p,i)=>`

      <option
        value="${i}"
        ${String(i)===String(selected)?'selected':''}
      >
        ${esc(p.name)}
        (stock ${p.stock})
        — ${money(p.price)}
      </option>

    `).join('')}
  `;
}

function customerOptions(){

  return `
    <option value="">
      Sin cliente
    </option>

    ${db.customers.map(c=>`

      <option value="${esc(c.name)}">
        ${esc(c.name)}
      </option>

    `).join('')}
  `;
}

/* =========================================================
   FILAS DE VENTA
   ========================================================= */

function saleRow(i,idx='',qty=1){

  return `
    <div
      class="sale-row"
      data-row="${i}"
    >

      <div>

        <select
          class="sale-product"
          required
        >
          ${productOptions(idx)}
        </select>

        <div class="row-price">
          Precio: $0 · Subtotal: $0
        </div>

      </div>

      <input
        class="sale-qty"
        type="number"
        min="1"
        value="${qty}"
        required
      >

      <button
        type="button"
        class="remove-row"
        onclick="
          this.closest('.sale-row').remove();
          updateSalePreview()
        "
      >
        ×
      </button>

    </div>
  `;
}

/* =========================================================
   PREVISUALIZACIÓN DE VENTA
   ========================================================= */

function updateSalePreview(){

  const rows=[
    ...form.querySelectorAll('.sale-row')
  ];

  const items=[];

  for(const row of rows){

    const pi=
      row.querySelector('.sale-product')?.value;

    const q=
      +(row.querySelector('.sale-qty')?.value||0);

    const p=
      pi!==''?db.products[+pi]:null;

    if(p&&q>0)
      items.push({
        p,
        q,
        row
      });
  }

  let total=0;
  let profit=0;

  for(const {p,q,row} of items){

    const line=
