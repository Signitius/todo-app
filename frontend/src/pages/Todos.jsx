import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../App.css';
import logo from '../assets/planify-logo.svg';
import { useRef } from 'react';

function formatReadableDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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
      <button
        type="button"
        className="data-field date-trigger"
        onClick={openPicker}
      >
        {value ? formatReadableDate(value) : 'Select due date'}
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

function TodoCard({ todo, onDelete, onEdit }) {
  const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
  const dueInfo = getDueInfo(todo.due_date);

  return (
    <div className="todo-card" style={{ '--priority-color': priority.color }}>
      <div className="todo-card-accent" />
      <div className="todo-card-body">
        <div className="todo-card-top">
          <span className="todo-card-title">{todo.title}</span>
          <span className="priority-chip" style={{ backgroundColor: priority.color }}>
            {priority.label}
          </span>
        </div>

        {todo.description && (
          <p className="todo-card-description">{todo.description}</p>
        )}

        <div className="todo-card-bottom">
          <span className={`due-pill due-pill--${dueInfo.status}`}>{dueInfo.text}</span>
          <div className="todo-card-actions">
            <button
              className="icon-button"
              onClick={() => onEdit(todo)}
              aria-label={`Edit "${todo.title}"`}
            >
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
      </div>
    </div>
  );
}

const emptyForm = { title: '', description: '', dueDate: '', priority: 'medium' };

function Todos() {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();

  const isEditing = editingId !== null;


  useEffect(() => {
    fetchTodos();
  }, []);

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


const fetchTodos = async () => {
  try {
    const response = await api.get('todos/');
    setTodos(response.data);
    setError('');
  } catch (err) {
    setError('Could not load todos.');
  }
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
    if (editingId === id) {
      closeForm();
    }
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
                />
              ))}
            </div>
          )}
        </div>

        {isFormOpen && (
          <div className="modal-backdrop" onClick={closeForm} />
        )}

        <div className={`create-todo-panel ${isFormOpen ? 'is-open' : ''}`}>
          <div className="create-todo-panel-header">
            <h2 className="panel-heading">{isEditing ? 'Edit todo' : 'New todo'}</h2>
            <button
              type="button"
              className="close-form-button"
              onClick={closeForm}
              aria-label="Close"
            >
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
        <button
          type="button"
          id="fab-add-button"
          onClick={openCreateForm}
          aria-label="New todo"
        >
        +
        </button>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
export default Todos;