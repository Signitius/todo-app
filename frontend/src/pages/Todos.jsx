import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Todos() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
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
      await api.post('todos/', {
        title,
        due_date: dueDate || null,
        priority,
      });
      setTitle('');
      setDueDate('');
      setPriority('medium');
      fetchTodos();
    } catch (err) {
      setError('Could not create todo.');
    }
  };

  const handleToggleComplete = async (todo) => {
    await api.patch(`todos/${todo.id}/`, { completed: !todo.completed });
    fetchTodos();
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
    <div>
      <button onClick={handleLogout}>Logout</button>
      <h2>My Todos</h2>

      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add Todo</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggleComplete(todo)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title} — {todo.priority} {todo.due_date ? `— due ${todo.due_date}` : ''}
            </span>
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Todos;