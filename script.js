// script.js — MenStyle (Firebase Firestore)
import { db } from "./firebase-config.js";
import {
  collection, getDocs, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}
function safeParse(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function placeholderSvg(text, w, h) {
  const label = encodeURIComponent(text || "Rasm");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w||300}' height='${h||220}'%3E%3Crect width='100%25' height='100%25' fill='%23f1f3f7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3E${label}%3C/text%3E%3C/svg%3E`;
}

// ─── Cart (localStorage) ───────────────────────────────────────
let cart = [];
function loadCart()  { cart = safeParse("cart", []); if (!Array.isArray(cart)) cart = []; }
function saveCart()  { saveLocal("cart", cart); }

function updateCartCount() {
  loadCart();
  document.querySelectorAll(".cart-count-badge").forEach(el => {
    el.textContent = cart.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  });
}

window.addToCart = function(id) {
  loadCart();
  const pid  = String(id);
  const item = cart.find(x => x.id === pid);
  if (item) item.qty = (Number(item.qty) || 0) + 1;
  else cart.push({ id: pid, qty: 1 });
  saveCart();
  updateCartCount();

  const btn = document.querySelector(`button[data-cartid="${pid}"]`);
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = "✅ Qo'shildi";
    btn.disabled  = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1000);
  }
};

window.increaseQty = function(id) {
  loadCart();
  const pid = String(id), item = cart.find(x => x.id === pid);
  if (item) item.qty = (Number(item.qty)||0)+1; else cart.push({id:pid,qty:1});
  saveCart(); updateCartCount();
};
window.decreaseQty = function(id) {
  loadCart();
  const pid = String(id), item = cart.find(x => x.id === pid);
  if (!item) return;
  item.qty = (Number(item.qty)||0)-1;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== pid);
  saveCart(); updateCartCount();
};
window.removeFromCart = function(id) {
  loadCart();
  cart = cart.filter(x => x.id !== String(id));
  saveCart(); updateCartCount();
};
window.clearCart = function() { cart = []; saveCart(); updateCartCount(); };

// Firestore'dan mahsulot ma'lumotlarini olish
async function getProductsMap() {
  const snap = await getDocs(collection(db, "products"));
  const map  = new Map();
  snap.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  return map;
}

window.getCartDetailed = async function() {
  loadCart();
  const map = await getProductsMap();
  return cart.map(c => {
    const p = map.get(String(c.id));
    return {
      id:       String(c.id),
      qty:      Number(c.qty) || 0,
      name:     p?.name     || "Noma'lum",
      price:    Number(p?.price) || 0,
      img:      p?.img      || "",
      category: p?.category || ""
    };
  }).filter(x => x.qty > 0);
};

window.getCartTotal = async function() {
  const items = await window.getCartDetailed();
  return items.reduce((s, x) => s + x.price * x.qty, 0);
};

window.goToCheckout = function() {
  if (localStorage.getItem("login") !== "true") {
    alert("Savatga kirish uchun avval login qiling!");
    location.href = "login.html"; return;
  }
  location.href = "checkout.html";
};

// ─── Auth area ─────────────────────────────────────────────────
window.renderAuthArea = function() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  const isLogged = localStorage.getItem("login") === "true";
  const phone    = localStorage.getItem("userPhone") || "";
  let displayName = escHtml(phone);

  if (phone) {
    try {
      const users = JSON.parse(localStorage.getItem("users")) || {};
      const u = users[phone];
      if (u && u.firstName) displayName = escHtml(u.firstName);
    } catch {}
  }

  if (isLogged) {
    authArea.innerHTML = `
      <span class="chip">👤 ${displayName}</span>
      <a class="linkBtn" href="profile.html">Profil</a>
      <button class="logoutBtn" onclick="doLogout()">🚪 Chiqish</button>
      <button class="cartBtn" onclick="goToCheckout()">
        🛒 Savat (<span class="cart-count-badge">0</span>)
      </button>
    `;
  } else {
    authArea.innerHTML = `
      <a class="linkBtn" href="login.html">🔑 Kirish</a>
      <a class="linkBtn" href="register.html">📝 Ro'yxat</a>
      <button class="cartBtn" onclick="goToCheckout()">
        🛒 Savat (<span class="cart-count-badge">0</span>)
      </button>
    `;
  }
  updateCartCount();
};

window.doLogout = function() {
  localStorage.removeItem("login");
  localStorage.removeItem("userPhone");
  location.href = "login.html";
};

// ─── Products GRID ─────────────────────────────────────────────
window.renderProducts = async function() {
  const list = document.getElementById("product-list");
  if (!list) return;

  list.innerHTML = `
    <div style="grid-column:1/-1; padding:40px; text-align:center; color:#999;">
      ⏳ Mahsulotlar yuklanmoqda...
    </div>`;

  try {
    const cat  = document.getElementById("filter-category")?.value || "all";
    const q    = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    let products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    if (cat !== "all") {
      products = products.filter(p => p.category === cat);
    }

    if (!products.length) {
      list.innerHTML = `
        <div style="grid-column:1/-1; padding:40px; text-align:center; color:#999;">
          Bu kategoriyada mahsulot yo'q 😕
        </div>`;
      return;
    }

    list.innerHTML = products.map(p => {
      const safeImg = /^https?:\/\//.test(p.img)
        ? p.img : placeholderSvg(p.name, 300, 280);

      return `
        <div class="product-card">
          <img
            class="product-img"
            src="${escHtml(safeImg)}"
            alt="${escHtml(p.name)}"
            onerror="this.src='${placeholderSvg(p.name,300,280)}'"
          />
          <div class="product-body">
            <div class="product-cat">${escHtml(p.category) || "—"}</div>
            <div class="product-name">${escHtml(p.name)}</div>
            <div class="product-price">${Number(p.price).toLocaleString("uz-UZ")} so'm</div>
            <button
              class="product-btn"
              data-cartid="${escHtml(p.id)}"
              onclick="addToCart('${escHtml(p.id)}')"
            >➕ Savatga</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    list.innerHTML = `
      <div style="grid-column:1/-1; padding:40px; text-align:center; color:red;">
        Xatolik: ${e.message}
      </div>`;
  }
};

// ─── Save order to Firestore ───────────────────────────────────
window.saveOrderToFirestore = async function(order) {
  await addDoc(collection(db, "orders"), order);
};

// ─── Init ──────────────────────────────────────────────────────
window.safeParse       = safeParse;
window.saveLocal       = saveLocal;
window.escHtml         = escHtml;
window.placeholderSvg  = placeholderSvg;
window.updateCartCount = updateCartCount;

document.addEventListener("DOMContentLoaded", () => {
  window.renderAuthArea();
  window.renderProducts();
});
