import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 處理登入按鈕
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // 登入成功 → 導向主頁
      window.location.href = "home.html";
    })
    .catch((error) => {
      document.getElementById("errorMsg").textContent =
        "登入失敗：" + error.message;
    });
});
