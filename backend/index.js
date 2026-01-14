const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" })); 

// in-memory store (Tier2)
let annotations = [];

// health
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// GET /annotations
app.get("/annotations", (req, res) => {
  res.json({ items: annotations });
});

// POST /annotations
app.post("/annotations", (req, res) => {
  const body = req.body || {};

  if (!body.position || typeof body.text !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const item = {
    id: nanoid(),
    text: body.text,
    position: body.position, // {x,y,z}
    createdAt: new Date().toISOString(),
  };

  annotations.unshift(item);
  res.status(201).json(item);
});

// DELETE /annotations/:id
app.delete("/annotations/:id", (req, res) => {
  const { id } = req.params;
  const before = annotations.length;
  annotations = annotations.filter((x) => x.id !== id);
  const removed = before !== annotations.length;
  res.json({ removed });
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
