import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<div style={{ textAlign: 'center', marginTop: '50px' }}><h1>Welcome to Video Platform</h1><p><a href="/login">Login</a> or <a href="/register">Register</a></p></div>} />
      </Routes>
    </Router>
  );
}

export default App;
