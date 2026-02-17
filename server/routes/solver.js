import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';
import { parseFile } from '../utils/fileParser.js';
import { solveQuestion } from '../utils/gemini.js';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
    dest: path.join(__dirname, '..', '..', 'uploads'),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.pdf', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'));
        }
    }
});

const router = Router();

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        let questionText = req.body.question || '';
        let imageBase64 = null;

        // If a file was uploaded, parse it
        if (req.file) {
            try {
                const parsed = await parseFile(req.file.path, req.file.mimetype);
                questionText = questionText ? questionText + '\n\n' + parsed.text : parsed.text;
                imageBase64 = parsed.imageBase64;
            } finally {
                // Cleanup uploaded file
                fs.unlinkSync(req.file.path);
            }
        }

        // If base64 image was sent directly (for pasted images)
        if (req.body.imageBase64) {
            imageBase64 = req.body.imageBase64;
        }

        if (!questionText && !imageBase64) {
            return res.status(400).json({ error: 'Please provide a question (text, image, or file)' });
        }

        const solution = await solveQuestion(questionText, imageBase64);

        // Save to DB
        db.prepare(
            'INSERT INTO submissions (user_id, type, question_text, solution) VALUES (?, ?, ?, ?)'
        ).run(req.user.id, 'solve', questionText.substring(0, 500), JSON.stringify(solution));

        res.json({ solution });
    } catch (err) {
        console.error('Solve error:', err);
        res.status(500).json({ error: 'Failed to solve question: ' + err.message });
    }
});

export default router;
