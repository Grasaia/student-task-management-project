// app.js – Main Express server entry point
const express = require('express');
const path    = require('path');

const app  = express();
const port = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────────────────────
const taskRoutes  = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);

// ── SPA Fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Taskify running at http://localhost:${port}`);
});
