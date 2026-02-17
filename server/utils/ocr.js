import Tesseract from 'tesseract.js';

export async function extractTextFromImage(imagePath) {
    try {
        const result = await Tesseract.recognize(imagePath, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // Progress tracking
                }
            }
        });
        return result.data.text;
    } catch (err) {
        console.error('OCR error:', err);
        throw new Error('Failed to extract text from image');
    }
}

export async function extractTextFromImageBuffer(buffer) {
    try {
        const result = await Tesseract.recognize(buffer, 'eng');
        return result.data.text;
    } catch (err) {
        console.error('OCR error:', err);
        throw new Error('Failed to extract text from image');
    }
}
