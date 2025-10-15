import { useState } from 'react';

type Question = {
  id: number | string;
  text: string;
  category?: string;
};

type Answers = Record<string | number, boolean | null | undefined>;

interface PrintableFormOptions {
  assessmentTitle: string;
  questions: Question[];
  answers: Answers;
  notes?: string;
  instructions?: string;
  traumaExposure?: boolean | null;
}

export const usePrintableForm = () => {
  const generateAndPrint = ({
    assessmentTitle,
    questions,
    answers,
    notes = '',
    instructions = '',
    traumaExposure,
  }: PrintableFormOptions) => {
    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${assessmentTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 0 20px; }
          h1, h2 { color: #222; border-bottom: 1px solid #eaeaea; padding-bottom: 10px; }
          .question-group { margin-bottom: 25px; }
          .question { margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #eee; }
          .question p { margin: 0 0 8px 0; }
          .options { display: flex; gap: 20px; }
          .option { display: flex; align-items: center; gap: 8px; font-size: 14px; }
          .checkbox { width: 18px; height: 18px; border: 1px solid #999; border-radius: 4px; background-color: #fff; }
          .checkbox.checked { background-color: #333; border-color: #333; }
          .instructions { background-color: #f9f9f9; border: 1px solid #eaeaea; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
          .notes-section { margin-top: 30px; }
          textarea { width: 100%; min-height: 120px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-family: inherit; font-size: 14px; }
          .print-button { display: block; width: 100px; margin: 30px auto; padding: 10px; border: none; background-color: #007bff; color: white; border-radius: 5px; text-align: center; cursor: pointer; font-size: 16px; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${assessmentTitle}</h1>
        
        ${instructions ? `<div class="instructions">${instructions}</div>` : ''}

        <h2>Questions</h2>
        
        ${traumaExposure !== undefined ? `
          <div class="question-group">
            <div class="question">
              <p><strong>Have you ever in your life experienced a traumatic event?</strong></p>
              <div class="options">
                <div class="option"><div class="checkbox ${traumaExposure === true ? 'checked' : ''}"></div> Yes</div>
                <div class="option"><div class="checkbox ${traumaExposure === false ? 'checked' : ''}"></div> No</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${[...new Set(questions.map(q => q.category || ''))].map(category => `
          <div class="question-group">
            ${category ? `<h3>${category}</h3>` : ''}
            ${questions.filter(q => (q.category || '') === category).map(q => `
              <div class="question">
                <p>${q.text}</p>
                <div class="options">
                  <div class="option"><div class="checkbox ${answers[q.id] === true ? 'checked' : ''}"></div> Yes</div>
                  <div class="option"><div class="checkbox ${answers[q.id] === false ? 'checked' : ''}"></div> No</div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}

        <div class="notes-section">
          <h2>Notes</h2>
          <textarea readonly>${notes}</textarea>
        </div>

        <div class="no-print">
          <button class="print-button" onclick="window.print()">Print</button>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableContent);
      printWindow.document.close();
    }
  };

  return { generateAndPrint };
};
