const STORAGE_KEY = "freshEssenceOrders";
const OWNER_UNLOCK_KEY = "scentOfMirageOwnerUnlocked";
const OWNER_PIN = "160809";
const OWNER_PHONE = "201099454914";
const OWNER_EMAIL = "Adamk2009dd@outlook.com";
const SIZE_PRICES = {
  "3 ml": 30,
  "5 ml": 50,
  "30 ml": 250,
  "50 ml": 400,
  "100 ml": 750
};

const fields = [
  "customerName",
  "phone",
  "address",
  "scentFamily",
  "scentNotes",
  "size",
  "strength",
  "quantity",
  "packaging",
  "deliverySpeed",
  "payment",
  "extraNote"
];

let ordersManagerReady = false;

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function formatOrder(order) {
  const unitPrice = SIZE_PRICES[order.size] || 0;
  const quantity = Number(order.quantity) || 1;
  const total = unitPrice * quantity;

  return [
    `Order: ${order.id}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    `Scent: ${order.scentFamily}`,
    `Notes: ${order.scentNotes || "None"}`,
    `Size: ${order.size}`,
    `Unit price: ${unitPrice} EGP`,
    `Strength: ${order.strength}`,
    `Quantity: ${order.quantity}`,
    `Total: ${total} EGP`,
    `Packaging: ${order.packaging}`,
    `Delivery: ${order.deliverySpeed}`,
    `Payment: ${order.payment}`,
    `Extra: ${order.extraNote || "None"}`
  ].join("\n");
}

function collectForm(form) {
  const data = new FormData(form);
  const order = {};
  fields.forEach((field) => {
    order[field] = String(data.get(field) || "").trim();
  });
  return order;
}

function setupMenu() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (!button || !nav) return;

  button.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupOrderForm() {
  const form = document.querySelector("#orderForm");
  if (!form) return;

  const summary = document.querySelector("#liveSummary");
  const shareBox = document.querySelector("#shareBox");
  const whatsappLink = document.querySelector("#whatsappLink");
  const emailLink = document.querySelector("#emailLink");

  const updateSummary = () => {
    const draft = collectForm(form);
    const hasContent = Object.values(draft).some(Boolean);
    summary.textContent = hasContent
      ? formatOrder({ id: "Preview", ...draft })
      : "Start filling the form to see the order here.";
  };

  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const order = collectForm(form);
    const createdAt = new Date();
    order.id = `SM-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-5)}`;
    order.createdAt = createdAt.toISOString();
    order.status = "New";

    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);

    const message = formatOrder(order);
    whatsappLink.href = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`;
    emailLink.href = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`Perfume order ${order.id}`)}&body=${encodeURIComponent(message)}`;
    shareBox.hidden = false;
    summary.textContent = message;
    form.reset();
  });

  updateSummary();
}

function statusCounts(orders) {
  const counts = { New: 0, Preparing: 0, Packed: 0, Shipped: 0, Done: 0 };
  orders.forEach((order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
  });
  return counts;
}

function setupOwnerGate() {
  const login = document.querySelector("#ownerLogin");
  const dashboard = document.querySelector("#ownerDashboard");
  if (!login || !dashboard) return true;

  const unlock = () => {
    login.hidden = true;
    dashboard.hidden = false;
    sessionStorage.setItem(OWNER_UNLOCK_KEY, "yes");
    setupOrdersManager();
    renderOrders();
    return true;
  };

  if (sessionStorage.getItem(OWNER_UNLOCK_KEY) === "yes") {
    return unlock();
  }

  const pin = document.querySelector("#ownerPin");
  const button = document.querySelector("#unlockOwner");
  const error = document.querySelector("#loginError");

  const tryUnlock = () => {
    if (pin.value.trim() === OWNER_PIN) {
      unlock();
      renderOrders();
      return;
    }
    error.hidden = false;
    pin.select();
  };

  button.addEventListener("click", tryUnlock);
  pin.addEventListener("keydown", (event) => {
    if (event.key === "Enter") tryUnlock();
  });

  return false;
}

function renderOrders() {
  const list = document.querySelector("#ordersList");
  if (!list) return;

  const stats = document.querySelector("#ordersStats");
  const search = document.querySelector("#orderSearch");
  const query = (search?.value || "").trim().toLowerCase();
  const orders = getOrders();
  const filtered = orders.filter((order) => JSON.stringify(order).toLowerCase().includes(query));
  const counts = statusCounts(orders);

  stats.innerHTML = [
    `<span class="stat-pill">Total ${orders.length}</span>`,
    `<span class="stat-pill">New ${counts.New || 0}</span>`,
    `<span class="stat-pill">Preparing ${counts.Preparing || 0}</span>`,
    `<span class="stat-pill">Packed ${counts.Packed || 0}</span>`,
    `<span class="stat-pill">Shipped ${counts.Shipped || 0}</span>`,
    `<span class="stat-pill">Done ${counts.Done || 0}</span>`
  ].join("");

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">No orders yet. Make a test order from the order page.</div>`;
    return;
  }

  list.innerHTML = filtered.map((order) => {
    const date = new Date(order.createdAt).toLocaleString();
    const unitPrice = SIZE_PRICES[order.size] || 0;
    const total = unitPrice * (Number(order.quantity) || 1);
    return `
      <article class="order-card" data-id="${order.id}">
        <div class="order-card-header">
          <div>
            <h3>${escapeHtml(order.customerName)} - ${escapeHtml(order.id)}</h3>
            <p class="order-meta">${escapeHtml(date)} - ${escapeHtml(order.status)}</p>
          </div>
          <a class="button secondary" href="tel:${escapeAttr(order.phone)}">Call</a>
        </div>
        <div class="details-grid">
          <p class="detail"><strong>Phone</strong>${escapeHtml(order.phone)}</p>
          <p class="detail"><strong>Address</strong>${escapeHtml(order.address)}</p>
          <p class="detail"><strong>Scent</strong>${escapeHtml(order.scentFamily)} - ${escapeHtml(order.strength)}</p>
          <p class="detail"><strong>Bottle</strong>${escapeHtml(order.size)} - ${unitPrice} EGP - Qty ${escapeHtml(order.quantity)}</p>
          <p class="detail"><strong>Total</strong>${total} EGP</p>
          <p class="detail"><strong>Packaging</strong>${escapeHtml(order.packaging)}</p>
          <p class="detail"><strong>Delivery</strong>${escapeHtml(order.deliverySpeed)} - ${escapeHtml(order.payment)}</p>
          <p class="detail"><strong>Perfume notes</strong>${escapeHtml(order.scentNotes || "None")}</p>
          <p class="detail"><strong>Extra note</strong>${escapeHtml(order.extraNote || "None")}</p>
        </div>
        <div class="pack-box">
          <strong>Pack this order</strong>
          <span>${escapeHtml(order.quantity)} x ${escapeHtml(order.size)} bottle</span>
          <span>${escapeHtml(order.scentFamily)} / ${escapeHtml(order.strength)}</span>
          <span>${escapeHtml(order.packaging)}</span>
        </div>
        <div class="status-row">
          <select data-action="status" aria-label="Change order status">
            ${["New", "Preparing", "Packed", "Shipped", "Done"].map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
          <button class="button primary" data-action="packed" type="button">Mark packed</button>
          <button class="button secondary" data-action="print" type="button">Print slip</button>
          <button class="button danger" data-action="delete" type="button">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\s/g, "");
}

function downloadCsv(orders) {
  const headings = ["id", "createdAt", "status", ...fields];
  const rows = orders.map((order) => headings.map((heading) => `"${String(order[heading] || "").replace(/"/g, '""')}"`).join(","));
  const csv = [headings.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "perfume-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function setupOrdersManager() {
  const list = document.querySelector("#ordersList");
  if (!list) return;

  const dashboard = document.querySelector("#ownerDashboard");
  if (dashboard?.hidden) return;

  if (!ordersManagerReady) {
    document.querySelector("#orderSearch")?.addEventListener("input", renderOrders);
    document.querySelector("#exportOrders")?.addEventListener("click", () => downloadCsv(getOrders()));
    document.querySelector("#clearOrders")?.addEventListener("click", () => {
      if (!confirm("Clear all saved orders from this browser?")) return;
      saveOrders([]);
      renderOrders();
    });

    list.addEventListener("change", (event) => {
      if (event.target.dataset.action !== "status") return;
      const card = event.target.closest(".order-card");
      const orders = getOrders().map((order) => order.id === card.dataset.id ? { ...order, status: event.target.value } : order);
      saveOrders(orders);
      renderOrders();
    });

    list.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;

      const card = event.target.closest(".order-card");
      if (action === "delete") {
        const orders = getOrders().filter((order) => order.id !== card.dataset.id);
        saveOrders(orders);
        renderOrders();
      }
      if (action === "packed") {
        const orders = getOrders().map((order) => order.id === card.dataset.id ? { ...order, status: "Packed" } : order);
        saveOrders(orders);
        renderOrders();
      }
      if (action === "print") {
        window.print();
      }
    });

    ordersManagerReady = true;
  }

  renderOrders();
}

setupMenu();
setupOrderForm();
setupOwnerGate();
setupOrdersManager();
