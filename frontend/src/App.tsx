import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">GES MARKETİM</Link>
        <nav>
          <Link to="/">Anasayfa</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <small>© {new Date().getFullYear()} GES MARKETİM</small>
      </footer>
    </div>
  );
}
