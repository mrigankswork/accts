import { useState } from 'react';
import { getApiKey, setApiKey } from '../utils/gemini.js';

export default function Settings({ onClose }) {
    const [key, setKey] = useState(getApiKey());
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setApiKey(key);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-accent)' }}>⚙️ Settings</h2>
                    <button className="file-preview-remove" onClick={onClose}>✕</button>
                </div>

                <div className="form-group">
                    <label className="form-label">Gemini API Key</label>
                    <input
                        type="password"
                        className="form-input"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder="Enter your Gemini API key..."
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Get your free key at{' '}
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--primary)' }}>
                            aistudio.google.com
                        </a>
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {saved ? '✅ Saved!' : '💾 Save Key'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
