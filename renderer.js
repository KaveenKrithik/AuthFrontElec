const form = document.getElementById("loginForm");
const emailEl = document.getElementById("email");
const pwEl = document.getElementById("password");

const bioBtn = document.getElementById("bioBtn");
const signInBtn = document.getElementById("signInBtn");
const errorBox = document.getElementById("errorBox");
const togglePw = document.getElementById("togglePw");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}
function clearError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

function setBtnLoading(btn, on, loadingText, normalText) {
  btn.disabled = on;
  btn.textContent = on ? loadingText : normalText;
}

togglePw?.addEventListener("click", () => {
  const isPassword = pwEl.type === "password";
  pwEl.type = isPassword ? "text" : "password";
  togglePw.textContent = isPassword ? "Hide" : "Show";
});

function b64urlEncode(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str) {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(n = 32) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

// ✅ Windows Hello using WebAuthn platform authenticator (Passkey)
async function windowsHelloAuth() {
  if (!window.isSecureContext) {
    throw new Error("WebAuthn needs a secure context. (Use app://local as configured in main.js)");
  }
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn not supported in this runtime.");
  }

  const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
  if (!available) throw new Error("Windows Hello (platform authenticator) not available on this device.");

  const rpId = location.hostname || "local";
  const email = (emailEl.value || "user@local").trim();

  const storedCredId = localStorage.getItem("webauthn_cred_id");

  // First time: create a passkey (enroll)
  if (!storedCredId) {
    const cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: "AuthFrontElec", id: rpId },
        user: {
          id: randomBytes(32), // local demo user id
          name: email,
          displayName: email,
        },
        challenge: randomBytes(32),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (!cred) throw new Error("Passkey creation cancelled.");

    // Store credential id locally (DEMO). Real apps store + verify on a server.
    localStorage.setItem("webauthn_cred_id", b64urlEncode(cred.rawId));
    return true;
  }

  // Next times: sign in with the existing passkey
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: rpId,
      userVerification: "required",
      allowCredentials: [{ type: "public-key", id: b64urlDecode(storedCredId) }],
      timeout: 60000,
    },
  });

  if (!assertion) throw new Error("Windows Hello cancelled.");
  return true;
}

// ✅ macOS Touch ID via Electron API
async function macTouchIdAuth() {
  if (!window.api?.touchIdPrompt) throw new Error("Touch ID bridge not available (preload.js).");
  const res = await window.api.touchIdPrompt("Sign in to AuthFrontElec");
  if (!res?.ok) throw new Error(res?.error || "Touch ID failed.");
  return true;
}

// One button: tries Windows Hello WebAuthn first; on mac uses Touch ID
bioBtn.addEventListener("click", async () => {
  clearError();
  setBtnLoading(bioBtn, true, "Authenticating…", "Use biometrics");

  try {
    const isWindows = navigator.userAgent.toLowerCase().includes("windows");
    const isMac = navigator.userAgent.toLowerCase().includes("mac");

    let ok = false;

    if (isWindows) ok = await windowsHelloAuth();
    else if (isMac) ok = await macTouchIdAuth();
    else throw new Error("Biometrics not implemented for this OS in this demo.");

    if (ok) {
      bioBtn.textContent = "Signed in ✅";
      bioBtn.disabled = true;
      signInBtn.disabled = true;
    }
  } catch (e) {
    showError(e?.message || String(e));
  } finally {
    setBtnLoading(bioBtn, false, "Authenticating…", "Use biometrics");
  }
});

// Password fallback (demo only)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email = emailEl.value.trim();
  const password = pwEl.value;

  if (!email.includes("@")) return showError("Enter a valid email.");
  if (password.length < 6) return showError("Password must be at least 6 characters.");

  setBtnLoading(signInBtn, true, "Signing in…", "Sign in with password");
  await new Promise((r) => setTimeout(r, 400));
  signInBtn.textContent = "Signed in ✅";
  signInBtn.disabled = true;
  bioBtn.disabled = true;
});