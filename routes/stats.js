// routes/stats.js – Aggregated stats for dashboard widgets
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/stats
router.get('/', (req, res) => {
  // Compute start of current week (Monday 00:00)
  const now  = new Date();
  const day  = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const sql = `
    SELECT
      COUNT(*)                                                            AS total,
      SUM(status = 'pending')                                            AS pending,
      SUM(status = 'in-progress')                                        AS inProgress,
      SUM(status = 'completed')                                          AS completed,
      SUM(status = 'completed' AND DATE(due_date) >= ?)                  AS weeklyCompleted,
      SUM(DATE(due_date) >= ?)                                           AS weeklyTotal
    FROM tasks
  `;

  db.query(sql, [weekStartStr, weekStartStr], (err, rows) => {
    if (err) {
      console.error('GET /api/stats error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows[0]);
  });
});

module.exports = router;
