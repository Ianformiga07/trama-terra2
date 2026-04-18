/* ══════════════════════════════════════════════════════════════
   TRAMA TERRA – Design Mineral Autoral
   script.js – Carrinho, checkout, histórico, frete
   ══════════════════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "63992863557";
const STORE_NAME = "Trama Terra";
const HISTORY_KEY = "trama_terra_orders";

// ─── ESTADO ──────────────────────────────────────────────────────
let cart = [];
let shippingType = "correios";
let paymentType = "pix";

// ─── DOM REFS ─────────────────────────────────────────────────────
const cartModal = document.getElementById("cart-modal");
const cartBtn = document.getElementById("cart-btn");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const cartCountModal = document.getElementById("cart-count-modal");
const customerNameEl = document.getElementById("customer-name");
const customerPhoneEl = document.getElementById("customer-phone");
const customerEmailEl = document.getElementById("customer-email");
const cepInput = document.getElementById("cep-input");
const addressStreet = document.getElementById("address-street");
const addressNum = document.getElementById("address-num");
const addressComp = document.getElementById("address-comp");
const addressBairro = document.getElementById("address-bairro");
const addressCity = document.getElementById("address-city");
const addressState = document.getElementById("address-state");
const historyModal = document.getElementById("history-modal");
const historyList = document.getElementById("history-list");

// ─── ABRIR / FECHAR CARRINHO ──────────────────────────────────────
cartBtn.addEventListener("click", () => {
  updateCartModal();
  cartModal.classList.add("active");
  document.body.style.overflow = "hidden";
});

closeModalBtn.addEventListener("click", () => {
  cartModal.classList.remove("active");
  document.body.style.overflow = "";
});

cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.classList.remove("active");
    document.body.style.overflow = "";
  }
});

// ─── SHIPPING / PAGAMENTO ─────────────────────────────────────────
function selectShipping(type) {
  shippingType = type;
  ["correios", "motoboy", "retirada"].forEach((s) => {
    document
      .getElementById("ship-" + s)
      .classList.toggle("selected", s === type);
  });
  const addrBlock = document.getElementById("address-block");
  addrBlock.style.display = type === "retirada" ? "none" : "";
}

function selectPayment(type) {
  paymentType = type;
  ["pix", "cartao", "deposito"].forEach((p) => {
    document
      .getElementById("btn-" + p)
      .classList.toggle("selected", p === type);
  });
}

// ─── CEP FORMAT ───────────────────────────────────────────────────
function formatCEP(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
  input.value = v;
}

// ─── ADICIONAR AO CARRINHO ────────────────────────────────────────
function addToCart(item) {
  const key = item.name + "|" + (item.obs || "");
  const exists = cart.find((c) => c.name + "|" + (c.obs || "") === key);
  if (exists) {
    exists.quantity++;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  updateCartCounter();
}

function updateCartCounter() {
  const total = cart.reduce((s, c) => s + c.quantity, 0);
  cartCounter.textContent = total;
  if (cartCountModal) {
    cartCountModal.textContent = `${total} ${total === 1 ? "item" : "itens"}`;
  }
}

// ─── RENDERIZAR MODAL CARRINHO ────────────────────────────────────
function updateCartModal() {
  updateCartCounter();
  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart">
        <p style="font-size:1.8rem;margin-bottom:0.5rem;">○</p>
        <p style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;">Carrinho vazio</p>
        <p>Explore a coleção e adicione suas peças favoritas.</p>
      </div>`;
    cartTotalEl.textContent = "R$ 0,00";
    return;
  }

  cartItemsEl.innerHTML = "";
  let total = 0;

  cart.forEach((item, i) => {
    total += item.price * item.quantity;
    const card = document.createElement("div");
    card.className = "cart-item-card";
    const priceDisplay =
      item.price === 0
        ? item.priceStr || "Sob consulta"
        : `R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}`;
    card.innerHTML = `
      <div>
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-sub">Qtd: ${item.quantity}${item.price > 0 ? ` × R$ ${item.price.toFixed(2).replace(".", ",")}` : ""}</p>
        ${item.obs ? `<p class="cart-item-obs">"${item.obs}"</p>` : ""}
      </div>
      <div class="cart-item-right">
        <span class="cart-item-price">${priceDisplay}</span>
        <div class="cart-item-controls">
          <button class="qty-btn" data-i="${i}" data-action="dec">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" data-i="${i}" data-action="inc">+</button>
        </div>
      </div>`;
    cartItemsEl.appendChild(card);
  });

  const totalStr =
    total > 0 ? `R$ ${total.toFixed(2).replace(".", ",")}` : "A consultar";
  cartTotalEl.textContent = totalStr;

  cartItemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.i);
      if (btn.dataset.action === "inc") {
        cart[idx].quantity++;
      } else {
        cart[idx].quantity--;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      }
      updateCartModal();
    });
  });
}

// ─── BUILD ORDER ──────────────────────────────────────────────────
function buildOrderData() {
  const total = cart.reduce((s, item) => s + item.price * item.quantity, 0);

  const cartLines = cart
    .map((item) => {
      let line = `▪️ *${item.name}*\n   Qtd: ${item.quantity}`;
      if (item.price > 0) {
        line += ` × R$ ${item.price.toFixed(2)} = R$ ${(item.price * item.quantity).toFixed(2)}`;
      } else {
        line += ` — ${item.priceStr || "Sob consulta"}`;
      }
      if (item.obs) line += `\n   💬 "${item.obs}"`;
      return line;
    })
    .join("\n\n");

  const shipLabels = {
    correios: "📦 Correios",
    motoboy: "🛵 Motoboy Local",
    retirada: "🏡 Retirada",
  };
  const payLabels = {
    pix: "💠 Pix",
    cartao: "💳 Cartão",
    deposito: "🏦 Depósito Bancário",
  };

  const address =
    shippingType !== "retirada"
      ? `📍 *ENDEREÇO:*\n${addressStreet.value}, ${addressNum.value}${addressComp.value ? ", " + addressComp.value : ""}\n${addressBairro.value} – ${addressCity.value}/${addressState.value.toUpperCase()}\nCEP: ${cepInput.value}`
      : "🏡 *RETIRADA NO LOCAL*";

  const totalLine =
    total > 0
      ? `💰 *VALOR ESTIMADO:* R$ ${total.toFixed(2)}`
      : `💰 *VALOR:* A consultar (será informado via WhatsApp)`;

  const text =
    `✦ *PEDIDO – ${STORE_NAME}* ✦\n\n` +
    `─────────────────────\n\n` +
    `👤 *CLIENTE:* ${customerNameEl.value.trim()}\n` +
    `📱 *WHATSAPP:* ${customerPhoneEl.value.trim()}\n` +
    `📧 *E-MAIL:* ${customerEmailEl.value.trim() || "Não informado"}\n\n` +
    `─────────────────────\n\n` +
    `🛍️ *ITENS:*\n\n${cartLines}\n\n` +
    `─────────────────────\n\n` +
    `${totalLine}\n\n` +
    `🚀 *ENVIO:* ${shipLabels[shippingType]}\n\n` +
    `${address}\n\n` +
    `💳 *PAGAMENTO:* ${payLabels[paymentType]}\n\n` +
    `─────────────────────\n\n` +
    `⏰ ${new Date().toLocaleString("pt-BR")}`;

  return {
    total,
    cartSnapshot: JSON.parse(JSON.stringify(cart)),
    whatsappText: text,
    customerName: customerNameEl.value.trim(),
    customerPhone: customerPhoneEl.value.trim(),
    customerEmail: customerEmailEl.value.trim(),
    shippingType,
    paymentType,
    address:
      shippingType !== "retirada"
        ? `${addressStreet.value}, ${addressNum.value} – ${addressCity.value}/${addressState.value}`
        : "Retirada",
    date: new Date().toISOString(),
  };
}

// ─── CHECKOUT ─────────────────────────────────────────────────────
checkoutBtn.addEventListener("click", () => {
  if (!cart.length) {
    alert("Adicione peças ao carrinho antes de finalizar.");
    return;
  }
  if (!customerNameEl.value.trim()) {
    showWarn("customer-name-warn", customerNameEl);
    return;
  }
  if (!customerPhoneEl.value.trim()) {
    showWarn("customer-phone-warn", customerPhoneEl);
    return;
  }
  if (shippingType !== "retirada") {
    if (
      !cepInput.value.trim() ||
      cepInput.value.replace(/\D/g, "").length < 8
    ) {
      showWarn("cep-warn", cepInput);
      return;
    }
    if (!addressStreet.value.trim() || !addressCity.value.trim()) {
      showWarn("address-warn", addressStreet);
      return;
    }
  }

  const orderData = buildOrderData();
  saveOrderToHistory(orderData);

  window.open(
    "https://wa.me/" +
      WHATSAPP_NUMBER.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(orderData.whatsappText),
    "_blank",
  );

  // Reset carrinho
  cart = [];
  [
    customerNameEl,
    customerPhoneEl,
    customerEmailEl,
    cepInput,
    addressStreet,
    addressNum,
    addressComp,
    addressBairro,
    addressCity,
    addressState,
  ].forEach((el) => {
    if (el) el.value = "";
  });
  updateCartModal();
  cartModal.classList.remove("active");
  document.body.style.overflow = "";
});

function showWarn(warnId, inputEl) {
  const w = document.getElementById(warnId);
  if (w) w.style.display = "block";
  if (inputEl) {
    inputEl.classList.add("input-error");
    inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
    inputEl.focus();
  }
}

// Limpar erros ao digitar
[customerNameEl, customerPhoneEl, cepInput, addressStreet, addressCity].forEach(
  (el) => {
    if (!el) return;
    el.addEventListener("input", () => {
      el.classList.remove("input-error");
      document
        .querySelectorAll(".form-warn")
        .forEach((w) => (w.style.display = "none"));
    });
  },
);

// ─── HISTÓRICO ────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrderToHistory(d) {
  try {
    const h = loadHistory();
    h.unshift({
      id: Date.now(),
      date: d.date,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerEmail: d.customerEmail,
      items: d.cartSnapshot,
      total: d.total,
      shippingType: d.shippingType,
      paymentType: d.paymentType,
      address: d.address,
    });
    if (h.length > 100) h.splice(100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {}
}

function openHistoryModal() {
  renderHistoryList();
  historyModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function renderHistoryList() {
  const history = loadHistory();
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty"><p style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;margin-bottom:0.3rem;">Nenhum pedido ainda</p><p>Seus pedidos aparecerão aqui após a confirmação.</p></div>`;
    return;
  }
  const shipLabels = {
    correios: "Correios",
    motoboy: "Motoboy",
    retirada: "Retirada",
  };
  const payLabels = { pix: "Pix", cartao: "Cartão", deposito: "Depósito" };
  history.forEach((order) => {
    const dateStr = new Date(order.date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const itemsHTML = order.items
      .map((item) => {
        let t = `${item.quantity}× ${item.name}`;
        if (item.obs) t += ` — "${item.obs}"`;
        return `<div class="history-item-line">· ${t}</div>`;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "history-card";
    const totalDisplay =
      order.total > 0
        ? order.total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
        : "A consultar";
    card.innerHTML = `
      <div class="history-card-header">
        <div>
          <div class="history-card-name">${order.customerName}</div>
          <div class="history-card-date">${dateStr}</div>
        </div>
        <div class="history-card-total">${totalDisplay}</div>
      </div>
      <div class="history-card-body">
        ${itemsHTML}
        <div style="margin-top:0.5rem;font-size:0.65rem;letter-spacing:1.5px;text-transform:uppercase;opacity:0.7;">
          ${shipLabels[order.shippingType] || order.shippingType} · ${payLabels[order.paymentType] || order.paymentType}
        </div>
      </div>`;
    historyList.appendChild(card);
  });
}

function clearHistory() {
  if (!confirm("Limpar todo o histórico de pedidos?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistoryList();
}

document.getElementById("history-modal-close").addEventListener("click", () => {
  historyModal.classList.remove("active");
  document.body.style.overflow = "";
});
historyModal.addEventListener("click", (e) => {
  if (e.target === historyModal) {
    historyModal.classList.remove("active");
    document.body.style.overflow = "";
  }
});
