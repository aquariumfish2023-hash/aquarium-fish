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

const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '\"':'&quot;',
  "'":'&#39;'
}[m]));

function show(tab){
  document.querySelectorAll('.screen').forEach(x=>
    x.classList.remove('active')
  );

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
   RESUMEN DEL INVENTARIO
   ========================================================= */

function inventoryStats(){

  const totalProducts=db.products.length;

  const totalUnits=db.products.reduce(
    (n,p)=>n+(+p.stock||0),
    0
  );

  const inventoryValue=db.products.reduce(
    (n,p)=>
      n+
      ((+p.cost||0)*(+p.stock||0)),
    0
  );

  const potentialProfit=db.products.reduce(
    (n,p)=>
      n+
      (((+p.price||0)-(+p.cost||0))*
      (+p.stock||0)),
    0
  );

  const outOfStock=db.products.filter(p=>
    (+p.stock||0)<=0
  ).length;

  const lowStock=db.products.filter(p=>{
    const stock=+p.stock||0;
    const min=+p.min||0;

    return stock>0&&stock<=min;
  }).length;

  return {
    totalProducts,
    totalUnits,
    inventoryValue,
    potentialProfit,
    outOfStock,
    lowStock
  };
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

  salesTotal.textContent=money(total);

  salesCount.textContent=
    `${db.sales.length} transacciones`;

  productCount.textContent=
    db.products.length;

  customerCount.textContent=
    db.customers.length;

  lowStock.textContent=
    db.products.filter(p=>{
      const stock=+p.stock||0;
      const min=+p.min||0;

      return stock<=min;
    }).length;

  recentSales.innerHTML=db.sales.length

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
              ·
              ${saleQty(s)} und.
              ·
              ${esc(s.pay||'')}

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

      `)
      .join('')

    :'<div class="empty">Todavía no hay ventas.</div>';
}


/* =========================================================
   INVENTARIO
   ========================================================= */

function renderInventory(){

  const q=
    (search.value||'')
    .toLowerCase()
    .trim();

  let rows=db.products.filter(p=>
    `${p.name||''} ${p.category||''} ${p.sku||''} ${p.supplier||''}`
      .toLowerCase()
      .includes(q)
  );

  /* FILTRO POR CATEGORÍA */

  if(inventoryCategory!=='Todas'){

    rows=rows.filter(p=>
      String(p.category||'')
        .trim()
        .toLowerCase()===
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

  let controls=
    document.getElementById(
      'inventoryControls'
    );

  if(!controls){

    controls=
      document.createElement('div');

    controls.id=
      'inventoryControls';

    search.insertAdjacentElement(
      'afterend',
      controls
    );
  }


  const categories=
    inventoryCategories();

  const stats=
    inventoryStats();


  controls.innerHTML=`

    <div
      style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin:10px 0;
      "
    >

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


    <div
      style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin:8px 0;
      "
    >

      <div
        style="
          background:#eef7f8;
          border-radius:14px;
          padding:12px;
        "
      >

        <div class="muted">
          Productos
        </div>

        <strong>
          ${stats.totalProducts}
        </strong>

      </div>


      <div
        style="
          background:#eef7f8;
          border-radius:14px;
          padding:12px;
        "
      >

        <div class="muted">
          Unidades
        </div>

        <strong>
          ${stats.totalUnits}
        </strong>

      </div>


      <div
        style="
          background:#f5f8f9;
          border-radius:14px;
          padding:12px;
        "
      >

        <div class="muted">
          Valor del inventario
        </div>

        <strong>
          ${money(stats.inventoryValue)}
        </strong>

      </div>


      <div
        style="
          background:#f5f8f9;
          border-radius:14px;
          padding:12px;
        "
      >

        <div class="muted">
          Ganancia potencial
        </div>

        <strong>
          ${money(stats.potentialProfit)}
        </strong>

      </div>

    </div>


    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin:8px 0;
      "
    >

      <span class="badge low">
        🟠 Stock bajo: ${stats.lowStock}
      </span>

      <span
        class="badge"
        style="
          background:#ffe9e9;
          color:#a32222;
        "
      >
        🔴 Agotados: ${stats.outOfStock}
      </span>

    </div>


    <div
      class="muted"
      style="margin:8px 0;"
    >
      Mostrando ${rows.length}
      de ${db.products.length}
      productos
    </div>

  `;


  /* LISTA DE PRODUCTOS */

  inventoryList.innerHTML=rows.length

    ?rows.map(p=>{

        const stock=
          +p.stock||0;

        const min=
          +p.min||0;

        let statusClass='';
        let statusText='🟢 Normal';

        if(stock<=0){

          statusClass=
            'inventory-out';

          statusText=
            '🔴 Agotado';

        }else if(stock<=min){

          statusClass=
            'low';

          statusText=
            '🟠 Stock bajo';
        }


        const profit=
          (+p.price||0)-
          (+p.cost||0);


        return `

          <div
            class="item clickable"
            onclick="editProduct(${db.products.indexOf(p)})"
            style="
              position:relative;
              ${
                p.active===false
                ?'opacity:.65;'
                :''
              }
            "
          >

            <div>

              <b>
                ${esc(p.name)}
              </b>

              <div class="muted">

                📂
                ${esc(
                  p.category||
                  'Sin categoría'
                )}

                ${
                  p.active===false
                  ?' · ⛔ Inactivo'
                  :''
                }

              </div>


              <div class="muted">

                Costo
                ${money(p.cost)}
                ·

                Venta
                ${money(p.price)}

              </div>


              <div class="muted">

                Ganancia/u
                ${money(profit)}

              </div>


              ${
                p.sku
                ?`
                  <div class="muted">
                    Código: ${esc(p.sku)}
                  </div>
                `
                :''
              }


              ${
                p.supplier
                ?`
                  <div class="muted">
                    Proveedor: ${esc(p.supplier)}
                  </div>
                `
                :''
              }

            </div>


            <div
              class="right"
              style="
                display:flex;
                flex-direction:column;
                align-items:flex-end;
                gap:5px;
              "
            >

              <span
                class="badge ${statusClass}"
                ${
                  stock<=0
                  ?`
                    style="
                      background:#ffe9e9;
                      color:#a32222;
                    "
                  `
                  :''
                }
              >
                ${statusText}
              </span>


              <span class="badge">
                Stock: ${stock}
              </span>

            </div>

          </div>

        `;
      })
      .join('')

    :'<div class="empty">No hay productos con estos filtros.</div>';
}


/* =========================================================
   FECHAS
   ========================================================= */

function dateKey(value){

  const d=new Date(value);

  if(!Number.isNaN(d.getTime()))

    return d.toLocaleDateString(
      'es-CO',
      {
        year:'numeric',
        month:'2-digit',
        day:'2-digit'
      }
    );


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
        )

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


  salesList.innerHTML=
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

                ${
                  list.length===1
                  ?'venta'
                  :'ventas'
                }

                ·
                ${money(total)}

              </small>

            </span>


            <span class="date-chevron">
              ${gi===0?'▲':'▼'}
            </span>

          </button>


          <div
            class="date-group-body
              ${gi===0?'open':''}"
          >

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
                      ${esc(
                        s.client||
                        'Sin cliente'
                      )}
                    </b>

                    <div class="muted">
                      ${detail}
                    </div>

                    <div class="muted">

                      ${esc(s.date)}
                      ·
                      ${esc(s.pay||'')}
                      ·
                      ${esc(
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

  const open=
    body.classList.toggle('open');

  btn.querySelector(
    '.date-chevron'
  ).textContent=
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

  const q=
    (customerSearch.value||'')
      .toLowerCase();


  const rows=
    db.customers.filter(c=>
      `${c.name} ${c.phone}`
        .toLowerCase()
        .includes(q)
    );


  customersList.innerHTML=
    rows.length

    ?rows
      .slice()
      .sort((a,b)=>
        a.name.localeCompare(b.name)
      )
      .map(c=>{

        const st=
          customerStats(c.name);


        return `

          <div
            class="item clickable"
            onclick="editCustomer(${db.customers.indexOf(c)})"
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
                ·

                Pagado
                ${money(st.paid)}
                ·

                Saldo
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


            <span
              class="badge
                ${st.balance>0?'low':''}"
            >
              ${st.sales.length}
              ventas
            </span>

          </div>

  
