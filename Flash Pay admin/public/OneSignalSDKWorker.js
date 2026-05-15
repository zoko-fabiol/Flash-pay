// Keep a top-level message handler during initial worker evaluation.
// This avoids browser warnings about late message handler registration.
self.addEventListener('message', (event) => {
	if (event?.data?.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
