import { Router } from 'express';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType } from 'docx';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function createSolutionDocx(solution) {
    const children = [];

    // Title
    children.push(new Paragraph({
        children: [new TextRun({ text: 'CBSE Class 12 Accountancy Solution', bold: true, size: 32, color: '1a237e' })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
    }));

    // Topic
    if (solution.topic) {
        children.push(new Paragraph({
            children: [new TextRun({ text: 'Topic: ', bold: true, size: 24 }), new TextRun({ text: solution.topic, size: 24, color: '4a148c' })],
            spacing: { after: 200 }
        }));
    }

    // Explanation
    if (solution.explanation) {
        children.push(new Paragraph({
            children: [new TextRun({ text: 'Explanation', bold: true, size: 26, color: '1565c0' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
        }));

        solution.explanation.split('\n').forEach(line => {
            children.push(new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 100 }
            }));
        });
    }

    // Solution
    if (solution.solution) {
        children.push(new Paragraph({
            children: [new TextRun({ text: 'Solution', bold: true, size: 26, color: '1565c0' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
        }));

        // Parse markdown tables and text
        const lines = solution.solution.split('\n');
        let inTable = false;
        let tableRows = [];
        let tableHeaders = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                // Check if it's a separator line
                if (trimmed.match(/^\|[\s\-:]+\|/)) {
                    continue; // Skip separator
                }

                const cells = trimmed.split('|').filter((c, i, arr) => i > 0 && i < arr.length).map(c => c.trim());

                if (!inTable) {
                    inTable = true;
                    tableHeaders = cells;
                } else {
                    tableRows.push(cells);
                }
            } else {
                // If we were in a table, flush it
                if (inTable && tableHeaders.length > 0) {
                    const headerCells = tableHeaders.map(h =>
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'ffffff' })], alignment: AlignmentType.CENTER })],
                            shading: { type: ShadingType.SOLID, color: '1565c0' },
                            width: { size: Math.floor(100 / tableHeaders.length), type: WidthType.PERCENTAGE }
                        })
                    );

                    const dataRows = tableRows.map(row =>
                        new TableRow({
                            children: row.map(cell =>
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })], alignment: AlignmentType.CENTER })],
                                    width: { size: Math.floor(100 / tableHeaders.length), type: WidthType.PERCENTAGE }
                                })
                            )
                        })
                    );

                    children.push(new Table({
                        rows: [new TableRow({ children: headerCells }), ...dataRows],
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));

                    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
                    inTable = false;
                    tableRows = [];
                    tableHeaders = [];
                }

                if (trimmed) {
                    // Check for headers
                    if (trimmed.startsWith('### ')) {
                        children.push(new Paragraph({
                            children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, size: 24 })],
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 200, after: 100 }
                        }));
                    } else if (trimmed.startsWith('## ')) {
                        children.push(new Paragraph({
                            children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, size: 26 })],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 300, after: 150 }
                        }));
                    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                        children.push(new Paragraph({
                            children: [new TextRun({ text: trimmed.replace(/\*\*/g, ''), bold: true, size: 22 })],
                            spacing: { after: 100 }
                        }));
                    } else {
                        children.push(new Paragraph({
                            children: [new TextRun({ text: trimmed, size: 22 })],
                            spacing: { after: 80 }
                        }));
                    }
                }
            }
        }

        // Flush remaining table
        if (inTable && tableHeaders.length > 0) {
            const headerCells = tableHeaders.map(h =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: 'ffffff' })], alignment: AlignmentType.CENTER })],
                    shading: { type: ShadingType.SOLID, color: '1565c0' },
                    width: { size: Math.floor(100 / tableHeaders.length), type: WidthType.PERCENTAGE }
                })
            );
            const dataRows = tableRows.map(row =>
                new TableRow({
                    children: row.map(cell =>
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })], alignment: AlignmentType.CENTER })],
                            width: { size: Math.floor(100 / tableHeaders.length), type: WidthType.PERCENTAGE }
                        })
                    )
                })
            );
            children.push(new Table({
                rows: [new TableRow({ children: headerCells }), ...dataRows],
                width: { size: 100, type: WidthType.PERCENTAGE }
            }));
        }
    }

    // Working Notes
    if (solution.workingNotes) {
        children.push(new Paragraph({
            children: [new TextRun({ text: 'Working Notes', bold: true, size: 26, color: '1565c0' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
        }));
        solution.workingNotes.split('\n').forEach(line => {
            if (line.trim()) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: line, size: 22 })],
                    spacing: { after: 80 }
                }));
            }
        });
    }

    // Tips
    if (solution.tips) {
        children.push(new Paragraph({
            children: [new TextRun({ text: 'CBSE Exam Tips', bold: true, size: 26, color: 'e65100' })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
        }));
        solution.tips.split('\n').forEach(line => {
            if (line.trim()) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '💡 ' + line, size: 22, italics: true })],
                    spacing: { after: 80 }
                }));
            }
        });
    }

    const doc = new Document({
        sections: [{ children }],
        styles: {
            default: {
                document: {
                    run: { font: 'Calibri', size: 22 }
                }
            }
        }
    });

    return doc;
}

// Export to DOCX file
router.post('/docx', authMiddleware, async (req, res) => {
    try {
        const { solution } = req.body;
        if (!solution) {
            return res.status(400).json({ error: 'No solution data provided' });
        }

        const doc = createSolutionDocx(solution);
        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=CBSE_Solution.docx');
        res.send(buffer);
    } catch (err) {
        console.error('DOCX export error:', err);
        res.status(500).json({ error: 'Failed to export DOCX' });
    }
});

export default router;
