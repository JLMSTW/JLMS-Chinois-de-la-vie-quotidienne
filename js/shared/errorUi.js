// /js/shared/errorUi.js
export function showDataLoadError({ sheetName = "", url = "", hintList = [] } = {}) {
    const host = document.getElementById("loading") || document.body;
    const box = document.createElement("div");
    box.style.cssText = "padding:12px;margin:12px 0;background:#fff4f4;border:1px solid #f5a9a9;border-radius:10px;font:14px/1.5 system-ui";
    box.innerHTML = `
      <b style="color:#b00020">Failed to load ${sheetName || "data"}</b>
      <div style="margin-top:6px;">Try:</div>
      <ul style="margin:6px 0 0 18px">
        ${hintList.map(h => `<li>${h}</li>`).join("")}
      </ul>
      ${url ? `<div style="margin-top:6px;color:#555;"><code>${url}</code></div>` : ""}
    `;
    host.innerHTML = ""; // 清空原本 "Loading…"（若有）
    host.appendChild(box);
  }
  