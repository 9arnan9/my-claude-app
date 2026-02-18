import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "no message" });
  }

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

  const reply = respons