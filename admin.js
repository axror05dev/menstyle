// admin.js — MenStyle (Firebase Firestore)
import { db } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Admin logout ─────────────────────────────────────────────
window.adminLogout = function() {
  localStorage.removeItem("adminSession");
  location.href = "admin-login.html";
};

// ─── Admin credentials ────────────────────────────────────────
window.doChangeAdminCred = function() {
  const oldLogin = document.getElementById("oldLogin").value.trim();
  const oldPass  = document.getElementById("oldPass").value;
  const newLogin = document.getElementById("newLogin").value.trim();
  const newPass  = document.getElementById("newPass").value;

  if (!oldLogin || !oldPass || !newLogin || !newPass)
    return alert("Barcha maydonlarni to'ldiring!");
  if (newLogin.length < 3) return alert("Yangi login kamida 3 belgi bo'lsin!");
  if (newPass.length  < 6) return alert("Yangi parol kamida 6 belgi bo'lsin!");

  const cred = JSON.parse(localStorage.getItem("adminCred") || "{}");
  if (oldLogin !== cred.login || oldPass !== cred.pass)
    return alert("Eski login yoki parol noto'g'ri!");

  localStorage.setItem("adminCred", JSON.stringify({ login: newLogin, pass: newPass }));
  alert("✅ Login/parol muvaffaqiyatli o'zgartirildi!");
  document.getElementById("oldLogin").value = "";
  document.getElementById("oldPass").value  = "";
  document.getElementById("newLogin").value = "";
  document.getElementById("newPass").value  = "";
};

// ─── Products ─────────────────────────────────────────────────
async function loadProducts() {
  const list  = document.getElementById("product-list");
  const count = document.getElementById("count");
  list.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">⏳ Yuklanmoqda...</td></tr>`;

  try {
    const q    = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    count.textContent = products.length;

    if (!products.length) {
      list.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Mahsulot yo'q</td></tr>`;
      return;
    }

    list.innerHTML = products.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(p.name)}</td>
        <td>${Number(p.price).toLocaleString("uz-UZ")} so'm</td>
        <td>${escHtml(p.category)}</td>
        <td>
          ${p.img
            ? `<img src="${escHtml(p.img)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"
                onerror="this.style.display='none';this.nextSibling.style.display='block'">
               <span style="display:none;font-size:11px;color:#999;">Rasm yuklanmadi</span>`
            : `<span style="color:#999;font-size:12px;">Rasm yo'q</span>`
          }
        </td>
        <td>
          <button class="btn-red" onclick="deleteProduct('${p.id}')">🗑 O'chirish</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    list.innerHTML = `<tr><td colspan="6" style="color:red;padding:20px;">Xatolik: ${e.message}</td></tr>`;
  }
}

window.addProduct = async function() {
  const name     = document.getElementById("pName").value.trim();
  const price    = Number(document.getElementById("pPrice").value);
  const category = document.getElementById("pCategory").value;
  const img      = document.getElementById("pImg").value.trim();

  if (!name)  return alert("Mahsulot nomini kiriting!");
  if (!price) return alert("Narxni kiriting!");
  if (!img)   return alert("Rasm URL ni kiriting!");
  if (!/^https?:\/\//.test(img)) return alert("Rasm URL http:// yoki https:// bilan boshlanishi kerak!");

  try {
    await addDoc(collection(db, "products"), {
      name, price, category, img,
      createdAt: Date.now()
    });
    alert("✅ Mahsulot qo'shildi!");
    document.getElementById("pName").value  = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pImg").value   = "";
    loadProducts();
  } catch (e) {
    alert("Xatolik: " + e.message);
  }
};

window.deleteProduct = async function(id) {
  if (!confirm("Bu mahsulotni o'chirishni xohlaysizmi?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    loadProducts();
  } catch (e) {
    alert("Xatolik: " + e.message);
  }
};

window.clearProducts = async function() {
  if (!confirm("Barcha mahsulotlarni o'chirishni xohlaysizmi?")) return;
  try {
    const snap = await getDocs(collection(db, "products"));
    const dels = [];
    snap.forEach(d => dels.push(deleteDoc(doc(db, "products", d.id))));
    await Promise.all(dels);
    loadProducts();
  } catch (e) {
    alert("Xatolik: " + e.message);
  }
};

// ─── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  const list  = document.getElementById("order-list");
  const count = document.getElementById("orderCount");
  list.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;">⏳ Yuklanmoqda...</td></tr>`;

  try {
    const q    = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const orders = [];
    snap.forEach(d => orders.push({ firestoreId: d.id, ...d.data() }));

    count.textContent = orders.length;

    if (!orders.length) {
      list.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#999;">Buyurtma yo'q</td></tr>`;
      return;
    }

    list.innerHTML = orders.map(o => {
      const status = o.status || (o.paid ? "paid" : "pending");
      const pillClass = status === "paid" ? "pill-paid" : status === "cancelled" ? "" : "pill-pending";
      const statusLabel = status === "paid" ? "✅ To'langan" : status === "cancelled" ? "❌ Bekor" : "⏳ Kutilmoqda";
      const date = new Date(o.createdAt || Date.now()).toLocaleDateString("uz-UZ");

      return `
        <tr>
          <td style="font-size:12px;">${escHtml(String(o.orderNo || o.id || "—"))}</td>
          <td style="font-size:12px;">${escHtml(o.customerId || "—")}</td>
          <td>${escHtml(o.phone || "—")}</td>
          <td>${escHtml(o.pay || "—")}</td>
          <td><span class="pill ${pillClass}">${statusLabel}</span></td>
          <td>${Number(o.total || 0).toLocaleString("uz-UZ")} so'm</td>
          <td style="font-size:12px;">${date}</td>
          <td>
            ${status === "pending"
              ? `<button class="btn" onclick="markPaid('${o.firestoreId}')">✅ To'landi</button>`
              : `<span style="opacity:.5;font-size:12px;">—</span>`
            }
          </td>
        </tr>`;
    }).join("");
  } catch (e) {
    list.innerHTML = `<tr><td colspan="8" style="color:red;padding:20px;">Xatolik: ${e.message}</td></tr>`;
  }
}

window.markPaid = async function(firestoreId) {
  try {
    await updateDoc(doc(db, "orders", firestoreId), { status: "paid", paid: true });
    loadOrders();
  } catch (e) {
    alert("Xatolik: " + e.message);
  }
};

// ─── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadOrders();
});
