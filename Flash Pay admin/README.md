# Flash Pay Admin Console 🚀

Interface d'administration centralisée pour la plateforme Flash Pay.

## 🛠 Stack Technique
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Icons**: Lucide React
- **Charts**: Recharts

## 🚀 Installation & Lancement

1. Aller dans le dossier admin:
   ```bash
   cd "Flash Pay admin"
   ```

2. Lancer le mode développement:
   ```bash
   npm run dev
   ```

## 🔐 Configuration
Les variables d'environnement sont configurées dans le fichier `.env`.
L'accès est restreint aux utilisateurs ayant le claim `isAdmin: true` dans Firestore.

## 📊 Fonctionnalités (Phase 1)
- [x] Authentification Admin
- [x] Dashboard Analytics
- [x] Queue de Transactions (Temps réel)
- [x] Validation des preuves de transfert
- [x] Gestion des taux de change & marges

---
&copy; 2026 Flash Pay.
