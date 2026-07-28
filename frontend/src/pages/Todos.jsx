import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../App.css';
import logo from '../assets/planify-logo.svg';

function formatReadableDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(totalSeconds) {
  const isOver = totalSeconds < 0;
  const abs = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const str = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return isOver ? `+${str}` : str;
}

function useLiveRemaining(task) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!task.started_at) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [task.started_at]);

  const elapsed = task.started_at
    ? task.accumulated_seconds + Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000)
    : task.accumulated_seconds;

  return task.target_duration_seconds - elapsed;
}

/* ---------- Timer expiry alert ---------- */

function playExpiryAlert() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const beep = (startOffset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t0 = ctx.currentTime + startOffset;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    };

    beep(0);
    beep(0.3);
  } catch (e) {
    // Web Audio unavailable — fail silently, visual pulse still applies.
  }
}

function useExpiryAlert(task, remaining, isRunning) {
  const alertedRef = useRef(false);

  // Reset the one-shot alert whenever a task starts a fresh run.
  useEffect(() => {
    alertedRef.current = false;
  }, [task.started_at]);

  useEffect(() => {
    if (isRunning && remaining <= 0 && !alertedRef.current) {
      alertedRef.current = true;
      playExpiryAlert();
    }
  }, [isRunning, remaining]);
}

/* ---------- Icons ---------- */

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Spinner({ size = 14 }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        strokeDasharray="28.3" strokeDashoffset="20"
      />
    </svg>
  );
}

/* ---------- Due date field ---------- */

function DueDateField({ value, onChange }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (inputRef.current.showPicker) {
      inputRef.current.showPicker();
    } else {
      inputRef.current.click();
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="due-date-field">
      <button type="button" className="data-field date-trigger" onClick={openPicker}>
        <CalendarIcon />
        <span>{value ? formatReadableDate(value) : 'Select due date'}</span>
      </button>
      <input
        ref={inputRef}
        type="date"
        min={today}
        max="2100-12-31"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="due-date-hidden-input"
        tabIndex={-1}
      />
    </div>
  );
}

/* ---------- Status / due helpers ---------- */

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#9CA3AF' },
  in_progress: { label: 'In progress', color: '#8B5CF6' },
  done: { label: 'Done', color: '#10B981' },
};

const STATUS_ORDER_LIST = ['in_progress', 'pending', 'done'];

// A todo has no stored status of its own — it's derived from its tasks,
// so there's nothing new to keep in sync on the backend.
// A todo counts as "in progress" as soon as any task has been started
// or finished — it doesn't require a task to be actively running.
const STATUS_SORT_ORDER = { in_progress: 0, pending: 1, done: 2 };

function getTodoStatus(todo) {
  const tasks = todo.tasks || [];
  if (tasks.length === 0) return 'pending';
  if (tasks.every((t) => t.status === 'done')) return 'done';
  if (tasks.some((t) => t.status === 'in_progress' || t.status === 'done')) return 'in_progress';
  return 'pending';
}

function getDueInfo(dueDate) {
  if (!dueDate) return { text: '', status: 'none' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)}d`, status: 'overdue' };
  if (diffDays === 0) return { text: 'Due today', status: 'today' };
  if (diffDays === 1) return { text: 'Due tomorrow', status: 'soon' };
  if (diffDays <= 7) return { text: `${diffDays} days left`, status: 'soon' };
  return {
    text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    status: 'normal',
  };
}

function groupTasks(tasks) {
  return {
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    pending: tasks.filter((t) => t.status === 'pending'),
    done: tasks.filter((t) => t.status === 'done'),
  };
}

function sortTasksByStatus(tasks) {
  const order = { in_progress: 0, pending: 1, done: 2 };
  return [...tasks].sort((a, b) => order[a.status] - order[b.status]);
}

/* ---------- Task card (single line) ---------- */

function TaskCard({ task, onStart, onPause, onFinish, onEdit, onDelete, isActionPending, isDeleting }) {
  const remaining = useLiveRemaining(task);
  const isOver = remaining < 0;
  const isRunning = task.started_at != null;

  useExpiryAlert(task, remaining, isRunning);

  const isExpired = isRunning && isOver && task.status !== 'done';
  const busy = isActionPending || isDeleting;

  return (
    <div className={`task-card task-card--${task.status} ${isExpired ? 'task-card--expired' : ''} ${busy ? 'task-card--busy' : ''}`}>
      <span className="task-card-name" title={task.name}>{task.name}</span>
      <span className={`task-timer ${isOver ? 'task-timer--over' : ''}`}>
        {formatDuration(remaining)}
      </span>
      <div className="task-card-actions">
        {task.status !== 'done' && !isRunning && (
          <button className="icon-button" onClick={() => onStart(task.id)} disabled={busy} aria-label="Start task">
            {isActionPending ? <Spinner /> : <PlayIcon />}
          </button>
        )}
        {isRunning && (
          <button className="icon-button" onClick={() => onPause(task.id)} disabled={busy} aria-label="Pause task">
            {isActionPending ? <Spinner /> : <PauseIcon />}
          </button>
        )}
        {task.status !== 'done' && (
          <button className="icon-button" onClick={() => onFinish(task.id)} disabled={busy} aria-label="Finish task">
            {isActionPending ? <Spinner /> : <CheckIcon />}
          </button>
        )}
        <button className="icon-button" onClick={() => onEdit(task)} disabled={busy} aria-label={`Edit task "${task.name}"`}>
          <EditIcon />
        </button>
        <button
          className="icon-button icon-button--danger"
          onClick={() => onDelete(task.id)}
          disabled={busy}
          aria-label={`Delete task "${task.name}"`}
        >
          {isDeleting ? <Spinner /> : <DeleteIcon />}
        </button>
      </div>
    </div>
  );
}

/* ---------- Task status filter pills ---------- */

function TaskFilterRow({ grouped, activeFilter, onSelect }) {
  return (
    <div className="task-filter-row">
      {STATUS_ORDER_LIST.map((s) => (
        <button
          key={s}
          type="button"
          className={`task-filter-pill task-filter-pill--${s} ${activeFilter === s ? 'is-active' : ''}`}
          onClick={() => onSelect(s)}
        >
          {STATUS_CONFIG[s].label}
          <span className="task-filter-count">{grouped[s].length}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Todo card (single line) ---------- */

function TodoCard({
  todo,
  onDelete,
  onEdit,
  isExpanded,
  onToggleExpand,
  taskFormOpen,
  editingTaskId,
  taskForm,
  setTaskForm,
  onOpenAddTask,
  onCloseTaskForm,
  onTaskSubmit,
  taskHandlers,
  taskFilter,
  onSetTaskFilter,
  isDeleting,
  savingTaskForm,
  taskActionIds,
  deletingTaskIds,
}) {
  const status = getTodoStatus(todo);
  const statusInfo = STATUS_CONFIG[status];
  const dueInfo = getDueInfo(todo.due_date);
  const tasks = todo.tasks || [];
  const grouped = groupTasks(tasks);
  const visibleTasks = taskFilter === 'all' ? sortTasksByStatus(tasks) : grouped[taskFilter] || [];

  return (
    <div className={`todo-card ${isDeleting ? 'todo-card--busy' : ''}`} style={{ '--status-color': statusInfo.color }}>
      <div className="todo-card-accent" />
      <div className="todo-card-body">
        <div
          className="todo-card-row todo-card-row--clickable"
          onClick={() => onToggleExpand(todo.id)}
        >
          <span className="todo-card-title" title={todo.title}>{todo.title}</span>
          <span className="status-label" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
          {dueInfo.status !== 'none' && (
            <span className={`due-pill due-pill--${dueInfo.status}`}>{dueInfo.text}</span>
          )}
          <div className="todo-card-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-button" onClick={() => onEdit(todo)} disabled={isDeleting} aria-label={`Edit "${todo.title}"`}>
              <EditIcon />
            </button>
            <button
              className="icon-button icon-button--danger"
              onClick={() => onDelete(todo.id)}
              disabled={isDeleting}
              aria-label={`Delete "${todo.title}"`}
            >
              {isDeleting ? <Spinner /> : <DeleteIcon />}
            </button>
          </div>
          <ChevronIcon expanded={isExpanded} />
        </div>

        {isExpanded && (
          <div className="todo-tasks-section">
            {tasks.length > 0 && (
              <TaskFilterRow
                grouped={grouped}
                activeFilter={taskFilter}
                onSelect={(s) => onSetTaskFilter(todo.id, s)}
              />
            )}

            {visibleTasks.length > 0 ? (
              <div className="task-list">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    {...taskHandlers}
                    isActionPending={taskActionIds.has(task.id)}
                    isDeleting={deletingTaskIds.has(task.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="task-empty-state">
                {tasks.length === 0
                  ? 'No tasks yet — break this down into steps.'
                  : 'No tasks with this status.'}
              </p>
            )}

            {taskFormOpen ? (
              <form className="task-form" onSubmit={(e) => onTaskSubmit(e, todo.id)}>
                <input
                  type="text"
                  placeholder="Task name"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  required
                  className="data-field"
                />
                <label className="task-form-minutes-label">
                  Target minutes
                  <input
                    type="number"
                    min="1"
                    value={taskForm.targetMinutes}
                    onChange={(e) => setTaskForm({ ...taskForm, targetMinutes: e.target.value })}
                    className="data-field"
                  />
                </label>
                <div className="task-form-buttons">
                  <button type="button" className="task-cancel-button" onClick={onCloseTaskForm} disabled={savingTaskForm}>
                    Cancel
                  </button>
                  <button type="submit" className="signin-button task-form-submit" disabled={savingTaskForm}>
                    {savingTaskForm && <Spinner />}
                    {savingTaskForm ? 'Saving…' : (editingTaskId ? 'Save' : 'Add')}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="add-task-button" onClick={() => onOpenAddTask(todo.id)}>
                + Add task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

const emptyForm = { title: '', dueDate: '' };
const emptyTaskForm = { name: '', targetMinutes: 25 };

// Small helper for tracking "which ids currently have a request in flight".
function useIdSet() {
  const [ids, setIds] = useState(new Set());
  const add = (id) => setIds((prev) => new Set(prev).add(id));
  const remove = (id) =>
    setIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  return [ids, add, remove];
}

function Todos() {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [taskFormOpenFor, setTaskFormOpenFor] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskFilters, setTaskFilters] = useState({});
  const navigate = useNavigate();

  // Loading / in-flight state, purely for UI feedback while requests are slow.
  const [todosLoading, setTodosLoading] = useState(true);
  const [savingTodoForm, setSavingTodoForm] = useState(false);
  const [deletingTodoIds, addDeletingTodo, removeDeletingTodo] = useIdSet();
  const [savingTaskForm, setSavingTaskForm] = useState(false);
  const [taskActionIds, addTaskAction, removeTaskAction] = useIdSet();
  const [deletingTaskIds, addDeletingTask, removeDeletingTask] = useIdSet();

  const isEditing = editingId !== null;

  useEffect(() => {
    (async () => {
      await fetchTodos();
      setTodosLoading(false);
    })();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await api.get('todos/');
      setTodos(response.data);
      setError('');
    } catch (err) {
      setError('Could not load todos.');
    }
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (todo) => {
    setForm({
      title: todo.title,
      dueDate: todo.due_date || '',
    });
    setEditingId(todo.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSavingTodoForm(true);
    const payload = {
      title: form.title,
      due_date: form.dueDate || null,
    };

    try {
      if (isEditing) {
        await api.patch(`todos/${editingId}/`, payload);
      } else {
        await api.post('todos/', payload);
      }
      closeForm();
      await fetchTodos();
    } catch (err) {
      setError(isEditing ? 'Could not update todo.' : 'Could not create todo.');
    } finally {
      setSavingTodoForm(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    addDeletingTodo(id);
    try {
      await api.delete(`todos/${id}/`);
      if (editingId === id) closeForm();
      await fetchTodos();
    } catch (err) {
      setError('Could not delete todo.');
    } finally {
      removeDeletingTodo(id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    navigate('/login');
  };

  const toggleExpand = (todoId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  };

  const setTaskFilterFor = (todoId, status) => {
    setTaskFilters((prev) => {
      const current = prev[todoId] || 'all';
      return { ...prev, [todoId]: current === status ? 'all' : status };
    });
  };

  const openAddTaskForm = (todoId) => {
    setTaskFormOpenFor(todoId);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
  };

  const openEditTaskForm = (task) => {
    setTaskFormOpenFor(task.todo);
    setEditingTaskId(task.id);
    setTaskForm({
      name: task.name,
      targetMinutes: Math.max(1, Math.round(task.target_duration_seconds / 60)),
    });
  };

  const closeTaskForm = () => {
    setTaskFormOpenFor(null);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
  };

  const handleTaskSubmit = async (e, todoId) => {
    e.preventDefault();
    setError('');
    setSavingTaskForm(true);
    const payload = {
      todo: todoId,
      name: taskForm.name,
      target_duration_seconds: Math.max(60, Number(taskForm.targetMinutes) * 60),
    };

    try {
      if (editingTaskId) {
        await api.patch(`tasks/${editingTaskId}/`, payload);
      } else {
        await api.post('tasks/', payload);
      }
      closeTaskForm();
      await fetchTodos();
    } catch (err) {
      setError('Could not save task.');
    } finally {
      setSavingTaskForm(false);
    }
  };

  const handleTaskDelete = async (taskId) => {
    setError('');
    addDeletingTask(taskId);
    try {
      await api.delete(`tasks/${taskId}/`);
      await fetchTodos();
    } catch (err) {
      setError('Could not delete task.');
    } finally {
      removeDeletingTask(taskId);
    }
  };

  const handleTaskAction = async (taskId, action) => {
    setError('');
    addTaskAction(taskId);
    try {
      await api.post(`tasks/${taskId}/${action}/`);
      await fetchTodos();
    } catch (err) {
      setError('Could not update task timer.');
    } finally {
      removeTaskAction(taskId);
    }
  };

  const taskHandlers = {
    onStart: (id) => handleTaskAction(id, 'start'),
    onPause: (id) => handleTaskAction(id, 'pause'),
    onFinish: (id) => handleTaskAction(id, 'finish'),
    onEdit: openEditTaskForm,
    onDelete: handleTaskDelete,
  };

  // Active todos first (in progress, then pending), done ones sink to the bottom.
  const sortedTodos = [...todos].sort(
    (a, b) => STATUS_SORT_ORDER[getTodoStatus(a)] - STATUS_SORT_ORDER[getTodoStatus(b)]
  );

  return (
    <div className="todos-page">
      <div id="menu">
        <img id="menu-logo" src={logo} alt="Logo" />
        <button id="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <div className="todos-layout">
        <div className="todos-list-panel">
          <h2 className="panel-heading">Your todos</h2>

          {todosLoading ? (
            <div className="todos-loading-state">
              <Spinner size={22} />
              <span>Loading your todos…</span>
            </div>
          ) : todos.length === 0 ? (
            <div className="empty-state">
              Nothing on your list yet. Add your first todo to get started.
            </div>
          ) : (
            <div className="todo-list">
              {sortedTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onDelete={handleDelete}
                  onEdit={openEditForm}
                  isExpanded={expandedIds.has(todo.id)}
                  onToggleExpand={toggleExpand}
                  taskFormOpen={taskFormOpenFor === todo.id}
                  editingTaskId={editingTaskId}
                  taskForm={taskForm}
                  setTaskForm={setTaskForm}
                  onOpenAddTask={openAddTaskForm}
                  onCloseTaskForm={closeTaskForm}
                  onTaskSubmit={handleTaskSubmit}
                  taskHandlers={taskHandlers}
                  taskFilter={taskFilters[todo.id] || 'all'}
                  onSetTaskFilter={setTaskFilterFor}
                  isDeleting={deletingTodoIds.has(todo.id)}
                  savingTaskForm={savingTaskForm}
                  taskActionIds={taskActionIds}
                  deletingTaskIds={deletingTaskIds}
                />
              ))}
            </div>
          )}
        </div>

        {isFormOpen && <div className="modal-backdrop" onClick={closeForm} />}

        <div className={`create-todo-panel ${isFormOpen ? 'is-open' : ''}`}>
          <div className="create-todo-panel-header">
            <h2 className="panel-heading">{isEditing ? 'Edit todo' : 'New todo'}</h2>
            <button type="button" className="close-form-button" onClick={closeForm} aria-label="Close">
              ×
            </button>
          </div>
          <form className="create-todo-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="data-field"
            />
            <DueDateField
              value={form.dueDate}
              onChange={(date) => setForm({ ...form, dueDate: date })}
            />
            <button type="submit" className="signin-button" disabled={savingTodoForm}>
              {savingTodoForm && <Spinner />}
              {savingTodoForm ? 'Saving…' : (isEditing ? 'Save changes' : 'Add todo')}
            </button>
          </form>
        </div>
      </div>

      {!isFormOpen && (
        <button type="button" id="fab-add-button" onClick={openCreateForm} aria-label="New todo">
          +
        </button>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default Todos;
