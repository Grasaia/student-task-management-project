// routes/tasks.js – RESTful route handlers for /api/tasks
// Owned by: Savon

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tasks  →  List all tasks
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM tasks ORDER BY due_date ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('GET /api/tasks error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/:id  →  Get one task by ID
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM tasks WHERE task_id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error('GET /api/tasks/:id error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(results[0]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/tasks  →  Create a new task
// ──────────────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { title, description, due_date, status } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const sql = `
    INSERT INTO tasks (title, description, due_date, status)
    VALUES (?, ?, ?, ?)
  `;
  const values = [
    title,
    description || '',
    due_date    || null,
    status      || 'pending'
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('POST /api/tasks error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ task_id: result.insertId, message: 'Task created' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/tasks/:id  →  Update an existing task
// ──────────────────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { title, description, due_date, status } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const sql = `
    UPDATE tasks
    SET title = ?, description = ?, due_date = ?, status = ?
    WHERE task_id = ?
  `;
  const values = [title, description || '', due_date || null, status || 'pending', req.params.id];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('PUT /api/tasks/:id error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task updated' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id  →  Delete a task
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM tasks WHERE task_id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error('DELETE /api/tasks/:id error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  });
});

module.exports = router;
