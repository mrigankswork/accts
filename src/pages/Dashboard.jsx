import { Link } from 'react-router-dom';

export default function Dashboard() {
    return (
        <div className="page-container">
            <h1 className="page-title fade-in-up">
                Welcome to AcctBot! 👋
            </h1>
            <p className="page-subtitle fade-in-up fade-in-up-delay-1">
                Your AI-powered CBSE Class 12 Accountancy assistant. Solve questions, check answers, ace your exams.
            </p>

            {/* Quick Actions */}
            <div className="action-cards fade-in-up fade-in-up-delay-2">
                <Link to="/solve" className="glass-card action-card">
                    <div className="action-card-icon">🧮</div>
                    <div className="action-card-title">Solve Question</div>
                    <div className="action-card-desc">
                        Type a question, take a photo, or upload an image — get instant step-by-step CBSE solutions with journal entries, ledgers & more.
                    </div>
                </Link>

                <Link to="/check" className="glass-card action-card">
                    <div className="action-card-icon">✅</div>
                    <div className="action-card-title">Check Answer</div>
                    <div className="action-card-desc">
                        Photograph your answer sheet — AI marks it per CBSE scheme, shows your score, mistakes, and tips to improve.
                    </div>
                </Link>
            </div>

            {/* Quick Tips */}
            <div className="glass-card fade-in-up fade-in-up-delay-3" style={{ marginTop: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '1rem' }}>
                    💡 Quick Tips
                </h2>
                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>📸 <strong>On your phone?</strong> Use the camera button to snap a question or answer sheet</li>
                    <li>📋 <strong>On desktop?</strong> Paste images with Ctrl+V or drag and drop files</li>
                    <li>⚙️ You can change your Gemini API key anytime in Settings</li>
                    <li>📊 Solutions follow CBSE Class 12 marking scheme format</li>
                </ul>
            </div>
        </div>
    );
}
