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
    cash: []
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

db.cash =
  Array.isArray(db.cash)
    ? db.cash
    : [];


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

  localStorage.setItem(
    KEY,
    JSON.stringify(db)
  );

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
   RENDER GENERAL
   ========================================================= */

function renderAll() {

  renderHome();

  renderInventory();

  renderSales();

  renderCash();

  renderCustomers();

  renderMoves();

  renderOrders();

  renderInternal();

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


  const salesTotal =
    document.getElementById(
      "salesTotal"
    );


  const salesCount =
    document.getElementById(
      "salesCount"
    );


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
      `${db.sales.length} transacciones`;

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


  const groups = {};


  db.sales.forEach(
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
   CLIENTES
   ========================================================= */

function customerStats(name) {

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


  const paid =
    sales.reduce(
      (sum,sale) =>
        sum +
        salePaid(sale),
      0
    );


  return {

    sales,

    bought,

    paid,

    balance:
      Math.max(
        0,
        bought - paid
      )

  };

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

function renderOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );


  if(!list){

    return;

  }


  const rows =
    db.orders
      .slice()
      .reverse();


  list.innerHTML =
    rows.length

      ? rows.map(
          (
            order,
            reverseIndex
          ) => {

            const index =
              db.orders.length -
              1 -
              reverseIndex;


            return `

              <div class="item">

                <div>

                  <b>

                    ${esc(
                      order.product ||
                      "Encargo"
                    )}

                  </b>


                  <div class="muted">

                    Cliente:
                    ${esc(
                      order.client ||
                      "Sin cliente"
                    )}

                    ·

                    Cantidad:
                    ${esc(
                      order.qty ||
                      1
                    )}

                  </div>


                  <div class="muted">

                    ${esc(
                      order.note ||
                      "Sin nota"
                    )}

                    ·

                    ${esc(
                      order.date ||
                      ""
                    )}

                  </div>

                </div>


                <button
                  type="button"
                  class="
                    badge
                    order-status
                    ${
                      order.status ===
                      "Listo"
                        ? "done"
                        : ""
                    }
                  "
                  onclick="
                    toggleOrder(
                      ${index}
                    )
                  "
                >

                  ${esc(
                    order.status ||
                    "Pendiente"
                  )}

                </button>

              </div>

            `;

          }
        ).join("")

      : `

        <div class="empty">
          No hay encargos pendientes.
        </div>

      `;

}


function toggleOrder(index) {

  if(!db.orders[index]){

    return;

  }


  db.orders[index].status =
    db.orders[index].status ===
    "Listo"

      ? "Pendiente"

      : "Listo";


  save();

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


function openSale() {

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


      db.sales.push({

        date:
          now(),

        client:
          form.client.value,

        items,

        total,

        paid,

        pay:
          form.pay.value,

        status,

        profit:
          items.reduce(
            (sum,item) =>
              sum +
              (
                item.price -
                item.cost
              ) *
              item.qty,
            0
          )

      });


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
            source: "Venta"
          });
        }
      );

      save();

      closeModal();

    }

  );


  addSaleRow();

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

          qty: 1,

          note: "",

          status:
            "Pendiente"

        }

      : db.orders[index];


  if(!order){

    return;

  }


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
            order.product
          )}"
        >

      </label>


      <label>

        Cliente

        <input
          name="client"
          value="${esc(
            order.client
          )}"
        >

      </label>


      <label>

        Cantidad

        <input
          name="qty"
          type="number"
          min="1"
          value="${
            +order.qty || 1
          }"
        >

      </label>


      <label>

        Nota

        <textarea
          name="note"
          rows="3"
        >${esc(
          order.note
        )}</textarea>

      </label>


      <label>

        Estado

        <select name="status">

          <option
            ${
              order.status ===
              "Pendiente"
                ? "selected"
                : ""
            }
          >
            Pendiente
          </option>

          <option
            ${
              order.status ===
              "Listo"
                ? "selected"
                : ""
            }
          >
            Listo
          </option>

        </select>

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
                onclick="deleteOrder(
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

        product:
          form.product.value.trim(),

        client:
          form.client.value.trim(),

        qty:
          Math.max(
            1,
            +form.qty.value || 1
          ),

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
              )

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

  return db.sales.reduce(
    (sum,sale) =>
      sum +
      Math.max(
        0,
        (+sale.total || 0) -
        salePaid(sale)
      ),
    0
  );

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

function exportData() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          db,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    "aquarium-fish-respaldo.json";


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );

}


function importData(input) {

  const file =
    input?.files?.[0];


  if(!file){

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function(){

      try{

        const imported =
          JSON.parse(
            reader.result
          );


        if(
          !imported ||
          typeof imported !==
          "object"
        ){

          throw new Error(
            "Formato inválido"
          );

        }


        db = {

          products:
            Array.isArray(
              imported.products
            )
              ? imported.products
              : [],

          sales:
            Array.isArray(
              imported.sales
            )
              ? imported.sales
              : [],

          moves:
            Array.isArray(
              imported.moves
            )
              ? imported.moves
              : [],

          customers:
            Array.isArray(
              imported.customers
            )
              ? imported.customers
              : [],

          orders:
            Array.isArray(
              imported.orders
            )
              ? imported.orders
              : [],

          cash:
            Array.isArray(
              imported.cash
            )
              ? imported.cash
              : []

        };


        save();


        alert(
          "Respaldo restaurado correctamente."
        );


      }catch(error){

        console.error(
          error
        );


        alert(
          "No se pudo restaurar el respaldo."
        );

      }

    };


  reader.readAsText(
    file
  );

}


/* =========================================================
   BÚSQUEDAS
   ========================================================= */

function bindSearches() {

  const search =
    document.getElementById(
      "search"
    );


  if(search){

    search.oninput =
      function(){

        renderInventory();

      };

  }


  const customerSearch =
    document.getElementById(
      "customerSearch"
    );


  if(customerSearch){

    customerSearch.oninput =
      function(){

        renderCustomers();

      };

  }

}


/* =========================================================
   HACER FUNCIONES GLOBALES
   IMPORTANTE PARA LOS onclick DEL HTML
   ========================================================= */

function exposeFunctions() {

  window.show =
    show;


  window.openProduct =
    openProduct;


  window.editProduct =
    editProduct;


  window.deleteProduct =
    deleteProduct;


  window.openSale =
    openSale;


  window.addSaleRow =
    addSaleRow;


  window.updateSalePreview =
    updateSalePreview;


  window.openCustomer =
    openCustomer;


  window.editCustomer =
    editCustomer;


  window.deleteCustomer =
    deleteCustomer;


  window.openOrder =
    openOrder;


  window.editOrder =
    editOrder;


  window.deleteOrder =
    deleteOrder;


  window.toggleOrder =
    toggleOrder;


  window.openMove =
    openMove;


  window.toggleDateGroup =
    toggleDateGroup;


  window.closeModal =
    closeModal;


  window.openInternal =
    openInternal;


  window.closeInternal =
    closeInternal;


  window.exportData =
    exportData;


  window.importData =
    importData;


  window.setInventoryCategory =
    setInventoryCategory;


  window.setInventorySort =
    setInventorySort;


  /* =====================================================
     FUNCIONES DE CAJA
  ===================================================== */

  window.openCashMovement =
    openCashMovement;


  window.editCashMovement =
    editCashMovement;


  window.deleteCashMovement =
    deleteCashMovement;


  window.setCashPeriod =
    setCashPeriod;

}


/* =========================================================
   INICIAR APLICACIÓN
   ========================================================= */

function iniciarApp() {

  exposeFunctions();

  bindNavigation();

  bindSearches();

  renderAll();

  show("home");

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
