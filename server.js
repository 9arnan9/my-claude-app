import Anthropic from "@anthropic-ai/sdk";
import express from "express";

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(express.json());
app.use(express.static("public"));

const sessions = {};

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "no message" });
  }

  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  sessions[sessionId].push({ role: "user", content: message });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
      }
    ],
    messages: sessions[sessionId],
  });

  // รวบรวมข้อความจาก response
  const reply = response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("");

  sessions[sessionId].push({ role: "assistant", content: response.content });

  res.json({ reply });
});

app.get("/admin", async (req, res) => {
  const result = await pool.query(
    "SELECT session_id, role, created_at FROM messages ORDER BY created_at DESC LIMIT 50"
  );
  
  let html = "<h2>Messages</h2><table border='1' cellpadding='8'><tr><th>Session</th><th>Role</th><th>Time</th></tr>";
  
  for (const row of result.rows) {
    html += `<tr><td>${row.session_id}</td><td>${row.role}</td><td>${row.created_at}</td></tr>`;
  }
  
  html += "</table>";
  res.send(html);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});