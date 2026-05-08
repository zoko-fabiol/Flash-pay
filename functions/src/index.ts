import './notifications/triggers';
import { onNotificationQueueCreated } from './notifications/queueProcessor';
import { onAdminBroadcastCreated } from './notifications/adminBroadcaster';
import { onTransactionConfirmed } from './notifications/transferConfirmationEmail';

// Export queue trigger so firebase-tools picks it up
export { onNotificationQueueCreated };
export { onAdminBroadcastCreated };
export { onTransactionConfirmed };

// Note: triggers are registered by importing triggers file above.
