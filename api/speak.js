export default async function handler(req, res) {
  /* ---------- CORS pre-flight ---------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 預檢請求直接結束
  if (req.method === "OPTIONS") {
    return res.status(204).end();         // No Content
  }

  /* ---------- TTS 處理 ---------- */
  const { text, voice = "shimmer", speed = 1.0 } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    // 向 OpenAI 取得 mp3 🔊
    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        speed,
        response_format: "mp3",
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();           // 可能是 JSON 也可能純文字
      return res.status(openaiRes.status).send(errText);
    }

    // 取得二進位 mp3
    const arrayBuffer = await openaiRes.arrayBuffer();

    // 回傳給前端
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("TTS proxy error:", err);
    return res.status(500).json({ error: "Proxy server error" });
  }
}
