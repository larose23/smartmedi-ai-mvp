import { SecondOpinionRequest, Consultation, ConsultationFeedback } from '../types/secondOpinion';

export const generateConsultationReport = (
  request: SecondOpinionRequest,
  consultation: Consultation,
  feedback: ConsultationFeedback
): string => {
  const report = [
    'Second Opinion Consultation Report',
    '================================',
    '',
    `Request ID: ${request.id}`,
    `Case ID: ${request.case_id}`,
    `Priority: ${request.priority}`,
    `Status: ${request.status}`,
    '',
    'Consultation Details',
    '-------------------',
    `Scheduled Time: ${new Date(consultation.scheduled_time).toLocaleString()}`,
    `Duration: ${consultation.duration_minutes} minutes`,
    `Status: ${consultation.status}`,
    consultation.notes ? `Notes: ${consultation.notes}` : '',
    '',
    'Feedback',
    '--------',
    `Type: ${feedback.feedback_type}`,
    `Content: ${feedback.feedback}`,
    '',
    'Recommendations',
    '---------------',
    ...feedback.recommendations.map((rec, index) => `${index + 1}. ${rec}`),
    '',
    'Generated on: ' + new Date().toLocaleString(),
  ].join('\n');

  return report;
};

export const downloadReport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportToPDF = async (content: string, filename: string) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Split content into lines and add to PDF
    const lines = content.split('\n');
    let y = 10;
    
    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 7;
    });
    
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; 