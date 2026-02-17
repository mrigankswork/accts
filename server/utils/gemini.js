import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Try models in order — different models have separate quota buckets
const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
];

async function callWithFallback(parts) {
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
            // If it's a quota error (429), try next model
            if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
                continue;
            }
            // For other errors, still try next model
            continue;
        }
    }

    throw lastError || new Error('All AI models failed. Your API key may need to be refreshed at https://aistudio.google.com');
}

const SOLVE_SYSTEM_PROMPT = `You are an expert CBSE Class 12 Accountancy teacher. You solve accountancy questions with complete accuracy following CBSE board examination standards.

IMPORTANT RULES:
1. Always show step-by-step solutions
2. Use proper accounting formats: Journal entries, Ledger accounts, Trial Balance, Trading & Profit & Loss Account, Balance Sheet, Cash Flow Statement, etc.
3. Follow CBSE marking scheme - show every step that earns marks
4. Include working notes where necessary
5. Use the standard CBSE format for all accounting statements

FORMAT YOUR RESPONSE AS JSON with this structure:
{
  "topic": "Name of the accounting topic",
  "explanation": "Brief conceptual explanation of the topic and approach",
  "solution": "Complete step-by-step solution in markdown with proper tables. Use markdown tables for journal entries, ledgers, etc.",
  "workingNotes": "Any working notes or calculations (can be empty string if not needed)",
  "tips": "CBSE exam tips for this type of question",
  "marksBreakdown": "How marks would be awarded step-by-step in CBSE exam"
}

For accounting tables, use markdown table format:
| Date | Particulars | L.F. | Debit (₹) | Credit (₹) |
|------|------------|------|-----------|------------|
| ... | ... | ... | ... | ... |

Always use ₹ symbol for Indian Rupees.
Ensure your JSON is valid. Escape special characters properly.`;

const CHECK_SYSTEM_PROMPT = `You are a strict CBSE Class 12 Accountancy examiner. You evaluate student answers following the official CBSE marking scheme.

MARKING RULES:
1. Award step marks - each correct step gets marks
2. If working is correct but final answer is wrong, give marks for correct steps
3. If a different but valid method is used, full marks if correct
4. Deduct marks only for errors, not for different presentation styles
5. Alternative solutions are accepted if correct
6. Journal entries: 1 mark per correct entry typically
7. Ledger accounts: marks for correct posting and balancing
8. Financial statements: marks for correct format + correct figures
9. Cash Flow Statement: marks for each activity section and correct classification

EVALUATE the student answer against the question and provide your response STRICTLY as JSON:
{
  "score": <number - marks awarded>,
  "maxMarks": <number - total marks for question>,
  "percentage": <number - percentage score>,
  "overallFeedback": "Brief overall assessment",
  "mistakes": [
    {
      "description": "What the mistake is",
      "correction": "What the correct answer should be",
      "marksLost": <number>
    }
  ],
  "correctParts": ["List of things the student got right"],
  "markingBreakdown": [
    {
      "step": "Description of marking step",
      "marksAvailable": <number>,
      "marksAwarded": <number>,
      "comment": "Why marks were awarded or not"
    }
  ],
  "improvementTips": ["Specific tips to improve"]
}

Be fair but strict. Follow CBSE conventions exactly.`;

export async function solveQuestion(questionText, imageBase64 = null) {
    const parts = [{ text: SOLVE_SYSTEM_PROMPT + '\n\nQuestion:\n' + questionText }];

    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: imageBase64
            }
        });
    }

    const responseText = await callWithFallback(parts);

    // Extract JSON from response
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // If JSON parsing fails, return as markdown
    }

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
    const prompt = `${CHECK_SYSTEM_PROMPT}

Question (${maxMarks} marks):
${questionText}

Student's Answer:
${studentAnswer}

Evaluate this answer strictly following CBSE marking scheme for ${maxMarks} marks.`;

    const parts = [{ text: prompt }];

    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: imageBase64
            }
        });
    }

    const responseText = await callWithFallback(parts);

    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        // fallback
    }

    return {
        score: 0,
        maxMarks: maxMarks,
        percentage: 0,
        overallFeedback: responseText,
        mistakes: [],
        correctParts: [],
        markingBreakdown: [],
        improvementTips: []
    };
}
