/* ══════════════════════════════════════════════════════════════
   TRAMA TERRA – admin.js
   Lógica completa do painel administrativo (sem backend)
   Dados persistidos no localStorage
   ══════════════════════════════════════════════════════════════ */

// ─── CONFIG ──────────────────────────────────────────────────────
const ADMIN_PASSWORD = "trama2025"; // ← Altere a senha aqui
const HISTORY_KEY = "trama_terra_orders"; // Mesmo key da loja
const SESSION_KEY = "trama_admin_session";
const WHATSAPP_NUMBER = "63992863557"; // ← Mesmo número da loja

// ─── STATUS CONFIG ────────────────────────────────────────────────
const STATUS_CONFIG = {
  novo: { label: "🔵 Novo", color: "#3b82f6" },
  confirmado: { label: "🟡 Confirmado", color: "#eab308" },
  producao: { label: "🟠 Em Produção", color: "#f97316" },
  enviado: { label: "🟣 Enviado", color: "#8b5cf6" },
  entregue: { label: "🟢 Entregue", color: "#22c55e" },
  cancelado: { label: "🔴 Cancelado", color: "#ef4444" },
};

const SHIP_LABELS = {
  correios: "📦 Correios",
  motoboy: "🛵 Motoboy",
  retirada: "🏡 Retirada",
};
const PAY_LABELS = {
  pix: "💠 Pix",
  cartao: "💳 Cartão",
  deposito: "🏦 Depósito",
};

// ─── ESTADO ───────────────────────────────────────────────────────
let currentOrderId = null;
let currentPage = "dashboard";
let filteredOrders = [];

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "ok") {
    showAdmin();
  }
  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("dash-date").textContent =
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
});

// ─── LOGIN / LOGOUT ───────────────────────────────────────────────
function doLogin() {
  const pwd = document.getElementById("login-password").value;
  const error = document.getElementById("login-error");
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "ok");
    error.style.display = "none";
    showAdmin();
  } else {
    error.style.display = "block";
    document.getElementById("login-password").value = "";
    document.getElementById("login-password").focus();
  }
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
}

function showAdmin() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display = "flex";
  refreshData();
}

// ─── DADOS ────────────────────────────────────────────────────────
function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(orders));
}

function refreshData() {
  renderDashboard();
  renderOrdersList();
  renderHistoryTable();
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────
function showPage(pageId, btn) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  if (btn) btn.classList.add("active");
  currentPage = pageId;

  const titles = {
    dashboard: "Dashboard",
    orders: "Pedidos",
    history: "Histórico",
  };
  document.getElementById("topbar-title").textContent =
    titles[pageId] || pageId;

  if (pageId === "orders") renderOrdersList();
  if (pageId === "history") renderHistoryTable();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function renderDashboard() {
  const orders = loadOrders();
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const ticket = total ? revenue / total : 0;
  const newCount = orders.filter((o) => (o.status || "novo") === "novo").length;

  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-revenue").textContent = revenue.toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  );
  document.getElementById("kpi-ticket").textContent = ticket.toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  );
  document.getElementById("kpi-new").textContent = newCount;

  // Nav badge
  const badge = document.getElementById("nav-new-badge");
  badge.textContent = newCount;
  badge.classList.toggle("visible", newCount > 0);

  // Status bars
  const statusBars = document.getElementById("status-bars");
  statusBars.innerHTML = "";
  const statusCount = {};
  Object.keys(STATUS_CONFIG).forEach((s) => (statusCount[s] = 0));
  orders.forEach((o) => {
    const s = o.status || "novo";
    statusCount[s] = (statusCount[s] || 0) + 1;
  });
  Object.entries(STATUS_CONFIG).forEach(([key, cfg]) => {
    const count = statusCount[key] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "status-bar-row";
    row.innerHTML = `
      <div class="status-bar-label">${cfg.label}</div>
      <div class="status-bar-track">
        <div class="status-bar-fill" style="width:${pct}%;background:${cfg.color}"></div>
      </div>
      <div class="status-bar-count">${count}</div>`;
    statusBars.appendChild(row);
  });

  // Top products
  const productCount = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      productCount[item.name] = (productCount[item.name] || 0) + item.quantity;
    });
  });
  const sorted = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topEl = document.getElementById("top-products");
  if (!sorted.length) {
    topEl.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>Nenhum produto vendido ainda.</p></div>`;
    return;
  }
  topEl.innerHTML = sorted
    .map(
      ([name, qty]) =>
        `<div class="top-product-row">
       <span class="top-product-name">${name}</span>
       <span class="top-product-count">${qty} vendido${qty > 1 ? "s" : ""}</span>
     </div>`,
    )
    .join("");
}

// ─── LISTA DE PEDIDOS ─────────────────────────────────────────────
function renderOrdersList() {
  const orders = loadOrders();
  const searchVal = (
    document.getElementById("search-input")?.value || ""
  ).toLowerCase();
  const statusVal = document.getElementById("status-filter")?.value || "";

  filteredOrders = orders.filter((o) => {
    const matchSearch =
      !searchVal ||
      (o.customerName || "").toLowerCase().includes(searchVal) ||
      (o.customerPhone || "").toLowerCase().includes(searchVal) ||
      (o.customerEmail || "").toLowerCase().includes(searchVal);
    const matchStatus = !statusVal || (o.status || "novo") === statusVal;
    return matchSearch && matchStatus;
  });

  const listEl = document.getElementById("orders-list");
  if (!filteredOrders.length) {
    listEl.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhum pedido encontrado.</p></div>`;
    return;
  }

  listEl.innerHTML = "";
  filteredOrders.forEach((order) => {
    const status = order.status || "novo";
    const dateStr = new Date(order.date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const items = order.items || [];
    const preview = items
      .slice(0, 2)
      .map(
        (i) => `<span class="order-item-pill">${i.quantity}× ${i.name}</span>`,
      )
      .join("");
    const moreCount = items.length - 2;
    const moreEl =
      moreCount > 0
        ? `<span class="order-more-pill">+${moreCount} item${moreCount > 1 ? "s" : ""}</span>`
        : "";

    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-card-header">
        <div class="order-card-left">
          <div class="order-card-id">Pedido #${String(order.id).slice(-6)}</div>
          <div class="order-card-name">${order.customerName || "—"}</div>
          <div class="order-card-date">${dateStr} · ${order.customerPhone || ""}</div>
        </div>
        <div class="order-card-right">
          <div class="order-card-total">${(order.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
          <span class="status-badge ${status}">${STATUS_CONFIG[status]?.label || status}</span>
        </div>
      </div>
      <div class="order-card-body">
        ${preview}${moreEl}
        <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted)">${SHIP_LABELS[order.shippingType] || order.shippingType || "—"}</span>
      </div>`;
    card.addEventListener("click", () => openOrderModal(order.id));
    listEl.appendChild(card);
  });
}

function filterOrders() {
  renderOrdersList();
}

// ─── MODAL DO PEDIDO ──────────────────────────────────────────────
function openOrderModal(orderId) {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  currentOrderId = orderId;

  const status = order.status || "novo";
  const dateStr = new Date(order.date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("order-modal-title").textContent =
    `Pedido #${String(orderId).slice(-6)}`;
  document.getElementById("order-status-select").value = status;

  // Items
  const itemsHTML = (order.items || [])
    .map((item) => {
      const sub = item.price * item.quantity;
      let extra = "";
      if (item.colors && item.colors.length)
        extra += `<div style="font-size:0.75rem;color:var(--terra)">🎨 ${item.colors.join(" + ")}</div>`;
      if (item.obs)
        extra += `<div style="font-size:0.75rem;color:var(--text-muted)">💬 ${item.obs}</div>`;
      return `<div class="modal-item-row">
      <div>
        <div class="modal-item-name">${item.quantity}× ${item.name}</div>
        ${extra}
      </div>
      <div class="modal-item-price">${sub.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
    </div>`;
    })
    .join("");

  const body = document.getElementById("order-modal-body");
  body.innerHTML = `
    <!-- CLIENTE -->
    <div class="modal-section">
      <div class="modal-section-title">👤 Cliente</div>
      <div class="modal-info-row"><i class="fas fa-user"></i><span>${order.customerName || "—"}</span></div>
      <div class="modal-info-row"><i class="fas fa-phone"></i><span>${order.customerPhone || "—"}</span></div>
      ${order.customerEmail ? `<div class="modal-info-row"><i class="fas fa-envelope"></i><span>${order.customerEmail}</span></div>` : ""}
      <div class="modal-info-row"><i class="fas fa-calendar"></i><span>${dateStr}</span></div>
    </div>

    <!-- ITENS -->
    <div class="modal-section">
      <div class="modal-section-title">🛍️ Itens do Pedido</div>
      ${itemsHTML}
      <div class="modal-total-row">
        <span>Total</span>
        <span class="modal-total-value">${(order.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      </div>
    </div>

    <!-- ENTREGA & PAGAMENTO -->
    <div class="modal-section">
      <div class="modal-section-title">🚀 Entrega & Pagamento</div>
      <div class="modal-info-row"><i class="fas fa-truck"></i><span>${SHIP_LABELS[order.shippingType] || order.shippingType || "—"}</span></div>
      <div class="modal-info-row"><i class="fas fa-map-marker-alt"></i><span>${order.address || "Retirada no local"}</span></div>
      <div class="modal-info-row"><i class="fas fa-credit-card"></i><span>${PAY_LABELS[order.paymentType] || order.paymentType || "—"}</span></div>
    </div>`;

  // Botão WhatsApp
  const whatsappBtn = document.getElementById("order-whatsapp-btn");
  if (order.customerPhone) {
    const phone = order.customerPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${order.customerName}, tudo bem? Aqui é da Trama Terra! 🧶`,
    );
    whatsappBtn.onclick = () =>
      window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    whatsappBtn.style.display = "";
  } else {
    whatsappBtn.style.display = "none";
  }

  document.getElementById("order-modal").classList.add("active");
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.remove("active");
  currentOrderId = null;
}

document.getElementById("order-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("order-modal")) closeOrderModal();
});

// ─── ATUALIZAR STATUS ─────────────────────────────────────────────
function updateOrderStatus() {
  if (!currentOrderId) return;
  const newStatus = document.getElementById("order-status-select").value;
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === currentOrderId);
  if (idx === -1) return;
  orders[idx].status = newStatus;
  saveOrders(orders);
  refreshData();
}

// ─── DELETAR PEDIDO ───────────────────────────────────────────────
function deleteCurrentOrder() {
  if (!currentOrderId) return;
  if (!confirm("Excluir este pedido permanentemente?")) return;
  const orders = loadOrders();
  const updated = orders.filter((o) => o.id !== currentOrderId);
  saveOrders(updated);
  closeOrderModal();
  refreshData();
}

// ─── LIMPAR TUDO ──────────────────────────────────────────────────
function confirmClearAll() {
  if (
    !confirm(
      "⚠️ Isso vai apagar TODOS os pedidos permanentemente. Tem certeza?",
    )
  )
    return;
  if (
    !confirm(
      "Confirmando a exclusão de todos os dados. Esta ação não pode ser desfeita.",
    )
  )
    return;
  localStorage.removeItem(HISTORY_KEY);
  refreshData();
}

// ─── HISTÓRICO (TABELA) ───────────────────────────────────────────
function renderHistoryTable() {
  const orders = loadOrders();
  const wrap = document.getElementById("history-table-wrap");
  if (!orders.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>Nenhum pedido registrado ainda.</p></div>`;
    return;
  }

  const rows = orders
    .map((order) => {
      const status = order.status || "novo";
      const dateStr = new Date(order.date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const items = (order.items || [])
        .map((i) => `${i.quantity}× ${i.name}`)
        .join(", ");
      return `<tr onclick="openOrderModal(${order.id})" title="Clique para ver detalhes">
      <td class="td-name">${order.customerName || "—"}</td>
      <td class="td-muted">${dateStr}</td>
      <td>${items}</td>
      <td><strong>${(order.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></td>
      <td>${SHIP_LABELS[order.shippingType] || order.shippingType || "—"}</td>
      <td><span class="status-badge ${status}">${STATUS_CONFIG[status]?.label || status}</span></td>
    </tr>`;
    })
    .join("");

  wrap.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Data/Hora</th>
          <th>Itens</th>
          <th>Total</th>
          <th>Envio</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
