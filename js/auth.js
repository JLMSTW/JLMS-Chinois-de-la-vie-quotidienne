import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence }
        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// 初始化 Firebase
initializeApp(firebaseConfig);
const auth = getAuth();

// 登入按鈕
document.getElementById("loginBtn").addEventListener("click", () => {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  setPersistence(auth, browserLocalPersistence)
    .then(() => signInWithEmailAndPassword(auth, email, password))
    .then(() => {
      localStorage.setItem("jlmsUserEmail", email);
      window.location.href = "dashboard.html";
    })
    .catch(err => {
      document.getElementById("errorMsg").textContent =
        "❌ 登入失敗：" + err.message;
    });
});
