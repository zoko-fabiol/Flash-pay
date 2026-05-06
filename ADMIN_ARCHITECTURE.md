# 📊 Flash Pay Admin - Architecture & Spécifications

## 🎯 Vue d'ensemble

L'interface admin centralisée pour la gestion complète de la plateforme Flash Pay avec:
- Gestion des configurations globales
- Validation des transactions
- Gestion des opérateurs et pays
- Suivi des problèmes
- Reporting et analytics

---

## 🔐 Authentification Admin

### Structure
```
/admin/login
├── Email/Mot de passe
├── Authentification Firebase (admin custom claims)
└── Session sécurisée (JWT token)
```

### Détails
- Seuls les utilisateurs avec `isAdmin: true` dans Firestore peuvent accéder
- Token JWT stocké dans localStorage avec expiration
- Logs d'accès admin enregistrés dans Firestore

---

## 📱 Sections Admin Principales

### 1️⃣ **TABLEAU DE BORD (Dashboard)**

#### Widgets d'Analytics
```
┌─────────────────────────────────┐
│ • Transactions aujourd'hui       │
│ • Montant total traité          │
│ • Commissions gagnées           │
│ • Nombre d'utilisateurs actifs  │
│ • Taux de conversion            │
│ • Erreurs/Problèmes en cours    │
└─────────────────────────────────┘
```

#### Graphiques
- Flux de transactions par jour/semaine/mois
- Distribution par pays/opérateur
- Répartition des types de transfert
- Top pays utilisateurs
- Revenue tracking

#### Alertes
- Transactions en attente depuis >30min
- Problèmes d'annulation signalés
- Opérateurs indisponibles
- Taux de change anormaux

---

### 2️⃣ **QUEUE DE TRANSACTIONS**

#### État: Transactions en Attente de Validation

**Colonne**: `transactions`

```javascript
{
  id: string,
  userId: string,
  type: 'russia-africa' | 'africa-russia' | 'russia-russia',
  status: 'pending' | 'proof_received' | 'confirmed' | 'completed' | 'failed',
  amount: number,
  currency: string,
  fromCountry: string,
  toCountry: string,
  operator: string,
  proofUrl: string,        // URL Firebase Storage
  createdAt: timestamp,
  statusHistory: [
    { status, timestamp, notes }
  ],
  adminNotes: string,
  problemFlags: [
    { type: 'missing_proof' | 'wrong_amount' | 'operator_error' | 'other',
      reportedAt: timestamp,
      description: string,
      resolved: boolean
    }
  ]
}
```

#### Fonctionnalités
- **Liste triable** par:
  - Date (DESC)
  - Montant
  - État
  - Type de transfert
  - Opérateur/Pays
  
- **Recherche rapide** par:
  - ID transaction
  - ID utilisateur
  - Numéro de téléphone
  - Numéro de compte

- **Actions Admin**:
  ```
  ┌─────────────────────────────┐
  │ 👁️  Voir détails            │
  │ ✅ Confirmer réception       │
  │ ❌ Signaler problème         │
  │ 🔧 Ajouter note admin        │
  │ ✔️  Valider transfert        │
  │ 🚫 Annuler & rembouser       │
  └─────────────────────────────┘
  ```

#### Flow de Validation
```
1. Admin clique "Voir détails"
   └─ Affiche: Preuve, montant, opérateur, données client

2. Admin examine la preuve
   └─ Vérifie: Montant correct? Bonne date? Client correct?

3. Admin confirme réception du transfert client
   └─ Status: proof_received
   └─ Envoie SMS/Email au client: "Reçu par nos services"

4. Options:
   ✅ VALIDER → status: completed
   ❌ SIGNAL PROBLÈME → Flags le problème (voir section 3)
   ⚠️  ANNULER → status: failed + remboursement automati
```

---

### 3️⃣ **SIGNALEMENT DE PROBLÈMES**

#### Types de Problèmes
```
┌─────────────────────────────────┐
│ ❌ Preuve manquante             │
│    → Relancer client KYC        │
├─────────────────────────────────┤
│ ❌ Montant incorrect            │
│    → Demander correction         │
├─────────────────────────────────┤
│ ❌ Erreur opérateur             │
│    → Contacter opérateur        │
├─────────────────────────────────┤
│ ❌ Client non identifié         │
│    → Validation KYC requise     │
├─────────────────────────────────┤
│ ❌ Autre problème               │
│    → Champ description libre    │
└─────────────────────────────────┘
```

#### Flow de Signalement
```
1. Admin clique "Signaler problème"
2. Sélectionne type de problème
3. Ajoute description détaillée
4. Choisit action:
   ├─ 📧 Envoyer message au client
   ├─ 📞 Contacter opérateur
   └─ 🔄 Refund automati
5. Transaction passe en status: "flagged_problem"
6. Historique enregistré avec timestamp admin
```

#### Résolution
```
Admin peut:
├─ Attendre message client
├─ Valider manuellement
├─ Modifier certaines données (montant, opérateur)
└─ Forcer completion si problème résolu
```

---

### 4️⃣ **CONFIGURATION TAUX & PARAMÈTRES**

#### Taux de Change

**Collection**: `exchange_rates`
```javascript
{
  id: 'USD_EUR',
  from: 'USD',
  to: 'EUR',
  rate: 0.92,
  updatedAt: timestamp,
  updatedBy: adminId,
  source: 'manual' | 'api',
  margin: 0.02  // 2% marge
}
```

**Interface Admin**:
```
┌─────────────────────────────────┐
│ Devises supportées:             │
├─────────────────────────────────┤
│ 💵 USD ↔ EUR  Rate: 0.92       │
│ 💵 USD ↔ RUB  Rate: 95.5       │
│ 💵 USD ↔ XAF  Rate: 650        │
│ 💶 EUR ↔ RUB  Rate: 103        │
│ 💶 EUR ↔ XAF  Rate: 706        │
│ 💴 RUB ↔ XAF  Rate: 6.85       │
└─────────────────────────────────┘
```

**Édition**:
- Modifier taux manuellement
- Importer taux depuis API externe (forex)
- Appliquer marge automatique
- Historique des changements

---

#### Commissions

**Collection**: `commissions`
```javascript
{
  transferType: 'russia-russia' | 'russia-africa' | 'africa-russia',
  percentage: 2.5,        // 2.5%
  minAmount: 10,
  maxAmount: 5000,
  currency: 'USD',
  updatedAt: timestamp,
  updatedBy: adminId
}
```

**Interface**:
- Édition par type de transfert
- Limites min/max configurables
- Historique des modifications

---

### 5️⃣ **GESTION PAYS & DÉPÔTS**

#### Pays Africains

**Collection**: `countries`
```javascript
{
  code: 'CM',
  name: 'Cameroun',
  continent: 'africa',
  currency: 'XAF',
  operators: ['MTN', 'Orange', 'Nexttel'],
  banks: ['Ecobank', 'BICEC', 'SG Cameroun'],
  depositAccounts: [
    {
      operator: 'MTN',
      number: '237680000000',  // Numéro MTN official
      holder: 'FLASH PAY CAMEROUN SARL',
      type: 'mobile_money',
      active: true
    }
  ],
  enabled: true,
  updatedAt: timestamp,
  updatedBy: adminId
}
```

#### Opérateurs Télécom

**Collection**: `operators`
```javascript
{
  id: 'MTN_CM',
  name: 'MTN Cameroun',
  country: 'CM',
  phonePrefix: ['650', '680', '651', '681'],
  depositNumber: '237680000000',
  depositHolder: 'FLASH PAY',
  apiKey: 'sk_test_xxx',
  enabled: true,
  rates: {
    minSend: 100,      // XAF
    maxSend: 500000
  }
}
```

#### Banques Russes

**Collection**: `banks`
```javascript
{
  id: 'SBER_RU',
  name: 'Sberbank',
  country: 'RU',
  accountNumber: '1234567890',
  correspondentAccount: '30101810400000000225',
  bankCode: '044525225',
  holder: 'FLASH PAY LLC',
  SWIFT: 'SABRRUMM',
  enabled: true
}
```

**Interface Admin**:
```
TAB: Pays
├─ Liste des pays
├─ Éditer pays (devise, opérateurs)
└─ Archiver/Activer

TAB: Opérateurs
├─ Liste opérateurs par pays
├─ Ajouter/Éditer numéro dépôt
├─ Modifier préfixes téléphone
└─ Tester connexion API

TAB: Banques Russes
├─ Liste des comptes
├─ Ajouter nouveau compte
├─ Éditer infos SWIFT
└─ Archiver compte
```

---

### 6️⃣ **VALIDATION KYC**

#### Structure KYC

**Collection**: `kyc_requests`
```javascript
{
  id: string,
  userId: string,
  email: string,
  fullName: string,
  status: 'pending' | 'approved' | 'rejected',
  documents: {
    idProof: { url, type, uploadedAt },
    addressProof: { url, type, uploadedAt },
    selfie: { url, uploadedAt }
  },
  submittedAt: timestamp,
  reviewedAt: timestamp,
  reviewedBy: adminId,
  rejectionReason: string,
  notes: string
}
```

**Interface Admin**:
```
┌────────────────────────────────┐
│ À vérifier (3 demandes)        │
├────────────────────────────────┤
│ • Jean Dupont (Fr)             │
│ • Maria Silva (Cameroun)       │
│ • Dmitri Volkov (Russie)       │
└────────────────────────────────┘

Détails:
├─ 📄 Pièce d'identité
├─ 🏠 Preuve d'adresse
├─ 🤳 Selfie
├─ ✅ Approuver
├─ ❌ Rejeter (+ raison)
└─ 💾 Sauvegarder notes
```

---

## 📊 Workflows Complets

### Workflow 1: Transaction Normale ✅

```
User envoie transfert
    ↓
📧 Preuve upload par client
    ↓
🔔 Admin reçoit alerte
    ↓
👁️  Admin examine preuve
    ↓
✅ Montant + Opérateur OK?
    ├─ OUI → Confirmer réception
    └─ NON → Signaler problème
    ↓
📧 Confirmation envoyée au client
    ↓
✔️  Admin valide la transaction
    ↓
🎉 Transaction complétée
    ↓
💰 Montant reçu opérateur?
    ├─ OUI → Status: completed
    └─ NON → Recheck demain
```

### Workflow 2: Problème Détecté ⚠️

```
Admin détecte anomalie
    ↓
🚩 Signale problème
    ├─ Type: Montant incorrect?
    ├─ Opérateur indisponible?
    └─ Preuve insuffisante?
    ↓
📧 Message envoyé au client
    ↓
⏰ En attente de réponse (24h)
    ↓
Réponse reçue?
    ├─ OUI: Vérifier correction
    │   ├─ Corrections OK → Valider
    │   └─ Corrections NON → Escalade
    └─ NON: Relancer client (48h max)
    ↓
🔄 Remboursement si pas de résolution
```

### Workflow 3: Annulation 🚫

```
Client demande annulation
    ↓
Status: cancelled_requested
    ↓
Admin valide raison
    ↓
💰 Remboursement lancé
    ├─ Via: Compte bancaire original
    └─ Délai: 2-5 jours ouvrables
    ↓
Transaction complètement fermée
    ↓
📧 Confirmation envoyée au client
```

---

## 🔄 State Management (Firebase)

### Collections Requises

```
Firestore/
├── users/
│   └── [userId]/
│       ├── email
│       ├── emailVerified
│       ├── isAdmin (boolean)
│       └── kycStatus
│
├── transactions/
│   └── [transactionId]/
│       ├── userId
│       ├── status
│       ├── amount
│       ├── proofUrl
│       ├── adminNotes
│       ├── statusHistory[]
│       └── problemFlags[]
│
├── exchange_rates/
│   └── [rateId]/
│
├── commissions/
│   └── [commissionId]/
│
├── countries/
│   └── [countryCode]/
│
├── operators/
│   └── [operatorId]/
│
├── banks/
│   └── [bankId]/
│
├── kyc_requests/
│   └── [kycId]/
│
└── admin_logs/
    └── [logId]/
        ├── adminId
        ├── action
        ├── timestamp
        └── details
```

---

## 🔐 Sécurité

### Firestore Rules

```javascript
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  allow read: if request.auth.token.isAdmin == true;
}

match /transactions/{transactionId} {
  allow read, write: if resource.data.userId == request.auth.uid;
  allow read, write: if request.auth.token.isAdmin == true;
}

match /exchange_rates/{rateId} {
  allow read: if true;
  allow write: if request.auth.token.isAdmin == true;
}

// ... etc pour chaque collection
```

### Roles & Permissions

```javascript
// Custom Claims Firebase Auth
{
  isAdmin: true,
  adminLevel: 'super' | 'moderator',
  canEditRates: true,
  canValidateTransactions: true,
  canViewReports: true,
  permissions: ['manage_operators', 'manage_kyc', ...]
}
```

---

## 📱 Interface Technologie

### Stack Recommandé (React)

```
React 19 + TypeScript
├── React Router (navigation)
├── Context API (state admin)
├── Firebase Admin SDK (authentification)
├── TanStack Table (listes/tableaux)
├── Chart.js / Recharts (graphiques)
├── React Hook Form (formulaires)
├── Tailwind CSS (styling)
└── Lucide Icons (icônes)
```

### Pages Admin

```
/admin
├── /admin/login
├── /admin/dashboard
├── /admin/queue
│   ├── /admin/queue/[transactionId]
│   └── /admin/queue/report-problem
├── /admin/settings
│   ├── /admin/settings/exchange-rates
│   ├── /admin/settings/commissions
│   └── /admin/settings/general
├── /admin/countries
│   ├── /admin/countries/list
│   ├── /admin/countries/[code]
│   ├── /admin/operators
│   └── /admin/banks
├── /admin/kyc
│   ├── /admin/kyc/pending
│   ├── /admin/kyc/[kycId]
│   └── /admin/kyc/approved
└── /admin/reports
    ├── /admin/reports/transactions
    ├── /admin/reports/revenue
    └── /admin/reports/users
```

---

## 📈 Fonctionnalités Avancées (Phase 2)

- ✅ Export données (CSV, PDF)
- ✅ Statistiques temps réel
- ✅ Alertes automatiques
- ✅ Notifications Telegram/Email
- ✅ Audit trail complet
- ✅ API management
- ✅ Scripts de batch processing
- ✅ Graphiques prédictifs
- ✅ A/B testing features
- ✅ Multi-langue interface admin

---

## 🎯 Priorités Implémentation

### Phase 1 (MVP)
1. Authentication admin
2. Dashboard basique
3. Queue transactions
4. Confirmer/Rejeter transactions
5. Édition taux de change

### Phase 2
1. KYC management
2. Gestion pays/opérateurs
3. Signalement problèmes avancé
4. Reports détaillés

### Phase 3
1. Automations
2. Webhooks opérateurs
3. API management
4. Advanced analytics
