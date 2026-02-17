import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { extractTextFromImage } from './ocr.js';

export async function parseFile(filePath, mimeType) {
    const ext = path.extname(filePath).toLowerCase();

    // Image files
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext) ||
        (mimeType && mimeType.startsWith('image/'))) {
        const text = await extractTextFromImage(filePath);
        const imageBuffer = fs.readFileSync(filePath);
        const base64 = imageBuffer.toString('base64');
        return { text, imageBase64: base64 };
    }

    // PDF files
    if (ext === '.pdf' || mimeType === 'application/pdf') {
        // Dynamic import for pdf-parse (CommonJS module)
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return { text: data.text, imageBase64: null };
    }

    // DOCX files
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return { text: result.value, imageBase64: null };
    }

    // Plain text
    if (ext === '.txt' || (mimeType && mimeType.startsWith('text/'))) {
        const text = fs.readFileSync(filePath, 'utf-8');
        return { text, imageBase64: null };
    }

    throw new Error(`Unsupported file type: ${ext || mimeType}`);
}

export function getBase64FromFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
}
