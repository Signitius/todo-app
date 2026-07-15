import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../App.css';
import logo from '../assets/planify-logo.svg';
import background from '../assets/background.jpg';

function Login() {
 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('token/', { username, password });
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      navigate('/todos');
    } catch (err) {
      setError('Invalid username or password.');
    }
  };

  return (
    <div style={{ 
      backgroundImage: `url(${background})`,
      backgroundSize: 'cover',
      minHeight: '100vh' 
    }}>
      <div id="logo-container">
        <img src={logo} alt="Logo" id="sign-logo" />
      </div>
      <div className="signin-container">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="data-field"
          />
        
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="data-field"
          />
          <button  type="submit" className="signin-button">Login</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <p>Don't have an account? <Link className="sign-link" to="/register">Register</Link></p>
      </div>
    </div>
  );
}

export default Login;