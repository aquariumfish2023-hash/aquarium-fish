from pathlib import Path
p=Path('/mnt/data/stagee/app.js')
s=p.read_text(encoding='utf-8')
start=s.index('function renderHome() {')
end=s.index('\n\n/* =========================================================\n   INVENTARIO', start)
new=r'''function renderHome() {
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
  set('dashboardNetToday',money(netToday)); set('dashboardInventoryValue',money(inventoryCost)); set('dashboardUnits',inventoryUnits);
  set('lowStock',low.length); set('customerCount',customers.length); set('pendingQuotesCount',pendingQuotes.length);
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
}'''
p.write_text(s[:start]+new+s[end:],encoding='utf-8')
