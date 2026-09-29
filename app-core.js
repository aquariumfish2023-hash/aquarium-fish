const KEY = "aquarium_fish_data_v5";

/* =========================================================
   ARRANQUE SEGURO Y AISLADO POR USUARIO
   La aplicación NO carga datos locales compartidos antes de
   conocer la cuenta autenticada. Firebase selecciona después
   la clave local exclusiva del UID.
   ========================================================= */
function readStoredObject(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : null;
  }catch(error){
    console.warn("No se pudo leer el almacenamiento local:", key, error);
    return null;
  }
}

const EMPTY_DB = {
  products: [], sales: [], moves: [], customers: [],
  orders: [], cash: [], quotes: []
};

// Importante: no recuperar aquí v1-v5 ni una clave compartida.
// El módulo de autenticación/sincronización cargará los datos del UID.
let db = normalizeLocalDB(EMPTY_DB);

function normalizeLocalDB(data){
  const source = data && typeof data === "object" ? data : {};
  const result = {
    products: Array.isArray(source.products) ? source.products : [],
    sales: Array.isArray(source.sales) ? source.sales : [],
    moves: Array.isArray(source.moves) ? source.moves : [],
    customers: Array.isArray(source.customers) ? source.customers : [],
    orders: Array.isArray(source.orders) ? source.orders : [],
    cash: Array.isArray(source.cash) ? source.cash : [],
    quotes: Array.isArray(source.quotes) ? source.quotes : []
  };

  result.orders.forEach(order => {
    if(!order || typeof order !== "object") return;
    if(!order.status) order.status = "Pendiente";
    if(order.qty == null) order.qty = 1;
    if(order.price == null) order.price = 0;
    if(order.note == null) order.note = "";
  });

  result.quotes.forEach(quote => {
    if(!quote || typeof quote !== "object") return;
    if(!quote.id) quote.id = `COT-${String(result.quotes.indexOf(quote)+1).padStart(4,"0")}`;
    if(!quote.status) quote.status = "Pendiente";
    if(!Array.isArray(quote.items)) quote.items = [];
    if(quote.discount == null) quote.discount = 0;
  });

  result.customers.forEach(customer => {
    if(!Array.isArray(customer.payments)) customer.payments = [];
  });

  return result;
}

db = normalizeLocalDB(db);

if (typeof window !== "undefined") {
  Object.defineProperty(window, "db", {
    configurable: true,
    get: () => db
  });
}


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
  try{
    if (typeof window.aquariumPersistData === "function") {
      window.aquariumPersistData(db);
    } else {
      localStorage.setItem(KEY, JSON.stringify(db));
    }
    renderAll();
  }catch(error){
    console.error("Error guardando datos:", error);
    const status = document.getElementById("syncStatus");
    if(status) status.textContent = "⚠️ No se pudieron guardar los cambios.";
    throw error;
  }
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
  if(document.getElementById("availabilityPanel") && document.getElementById("availabilityPanel").style.display !== "none") renderAvailabilityList();

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
  const sales = Array.isArray(db.sales) ? db.sales : [];
  const products = Array.isArray(db.products) ? db.products : [];
  const customers = Array.isArray(db.customers) ? db.customers : [];
  const quotes = Array.isArray(db.quotes) ? db.quotes : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const cash = Array.isArray(db.cash) ? db.cash : [];
  const now = new Date();

  const dayRange = (offsetStart, offsetEnd = offsetStart) => {
    const a = new Date(now); a.setDate(a.getDate() - offsetStart); a.setHours(0,0,0,0);
    const b = new Date(now); b.setDate(b.getDate() - offsetEnd); b.setHours(23,59,59,999);
    return {start:a,end:b};
  };
  const inRange = (value, range) => {
    const d = parseLocalDate(value);
    return !!d && d >= range.start && d <= range.end;
  };
  const today = dayRange(0);
  const week = dayRange(0,6);
  const prevWeek = dayRange(7,13);
  const month = {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now)};
  month.start.setHours(0,0,0,0); month.end.setHours(23,59,59,999);
  const prevMonth = {start:new Date(now.getFullYear(),now.getMonth()-1,1),end:new Date(now.getFullYear(),now.getMonth(),0)};
  prevMonth.start.setHours(0,0,0,0); prevMonth.end.setHours(23,59,59,999);

  const salesIn = range => sales.filter(s => inRange(s.date || s.createdAt, range));
  const totalOf = rows => rows.reduce((sum,s) => sum + (+s.total || 0),0);
  const paidOf = rows => rows.reduce((sum,s) => sum + salePaid(s),0);
  const todaySales = salesIn(today), weekSales = salesIn(week), prevWeekSales = salesIn(prevWeek), monthSales = salesIn(month), prevMonthSales = salesIn(prevMonth);
  const todayTotal = totalOf(todaySales), weekTotal = totalOf(weekSales), prevWeekTotal = totalOf(prevWeekSales), monthTotal = totalOf(monthSales), prevMonthTotal = totalOf(prevMonthSales);
  const todayReceived = paidOf(todaySales);
  const saleProfit = sale => {
    if(Number.isFinite(Number(sale?.profit))) return Number(sale.profit)||0;
    return saleCost(sale) ? ((+sale.total||0) - saleCost(sale)) : 0;
  };
  const todayProfit = todaySales.reduce((sum,s) => sum + saleProfit(s), 0);
  const todayMargin = todayTotal > 0 ? (todayProfit / todayTotal) * 100 : 0;
  const receivable = sales.reduce((sum,s) => sum + Math.max(0,(+s.total||0)-salePaid(s)),0);
  const todayExpenses = cash.filter(m => String(m.type||'').toLowerCase()==='gasto' && inRange(m.date,today)).reduce((sum,m)=>sum+(+m.amount||0),0);
  const inventoryCost = products.reduce((sum,p)=>sum + Math.max(0,+p.stock||0)*(+p.cost||0),0);
  const inventorySale = products.reduce((sum,p)=>sum + Math.max(0,+p.stock||0)*(+p.price||0),0);
  const inventoryUnits = products.reduce((sum,p)=>sum + Math.max(0,+p.stock||0),0);
  const low = products.filter(p => (+p.stock||0) <= (+p.min||0));
  const zero = products.filter(p => (+p.stock||0) <= 0);
  const pendingQuotes = quotes.filter(q => !q.convertedSaleId && !['Rechazada','Cancelada'].includes(String(q.status||'')));
  const activeOrders = orders.filter(o => !['Entregado','Cancelado'].includes(String(o.status||'Pendiente')));
  const netToday = todayReceived - todayExpenses;

  const set = (id,value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
  set('salesTotal',money(totalOf(sales))); set('salesCount',`${sales.length} transacciones en total`);
  set('todaySalesTotal',money(todayTotal)); set('todaySalesCount',`${todaySales.length} venta${todaySales.length===1?'':'s'} hoy`);
  set('todayReceived',money(todayReceived)); set('dashboardReceivable',money(receivable)); set('todayExpenses',money(todayExpenses));
  set('dashboardNetToday',money(netToday)); set('dashboardProfitToday',money(todayProfit)); set('dashboardMarginToday',`margen estimado: ${todayMargin.toFixed(1)}%`); set('dashboardInventoryValue',money(inventoryCost)); set('dashboardUnits',inventoryUnits);
  set('lowStock',low.length); set('customerCount',customers.length); set('pendingQuotesCount',pendingQuotes.length); set('activeOrdersCount',activeOrders.length);
  set('dashboardWeekTotal',money(weekTotal)); set('dashboardWeekTotalCopy',money(weekTotal)); set('dashboardWeekCount',`${weekSales.length} venta${weekSales.length===1?'':'s'}`);
  set('dashboardMonthTotal',money(monthTotal)); set('dashboardMonthCount',`${monthSales.length} venta${monthSales.length===1?'':'s'}`);
  set('dashboardZeroStock',zero.length); set('dashboardInventorySaleValue',money(inventorySale));
  const dateEl=document.getElementById('dashboardDate'); if(dateEl) dateEl.textContent=now.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'});

  const pctChange = (current,previous) => previous ? ((current-previous)/previous)*100 : (current ? 100 : 0);
  const changeHtml = (current,previous) => { const p=pctChange(current,previous); return `${p>0?'↗':p<0?'↘':'→'} ${Math.abs(p).toFixed(0)}%`; };
  const changeClass = (current,previous) => current>previous?'positive':current<previous?'negative':'neutral';
  ['todaySalesChange','weekSalesChange','monthSalesChange'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    const pair=i===0?[todayTotal,prevWeekTotal]:i===1?[weekTotal,prevWeekTotal]:[monthTotal,prevMonthTotal];
    el.textContent=changeHtml(pair[0],pair[1]); el.className=`dashboard-change ${changeClass(pair[0],pair[1])}`;
  });

  const paymentEl=document.getElementById('dashboardPayments');
  if(paymentEl){
    const methods={}; todaySales.forEach(s=>{const k=String(s.pay||'Otro'); methods[k]=(methods[k]||0)+salePaid(s);});
    const rows=Object.entries(methods).sort((a,b)=>b[1]-a[1]);
    paymentEl.innerHTML=rows.length ? rows.map(([k,v])=>`<div class="item"><div><b>${esc(k)}</b></div><strong>${money(v)}</strong></div>`).join('') : '<div class="empty">No hay cobros registrados hoy.</div>';
  }

  const customerEl=document.getElementById('dashboardCustomers');
  if(customerEl){
    const map={}; sales.forEach(s=>{const k=String(s.client||'').trim(); if(!k)return; map[k]=(map[k]||0)+(+s.total||0);});
    const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    customerEl.innerHTML=rows.length ? rows.map(([k,v])=>`<div class="item"><div><b>${esc(k)}</b></div><strong>${money(v)}</strong></div>`).join('') : '<div class="empty">Aún no hay clientes con compras.</div>';
  }

  const invEl=document.getElementById('dashboardInventoryAlerts');
  if(invEl){
    const rows=low.slice().sort((a,b)=>(+a.stock||0)-(+b.stock||0)).slice(0,6);
    invEl.innerHTML=rows.length ? rows.map(p=>`<div class="item"><div><b>${esc(p.name||'Producto')}</b><small>${(+p.stock||0)<=0?'Agotado':`Stock ${+p.stock||0} · mínimo ${+p.min||0}`}</small></div><span class="badge ${(+p.stock||0)<=0?'low':''}">${(+p.stock||0)<=0?'🔴':'🟠'}</span></div>`).join('') : '<div class="empty">✅ No hay productos en alerta.</div>';
  }

  const chart=document.getElementById('dashboardSalesChart');
  if(chart){
    const days=[]; for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);const rows=sales.filter(s=>{const x=parseLocalDate(s.date||s.createdAt);return x && x.toISOString().slice(0,10)===key;});days.push({d,total:totalOf(rows)});}
    const max=Math.max(1,...days.map(x=>x.total));
    chart.innerHTML=days.map(x=>`<div class="dashboard-bar-col"><span>${money(x.total)}</span><div class="dashboard-bar-track"><div class="dashboard-bar" style="height:${Math.max(4,(x.total/max)*100)}%"></div></div><small>${x.d.toLocaleDateString('es-CO',{weekday:'short'}).replace('.','')}</small></div>`).join('');
  }

  const productChart=document.getElementById('dashboardProductChart');
  if(productChart){
    const map={}; weekSales.forEach(s=>{if(Array.isArray(s.items)) s.items.forEach(i=>{const k=String(i.product||'Producto');map[k]=(map[k]||0)+(+i.qty||0);}); else if(s.product){const k=String(s.product);map[k]=(map[k]||0)+(+s.qty||0);}});
    const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5); const max=Math.max(1,...rows.map(r=>r[1]));
    productChart.innerHTML=rows.length ? rows.map(([k,v])=>`<div class="dashboard-hbar-row"><div><b>${esc(k)}</b><span>${v} und.</span></div><div class="dashboard-hbar-track"><div class="dashboard-hbar" style="width:${(v/max)*100}%"></div></div></div>`).join('') : '<div class="empty">No hay ventas en los últimos 7 días.</div>';
  }

  const insights=document.getElementById('dashboardInsights');
  if(insights){
    const items=[];
    if(zero.length) items.push(`🔴 <b>${zero.length}</b> producto${zero.length===1?' está':'s están'} agotado${zero.length===1?'':'s'}.`);
    else if(low.length) items.push(`🟠 <b>${low.length}</b> producto${low.length===1?' necesita':'s necesitan'} revisar stock.`);
    if(todayProfit>0) items.push(`📈 Hoy llevas una ganancia estimada de <b>${money(todayProfit)}</b> sobre las ventas registradas.`);
    if(receivable>0) items.push(`💳 Hay <b>${money(receivable)}</b> pendiente por cobrar.`);
    if(pendingQuotes.length) items.push(`🧾 Tienes <b>${pendingQuotes.length}</b> cotización${pendingQuotes.length===1?' activa':'es activas'} para seguimiento.`);
    if(activeOrders.length) items.push(`📦 Hay <b>${activeOrders.length}</b> encargo${activeOrders.length===1?' activo':'s activos'} por gestionar.`);
    if(!items.length) items.push('✅ No hay alertas comerciales importantes en este momento.');
    insights.innerHTML=items.slice(0,5).map(t=>`<div class="dashboard-insight">${t}</div>`).join('');
  }

  const recentSales=document.getElementById('recentSales');
  if(recentSales){
    recentSales.innerHTML=sales.length ? sales.slice(-6).reverse().map(sale=>`<div class="item"><div><b>${esc(saleLabel(sale))}</b><div class="muted">${esc(sale.client||'Sin cliente')} · ${saleQty(sale)} und. · ${esc(sale.pay||'')}</div></div><div class="right"><strong>${money(sale.total)}</strong><small>${sale.status==='Pendiente'?'Pendiente de pago':sale.status==='Abono'?'Abono: '+money(salePaid(sale)):'Pagada'}</small></div></div>`).join('') : '<div class="empty">Todavía no hay ventas.</div>';
  }
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


