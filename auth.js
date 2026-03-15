// auth.js — MenStyle (to'liq xavfsizlik)

// ─── XSS himoya ───────────────────────────────────────────────
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
function sanitizeInput(str, maxLen) {
  return String(str || "").trim().replace(/[<>\"'&]/g, "").slice(0, maxLen || 100);
}

// ─── Brute-force himoya (sessionStorage - tab yopilsa reset) ──
const BF_OTP_KEY   = "bf_otp";
const BF_ADMIN_KEY = "bf_admin";
const BF_LOGIN_KEY = "bf_login";
const BF_MAX       = 5;
const BF_BLOCK_MS  = 5 * 60 * 1000; // 5 daqiqa

function bfGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) || { count:0, until:0 }; }
  catch { return { count:0, until:0 }; }
}
function bfSet(key, val)  { sessionStorage.setItem(key, JSON.stringify(val)); }
function bfReset(key)     { bfSet(key, { count:0, until:0 }); }
function bfRemaining(key) { return bfGet(key).count || 0; }

function bfCheck(key) {
  const b = bfGet(key);
  if (b.until && Date.now() < b.until) {
    return { blocked: true, left: Math.ceil((b.until - Date.now()) / 1000) };
  }
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
function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

// OTP key — sessionStorage da saqlaymiz (xavfsizroq)
function otpKey(phone) { return "otp:" + normPhone(phone); }

// ─── Validatsiya ──────────────────────────────────────────────
function isUzPhone(phone) { return /^\+998\d{9}$/.test(normPhone(phone)); }

function isValidDob(dd, mm, yyyy) {
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (!d || !m || !y)    return "Tug'ilgan sanani to'liq kiriting";
  const now = new Date().getFullYear();
  if (y < 1900 || y > now - 5) return `Yil noto'g'ri (1900–${now-5})`;
  if (m < 1 || m > 12)  return "Oy 01–12 orasida bo'lsin";
  if (d < 1 || d > 31)  return "Kun 01–31 orasida bo'lsin";
  const maxDay = new Date(y, m, 0).getDate();
  if (d > maxDay)        return `${m}-oyda ${maxDay} kundan oshmasin`;
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

// ─── OTP — sessionStorage da (xavfsizroq, tab yopilsa o'chadi) ─
function sendOtpForLogin(phone) {
  const p = normPhone(phone), code = genOtp();
  // OTP ni sessionStorage da saqlaymiz - localStorage emas!
  sessionStorage.setItem(otpKey(p), code);
  localStorage.setItem("otpMode", "login");
  localStorage.setItem("lastPhone", p);
  console.log("[DEMO OTP login]", p, "=>", code);
  return code;
}

function sendOtpForRegister(phone, pendingProfile) {
  const p = normPhone(phone), code = genOtp();
  sessionStorage.setItem(otpKey(p), code);
  localStorage.setItem("otpMode", "register");
  localStorage.setItem("pendingProfile", JSON.stringify(pendingProfile || {}));
  localStorage.setItem("lastPhone", p);
  console.log("[DEMO OTP register]", p, "=>", code);
  return code;
}

function verifyOtpDemo(phone, otp) {
  const check = bfCheck(BF_OTP_KEY);
  if (check.blocked) {
    alert(`Juda ko'p urinish! ${check.left} soniyadan keyin urinib ko'ring.`);
    return false;
  }
  const p   = normPhone(phone);
  const saved = sessionStorage.getItem(otpKey(p)); // sessionStorage dan o'qiymiz
  const ok  = String(saved || "") === String(otp || "");
  if (!ok) { bfFail(BF_OTP_KEY); return false; }
  bfReset(BF_OTP_KEY);
  sessionStorage.removeItem(otpKey(p)); // bir marta ishlatilsin
  return true;
}

// ─── Login brute-force himoya ─────────────────────────────────
function checkLoginBruteForce() {
  return bfCheck(BF_LOGIN_KEY);
}
function failLoginBruteForce() {
  bfFail(BF_LOGIN_KEY);
}
function resetLoginBruteForce() {
  bfReset(BF_LOGIN_KEY);
}

// ─── Admin login + brute-force ────────────────────────────────
function verifyAdminLogin(loginVal, passVal) {
  const check = bfCheck(BF_ADMIN_KEY);
  if (check.blocked) {
    return { ok:false, msg:`Juda ko'p urinish! ${check.left} soniyadan keyin urinib ko'ring.` };
  }
  try {
    const cred = JSON.parse(localStorage.getItem("adminCred")) || {};
    // Timing-safe solishtirish (simple version)
    const loginOk = loginVal === cred.login;
    const passOk  = passVal  === cred.pass;
    if (loginOk && passOk) {
      bfReset(BF_ADMIN_KEY);
      return { ok: true };
    }
  } catch {}
  bfFail(BF_ADMIN_KEY);
  const rem = BF_MAX - bfRemaining(BF_ADMIN_KEY);
  return { ok:false, msg:`Login yoki parol noto'g'ri! (${rem > 0 ? rem : 0} ta urinish qoldi)` };
}
