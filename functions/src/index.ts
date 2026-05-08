import './notifications/triggers';
import { processNotificationQueue } from './notifications/queueProcessor';

// Export scheduled processor so firebase-tools picks it up
export { processNotificationQueue };

// Note: triggers are registered by importing triggers file above.
