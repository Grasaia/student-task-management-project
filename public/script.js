/* ============================================================
   Taskify – Frontend Application Logic
   SPA router, API layer, all four views, dark mode, toast
   ============================================================ */

'use strict';

// Normalise a due_date from the API (may be a Date object or ISO string)
function normDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  return null;
}

// ── State ──────────────────────────────────────────────────────────────────────
let allTasks       = [];
let currentFilter  = 'all';
let currentView    = 'dashboard';
let calDate        = new Date();      // calendar month/year cursor
let editingId      = null;           // task being edited (null = new)
let pendingDeleteId= null;
let searchQuery    = '';

// Project colours (cycling)
const PROJECT_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];

// ── DOM helpers ────────────────────────────────────────────────────────────────
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initNav();
  initSearch();
  initModal();
  initDeleteModal();
  initSettings();
  loadTasks();
});

// ══════════════════════════════════════════════════════════════ DARK MODE ══════
function initDarkMode() {
  const isDark = localStorage.getItem('taskify-dark') === 'true';
  if (isDark) applyDark(true);

  $('#darkModeToggle').addEventListener('click', () => {
    const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyDark(!nowDark);
  });
  $('#settingsDarkMode').addEventListener('click', () => {
    const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyDark(!nowDark);
  });
}

function applyDark(on) {
  document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
  localStorage.setItem('taskify-dark', on);
  $('#darkModeToggle').classList.toggle('active', on);
  const sBtn = $('#settingsDarkMode');
  sBtn.classList.toggle('active', on);
  sBtn.setAttribute('aria-checked', on);
}

// ══════════════════════════════════════════════════════════════ NAVIGATION ═════
const VIEW_META = {
  dashboard: { title: 'Dashboard',  subtitle: "Here's your academic progress for today." },
  calendar:  { title: 'Calendar',   subtitle: 'View your tasks by due date.'             },
  projects:  { title: 'Projects',   subtitle: 'Tasks organised by subject and project.'  },
  settings:  { title: 'Settings',   subtitle: 'Customise your Taskify experience.'       },
};

function initNav() {
  $$('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
  // Add Task button visible on all views
  $('#addTaskBtn').addEventListener('click', () => openModal());
}

function switchView(view) {
  if (view === currentView) return;
  currentView = view;

  // Update nav highlights
  $$('.nav-item').forEach(l => l.classList.toggle('active', l.dataset.view === view));

  // Update topbar text
  const meta = VIEW_META[view] || VIEW_META.dashboard;
  $('#pageTitle').textContent    = meta.title;
  $('#pageSubtitle').textContent = meta.subtitle;

  // Show/hide views
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');

  // Render view-specific content
  if (view === 'calendar') renderCalendar();
  if (view === 'projects') renderProjects();
}

// ══════════════════════════════════════════════════════════════ API LAYER ══════
async function apiGet(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json();
}
async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Request failed'); }
  return r.json();
}
async function apiPut(url, body) {
  const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Request failed'); }
  return r.json();
}
async function apiPatch(url, body) {
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Request failed'); }
  return r.json();
}
async function apiDelete(url) {
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Request failed'); }
  return r.json();
}

// ══════════════════════════════════════════════════════════════ LOAD TASKS ═════
async function loadTasks() {
  showLoading(true);
  try {
    allTasks = await apiGet('/api/tasks');
    renderDashboard();
    loadStats();
    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'projects') renderProjects();
  } catch (err) {
    showToast('Failed to load tasks: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function loadStats() {
  try {
    const stats = await apiGet('/api/stats');
    const wTotal     = parseInt(stats.weeklyTotal)     || 0;
    const wCompleted = parseInt(stats.weeklyCompleted) || 0;
    const pct = wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0;

    $('#progressPercent').textContent = `${pct}%`;
    $('#progressBar').style.width     = `${pct}%`;
    $('#progressText').textContent    = wTotal > 0
      ? `You've completed ${wCompleted} out of ${wTotal} tasks this week. Keep it up!`
      : "No tasks due this week — you're all caught up!";
  } catch (_) { /* stats failure is non-critical */ }
}

// ══════════════════════════════════════════════════════════════ DASHBOARD ══════
function initSearch() {
  const inp = $('#searchInput');
  inp.addEventListener('input', () => {
    searchQuery = inp.value.trim().toLowerCase();
    renderDashboard();
  });
  $$('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      $$('.filter-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      renderDashboard();
    });
  });
}

function renderDashboard() {
  // Update tab counts
  const counts = { all: allTasks.length, pending: 0, 'in-progress': 0, completed: 0 };
  allTasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
  $('#count-all').textContent       = counts.all;
  $('#count-pending').textContent   = counts.pending;
  $('#count-inprogress').textContent= counts['in-progress'];
  $('#count-completed').textContent = counts.completed;

  // Filter + search
  let tasks = allTasks;
  if (currentFilter !== 'all') tasks = tasks.filter(t => t.status === currentFilter);
  if (searchQuery) tasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery) ||
    (t.description || '').toLowerCase().includes(searchQuery)
  );

  const grid = $('#taskGrid');
  const empty = $('#emptyState');

  if (!tasks.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = tasks.map(taskCard).join('');

  // Attach events
  $$('.task-checkbox', grid).forEach(cb => {
    cb.addEventListener('change', () => toggleStatus(parseInt(cb.dataset.id), cb.checked));
  });
  $$('.task-edit-btn', grid).forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
  $$('.task-del-btn', grid).forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
  });
}

function taskCard(t) {
  const isCompleted = t.status === 'completed';
  const badge = badgeHTML(t.status);
  const due   = dueDateHTML(t.due_date);
  return `
  <article class="task-card ${isCompleted ? 'is-completed' : ''}" data-id="${t.task_id}">
    <div class="task-card-top">
      <input type="checkbox" class="task-checkbox" data-id="${t.task_id}"
             ${isCompleted ? 'checked' : ''} aria-label="Mark complete" />
      <div class="task-title-wrap">
        <p class="task-title">${escHtml(t.title)}</p>
      </div>
      ${badge}
    </div>
    ${t.description ? `<p class="task-desc">${escHtml(t.description)}</p>` : ''}
    <div class="task-card-footer">
      ${due}
      <div class="task-actions">
        <button class="task-action-btn task-edit-btn" data-id="${t.task_id}" aria-label="Edit task" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="task-action-btn del task-del-btn" data-id="${t.task_id}" aria-label="Delete task" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  </article>`;
}

function badgeHTML(status) {
  const map = {
    'pending':     ['badge-pending',  'Pending'],
    'in-progress': ['badge-progress', 'In Progress'],
    'completed':   ['badge-completed','Completed'],
  };
  const [cls, label] = map[status] || ['badge-pending','Pending'];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function dueDateHTML(due_date) {
  if (!due_date) return '<span></span>';
  // mysql2 may return a JS Date object; normalise to a YYYY-MM-DD string first
  let dateStr = due_date;
  if (due_date instanceof Date) {
    dateStr = due_date.toISOString().slice(0, 10);
  } else if (typeof due_date === 'string' && due_date.includes('T')) {
    dateStr = due_date.slice(0, 10);
  }
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '<span></span>';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((d - today) / 86400000);
  let label, overdue = false;
  if (diff === 0)       label = 'Today';
  else if (diff === -1) label = 'Yesterday';
  else if (diff === 1)  label = 'Tomorrow';
  else                  label = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  if (diff < 0) overdue = true;

  return `<span class="task-due ${overdue ? 'overdue' : ''}">
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ${label}
  </span>`;
}

function showLoading(on) {
  $('#loadingState').style.display = on ? 'flex' : 'none';
}

// ══════════════════════════════════════════════════════════════ STATUS TOGGLE ══
async function toggleStatus(id, checked) {
  const newStatus = checked ? 'completed' : 'pending';
  try {
    await apiPatch(`/api/tasks/${id}/status`, { status: newStatus });
    const t = allTasks.find(x => x.task_id === id);
    if (t) t.status = newStatus;
    renderDashboard();
    loadStats();
    if (currentView === 'projects') renderProjects();
    showToast(checked ? '✅ Task marked complete!' : '⏳ Task marked pending', 'success');
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════ CALENDAR VIEW ══
function renderCalendar() {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  $('#calMonthTitle').textContent = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const daysInPrev= new Date(year, month, 0).getDate();

  const today = new Date();

  // Build task lookup: date-string → [tasks]
  const tasksByDate = {};
  allTasks.forEach(t => {
    const key = normDate(t.due_date);
    if (!key) return;
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  });

  const grid = $('#calendarGrid');
  // Remove old day cells (keep headers = first 7 children)
  $$('.cal-day-cell', grid).forEach(c => c.remove());

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const cell = makeDayCell(daysInPrev - i, year, month - 1, true, today, tasksByDate);
    grid.appendChild(cell);
  }
  // Current month
  for (let d = 1; d <= daysInMon; d++) {
    const cell = makeDayCell(d, year, month, false, today, tasksByDate);
    grid.appendChild(cell);
  }
  // Next month filler
  const total = firstDay + daysInMon;
  const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remain; d++) {
    const cell = makeDayCell(d, year, month + 1, true, today, tasksByDate);
    grid.appendChild(cell);
  }

  // Month task list
  renderCalendarTaskList(year, month, tasksByDate);

  // Nav buttons
  $('#calPrev').onclick = () => { calDate = new Date(year, month - 1, 1); renderCalendar(); };
  $('#calNext').onclick = () => { calDate = new Date(year, month + 1, 1); renderCalendar(); };
}

function makeDayCell(day, year, month, otherMonth, today, tasksByDate) {
  const cell = document.createElement('div');
  cell.className = 'cal-day-cell' + (otherMonth ? ' other-month' : '');

  const dateKey = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const isToday = !otherMonth &&
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  if (isToday) cell.classList.add('is-today');

  const numEl = document.createElement('span');
  numEl.className = 'cal-day-num';
  numEl.textContent = day;
  cell.appendChild(numEl);

  const dayTasks = tasksByDate[dateKey] || [];
  const maxShow = 2;
  dayTasks.slice(0, maxShow).forEach(t => {
    const chip = document.createElement('span');
    chip.className = `cal-chip ${t.status === 'in-progress' ? 'in-progress' : t.status}`;
    chip.textContent = t.title;
    chip.title = t.title;
    chip.addEventListener('click', () => openModal(t.task_id));
    cell.appendChild(chip);
  });
  if (dayTasks.length > maxShow) {
    const more = document.createElement('span');
    more.className = 'cal-more';
    more.textContent = `+${dayTasks.length - maxShow} more`;
    cell.appendChild(more);
  }
  return cell;
}

function renderCalendarTaskList(year, month, tasksByDate) {
  const monthTasks = allTasks.filter(t => {
    const nd = normDate(t.due_date);
    if (!nd) return false;
    const d = new Date(nd + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  }).sort((a, b) => new Date(normDate(a.due_date)) - new Date(normDate(b.due_date)));

  const container = $('#calendarTaskItems');
  const empty     = $('#calEmptyState');

  if (!monthTasks.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const dotClass = { pending: 'dot-pending', 'in-progress': 'dot-progress', completed: 'dot-completed' };

  container.innerHTML = monthTasks.map(t => {
    const nd = normDate(t.due_date);
    const d = nd ? new Date(nd + 'T00:00:00') : null;
    const dateStr = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return `
    <div class="cal-task-row">
      <div class="cal-task-info">
        <div class="cal-dot ${dotClass[t.status] || 'dot-pending'}"></div>
        <span class="cal-task-name">${escHtml(t.title)}</span>
      </div>
      <span class="cal-task-date">${dateStr}</span>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════ PROJECTS VIEW ══
function renderProjects() {
  const container = $('#projectsContainer');
  const empty     = $('#projectsEmptyState');

  if (!allTasks.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Group by project field
  const groups = {};
  allTasks.forEach(t => {
    const proj = (t.project || 'General').trim();
    if (!groups[proj]) groups[proj] = [];
    groups[proj].push(t);
  });

  const projectNames = Object.keys(groups).sort();
  container.innerHTML = projectNames.map((proj, i) => {
    const tasks = groups[proj];
    const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
    const rows = tasks.map(t => projectTaskRow(t)).join('');
    return `
    <div class="project-group" id="proj-${encodeURIComponent(proj)}">
      <div class="project-group-header">
        <div class="project-group-title-wrap">
          <div class="project-color-dot" style="background:${color}"></div>
          <h2 class="project-name">${escHtml(proj)}</h2>
          <span class="project-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
        </div>
        <button class="project-add-btn" data-project="${escHtml(proj)}">+ Add Task</button>
      </div>
      <div class="project-task-list">${rows}</div>
    </div>`;
  }).join('');

  // Attach events
  $$('.project-add-btn', container).forEach(btn => {
    btn.addEventListener('click', () => openModal(null, btn.dataset.project));
  });
  $$('.proj-cb', container).forEach(cb => {
    cb.addEventListener('change', () => toggleStatus(parseInt(cb.dataset.id), cb.checked));
  });
  $$('.proj-edit-btn', container).forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
  $$('.proj-del-btn', container).forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
  });
}

function projectTaskRow(t) {
  const done = t.status === 'completed';
  const nd   = normDate(t.due_date);
  const due  = nd ? new Date(nd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return `
  <div class="project-task-row">
    <input type="checkbox" class="proj-checkbox proj-cb" data-id="${t.task_id}" ${done ? 'checked' : ''} />
    <span class="project-task-name ${done ? 'done' : ''}">${escHtml(t.title)}</span>
    ${due ? `<span class="project-task-due">${due}</span>` : ''}
    <div class="project-task-actions">
      <button class="task-action-btn proj-edit-btn" data-id="${t.task_id}" aria-label="Edit" title="Edit">
        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="task-action-btn del proj-del-btn" data-id="${t.task_id}" aria-label="Delete" title="Delete">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════ TASK MODAL ══════
function initModal() {
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  $('#taskModal').addEventListener('click', e => { if (e.target === $('#taskModal')) closeModal(); });
  $('#modalSave').addEventListener('click', saveTask);
  $('#taskTitle').addEventListener('keydown', e => { if (e.key === 'Enter') saveTask(); });
}

function openModal(id = null, presetProject = '') {
  editingId = id;
  const modal = $('#taskModal');
  const title = $('#modalTitle');
  const err   = $('#formError');

  err.textContent = '';
  $('#taskId').value          = '';
  $('#taskTitle').value       = '';
  $('#taskStatus').value      = 'pending';
  $('#taskDueDate').value     = '';
  $('#taskProject').value     = presetProject || '';
  $('#taskDescription').value = '';

  if (id !== null) {
    const t = allTasks.find(x => x.task_id === id);
    if (!t) return;
    title.textContent           = 'Edit Task';
    $('#taskId').value          = t.task_id;
    $('#taskTitle').value       = t.title;
    $('#taskStatus').value      = t.status;
    $('#taskDueDate').value     = t.due_date ? t.due_date.slice(0, 10) : '';
    $('#taskProject').value     = t.project || 'General';
    $('#taskDescription').value = t.description || '';
  } else {
    title.textContent = 'Add New Task';
  }

  modal.style.display = 'flex';
  setTimeout(() => $('#taskTitle').focus(), 100);
}

function closeModal() {
  $('#taskModal').style.display = 'none';
  editingId = null;
}

async function saveTask() {
  const title   = $('#taskTitle').value.trim();
  const status  = $('#taskStatus').value;
  const dueDate = $('#taskDueDate').value;
  const project = $('#taskProject').value.trim() || 'General';
  const desc    = $('#taskDescription').value.trim();
  const err     = $('#formError');

  if (!title) { err.textContent = 'Task title is required.'; return; }
  err.textContent = '';

  const payload = { title, description: desc, due_date: dueDate || null, status, project };
  const btn = $('#modalSave');
  btn.textContent = 'Saving…'; btn.disabled = true;

  try {
    if (editingId !== null) {
      await apiPut(`/api/tasks/${editingId}`, payload);
      showToast('✅ Task updated!', 'success');
    } else {
      await apiPost('/api/tasks', payload);
      showToast('✅ Task created!', 'success');
    }
    closeModal();
    await loadTasks();
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.textContent = 'Save Task'; btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════ DELETE MODAL ════
function initDeleteModal() {
  $('#deleteModalClose').addEventListener('click', closeDeleteModal);
  $('#deleteCancelBtn').addEventListener('click', closeDeleteModal);
  $('#deleteModal').addEventListener('click', e => { if (e.target === $('#deleteModal')) closeDeleteModal(); });
  $('#deleteConfirmBtn').addEventListener('click', confirmDelete);
}

function openDeleteModal(id) {
  pendingDeleteId = id;
  const t = allTasks.find(x => x.task_id === id);
  $('#deleteTaskName').textContent = t ? t.title : 'this task';
  $('#deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  $('#deleteModal').style.display = 'none';
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  const btn = $('#deleteConfirmBtn');
  btn.textContent = 'Deleting…'; btn.disabled = true;
  try {
    await apiDelete(`/api/tasks/${pendingDeleteId}`);
    showToast('🗑️ Task deleted.', 'success');
    closeDeleteModal();
    await loadTasks();
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Delete Task'; btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════ SETTINGS ════════
function initSettings() {
  // Toggle buttons (notifications etc)
  $$('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const on = !btn.classList.contains('active');
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', on);
    });
  });

  // Color swatches
  $$('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      $$('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      document.documentElement.style.setProperty('--primary', sw.dataset.color);
      // Derive hover (slightly darker) via filter
      document.documentElement.style.setProperty('--primary-hover', sw.dataset.color);
      localStorage.setItem('taskify-color', sw.dataset.color);
    });
  });

  // Restore saved accent color
  const saved = localStorage.getItem('taskify-color');
  if (saved) {
    document.documentElement.style.setProperty('--primary', saved);
    $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === saved));
  }

  // Save profile
  $('#saveProfileBtn').addEventListener('click', () => {
    const first = $('#settingsFirstName').value.trim();
    const last  = $('#settingsLastName').value.trim();
    if (first && last) {
      const initials = (first[0] + last[0]).toUpperCase();
      $('.user-avatar').textContent  = initials;
      $('#settingsAvatar').textContent = initials;
      localStorage.setItem('taskify-name', JSON.stringify({ first, last }));
    }
    showToast('✅ Profile saved!', 'success');
  });

  // Restore saved name
  const savedName = localStorage.getItem('taskify-name');
  if (savedName) {
    const { first, last } = JSON.parse(savedName);
    $('#settingsFirstName').value = first;
    $('#settingsLastName').value  = last;
    const initials = (first[0] + last[0]).toUpperCase();
    $('.user-avatar').textContent  = initials;
    $('#settingsAvatar').textContent = initials;
  }

  // Clear all
  $('#clearAllBtn').addEventListener('click', async () => {
    if (!confirm('This will permanently delete ALL tasks. Are you sure?')) return;
    try {
      const ids = allTasks.map(t => t.task_id);
      await Promise.all(ids.map(id => apiDelete(`/api/tasks/${id}`)));
      showToast('All tasks cleared.', 'success');
      await loadTasks();
    } catch (e) {
      showToast('Clear failed: ' + e.message, 'error');
    }
  });
}

// ══════════════════════════════════════════════════════════════ TOAST ═══════════
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

// ══════════════════════════════════════════════════════════════ UTILS ══════════
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
