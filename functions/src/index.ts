import './notifications/triggers';
import { onNotificationQueueCreated } from './notifications/queueProcessor';
import { onAdminBroadcastCreated } from './notifications/adminBroadcaster';
import { onTransactionConfirmed } from './notifications/transferConfirmationEmail';
import { onInAppNotificationCreated } from './notifications/triggers';
import { onesignal } from './notifications/onesignalProxy';
import { sendEmail } from './notifications/sendEmailProxy';

// Export queue trigger so firebase-tools picks it up
export { onNotificationQueueCreated };
export { onAdminBroadcastCreated };
export { onTransactionConfirmed };
export { onInAppNotificationCreated };
export { onesignal };
export { sendEmail };


// Note: triggers are registered by importing triggers file above.
