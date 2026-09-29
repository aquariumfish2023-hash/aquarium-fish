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


