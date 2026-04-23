/* ══════════════════════════════════════════════════════════════
   TRAMA TERRA – Design Mineral Autoral
   script.js – Carrinho, checkout, histórico
   VERSÃO MELHORADA — UX Mobile-First
   ══════════════════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "63992938479";
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

// ─── CSS INJETADO (animações complementares) ──────────────────────
(function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes inputShake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .toast-success { background: #166534 !important; color: #dcfce7 !important; }
    .toast-error   { background: #7f1d1d !important; color: #fee2e2 !important; }
    .toast-info    { background: var(--ink-soft) !important; border: 1px solid var(--border) !important; }
  `;
  document.head.appendChild(style);
})();

// ─── TOAST — substitui alert() por notificação inline ─────────────
function showToast(msg, type, duration) {
  type = type || "default";
  duration = duration || 2800;
  const toast = document.getElementById("toast");
  if (!toast) return;
  const icons = { success: "✓  ", error: "✕  ", info: "ℹ  " };
  toast.textContent = (icons[type] || "") + msg;
  toast.className = "toast show" + (type !== "default" ? " toast-" + type : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), duration);
}

// ─── ABRIR / FECHAR CARRINHO ──────────────────────────────────────
cartBtn.addEventListener("click", () => {
  updateCartModal();
  cartModal.classList.add("active");
  document.body.style.overflow = "hidden";
});

closeModalBtn.addEventListener("click", () => {
  cartModal.classList.remove("active");
  document.body.style.overflow = "";
  cartBtn.focus();
});

cartModal.addEventListener("click", (e) => {
  if (e.target === cartModal) {
    cartModal.classList.remove("active");
    document.body.style.overflow = "";
  }
});

// Fechar modais com tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (cartModal.classList.contains("active")) {
    cartModal.classList.remove("active");
    document.body.style.overflow = "";
    cartBtn.focus();
  }
  if (historyModal.classList.contains("active")) {
    historyModal.classList.remove("active");
    document.body.style.overflow = "";
  }
});

// ─── SHIPPING / PAGAMENTO ─────────────────────────────────────────
function selectShipping(type) {
  shippingType = type;
  ["correios", "motoboy", "retirada"].forEach((s) => {
    const el = document.getElementById("ship-" + s);
    if (!el) return;
    el.classList.toggle("selected", s === type);
    el.setAttribute("aria-checked", s === type ? "true" : "false");
  });
  const addrBlock = document.getElementById("address-block");
  if (addrBlock) {
    addrBlock.style.display = type === "retirada" ? "none" : "";
    if (type === "retirada") {
      [cepInput, addressStreet, addressNum, addressComp, addressBairro, addressCity, addressState]
        .forEach((el) => { if (el) el.classList.remove("input-error"); });
      document.querySelectorAll(".form-warn").forEach((w) => (w.style.display = "none"));
    }
  }
}

function selectPayment(type) {
  paymentType = type;
  ["pix", "cartao", "deposito"].forEach((p) => {
    const el = document.getElementById("btn-" + p);
    if (!el) return;
    el.classList.toggle("selected", p === type);
    el.setAttribute("aria-checked", p === type ? "true" : "false");
  });
}

// Suporte a teclado nos botões de shipping/payment
document.querySelectorAll(".ship-opt, .pay-opt").forEach((opt) => {
  opt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      opt.click();
    }
  });
});

// ─── MÁSCARAS DE CAMPO ────────────────────────────────────────────
function formatCEP(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
  input.value = v;
  if (v.replace(/\D/g, "").length === 8) {
    fetchAddressByCEP(v.replace(/\D/g, ""));
  }
}

function formatPhone(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d+)/, "($1) $2");
  }
  input.value = v;
}

if (customerPhoneEl) {
  customerPhoneEl.addEventListener("input", () => formatPhone(customerPhoneEl));
}

// ─── BUSCA DE CEP AUTOMÁTICA ──────────────────────────────────────
async function fetchAddressByCEP(cep) {
  if (cepInput) {
    cepInput.style.borderColor = "var(--sand)";
  }
  try {
    const res = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
    const data = await res.json();
    if (data.erro) {
      if (cepInput) cepInput.style.borderColor = "#d94f4f";
      showToast("CEP não encontrado. Preencha o endereço.", "info");
      return;
    }
    if (addressStreet && data.logradouro) addressStreet.value = data.logradouro;
    if (addressBairro && data.bairro)     addressBairro.value = data.bairro;
    if (addressCity   && data.localidade) addressCity.value   = data.localidade;
    if (addressState  && data.uf)         addressState.value  = data.uf.toUpperCase();
    if (addressNum) setTimeout(() => addressNum.focus(), 100);
    if (cepInput) cepInput.style.borderColor = "var(--terra-lt)";
    showToast("Endereço preenchido automaticamente ✓", "success");
  } catch (_) {
    if (cepInput) cepInput.style.borderColor = "";
  }
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
  if (cartCounter) cartCounter.textContent = total;
  if (cartCountModal) {
    cartCountModal.textContent = total + " " + (total === 1 ? "item" : "itens");
  }
}

// ─── RENDERIZAR MODAL CARRINHO ────────────────────────────────────
function updateCartModal() {
  updateCartCounter();
  if (!cart.length) {
    cartItemsEl.innerHTML =
      '<div class="empty-cart">' +
      '<p style="font-size:1.8rem;margin-bottom:0.5rem;opacity:0.3;">○</p>' +
      '<p style="font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;color:var(--text-muted);">Carrinho vazio</p>' +
      "<p>Explore a coleção e adicione suas peças favoritas.</p>" +
      "</div>";
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
        : "R$ " + (item.price * item.quantity).toFixed(2).replace(".", ",");
    card.innerHTML =
      '<div style="flex:1;min-width:0;">' +
        '<p class="cart-item-name">' + item.name + "</p>" +
        '<p class="cart-item-sub">Qtd: ' + item.quantity +
          (item.price > 0 ? " × R$ " + item.price.toFixed(2).replace(".", ",") : "") +
        "</p>" +
        (item.obs ? '<p class="cart-item-obs">"' + item.obs + '"</p>' : "") +
      "</div>" +
      '<div class="cart-item-right">' +
        '<span class="cart-item-price">' + priceDisplay + "</span>" +
        '<div class="cart-item-controls">' +
          '<button class="qty-btn" data-i="' + i + '" data-action="dec" aria-label="Remover uma unidade">−</button>' +
          '<span class="qty-num">' + item.quantity + "</span>" +
          '<button class="qty-btn" data-i="' + i + '" data-action="inc" aria-label="Adicionar uma unidade">+</button>' +
        "</div>" +
      "</div>";
    cartItemsEl.appendChild(card);
  });

  cartTotalEl.textContent =
    total > 0 ? "R$ " + total.toFixed(2).replace(".", ",") : "A consultar";

  cartItemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.i);
      if (btn.dataset.action === "inc") {
        cart[idx].quantity++;
      } else {
        cart[idx].quantity--;
        if (cart[idx].quantity <= 0) {
          const name = cart[idx].name.split(" ").slice(0, 3).join(" ");
          cart.splice(idx, 1);
          showToast(name + " removido", "info");
        }
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
      let line = "▪️ *" + item.name + "*\n   Qtd: " + item.quantity;
      if (item.price > 0) {
        line += " × R$ " + item.price.toFixed(2) + " = R$ " + (item.price * item.quantity).toFixed(2);
      } else {
        line += " — " + (item.priceStr || "Sob consulta");
      }
      if (item.obs) line += '\n   💬 "' + item.obs + '"';
      return line;
    })
    .join("\n\n");

  const shipLabels = { correios: "📦 Correios", motoboy: "🛵 Motoboy Local", retirada: "🏡 Retirada" };
  const payLabels  = { pix: "💠 Pix", cartao: "💳 Cartão", deposito: "🏦 Depósito Bancário" };

  const address =
    shippingType !== "retirada"
      ? "📍 *ENDEREÇO:*\n" + addressStreet.value + ", " + addressNum.value +
        (addressComp.value ? ", " + addressComp.value : "") +
        "\n" + addressBairro.value + " – " + addressCity.value + "/" + addressState.value.toUpperCase() +
        "\nCEP: " + cepInput.value
      : "🏡 *RETIRADA NO LOCAL*";

  const totalLine =
    total > 0
      ? "💰 *VALOR ESTIMADO:* R$ " + total.toFixed(2)
      : "💰 *VALOR:* A consultar (será informado via WhatsApp)";

  const text =
    "✦ *PEDIDO – " + STORE_NAME + "* ✦\n\n" +
    "─────────────────────\n\n" +
    "👤 *CLIENTE:* " + customerNameEl.value.trim() + "\n" +
    "📱 *WHATSAPP:* " + customerPhoneEl.value.trim() + "\n" +
    "📧 *E-MAIL:* " + (customerEmailEl.value.trim() || "Não informado") + "\n\n" +
    "─────────────────────\n\n" +
    "🛍️ *ITENS:*\n\n" + cartLines + "\n\n" +
    "─────────────────────\n\n" +
    totalLine + "\n\n" +
    "🚀 *ENVIO:* " + shipLabels[shippingType] + "\n\n" +
    address + "\n\n" +
    "💳 *PAGAMENTO:* " + payLabels[paymentType] + "\n\n" +
    "─────────────────────\n\n" +
    "⏰ " + new Date().toLocaleString("pt-BR");

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
        ? addressStreet.value + ", " + addressNum.value + " – " + addressCity.value + "/" + addressState.value
        : "Retirada",
    date: new Date().toISOString(),
  };
}

// ─── VALIDAÇÃO COM FEEDBACK ───────────────────────────────────────
function showWarn(warnId, inputEl, message) {
  const w = document.getElementById(warnId);
  if (w) {
    if (message) w.textContent = message;
    w.style.display = "block";
  }
  if (inputEl) {
    inputEl.classList.add("input-error");
    inputEl.style.animation = "none";
    inputEl.offsetHeight;
    inputEl.style.animation = "inputShake 0.35s ease";
    inputEl.addEventListener("animationend", () => { inputEl.style.animation = ""; }, { once: true });
    setTimeout(() => {
      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
      inputEl.focus();
    }, 50);
  }
}

// ─── CHECKOUT ─────────────────────────────────────────────────────
checkoutBtn.addEventListener("click", () => {
  if (!cart.length) {
    showToast("Adicione peças ao carrinho antes de finalizar.", "info", 3000);
    return;
  }
  if (!customerNameEl.value.trim()) {
    showWarn("customer-name-warn", customerNameEl, "Por favor, informe seu nome.");
    return;
  }
  if (!customerPhoneEl.value.trim()) {
    showWarn("customer-phone-warn", customerPhoneEl, "Por favor, informe seu WhatsApp.");
    return;
  }
  if (shippingType !== "retirada") {
    if (!cepInput.value.trim() || cepInput.value.replace(/\D/g, "").length < 8) {
      showWarn("cep-warn", cepInput, "Por favor, informe o CEP.");
      return;
    }
    if (!addressStreet.value.trim() || !addressCity.value.trim()) {
      showWarn("address-warn", addressStreet, "Preencha o endereço completo.");
      return;
    }
  }

  // Feedback visual no botão
  checkoutBtn.disabled = true;
  checkoutBtn.style.opacity = "0.7";
  checkoutBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>' +
    " Abrindo WhatsApp...";

  const orderData = buildOrderData();
  saveOrderToHistory(orderData);

  setTimeout(() => {
    window.open(
      "https://wa.me/" + WHATSAPP_NUMBER.replace(/\D/g, "") +
      "?text=" + encodeURIComponent(orderData.whatsappText),
      "_blank",
    );

    cart = [];
    [customerNameEl, customerPhoneEl, customerEmailEl, cepInput, addressStreet,
     addressNum, addressComp, addressBairro, addressCity, addressState]
      .forEach((el) => { if (el) el.value = ""; });

    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "";
    checkoutBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 0C5.389 0 .014 5.375.014 11.976c0 2.094.54 4.099 1.572 5.878L.002 24l6.296-1.566A11.927 11.927 0 0 0 11.99 24c6.601 0 11.976-5.375 11.976-11.976S18.591 0 11.99 0z"/></svg>' +
      " Finalizar pelo WhatsApp";

    updateCartModal();
    cartModal.classList.remove("active");
    document.body.style.overflow = "";
    showToast("Pedido enviado com sucesso! ✓", "success", 3500);
  }, 600);
});

// Limpar erros ao digitar
[customerNameEl, customerPhoneEl, cepInput, addressStreet, addressCity].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => {
    el.classList.remove("input-error");
    el.style.borderColor = "";
    document.querySelectorAll(".form-warn").forEach((w) => (w.style.display = "none"));
  });
});

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
  } catch (_) {}
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
    historyList.innerHTML =
      '<div class="history-empty">' +
      '<p style="font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;margin-bottom:0.3rem;">Nenhum pedido ainda</p>' +
      "<p>Seus pedidos aparecerão aqui após a confirmação.</p>" +
      "</div>";
    return;
  }
  const shipLabels = { correios: "Correios", motoboy: "Motoboy", retirada: "Retirada" };
  const payLabels  = { pix: "Pix", cartao: "Cartão", deposito: "Depósito" };
  history.forEach((order) => {
    const dateStr = new Date(order.date).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const itemsHTML = order.items
      .map((item) => {
        let t = item.quantity + "× " + item.name;
        if (item.obs) t += ' — "' + item.obs + '"';
        return '<div class="history-item-line">· ' + t + "</div>";
      })
      .join("");
    const card = document.createElement("div");
    card.className = "history-card";
    const totalDisplay =
      order.total > 0
        ? order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "A consultar";
    card.innerHTML =
      '<div class="history-card-header">' +
        '<div><div class="history-card-name">' + order.customerName + "</div>" +
        '<div class="history-card-date">' + dateStr + "</div></div>" +
        '<div class="history-card-total">' + totalDisplay + "</div>" +
      "</div>" +
      '<div class="history-card-body">' +
        itemsHTML +
        '<div style="margin-top:0.5rem;font-size:0.65rem;letter-spacing:1.5px;text-transform:uppercase;opacity:0.7;">' +
          (shipLabels[order.shippingType] || order.shippingType) + " · " +
          (payLabels[order.paymentType] || order.paymentType) +
        "</div>" +
      "</div>";
    historyList.appendChild(card);
  });
}

function clearHistory() {
  if (!confirm("Limpar todo o histórico de pedidos?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistoryList();
  showToast("Histórico limpo.", "info");
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
