# 🏛️ Architecture & Spécifications : Console Admin Flash Pay

Voici une synthèse structurée des fonctionnalités implémentées, combinant les concepts du projet source `Flash Pay\admin` et les améliorations modernes de la version React.

---

## 1. ⚙️ Configuration Financière (Taux & Commissions)
*   **Taux de Change Maîtrisés** : 
    *   Gestion centrale des taux **EUR/XAF** et **RUB/XAF**.
    *   **Taux Personnalisés** : Possibilité d'ajouter des paires spécifiques (ex: USD/XAF) pour les opérations hors-standard.
    *   **Marges Plateforme** : Ajustement d'un pourcentage de commission (ex: +2%) appliqué au taux de base pour générer le taux client.
*   **Grille des Commissions** : Définition des frais de service selon des tranches de montants (ex: 0-50k = 500 XAF).

## 2. 🌍 Gestion du Réseau (Pays & Opérateurs)
*   **Configuration des Pays Africains** : 
    *   Nom, Code pays (CM, CI), Devise locale.
    *   **Dial Codes** : Préfixes téléphoniques (ex: +237) pour la validation automatique.
*   **Gestion des Opérateurs Télécom** :
    *   **Numéros de Dépôt** : Configuration du numéro de compte (Orange Money, MTN, etc.) où les clients effectuent leurs dépôts locaux.
    *   **Filtrage par Préfixes** : Liste des préfixes autorisés par opérateur (ex: 655, 690) pour limiter les erreurs de saisie.

## 3. 🏦 Réseau Bancaire Russe
*   **Points de Réception en Russie** : 
    *   Configuration des banques russes (Sberbank, Tinkoff, etc.).
    *   **Modes de Transfert** : Support du virement par numéro de téléphone (Système de Paiement Rapide - SBP) ou par numéro de carte.

## 4. 🔄 Workflow de Transfert (Gestion des Commandes)
C'est le cœur de l'application, gérant le cycle de vie de chaque commande :
1.  **🕒 En Attente (Pending)** : Commande créée par le client.
2.  **🧾 Preuve Reçue (Proof Received)** : Le client a téléchargé son reçu de dépôt. L'admin vérifie le crédit sur son compte.
3.  **✅ Validation Finale (Completed)** : Une fois le transfert vers la destination effectué, l'admin valide la transaction et génère le reçu final.
4.  **⚠️ Signalement de Problème** : Mise en attente pour vérification manuelle (ex: montant erroné).
5.  **❌ Annulation / Rejet** : En cas de non-réception des fonds ou preuve invalide.

## 5. 🚨 Gestion des Litiges & Support
*   **Signalement d'Anomalies** : Espace dédié pour voir les rapports de problèmes envoyés par les clients.
*   **Historique de Statut** : Chaque transaction possède un journal horodaté (Timeline) montrant qui a fait quoi et quand.

## 6. 🛡️ Validation KYC (Identité)
*   **Vérification de Conformité** : Revue des pièces d'identité (CNI, Passeport) téléchargées par les utilisateurs.
*   **Approbation en un clic** : Libère les limites de transfert de l'utilisateur une fois validé.

---

## 📊 Nouveautés Dashboard (Analytics Temps Réel)
*   **Flux de Volume** : Graphique dynamique des montants traités par jour.
*   **Trajets Populaires** : Statistiques sur les corridors les plus actifs (ex: Russie → Côte d'Ivoire).
*   **Alertes d'Urgence** : Notification visuelle immédiate des transactions bloquées ou signalées.
