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



function customerCommercialHistory(index){
  const customer=db.customers[index];
  if(!customer){ alert("No se encontró el cliente."); return; }
  const name=String(customer.name||"").trim();
  const phone=String(customer.phone||"").trim();
  const stats=customerStats(name);
  const quotes=(Array.isArray(db.quotes)?db.quotes:[]).filter(q=>{
    const qName=String(q.customer||"").trim().toLowerCase();
    const qPhone=String(q.phone||"").replace(/\D/g,"");
    const cPhone=phone.replace(/\D/g,"");
    return (qName && qName===name.toLowerCase()) || (cPhone && qPhone && cPhone===qPhone);
  }).sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
  const sales=(stats.sales||[]).slice().sort((a,b)=>String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||"")));
  const quoteRows=quotes.length?quotes.map(q=>`<div class="item" style="margin-bottom:6px"><div style="flex:1"><b>${esc(q.id||"")}</b><div class="muted">${esc(q.status||"Pendiente")} · ${q.createdAt?esc(new Date(q.createdAt).toLocaleDateString("es-CO")):""}</div></div><div class="right"><b>${money(q.total||0)}</b><div style="display:flex;gap:5px;margin-top:4px"><button type="button" onclick="closeModal();viewQuote('${esc(String(q.id))}')">👁️</button>${!q.convertedSaleId?`<button type="button" onclick="closeModal();openQuoteStatus('${esc(String(q.id))}')">Estado</button>`:""}</div></div></div>`).join(""):"<div class=\"empty\">No hay cotizaciones de este cliente.</div>";
  const saleRows=sales.length?sales.slice(0,12).map(s=>`<div class="item" style="margin-bottom:6px"><div style="flex:1"><b>${esc(saleLabel(s))}</b><div class="muted">${esc(s.date||s.createdAt||"")} · ${esc(s.status||"Pagada")}</div></div><div class="right"><b>${money(s.total||0)}</b></div></div>`).join(""):"<div class=\"empty\">No hay ventas registradas.</div>";
  modal(`👤 Historial — ${esc(name)}`,`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div class="item"><div><b>Comprado</b><div class="muted">Total</div></div><strong>${money(stats.bought)}</strong></div>
      <div class="item"><div><b>Pagado</b><div class="muted">Total</div></div><strong>${money(stats.paid)}</strong></div>
      <div class="item"><div><b>Saldo</b><div class="muted">Pendiente</div></div><strong>${money(stats.balance)}</strong></div>
    </div>
    <h3 style="margin:12px 0 8px">🧾 Cotizaciones (${quotes.length})</h3>${quoteRows}
    <h3 style="margin:16px 0 8px">💰 Ventas (${sales.length})</h3>${saleRows}
    <div style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" onclick="closeModal()">Cerrar</button></div>
  `,null);
}

function openQuoteStatus(quoteId){
  const q=findQuoteById(quoteId);
  if(!q){alert("No se encontró la cotización.");return;}
  if(q.convertedSaleId){alert("Esta cotización ya está convertida en venta.");return;}
  const statuses=["Pendiente","Enviada","En negociación","Aprobada","Rechazada","Cancelada"];
  modal("📌 Estado de cotización",`
    <p><strong>${esc(q.id)}</strong> · ${esc(q.customer||"Cliente general")}</p>
    <label>Estado<select id="quoteStatusInput" class="search" style="width:100%;box-sizing:border-box;margin-top:6px">${statuses.map(st=>`<option value="${esc(st)}" ${String(q.status||"Pendiente")===st?"selected":""}>${esc(st)}</option>`).join("")}</select></label>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" onclick="closeModal()">Cancelar</button><button type="button" class="primary" onclick="saveQuoteStatus('${esc(String(q.id))}')">💾 Guardar</button></div>
  `,null);
}
function saveQuoteStatus(quoteId){
  const q=findQuoteById(quoteId); if(!q)return;
  const value=String(document.getElementById("quoteStatusInput")?.value||"Pendiente");
  q.status=value; q.updatedAt=now(); save(); closeModal(); renderCotizador();
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
                      onclick="event.stopPropagation();customerCommercialHistory(${index})"
                    >
                      📊 Historial
                    </button>

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



