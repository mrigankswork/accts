import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
];

// Default API key (user can change in settings)
const DEFAULT_KEY = 'AIzaSyAO9RNEwlpWVo7-sQbBUBUBEIh7BPfEq5Q';

export function getApiKey() {
    return localStorage.getItem('acctbot_api_key') || DEFAULT_KEY;
}

export function setApiKey(key) {
    localStorage.setItem('acctbot_api_key', key);
}

async function callWithFallback(parts) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No API key set. Go to Settings to add your Gemini API key.');

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError = null;

    for (const modelName of MODELS) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(parts);
            const text = result.response.text();
            console.log(`Success with model: ${modelName}`);
            return text;
        } catch (err) {
            console.log(`Model ${modelName} failed: ${err.message?.substring(0, 100)}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error('All AI models failed. Try refreshing your API key at https://aistudio.google.com');
}

const SOLVE_PROMPT = `You are an expert CBSE Class 12 Accountancy teacher. Solve with full accuracy following CBSE board examination standards.

RULES:
1. Show step-by-step solutions
2. Use proper accounting formats: Journal entries, Ledger accounts, Trial Balance, Trading & P&L A/c, Balance Sheet, Cash Flow Statement
3. Follow CBSE marking scheme - show every step that earns marks
4. Include working notes where necessary
5. Use standard CBSE format for all accounting statements

FORMAT YOUR RESPONSE AS JSON:
{
  "topic": "Name of the accounting topic",
  "explanation": "Brief conceptual explanation and approach",
  "solution": "Complete step-by-step solution in markdown with tables. Use markdown tables for journal entries, ledgers, etc.",
  "workingNotes": "Working notes or calculations (empty string if not needed)",
  "tips": "CBSE exam tips for this type of question",
  "marksBreakdown": "How marks would be awarded step-by-step"
}

For accounting tables use markdown table format:
| Date | Particulars | L.F. | Debit (₹) | Credit (₹) |
|------|------------|------|-----------|------------|

Always use ₹ symbol. Ensure valid JSON with properly escaped characters.`;

const CHECK_PROMPT = `You are a strict CBSE Class 12 Accountancy examiner. Evaluate following the official CBSE marking scheme.

MARKING RULES:
1. Award step marks - each correct step gets marks
2. Correct working but wrong final answer = marks for correct steps
3. Alternative valid methods accepted if correct
4. Deduct marks only for errors, not presentation differences
5. Journal entries: 1 mark per correct entry typically
6. Ledger accounts: marks for correct posting and balancing
7. Financial statements: marks for format + correct figures

RESPOND STRICTLY AS JSON:
{
  "score": <marks awarded>,
  "maxMarks": <total marks>,
  "percentage": <percentage>,
  "overallFeedback": "Brief overall assessment",
  "mistakes": [{"description": "...", "correction": "...", "marksLost": <n>}],
  "correctParts": ["List of things got right"],
  "markingBreakdown": [{"step": "...", "marksAvailable": <n>, "marksAwarded": <n>, "comment": "..."}],
  "improvementTips": ["Specific tips"]
}

Be fair but strict. Follow CBSE conventions exactly.`;

function parseJsonResponse(text) {
    // Try to extract JSON from response
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { /* fallback below */ }
    return null;
}

export async function solveQuestion(questionText, imageBase64 = null) {
    const parts = [{ text: SOLVE_PROMPT + '\n\nQuestion:\n' + questionText }];

    if (imageBase64) {
        parts.push({
            inlineData: { mimeType: 'image/png', data: imageBase64 }
        });
    }

    const responseText = await callWithFallback(parts);
    const parsed = parseJsonResponse(responseText);

    if (parsed) return parsed;

    return {
        topic: 'Accountancy',
        explanation: '',
        solution: responseText,
        workingNotes: '',
        tips: '',
        marksBreakdown: ''
    };
}

export async function checkAnswer(questionText, studentAnswer, maxMarks, imageBase64 = null) {
    const prompt = `${CHECK_PROMPT}

Question (${maxMarks} marks):
${questionText}

Student's Answer:
${studentAnswer}

Evaluate strictly following CBSE marking scheme for ${maxMarks} marks.`;

    const parts = [{ text: prompt }];

    if (imageBase64) {
        parts.push({
            inlineData: { mimeType: 'image/png', data: imageBase64 }
        });
    }

    const responseText = await callWithFallback(parts);
    const parsed = parseJsonResponse(responseText);

    if (parsed) return parsed;

    return {
        score: 0,
        maxMarks,
        percentage: 0,
        overallFeedback: responseText,
        mistakes: [],
        correctParts: [],
        markingBreakdown: [],
        improvementTips: []
    };
}

// Read file contents as text (for PDF/DOCX — basic text extraction)
export function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
