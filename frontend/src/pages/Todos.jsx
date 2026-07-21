import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../App.css';
import logo from '../assets/planify-logo.svg';

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

function DeleteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function TodoCard({ todo, onDelete }) {
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
        <div className="todo-card-bottom">
          <span className={`due-pill due-pill--${dueInfo.status}`}>{dueInfo.text}</span>
          <button
            className="delete-button"
            onClick={() => onDelete(todo.id)}
            aria-label={`Delete "${todo.title}"`}
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function Todos() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();

  const fetchTodos = async () => {
    try {
      const response = await api.get('todos/');
      setTodos(response.data);
    } catch (err) {
      setError('Could not load todos.');
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('todos/', { title, due_date: dueDate || null, priority });
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setIsFormOpen(false);
      fetchTodos();
    } catch (err) {
      setError('Could not create todo.');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`todos/${id}/`);
    fetchTodos();
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
                <TodoCard key={todo.id} todo={todo} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {isFormOpen && (
          <div className="modal-backdrop" onClick={() => setIsFormOpen(false)} />
        )}

        <div className={`create-todo-panel ${isFormOpen ? 'is-open' : ''}`}>
          <div className="create-todo-panel-header">
            <h2 className="panel-heading">New todo</h2>
            <button
              type="button"
              className="close-form-button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <form className="create-todo-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="data-field"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="data-field"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="data-field"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="signin-button">Add todo</button>
          </form>
        </div>
      </div>

      <button
        type="button"
        className="fab-add-button"
        onClick={() => setIsFormOpen(true)}
        aria-label="New todo"
      >
        +
      </button>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default Todos;