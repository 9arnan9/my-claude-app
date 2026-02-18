import Anthropic from "@anthropic-ai/sdk";
import express from "express";

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(express.json());
app.use(express.static("public"));

const sessions = {}; // เก็บประวัติแต่ละ session

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "no message" });
  }

  // สร้าง session ใหม่ถ้ายังไม่มี
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  // เพิ่มข้อความผู้ใช้เข้า history
  sessions[sessionId].push({ role: "user", content: message });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: sessions[sessionId],
  });

  const reply = response.content[0].text;

  // เพิ่มคำตอบ Claude เข้า history
  sessions[sessionId].push({ role: "assistant", content: reply });

  res.json({ reply });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});