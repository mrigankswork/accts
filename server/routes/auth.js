import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
        ).run(name, email, password_hash);

        const token = jwt.sign(
            { id: result.lastInsertRowid, name, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: result.lastInsertRowid, name, email } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
});

// Get user stats
router.get('/stats', authMiddleware, (req, res) => {
    const solved = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND type = ?').get(req.user.id, 'solve');
    const checked = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND type = ?').get(req.user.id, 'check');
    const avgScore = db.prepare('SELECT AVG(score * 100.0 / max_marks) as avg FROM submissions WHERE user_id = ? AND type = ? AND score IS NOT NULL').get(req.user.id, 'check');
    const recent = db.prepare('SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(req.user.id);

    res.json({
        questionsSolved: solved.count,
        answersChecked: checked.count,
        avgScore: avgScore.avg ? Math.round(avgScore.avg) : null,
        recentSubmissions: recent
    });
});

export default router;
