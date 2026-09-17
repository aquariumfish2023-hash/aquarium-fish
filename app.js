const KEY = "aquarium_fish_data_v5";

/* =========================================================
   DATOS
   ========================================================= */

let db =
  JSON.parse(localStorage.getItem(KEY) || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v4") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v3") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v2") || "null") ||
  JSON.parse(localStorage.getItem("aquarium_fish_data_v1") || "null") ||
  {
    products: [],
    sales: [],
    moves: [],
    customers: [],
    orders: [],
    cash: [],
    quotes: []
  };

db.products =
  Array.isArray(db.products)
    ? db.products
    : [];

db.sales =
  Array.isArray(db.sales)
    ? db.sales
    : [];

db.moves =
  Array.isArray(db.moves)
    ? db.moves
    : [];

db.customers =
  Array.isArray(db.customers)
    ? db.customers
    : [];

db.orders =
  Array.isArray(db.orders)
    ? db.orders
    : [];

db.orders.forEach(order => {

  if(!order || typeof order !== "object"){
    return;
  }

  if(!order.status){
    order.status = "Pendiente";
  }

  if(order.qty == null){
    order.qty = 1;
  }

  if(order.price == null){
    order.price = 0;
  }

  if(order.note == null){
    order.note = "";
  }

});

db.cash =
  Array.isArray(db.cash)
    ? db.cash
    : [];

db.quotes = Array.isArray(db.quotes) ? db.quotes : [];

db.quotes.forEach(quote => {
  if(!quote || typeof quote !== "object") return;
  if(!quote.id) quote.id = `COT-${String(db.quotes.indexOf(quote)+1).padStart(4,"0")}`;
  if(!quote.status) quote.status = "Pendiente";
  if(!Array.isArray(quote.items)) quote.items = [];
  if(quote.discount == null) quote.discount = 0;
});

/* =========================================================
   CLIENTES - CUENTAS PENDIENTES
   ========================================================= */

db.customers.forEach(customer => {

  if(!Array.isArray(customer.payments)){
    customer.payments = [];
  }

});


/* =========================================================
   UTILIDADES
   ========================================================= */

const money = n =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);


const now = () =>
  new Date().toLocaleString("es-CO");


const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m])
  );


function parseLocalDate(value) {

  if (
    value instanceof Date
  ) {

    return isNaN(
      value.getTime()
    )
      ? null
      : value;

  }


  const text =
    String(value || "").trim();


  if(!text){
    return null;
  }


  /*
     Primero intentamos el formato que utiliza
     Aquarium Fish:

     d/m/yyyy, hh:mm:ss
  */

  const match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );


  if(match){

    const day =
      Number(match[1]);

    const month =
      Number(match[2]);

    const year =
      Number(match[3]);

    const hour =
      Number(match[4] || 0);

    const minute =
      Number(match[5] || 0);

    const second =
      Number(match[6] || 0);


    const date =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );


    if(
      !isNaN(
        date.getTime()
      )
    ){

      return date;

    }

  }


  const fallback =
    new Date(text);


  return isNaN(
    fallback.getTime()
  )
    ? null
    : fallback;

}


function startOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;

}


function endOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    23,
    59,
    59,
    999
  );

  return d;

}


function sameDay(a,b){

  return (
    a.getFullYear() ===
      b.getFullYear() &&

    a.getMonth() ===
      b.getMonth() &&

    a.getDate() ===
      b.getDate()
  );

}


/* =========================================================
   GUARDAR
   ========================================================= */

function save() {

  if (typeof window.aquariumPersistData === "function") {
    window.aquariumPersistData(db);
  } else {
    localStorage.setItem(
      KEY,
      JSON.stringify(db)
    );
  }

  renderAll();

}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function show(tab) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const screen =
    document.getElementById(tab);


  if(screen){

    screen.classList.add(
      "active"
    );

  }

  // La portada funciona como presentación para clientes:
  // mientras está activa no mostramos datos del negocio ni navegación.
  const isPortada = tab === "portada";
  document.body.classList.toggle("portada-mode", isPortada);

  const header = document.getElementById("appHeader");
  if(header && window.AQ_AUTH_USER){
    header.classList.toggle("hidden", isPortada);
  }

  const nav = document.querySelector("nav");
  if(nav){
    nav.classList.toggle("portada-hidden", isPortada);
  }

  document
    .querySelectorAll(
      "nav button[data-tab]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );

    });

}


function bindNavigation() {

  document
    .querySelectorAll(
      "nav button[data-tab]"
    )
    .forEach(button => {

      button.onclick =
        function(){

          show(
            this.dataset.tab
          );

        };

    });

}


/* =========================================================
   INVENTARIO
   ========================================================= */

let inventoryCategory =
  "Todas";

let inventorySort =
  "name-asc";


function inventoryCategories() {

  const base = [

    "Peces",
    "Acuarios",
    "Filtros",
    "Iluminación",
    "Sustratos",
    "Decoración",
    "Alimentos",
    "Accesorios",
    "Otros"

  ];


  const existing =
    db.products
      .map(
        p =>
          String(
            p.category || ""
          ).trim()
      )
      .filter(Boolean);


  return [
    ...new Set([
      ...base,
      ...existing
    ])
  ].sort(
    (a,b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity:
            "base"
        }
      )
  );

}


function setInventoryCategory(
  value
){

  inventoryCategory =
    value;

  renderInventory();

}


function setInventorySort(
  value
){

  inventorySort =
    value;

  renderInventory();

}




/* =========================================================
   REPORTES
   ========================================================= */

let reportPeriod = "today";

function reportRange(period = reportPeriod){
  const nowDate = new Date();
  let start = null;
  let end = new Date(nowDate);
  end.setHours(23,59,59,999);

  if(period === "today"){
    start = new Date(nowDate);
    start.setHours(0,0,0,0);
  }else if(period === "7days"){
    start = new Date(nowDate);
    start.setDate(start.getDate()-6);
    start.setHours(0,0,0,0);
  }else if(period === "month"){
    start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    start.setHours(0,0,0,0);
  }else{
    start = null;
  }
  return {start,end};
}

function inReportRange(value, range){
  const d = parseLocalDate(value);
  if(!d) return false;
  if(range.start && d < range.start) return false;
  if(range.end && d > range.end) return false;
  return true;
}

function reportSales(){
  const range = reportRange();
  return db.sales.filter(s => reportPeriod === "all" ? !!parseLocalDate(s.date) : inReportRange(s.date, range));
}

function saleCost(sale){
  if(Array.isArray(sale.items)){
    return sale.items.reduce((sum,item)=>sum + ((+item.cost||0) * (+item.qty||0)),0);
  }
  return (+sale.cost||0) * (+sale.qty||0);
}

function reportExpenses(){
  const range = reportRange();
  return db.cash.filter(m => {
    if(String(m.type||"").toLowerCase() !== "gasto") return false;
    return reportPeriod === "all" ? !!parseLocalDate(m.date) : inReportRange(m.date, range);
  });
}

function reportPayments(){
  return reportSales().reduce((sum,sale)=>sum + salePaid(sale),0);
}

function reportRevenue(){
  return reportSales().reduce((sum,sale)=>sum + (+sale.total||0),0);
}

function reportPending(){
  return reportSales().reduce((sum,sale)=>sum + Math.max(0,(+sale.total||0)-salePaid(sale)),0);
}

function reportProfit(){
  return reportSales().reduce((sum,sale)=>sum + ((+sale.total||0)-saleCost(sale)),0);
}

function reportExpenseTotal(){
  return reportExpenses().reduce((sum,m)=>sum + (+m.amount||0),0);
}

function reportAverageTicket(){
  const sales = reportSales();
  return sales.length ? reportRevenue()/sales.length : 0;
}

function reportProductRanking(){
  const map = {};
  reportSales().forEach(sale => {
    if(Array.isArray(sale.items) && sale.items.length){
      sale.items.forEach(item => {
        const name = String(item.product||"Producto");
        map[name] = (map[name]||0) + (+item.qty||0);
      });
    }else if(sale.product){
      const name = String(sale.product);
      map[name] = (map[name]||0) + (+sale.qty||0);
    }
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);
}

function reportPaymentMethods(){
  const map = {};
  reportSales().forEach(sale => {
    const method = String(sale.pay || "Otro");
    map[method] = (map[method]||0) + salePaid(sale);
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function reportDaily(){
  const map = {};
  reportSales().forEach(sale => {
    const d = parseLocalDate(sale.date);
    if(!d) return;
    const key = d.toISOString().slice(0,10);
    if(!map[key]) map[key] = {date:d,total:0,count:0};
    map[key].total += (+sale.total||0);
    map[key].count += 1;
  });
  return Object.values(map).sort((a,b)=>b.date-a.date);
}

function setupReportsUI(){
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  if(!main || !nav) return;

  let section = document.getElementById("reports");
  if(!section){
    section = document.createElement("section");
    section.id = "reports";
    section.className = "screen";
    main.appendChild(section);
  }

  let navButton = nav.querySelector('button[data-tab="reports"]');
  if(!navButton){
    navButton = document.createElement("button");
    navButton.type = "button";
    navButton.dataset.tab = "reports";
    navButton.innerHTML = `📊<span>Reportes</span>`;
    nav.appendChild(navButton);
  }

  renderReports();
}

function renderReports(){
  const section = document.getElementById("reports");
  if(!section) return;

  const sales = reportSales();
  const expenses = reportExpenseTotal();
  const revenue = reportRevenue();
  const payments = reportPayments();
  const pending = reportPending();
  const profit = reportProfit();
  const net = profit - expenses;
  const ticket = reportAverageTicket();
  const ranking = reportProductRanking();
  const methods = reportPaymentMethods();
  const daily = reportDaily();

  section.innerHTML = `
    <div class="section-head">
      <h1>📊 Reportes</h1>
    </div>

    <div class="panel">
      <h2>Periodo</h2>
      <select class="search" onchange="setReportPeriod(this.value)">
        <option value="today" ${reportPeriod==='today'?'selected':''}>📅 Hoy</option>
        <option value="7days" ${reportPeriod==='7days'?'selected':''}>📆 Últimos 7 días</option>
        <option value="month" ${reportPeriod==='month'?'selected':''}>🗓️ Este mes</option>
        <option value="all" ${reportPeriod==='all'?'selected':''}>📚 Todo</option>
      </select>
    </div>

    <div class="cards">
      <div class="card"><span>Ventas</span><b>${money(revenue)}</b><small>${sales.length} transacciones</small></div>
      <div class="card"><span>Pagado</span><b>${money(payments)}</b><small>recibido</small></div>
      <div class="card"><span>Pendiente</span><b>${money(pending)}</b><small>por cobrar</small></div>
      <div class="card"><span>Ganancia</span><b>${money(profit)}</b><small>antes de gastos</small></div>
      <div class="card"><span>Gastos</span><b>${money(expenses)}</b><small>registrados en caja</small></div>
      <div class="card"><span>Resultado</span><b>${money(net)}</b><small>ganancia − gastos</small></div>
      <div class="card"><span>Ticket promedio</span><b>${money(ticket)}</b><small>por venta</small></div>
    </div>

    <div class="panel">
      <h2>🏆 Productos más vendidos</h2>
      ${ranking.length ? ranking.map((r,i)=>`<div class="item"><div><b>${i+1}. ${esc(r[0])}</b></div><div class="right"><b>${r[1]}</b><small>unidades</small></div></div>`).join('') : '<div class="empty">No hay ventas en este periodo.</div>'}
    </div>

    <div class="panel">
      <h2>💳 Ventas por forma de pago</h2>
      ${methods.length ? methods.map(r=>`<div class="item"><div><b>${esc(r[0])}</b></div><div class="right"><b>${money(r[1])}</b></div></div>`).join('') : '<div class="empty">No hay pagos en este periodo.</div>'}
    </div>

    <div class="panel">
      <h2>📅 Ventas por día</h2>
      ${daily.length ? daily.map(r=>`<div class="item"><div><b>${esc(r.date.toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'}))}</b><small>${r.count} venta${r.count===1?'':'s'}</small></div><div class="right"><b>${money(r.total)}</b></div></div>`).join('') : '<div class="empty">No hay ventas en este periodo.</div>'}
    </div>
  `;
}

function setReportPeriod(value){
  reportPeriod = ["today","7days","month","all"].includes(value) ? value : "today";
  renderReports();
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll() {

  // La interfaz de reportes se prepara por separado para evitar detener el resto de la aplicación.
  setupReportsUI();
  renderHome();
  if(document.getElementById("quoteAutomationAlerts")) renderQuoteAutomationAlerts();

  renderInventory();

  renderSales();

  renderCash();

  renderCustomers();

  renderMoves();

  renderOrders();

  renderInternal();

  if(document.getElementById("reports")) renderReports();

}


/* =========================================================
   INICIO
   ========================================================= */

function renderHome() {

  const total =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );

  const today = new Date();
  const todaySales = db.sales.filter(sale => {
    const d = parseLocalDate(sale.date || sale.createdAt);
    return d ? sameDay(d, today) : false;
  });

  const todayTotal = todaySales.reduce(
    (sum, sale) => sum + (+sale.total || 0),
    0
  );

  const pendingQuotes = (db.quotes || []).filter(q => !q.convertedSaleId);


  const salesTotal =
    document.getElementById(
      "salesTotal"
    );


  const salesCount =
    document.getElementById(
      "salesCount"
    );

  const todaySalesTotal = document.getElementById("todaySalesTotal");
  const todaySalesCount = document.getElementById("todaySalesCount");
  const pendingQuotesCount = document.getElementById("pendingQuotesCount");


  const productCount =
    document.getElementById(
      "productCount"
    );


  const customerCount =
    document.getElementById(
      "customerCount"
    );


  const lowStock =
    document.getElementById(
      "lowStock"
    );


  const cashBalance =
    document.getElementById(
      "cashBalance"
    );


  const recentSales =
    document.getElementById(
      "recentSales"
    );


  if(salesTotal){

    salesTotal.textContent =
      money(total);

  }


  if(salesCount){

    salesCount.textContent =
      `${db.sales.length} transacciones en total`;

  }

  if(todaySalesTotal){
    todaySalesTotal.textContent = money(todayTotal);
  }

  if(todaySalesCount){
    todaySalesCount.textContent = `${todaySales.length} venta${todaySales.length === 1 ? "" : "s"} hoy`;
  }

  if(pendingQuotesCount){
    pendingQuotesCount.textContent = pendingQuotes.length;
  }


  if(productCount){

    productCount.textContent =
      db.products.length;

  }


  if(customerCount){

    customerCount.textContent =
      db.customers.length;

  }


  if(lowStock){

    lowStock.textContent =
      db.products.filter(
        p =>
          (+p.stock || 0) <=
          (+p.min || 0)
      ).length;

  }


  if(cashBalance){

    const totalCash =
      calculateCashTotals(
        "all"
      );


    cashBalance.textContent =
      money(
        totalCash.balance
      );

  }


  if(!recentSales){

    return;

  }


  recentSales.innerHTML =
    db.sales.length

      ? db.sales
          .slice(-6)
          .reverse()
          .map(
            sale => `

              <div class="item">

                <div>

                  <b>
                    ${esc(
                      saleLabel(sale)
                    )}
                  </b>

                  <div class="muted">

                    ${esc(
                      sale.client ||
                      "Sin cliente"
                    )}

                    ·

                    ${saleQty(sale)}
                    und.

                    ·

                    ${esc(
                      sale.pay || ""
                    )}

                  </div>

                </div>

                <div class="right">

                  <strong>
                    ${money(
                      sale.total
                    )}
                  </strong>

                  <small>

                    ${
                      sale.status ===
                      "Pendiente"

                        ? "Pendiente de pago"

                        : sale.status ===
                          "Abono"

                        ? "Abono: " +
                          money(
                            salePaid(
                              sale
                            )
                          )

                        : "Pagada"
                    }

                  </small>

                </div>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          Todavía no hay ventas.
        </div>

      `;

}


/* =========================================================
   INVENTARIO
   ========================================================= */


function inventoryStats() {

  const products = Array.isArray(db.products)
    ? db.products
    : [];

  const units = products.reduce(
    (sum, product) =>
      sum + Math.max(0, +product.stock || 0),
    0
  );

  const costValue = products.reduce(
    (sum, product) =>
      sum +
      Math.max(0, +product.stock || 0) *
      (+product.cost || 0),
    0
  );

  const saleValue = products.reduce(
    (sum, product) =>
      sum +
      Math.max(0, +product.stock || 0) *
      (+product.price || 0),
    0
  );

  const lowStock = products.filter(
    product =>
      Math.max(0, +product.stock || 0) <=
      Math.max(0, +product.min || 0)
  ).length;

  const zeroStock = products.filter(
    product =>
      Math.max(0, +product.stock || 0) <= 0
  ).length;

  return {
    units,
    costValue,
    saleValue,
    lowStock,
    zeroStock
  };

}


function renderInventorySmartPanel(controls) {

  if(!controls){
    return;
  }

  const stats = inventoryStats();

  const panel = document.createElement("div");

  panel.innerHTML = `
    <div class="item" style="margin-bottom:10px;">
      <div>
        <b>📦 Inventario inteligente</b>
        <div class="muted">Resumen del stock actual</div>
      </div>
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin-bottom:10px;
    ">
      <div class="item">
        <div>
          <b>${stats.units}</b>
          <div class="muted">Unidades</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${money(stats.costValue)}</b>
          <div class="muted">Valor de compra</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${money(stats.saleValue)}</b>
          <div class="muted">Valor de venta</div>
        </div>
      </div>

      <div class="item">
        <div>
          <b>${stats.lowStock}</b>
          <div class="muted">Stock bajo</div>
        </div>
      </div>
    </div>

    <div class="muted" style="margin:0 0 8px;">
      ${stats.zeroStock} producto(s) sin stock ·
      Valor de venta del stock: <b>${money(stats.saleValue)}</b>
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    ">
      <button
        type="button"
        class="primary"
        onclick="openMove('Entrada','Compra')"
      >
        ➕ Entrada
      </button>

      <button
        type="button"
        onclick="openMove('Salida','Mortalidad')"
      >
        ☠️ Mortalidad/Baja
      </button>

      <button
        type="button"
        onclick="openMove('Salida','Ajuste')"
      >
        ⚠️ Ajuste/Pérdida
      </button>
    </div>
  `;

  panel.style.margin = "10px 0 14px";
  controls.prepend(panel);

}


function renderInventory() {

  const search =
    document.getElementById(
      "search"
    );


  const list =
    document.getElementById(
      "inventoryList"
    );


  if(!search || !list){

    return;

  }


  const q =
    String(
      search.value || ""
    )
      .toLowerCase()
      .trim();


  let rows =
    db.products.filter(
      p =>
        `${p.name || ""} ${
          p.category || ""
        }`
          .toLowerCase()
          .includes(q)
    );


  if(
    inventoryCategory !==
    "Todas"
  ){

    rows =
      rows.filter(
        p =>
          String(
            p.category || ""
          )
            .trim()
            .toLowerCase() ===
          inventoryCategory
            .toLowerCase()
      );

  }


  if(
    inventorySort ===
    "name-asc"
  ){

    rows.sort(
      (a,b) =>
        String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          ),
          "es"
        )
    );

  }


  if(
    inventorySort ===
    "name-desc"
  ){

    rows.sort(
      (a,b) =>
        String(
          b.name || ""
        ).localeCompare(
          String(
            a.name || ""
          ),
          "es"
        )
    );

  }


  if(
    inventorySort ===
    "stock-desc"
  ){

    rows.sort(
      (a,b) =>
        (+b.stock || 0) -
        (+a.stock || 0)
    );

  }


  if(
    inventorySort ===
    "stock-asc"
  ){

    rows.sort(
      (a,b) =>
        (+a.stock || 0) -
        (+b.stock || 0)
    );

  }


  let controls =
    document.getElementById(
      "inventoryControls"
    );


  if(!controls){

    controls =
      document.createElement(
        "div"
      );


    controls.id =
      "inventoryControls";


    search.insertAdjacentElement(
      "afterend",
      controls
    );

  }


  controls.innerHTML = `

    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:10px 0;
    ">

      <select
        id="inventoryCategory"
        class="search"
      >

        <option value="Todas">
          📂 Todas las categorías
        </option>

        ${
          inventoryCategories()
            .map(
              category => `

                <option
                  value="${esc(
                    category
                  )}"
                  ${
                    category.toLowerCase() ===
                    inventoryCategory.toLowerCase()
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


      <select
        id="inventorySort"
        class="search"
      >

        <option
          value="name-asc"
          ${
            inventorySort ===
            "name-asc"
              ? "selected"
              : ""
          }
        >
          🔤 A-Z
        </option>

        <option
          value="name-desc"
          ${
            inventorySort ===
            "name-desc"
              ? "selected"
              : ""
          }
        >
          🔤 Z-A
        </option>

        <option
          value="stock-desc"
          ${
            inventorySort ===
            "stock-desc"
              ? "selected"
              : ""
          }
        >
          📈 Mayor stock
        </option>

        <option
          value="stock-asc"
          ${
            inventorySort ===
            "stock-asc"
              ? "selected"
              : ""
          }
        >
          📉 Menor stock
        </option>

      </select>

    </div>


    <div
      class="muted"
      style="margin:0 0 8px;"
    >
      Mostrando
      ${rows.length}
      de
      ${db.products.length}
      productos
    </div>

  `;


  renderInventorySmartPanel(controls);


  const categorySelect =
    document.getElementById(
      "inventoryCategory"
    );


  if(categorySelect){

    categorySelect.onchange =
      function(){

        setInventoryCategory(
          this.value
        );

      };

  }


  const sortSelect =
    document.getElementById(
      "inventorySort"
    );


  if(sortSelect){

    sortSelect.onchange =
      function(){

        setInventorySort(
          this.value
        );

      };

  }


  list.innerHTML =
    rows.length

      ? rows
          .map(
            product => `

              <div
                class="item clickable"
                onclick="editProduct(
                  ${db.products.indexOf(
                    product
                  )}
                )"
              >

                <div>

                  <b>
                    ${esc(
                      product.name
                    )}
                  </b>

                  <div class="muted">

                    ${esc(
                      product.category ||
                      "Sin categoría"
                    )}

                  </div>

                  <div class="muted">

                    Costo
                    ${money(
                      product.cost
                    )}

                    ·

                    Venta
                    ${money(
                      product.price
                    )}

                    ·

                    Ganancia/u
                    ${money(
                      (+product.price || 0) -
                      (+product.cost || 0)
                    )}

                  </div>

                </div>

                <span
                  class="badge ${
                    (+product.stock || 0) <=
                    (+product.min || 0)
                      ? "low"
                      : ""
                  }"
                >

                  Stock:
                  ${product.stock}

                </span>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          No hay productos
          con estos filtros.
        </div>

      `;

}


/* =========================================================
   VENTAS - AUXILIARES
   ========================================================= */

function saleLabel(sale) {

  return sale.items &&
    sale.items.length

    ? sale.items
        .map(
          item =>
            item.product
        )
        .join(", ")

    : sale.product ||
      "Venta";

}


function saleQty(sale) {

  return sale.items &&
    sale.items.length

    ? sale.items.reduce(
        (total,item) =>
          total +
          (+item.qty || 0),
        0
      )

    : (+sale.qty || 0);

}


function salePaid(sale) {

  if(
    sale.paid ===
    undefined
  ){

    return +sale.total || 0;

  }


  return Math.max(
    0,
    Math.min(
      +sale.paid || 0,
      +sale.total || 0
    )
  );

}


/* =========================================================
   VENTAS
   ========================================================= */

function dateKey(value) {

  const date =
    parseLocalDate(value);


  if(date){

    return date.toLocaleDateString(
      "es-CO"
    );

  }


  return "Sin fecha";

}


function dateLabel(key) {

  if(
    key ===
    "Sin fecha"
  ){

    return key;

  }


  const parts =
    key.split("/");


  if(
    parts.length === 3
  ){

    const day =
      +parts[0];

    const month =
      +parts[1];

    const year =
      +parts[2];


    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString(
      "es-CO",
      {
        weekday:
          "long",
        day:
          "numeric",
        month:
          "long",
        year:
          "numeric"
      }
    );

  }


  return key;

}


function renderSales() {

  const list =
    document.getElementById(
      "salesList"
    );

  const search =
    document.getElementById(
      "salesSearch"
    );


  if(!list){

    return;

  }


  if(!db.sales.length){

    list.innerHTML = `

      <div class="empty">
        No hay ventas registradas.
      </div>

    `;

    return;

  }


  const normalizeSearch = value =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const q =
    normalizeSearch(
      search ? search.value : ""
    ).trim();

  const filteredSales =
    db.sales.filter(sale => {

      if(!q) return true;

      const itemNames =
        Array.isArray(sale.items)
          ? sale.items.map(item => item.product || "").join(" ")
          : (sale.product || "");

      const haystack =
        normalizeSearch([
          sale.id,
          sale.client,
          sale.phone,
          sale.date,
          sale.pay,
          sale.status,
          itemNames
        ].join(" "));

      return haystack.includes(q);
    });

  if(!filteredSales.length){

    list.innerHTML = `
      <div class="empty">
        No encontramos ventas que coincidan con “${esc(search ? search.value : "") }”.
      </div>
    `;

    return;

  }


  const groups = {};


  filteredSales.forEach(
    sale => {

      const key =
        dateKey(
          sale.date
        );


      if(!groups[key]){

        groups[key] = [];

      }


      groups[key].push(
        sale
      );

    }
  );


  const keys =
    Object.keys(groups)
      .sort(
        (a,b) =>
          b.localeCompare(a)
      );


  list.innerHTML =
    keys
      .map(
        (key,groupIndex) => {

          const sales =
            groups[key]
              .slice()
              .reverse();


          const total =
            sales.reduce(
              (sum,sale) =>
                sum +
                (+sale.total || 0),
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
                    ${esc(
                      dateLabel(key)
                    )}
                  </b>

                  <small>

                    ${sales.length}

                    ${
                      sales.length === 1
                        ? "venta"
                        : "ventas"
                    }

                    ·

                    ${money(total)}

                  </small>

                </span>


                <span
                  class="date-chevron"
                >

                  ${
                    groupIndex === 0
                      ? "▲"
                      : "▼"
                  }

                </span>

              </button>


              <div
                class="
                  date-group-body
                  ${
                    groupIndex === 0
                      ? "open"
                      : ""
                  }
                "
              >

                ${
                  sales
                    .map(
                      sale => `

                        <div class="item">

                          <div>

                            <b>
                              ${esc(
                                sale.client ||
                                "Sin cliente"
                              )}
                            </b>


                            <div class="muted">

                              ${
                                sale.items &&
                                sale.items.length

                                  ? sale.items
                                      .map(
                                        item =>
                                          `${esc(
                                            item.product
                                          )} × ${
                                            item.qty
                                          }`
                                      )
                                      .join(
                                        " · "
                                      )

                                  : `${esc(
                                      sale.product ||
                                      "Producto"
                                    )} × ${
                                      sale.qty || 0
                                    }`
                              }

                            </div>


                            <div class="muted">

                              ${esc(
                                sale.date ||
                                ""
                              )}

                              ·

                              ${esc(
                                sale.pay ||
                                ""
                              )}

                              ·

                              ${esc(
                                sale.status ||
                                "Pagada"
                              )}

                            </div>

                          </div>


                          <div class="right">

                            <b>
                              ${money(
                                sale.total
                              )}
                            </b>

                            <small>

                              ${
                                sale.status ===
                                "Pendiente"

                                  ? "Pendiente"

                                  : sale.status ===
                                    "Abono"

                                  ? "Abono " +
                                    money(
                                      salePaid(
                                        sale
                                      )
                                    )

                                  : "Pagada"
                              }

                            </small>

                            <button
                              type="button"
                              style="margin-top:6px;"
                              onclick="openReceipt(${db.sales.indexOf(sale)})"
                            >
                              🧾 Comprobante
                            </button>

                            <button
                              type="button"
                              style="margin-top:6px;"
                              onclick="deleteSale(${db.sales.indexOf(sale)})"
                            >
                              🗑️ Eliminar venta
                            </button>

                          </div>

                        </div>

                      `
                    )
                    .join("")
                }

              </div>

            </div>

          `;

        }
      )
      .join("");

}


function toggleDateGroup(button) {

  const body =
    button.nextElementSibling;


  if(!body){

    return;

  }


  const open =
    body.classList.toggle(
      "open"
    );


  const arrow =
    button.querySelector(
      ".date-chevron"
    );


  if(arrow){

    arrow.textContent =
      open
        ? "▲"
        : "▼";

  }

}


/* =========================================================
   COMPROBANTE DE VENTA
   ========================================================= */

function getSaleCustomer(sale) {

  if(!sale || !sale.client){
    return null;
  }

  const wanted =
    String(sale.client)
      .trim()
      .toLowerCase();

  return db.customers.find(
    customer =>
      String(customer?.name || "")
        .trim()
        .toLowerCase() === wanted
  ) || null;

}


function formatReceiptDate(value) {

  const parsed =
    parseLocalDate(value);

  if(!parsed){
    return String(value || "");
  }

  return parsed.toLocaleString(
    "es-CO",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );

}


function receiptNumber(index) {

  return String(
    Math.max(0, Number(index) || 0) + 1
  ).padStart(5,"0");

}


function saleBalance(sale) {

  return Math.max(
    0,
    (+sale.total || 0) - salePaid(sale)
  );

}


function buildSaleReceiptText(sale,index) {

  if(!sale){
    return "";
  }

  const items =
    Array.isArray(sale.items) && sale.items.length
      ? sale.items
      : [{
          product: sale.product || "Producto",
          qty: sale.qty || 0,
          price: +sale.price || 0
        }];

  const customer =
    getSaleCustomer(sale);

  const lines = [
    "🐠 AQUARIUM FISH",
    "COMPROBANTE DE VENTA",
    "",
    `No.: ${receiptNumber(index)}`,
    `Fecha: ${formatReceiptDate(sale.date)}`,
    `Cliente: ${sale.client || "Venta mostrador"}`
  ];

  if(customer?.phone){
    lines.push(`Teléfono: ${customer.phone}`);
  }

  lines.push("", "DETALLE");

  items.forEach(item => {
    const qty = Math.max(0, +item.qty || 0);
    const total =
      (+item.price || 0) * qty;

    lines.push(
      `${qty} x ${item.product || "Producto"} — ${money(total)}`
    );
  });

  lines.push(
    "",
    `TOTAL: ${money(sale.total)}`,
    `Forma de pago: ${sale.pay || ""}`,
    `Estado: ${sale.status || "Pagada"}`,
    `Pagado: ${money(salePaid(sale))}`,
    `Saldo: ${money(saleBalance(sale))}`,
    "",
    "Gracias por elegir Aquarium Fish 🐠"
  );

  return lines.join("\n");

}


function receiptPhone(phone) {

  let digits =
    String(phone || "")
      .replace(/\D/g, "");

  if(digits.length === 10 && digits.startsWith("3")){
    digits = "57" + digits;
  }

  return digits;

}


function openReceipt(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  const customer =
    getSaleCustomer(sale);

  modal(

    `🧾 Comprobante #${receiptNumber(index)}`,

    `
      <div
        style="
          background:#f7f7f7;
          border-radius:12px;
          padding:14px;
          white-space:pre-wrap;
          line-height:1.5;
          max-height:55vh;
          overflow:auto;
        "
      >${esc(text)}</div>

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
          type="button"
          onclick="copySaleReceipt(${index})"
        >
          📋 Copiar
        </button>

        <button
          type="button"
          onclick="shareSaleReceiptWhatsApp(${index})"
        >
          📲 WhatsApp
        </button>

        <button
          type="button"
          onclick="printSaleReceipt(${index})"
        >
          🖨️ Imprimir
        </button>

        <button
          type="button"
          onclick="closeModal()"
        >
          Cerrar
        </button>

      </div>

      <p class="muted" style="margin-top:10px;">
        ${
          customer?.phone
            ? `WhatsApp preparado para ${esc(customer.phone)}.`
            : "No hay teléfono guardado para este cliente; WhatsApp abrirá el mensaje para que elijas el contacto."
        }
      </p>
    `,

    null

  );

}


async function copySaleReceipt(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    alert("Comprobante copiado.");
  }catch(error){
    console.error(error);
    alert("No se pudo copiar automáticamente. Puedes seleccionar y copiar el texto del comprobante.");
  }

}


function shareSaleReceiptWhatsApp(index) {

  const sale =
    db.sales[index];

  if(!sale){
    return;
  }

  const customer =
    getSaleCustomer(sale);

  const phone =
    receiptPhone(customer?.phone);

  const text =
    buildSaleReceiptText(
      sale,
      index
    );

  const url =
    phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


function printSaleReceipt(index) {

  const sale = db.sales[index];
  if(!sale){ return; }

  const customer = getSaleCustomer(sale);
  const items = Array.isArray(sale.items) && sale.items.length
    ? sale.items
    : [{ product: sale.product || "Producto", qty: sale.qty || 0, price: +sale.price || 0 }];

  const rows = items.map(item => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const price = Math.max(0, Number(item.price) || 0);
    return `<tr>
      <td>${esc(item.product || "Producto")}</td>
      <td class="num">${qty}</td>
      <td class="num">${money(price)}</td>
      <td class="num strong">${money(qty * price)}</td>
    </tr>`;
  }).join("");

  const subtotal = items.reduce((sum,item) => {
    return sum + Math.max(0, Number(item.qty)||0) * Math.max(0, Number(item.price)||0);
  }, 0);
  const total = Math.max(0, Number(sale.total) || subtotal);
  const paid = salePaid(sale);
  const balance = saleBalance(sale);

  const printWindow = window.open("", "_blank", "width=760,height=900");
  if(!printWindow){
    alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para Aquarium Fish.");
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprobante ${esc(receiptNumber(index))} - Aquarium Fish</title>
<style>
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:#172024;font-family:Arial,Helvetica,sans-serif;font-size:13px}
  .sheet{max-width:760px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid #087f8c;padding-bottom:16px}
  .brand{font-size:25px;font-weight:800;letter-spacing:.2px}.brand span{font-size:28px}
  .subtitle{margin-top:5px;color:#647276;font-size:12px}
  .doc{text-align:right}.doc-title{font-size:18px;font-weight:800}.doc-no{margin-top:5px;color:#647276}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
  .box{border:1px solid #d9e1e3;border-radius:10px;padding:11px}.label{font-size:10px;text-transform:uppercase;color:#718084;font-weight:700;margin-bottom:4px}
  .value{font-size:13px;font-weight:700}.muted{color:#68777b;font-weight:400}
  table{width:100%;border-collapse:collapse;margin-top:8px}thead{background:#f1f7f8}th{font-size:11px;text-transform:uppercase;color:#536469;text-align:left;padding:10px;border-bottom:1px solid #cfd9db}td{padding:10px;border-bottom:1px solid #e3e8e9}th.num,td.num{text-align:right}.strong{font-weight:700}
  .summary{margin:18px 0 0 auto;width:320px}.line{display:flex;justify-content:space-between;padding:5px 0}.total{display:flex;justify-content:space-between;border-top:2px solid #172024;margin-top:5px;padding-top:9px;font-size:19px;font-weight:800}.balance{color:#9a5a00}
  .notes{margin-top:18px;border-left:4px solid #087f8c;background:#f5fafb;padding:11px 13px;border-radius:6px}.notes b{display:block;margin-bottom:4px}
  .footer{margin-top:32px;padding-top:13px;border-top:1px solid #d9e1e3;text-align:center;color:#68777b;font-size:11px;line-height:1.5}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.sheet{max-width:none}}
</style>
</head>
<body>
<div class="sheet">
  <header class="header">
    <div><div class="brand"><span>🐠</span> AQUARIUM FISH</div><div class="subtitle">Comprobante de venta</div></div>
    <div class="doc"><div class="doc-title">VENTA</div><div class="doc-no">N.º ${esc(receiptNumber(index))}</div></div>
  </header>

  <section class="info">
    <div class="box"><div class="label">Cliente</div><div class="value">${esc(sale.client || "Venta mostrador")}</div>${customer?.phone ? `<div class="muted">${esc(customer.phone)}</div>` : ""}</div>
    <div class="box"><div class="label">Fecha</div><div class="value">${esc(formatReceiptDate(sale.date))}</div><div class="muted">Forma de pago: ${esc(sale.pay || "")}</div></div>
  </section>

  <table><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${rows}</tbody></table>

  <div class="summary">
    <div class="line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
    <div class="line"><span>Estado</span><strong>${esc(sale.status || "Pagada")}</strong></div>
    <div class="line"><span>Pagado</span><strong>${money(paid)}</strong></div>
    <div class="total"><span>TOTAL</span><span>${money(total)}</span></div>
    ${balance > 0 ? `<div class="line balance"><span>Saldo pendiente</span><strong>${money(balance)}</strong></div>` : ""}
  </div>

  ${sale.note ? `<div class="notes"><b>Nota</b>${esc(sale.note)}</div>` : ""}
  <footer class="footer">Gracias por elegir Aquarium Fish 🐠<br>Conserve este comprobante como soporte de su compra.</footer>
</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script>
</body></html>`);
  printWindow.document.close();
}


function customerPaymentTotal(customer) {

  if(!customer || !Array.isArray(customer.payments)){
    return 0;
  }


  return customer.payments.reduce(
    (sum,payment) =>
      sum +
      Math.max(
        0,
        +payment.amount || 0
      ),
    0
  );

}


function customerStats(name) {

  const customer =
    db.customers.find(
      item =>
        item.name ===
        name
    );


  const sales =
    db.sales.filter(
      sale =>
        sale.client ===
        name
    );


  const bought =
    sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );


  const salePaidAmount =
    sales.reduce(
      (sum,sale) =>
        sum +
        salePaid(sale),
      0
    );


  const extraPayments =
    customerPaymentTotal(
      customer
    );


  const paid =
    salePaidAmount +
    extraPayments;


  return {

    sales,

    bought,

    paid,

    salePaid:
      salePaidAmount,

    payments:
      extraPayments,

    balance:
      Math.max(
        0,
        bought - paid
      )

  };

}


function customerBalance(name){

  return customerStats(
    name
  ).balance;

}


function openCustomerAccount(index){

  const customer =
    db.customers[index];


  if(!customer){
    return;
  }


  const stats =
    customerStats(
      customer.name
    );


  const payments =
    Array.isArray(
      customer.payments
    )
      ? customer.payments
      : [];


  modal(
    `Cuenta de ${customer.name}`,
    `

      <div class="panel">

        <b>
          Resumen de cuenta
        </b>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
            gap:8px;
            margin-top:10px;
          "
        >

          <div class="card">
            <span>Comprado</span>
            <b>${money(stats.bought)}</b>
          </div>

          <div class="card">
            <span>Pagado</span>
            <b>${money(stats.paid)}</b>
          </div>

          <div class="card">
            <span>Saldo pendiente</span>
            <b>${money(stats.balance)}</b>
          </div>

        </div>

      </div>


      <h3 style="margin:16px 0 8px;">
        Ventas
      </h3>

      ${
        stats.sales.length
          ? `
            <div>
              ${
                stats.sales
                  .map(
                    sale => `
                      <div
                        class="item"
                        style="margin-bottom:8px;"
                      >

                        <div>
                          <b>
                            ${esc(
                              dateKey(
                                sale.date
                              )
                            )}
                          </b>

                          <div class="muted">
                            ${esc(
                              saleLabel(
                                sale
                              )
                            )}
                          </div>

                        </div>

                        <div class="right">

                          <b>
                            ${money(
                              sale.total
                            )}
                          </b>

                          <small>
                            Pagado:
                            ${money(
                              salePaid(
                                sale
                              )
                            )}
                          </small>

                        </div>

                      </div>
                    `
                  )
                  .join("")
              }
            </div>
          `
          : `
            <div class="empty">
              No hay ventas registradas.
            </div>
          `
      }


      <h3 style="margin:16px 0 8px;">
        Abonos registrados
      </h3>

      ${
        payments.length
          ? `
            <div>
              ${
                payments
                  .slice()
                  .reverse()
                  .map(
                    payment => `
                      <div
                        class="item"
                        style="margin-bottom:8px;"
                      >

                        <div>
                          <b>
                            ${money(
                              payment.amount
                            )}
                          </b>

                          <div class="muted">
                            ${esc(
                              payment.method ||
                              "Otro"
                            )}
                            ·
                            ${esc(
                              payment.date ||
                              ""
                            )}
                          </div>

                          ${
                            payment.note
                              ? `
                                <div class="muted">
                                  ${esc(
                                    payment.note
                                  )}
                                </div>
                              `
                              : ""
                          }

                        </div>

                        <span class="badge">
                          Abono
                        </span>

                      </div>
                    `
                  )
                  .join("")
              }
            </div>
          `
          : `
            <div class="empty">
              No hay abonos adicionales.
            </div>
          `
      }


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        ${
          stats.balance > 0
            ? `
              <button
                class="primary"
                type="button"
                onclick="openCustomerPayment(${index})"
              >
                💰 Registrar abono
              </button>
            `
            : `
              <button
                type="button"
                disabled
              >
                ✅ Cuenta al día
              </button>
            `
        }

        <button
          type="button"
          onclick="openCustomer(${index})"
        >
          ✏️ Editar cliente
        </button>

        <button
          type="button"
          onclick="closeModal()"
        >
          Cerrar
        </button>

      </div>

    `
  );

}


function openCustomerPayment(index){

  const customer =
    db.customers[index];


  if(!customer){
    return;
  }


  const stats =
    customerStats(
      customer.name
    );


  if(stats.balance <= 0){

    alert(
      "Este cliente no tiene saldo pendiente."
    );

    return;

  }


  modal(
    `Registrar abono - ${customer.name}`,
    `

      <div class="panel">

        <b>
          Saldo pendiente:
          ${money(stats.balance)}
        </b>

      </div>


      <label>

        Valor del abono

        <input
          name="amount"
          type="number"
          min="1"
          max="${stats.balance}"
          step="1"
          value="${stats.balance}"
          required
        >

      </label>


      <label>

        Forma de pago

        <select name="method">

          <option>Efectivo</option>
          <option>Transferencia</option>
          <option>Nequi</option>
          <option>Daviplata</option>
          <option>Tarjeta</option>
          <option>Otro</option>

        </select>

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Ej.: Abono a cuenta"
        ></textarea>

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:14px;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar abono
        </button>

        <button
          type="button"
          onclick="openCustomerAccount(${index})"
        >
          Volver a cuenta
        </button>

      </div>

    `,
    event => {

      event.preventDefault();


      const form =
        event.target;


      const amount =
        +form.amount.value || 0;


      if(amount <= 0){

        alert(
          "Escribe un valor de abono."
        );

        return;

      }


      if(amount > stats.balance){

        alert(
          `El abono no puede superar el saldo pendiente de ${money(stats.balance)}.`
        );

        return;

      }


      if(!Array.isArray(customer.payments)){
        customer.payments = [];
      }


      customer.payments.push({

        date:
          now(),

        amount,

        method:
          form.method.value,

        note:
          form.note.value.trim(),

        source:
          "Abono cliente"

      });


      save();

      closeModal();


      setTimeout(
        () =>
          openCustomerAccount(index),
        0
      );

    }
  );

}


function renderCustomers() {

  const search =
    document.getElementById(
      "customerSearch"
    );


  const list =
    document.getElementById(
      "customersList"
    );


  if(
    !search ||
    !list
  ){

    return;

  }


  const q =
    String(
      search.value || ""
    )
      .toLowerCase()
      .trim();


  const rows =
    db.customers
      .filter(
        customer =>
          `${customer.name || ""} ${
            customer.phone || ""
          }`
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a,b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),
            "es"
          )
      );


  list.innerHTML =
    rows.length

      ? rows
          .map(
            customer => {

              const index =
                db.customers.indexOf(
                  customer
                );


              const stats =
                customerStats(
                  customer.name
                );


              return `

                <div
                  class="item clickable"
                  onclick="editCustomer(
                    ${index}
                  )"
                >

                  <div>

                    <b>
                      ${esc(
                        customer.name
                      )}
                    </b>

                    <div class="muted">

                      ${esc(
                        customer.phone ||
                        "Sin teléfono"
                      )}

                    </div>

                    <div class="muted">

                      Comprado
                      ${money(
                        stats.bought
                      )}

                      ·

                      Pagado
                      ${money(
                        stats.paid
                      )}

                      ·

                      Saldo
                      ${money(
                        stats.balance
                      )}

                    </div>

                    ${
                      customer.note
                        ? `

                          <div class="muted">

                            Nota:
                            ${esc(
                              customer.note
                            )}

                          </div>

                        `
                        : ""
                    }

                  </div>


                  <div
                    style="
                      display:flex;
                      flex-direction:column;
                      align-items:flex-end;
                      gap:6px;
                    "
                  >

                    <span
                      class="badge ${
                        stats.balance > 0
                          ? "low"
                          : ""
                      }"
                    >

                      ${
                        stats.sales.length
                      }

                      ${
                        stats.sales.length === 1
                          ? "venta"
                          : "ventas"
                      }

                    </span>

                    <button
                      type="button"
                      onclick="event.stopPropagation();openCustomerAccount(${index})"
                    >
                      💳 Ver cuenta
                    </button>

                    ${
                      stats.balance > 0
                        ? `
                          <button
                            type="button"
                            class="primary"
                            onclick="event.stopPropagation();openCustomerPayment(${index})"
                          >
                            💰 Abonar
                          </button>
                        `
                        : ""
                    }

                  </div>

                </div>

              `;

            }
          )
          .join("")

      : `

        <div class="empty">

          No hay clientes.
          Agrega el primero.

        </div>

      `;

}



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
    nav.appendChild(navButton);
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
  const quotes=Array.isArray(db.quotes)?db.quotes:[];
  el.innerHTML=quotes.length ? quotes.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""))).map(q=>{
    const id=q.id||"";
    const customer=q.customer||"Cliente general";
    const dateObj=parseLocalDate(q.createdAt||q.date);
    const dateText=dateObj?dateObj.toLocaleDateString("es-CO"):"";
    const total=Number(q.total||0);
    const converted=!!q.convertedSaleId;
    const fs=quoteFollowupState(q);
    const followText=q.followupDate ? `${fs.icon} ${fs.label} · ${formatFollowupDate(q.followupDate)}` : `${fs.icon} ${fs.label}`;
    return `<div class="quote-row" style="display:grid;grid-template-columns:1.1fr .8fr .9fr 1.25fr;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.08);">
      <div><b>${esc(id)}</b><div class="muted">${esc(customer)}</div></div>
      <div class="muted">${esc(dateText)}</div>
      <div><b>${money(total)}</b><div class="muted">${esc(quoteStatusLabel(q))}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span class="badge">${esc(followText)}</span>
        <button type="button" onclick="viewQuote('${esc(id)}')">👁️ Ver</button>
        <button type="button" onclick="openQuoteFollowup('${esc(id)}')">📌 Seguimiento</button>
        <button type="button" onclick="duplicateQuote('${esc(id)}')">📑 Duplicar</button>
        <button type="button" onclick="shareSavedQuoteWhatsApp('${esc(id)}')">📲 WhatsApp</button>
        <button type="button" onclick="printQuote('${esc(id)}')">🖨️</button>
        ${converted ? `<span class="badge">✅ Venta ${esc(q.convertedSaleId)}</span>` : `<button type="button" onclick="editQuote('${esc(id)}')">✏️ Editar</button><button type="button" class="primary" onclick="convertQuoteToSale('${esc(id)}')">➡️ Convertir</button>${q.followupDate&&!q.followupCompleted?`<button type="button" onclick="markQuoteFollowupDone('${esc(id)}')">☑️ Listo</button>`:""}`}
        ${!converted ? `<button type="button" onclick="deleteQuote('${esc(id)}')">🗑️</button>` : ""}
      </div></div>`;
  }).join("") : `<div class="empty">No hay cotizaciones guardadas todavía.</div>`;
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
  q.status="Lista para venta";
  save();
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
  if(!section){
    return;
  }

  const categories = quoteCategories();
  const q = quoteSearch.trim().toLowerCase();

  const products = db.products
    .map((product,index) => ({product,index}))
    .filter(({product}) => {
      const category = String(product.category || "").trim();
      if(quoteCategory !== "Todas" && category !== quoteCategory){
        return false;
      }

      if(!q){
        return true;
      }

      return `${product.name || ""} ${category}`
        .toLowerCase()
        .includes(q);
    })
    .sort((a,b) =>
      String(a.product.name || "").localeCompare(
        String(b.product.name || ""),
        "es"
      )
    );

  section.innerHTML = `
    <div class="section-head">
      <h1>🧾 Cotizador</h1>
      <button type="button" onclick="clearQuote()">Limpiar</button>
    </div>

    <div class="panel">
      <h2>Cliente</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <select id="quoteCustomerSelect" class="search">
          <option value="">Cliente general</option>
          ${db.customers
            .map((customer, index) => ({
              customer,
              index
            }))
            .filter(({customer}) => customer && String(customer.name || "").trim())
            .sort((a,b) =>
              String(a.customer.name || "").localeCompare(
                String(b.customer.name || ""),
                "es"
              )
            )
            .map(({customer,index}) => `
              <option
                value="${index}"
                ${String(customer.name || "").trim() === String(quoteCustomer || "").trim() ? "selected" : ""}
              >
                ${esc(customer.name)}
              </option>
            `).join("")}
          <option value="__manual__" ${quoteCustomer && !db.customers.some(c => String(c?.name || "").trim() === String(quoteCustomer || "").trim()) ? "selected" : ""}>
            ✏️ Escribir otro cliente
          </option>
        </select>

        <input
          id="quotePhone"
          class="search"
          type="tel"
          placeholder="WhatsApp / teléfono"
          value="${esc(quotePhone)}"
        >
      </div>

      <div style="margin-top:8px;">
        <input
          id="quoteCustomer"
          class="search"
          placeholder="Nombre del cliente"
          value="${esc(quoteCustomer)}"
          ${quoteCustomer && db.customers.some(c => String(c?.name || "").trim() === String(quoteCustomer || "").trim()) ? 'style="display:none;"' : ""}
        >
      </div>

      <p class="muted" style="margin:8px 0 0;">
        ${db.customers.length
          ? "Selecciona un cliente registrado y sus datos se cargarán automáticamente."
          : "No hay clientes registrados todavía. Puedes escribir el nombre manualmente."}
      </p>
    </div>

    <div class="panel">
      <h2>Agregar productos</h2>
      <p class="muted">
        Selecciona varios productos. El cotizador usa el precio de venta del inventario y no modifica el stock.
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">
        <input
          id="quoteSearch"
          class="search"
          placeholder="🔎 Buscar producto..."
          value="${esc(quoteSearch)}"
        >
        <select id="quoteCategory" class="search">
          ${categories.map(category => `
            <option value="${esc(category)}" ${category === quoteCategory ? "selected" : ""}>
              ${esc(category)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="list" style="max-height:360px;overflow:auto;">
        ${products.length ? products.map(({product,index}) => `
          <div class="item" style="align-items:center;gap:8px;">
            <div style="flex:1;min-width:0;">
              <b>${esc(product.name || "Producto")}</b>
              <div class="muted">
                ${esc(product.category || "Sin categoría")} · ${money(product.price)}
              </div>
            </div>
            <button type="button" class="primary" onclick="addQuoteItem(${index})">
              + Agregar
            </button>
          </div>
        `).join("") : `
          <div class="empty">No hay productos que coincidan.</div>
        `}
      </div>
    </div>

    <div class="panel">
      <h2>🛒 Cotización actual</h2>
      ${quoteItems.length ? quoteItems.map(item => {
        const subtotal = (+item.qty || 0) * (+item.unitPrice || 0);
        return `
          <div class="item" style="align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <b>${esc(item.name)}</b>
              <div style="display:grid;grid-template-columns:90px 1fr;gap:8px;margin-top:6px;">
                <input
                  class="search"
                  type="number"
                  min="1"
                  step="1"
                  value="${+item.qty || 1}"
                  aria-label="Cantidad"
                  onchange="updateQuoteItem('${esc(item.key)}','qty',this.value)"
                >
                <input
                  class="search"
                  type="number"
                  min="0"
                  step="1"
                  value="${+item.unitPrice || 0}"
                  aria-label="Precio unitario"
                  onchange="updateQuoteItem('${esc(item.key)}','unitPrice',this.value)"
                >
              </div>
              <div class="muted" style="margin-top:5px;">
                ${Number(item.qty) || 1} unidad(es) · Subtotal ${money(subtotal)}
              </div>
            </div>
            <button type="button" onclick="removeQuoteItem('${esc(item.key)}')">🗑️</button>
          </div>
        `;
      }).join("") : `
        <div class="empty">Agrega productos para comenzar.</div>
      `}

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,.08);">
        <h3 style="margin:0 0 8px;">📌 Seguimiento comercial</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <label>Fecha de seguimiento
            <input id="quoteFollowupDate" class="search" type="date" value="${esc(quoteFollowupDate)}">
          </label>
          <label>Nota interna
            <input id="quoteFollowupNote" class="search" placeholder="Ej. llamar, confirmar pedido..." value="${esc(quoteFollowupNote)}">
          </label>
        </div>
        <p class="muted" style="margin:6px 0 10px;">La nota interna no se muestra al cliente.</p>
        <label>
          Nota para el cliente
          <textarea
            id="quoteNote"
            rows="3"
            placeholder="Ej. Instalación, domicilio, disponibilidad, etc."
          >${esc(quoteNote)}</textarea>
        </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <label>Descuento
          <input id="quoteDiscount" class="search" type="number" min="0" step="1" placeholder="0" value="${quoteDiscount || 0}">
        </label>
        <div style="background:#f5f8f9;border-radius:14px;padding:12px;margin-bottom:10px;">
          <div class="muted">Subtotal</div><strong>${money(quoteSubtotal())}</strong>
          <div class="muted" style="margin-top:5px;">Descuento</div><strong>-${money(quoteDiscountAmount())}</strong>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:4px;padding-top:12px;border-top:1px solid rgba(0,0,0,.08);">
        <span><b>Total</b></span>
        <strong style="font-size:1.35rem;">${money(quoteTotal())}</strong>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
        <button type="button" class="primary" onclick="saveQuote()">
          ${quoteEditingId ? "💾 Guardar cambios" : "💾 Guardar cotización"}
        </button>
        <button type="button" onclick="copyQuote()">📋 Copiar</button>
        <button type="button" class="primary" onclick="shareQuoteWhatsApp()">📲 WhatsApp</button>
      </div>

      <p class="muted" style="margin-top:10px;">
        El cotizador muestra precios de venta. La ganancia nunca se muestra al cliente.
      </p>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="section-head" style="margin-bottom:8px;">
        <h2>📊 Resumen de cotizaciones</h2>
        <span class="muted">Actualizado automáticamente</span>
      </div>
      <div id="quoteReports"></div>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="section-head" style="margin-bottom:8px;">
        <h2>🧠 Inteligencia comercial</h2>
        <span class="muted">Oportunidades y prioridades del cotizador</span>
      </div>
      <div id="quoteIntelligence"></div>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="section-head" style="margin-bottom:8px;">
        <h2>📌 Seguimiento comercial</h2>
        <span class="muted">Control de próximas llamadas y contactos</span>
      </div>
      <div id="quoteFollowupSummary" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px;"></div>
      <div id="quoteFollowupList"></div>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="section-head" style="margin-bottom:8px;">
        <h2>🔔 Automatización y alertas</h2>
        <span class="muted">Control automático de seguimientos</span>
      </div>
      <div id="quoteAutomationAlerts"></div>
    </div>

    <div class="panel" style="margin-top:12px;">
      <div class="section-head" style="margin-bottom:8px;">
        <h2>📋 Cotizaciones guardadas</h2>
        <span class="muted">${Array.isArray(db.quotes) ? db.quotes.length : 0} guardadas</span>
      </div>
      <div id="quotesList"></div>
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
        if(customer){
          customer.style.display = "";
          customer.focus();
        }
        if(phone){
          phone.value = "";
        }
        quotePhone = "";
        return;
      }

      if(value === ""){
        quoteCustomer = "";
        quotePhone = "";
        if(customer){
          customer.value = "";
          customer.style.display = "none";
        }
        if(phone){
          phone.value = "";
        }
        return;
      }

      const selectedCustomer = db.customers[Number(value)];

      if(selectedCustomer){
        quoteCustomer = String(selectedCustomer.name || "").trim();
        quotePhone = String(selectedCustomer.phone || "").trim();

        if(customer){
          customer.value = quoteCustomer;
          customer.style.display = "none";
        }

        if(phone){
          phone.value = quotePhone;
        }
      }
    };
  }

  if(customer){
    customer.oninput = function(){
      quoteCustomer = this.value;
    };
  }

  if(phone){
    phone.oninput = function(){
      quotePhone = this.value;
    };
  }

  const note = document.getElementById("quoteNote");
  if(note){
    note.oninput = function(){ quoteNote = this.value; };
  }

  const followupDate = document.getElementById("quoteFollowupDate");
  if(followupDate){ followupDate.oninput = function(){ quoteFollowupDate=this.value; }; }
  const followupNote = document.getElementById("quoteFollowupNote");
  if(followupNote){ followupNote.oninput = function(){ quoteFollowupNote=this.value; }; }

  const discount = document.getElementById("quoteDiscount");
  if(discount){
    discount.oninput = function(){ quoteDiscount = Math.max(0, Number(this.value) || 0); renderCotizador(); };
  }

  const search = document.getElementById("quoteSearch");
  if(search){
    search.oninput = function(){
      quoteSearch = this.value;
      const cursor = this.value.length;
      renderCotizador();
      const next = document.getElementById("quoteSearch");
      if(next){
        next.focus();
        try{ next.setSelectionRange(cursor,cursor); }catch(_){ }
      }
    };
  }

  const category = document.getElementById("quoteCategory");
  if(category){
    category.onchange = function(){
      quoteCategory = this.value;
      renderCotizador();
    };
  }
}

/* =========================================================
   MOVIMIENTOS
   ========================================================= */

function renderMoves() {

  const list =
    document.getElementById(
      "movesList"
    );


  if(!list){

    return;

  }


  list.innerHTML =
    db.moves.length

      ? db.moves
          .slice()
          .reverse()
          .map(
            move => `

              <div class="item">

                <div>

                  <b>
                    ${esc(
                      move.product
                    )}
                  </b>

                  <div class="muted">

                    ${
                      move.source === "Venta"
                        ? "Venta automática"
                        : esc(
                            move.reason ||
                            ""
                          )
                    }

                    ·

                    ${esc(
                      move.responsible ||
                      ""
                    )}

                    ·

                    ${esc(
                      move.date ||
                      ""
                    )}

                  </div>

                </div>

                <span class="badge">

                  ${esc(
                    move.type
                  )}

                  ${move.qty}

                </span>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          No hay movimientos.
        </div>

      `;

}


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


/* =========================================================
   VENTAS
   ========================================================= */

function addSaleRow() {

  const container =
    document.getElementById(
      "saleRows"
    );


  if(!container){

    return;

  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "sale-row";


  row.style.cssText =
    `
      display:grid;
      grid-template-columns:1fr 80px 45px;
      gap:6px;
      margin-bottom:8px;
    `;


  row.innerHTML = `

    <select
      class="sale-product"
    >

      <option value="">
        Producto
      </option>

      ${
        db.products
          .map(
            (
              product,
              index
            ) => `

              <option
                value="${index}"
              >

                ${esc(
                  product.name
                )}

                —

                stock
                ${product.stock}

              </option>

            `
          )
          .join("")
      }

    </select>


    <input
      class="sale-qty"
      type="number"
      min="1"
      value="1"
    >


    <button
      type="button"
    >
      ✕
    </button>

  `;


  container.appendChild(
    row
  );


  row.querySelector(
    ".sale-product"
  ).onchange =
    updateSalePreview;


  row.querySelector(
    ".sale-qty"
  ).oninput =
    updateSalePreview;


  row.querySelector(
    "button"
  ).onclick =
    function(){

      row.remove();

      updateSalePreview();

    };


  updateSalePreview();

}


function updateSalePreview() {

  const rows =
    [
      ...document.querySelectorAll(
        ".sale-row"
      )
    ];


  let total = 0;

  let profit = 0;


  rows.forEach(
    row => {

      const productIndex =
        row.querySelector(
          ".sale-product"
        )?.value;


      const quantity =
        +(
          row.querySelector(
            ".sale-qty"
          )?.value || 0
        );


      const product =
        productIndex !== ""
          ? db.products[
              +productIndex
            ]
          : null;


      if(
        product &&
        quantity > 0
      ){

        total +=
          (+product.price || 0) *
          quantity;


        profit +=
          (
            (+product.price || 0) -
            (+product.cost || 0)
          ) *
          quantity;

      }

    }
  );


  const totalElement =
    document.getElementById(
      "saleTotalPreview"
    );


  const profitElement =
    document.getElementById(
      "saleProfitPreview"
    );


  if(totalElement){

    totalElement.textContent =
      money(total);

  }


  if(profitElement){

    profitElement.textContent =
      money(profit);

  }


  return {

    total,

    profit

  };

}


function openSale(quotePayload = null) {

  modal(

    "Nueva venta",


    `

      <label>

        Cliente

        <select name="client">

          <option value="">
            Sin cliente
          </option>

          ${
            db.customers
              .map(
                customer => `

                  <option
                    value="${esc(
                      customer.name
                    )}"
                  >

                    ${esc(
                      customer.name
                    )}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <div id="saleRows"></div>


      <button
        type="button"
        onclick="addSaleRow()"
      >
        ➕ Agregar producto
      </button>


      <div
        class="panel"
        style="margin-top:12px;"
      >

        <b>

          Total:

          <span
            id="saleTotalPreview"
          >
            ${money(0)}
          </span>

        </b>


        <div>

          Ganancia estimada:

          <span
            id="saleProfitPreview"
          >
            ${money(0)}
          </span>

        </div>

      </div>


      <label>

        Forma de pago

        <select name="pay">

          <option>
            Efectivo
          </option>

          <option>
            Transferencia
          </option>

          <option>
            Nequi
          </option>

          <option>
            Daviplata
          </option>

          <option>
            Tarjeta
          </option>

          <option>
            Otro
          </option>

        </select>

      </label>


      <label>

        Estado

        <select name="status">

          <option>
            Pagada
          </option>

          <option>
            Abono
          </option>

          <option>
            Pendiente
          </option>

        </select>

      </label>


      <label>

        Abono recibido

        <input
          name="paid"
          type="number"
          min="0"
          step="1"
          value="0"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
        "
      >

        <button
          class="primary"
          type="submit"
        >
          💾 Guardar venta
        </button>


        <button
          type="button"
          onclick="closeModal()"
        >
          Cancelar
        </button>

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const items = [];


      for(
        const row of
        form.querySelectorAll(
          ".sale-row"
        )
      ){

        const productIndex =
          row.querySelector(
            ".sale-product"
          )?.value;


        const quantity =
          +(
            row.querySelector(
              ".sale-qty"
            )?.value || 0
          );


        if(
          productIndex === "" ||
          quantity <= 0
        ){

          continue;

        }


        const product =
          db.products[
            +productIndex
          ];


        if(!product){

          continue;

        }


        if(
          (+product.stock || 0) <
          quantity
        ){

          alert(
            `No hay suficiente stock de "${product.name}".`
          );

          return;

        }


        items.push({

          product:
            product.name,

          productIndex:
            +productIndex,

          qty:
            quantity,

          price:
            +product.price || 0,

          cost:
            +product.cost || 0

        });

      }


      if(!items.length){

        alert(
          "Agrega al menos un producto."
        );

        return;

      }


      const total =
        items.reduce(
          (sum,item) =>
            sum +
            item.price *
            item.qty,
          0
        );


      let paid =
        +form.paid.value || 0;


      const status =
        form.status.value;


      if(
        (
          status === "Abono" ||
          status === "Pendiente"
        ) &&
        !String(
          form.client.value || ""
        ).trim()
      ){

        alert(
          "Para una venta con abono o pendiente debes seleccionar un cliente."
        );

        return;

      }


      if(
        status ===
        "Pagada"
      ){

        paid =
          total;

      }


      if(
        status ===
        "Pendiente"
      ){

        paid =
          0;

      }


      paid =
        Math.max(
          0,
          Math.min(
            paid,
            total
          )
        );


      items.forEach(
        item => {

          const product =
            db.products[
              item.productIndex
            ];


          product.stock =
            Math.max(
              0,
              (+product.stock || 0) -
              item.qty
            );

        }
      );


      const newSale = {
        id:`V-${String(db.sales.length + 1).padStart(4,"0")}`,
        date:now(),
        client:form.client.value,
        items,
        total,
        paid,
        pay:form.pay.value,
        status,
        profit:items.reduce(
          (sum,item) => sum + ((item.price-item.cost)*item.qty), 0
        ),
        fromQuoteId:window.pendingQuoteToSale?.quoteId || null
      };

      db.sales.push(newSale);


      items.forEach(
        item => {
          const product = db.products[item.productIndex];

          if(!product){
            return;
          }

          db.moves.push({
            date: now(),
            product: product.name,
            type: "Salida",
            qty: item.qty,
            reason: "Venta",
            responsible: "Sistema",
            source: "Venta",
            saleId: newSale.id
          });
        }
      );

      save();

      if(window.pendingQuoteToSale?.quoteId){
        const payload=window.pendingQuoteToSale;
        const q=findQuoteById(payload.quoteId);
        if(q){
          q.convertedSaleId=newSale.id;
          q.status="Convertida en venta";
          q.convertedAt=now();
        }
        window.pendingQuoteToSale=null;
        save();
        renderCotizador();
      }

      closeModal();

    }

  );


  addSaleRow();

  if(quotePayload && quotePayload.items){
    const clientSelect=document.querySelector('#modal select[name="client"]');
    if(clientSelect && quotePayload.customer){
      let option=[...clientSelect.options].find(opt =>
        String(opt.value).trim().toLowerCase()===String(quotePayload.customer).trim().toLowerCase()
      );
      if(!option){
        option=document.createElement("option");
        option.value=quotePayload.customer;
        option.textContent=quotePayload.customer;
        clientSelect.appendChild(option);
      }
      clientSelect.value=quotePayload.customer;
    }

    quotePayload.items.forEach((item,itemIndex)=>{
      if(itemIndex>0) addSaleRow();
      const rows=[...document.querySelectorAll(".sale-row")];
      const row=rows[rows.length-1];
      if(!row) return;
      const select=row.querySelector(".sale-product");
      const qty=row.querySelector(".sale-qty");
      if(select) select.value=String(item.productIndex);
      if(qty) qty.value=Math.max(1,+item.qty||1);
    });
    updateSalePreview();
  }

}


/* =========================================================
   ELIMINAR VENTA
   ========================================================= */

function deleteSale(index){

  const sale = db.sales[index];

  if(!sale){
    return;
  }

  const saleNumber = sale.id || "esta venta";

  if(!confirm(
    `¿Eliminar la venta ${saleNumber}?\\n\\n` +
    `Se quitará de los reportes y se devolverán al inventario ` +
    `las cantidades vendidas.\\n\\n` +
    `Esta acción no se puede deshacer.`
  )){
    return;
  }

  // Devolver al inventario las cantidades de esta venta.
  if(Array.isArray(sale.items)){

    sale.items.forEach(item => {

      const productIndex =
        Number.isInteger(+item.productIndex)
          ? +item.productIndex
          : -1;

      const product =
        db.products[productIndex];

      if(product){
        product.stock =
          (+product.stock || 0) +
          (+item.qty || 0);
      }

    });

  }else if(
    sale.product &&
    sale.qty
  ){

    // Compatibilidad con ventas antiguas de un solo producto.
    const product =
      db.products.find(
        p => String(p.name || "").trim() ===
             String(sale.product || "").trim()
      );

    if(product){
      product.stock =
        (+product.stock || 0) +
        (+sale.qty || 0);
    }

  }

  // Eliminar los movimientos de inventario generados por esta venta.
  // Las ventas nuevas llevan saleId. Para ventas antiguas sin saleId,
  // dejamos los movimientos intactos para no borrar movimientos de otra venta.
  if(sale.id){

    db.moves =
      db.moves.filter(
        move => move.saleId !== sale.id
      );

  }

  // Si la venta provino de una cotización, la devolvemos a estado pendiente
  // para que no quede marcada como convertida después de borrar la venta.
  if(sale.fromQuoteId){

    const quote =
      findQuoteById(sale.fromQuoteId);

    if(quote){

      quote.convertedSaleId = null;
      quote.status = "Guardada";

      delete quote.convertedAt;

    }

  }

  db.sales.splice(index,1);

  save();

  closeModal();

}

/* =========================================================
   CLIENTES
   ========================================================= */

function openCustomer(
  index = null
) {

  const customer =
    index === null

      ? {

          name: "",

          phone: "",

          note: ""

        }

      : db.customers[index];


  if(!customer){

    return;

  }


  modal(

    index === null
      ? "Nuevo cliente"
      : "Editar cliente",


    `

      <label>

        Nombre

        <input
          name="name"
          required
          value="${esc(
            customer.name
          )}"
        >

      </label>


      <label>

        Teléfono

        <input
          name="phone"
          value="${esc(
            customer.phone
          )}"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
        >${esc(
          customer.note
        )}</textarea>

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
                onclick="deleteCustomer(
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

        phone:
          form.phone.value.trim(),

        note:
          form.note.value.trim()

      };


      if(!item.name){

        alert(
          "Escribe el nombre del cliente."
        );

        return;

      }


      if(index === null){

        db.customers.push(
          item
        );

      }else{

        db.customers[index] =
          item;

      }


      save();

      closeModal();

    }

  );

}


function editCustomer(index){

  openCustomer(index);

}


function deleteCustomer(index){

  if(!db.customers[index]){

    return;

  }


  if(
    !confirm(
      `¿Eliminar al cliente "${db.customers[index].name}"?`
    )
  ){

    return;

  }


  db.customers.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   ENCARGOS
   ========================================================= */

function openOrder(
  index = null
) {

  const order =
    index === null

      ? {
          product: "",
          client: "",
          customerIndex: "",
          qty: 1,
          price: 0,
          dueDate: "",
          note: "",
          status: "Pendiente"
        }

      : {
          ...db.orders[index]
        };

  if(!order){
    return;
  }

  const customerOptions =
    db.customers
      .map(
        (customer,customerIndex) => `
          <option
            value="${customerIndex}"
            ${
              String(
                order.customerIndex
              ) ===
              String(customerIndex)
                ? "selected"
                : ""
            }
          >
            ${esc(
              customer.name
            )}
            ${
              customer.phone
                ? ` · ${esc(customer.phone)}`
                : ""
            }
          </option>
        `
      )
      .join("");

  modal(

    index === null
      ? "Nuevo encargo"
      : "Editar encargo",

    `

      <label>

        Producto / encargo

        <input
          name="product"
          required
          value="${esc(
            order.product || ""
          )}"
          placeholder="Ej. Oscar 10 cm"
        >

      </label>


      <label>

        Cliente registrado

        <select
          name="customerIndex"
        >

          <option value="">
            — Sin cliente registrado —
          </option>

          ${customerOptions}

        </select>

      </label>


      <label>

        Cliente

        <input
          name="client"
          value="${esc(
            order.client || ""
          )}"
          placeholder="Nombre del cliente"
        >

      </label>


      <label>

        Cantidad

        <input
          name="qty"
          type="number"
          min="1"
          step="1"
          value="${
            +order.qty || 1
          }"
        >

      </label>


      <label>

        Valor estimado

        <input
          name="price"
          type="number"
          min="0"
          step="1"
          value="${
            +order.price || 0
          }"
          placeholder="Opcional"
        >

      </label>


      <label>

        Fecha solicitada

        <input
          name="dueDate"
          type="date"
          value="${esc(
            order.dueDate || ""
          )}"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Color, tamaño, especie, proveedor, etc."
        >${esc(
          order.note || ""
        )}</textarea>

      </label>


      <label>

        Estado

        <select name="status">

          <option
            value="Pendiente"
            ${
              order.status ===
              "Pendiente"
                ? "selected"
                : ""
            }
          >
            🕐 Pendiente
          </option>

          <option
            value="Conseguir"
            ${
              order.status ===
              "Conseguir"
                ? "selected"
                : ""
            }
          >
            🔎 Por conseguir
          </option>

          <option
            value="Listo"
            ${
              order.status ===
              "Listo"
                ? "selected"
                : ""
            }
          >
            ✅ Listo
          </option>

          <option
            value="Entregado"
            ${
              order.status ===
              "Entregado"
                ? "selected"
                : ""
            }
          >
            🤝 Entregado
          </option>

          <option
            value="Cancelado"
            ${
              order.status ===
              "Cancelado"
                ? "selected"
                : ""
            }
          >
            ❌ Cancelado
          </option>

        </select>

      </label>


      ${
        order.date
          ? `
            <div
              class="muted"
              style="margin-top:6px;"
            >
              Registrado: ${esc(order.date)}
            </div>
          `
          : ""
      }


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
          💾 Guardar encargo
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
                onclick="deleteOrder(${index})"
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

      const selectedCustomerIndex =
        form.customerIndex.value;

      const selectedCustomer =
        selectedCustomerIndex !== ""
          ? db.customers[
              +selectedCustomerIndex
            ]
          : null;

      const clientText =
        String(
          selectedCustomer
            ? selectedCustomer.name
            : form.client.value
        ).trim();

      const item = {

        product:
          form.product.value.trim(),

        client:
          clientText,

        customerIndex:
          selectedCustomer
            ? +selectedCustomerIndex
            : "",

        qty:
          Math.max(
            1,
            +form.qty.value || 1
          ),

        price:
          Math.max(
            0,
            +form.price.value || 0
          ),

        dueDate:
          form.dueDate.value || "",

        note:
          form.note.value.trim(),

        status:
          form.status.value,

        date:
          index === null
            ? now()
            : (
                db.orders[index].date ||
                now()
              ),

        updated:
          now()

      };

      if(!item.product){

        alert(
          "Escribe el producto o encargo."
        );

        return;

      }

      if(index === null){

        db.orders.push(
          item
        );

      }else{

        db.orders[index] =
          {
            ...db.orders[index],
            ...item
          };

      }

      save();

      closeModal();

    }

  );

}


function editOrder(index){

  openOrder(index);

}


function deleteOrder(index){

  if(!db.orders[index]){

    return;

  }


  if(
    !confirm(
      "¿Eliminar este encargo?"
    )
  ){

    return;

  }


  db.orders.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   MOVIMIENTOS
   ========================================================= */

function openMove(defaultType = "Entrada", defaultReason = "Compra") {

  modal(

    "Nuevo movimiento",


    `

      <label>

        Producto

        <select name="product">

          <option value="">
            Selecciona un producto
          </option>

          ${
            db.products
              .map(
                (
                  product,
                  index
                ) => `

                  <option
                    value="${index}"
                  >

                    ${esc(
                      product.name
                    )}

                    —

                    stock
                    ${product.stock}

                  </option>

                `
              )
              .join("")
          }

        </select>

      </label>


      <label>

        Tipo

        <select name="type">

          <option ${defaultType === "Entrada" ? "selected" : ""}>
            Entrada
          </option>

          <option ${defaultType === "Salida" ? "selected" : ""}>
            Salida
          </option>

        </select>

      </label>


      <label>

        Cantidad

        <input
          name="qty"
          type="number"
          min="1"
          value="1"
        >

      </label>


      <label>

        Motivo

        <select name="reason">
          <option ${defaultReason === "Compra" ? "selected" : ""}>
            Compra
          </option>
          <option ${defaultReason === "Mortalidad" ? "selected" : ""}>
            Mortalidad
          </option>
          <option ${defaultReason === "Pérdida / Daño" ? "selected" : ""}>
            Pérdida / Daño
          </option>
          <option ${defaultReason === "Ajuste" ? "selected" : ""}>
            Ajuste
          </option>
          <option ${defaultReason === "Regalo" ? "selected" : ""}>
            Regalo
          </option>
          <option ${defaultReason === "Otro" ? "selected" : ""}>
            Otro
          </option>
        </select>

      </label>


      <label>

        Responsable

        <input
          name="responsible"
          placeholder="Nombre"
        >

      </label>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:14px;
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

      </div>

    `,


    event => {

      event.preventDefault();


      const form =
        event.target;


      const productIndex =
        form.product.value;


      const quantity =
        Math.max(
          1,
          +form.qty.value || 1
        );


      if(
        productIndex === ""
      ){

        alert(
          "Selecciona un producto."
        );

        return;

      }


      const product =
        db.products[
          +productIndex
        ];


      if(!product){

        return;

      }


      if(
        form.type.value ===
        "Entrada"
      ){

        product.stock =
          (+product.stock || 0) +
          quantity;


      }else{

        if(
          (+product.stock || 0) <
          quantity
        ){

          alert(
            `No hay suficiente stock de "${product.name}".`
          );

          return;

        }


        product.stock =
          (+product.stock || 0) -
          quantity;

      }


      db.moves.push({

        date:
          now(),

        product:
          product.name,

        type:
          form.type.value,

        qty:
          quantity,

        reason:
          form.reason.value.trim(),

        responsible:
          form.responsible.value.trim()

      });


      save();

      closeModal();

    }

  );

}


/* =========================================================
   CAJA
   ========================================================= */


/*
   Periodo seleccionado.
*/

let cashPeriod =
  "today";


/*
   Normaliza el método de pago.
*/

function normalizePaymentMethod(
  method
){

  const value =
    String(
      method || ""
    )
      .trim()
      .toLowerCase();


  if(
    value ===
    "efectivo"
  ){

    return "Efectivo";

  }


  if(
    value ===
    "nequi"
  ){

    return "Nequi";

  }


  if(
    value ===
    "transferencia" ||
    value ===
    "transferencias"
  ){

    return "Transferencia";

  }


  if(
    value ===
    "daviplata"
  ){

    return "Daviplata";

  }


  if(
    value ===
    "tarjeta"
  ){

    return "Tarjeta";

  }


  return "Otro";

}


/*
   Convierte las ventas en movimientos virtuales
   de caja.

   NO se guardan nuevamente en db.cash.
   Esto evita duplicar el dinero.
*/

function getSaleCashEntries(){

  return db.sales
    .map(
      (
        sale,
        index
      ) => {

        const amount =
          salePaid(sale);


        if(amount <= 0){

          return null;

        }


        return {

          id:
            `sale-${index}`,

          date:
            sale.date,

          type:
            "Entrada",

          amount,

          method:
            normalizePaymentMethod(
              sale.pay
            ),

          concept:
            `Venta: ${saleLabel(
              sale
            )}`,

          source:
            "Venta",

          saleIndex:
            index

        };

      }
    )
    .filter(Boolean);

}


/*
   Movimientos manuales de caja.
*/

function getCustomerPaymentCashEntries(){

  const entries = [];


  db.customers.forEach(
    (customer,customerIndex) => {

      const payments =
        Array.isArray(
          customer.payments
        )
          ? customer.payments
          : [];


      payments.forEach(
        (payment,paymentIndex) => {

          const amount =
            Math.abs(
              +payment.amount || 0
            );


          if(amount <= 0){
            return;
          }


          entries.push({

            id:
              `customer-payment-${customerIndex}-${paymentIndex}`,

            date:
              payment.date,

            type:
              "Entrada",

            amount,

            method:
              normalizePaymentMethod(
                payment.method
              ),

            concept:
              `Abono cliente: ${customer.name}`,

            source:
              "Abono cliente",

            customerIndex,

            paymentIndex

          });

        }
      );

    }
  );


  return entries;

}


function getManualCashEntries(){

  return db.cash.map(
    (
      entry,
      index
    ) => ({

      ...entry,

      index,

      amount:
        Math.abs(
          +entry.amount || 0
        ),

      method:
        normalizePaymentMethod(
          entry.method
        ),

      source:
        "Manual"

    })
  );

}


/*
   Todos los movimientos.
*/

function getAllCashEntries(){

  return [

    ...getSaleCashEntries(),

    ...getCustomerPaymentCashEntries(),

    ...getManualCashEntries()

  ];

}


/*
   Rango de fechas.
*/

function getCashRange(
  period
){

  const nowDate =
    new Date();


  if(
    period ===
    "today"
  ){

    return {

      start:
        startOfDay(
          nowDate
        ),

      end:
        endOfDay(
          nowDate
        )

    };

  }


  if(
    period ===
    "7days"
  ){

    const start =
      startOfDay(
        nowDate
      );


    start.setDate(
      start.getDate() - 6
    );


    return {

      start,

      end:
        endOfDay(
          nowDate
        )

    };

  }


  if(
    period ===
    "month"
  ){

    const start =
      new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        1
      );


    return {

      start:
        startOfDay(start),

      end:
        endOfDay(
          nowDate
        )

    };

  }


  return {

    start: null,

    end: null

  };

}


/*
   Filtra movimientos por periodo.
*/

function getCashEntries(
  period =
    cashPeriod
){

  const range =
    getCashRange(
      period
    );


  return getAllCashEntries()
    .filter(
      entry => {

        const date =
          parseLocalDate(
            entry.date
          );


        if(!date){

          return period ===
            "all";

        }


        if(
          range.start &&
          date < range.start
        ){

          return false;

        }


        if(
          range.end &&
          date > range.end
        ){

          return false;

        }


        return true;

      }
    )
    .sort(
      (a,b) => {

        const dateA =
          parseLocalDate(
            a.date
          );


        const dateB =
          parseLocalDate(
            b.date
          );


        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );

      }
    );

}


/*
   Calcula totales de caja.
*/

function calculateCashTotals(
  period =
    cashPeriod
){

  const entries =
    getCashEntries(
      period
    );


  let received = 0;

  let expenses = 0;


  const methods = {

    Efectivo: 0,

    Nequi: 0,

    Transferencia: 0,

    Daviplata: 0,

    Tarjeta: 0,

    Otro: 0

  };


  entries.forEach(
    entry => {

      const amount =
        Math.abs(
          +entry.amount || 0
        );


      const method =
        normalizePaymentMethod(
          entry.method
        );


      if(
        entry.type ===
        "Gasto"
      ){

        expenses +=
          amount;

        methods[method] =
          (methods[method] || 0) -
          amount;


      }else{

        received +=
          amount;

        methods[method] =
          (methods[method] || 0) +
          amount;

      }

    }
  );


  return {

    entries,

    received,

    expenses,

    balance:
      received -
      expenses,

    methods

  };

}


/*
   Por cobrar.

   Se calcula con todas las ventas,
   independientemente del filtro de caja.
*/

function calculateReceivable(){

  let total = 0;


  const customerNames =
    new Set(
      db.customers
        .map(
          customer =>
            customer.name
        )
        .filter(Boolean)
    );


  customerNames.forEach(
    name => {

      total +=
        customerBalance(
          name
        );

    }
  );


  total +=
    db.sales
      .filter(
        sale =>
          !String(
            sale.client || ""
          ).trim() ||
          !customerNames.has(
            sale.client
          )
      )
      .reduce(
        (sum,sale) =>
          sum +
          Math.max(
            0,
            (+sale.total || 0) -
            salePaid(sale)
          ),
        0
      );


  return total;

}


/*
   Cambiar periodo.
*/

function setCashPeriod(
  value
){

  cashPeriod =
    value ||
    "today";


  renderCash();

}


/*
   Renderizar Caja.
*/

function renderCash(){

  const summary =
    document.getElementById(
      "cashSummary"
    );


  const list =
    document.getElementById(
      "cashList"
    );


  const periodSelect =
    document.getElementById(
      "cashPeriod"
    );


  if(
    periodSelect
  ){

    periodSelect.value =
      cashPeriod;


    periodSelect.onchange =
      function(){

        setCashPeriod(
          this.value
        );

      };

  }


  if(
    !summary ||
    !list
  ){

    return;

  }


  const totals =
    calculateCashTotals(
      cashPeriod
    );


  const receivable =
    calculateReceivable();


  summary.innerHTML = `

    <div class="card">

      <span>
        Recibido
      </span>

      <b>
        ${money(
          totals.received
        )}
      </b>

      <small>
        ventas + ingresos
      </small>

    </div>


    <div class="card">

      <span>
        Efectivo
      </span>

      <b>
        ${money(
          totals.methods.Efectivo
        )}
      </b>

      <small>
        dinero físico
      </small>

    </div>


    <div class="card">

      <span>
        Nequi
      </span>

      <b>
        ${money(
          totals.methods.Nequi
        )}
      </b>

      <small>
        saldo registrado
      </small>

    </div>


    <div class="card">

      <span>
        Transferencias
      </span>

      <b>
        ${money(
          totals.methods.Transferencia
        )}
      </b>

      <small>
        bancos
      </small>

    </div>


    <div class="card">

      <span>
        Tarjeta
      </span>

      <b>
        ${money(
          totals.methods.Tarjeta
        )}
      </b>

      <small>
        pagos
      </small>

    </div>


    <div class="card">

      <span>
        Gastos
      </span>

      <b>
        ${money(
          totals.expenses
        )}
      </b>

      <small>
        periodo
      </small>

    </div>


    <div class="card">

      <span>
        Saldo
      </span>

      <b>
        ${money(
          totals.balance
        )}
      </b>

      <small>
        disponible registrado
      </small>

    </div>


    <div class="card">

      <span>
        Por cobrar
      </span>

      <b>
        ${money(
          receivable
        )}
      </b>

      <small>
        cuentas pendientes
      </small>

    </div>

  `;


  if(!totals.entries.length){

    list.innerHTML = `

      <div class="empty">

        No hay movimientos
        de caja en este periodo.

      </div>

    `;

    return;

  }


  list.innerHTML =
    totals.entries
      .map(
        entry => {

          const isExpense =
            entry.type ===
            "Gasto";


          const amount =
            Math.abs(
              +entry.amount || 0
            );


          const index =
            entry.index;


          const clickable =
            entry.source ===
            "Manual";


          return `

            <div
              class="item ${
                clickable
                  ? "clickable"
                  : ""
              }"
              ${
                clickable
                  ? `onclick="editCashMovement(
                      ${index}
                    )"`
                  : ""
              }
            >

              <div>

                <b>

                  ${
                    entry.source ===
                    "Venta"

                      ? "🧾 "

                      : isExpense
                        ? "💸 "
                        : "💰 "
                  }

                  ${esc(
                    entry.concept ||
                    "Movimiento"
                  )}

                </b>


                <div class="muted">

                  ${esc(
                    entry.date ||
                    ""
                  )}

                  ·

                  ${esc(
                    entry.method ||
                    "Otro"
                  )}

                  ·

                  ${
                    entry.source ===
                    "Venta"

                      ? "Venta"

                      : "Manual"
                  }

                </div>


                ${
                  entry.note

                    ? `

                      <div class="muted">

                        ${esc(
                          entry.note
                        )}

                      </div>

                    `

                    : ""
                }

              </div>


              <div class="right">

                <b>

                  ${
                    isExpense
                      ? "-"
                      : "+"
                  }

                  ${money(
                    amount
                  )}

                </b>


                <small>

                  ${
                    isExpense
                      ? "Gasto"
                      : "Entrada"
                  }

                </small>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================================================
   NUEVO MOVIMIENTO DE CAJA
========================================================= */

function openCashMovement(
  index = null
){

  const editing =
    index !== null;


  const existing =
    editing
      ? db.cash[index]
      : {

          type:
            "Gasto",

          amount:
            0,

          method:
            "Efectivo",

          concept:
            "",

          note:
            ""

        };


  if(
    editing &&
    !existing
  ){

    return;

  }


  modal(

    editing
      ? "Editar movimiento"
      : "Nuevo movimiento de caja",


    `

      <label>

        Tipo

        <select name="type">

          <option
            ${
              existing.type ===
              "Ingreso"
                ? "selected"
                : ""
            }
          >
            Ingreso
          </option>

          <option
            ${
              existing.type ===
              "Gasto"
                ? "selected"
                : ""
            }
          >
            Gasto
          </option>

        </select>

      </label>


      <label>

        Forma

        <select name="method">

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Efectivo"
                ? "selected"
                : ""
            }
          >
            Efectivo
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Nequi"
                ? "selected"
                : ""
            }
          >
            Nequi
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Transferencia"
                ? "selected"
                : ""
            }
          >
            Transferencia
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Daviplata"
                ? "selected"
                : ""
            }
          >
            Daviplata
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Tarjeta"
                ? "selected"
                : ""
            }
          >
            Tarjeta
          </option>

          <option
            ${
              normalizePaymentMethod(
                existing.method
              ) ===
              "Otro"
                ? "selected"
                : ""
            }
          >
            Otro
          </option>

        </select>

      </label>


      <label>

        Valor

        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          value="${
            +existing.amount || 0
          }"
        >

      </label>


      <label>

        Concepto

        <input
          name="concept"
          required
          value="${esc(
            existing.concept
          )}"
          placeholder="Ej. Compra de alimento"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
          placeholder="Observación opcional"
        >${esc(
          existing.note
        )}</textarea>

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
          editing

            ? `

              <button
                type="button"
                onclick="deleteCashMovement(
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


      const amount =
        Math.max(
          0,
          +form.amount.value || 0
        );


      if(amount <= 0){

        alert(
          "Escribe un valor mayor que cero."
        );

        return;

      }


      const concept =
        form.concept.value.trim();


      if(!concept){

        alert(
          "Escribe el concepto del movimiento."
        );

        return;

      }


      const item = {

        id:
          editing &&
          existing.id

            ? existing.id

            : (
                Date.now() +
                "-" +
                Math.random()
                  .toString(36)
                  .slice(2)
              ),

        date:
          editing &&
          existing.date

            ? existing.date

            : now(),

        type:
          form.type.value,

        amount,

        method:
          normalizePaymentMethod(
            form.method.value
          ),

        concept,

        note:
          form.note.value.trim(),

        source:
          "Manual"

      };


      if(editing){

        db.cash[index] =
          {
            ...db.cash[index],
            ...item
          };

      }else{

        db.cash.push(
          item
        );

      }


      save();

      closeModal();

    }

  );

}


function editCashMovement(
  index
){

  openCashMovement(
    index
  );

}


function deleteCashMovement(
  index
){

  if(!db.cash[index]){

    return;

  }


  if(
    !confirm(
      "¿Eliminar este movimiento de caja?"
    )
  ){

    return;

  }


  db.cash.splice(
    index,
    1
  );


  save();

  closeModal();

}


/* =========================================================
   RESUMEN INTERNO
   ========================================================= */

function renderInternal() {

  const element =
    document.getElementById(
      "internalStats"
    );


  if(!element){

    return;

  }


  const sales =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.total || 0),
      0
    );


  const profit =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        (+sale.profit || 0),
      0
    );


  const pending =
    db.sales.reduce(
      (sum,sale) =>
        sum +
        Math.max(
          0,
          (+sale.total || 0) -
          salePaid(sale)
        ),
      0
    );


  const cashTotals =
    calculateCashTotals(
      "all"
    );


  element.innerHTML = `

    <div class="cards">

      <div class="card">

        <b>
          Ventas
        </b>

        <strong>
          ${money(sales)}
        </strong>

      </div>


      <div class="card">

        <b>
          Ganancia
        </b>

        <strong>
          ${money(profit)}
        </strong>

      </div>


      <div class="card">

        <b>
          Pendiente
        </b>

        <strong>
          ${money(pending)}
        </strong>

      </div>


      <div class="card">

        <b>
          Caja
        </b>

        <strong>
          ${money(
            cashTotals.balance
          )}
        </strong>

      </div>


      <div class="card">

        <b>
          Productos
        </b>

        <strong>
          ${db.products.length}
        </strong>

      </div>

    </div>

  `;

}


function openInternal() {

  const modalElement =
    document.getElementById(
      "internalModal"
    );


  if(modalElement){

    renderInternal();


    modalElement.classList.remove(
      "hidden"
    );

  }

}


function closeInternal() {

  const modalElement =
    document.getElementById(
      "internalModal"
    );


  if(modalElement){

    modalElement.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   RESPALDO
   ========================================================= */

function backupPayload(){
  return {
    app: "Aquarium Fish",
    backupVersion: 2,
    createdAt: new Date().toISOString(),
    data: db
  };
}

function exportData(){
  const payload = backupPayload();
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const stamp = new Date().toISOString().slice(0,10);
  link.download = `aquarium-fish-respaldo-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  try{ localStorage.setItem("aquariumFishLastBackup", payload.createdAt); }catch(_){ }
  renderMore();
}

function normalizeImportedData(source){
  if(!source || typeof source !== "object") throw new Error("Formato inválido");
  const candidate = source.data && typeof source.data === "object" ? source.data : source;
  const keys = ["products","sales","moves","customers","quotes","orders","cash"];
  const recognized = keys.filter(k => Array.isArray(candidate[k]));
  if(!recognized.length) throw new Error("El archivo no contiene datos de Aquarium Fish.");
  const result = {};
  keys.forEach(k => { result[k] = Array.isArray(candidate[k]) ? candidate[k] : []; });
  return result;
}

function importData(input){
  const file = input?.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    try{
      const imported = JSON.parse(reader.result);
      const nextDb = normalizeImportedData(imported);
      const totalRecords = Object.values(nextDb).reduce((sum,value)=>sum+value.length,0);
      if(!confirm(`Se encontraron ${totalRecords} registros en el respaldo.\n\nAntes de restaurarlo se descargará una copia de seguridad de los datos actuales.\n\n¿Continuar?`)){
        input.value = "";
        return;
      }
      exportData();
      db = nextDb;
      save();
      alert("Respaldo restaurado correctamente.");
    }catch(error){
      console.error("Error restaurando respaldo:",error);
      alert("No se pudo restaurar el respaldo. El archivo no tiene un formato válido de Aquarium Fish.");
    }finally{
      input.value = "";
    }
  };
  reader.readAsText(file);
}


/* =========================================================
   INICIAR APLICACIÓN
   ========================================================= */

function iniciarApp() {

  applyMobileLayout();

  exposeFunctions();

  setupReportsUI();

  setupCotizadorUI();

  setupStageDUI();

  bindNavigation();

  bindSearches();

  renderAll();
  setTimeout(maybeNotifyQuoteFollowups, 700);

  show("portada");

}


if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    iniciarApp
  );

}else{

  iniciarApp();

}


/* =========================================================
   ETAPA B — OPERACIÓN DIARIA PROFESIONAL
   Inventario + Ventas: mejora de lectura y rapidez sin
   modificar la estructura de datos ni Firebase.
   ========================================================= */

let inventoryStatusFilter = "Todos";
let salesStatusFilter = "Todos";
let salesPeriodFilter = "Todos";
let salesPaymentFilter = "Todos";

function clearInventorySearch(){
  const el=document.getElementById("search");
  if(el){ el.value=""; renderInventory(); el.focus(); }
}

function clearSalesSearch(){
  const el=document.getElementById("salesSearch");
  if(el){ el.value=""; renderSales(); el.focus(); }
}

function inventoryStockState(product){
  const stock=Math.max(0,+product.stock||0);
  const min=Math.max(0,+product.min||0);
  if(stock<=0) return {key:"Agotado", cls:"stageb-danger", icon:"🔴"};
  if(stock<=min) return {key:"Stock bajo", cls:"stageb-warning", icon:"🟠"};
  return {key:"Disponible", cls:"stageb-good", icon:"🟢"};
}

function setInventoryStatusFilter(value){
  inventoryStatusFilter=value||"Todos";
  renderInventory();
}

function setSalesStatusFilter(value){
  salesStatusFilter=value||"Todos";
  renderSales();
}

function setSalesPeriodFilter(value){
  salesPeriodFilter=value||"Todos";
  renderSales();
}

function setSalesPaymentFilter(value){
  salesPaymentFilter=value||"Todos";
  renderSales();
}

function saleStatusClass(status){
  const s=String(status||"Pagada").toLowerCase();
  if(s.includes("pendiente")) return "stageb-warning";
  if(s.includes("abono")) return "stageb-info";
  if(s.includes("cancel")) return "stageb-danger";
  return "stageb-good";
}

function salesPeriodMatch(sale){
  if(salesPeriodFilter==="Todos") return true;
  const d=new Date(sale.date);
  if(Number.isNaN(d.getTime())) return true;
  const nowDate=new Date();
  if(salesPeriodFilter==="Hoy") return sameDay(d,nowDate);
  const start=new Date(nowDate);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate()-(salesPeriodFilter==="7 días"?6:29));
  return d>=start;
}

function renderInventory(){
  const search=document.getElementById("search");
  const list=document.getElementById("inventoryList");
  if(!search||!list) return;

  const q=String(search.value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  let rows=(Array.isArray(db.products)?db.products:[]).filter(p=>{
    const hay=`${p.name||""} ${p.category||""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    if(q && !hay.includes(q)) return false;
    if(inventoryCategory!=="Todas" && String(p.category||"").trim().toLowerCase()!==inventoryCategory.toLowerCase()) return false;
    if(inventoryStatusFilter!=="Todos" && inventoryStockState(p).key!==inventoryStatusFilter) return false;
    return true;
  });

  if(inventorySort==="name-asc") rows.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"es"));
  if(inventorySort==="name-desc") rows.sort((a,b)=>String(b.name||"").localeCompare(String(a.name||""),"es"));
  if(inventorySort==="stock-desc") rows.sort((a,b)=>(+b.stock||0)-(+a.stock||0));
  if(inventorySort==="stock-asc") rows.sort((a,b)=>(+a.stock||0)-(+b.stock||0));

  const stats=inventoryStats();
  const low=stats.lowStock;
  const zero=stats.zeroStock;
  const controls=document.getElementById("inventoryControls") || document.createElement("div");
  controls.id="inventoryControls";
  if(!controls.parentElement) search.insertAdjacentElement("afterend",controls);

  controls.innerHTML=`
    <div class="stageb-toolbar">
      <div class="stageb-filter-group">
        <label>Estado</label>
        <select id="inventoryStatus" class="stageb-select">
          ${["Todos","Disponible","Stock bajo","Agotado"].map(v=>`<option value="${esc(v)}" ${inventoryStatusFilter===v?"selected":""}>${v==="Todos"?"📋 Todos":v==="Disponible"?"🟢 Disponible":v==="Stock bajo"?"🟠 Stock bajo":"🔴 Agotado"}</option>`).join("")}
        </select>
      </div>
      <div class="stageb-filter-group">
        <label>Categoría</label>
        <select id="inventoryCategory" class="stageb-select">
          <option value="Todas">📂 Todas</option>
          ${inventoryCategories().map(c=>`<option value="${esc(c)}" ${c.toLowerCase()===inventoryCategory.toLowerCase()?"selected":""}>${esc(c)}</option>`).join("")}
        </select>
      </div>
      <div class="stageb-filter-group">
        <label>Ordenar</label>
        <select id="inventorySort" class="stageb-select">
          <option value="name-asc" ${inventorySort==="name-asc"?"selected":""}>🔤 A-Z</option>
          <option value="name-desc" ${inventorySort==="name-desc"?"selected":""}>🔤 Z-A</option>
          <option value="stock-desc" ${inventorySort==="stock-desc"?"selected":""}>📈 Mayor stock</option>
          <option value="stock-asc" ${inventorySort==="stock-asc"?"selected":""}>📉 Menor stock</option>
        </select>
      </div>
    </div>
    <div class="stageb-inventory-summary">
      <span><b>${rows.length}</b> mostrados de ${db.products.length}</span>
      <span>🟠 ${low} bajo</span>
      <span>🔴 ${zero} agotados</span>
      <span>💰 ${money(stats.saleValue)} en stock</span>
    </div>`;

  document.getElementById("inventoryStatus").onchange=e=>setInventoryStatusFilter(e.target.value);
  document.getElementById("inventoryCategory").onchange=e=>setInventoryCategory(e.target.value);
  document.getElementById("inventorySort").onchange=e=>setInventorySort(e.target.value);

  list.innerHTML=rows.length?rows.map(product=>{
    const state=inventoryStockState(product);
    const idx=db.products.indexOf(product);
    const margin=(+product.price||0)-(+product.cost||0);
    return `<article class="stageb-product-card">
      <button type="button" class="stageb-product-main" onclick="editProduct(${idx})">
        <div class="stageb-product-title-row"><div><b>${esc(product.name||"Sin nombre")}</b><small>${esc(product.category||"Sin categoría")}</small></div><span class="stageb-status ${state.cls}">${state.icon} ${state.key}</span></div>
        <div class="stageb-product-metrics">
          <span><small>Stock</small><b>${+product.stock||0}</b></span>
          <span><small>Venta</small><b>${money(product.price)}</b></span>
          <span><small>Ganancia/u</small><b>${money(margin)}</b></span>
        </div>
      </button>
      <div class="stageb-product-actions"><button type="button" onclick="editProduct(${idx})">✏️ Editar</button></div>
    </article>`;
  }).join(""):`<div class="empty"><b>No encontramos productos</b><div class="muted">Prueba otro término o cambia los filtros.</div></div>`;
}

function renderSales(){
  const list=document.getElementById("salesList");
  const search=document.getElementById("salesSearch");
  if(!list) return;
  const sales=Array.isArray(db.sales)?db.sales:[];
  const q=String(search?.value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const filtered=sales.filter(sale=>{
    const items=Array.isArray(sale.items)?sale.items.map(i=>i.product||"").join(" "):(sale.product||"");
    const hay=[sale.id,sale.client,sale.phone,sale.date,sale.pay,sale.status,items].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    if(q&&!hay.includes(q)) return false;
    if(salesStatusFilter!=="Todos" && String(sale.status||"Pagada")!==salesStatusFilter) return false;
    if(salesPaymentFilter!=="Todos" && String(sale.pay||"")!==salesPaymentFilter) return false;
    if(!salesPeriodMatch(sale)) return false;
    return true;
  });

  const controls=document.getElementById("salesControls");
  if(controls){
    const pays=[...new Set(sales.map(s=>String(s.pay||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    controls.innerHTML=`<div class="stageb-toolbar">
      <div class="stageb-filter-group"><label>Periodo</label><select class="stageb-select" onchange="setSalesPeriodFilter(this.value)"><option>Todos</option><option ${salesPeriodFilter==="Hoy"?"selected":""}>Hoy</option><option ${salesPeriodFilter==="7 días"?"selected":""}>7 días</option><option ${salesPeriodFilter==="30 días"?"selected":""}>30 días</option></select></div>
      <div class="stageb-filter-group"><label>Estado</label><select class="stageb-select" onchange="setSalesStatusFilter(this.value)"><option>Todos</option><option ${salesStatusFilter==="Pagada"?"selected":""}>Pagada</option><option ${salesStatusFilter==="Abono"?"selected":""}>Abono</option><option ${salesStatusFilter==="Pendiente"?"selected":""}>Pendiente</option></select></div>
      <div class="stageb-filter-group"><label>Pago</label><select class="stageb-select" onchange="setSalesPaymentFilter(this.value)"><option>Todos</option>${pays.map(v=>`<option value="${esc(v)}" ${salesPaymentFilter===v?"selected":""}>${esc(v)}</option>`).join("")}</select></div>
    </div>`;
  }

  const total=filtered.reduce((sum,s)=>sum+(+s.total||0),0);
  const received=filtered.reduce((sum,s)=>sum+salePaid(s),0);
  const pending=filtered.reduce((sum,s)=>sum+Math.max(0,(+s.total||0)-salePaid(s)),0);
  const summary=document.getElementById("salesSummary");
  if(summary) summary.innerHTML=`<div class="stageb-sales-kpi"><span><small>Ventas</small><b>${filtered.length}</b></span><span><small>Total</small><b>${money(total)}</b></span><span><small>Recibido</small><b>${money(received)}</b></span><span><small>Por cobrar</small><b>${money(pending)}</b></span></div>`;

  if(!sales.length){list.innerHTML=`<div class="empty"><b>No hay ventas registradas</b><div class="muted">Las nuevas ventas aparecerán aquí.</div></div>`;return;}
  if(!filtered.length){list.innerHTML=`<div class="empty"><b>No encontramos ventas</b><div class="muted">Prueba otros filtros o limpia la búsqueda.</div></div>`;return;}

  const groups={};
  filtered.forEach(s=>{const key=dateKey(s.date);(groups[key] ||= []).push(s);});
  const keys=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
  list.innerHTML=keys.map((key,gi)=>{
    const group=groups[key].slice().reverse();
    const groupTotal=group.reduce((sum,s)=>sum+(+s.total||0),0);
    return `<div class="date-group stageb-date-group">
      <button class="date-group-head" type="button" onclick="toggleDateGroup(this)"><span><b>${esc(dateLabel(key))}</b><small>${group.length} ${group.length===1?"venta":"ventas"} · ${money(groupTotal)}</small></span><span class="date-chevron">${gi===0?"▲":"▼"}</span></button>
      <div class="date-group-body ${gi===0?"open":""}">${group.map(sale=>{
        const idx=db.sales.indexOf(sale); const status=sale.status||"Pagada"; const paid=salePaid(sale); const due=Math.max(0,(+sale.total||0)-paid);
        const itemText=Array.isArray(sale.items)&&sale.items.length?sale.items.map(i=>`${esc(i.product||"Producto")} × ${i.qty||0}`).join(" · "):`${esc(sale.product||"Producto")} × ${sale.qty||0}`;
        return `<article class="stageb-sale-card">
          <div class="stageb-sale-info"><div class="stageb-sale-top"><div><b>${esc(sale.client||"Sin cliente")}</b><small>${esc(sale.id||"")} · ${esc(sale.pay||"")}</small></div><span class="stageb-status ${saleStatusClass(status)}">${status==="Pagada"?"🟢":"🟠"} ${esc(status)}</span></div><p>${itemText}</p><div class="stageb-sale-bottom"><span>${esc(sale.date||"")}</span>${due>0?`<strong>Por cobrar ${money(due)}</strong>`:`<strong>Recibido ${money(paid)}</strong>`}</div></div>
          <div class="stageb-sale-side"><b>${money(sale.total)}</b><button type="button" onclick="openReceipt(${idx})">🧾 Ver comprobante</button><button type="button" class="danger-text" onclick="deleteSale(${idx})">🗑️ Eliminar</button></div>
        </article>`;
      }).join("")}</div></div>`;
  }).join("");
}


/* =========================================================
   ETAPA D — HERRAMIENTAS Y CONTROL PROFESIONAL
   Cotizador, encargos, movimientos, respaldo y resumen.
   Sin cambios de estructura Firebase.
   ========================================================= */

let movesSearch = "";
let movesTypeFilter = "Todos";

function setupStageDUI(){
  const search = document.getElementById("movesSearch");
  const type = document.getElementById("movesTypeFilter");
  if(search){
    search.value = movesSearch;
    search.oninput = function(){ movesSearch=this.value; renderMoves(); };
  }
  if(type){
    type.value = movesTypeFilter;
    type.onchange = function(){ movesTypeFilter=this.value; renderMoves(); };
  }
  renderMore();
  renderMoves();
}

function clearMovesSearch(){
  movesSearch="";
  const el=document.getElementById("movesSearch");
  if(el){el.value="";renderMoves();el.focus();}
}

function renderMoves(){
  const list=document.getElementById("movesList");
  const summary=document.getElementById("movesSummary");
  if(!list) return;
  const q=String(movesSearch||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const rows=(Array.isArray(db.moves)?db.moves:[]).map((move,index)=>({move,index})).filter(({move})=>{
    const type=String(move.type||"");
    if(movesTypeFilter!=="Todos" && type!==movesTypeFilter) return false;
    if(!q) return true;
    const hay=`${move.product||""} ${move.reason||""} ${move.responsible||""} ${move.date||""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return hay.includes(q);
  }).reverse();
  const entries=Array.isArray(db.moves)?db.moves:[];
  const entradas=entries.filter(m=>String(m.type||"")==="Entrada").reduce((s,m)=>s+(+m.qty||0),0);
  const salidas=entries.filter(m=>String(m.type||"")==="Salida").reduce((s,m)=>s+(+m.qty||0),0);
  summary.innerHTML=`<span>Movimientos <b>${entries.length}</b></span><span>🟢 Entradas <b>${entradas}</b></span><span>🔴 Salidas <b>${salidas}</b></span><span>Mostrando <b>${rows.length}</b></span>`;
  list.innerHTML=rows.length ? rows.map(({move,index})=>`<div class="item stage-d-move-item"><div><b>${esc(move.product||"Producto")}</b><div class="muted">${move.source==="Venta"?"Venta automática":esc(move.reason||"Sin motivo")} · ${esc(move.responsible||"Sin responsable")} · ${esc(move.date||"")}</div></div><span class="badge ${String(move.type||"")==="Salida"?"low":""}">${String(move.type||"Entrada")==="Salida"?"🔴":"🟢"} ${esc(move.type||"")} ${esc(move.qty||0)}</span></div>`).join(""):`<div class="empty">${entries.length?"No hay movimientos que coincidan con el filtro.":"No hay movimientos registrados."}</div>`;
}

function renderMore(){
  const overview=document.getElementById("moreOverview");
  if(!overview) return;
  const lastBackup = (()=>{try{return localStorage.getItem("aquariumFishLastBackup")}catch(_){return null}})();
  const backupText=lastBackup ? new Date(lastBackup).toLocaleString("es-CO") : "Aún no registrado en este dispositivo";
  const activeOrders=(db.orders||[]).filter(o=>!['Entregado','Cancelado'].includes(String(o.status||'Pendiente'))).length;
  const pendingQuotes=(db.quotes||[]).filter(q=>!q.convertedSaleId && !['Rechazada','Cancelada'].includes(String(q.status||''))).length;
  const pendingReceivable=typeof calculateReceivable==='function'?calculateReceivable():0;
  overview.innerHTML=`<div class="more-status-grid"><div><span>👥 Clientes</span><b>${db.customers.length}</b></div><div><span>📝 Encargos activos</span><b>${activeOrders}</b></div><div><span>🧾 Cotizaciones activas</span><b>${pendingQuotes}</b></div><div><span>💳 Por cobrar</span><b>${money(pendingReceivable)}</b></div></div><div class="more-backup-line">💾 Último respaldo descargado: <b>${esc(backupText)}</b></div>`;
  const count=document.getElementById("moreCustomersCount");
  if(count) count.textContent=String(db.customers.length);
}

function showBackupCenter(){
  const panel=document.getElementById("moreBackupPanel");
  if(!panel) return;
  const last=(()=>{try{return localStorage.getItem("aquariumFishLastBackup")}catch(_){return null}})();
  panel.style.display="block";
  panel.innerHTML=`<div class="more-backup-head"><div><h2>💾 Centro de respaldo</h2><p class="muted">Protege tus datos antes de restaurar o cambiar información.</p></div><button type="button" onclick="document.getElementById('moreBackupPanel').style.display='none'">×</button></div><div class="more-backup-actions"><button class="primary" type="button" onclick="exportData()">⬇️ Descargar respaldo</button><button type="button" onclick="document.getElementById('importFile').click()">⬆️ Restaurar respaldo</button></div><p class="muted">Registros actuales: <b>${Object.values(db).reduce((s,v)=>s+(Array.isArray(v)?v.length:0),0)}</b> · Último respaldo desde este dispositivo: <b>${last?new Date(last).toLocaleString('es-CO'):"no registrado"}</b></p><div class="more-safety-note">🛡️ Al restaurar, la aplicación descarga primero una copia de los datos actuales. Los respaldos antiguos de Aquarium Fish siguen siendo compatibles.</div>`;
  panel.scrollIntoView({behavior:"smooth",block:"nearest"});
}
