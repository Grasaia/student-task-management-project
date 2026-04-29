// routes/tasks.js – RESTful route handlers for /api/tasks
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── GET /api/tasks  (supports ?status= and ?search=) ─────────────────────────
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql    = 'SELECT * FROM tasks';
  const params = [];
  const where  = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY due_date ASC';

  db.query(sql, params, (err, results) => {
    if (err) { console.error('GET /api/tasks error:', err); return res.status(500).json({ error: err.message }); }
    res.json(results);
  });
});

// ── GET /api/tasks/:id ────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  db.query('SELECT * FROM tasks WHERE task_id = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  });
});

// ── POST /api/tasks ───────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { title, description, due_date, status, project } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const sql = 'INSERT INTO tasks (title, description, due_date, status, project) VALUES (?, ?, ?, ?, ?)';
  const vals = [title, description || '', due_date || null, status || 'pending', project || 'General'];

  db.query(sql, vals, (err, result) => {
    if (err) {
      // If project column doesn't exist yet, fall back without it
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const sql2 = 'INSERT INTO tasks (title, description, due_date, status) VALUES (?, ?, ?, ?)';
        db.query(sql2, [title, description || '', due_date || null, status || 'pending'], (err2, r2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json({ task_id: r2.insertId, message: 'Task created' });
        });
        return;
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ task_id: result.insertId, message: 'Task created' });
  });
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { title, description, due_date, status, project } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const sql = 'UPDATE tasks SET title=?, description=?, due_date=?, status=?, project=? WHERE task_id=?';
  const vals = [title, description || '', due_date || null, status || 'pending', project || 'General', req.params.id];

  db.query(sql, vals, (err, result) => {
    if (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const sql2 = 'UPDATE tasks SET title=?, description=?, due_date=?, status=? WHERE task_id=?';
        db.query(sql2, [title, description || '', due_date || null, status || 'pending', req.params.id], (err2, r2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          if (!r2.affectedRows) return res.status(404).json({ error: 'Task not found' });
          res.json({ message: 'Task updated' });
        });
        return;
      }
      return res.status(500).json({ error: err.message });
    }
    if (!result.affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task updated' });
  });
});

// ── PATCH /api/tasks/:id/status  (quick status toggle) ───────────────────────
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'in-progress', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.query('UPDATE tasks SET status=? WHERE task_id=?', [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result.affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Status updated' });
  });
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM tasks WHERE task_id=?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result.affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  });
});

module.exports = router;
