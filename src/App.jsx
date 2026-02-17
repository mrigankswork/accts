import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Solver from './pages/Solver.jsx';
import Checker from './pages/Checker.jsx';
import Settings from './components/Settings.jsx';

function App() {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            <Navbar onSettingsClick={() => setShowSettings(true)} />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/solve" element={<Solver />} />
                <Route path="/check" element={<Checker />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
    );
}

export default App;
