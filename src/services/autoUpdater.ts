import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

/**
 * Auto-Update Service pour Flash Pay
 * 
 * Utilise @capgo/capacitor-updater pour mettre à jour le bundle JS silencieusement
 * sans que l'utilisateur ait besoin de réinstaller l'APK.
 * 
 * Flux :
 * 1. Au démarrage → notifyAppReady() (confirme que le bundle actuel fonctionne)
 * 2. En arrière-plan → vérifie si une nouvelle version est disponible sur le serveur
 * 3. Si nouvelle version → télécharge silencieusement
 * 4. Au prochain lancement → applique automatiquement la nouvelle version
 */

const AUTO_UPDATE_URL = 'https://flash-pay.netlify.app/.netlify/functions/bundle-update';

export const autoUpdaterService = {
  /**
   * À appeler dès que l'app est chargée et fonctionnelle.
   * CRITIQUE : sans cet appel, le plugin rollback automatiquement vers la version précédente.
   */
  async notifyReady(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[AutoUpdater] App ready notified ✅');
    } catch (err) {
      console.warn('[AutoUpdater] notifyAppReady failed:', err);
    }
  },

  /**
   * Vérifie manuellement si une mise à jour est disponible et la télécharge.
   * En mode autoUpdate (configuré dans capacitor.config.ts), ceci est automatique.
   * Cette méthode est un fallback pour un contrôle manuel si besoin.
   */
  async checkAndDownload(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const response = await fetch(AUTO_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: 'com.flashpay.app',
          platform: 'android',
        }),
      });

      if (!response.ok) return;

      const data = await response.json() as { version?: string; url?: string };
      if (!data.version || !data.url) {
        console.log('[AutoUpdater] No update available');
        return;
      }

      console.log(`[AutoUpdater] Downloading bundle v${data.version}...`);
      const bundle = await CapacitorUpdater.download({
        url: data.url,
        version: data.version,
      });

      // Planifier l'application au prochain démarrage
      await CapacitorUpdater.next(bundle);
      console.log(`[AutoUpdater] Bundle v${data.version} ready for next launch ✅`);
    } catch (err) {
      console.warn('[AutoUpdater] checkAndDownload error:', err);
    }
  },
};
