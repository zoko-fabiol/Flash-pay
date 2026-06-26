import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  try {
    // Redirect to the direct v1.1.1 APK release URL
    return {
      statusCode: 302,
      headers: {
        Location: 'https://github.com/zoko-fabiol/Flash-pay/releases/download/v1.1.1/FlashPay.apk',
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Error in latest-apk redirect:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
