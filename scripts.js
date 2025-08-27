// Firebase ile giriş/kayıt + Firestore bağlaması
// 1) Aşağıdaki firebaseConfig'i kendi projenle değiştir.
// 2) Authentication > Sign-in method'da Email/Password ve Google'ı etkinleştir.
// 3) Firestore'u oluştur (prod ya da test).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// TODO: kendi anahtarlarınla değiştir
const firebaseConfig = {
  apiKey: "AIzaSyCOl6zi6pjpRCn2jGGf7QXTvJ4UIJ4vYPs",
  authDomain: "worrtex-23ffb.firebaseapp.com",
  databaseURL: "https://worrtex-23ffb-default-rtdb.firebaseio.com",
  projectId: "worrtex-23ffb",
  storageBucket: "worrtex-23ffb.firebasestorage.app",
  messagingSenderId: "1065142135774",
  appId: "1:1065142135774:web:f8f4d738954fc90b56cb4f",
  measurementId: "G-ZC6E30BEL7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const authBtn = qs("#authBtn");
const logoutBtn = qs("#logoutBtn");
const userChip = qs("#userChip");
const userEmailEl = qs("#userEmail");
const modal = qs("#authModal");
const closeAuth = qs("#closeAuth");
const tabs = qsa(".tab");
const loginForm = qs("#loginForm");
const signupForm = qs("#signupForm");
const authMsg = qs("#authMsg");
const googleLogin = qs("#googleLogin");
const googleSignup = qs("#googleSignup");
const provider = new GoogleAuthProvider();

// ---- UI helpers ----
function openModal() { modal.style.display = "block"; modal.setAttribute("aria-hidden", "false"); }
function closeModal() { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); authMsg.textContent = ""; }
window.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(); });
closeAuth?.addEventListener("click", closeModal);
authBtn?.addEventListener("click", openModal);

// Tab switch
tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const key = t.dataset.tab;
    if (key === "login") { loginForm.classList.remove("hidden"); signupForm.classList.add("hidden"); }
    else { signupForm.classList.remove("hidden"); loginForm.classList.add("hidden"); }
    authMsg.textContent = "";
  });
});

// ---- Auth flow ----
loginForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = qs("#loginEmail").value.trim();
  const pass = qs("#loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    authMsg.textContent = "Giriş başarılı, yönlendiriliyorsun...";
    closeModal();
  } catch (err) {
    authMsg.textContent = parseError(err);
  }
});

signupForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const displayName = qs("#signupName").value.trim();
  const email = qs("#signupEmail").value.trim();
  const pass = qs("#signupPassword").value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp()
    });
    authMsg.textContent = "Kayıt tamamlandı!";
    closeModal();
  } catch (err) {
    authMsg.textContent = parseError(err);
  }
});

googleLogin?.addEventListener("click", () => popupWithGoogle());
googleSignup?.addEventListener("click", () => popupWithGoogle());

async function popupWithGoogle(){
  try {
    const result = await signInWithPopup(auth, provider);
    // Firestore'da kullanıcı dokümanı yoksa oluştur
    const u = result.user;
    const ref = doc(db, "users", u.uid);
    await setDoc(ref, { email: u.email, displayName: u.displayName || "", provider: "google", createdAt: serverTimestamp() }, { merge: true });
    closeModal();
  } catch (err) {
    authMsg.textContent = parseError(err);
  }
}

// Çıkış
logoutBtn?.addEventListener("click", async ()=>{
  await signOut(auth);
});

// Yetki gerektiren işlemler (ör: satın al/indir) -> login zorunlu
qsa(".buy-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) {
      openModal();
      authMsg.textContent = "İndirmek için önce giriş yapman lazım.";
      return;
    }
    // Burada gerçek indirme/satın alma akışını tetikle
    // Örn: window.location.href = `/download/${btn.dataset.sku}`;
    alert("Bağlandın! (demo) -> " + btn.dataset.sku);
  });
});

// Auth durumuna göre UI güncelle
onAuthStateChanged(auth, (user) => {
  const isAuthed = !!user;
  userChip.classList.toggle("hidden", !isAuthed);
  logoutBtn.classList.toggle("hidden", !isAuthed);
  authBtn.classList.toggle("hidden", isAuthed);
  userEmailEl.textContent = isAuthed ? (user.displayName || user.email) : "";
});

function parseError(err){
  const code = err?.code || "";
  if(code.includes("auth/invalid-credential")) return "E-posta veya şifre hatalı 😵";
  if(code.includes("auth/email-already-in-use")) return "Bu e-posta zaten kayıtlı.";
  if(code.includes("auth/weak-password")) return "Şifre en az 6 karakter olmalı.";
  if(code.includes("auth/popup-blocked")) return "Tarayıcı açılır pencereyi engelledi.";
  return "Bir şeyler ters gitti: " + (code || err.message);
}
