import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';
import { parseFile } from '../utils/fileParser.js';
import { checkAnswer } from '../utils/gemini.js';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
    dest: path.join(__dirname, '..', '..', 'uploads'),
    limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.post('/', authMiddleware, upload.fields([
    { name: 'questionFile', maxCount: 1 },
    { name: 'answerFile', maxCount: 1 }
]), async (req, res) => {
    try {
        let questionText = req.body.question || '';
        let studentAnswer = req.body.answer || '';
        const maxMarks = parseInt(req.body.maxMarks) || 5;
        let answerImageBase64 = null;

        // Parse question file if uploaded
        if (req.files && req.files.questionFile) {
            const file = req.files.questionFile[0];
            try {
                const parsed = await parseFile(file.path, file.mimetype);
                questionText = questionText ? questionText + '\n\n' + parsed.text : parsed.text;
            } finally {
                fs.unlinkSync(file.path);
            }
        }

        // Parse answer file if uploaded
        if (req.files && req.files.answerFile) {
            const file = req.files.answerFile[0];
            try {
                const parsed = await parseFile(file.path, file.mimetype);
                studentAnswer = studentAnswer ? studentAnswer + '\n\n' + parsed.text : parsed.text;
                answerImageBase64 = parsed.imageBase64;
            } finally {
                fs.unlinkSync(file.path);
            }
        }

        // If base64 images were sent directly
        if (req.body.answerImageBase64) {
            answerImageBase64 = req.body.answerImageBase64;
        }

        if (!questionText) {
            return res.status(400).json({ error: 'Please provide the question' });
        }

        if (!studentAnswer && !answerImageBase64) {
            return res.status(400).json({ error: 'Please provide the student answer (text, image, or file)' });
        }

        const result = await checkAnswer(questionText, studentAnswer, maxMarks, answerImageBase64);

        // Save to DB
        db.prepare(
            'INSERT INTO submissions (user_id, type, question_text, score, max_marks, feedback) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(req.user.id, 'check', questionText.substring(0, 500), result.score, maxMarks, JSON.stringify(result));

        res.json({ result });
    } catch (err) {
        console.error('Check error:', err);
        res.status(500).json({ error: 'Failed to check answer: ' + err.message });
    }
});

export default router;
