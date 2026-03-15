// auth.js — MenStyle

function escHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;");
}

// ─── Brute-force ──────────────────────────────────────────────
const BF_ADMIN_KEY = "bf_admin";
const BF_MAX       = 5;
const BF_BLOCK_MS  = 5 * 60 * 1000;

function bfGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) || { count:0, until:0 }; }
  catch { return { count:0, until:0 }; }
}
function bfSet(key, val) { sessionStorage.setItem(key, JSON.stringify(val)); }
function bfReset(key)    { bfSet(key, { count:0, until:0 }); }
function bfRemaining(key){ return bfGet(key).count || 0; }

function bfCheck(key) {
  const b = bfGet(key);
  if (b.until && Date.now() < b.until)
    return { blocked: true, left: Math.ceil((b.until - Date.now()) / 1000) };
  return { blocked: false };
}
function bfFail(key) {
  const b = bfGet(key);
  b.count = (b.count || 0) + 1;
  if (b.count >= BF_MAX) { b.until = Date.now() + BF_BLOCK_MS; b.count = 0; }
  bfSet(key, b);
}

// ─── Helpers ──────────────────────────────────────────────────
function normPhone(phone) {
  return String(phone || "").trim().replace(/\s+/g,"").replace(/[^\d+]/g,"");
}
function isUzPhone(phone) { return /^\+998\d{9}$/.test(normPhone(phone)); }

function isValidDob(dd, mm, yyyy) {
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (!d || !m || !y) return "Tug'ilgan sanani to'liq kiriting";
  const now = new Date().getFullYear();
  if (y < 1900 || y > now - 5) return `Yil noto'g'ri (1900–${now-5})`;
  if (m < 1 || m > 12) return "Oy 01–12 orasida bo'lsin";
  if (d < 1 || d > 31) return "Kun 01–31 orasida bo'lsin";
  const maxDay = new Date(y, m, 0).getDate();
  if (d > maxDay) return `${m}-oyda ${maxDay} kundan oshmasin`;
  return null;
}
function isValidBirthYear(year) {
  const y = Number(year), now = new Date().getFullYear();
  return y >= 1900 && y <= now - 5;
}

// ─── Users ────────────────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem("users")) || {}; } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem("users", JSON.stringify(users)); }

// ─── Session ──────────────────────────────────────────────────
function getSession() {
  const phone = localStorage.getItem("userPhone");
  if (localStorage.getItem("login") !== "true" || !phone) return null;
  return { phone };
}
function setSession(phone) {
  localStorage.setItem("login", "true");
  localStorage.setItem("userPhone", phone);
}
function clearSession() {
  localStorage.removeItem("login");
  localStorage.removeItem("userPhone");
}
function logout() { clearSession(); location.href = "login.html"; }

// ─── Admin ────────────────────────────────────────────────────
function verifyAdminLogin(loginVal, passVal) {
  const check = bfCheck(BF_ADMIN_KEY);
  if (check.blocked)
    return { ok:false, msg:`Juda ko'p urinish! ${check.left} soniyadan keyin urinib ko'ring.` };
  try {
    const cred = JSON.parse(localStorage.getItem("adminCred")) || {};
    if (loginVal === cred.login && passVal === cred.pass) {
      bfReset(BF_ADMIN_KEY);
      return { ok: true };
    }
  } catch {}
  bfFail(BF_ADMIN_KEY);
  const rem = BF_MAX - bfRemaining(BF_ADMIN_KEY);
  return { ok:false, msg:`Login yoki parol noto'g'ri! (${rem > 0 ? rem : 0} ta urinish qoldi)` };
}
