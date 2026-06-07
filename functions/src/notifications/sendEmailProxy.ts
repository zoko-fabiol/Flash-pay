import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

export const sendEmail = functions.https.onRequest(async (req, res) => {
  // CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const GAS_URL = process.env.VITE_GAS_URL || functions.config().apps?.script_url || 'https://script.google.com/macros/s/AKfycbxA_g3PdHmxw3QVvttBEiFBHQa0DexwEpVckTBRDG377OvWHX2Xzzw4tL2SLso5_C-9Mg/exec';

  try {
    const payload = req.body || {};
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: payload.recipients,
        title: payload.title,
        body: payload.body
      })
    });

    const result = await response.text();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
