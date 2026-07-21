import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../App.css';
import logo from '../assets/planify-logo.svg';

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 1 12s4 7 11 7a10.94 10.94 0 0 0 5.39-1.39" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-page">
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

          <div className="password-field-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="data-field"
            />
            <button
              type="button"
              className="toggle-password-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <button type="submit" className="signin-button">Login</button>
        </form>
        {error && <p className="error-text">{error}</p>}
        <p>Don't have an account? <Link className="sign-link" to="/register">Register</Link></p>
      </div>
    </div>
  );
}

export default Login;