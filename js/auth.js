import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword }
        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// 初始化 Firebase
initializeApp(firebaseConfig);
const auth = getAuth();

// 登入按鈕
document.getElementById("loginBtn").addEventListener("click", () => {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      /* 把 email 暫存，讓 home.html 可以拿來查權限 */
      sessionStorage.setItem("jlmsUserEmail", email);
      window.location.href = "home.html";
    })
    .catch(err => {
      document.getElementById("errorMsg").textContent =
        "❌ 登入失敗：" + err.message;
    });
});
