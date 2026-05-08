import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

let client: Twilio.Twilio | null = null;
if (accountSid && authToken) client = Twilio(accountSid, authToken);

export async function sendSms(to: string, body: string) {
  if (!client) throw new Error('Twilio not configured');
  return client.messages.create({ from: fromNumber, to, body });
}
