import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ onSettingsClick }) {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path ? 'navbar-link active' : 'navbar-link';

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <span className="navbar-brand-icon">📊</span>
                AcctBot
            </Link>

            <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
            </button>

            <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                <Link to="/" className={isActive('/')} onClick={() => setMenuOpen(false)}>
                    Dashboard
                </Link>
                <Link to="/solve" className={isActive('/solve')} onClick={() => setMenuOpen(false)}>
                    Solve
                </Link>
                <Link to="/check" className={isActive('/check')} onClick={() => setMenuOpen(false)}>
                    Check
                </Link>
                <button className="btn btn-sm btn-secondary" onClick={() => { setMenuOpen(false); onSettingsClick(); }}>
                    ⚙️ Settings
                </button>
            </div>
        </nav>
    );
}
