import jsPDF from 'jspdf';

/**
 * Receipt data interface used by both the user app and admin.
 */
export interface ReceiptData {
  referenceId: string;         // e.g. "#9S3GW23FCP"
  date: string;                // formatted date string
  senderName: string;
  recipientName: string;
  recipientContact: string;    // phone / account number
  sentAmount: number;
  sentCurrency: string;
  exchangeRate: number;
  receivedAmount: number;
  receivedCurrency: string;
  isCompleted: boolean;
  language?: 'fr' | 'en';
}

// ─────────────────────────────────────────────────────────────
// Canvas-based renderer — supports ALL Unicode chars (Cyrillic, Arabic, CJK…)
// ─────────────────────────────────────────────────────────────

const SCALE = 3; // retina-quality canvas

function formatNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F'); // narrow no-break space
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

/**
 * Renders a Flash Pay receipt onto a canvas and returns the canvas element.
 * Uses the browser's built-in font stack, which supports Cyrillic.
 */
export function renderReceiptToCanvas(data: ReceiptData): HTMLCanvasElement {
  const lang = data.language ?? 'fr';
  const W = 500; // logical px
  const H = 720;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  const PURPLE = '#661489';
  const PURPLE_LIGHT = 'rgba(102,20,137,0.08)';
  const TEXT_DARK = '#1a1a2e';
  const TEXT_MID = '#555';
  const TEXT_LIGHT = '#888';
  const BG = '#ffffff';
  const RADIUS = 18;

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Header band ──
  ctx.fillStyle = PURPLE;
  roundRect(ctx, 0, 0, W, 80, 0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('FLASH PAY', W / 2, 38);
  ctx.font = `500 13px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(
    lang === 'en' ? 'OFFICIAL TRANSFER RECEIPT' : 'REÇU DE TRANSFERT OFFICIEL',
    W / 2,
    62,
  );

  // ── Reference + Date row ──
  let y = 112;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_MID;
  ctx.font = `bold 11px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(lang === 'en' ? 'REFERENCE' : 'RÉFÉRENCE', 40, y);
  ctx.textAlign = 'right';
  ctx.fillText(lang === 'en' ? 'DATE OF ISSUE' : "DATE D'ÉMISSION", W - 40, y);

  y += 18;
  ctx.font = `500 14px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_DARK;
  ctx.fillText(data.referenceId, 40, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.date, W - 40, y);

  // ── Divider ──
  y += 24;
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(W - 40, y);
  ctx.stroke();

  // ── Sender / Beneficiary ──
  y += 22;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_MID;
  ctx.font = `bold 11px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(lang === 'en' ? 'SENDER' : 'EXPÉDITEUR', 40, y);
  ctx.textAlign = 'right';
  ctx.fillText(lang === 'en' ? 'BENEFICIARY' : 'BÉNÉFICIAIRE', W - 40, y);

  y += 20;
  ctx.font = `500 15px "Arial", "Helvetica", sans-serif`;
  ctx.fillStyle = TEXT_DARK;
  ctx.textAlign = 'left';
  ctx.fillText(truncateText(ctx, data.senderName || 'Flash Pay Customer', 200), 40, y);

  ctx.textAlign = 'right';
  // Recipient name — this is where Cyrillic was broken in jsPDF
  ctx.fillText(truncateText(ctx, data.recipientName || 'N/A', 200), W - 40, y);

  y += 18;
  ctx.font = `500 12px "Arial", "Helvetica", sans-serif`;
  ctx.fillStyle = TEXT_LIGHT;
  ctx.textAlign = 'right';
  ctx.fillText(data.recipientContact || '', W - 40, y);

  // ── Financial box ──
  y += 26;
  const boxH = 120;
  ctx.fillStyle = PURPLE_LIGHT;
  roundRect(ctx, 30, y, W - 60, boxH, RADIUS);

  const bY = y + 28;

  // Row 1 — Amount sent
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_MID;
  ctx.font = `500 13px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(lang === 'en' ? 'Transfer amount:' : 'Montant du transfert:', 50, bY);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_DARK;
  ctx.font = `bold 13px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(`${formatNum(data.sentAmount)} ${data.sentCurrency}`, W - 50, bY);

  // Row 2 — Rate
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_MID;
  ctx.font = `500 13px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(lang === 'en' ? 'Exchange rate:' : 'Taux appliqué:', 50, bY + 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_MID;
  ctx.fillText(
    `1 ${data.sentCurrency} = ${data.exchangeRate.toFixed(2)} ${data.receivedCurrency}`,
    W - 50,
    bY + 26,
  );

  // Row 3 — Received (highlighted)
  ctx.textAlign = 'left';
  ctx.fillStyle = PURPLE;
  ctx.font = `bold 16px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(lang === 'en' ? 'AMOUNT RECEIVED:' : 'MONTANT PERÇU:', 50, bY + 64);
  ctx.textAlign = 'right';
  ctx.font = `bold 22px "Arial", "Helvetica", sans-serif`;
  ctx.fillText(
    `${formatNum(data.receivedAmount)} ${data.receivedCurrency}`,
    W - 50,
    bY + 64,
  );

  // ── Status badge ──
  y += boxH + 32;
  const badgeW = 200;
  const badgeH = 38;
  const badgeX = (W - badgeW) / 2;
  const isComp = data.isCompleted;
  ctx.fillStyle = isComp ? '#e8fdf1' : '#fff1f2';
  roundRect(ctx, badgeX, y, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = isComp ? '#107c41' : '#e11d48';
  ctx.font = `bold 12px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    isComp
      ? (lang === 'en' ? 'TRANSFER COMPLETED' : 'TRANSFERT EFFECTUÉ')
      : (lang === 'en' ? 'PENDING' : 'EN ATTENTE'),
    W / 2,
    y + 24,
  );

  // ── Footer ──
  ctx.fillStyle = '#bbbbbb';
  ctx.font = `400 11px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Document généré par Flash Pay Admin.', W / 2, H - 28);
  ctx.fillText('1 / 1', W - 40, H - 28);

  return canvas;
}

// ─────────────────────────────────────────────────────────────
// Exported helper — renders canvas → jsPDF A5 document
// ─────────────────────────────────────────────────────────────

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const canvas = renderReceiptToCanvas(data);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pW = pdf.internal.pageSize.getWidth();
  const pH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, 'PNG', 0, 0, pW, pH);

  return pdf;
}

// ─────────────────────────────────────────────────────────────
// Helper: canvas rounded rect fill
// ─────────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
