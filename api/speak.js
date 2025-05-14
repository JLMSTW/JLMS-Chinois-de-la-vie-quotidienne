export default async function handler(req, res) {
  /* ---------- CORS pre‑flight ---------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end(); // No Content
  }

  /* ---------- TTS 處理 ---------- */
  const { text, voice = "shimmer", speed = 1.0 } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
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

  if (!response.ok) {
    const err = await response.json();
    return res.status(500).json({ error: err });
  }

  const { url } = await response.json(); // OpenAI 會回傳 mp3 URL
  return res.status(200).json({ url });
}
