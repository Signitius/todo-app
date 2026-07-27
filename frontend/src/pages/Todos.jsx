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

/* ---------- Priority / due helpers ---------- */

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B' },
  high: { label: 'High', color: '#EF4444' },
};

function getDueInfo(dueDate) {
  if (!dueDate) return { text: 'No due date', status: 'none' };

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

function truncate(text, max = 70) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

function groupTasks(tasks) {
  return {
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    pending: tasks.filter((t) => t.status === 'pending'),
    done: tasks.filter((t) => t.status === 'done'),
  };
}

/* ---------- Task card ---------- */

function TaskCard({ task, onStart, onPause, onFinish, onEdit, onDelete }) {
  const remaining = useLiveRemaining(task);
  const isOver = remaining < 0;
  const isRunning = task.started_at != null;

  return (
    <div className={`task-card task-card--${task.status}`}>
      <div className="task-card-top">
        <span className="task-card-name">{task.name}</span>
        <span className={`task-timer ${isOver ? 'task-timer--over' : ''}`}>
          {formatDuration(remaining)}
        </span>
      </div>
      <div className="task-card-actions">
        {task.status !== 'done' && !isRunning && (
          <button className="icon-button" onClick={() => onStart(task.id)} aria-label="Start task">
            <PlayIcon />
          </button>
        )}
        {isRunning && (
          <button className="icon-button" onClick={() => onPause(task.id)} aria-label="Pause task">
            <PauseIcon />
          </button>
        )}
        {task.status !== 'done' && (
          <button className="icon-button" onClick={() => onFinish(task.id)} aria-label="Finish task">
            <CheckIcon />
          </button>
        )}
        <button className="icon-button" onClick={() => onEdit(task)} aria-label={`Edit task "${task.name}"`}>
          <EditIcon />
        </button>
        <button
          className="icon-button icon-button--danger"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete task "${task.name}"`}
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, taskHandlers }) {
  if (tasks.length === 0) return null;
  return (
    <div className="task-section">
      <h4 className="task-section-heading">{title}</h4>
      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} {...taskHandlers} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Todo card ---------- */

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
  onOpenEditTask,
  onCloseTaskForm,
  onTaskSubmit,
  taskHandlers,
}) {
  const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
  const dueInfo = getDueInfo(todo.due_date);
  const tasks = todo.tasks || [];
  const grouped = groupTasks(tasks);

  return (
    <div className="todo-card" style={{ '--priority-color': priority.color }}>
      <div className="todo-card-accent" />
      <div className="todo-card-body">
        <div className="todo-card-top todo-card-top--clickable" onClick={() => onToggleExpand(todo.id)}>
          <span className="todo-card-title">{todo.title}</span>
          <div className="todo-card-top-right">
            <span className="priority-chip" style={{ backgroundColor: priority.color }}>
              {priority.label}
            </span>
            <ChevronIcon expanded={isExpanded} />
          </div>
        </div>

        {todo.description && (
          <p className="todo-card-description">{truncate(todo.description)}</p>
        )}

        <div className="todo-card-bottom">
          <span className={`due-pill due-pill--${dueInfo.status}`}>{dueInfo.text}</span>
          <div className="todo-card-actions">
            <button className="icon-button" onClick={() => onEdit(todo)} aria-label={`Edit "${todo.title}"`}>
              <EditIcon />
            </button>
            <button
              className="icon-button icon-button--danger"
              onClick={() => onDelete(todo.id)}
              aria-label={`Delete "${todo.title}"`}
            >
              <DeleteIcon />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="todo-tasks-section">
            <TaskSection title="In progress" tasks={grouped.in_progress} taskHandlers={taskHandlers} />
            <TaskSection title="Pending" tasks={grouped.pending} taskHandlers={taskHandlers} />
            <TaskSection title="Done" tasks={grouped.done} taskHandlers={taskHandlers} />

            {tasks.length === 0 && !taskFormOpen && (
              <p className="task-empty-state">No tasks yet.</p>
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
                <div className="task-form-row">
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
                    <button type="button" className="icon-button" onClick={onCloseTaskForm} aria-label="Cancel">
                      Cancel
                    </button>
                    <button type="submit" className="signin-button task-form-submit">
                      {editingTaskId ? 'Save' : 'Add'}
                    </button>
                  </div>
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

const emptyForm = { title: '', description: '', dueDate: '', priority: 'medium' };
const emptyTaskForm = { name: '', targetMinutes: 25 };

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
  const navigate = useNavigate();

  const isEditing = editingId !== null;

  useEffect(() => {
    fetchTodos();
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
      description: todo.description || '',
      dueDate: todo.due_date || '',
      priority: todo.priority,
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
    const payload = {
      title: form.title,
      description: form.description,
      due_date: form.dueDate || null,
      priority: form.priority,
    };

    try {
      if (isEditing) {
        await api.patch(`todos/${editingId}/`, payload);
      } else {
        await api.post('todos/', payload);
      }
      closeForm();
      fetchTodos();
    } catch (err) {
      setError(isEditing ? 'Could not update todo.' : 'Could not create todo.');
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.delete(`todos/${id}/`);
      if (editingId === id) closeForm();
      fetchTodos();
    } catch (err) {
      setError('Could not delete todo.');
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
      fetchTodos();
    } catch (err) {
      setError('Could not save task.');
    }
  };

  const handleTaskDelete = async (taskId) => {
    setError('');
    try {
      await api.delete(`tasks/${taskId}/`);
      fetchTodos();
    } catch (err) {
      setError('Could not delete task.');
    }
  };

  const handleTaskAction = async (taskId, action) => {
    setError('');
    try {
      await api.post(`tasks/${taskId}/${action}/`);
      fetchTodos();
    } catch (err) {
      setError('Could not update task timer.');
    }
  };

  const taskHandlers = {
    onStart: (id) => handleTaskAction(id, 'start'),
    onPause: (id) => handleTaskAction(id, 'pause'),
    onFinish: (id) => handleTaskAction(id, 'finish'),
    onEdit: openEditTaskForm,
    onDelete: handleTaskDelete,
  };

  return (
    <div className="todos-page">
      <div id="menu">
        <img id="menu-logo" src={logo} alt="Logo" />
        <button id="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <div className="todos-layout">
        <div className="todos-list-panel">
          <h2 className="panel-heading">Your todos</h2>

          {todos.length === 0 ? (
            <div className="empty-state">
              Nothing on your list yet. Add your first todo to get started.
            </div>
          ) : (
            <div className="todo-list">
              {todos.map((todo) => (
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
                  onOpenEditTask={openEditTaskForm}
                  onCloseTaskForm={closeTaskForm}
                  onTaskSubmit={handleTaskSubmit}
                  taskHandlers={taskHandlers}
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
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="data-field"
              rows={3}
            />
            <DueDateField
              value={form.dueDate}
              onChange={(date) => setForm({ ...form, dueDate: date })}
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="data-field"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="signin-button">
              {isEditing ? 'Save changes' : 'Add todo'}
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