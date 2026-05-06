import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

// Initialize Firebase (use your config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exchange rates to add/update
const exchangeRates = [
  { from: 'RUB', to: 'XAF', rate: 7.22, description: 'Rouble Russe → Franc CFA' },
  { from: 'XAF', to: 'RUB', rate: 0.1385, description: 'Franc CFA → Rouble Russe' },
  { from: 'RUB', to: 'RUB', rate: 1.0, description: 'Rouble Russe → Rouble Russe' },
  { from: 'XAF', to: 'XAF', rate: 1.0, description: 'Franc CFA → Franc CFA' },
  { from: 'EUR', to: 'XAF', rate: 655.957, description: 'Euro → Franc CFA' },
  { from: 'XAF', to: 'EUR', rate: 0.001525, description: 'Franc CFA → Euro' },
  { from: 'EUR', to: 'RUB', rate: 90.8, description: 'Euro → Rouble Russe' },
  { from: 'RUB', to: 'EUR', rate: 0.011011, description: 'Rouble Russe → Euro' },
];

async function initializeExchangeRates() {
  console.log('🔄 Initializing exchange rates...\n');

  for (const rate of exchangeRates) {
    try {
      // Check if rate already exists
      const q = query(
        collection(db, 'exchange_rates'),
        where('from', '==', rate.from),
        where('to', '==', rate.to)
      );
      const existing = await getDocs(q);

      if (existing.empty) {
        // Add new rate
        const rateRef = doc(collection(db, 'exchange_rates'));
        await setDoc(rateRef, {
          from: rate.from,
          to: rate.to,
          rate: rate.rate,
          description: rate.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Added: ${rate.from} → ${rate.to} = ${rate.rate}`);
      } else {
        // Update existing rate
        const docId = existing.docs[0].id;
        const rateRef = doc(db, 'exchange_rates', docId);
        await setDoc(rateRef, {
          from: rate.from,
          to: rate.to,
          rate: rate.rate,
          description: rate.description,
          updatedAt: new Date(),
        }, { merge: true });
        console.log(`🔄 Updated: ${rate.from} → ${rate.to} = ${rate.rate}`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${rate.from} → ${rate.to}:`, error);
    }
  }

  console.log('\n✨ Exchange rates initialization complete!');
  process.exit(0);
}

initializeExchangeRates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
