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
  if(typeof window.refreshSyncCenter === "function") window.refreshSyncCenter("Respaldo descargado correctamente.");
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
   BÚSQUEDAS
   ========================================================= */

function bindSearches(){
  const search=document.getElementById("search");
  if(search){
    search.oninput=function(){ renderInventory(); };
  }

  const salesSearch=document.getElementById("salesSearch");
  if(salesSearch){
    salesSearch.oninput=function(){ renderSales(); };
  }

  const customerSearch=document.getElementById("customerSearch");
  if(customerSearch){
    customerSearch.oninput=function(){ renderCustomers(); };
  }
}


/* =========================================================
   AJUSTE RESPONSIVO PARA CELULAR Y TABLET
   ========================================================= */

function applyMobileLayout(){
  if(document.getElementById("aquariumMobileLayout")) return;

  const style=document.createElement("style");
  style.id="aquariumMobileLayout";
  style.textContent=`
    @media (max-width: 700px){
      html, body{width:100%;max-width:100%;overflow-x:hidden;}
      main{width:100%;max-width:100%;box-sizing:border-box;}
      .screen,.panel,.item,.cards{max-width:100%;box-sizing:border-box;}
      .section-head{flex-wrap:wrap;}
      .cards{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}
      [style*="grid-template-columns"]{grid-template-columns:1fr !important;}
      input,select,textarea,button{max-width:100%;box-sizing:border-box;}
      .list{max-width:100%;overflow-x:hidden;}
      .item{min-width:0;flex-wrap:wrap;}
      nav{width:100%;max-width:100%;overflow-x:auto;box-sizing:border-box;}
    }
    @media (min-width: 701px) and (max-width: 1100px){
      main{max-width:100%;box-sizing:border-box;}
      .panel,.screen{max-width:100%;box-sizing:border-box;}
    }
  `;
  document.head.appendChild(style);
}


/* =========================================================
   HACER FUNCIONES GLOBALES
   IMPORTANTE PARA LOS onclick DEL HTML
   ========================================================= */
function exposeFunctions(){
  window.editQuote=editQuote;
  window.viewQuote=viewQuote;
  window.deleteQuote=deleteQuote;
  window.convertQuoteToSale=convertQuoteToSale;
  window.show=show;
  window.openProduct=openProduct;
  window.editProduct=editProduct;
  window.deleteProduct=deleteProduct;
  window.openSale=openSale;
  window.deleteSale=deleteSale;
  window.addSaleRow=addSaleRow;
  window.updateSalePreview=updateSalePreview;
  window.openCustomer=openCustomer;
  window.editCustomer=editCustomer;
  window.deleteCustomer=deleteCustomer;
  window.openOrder=openOrder;
  window.editOrder=editOrder;
  window.deleteOrder=deleteOrder;
  window.toggleOrder=toggleOrder;
  window.advanceOrderStatus=advanceOrderStatus;
  window.openMove=openMove;
  window.toggleDateGroup=toggleDateGroup;
  window.closeModal=closeModal;
  window.openInternal=openInternal;
  window.closeInternal=closeInternal;
  window.exportData=exportData;
  window.importData=importData;
  window.toggleAvailabilityList=toggleAvailabilityList;
  window.renderAvailabilityList=renderAvailabilityList;
  window.shareAvailabilityWhatsApp=shareAvailabilityWhatsApp;
  window.printAvailabilityList=printAvailabilityList;
  window.copyAvailabilityList=copyAvailabilityList;
  window.setInventoryCategory=setInventoryCategory;
  window.setInventorySort=setInventorySort;
  window.openCashMovement=openCashMovement;
  window.editCashMovement=editCashMovement;
  window.deleteCashMovement=deleteCashMovement;
  window.setCashPeriod=setCashPeriod;
  window.addQuoteItem=addQuoteItem;
  window.updateQuoteItem=updateQuoteItem;
  window.removeQuoteItem=removeQuoteItem;
  window.clearQuote=clearQuote;
  window.copyQuote=copyQuote;
  window.shareQuoteWhatsApp=shareQuoteWhatsApp;
  window.saveQuote=saveQuote;
  window.openReceipt=openReceipt;

  // Etapa B: filtros y acciones dinámicas
  window.clearInventorySearch=clearInventorySearch;
  window.clearSalesSearch=clearSalesSearch;
  window.setInventoryStatusFilter=setInventoryStatusFilter;
  window.setSalesStatusFilter=setSalesStatusFilter;
  window.setSalesPeriodFilter=setSalesPeriodFilter;
  window.setSalesPaymentFilter=setSalesPaymentFilter;

  // Etapa D: movimientos, respaldo y herramientas
  window.clearMovesSearch=clearMovesSearch;
  window.showBackupCenter=showBackupCenter;
  window.setupStageDUI=setupStageDUI;
  window.renderMoves=renderMoves;
  window.renderMore=renderMore;
  window.applyMobileLayout=applyMobileLayout;
  window.runSystemAudit=runSystemAudit;
}

/* =========================================================
   NAVEGACIÓN PRINCIPAL REORGANIZADA
   ========================================================= */
function applyMainNavigationLayout(){
  if(document.getElementById("aquariumMainNavLayout")) return;
  const style=document.createElement("style");
  style.id="aquariumMainNavLayout";
  style.textContent=`#more .panel{transition:transform .15s ease,box-shadow .15s ease}#more .panel:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.08)}@media(max-width:700px){#more .cards{grid-template-columns:1fr !important}}`;
  document.head.appendChild(style);
}

/* =========================================================
   INICIAR APLICACIÓN
   ========================================================= */

function iniciarApp() {

  applyMobileLayout();
  applyMainNavigationLayout();

  exposeFunctions();

  setupReportsUI();

  setupCotizadorUI();

  setupStageDUI();

  bindNavigation();

  bindSearches();

  renderAll();
  setTimeout(()=>{ if(typeof runSystemAudit==="function") runSystemAudit(); }, 250);
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
   ETAPA G — LISTA COMERCIAL DE DISPONIBILIDAD
   Usa el inventario existente. No modifica stock, precios,
   Firebase ni la estructura de datos.
   ========================================================= */

let availabilityCategory = "Todas";
let availabilityShowStock = false;

function availabilityProducts(){
  const products = Array.isArray(db.products) ? db.products : [];
  const selected = String(availabilityCategory || "Todas").trim();
  return products
    .filter(product => {
      const stock = Math.max(0, +product.stock || 0);
      if(stock <= 0) return false;
      if(selected !== "Todas" && String(product.category || "").trim().toLowerCase() !== selected.toLowerCase()) return false;
      return true;
    })
    .slice()
    .sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""), "es", {sensitivity:"base"}));
}

function availabilityLabel(){
  return availabilityCategory === "Todas" ? "Productos disponibles" : `${availabilityCategory} disponibles`;
}

function availabilityMessage(){
  const rows = availabilityProducts();
  const date = new Date().toLocaleDateString("es-CO", {day:"2-digit", month:"2-digit", year:"numeric"});
  const lines = [
    "🐠 AQUARIUM FISH",
    `📋 ${availabilityLabel()}`,
    `📅 Actualizado: ${date}`,
    ""
  ];
  if(!rows.length){
    lines.push("En este momento no hay productos disponibles en esta categoría.");
  }else{
    rows.forEach(product => {
      const name = String(product.name || "Producto").trim();
      const stock = Math.max(0, +product.stock || 0);
      lines.push(availabilityShowStock ? `• ${name} — ${stock} disponible${stock === 1 ? "" : "s"}` : `• ${name}`);
    });
  }
  lines.push("", "*Consulta disponibilidad antes de realizar tu pedido.*");
  return lines.join("\n");
}

function toggleAvailabilityList(){
  const panel = document.getElementById("availabilityPanel");
  if(!panel) return;
  const open = panel.style.display !== "none";
  panel.style.display = open ? "none" : "block";
  if(!open){
    renderAvailabilityList();
    panel.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
}

function renderAvailabilityList(){
  const panel = document.getElementById("availabilityPanel");
  if(!panel) return;
  const categories = inventoryCategories();
  if(availabilityCategory !== "Todas" && !categories.some(c => c.toLowerCase() === availabilityCategory.toLowerCase())){
    availabilityCategory = "Todas";
  }
  const rows = availabilityProducts();
  const date = new Date().toLocaleDateString("es-CO", {day:"2-digit", month:"2-digit", year:"numeric"});
  panel.innerHTML = `
    <div class="availability-head">
      <div>
        <span class="page-kicker">LISTADO COMERCIAL</span>
        <h2>📋 Lista para clientes</h2>
        <p class="muted">Genera en segundos una lista usando únicamente productos con stock.</p>
      </div>
      <button type="button" class="availability-close" onclick="toggleAvailabilityList()" aria-label="Cerrar lista">×</button>
    </div>

    <div class="availability-controls">
      <label>
        Categoría
        <select id="availabilityCategory" class="search">
          <option value="Todas">📂 Todas las categorías</option>
          ${categories.map(category => `<option value="${esc(category)}" ${category.toLowerCase() === availabilityCategory.toLowerCase() ? "selected" : ""}>${esc(category)}</option>`).join("")}
        </select>
      </label>
      <label class="availability-check">
        <input id="availabilityShowStock" type="checkbox" ${availabilityShowStock ? "checked" : ""}>
        <span>Mostrar cantidades</span>
      </label>
    </div>

    <div class="availability-preview">
      <div class="availability-preview-head">
        <div>
          <b>🐠 AQUARIUM FISH</b>
          <h3>${esc(availabilityLabel())}</h3>
          <small>Actualizado: ${date}</small>
        </div>
        <span class="badge">${rows.length} ${rows.length === 1 ? "producto" : "productos"}</span>
      </div>
      <div class="availability-items">
        ${rows.length ? rows.map(product => {
          const stock = Math.max(0, +product.stock || 0);
          return `<div class="availability-item"><span>• ${esc(product.name || "Producto")}</span>${availabilityShowStock ? `<b>${stock}</b>` : ""}</div>`;
        }).join("") : `<div class="empty"><b>No hay productos disponibles</b><div class="muted">Prueba otra categoría o revisa el stock del inventario.</div></div>`}
      </div>
      <div class="availability-note">*Consulta disponibilidad antes de realizar tu pedido.*</div>
    </div>

    <div class="availability-actions">
      <button type="button" class="primary" onclick="shareAvailabilityWhatsApp()">📲 WhatsApp</button>
      <button type="button" onclick="printAvailabilityList()">🖨️ Imprimir / PDF</button>
      <button type="button" onclick="copyAvailabilityList()">📋 Copiar lista</button>
    </div>
  `;
  const category = document.getElementById("availabilityCategory");
  if(category) category.onchange = function(){ availabilityCategory = this.value; renderAvailabilityList(); };
  const showStock = document.getElementById("availabilityShowStock");
  if(showStock) showStock.onchange = function(){ availabilityShowStock = this.checked; renderAvailabilityList(); };
}

function shareAvailabilityWhatsApp(){
  const text = availabilityMessage();
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function copyAvailabilityList(){
  const text = availabilityMessage();
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(() => alert("Lista copiada. Ya puedes pegarla en WhatsApp u otro chat.")).catch(() => alert(text));
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  try{ document.execCommand("copy"); alert("Lista copiada. Ya puedes pegarla en WhatsApp u otro chat."); }
  catch(_){ alert(text); }
  area.remove();
}

function printAvailabilityList(){
  const rows = availabilityProducts();
  const date = new Date().toLocaleDateString("es-CO", {day:"2-digit", month:"2-digit", year:"numeric"});
  const items = rows.length ? rows.map(product => {
    const stock = Math.max(0, +product.stock || 0);
    return `<li><span>${esc(product.name || "Producto")}</span>${availabilityShowStock ? `<strong>${stock}</strong>` : ""}</li>`;
  }).join("") : `<li><span>No hay productos disponibles en esta categoría.</span></li>`;
  const title = esc(availabilityLabel());
  const popup = window.open("", "_blank", "width=700,height=850");
  if(!popup){ alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio e inténtalo de nuevo."); return; }
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title} · Aquarium Fish</title><style>
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:34px;color:#17313a;background:#fff}main{max-width:680px;margin:auto;border:1px solid #d9e6e9;border-radius:18px;padding:28px}h1{margin:4px 0 6px;font-size:27px}p{color:#60777d;margin:0 0 22px}.brand{font-size:13px;font-weight:800;letter-spacing:.08em}.date{font-size:12px;color:#71858a}.list{margin:20px 0;border-top:1px solid #d9e6e9}li{list-style:none;display:flex;justify-content:space-between;gap:15px;padding:12px 4px;border-bottom:1px solid #e8eff0;font-size:16px}.note{margin-top:22px;padding:12px;border-radius:10px;background:#f3f8f9;color:#587077;font-size:12px}@media print{body{padding:0}main{border:0;max-width:none;padding:18px}}
  </style></head><body><main><div class="brand">🐠 AQUARIUM FISH</div><h1>${title}</h1><p>Listado de productos disponibles · ${date}</p><ul class="list">${items}</ul><div class="note">Consulta disponibilidad antes de realizar tu pedido.</div></main><script>window.onload=function(){setTimeout(function(){window.print();},250)};<\/script></body></html>`);
  popup.document.close();
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


/* =========================================================
   ETAPA 5 — INVENTARIO INTELIGENTE
   Lectura de rotación, alertas y valor del stock.
   No modifica la estructura de Firebase.
   ========================================================= */

function inventorySmartAnalysis(){
  const products = Array.isArray(db.products) ? db.products : [];
  const moves = Array.isArray(db.moves) ? db.moves : [];
  const outbound = {};
  const inbound = {};

  moves.forEach(move=>{
    const name=String(move?.product||"").trim();
    const qty=Math.max(0,+move?.qty||0);
    if(!name || !qty) return;
    const type=String(move?.type||"").toLowerCase();
    if(type.includes("salida")) outbound[name]=(outbound[name]||0)+qty;
    if(type.includes("entrada")) inbound[name]=(inbound[name]||0)+qty;
  });

  const ranked=products.map(product=>({
    product,
    sold:outbound[String(product.name||"").trim()]||0,
    entered:inbound[String(product.name||"").trim()]||0
  })).sort((a,b)=>b.sold-a.sold);

  const low=products.filter(p=>inventoryStockState(p).key==="Stock bajo").length;
  const zero=products.filter(p=>inventoryStockState(p).key==="Agotado").length;
  const saleValue=products.reduce((sum,p)=>sum+Math.max(0,+p.stock||0)*(+p.price||0),0);
  const costValue=products.reduce((sum,p)=>sum+Math.max(0,+p.stock||0)*(+p.cost||0),0);
  const totalOutbound=Object.values(outbound).reduce((a,b)=>a+b,0);

  return {products,ranked,low,zero,saleValue,costValue,totalOutbound};
}

function inventorySmartHtml(){
  const a=inventorySmartAnalysis();
  const top=a.ranked.filter(x=>x.sold>0).slice(0,3);
  const topText=top.length
    ? top.map((x,i)=>`${i+1}. ${esc(x.product.name||"Producto")} · ${x.sold} salidas`).join("<br>")
    : "Aún no hay movimientos de salida registrados.";
  return `<div class="stage5-inventory-panel">
    <div class="stage5-head"><div><span class="page-kicker">CONTROL INTELIGENTE</span><b>📦 Inventario</b><small>Lectura rápida para saber qué necesita atención.</small></div></div>
    <div class="stage5-kpis">
      <button type="button" onclick="setInventoryStatusFilter('Stock bajo')"><b>${a.low}</b><small>🟠 Stock bajo</small></button>
      <button type="button" onclick="setInventoryStatusFilter('Agotado')"><b>${a.zero}</b><small>🔴 Agotados</small></button>
      <div><b>${money(a.costValue)}</b><small>💰 Valor compra</small></div>
      <div><b>${money(a.saleValue)}</b><small>🏷️ Valor venta</small></div>
    </div>
    <div class="stage5-rotation"><div><b>📈 Mayor movimiento</b><small>${topText}</small></div><div><b>${a.totalOutbound}</b><small>unidades con salida registrada</small></div></div>
  </div>`;
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

  controls.innerHTML=inventorySmartHtml()+`
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

function runSystemAudit(){
  const out=document.getElementById("stageFAudit");
  const time=document.getElementById("stageFAuditTime");
  if(!out) return;
  const checks=[];
  const add=(label,ok,detail)=>checks.push({label,ok,detail});
  const requiredFunctions=["show","save","renderAll","renderHome","renderInventory","renderSales","renderCash","renderCustomers","renderOrders","renderMoves","renderReports","exportData","importData","applyMobileLayout","exposeFunctions","bindSearches"];
  const missing=requiredFunctions.filter(name=>typeof window[name]!=="function");
  add("Funciones principales",missing.length===0,missing.length?`Faltan: ${missing.join(", ")}`:"Todas las funciones críticas están disponibles.");
  const ids=["home","inventory","sales","cash","customers","cotizador","orders","moves","reports","more","modal","form","importFile"];
  const missingIds=ids.filter(id=>!document.getElementById(id));
  add("Pantallas y controles",missingIds.length===0,missingIds.length?`Elementos faltantes: ${missingIds.join(", ")}`:"Pantallas y controles principales presentes.");
  const collections=["products","sales","customers","quotes","orders","moves","cash"];
  const badData=collections.filter(k=>!Array.isArray(db[k]));
  const records=collections.reduce((n,k)=>n+(Array.isArray(db[k])?db[k].length:0),0);
  add("Datos locales",badData.length===0,badData.length?`Colecciones inválidas: ${badData.join(", ")}`:`${records} registros disponibles.`);
  let storageOk=true;
  try{ const k="__af_stagef_test"; localStorage.setItem(k,"1"); localStorage.removeItem(k); }catch(_){ storageOk=false; }
  add("Almacenamiento",storageOk,storageOk?"El navegador permite guardar datos locales.":"El almacenamiento local no está disponible.");
  const swSupported="serviceWorker" in navigator;
  add("PWA",swSupported,swSupported?"El navegador soporta Service Worker.":"Este navegador no soporta Service Worker.");
  const authReady=typeof auth!=="undefined";
  add("Firebase",authReady,authReady?"La configuración de autenticación está disponible.":"No se detectó el objeto de autenticación.");
  out.innerHTML=checks.map(c=>`<div class="stagef-audit-item ${c.ok?"ok":"bad"}"><span class="stagef-audit-icon">${c.ok?"✓":"!"}</span><div><b>${esc(c.label)}</b><small>${esc(c.detail)}</small></div></div>`).join("");
  if(time) time.textContent=`Última revisión: ${new Date().toLocaleString("es-CO")}`;
}

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
