import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { solveQuestion, readFileAsBase64, readFileAsText } from '../utils/gemini.js';
import { exportSolutionAsDocx } from '../utils/exportDocx.js';

export default function Solver() {
    const [inputMode, setInputMode] = useState('text');
    const [question, setQuestion] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [solution, setSolution] = useState(null);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleImageFromFile = (file) => {
        if (!file) return;
        setFileName(file.name || 'Photo');
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreview(ev.target.result);
                setImageBase64(ev.target.result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImagePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                handleImageFromFile(blob);
                setInputMode('image');
                return;
            }
        }
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFileName(f.name);

        if (f.type.startsWith('image/')) {
            handleImageFromFile(f);
            setInputMode('image');
        } else {
            setImagePreview(null);
            setImageBase64(null);
            setInputMode('file');
            // Read text files
            if (f.name.endsWith('.txt')) {
                readFileAsText(f).then(text => setQuestion(prev => prev ? prev + '\n' + text : text));
            }
        }
    };

    const handleCameraCapture = (e) => {
        const f = e.target.files[0];
        if (f) {
            handleImageFromFile(f);
            setInputMode('image');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) {
            setFileName(f.name);
            if (f.type.startsWith('image/')) {
                handleImageFromFile(f);
                setInputMode('image');
            }
        }
    };

    const clearFile = () => {
        setFileName('');
        setImagePreview(null);
        setImageBase64(null);
        setInputMode('text');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const handleSolve = async () => {
        setError('');
        setSolution(null);
        setLoading(true);

        try {
            const result = await solveQuestion(question || 'Solve the question in the image', imageBase64);
            setSolution(result);
        } catch (err) {
            setError(err.message || 'Failed to solve. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const canSolve = question.trim() || imageBase64;

    return (
        <div className="page-container" onPaste={handleImagePaste}>
            <h1 className="page-title fade-in-up">🧮 Solve Question</h1>
            <p className="page-subtitle fade-in-up">
                Type, take a photo, or paste an image — get instant CBSE-format solutions.
            </p>

            <div className="glass-card fade-in-up">
                {/* Input Tabs */}
                <div className="tabs">
                    <button className={`tab ${inputMode === 'text' ? 'active' : ''}`} onClick={() => setInputMode('text')}>
                        ✏️ Type
                    </button>
                    <button className={`tab ${inputMode === 'image' ? 'active' : ''}`} onClick={() => setInputMode('image')}>
                        📷 Image
                    </button>
                    <button className={`tab ${inputMode === 'file' ? 'active' : ''}`} onClick={() => setInputMode('file')}>
                        📄 File
                    </button>
                </div>

                {/* Text Input */}
                <div className="form-group">
                    <label className="form-label">Question</label>
                    <textarea
                        id="question-input"
                        className="form-textarea"
                        placeholder="Type or paste your accountancy question here... (Ctrl+V to paste image)"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        rows={5}
                    />
                </div>

                {/* Camera & Gallery Buttons */}
                {(inputMode === 'image' || inputMode === 'file') && !imagePreview && (
                    <div className="camera-buttons">
                        <button className="btn btn-camera" onClick={() => cameraInputRef.current?.click()}>
                            📸 Take Photo
                        </button>
                        <button className="btn btn-gallery" onClick={() => galleryInputRef.current?.click()}>
                            🖼️ Gallery
                        </button>
                        <button className="btn btn-file-upload" onClick={() => fileInputRef.current?.click()}>
                            📎 Upload File
                        </button>
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCameraCapture}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCameraCapture}
                            style={{ display: 'none' }}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpg,.jpeg,.gif,.bmp,.webp,.pdf,.docx,.txt"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                {/* Drop Zone (desktop) */}
                {(inputMode === 'image' || inputMode === 'file') && !imagePreview && (
                    <div
                        className="upload-zone"
                        onDrop={handleDrop}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                    >
                        <div className="upload-zone-icon">📎</div>
                        <div className="upload-zone-text">
                            Drop an image or file here, or use buttons above
                        </div>
                        <div className="upload-zone-subtext">
                            Supports: PNG, JPG, PDF, DOCX • Paste with Ctrl+V
                        </div>
                    </div>
                )}

                {/* Preview */}
                {imagePreview && (
                    <div className="file-preview">
                        <img src={imagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px' }} />
                        <span className="file-preview-name">{fileName || 'Photo'}</span>
                        <button className="file-preview-remove" onClick={clearFile}>✕</button>
                    </div>
                )}

                {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}

                <div style={{ marginTop: '1.5rem' }}>
                    <button
                        id="solve-btn"
                        className="btn btn-primary btn-lg"
                        onClick={handleSolve}
                        disabled={loading || !canSolve}
                    >
                        {loading ? '🔄 Solving...' : '🚀 Solve Question'}
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="glass-card loading-overlay" style={{ marginTop: '1.5rem' }}>
                    <div className="spinner"></div>
                    <div className="loading-text">AI is solving your question... This may take a moment.</div>
                </div>
            )}

            {/* Solution Display */}
            {solution && !loading && (
                <div className="glass-card solution-container fade-in-up" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-accent)' }}>
                            📝 Solution
                        </h2>
                        <button
                            className="btn btn-success btn-sm"
                            disabled={exporting}
                            onClick={async () => {
                                setExporting(true);
                                try { await exportSolutionAsDocx(solution); } catch (e) { setError('Failed to export DOCX'); }
                                setExporting(false);
                            }}
                        >
                            {exporting ? '⏳ Exporting...' : '📥 Download DOCX'}
                        </button>
                    </div>

                    {solution.topic && (
                        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                            <strong>Topic:</strong> {solution.topic}
                        </div>
                    )}

                    {solution.explanation && (
                        <div className="solution-section">
                            <div className="solution-section-title">💡 Explanation</div>
                            <div className="md-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.explanation}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {solution.solution && (
                        <div className="solution-section">
                            <div className="solution-section-title">📊 Step-by-Step Solution</div>
                            <div className="md-content solution-table-wrapper">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.solution}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {solution.workingNotes && solution.workingNotes !== 'Not required for this simple journal entry.' && (
                        <div className="solution-section">
                            <div className="solution-section-title">📋 Working Notes</div>
                            <div className="md-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.workingNotes}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {solution.tips && (
                        <div className="solution-section">
                            <div className="solution-section-title">🎯 CBSE Exam Tips</div>
                            <div className="md-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.tips}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {solution.marksBreakdown && (
                        <div className="solution-section">
                            <div className="solution-section-title">📊 Marks Breakdown</div>
                            <div className="md-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.marksBreakdown}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
