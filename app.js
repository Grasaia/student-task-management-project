// app.js – Main Express server entry point
// Owned by: Savon

const express = require('express');
const path    = require('path');

const app  = express();
const port = 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());                          // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies

// ── Static Files (Frontend) ───────────────────────────────────────────────────
// Serve everything inside /public as static assets (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────────────────────
const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

// ── Catch-all: serve index.html for any unknown route (SPA fallback) ──────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Student Task Manager running at http://localhost:${port}`);
});
