const KEY="aquarium_fish_data_v5";

let db=
  JSON.parse(localStorage.getItem(KEY)||'null')||
  JSON.parse(localStorage.getItem('aquarium_fish_data_v4')||'null')||
  JSON.parse(localStorage.getItem('aquarium_fish_data_v3')||'null')||
  JSON.parse(localStorage.getItem('aquarium_fish_data_v2')||'null')||
  JSON.parse(localStorage.getItem('aquarium_fish_data_v1')||'null')||
  {
    products:[],
    sales:[],
    moves:[],
    customers:[],
    orders:[]
  };

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

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[m]));

function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
  renderAll();
}

function show(tab){

  document.querySelectorAll('.screen')
    .forEach(x=>x.classList.remove('active'));

  const screen=document.getElementById(tab);

  if(screen){
    screen.classList.add('active');
  }

  document.querySelectorAll('nav button')
    .forEach(x=>{
      x.classList.toggle(
        'active',
        x.dataset.tab===tab
      );
    });
}

/* =========================================================
   NAVEGACIÓN
   ========================================================= */

document.querySelectorAll('nav button[data-tab]')
  .forEach(b=>{
    b.onclick=()=>{
      show(b.dataset.tab);
    };
  });


/* =========================================================
   INVENTARIO
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
    .sort((a,b)=>
      a.localeCompare(
        b,
        'es',
        {sensitivity:'base'}
      )
    );
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
   VENTAS - FUNCIONES AUXILIARES
   ========================================================= */

function saleLabel(s){

  return s.items&&s.items.length
    ?s.items.map(i=>i.product).join(', ')
    :s.product||'Venta';
}

function saleQty(s){

  return s.items&&s.items.length
    ?s.items.reduce(
      (n,i)=>n+(+i.qty||0),
      0
    )
    :(+s.qty||0);
}

function salePaid(s){

  return s.paid===undefined
    ?(+s.total||0)
    :Math.max(
      0,
      Math.min(
        +s.paid||0,
        +s.total||0
      )
    );
}


/* =========================================================
   INICIO
   ========================================================= */

function renderHome(){

  const total=db.sales.reduce(
    (s,x)=>s+(+x.total||0),
    0
  );

  const salesTotalEl=
    document.getElementById('salesTotal');

  const salesCountEl=
    document.getElementById('salesCount');

  const productCountEl=
    document.getElementById('productCount');

  const customerCountEl=
    document.getElementById('customerCount');

  const lowStockEl=
    document.getElementById('lowStock');

  const recentSalesEl=
    document.getElementById('recentSales');

  if(salesTotalEl)
    salesTotalEl.textContent=money(total);

  if(salesCountEl)
    salesCountEl.textContent=
      `${db.sales.length} transacciones`;

  if(productCountEl)
    productCountEl.textContent=
      db.products.length;

  if(customerCountEl)
    customerCountEl.textContent=
      db.customers.length;

  if(lowStockEl)
    lowStockEl.textContent=
      db.products.filter(p=>
        (+p.stock||0)<=(+p.min||0)
      ).length;

  if(!recentSalesEl)return;

  recentSalesEl.innerHTML=
    db.sales.length

    ?db.sales
      .slice(-6)
      .reverse()
      .map(s=>`

        <div class="item">

          <div>

            <b>
              ${esc(saleLabel(s))}
            </b>

            <div class="muted">
              ${esc(s.client||'Sin cliente')}
              · ${saleQty(s)} und.
              · ${esc(s.pay||'')}
            </div>

          </div>

          <div class="right">

            <strong>
              ${money(s.total)}
            </strong>

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

  const searchEl=
    document.getElementById('search');

  const listEl=
    document.getElementById('inventoryList');

  if(!searchEl||!listEl)return;

  const q=
    (searchEl.value||'')
    .toLowerCase()
    .trim();

  let rows=db.products.filter(p=>
    `${p.name||''} ${p.category||''}`
      .toLowerCase()
      .includes(q)
  );

  if(inventoryCategory!=='Todas'){

    rows=rows.filter(p=>
      String(p.category||'')
        .trim()
        .toLowerCase()===
      inventoryCategory.toLowerCase()
    );
  }

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

  let controls=
    document.getElementById(
      'inventoryControls'
    );

  if(!controls){

    controls=
      document.createElement('div');

    controls.id=
      'inventoryControls';

    searchEl.insertAdjacentElement(
      'afterend',
      controls
    );
  }

  const categories=
    inventoryCategories();

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
              c.toLowerCase()===
              inventoryCategory.toLowerCase()
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
      Mostrando ${rows.length}
      de ${db.products.length} productos
    </div>
  `;

  listEl.innerHTML=
    rows.length

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
            Costo ${money(p.cost)}
            · Venta ${money(p.price)}
            · Ganancia/u
            ${money(
              (+p.price||0)-
              (+p.cost||0)
            )}
          </div>

        </div>

        <span class="badge ${
          +p.stock<=+p.min?'low':''
        }">
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

  if(!Number.isNaN(d.getTime())){

    return d.toLocaleDateString(
      'es-CO',
      {
        year:'numeric',
        month:'2-digit',
        day:'2-digit'
      }
    );
  }

  const m=
    String(value||'').match(
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
    );

  return m
    ?`${m[3].length===2?'20'+m[3]:m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`
    :'Sin fecha';
}

function dateLabel(key){

  if(key==='Sin fecha')
    return key;

  const parts=key.split('/');

  if(parts.length===3){

    const [d,m,y]=parts;

    return new Date(
      +y,
      +m-1,
      +d
    ).toLocaleDateString(
      'es-CO',
      {
        weekday:'long',
        day:'numeric',
        month:'long',
        year:'numeric'
      }
    );
  }

  return key;
}


/* =========================================================
   VENTAS
   ========================================================= */

function renderSales(){

  const listEl=
    document.getElementById('salesList');

  if(!listEl)return;

  if(!db.sales.length){

    listEl.innerHTML=
      '<div class="empty">No hay ventas registradas.</div>';

    return;
  }

  const groups={};

  db.sales.forEach(s=>{

    const k=dateKey(s.date);

    (groups[k]||(groups[k]=[]))
      .push(s);
  });

  const keys=
    Object.keys(groups)
      .sort((a,b)=>{

        const pa=a.split('/');
        const pb=b.split('/');

        if(
          pa.length===3&&
          pb.length===3
        ){

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
        }

        return b.localeCompare(a);
      });

  listEl.innerHTML=
    keys.map((k,gi)=>{

      const list=
        groups[k]
          .slice()
          .reverse();

      const total=
        list.reduce(
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

              <b>
                ${esc(dateLabel(k))}
              </b>

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

          <div class="date-group-body ${
            gi===0?'open':''
          }">

            ${list.map(s=>{

              const detail=
                s.items&&s.items.length
                ?s.items.map(i=>
                  `${esc(i.product)}
                   × ${i.qty}`
                ).join(' · ')
                :`${esc(s.product||'Producto')}
                   × ${s.qty||0}`;

              return `

                <div class="item">

                  <div>

                    <b>
                      ${esc(
                        s.client||
                        'Sin cliente'
                      )}
                    </b>

                    <div class="muted">
                      ${detail}
                    </div>

                    <div class="muted">
                      ${esc(s.date||'')}
                      · ${esc(s.pay||'')}
                      · ${esc(
                        s.status||
                        'Pagada'
                      )}
                    </div>

                  </div>

                  <div class="right">

                    <b>
                      ${money(s.total)}
                    </b>

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

  const body=
    btn.nextElementSibling;

  if(!body)return;

  const open=
    body.classList.toggle('open');

  const arrow=
    btn.querySelector(
      '.date-chevron'
    );

  if(arrow)
    arrow.textContent=
      open?'▲':'▼';
}


/* =========================================================
   CLIENTES
   ========================================================= */

function customerStats(name){

  const sales=
    db.sales.filter(
      s=>s.client===name
    );

  const bought=
    sales.reduce(
      (n,s)=>n+(+s.total||0),
      0
    );

  const paid=
    sales.reduce(
      (n,s)=>n+salePaid(s),
      0
    );

  return {
    sales,
    bought,
    paid,
    balance:
      Math.max(
        0,
        bought-paid
      )
  };
}

function renderCustomers(){

  const searchEl=
    document.getElementById(
      'customerSearch'
    );

  const listEl=
    document.getElementById(
      'customersList'
    );

  if(!searchEl||!listEl)return;

  const q=
    (searchEl.value||'')
      .toLowerCase()
      .trim();

  const rows=
    db.customers.filter(c=>
      `${c.name||''} ${c.phone||''}`
        .toLowerCase()
        .includes(q)
    );

  listEl.innerHTML=
    rows.length

    ?rows
      .slice()
      .sort((a,b)=>
        String(a.name||'')
          .localeCompare(
            String(b.name||''),
            'es'
          )
      )
      .map(c=>{

        const st=
          customerStats(c.name);

        return `

          <div
            class="item clickable"
            onclick="editCustomer(
              ${db.customers.indexOf(c)}
            )"
          >

            <div>

              <b>
                ${esc(c.name)}
              </b>

              <div class="muted">
                ${esc(
                  c.phone||
                  'Sin teléfono'
                )}
              </div>

              <div class="muted">
                Comprado
                ${money(st.bought)}
                · Pagado
                ${money(st.paid)}
                · Saldo
                ${money(st.balance)}
              </div>

              ${
                c.note
                ?`
                  <div class="muted">
                    Nota:
                    ${esc(c.note)}
                  </div>
                `
                :''
              }

            </div>

            <span class="badge ${
              st.balance>0?'low':''
            }">
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

  const listEl=
    document.getElementById(
      'movesList'
    );

  if(!listEl)return;

  listEl.innerHTML=
    db.moves.length

    ?db.moves
      .slice()
      .reverse()
      .map(m=>`

        <div class="item">

          <div>

            <b>
              ${esc(m.product)}
            </b>

            <div class="muted">
              ${esc(m.reason||'')}
              · ${esc(
                m.responsible||''
              )}
              · ${esc(m.date||'')}
            </div>

          </div>

          <span class="badge">
            ${esc(m.type)}
            ${m.qty}
          </span>

        </div>

      `).join('')

    :'<div class="empty">No hay movimientos.</div>';
}


/* =========================================================
   ENCARGOS
   ========================================================= */

function renderOrders(){

  const listEl=
    document.getElementById(
      'ordersList'
    );

  if(!listEl)return;

  const rows=
    db.orders
      .slice()
      .reverse();

  listEl.innerHTML=
    rows.length

    ?rows.map((o,i)=>`

      <div class="item">

        <div>

          <b>
            ${esc(
              o.product||
              'Encargo'
            )}
          </b>

          <div class="muted">
            Cliente:
            ${esc(
              o.client||
              'Sin cliente'
            )}
            · Cantidad:
            ${esc(o.qty||1)}
          </div>

          <div class="muted">
            ${esc(
              o.note||
              'Sin nota'
            )}
            · ${esc(o.date||'')}
          </div>

        </div>

        <button
          type="button"
          class="badge order-status ${
            o.status==='Listo'
            ?'done'
            :''
          }"
          onclick="
            toggleOrder(
              ${db.orders.length-1-i}
            )
          "
        >
          ${esc(
            o.status||
            'Pendiente'
          )}
        </button>

      </div>

    `).join('')

    :'<div class="empty">No hay encargos pendientes.</div>';
}

function toggleOrder(i){

  if(!db.orders[i])return;

  db.orders[i].status=
    db.orders[i].status==='Listo'
    ?'Pendiente'
    :'Listo';

  save();
}


/* =========================================================
   MODALES
   ========================================================= */

const modalEl=
  document.getElementById('modal');

function modal(title,html){

  const titleEl=
    document.getElementById(
      'modalTitle'
    );

  const formEl=
    document.getElementById(
      'form'
    );

  if(!modalEl||!titleEl||!formEl)
    return;

  titleEl.textContent=title;
  formEl.innerHTML=html;

  modalEl.classList.remove(
    'hidden'
  );
}

function closeModal(){

  if(modalEl)
    modalEl.classList.add(
      'hidden'
    );
}


/* =========================================================
   PRODUCTOS
   ========================================================= */

function openProduct(idx=null){

  const p=
    idx===null

    ?{
      name:'',
      category:'',
      cost:0,
      price:0,
      stock:0,
      min:1
    }

    :db.products[idx];

  if(!p)return;

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
