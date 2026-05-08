import * as sgMail from '@sendgrid/mail';
import { initAdmin } from '../utils/admin';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmail(to: string, subject: string, html: string, from?: string) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }
  const msg = {
    to,
    from: from || process.env.SENDGRID_FROM || 'no-reply@flashpay.example',
    subject,
    html,
  };
  return sgMail.send(msg);
}
