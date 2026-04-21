/**
 * script.js – Student Task Manager Frontend Logic
 * Author: Jayesh
 *
 * Responsibilities:
 *  - loadTasks()   → GET  /api/tasks
 *  - editTask(id)  → GET  /api/tasks/:id  (fills the form)
 *  - saveTask()    → POST /api/tasks  OR  PUT /api/tasks/:id
 *  - deleteTask(id)→ DELETE /api/tasks/:id
 *  - Live search + status filter (client-side)
 *  - Toast notifications
 */

/* ── State ───────────────────────────────────────────────────────────────── */
let allTasks   = [];   // cache of all tasks returned by the API
let isEditing  = false;

/* ── DOM Refs ────────────────────────────────────────────────────────────── */
const taskForm    = document.getElementById('taskForm');
const taskIdInput = document.getElementById('task_id');
const titleInput  = document.getElementById('title');
const descInput   = document.getElementById('description');
const dateInput   = document.getElementById('due_date');
const statusInput = document.getElementById('status');
const saveBtn     = document.getElementById('saveBtn');
const cancelBtn   = document.getElementById('cancelBtn');
const formMode    = document.getElementById('formMode');
const formError   = document.getElementById('formError');
const tasksBody   = document.getElementById('tasksBody');
const emptyState  = document.getElementById('emptyState');
const loadingState= document.getElementById('loadingState');
const taskCount   = document.getElementById('taskCount');
const searchInput = document.getElementById('searchInput');
const filterStatus= document.getElementById('filterStatus');
const toast       = document.getElementById('toast');

/* ── Toast Helper ────────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

/* ── Render Helpers ──────────────────────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    'pending':     { cls: 'badge-pending',     icon: '⏳' },
    'in-progress': { cls: 'badge-in-progress', icon: '🔄' },
    'completed':   { cls: 'badge-completed',   icon: '✅' }
  };
  const s = map[status] || { cls: 'badge-pending', icon: '⏳' };
  return `<span class="badge ${s.cls}">${s.icon} ${status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '<span style="color:var(--clr-muted)">—</span>';
  // dateStr from MySQL may look like "2025-05-01T00:00:00.000Z"
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

/* ── Render Table ────────────────────────────────────────────────────────── */
function renderTable(tasks) {
  if (tasks.length === 0) {
    tasksBody.innerHTML = '';
    emptyState.style.display = 'flex';
    taskCount.textContent = '';
    return;
  }

  emptyState.style.display = 'none';
  taskCount.textContent = `Showing ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  tasksBody.innerHTML = tasks.map((task, idx) => `
    <tr id="row-${task.task_id}">
      <td>${idx + 1}</td>
      <td><strong>${escHtml(task.title)}</strong></td>
      <td style="color:var(--clr-muted);max-width:260px;white-space:pre-wrap">${escHtml(task.description || '')}</td>
      <td>${formatDate(task.due_date)}</td>
      <td>${statusBadge(task.status)}</td>
      <td class="actions-cell">
        <button class="btn btn-edit"   onclick="editTask(${task.task_id})"   aria-label="Edit task ${escHtml(task.title)}">✏️ Edit</button>
        <button class="btn btn-delete" onclick="deleteTask(${task.task_id})" aria-label="Delete task ${escHtml(task.title)}">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

/* ── XSS safety ─────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* ── Load Tasks (GET /api/tasks) ─────────────────────────────────────────── */
async function loadTasks() {
  loadingState.style.display = 'flex';
  tasksBody.innerHTML = '';
  emptyState.style.display = 'none';

  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    allTasks = await res.json();
    applyFilters();
  } catch (err) {
    console.error('loadTasks error:', err);
    emptyState.style.display = 'flex';
    emptyState.innerHTML = '<span class="empty-icon">⚠️</span><p>Could not load tasks. Is the server running?</p>';
    showToast('Failed to load tasks', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

/* ── Client-side Filter & Search ─────────────────────────────────────────── */
function applyFilters() {
  const query  = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;

  let filtered = allTasks;

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  if (query) {
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query)
    );
  }

  renderTable(filtered);
}

searchInput.addEventListener('input',  applyFilters);
filterStatus.addEventListener('change', applyFilters);

/* ── Form Reset ──────────────────────────────────────────────────────────── */
function resetForm() {
  taskIdInput.value = '';
  titleInput.value  = '';
  descInput.value   = '';
  dateInput.value   = '';
  statusInput.value = 'pending';
  formError.textContent  = '';
  formMode.textContent   = '➕ Add New Task';
  saveBtn.textContent    = '💾 Save Task';
  cancelBtn.style.display = 'none';
  isEditing = false;
}

/* ── Edit Task (GET /api/tasks/:id) ──────────────────────────────────────── */
async function editTask(id) {
  try {
    const res = await fetch(`/api/tasks/${id}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const task = await res.json();

    taskIdInput.value = task.task_id;
    titleInput.value  = task.title;
    descInput.value   = task.description || '';
    statusInput.value = task.status;

    // Strip to YYYY-MM-DD for the date input
    if (task.due_date) {
      const d = new Date(task.due_date);
      if (!isNaN(d)) {
        dateInput.value = d.toISOString().split('T')[0];
      } else {
        dateInput.value = task.due_date;
      }
    } else {
      dateInput.value = '';
    }

    formMode.textContent   = '✏️ Edit Task';
    saveBtn.textContent    = '💾 Update Task';
    cancelBtn.style.display = 'inline-flex';
    formError.textContent  = '';
    isEditing = true;

    // Scroll form into view
    taskForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    titleInput.focus();
  } catch (err) {
    console.error('editTask error:', err);
    showToast('Could not load task details', 'error');
  }
}

/* ── Cancel Edit ─────────────────────────────────────────────────────────── */
cancelBtn.addEventListener('click', resetForm);

/* ── Save Task (POST or PUT) ─────────────────────────────────────────────── */
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const taskId = taskIdInput.value;
  const title  = titleInput.value.trim();

  if (!title) {
    formError.textContent = '⚠️ Title is required.';
    titleInput.focus();
    return;
  }

  formError.textContent = '';

  const data = {
    title,
    description: descInput.value.trim(),
    due_date:    dateInput.value   || null,
    status:      statusInput.value
  };

  const url    = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
  const method = taskId ? 'PUT' : 'POST';

  saveBtn.disabled    = true;
  saveBtn.textContent = '⏳ Saving…';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server returned ${res.status}`);
    }

    showToast(taskId ? '✅ Task updated!' : '✅ Task created!');
    resetForm();
    await loadTasks();
  } catch (err) {
    console.error('saveTask error:', err);
    formError.textContent = `⚠️ ${err.message}`;
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = isEditing ? '💾 Update Task' : '💾 Save Task';
  }
});

/* ── Delete Task (DELETE /api/tasks/:id) ─────────────────────────────────── */
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server returned ${res.status}`);
    }

    // Animate row out before reloading
    const row = document.getElementById(`row-${id}`);
    if (row) {
      row.style.transition = 'opacity 0.3s, transform 0.3s';
      row.style.opacity    = '0';
      row.style.transform  = 'translateX(15px)';
      await new Promise(r => setTimeout(r, 300));
    }

    showToast('🗑️ Task deleted');
    await loadTasks();
  } catch (err) {
    console.error('deleteTask error:', err);
    showToast(err.message, 'error');
  }
}

/* ── Init ─────────────────────────────────────────────────── */
loadTasks();
