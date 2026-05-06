# Flash Pay - Plateforme de Transfert d'Argent

Une application React + Firebase complète de transfert d'argent international vers l'Afrique.

## Fonctionnalités

- ✅ Authentification utilisateur (Login/Signup)
- ✅ Tableau de bord intuitif
- ✅ Transferts d'argent internationaux (EUR, RUB → XAF)
- ✅ Détection automatique d'opérateur mobile
- ✅ Vérification KYC complète
- ✅ Historique des transactions
- ✅ Système de parrainage avec bonus
- ✅ Gestion de profil utilisateur
- ✅ Interface responsive (mobile-first)
- ✅ Design moderne avec Tailwind CSS

## Technologie

- **Frontend**: React 19 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **Routing**: React Router v6
- **Icons**: Lucide React

## Installation

1. Cloner le projet
```bash
cd "Flash Pay React"
npm install
```

2. Configurer Firebase (.env.local)
```bash
cp .env.example .env.local
# Ajouter vos clés Firebase
```

3. Démarrer le développement
```bash
npm run dev
```

4. Build pour production
```bash
npm run build
```

## Structure du Projet

```
src/
├── components/       # Composants réutilisables (Header, Sidebar, Layout)
├── pages/           # Pages principales
├── context/         # Context API (Auth, App)
├── services/        # Services Firebase
├── types/           # Types TypeScript
├── constants/       # Constantes (pays, devises, etc.)
├── hooks/           # Hooks personnalisés
├── App.tsx          # Routage principal
└── main.tsx         # Point d'entrée
```

## Pages

- **Login** - Authentification
- **Signup** - Inscription avec code de parrainage
- **Dashboard** - Tableau de bord principal
- **Transfer** - Formulaire de transfert avec calcul de frais
- **Transactions** - Historique avec filtres
- **KYC** - Vérification d'identité
- **Referral** - Système de parrainage
- **Profile** - Gestion du compte

## Configuration Firebase

Créez un projet Firebase et remplacez les variables d'environnement dans `.env.local`:

```javascript
// .env.local
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Données Personnelles

- **Pays**: Cameroun, Côte d'Ivoire, Sénégal
- **Opérateurs**: MTN, Orange, Moov, Free, Expresso
- **Devises**: EUR, RUB, USD
- **Frais**: 2% sur tous les transferts

## Scripts

```bash
npm run dev      # Démarrer le serveur de développement
npm run build    # Build production
npm run preview  # Aperçu du build
npm run lint     # Vérifier le code
```

## Notes

- L'authentification et la base de données utilisent Firebase
- Les transferts sont stockés dans Firestore
- Les bonus de parrainage sont calculés automatiquement
- L'interface est complètement responsive
- Les codes de parrainage sont générés automatiquement

## Développement

Pour activer le mode développement avec les données mock:

Les utilisateurs peuvent se connecter sans Firebase configuré (voir les services Firebase).

## Licence

Propriétaire - 2026
