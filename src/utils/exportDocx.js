import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Parse markdown text into styled paragraphs
function parseMarkdownToParagraphs(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const paragraphs = [];
    let inTable = false;
    let tableRows = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
            if (inTable && tableRows.length > 0) {
                paragraphs.push(createTable(tableRows));
                tableRows = [];
                inTable = false;
            }
            paragraphs.push(new Paragraph({ text: '' }));
            continue;
        }

        // Table separator line (---|---|---)
        if (/^\|?[\s-:|]+\|?$/.test(trimmed) && trimmed.includes('-')) {
            inTable = true;
            continue;
        }

        // Table row
        if (trimmed.startsWith('|') || (inTable && trimmed.includes('|'))) {
            inTable = true;
            const cells = trimmed.split('|').filter((c, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
            if (cells.length > 0) {
                tableRows.push(cells);
            }
            continue;
        }

        // If we were in a table and hit a non-table line, flush
        if (inTable && tableRows.length > 0) {
            paragraphs.push(createTable(tableRows));
            tableRows = [];
            inTable = false;
        }

        // Headings
        if (trimmed.startsWith('### ')) {
            paragraphs.push(new Paragraph({
                heading: HeadingLevel.HEADING_3,
                children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, size: 24 })]
            }));
        } else if (trimmed.startsWith('## ')) {
            paragraphs.push(new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, size: 28 })]
            }));
        } else if (trimmed.startsWith('# ')) {
            paragraphs.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: trimmed.replace('# ', ''), bold: true, size: 32 })]
            }));
        }
        // Bullet points
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            paragraphs.push(new Paragraph({
                bullet: { level: 0 },
                children: parseInlineFormatting(trimmed.substring(2))
            }));
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(trimmed)) {
            paragraphs.push(new Paragraph({
                children: parseInlineFormatting(trimmed)
            }));
        }
        // Regular paragraph
        else {
            paragraphs.push(new Paragraph({
                children: parseInlineFormatting(trimmed),
                spacing: { after: 100 }
            }));
        }
    }

    // Flush remaining table
    if (tableRows.length > 0) {
        paragraphs.push(createTable(tableRows));
    }

    return paragraphs;
}

// Parse inline bold/italic
function parseInlineFormatting(text) {
    const runs = [];
    // Split by **bold** and *italic* patterns
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);

    for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22 }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size: 22 }));
        } else if (part) {
            runs.push(new TextRun({ text: part, size: 22 }));
        }
    }

    return runs;
}

// Create a DOCX table from rows
function createTable(rows) {
    if (rows.length === 0) return new Paragraph({ text: '' });

    const maxCols = Math.max(...rows.map(r => r.length));
    const borderStyle = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: '999999',
    };
    const borders = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle,
    };

    const tableRows = rows.map((row, rowIdx) =>
        new TableRow({
            children: Array.from({ length: maxCols }, (_, i) =>
                new TableCell({
                    borders,
                    width: { size: Math.floor(9000 / maxCols), type: WidthType.DXA },
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: row[i] || '',
                                    bold: rowIdx === 0,
                                    size: rowIdx === 0 ? 22 : 20,
                                    font: 'Calibri'
                                })
                            ],
                            alignment: AlignmentType.LEFT,
                        })
                    ],
                    shading: rowIdx === 0 ? { fill: 'E8E0F0' } : undefined,
                })
            ),
        })
    );

    return new Table({
        rows: tableRows,
        width: { size: 9000, type: WidthType.DXA },
    });
}

export async function exportSolutionAsDocx(solution) {
    const sections = [];

    // Title
    sections.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'CBSE Accountancy Solution', bold: true, size: 36, color: '4A148C' })],
        spacing: { after: 200 }
    }));

    // Topic
    if (solution.topic) {
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: 'Topic: ', bold: true, size: 24, color: '4A148C' }),
                new TextRun({ text: solution.topic, size: 24 })
            ],
            spacing: { after: 200 }
        }));
        sections.push(new Paragraph({ text: '' }));
    }

    // Explanation
    if (solution.explanation) {
        sections.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '💡 Explanation', bold: true, size: 28, color: '1565C0' })],
            spacing: { before: 200, after: 100 }
        }));
        sections.push(...parseMarkdownToParagraphs(solution.explanation));
        sections.push(new Paragraph({ text: '' }));
    }

    // Solution
    if (solution.solution) {
        sections.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '📊 Step-by-Step Solution', bold: true, size: 28, color: '1565C0' })],
            spacing: { before: 200, after: 100 }
        }));
        sections.push(...parseMarkdownToParagraphs(solution.solution));
        sections.push(new Paragraph({ text: '' }));
    }

    // Working Notes
    if (solution.workingNotes && solution.workingNotes !== 'Not required for this simple journal entry.') {
        sections.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '📋 Working Notes', bold: true, size: 28, color: '1565C0' })],
            spacing: { before: 200, after: 100 }
        }));
        sections.push(...parseMarkdownToParagraphs(solution.workingNotes));
        sections.push(new Paragraph({ text: '' }));
    }

    // Tips
    if (solution.tips) {
        sections.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '🎯 CBSE Exam Tips', bold: true, size: 28, color: '388E3C' })],
            spacing: { before: 200, after: 100 }
        }));
        sections.push(...parseMarkdownToParagraphs(solution.tips));
        sections.push(new Paragraph({ text: '' }));
    }

    // Marks Breakdown
    if (solution.marksBreakdown) {
        sections.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '📊 Marks Breakdown', bold: true, size: 28, color: 'E65100' })],
            spacing: { before: 200, after: 100 }
        }));
        sections.push(...parseMarkdownToParagraphs(solution.marksBreakdown));
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `CBSE_Solution_${solution.topic || 'Answer'}.docx`);
}
