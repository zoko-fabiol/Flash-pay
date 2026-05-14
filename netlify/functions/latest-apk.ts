import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

export const handler: Handler = async () => {
  try {
    const response = await fetch('https://api.github.com/repos/zoko-fabiol/Flash-pay/releases/latest');
    if (!response.ok) {
      throw new Error('Failed to fetch latest release from GitHub');
    }

    const release = await response.json() as any;
    const apkAsset = release.assets.find((asset: any) => asset.name.endsWith('.apk'));

    if (!apkAsset) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No APK asset found in the latest release' }),
      };
    }

    // Redirect to the browser_download_url
    return {
      statusCode: 302,
      headers: {
        Location: apkAsset.browser_download_url,
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Error fetching latest APK:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
