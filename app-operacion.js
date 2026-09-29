/* =========================================================
   VENTAS
   ========================================================= */

function addSaleRow(productIndex = "") {

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
                ${String(productIndex) === String(index) ? "selected" : ""}
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
      title="Quitar producto"
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


function renderSaleProductSearch() {

  const input =
    document.getElementById(
      "saleProductSearch"
    );

  const results =
    document.getElementById(
      "saleProductSearchResults"
    );

  if(!input || !results){
    return;
  }

  const query =
    String(input.value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  if(!query){

    results.innerHTML =
      `<div class="sale-search-hint">Escribe el nombre del producto para encontrarlo rápidamente.</div>`;

    return;
  }

  const matches =
    db.products
      .map((product,index) => ({product,index}))
      .filter(({product}) => {

        const name =
          String(product.name || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        return name.includes(query);

      })
      .slice(0, 12);

  if(!matches.length){

    results.innerHTML =
      `<div class="sale-search-empty">No encontramos productos con “${esc(input.value)}”.</div>`;

    return;
  }

  results.innerHTML =
    matches.map(({product,index}) => {

      const stock =
        +product.stock || 0;

      const disabled =
        stock <= 0
          ? "disabled"
          : "";

      return `
        <button
          type="button"
          class="sale-search-result ${stock <= 0 ? "out-of-stock" : ""}"
          ${disabled}
          onclick="addSaleProductFromSearch(${index})"
        >
          <span>
            <b>${esc(product.name || "Producto")}</b>
            <small>Stock: ${stock} · ${money(+product.price || 0)}</small>
          </span>
          <strong>${stock > 0 ? "＋ Agregar" : "Agotado"}</strong>
        </button>
      `;

    }).join("");

}


function addSaleProductFromSearch(productIndex) {

  const product =
    db.products[+productIndex];

  if(!product){
    return;
  }

  if((+product.stock || 0) <= 0){

    alert(`El producto "${product.name}" está agotado.`);

    return;

  }

  const rows =
    [...document.querySelectorAll(".sale-row")];

  // Si ya existe una fila vacía, la reutilizamos.
  const emptyRow =
    rows.find(row =>
      String(
        row.querySelector(".sale-product")?.value || ""
      ) === ""
    );

  if(emptyRow){

    const select =
      emptyRow.querySelector(".sale-product");

    if(select){
      select.value =
        String(productIndex);
    }

  }else{

    addSaleRow(productIndex);

  }

  const search =
    document.getElementById("saleProductSearch");

  if(search){
    search.value = "";
  }

  renderSaleProductSearch();
  updateSalePreview();

  const currentRows =
    [...document.querySelectorAll(".sale-row")];

  const qty =
    emptyRow?.querySelector(".sale-qty") ||
    currentRows[currentRows.length - 1]?.querySelector(".sale-qty");

  if(qty){
    qty.focus();
    qty.select();
  }

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


function cancelSaleEntry(){
  // Si la venta provenía de una cotización, cancelar aquí no debe
  // dejar una conversión pendiente que pueda afectar una venta posterior.
  window.pendingQuoteToSale = null;
  closeModal();
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


      <div class="sale-product-search-box">

        <label for="saleProductSearch">
          🔎 Buscar producto para agregar
        </label>

        <input
          id="saleProductSearch"
          class="search"
          type="search"
          placeholder="Escribe el nombre del producto..."
          autocomplete="off"
        >

        <div
          id="saleProductSearchResults"
          class="sale-search-results"
        >
          <div class="sale-search-hint">
            Escribe el nombre del producto para encontrarlo rápidamente.
          </div>
        </div>

      </div>


      <div id="saleRows"></div>


      <button
        type="button"
        onclick="addSaleRow()"
      >
        ➕ Agregar producto manualmente
      </button>


      <div
        class="panel"
        style="margin-top:12px;"
      >

        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <b>Total</b>
          <strong id="saleTotalPreview" style="font-size:1.25rem;">${money(0)}</strong>
        </div>

        <div class="muted" style="margin-top:7px;font-size:.9rem;">
          👁️ Modo cliente: la información interna de costos y ganancias permanece oculta.
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
          onclick="cancelSaleEntry()"
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

  const saleProductSearch =
    document.getElementById("saleProductSearch");

  if(saleProductSearch){

    saleProductSearch.addEventListener(
      "input",
      renderSaleProductSearch
    );

    saleProductSearch.addEventListener(
      "keydown",
      event => {

        if(event.key === "Escape"){

          saleProductSearch.value = "";
          renderSaleProductSearch();

        }

      }
    );

  }

  renderSaleProductSearch();

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


