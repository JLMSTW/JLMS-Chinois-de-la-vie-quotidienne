import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js"; // 你剛剛建立的設定檔

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 登入按鈕點擊事件
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // 登入成功，跳轉到主頁
      window.location.href = "home.html";
    })
    .catch((error) => {
      document.getElementById("errorMsg").textContent = "❌ 登入失敗：" + error.message;
    });
});
