import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkAnswer, readFileAsBase64 } from '../utils/gemini.js';

export default function Checker() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [maxMarks, setMaxMarks] = useState(5);
    const [answerPreview, setAnswerPreview] = useState(null);
    const [answerBase64, setAnswerBase64] = useState(null);
    const [answerFileName, setAnswerFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const cameraRef = useRef(null);
    const galleryRef = useRef(null);
    const fileRef = useRef(null);

    const handleImageFile = (file) => {
        if (!file) return;
        setAnswerFileName(file.name || 'Photo');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAnswerPreview(ev.target.result);
                setAnswerBase64(ev.target.result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnswerPaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                handleImageFile(item.getAsFile());
                return;
            }
        }
    };

    const handleCameraCapture = (e) => {
        const f = e.target.files[0];
        if (f) handleImageFile(f);
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) handleImageFile(f);
    };

    const handleAnswerDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) handleImageFile(f);
    };

    const clearAnswer = () => {
        setAnswerPreview(null);
        setAnswerBase64(null);
        setAnswerFileName('');
        if (cameraRef.current) cameraRef.current.value = '';
        if (galleryRef.current) galleryRef.current.value = '';
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleCheck = async () => {
        setError('');
        setResult(null);
        setLoading(true);

        try {
            const questionText = question || 'Evaluate the answer in the image';
            const answerText = answer || 'See the attached image of handwritten answer';

            const res = await checkAnswer(questionText, answerText, maxMarks, answerBase64);
            setResult(res);
        } catch (err) {
            setError(err.message || 'Failed to check answer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (pct) => {
        if (pct >= 70) return 'green';
        if (pct >= 40) return 'yellow';
        return 'red';
    };

    const circumference = 2 * Math.PI * 75;
    const canCheck = (question.trim() || answerBase64) && (answer.trim() || answerBase64);

    return (
        <div className="page-container" onPaste={handleAnswerPaste}>
            <h1 className="page-title fade-in-up">✅ Check Answer</h1>
            <p className="page-subtitle fade-in-up">
                Upload or photograph your answer — AI checks it per CBSE marking scheme.
            </p>

            <div className="glass-card fade-in-up">
                {/* Question Input */}
                <div className="form-group">
                    <label className="form-label">Question</label>
                    <textarea
                        id="check-question"
                        className="form-textarea"
                        placeholder="Type the question here..."
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        rows={4}
                    />
                </div>

                <div className="divider">Your Answer</div>

                {/* Answer Text */}
                <div className="form-group">
                    <label className="form-label">Type your answer (optional if uploading photo)</label>
                    <textarea
                        id="check-answer-text"
                        className="form-textarea"
                        placeholder="Type your answer here, or take a photo / upload image below..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={4}
                    />
                </div>

                {/* Camera Buttons */}
                {!answerPreview && (
                    <div className="camera-buttons">
                        <button className="btn btn-camera" onClick={() => cameraRef.current?.click()}>
                            📸 Scan Answer
                        </button>
                        <button className="btn btn-gallery" onClick={() => galleryRef.current?.click()}>
                            🖼️ Gallery
                        </button>
                        <button className="btn btn-file-upload" onClick={() => fileRef.current?.click()}>
                            📎 Upload File
                        </button>
                        <input
                            ref={cameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCameraCapture}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={galleryRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCameraCapture}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.gif,.bmp,.webp,.pdf,.docx,.txt"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                {/* Drop Zone (desktop) */}
                {!answerPreview && (
                    <div
                        className="upload-zone"
                        onDrop={handleAnswerDrop}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                    >
                        <div className="upload-zone-icon">📸</div>
                        <div className="upload-zone-text">
                            Drop your answer sheet here or paste with Ctrl+V
                        </div>
                        <div className="upload-zone-subtext">
                            Supports: PNG, JPG, PDF, DOCX
                        </div>
                    </div>
                )}

                {/* Preview */}
                {answerPreview && (
                    <div className="file-preview">
                        <img src={answerPreview} alt="Answer" style={{ maxHeight: '120px', borderRadius: '8px' }} />
                        <span className="file-preview-name">{answerFileName || 'Photo'}</span>
                        <button className="file-preview-remove" onClick={clearAnswer}>✕</button>
                    </div>
                )}

                {/* Max Marks */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Maximum Marks</label>
                    <input
                        id="max-marks"
                        type="number"
                        className="form-input"
                        value={maxMarks}
                        onChange={e => setMaxMarks(parseInt(e.target.value) || 1)}
                        min={1}
                        max={100}
                        style={{ maxWidth: '120px' }}
                    />
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <button
                    id="check-btn"
                    className="btn btn-primary btn-lg"
                    onClick={handleCheck}
                    disabled={loading || !canCheck}
                    style={{ marginTop: '0.5rem' }}
                >
                    {loading ? '🔄 Checking...' : '🎯 Check & Score'}
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="glass-card loading-overlay" style={{ marginTop: '1.5rem' }}>
                    <div className="spinner"></div>
                    <div className="loading-text">AI is evaluating your answer... Please wait.</div>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="fade-in-up" style={{ marginTop: '1.5rem' }}>
                    {/* Score Circle */}
                    <div className="glass-card score-container">
                        <div className="score-circle">
                            <svg viewBox="0 0 160 160">
                                <circle className="score-circle-bg" cx="80" cy="80" r="75" />
                                <circle
                                    className={`score-circle-fill stroke-${getScoreColor(result.percentage)}`}
                                    cx="80" cy="80" r="75"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference - (circumference * (result.percentage || 0) / 100)}
                                />
                            </svg>
                            <div className="score-circle-text">
                                <div className={`score-number score-${getScoreColor(result.percentage)}`}>
                                    {result.score}/{result.maxMarks}
                                </div>
                                <div className="score-label">{result.percentage}%</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                            {result.overallFeedback}
                        </p>
                    </div>

                    {/* Marking Breakdown */}
                    {result.markingBreakdown && result.markingBreakdown.length > 0 && (
                        <div className="glass-card" style={{ marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '1rem' }}>
                                📊 Step-by-Step Marking
                            </h3>
                            <div className="marking-breakdown">
                                {result.markingBreakdown.map((step, i) => (
                                    <div key={i} className={`marking-step ${step.marksAwarded === step.marksAvailable ? 'correct' :
                                        step.marksAwarded > 0 ? 'partial' : 'wrong'}`}>
                                        <div className={`marking-step-marks ${step.marksAwarded === step.marksAvailable ? 'score-green' :
                                            step.marksAwarded > 0 ? 'score-yellow' : 'score-red'}`}>
                                            {step.marksAwarded}/{step.marksAvailable}
                                        </div>
                                        <div>
                                            <div className="marking-step-desc">{step.step}</div>
                                            {step.comment && <div className="marking-step-comment">{step.comment}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mistakes */}
                    {result.mistakes && result.mistakes.length > 0 && (
                        <div className="glass-card" style={{ marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '1rem' }}>
                                ❌ Mistakes Found
                            </h3>
                            {result.mistakes.map((m, i) => (
                                <div key={i} className="mistake-card">
                                    <div className="mistake-title">{m.description} (−{m.marksLost} marks)</div>
                                    <div className="mistake-correction">✅ Correct: {m.correction}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Correct Parts */}
                    {result.correctParts && result.correctParts.length > 0 && (
                        <div className="glass-card" style={{ marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '1rem' }}>
                                ✅ What You Got Right
                            </h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {result.correctParts.map((c, i) => (
                                    <li key={i} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tips */}
                    {result.improvementTips && result.improvementTips.length > 0 && (
                        <div className="glass-card" style={{ marginTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '1rem' }}>
                                💡 Tips to Improve
                            </h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {result.improvementTips.map((t, i) => (
                                    <li key={i} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{t}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
