import { NativeBiometric, BiometryType, AccessControl } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface BiometricCredentials {
  email: string;
  password: string;
}

const SERVER_ID = 'site.flash-pay.admin'; // Unique ID for the admin app

export const biometricService = {
  /**
   * Checks if biometric authentication is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  },

  /**
   * Gets the type of biometry available (Fingerprint, FaceID, etc.)
   */
  async getBiometryType(): Promise<BiometryType | null> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch {
      return null;
    }
  },

  /**
   * Securely saves credentials to the device's Keychain or Keystore
   */
  async saveCredentials(creds: BiometricCredentials): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username: creds.email,
        password: creds.password,
        server: SERVER_ID,
        accessControl: AccessControl.BIOMETRY_ANY,
      });
      localStorage.setItem('admin_biometric_enabled', 'true');
      return true;
    } catch (error) {
      console.error('Failed to save biometric credentials:', error);
      return false;
    }
  },

  /**
   * Retrieves credentials after successful biometric authentication
   */
  async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentials = await NativeBiometric.getSecureCredentials({
        server: SERVER_ID,
        reason: 'Accédez au portail admin Flash Pay avec votre empreinte',
        title: 'Authentification Admin',
        subtitle: 'Sécurité Biométrique',
        description: 'Veuillez scanner votre empreinte digitale pour accéder à la console.',
      });

      return {
        email: credentials.username,
        password: credentials.password
      };
    } catch (error: any) {
      // User cancelled or authentication failed
      console.warn('Biometric authentication cancelled or failed:', error);
      return null;
    }
  },

  /**
   * Removes stored credentials and disables biometric login
   */
  async removeCredentials(): Promise<void> {
    try {
      await NativeBiometric.deleteCredentials({
        server: SERVER_ID,
      });
      localStorage.removeItem('admin_biometric_enabled');
    } catch (error) {
      console.error('Failed to delete biometric credentials:', error);
    }
  }
};
