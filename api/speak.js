export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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
      voice: voice,
      speed: speed,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return res.status(500).json({ error });
  }

  const audioBuffer = await response.arrayBuffer();
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(audioBuffer));
}

