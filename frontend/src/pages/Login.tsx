import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { email, password });
      localStorage.setItem('zcoder_token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subtext}>Log in to Z-Coder to view your dashboard.</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={e => setEmail(e.target.value)} 
            required 
            style={styles.input}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
            required 
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Log In</button>
        </form>
        
        <p style={styles.footerText}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212', fontFamily: 'system-ui, sans-serif' },
  card: { backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '100%', maxWidth: '360px', textAlign: 'center' as const },
  heading: { color: '#ffffff', margin: '0 0 10px 0', fontSize: '24px' },
  subtext: { color: '#a0a0a0', marginBottom: '30px', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column' as const },
  input: { padding: '14px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#2d2d2d', color: '#fff', fontSize: '15px', outline: 'none' },
  button: { padding: '14px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  footerText: { color: '#a0a0a0', marginTop: '20px', fontSize: '14px' },
  link: { color: '#4dabf7', textDecoration: 'none', fontWeight: 'bold' }
};

export default Login;