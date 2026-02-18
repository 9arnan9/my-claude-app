import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

await pool.query(`CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)`);

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: "no message" });

  const result = await pool.query(
    "SELECT role, content FROM messages WHERE session_id = $1 ORDER BY created_at ASC",
    [sessionId]
  );
  const messages = result.rows.map((r) => ({ role: r.role, content: r.content }));
  messages.push({ role: "user", content: message });

  await pool.query(
    "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
    [sessionId, "user", JSON.stringify(message)]
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages,
  });

  const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");

  await pool.query(
    "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3)",
    [sessionId, "assistant", JSON.stringify(reply)]
  );

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

app.listen(process.env.PORT || 3000, () => console.log("Server running"));