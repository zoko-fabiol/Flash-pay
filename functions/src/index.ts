import './notifications/triggers';
import { onNotificationQueueCreated } from './notifications/queueProcessor';

// Export queue trigger so firebase-tools picks it up
export { onNotificationQueueCreated };

// Note: triggers are registered by importing triggers file above.
