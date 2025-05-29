/* ===== 0. Access-API 端點 ===== */
const accessApi =
  "https://script.google.com/macros/s/AKfycbw1izdhjanSmUX31wlidvpuDsMmP7mXjesBW6s7Nff6a_5G7OYXUEXHBQP9eehyYQs5/exec";

/* ===== 1. 讀 email；若沒有就回到登入頁 ===== */
const email = sessionStorage.getItem("jlmsUserEmail");
if (!email) {
  window.location.href = "index.html";
  throw new Error("no email in sessionStorage");
}

/* ===== 2. 呼叫 API 取得 accessLevel ===== */
fetch(`${accessApi}?email=${encodeURIComponent(email)}`)
  .then(r => r.json())
  .then(data => {
    if (!data.accessLevel) throw new Error("level not found");
    buildBookList(+data.accessLevel);
  })
  .catch(err => {
    alert("權限查詢失敗，請重新登入或聯絡老師");
    console.error(err);
  });

/* ===== 3. 依 accessLevel 產生書冊清單 ===== */
function buildBookList(level) {
  const list = document.getElementById("bookList");
  list.innerHTML = "";

  for (let i = 1; i <= 4; i++) {
    const li = document.createElement("li");
    li.textContent = `Book ${i}`;

    if (i <= level) {
      li.className = "unlocked";
      li.onclick   = () => openBook(i);        // openBook 已在 home.html 定義
    } else {
      li.className = "locked";
      li.style.opacity = 0.4;
    }
    list.appendChild(li);
  }
}
