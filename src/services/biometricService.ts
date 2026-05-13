import { NativeBiometric, BiometryType, AccessControl } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface BiometricCredentials {
  email: string;
  password: string;
}

const STORAGE_KEY = 'flash_pay_biometric_creds';
const SERVER_ID = 'site.flash-pay.app'; // Unique ID for the keychain/keystore

export const biometricService = {
  /**
   * Checks if biometric authentication is available on this device
   */
  async isAvailable(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false;
    
    // Strictly only allow on native platform (APK/iOS)
    if (!isNative) {
      return false;
    }

    if (isNative) {
      try {
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
      } catch (error) {
        console.error('Biometric availability check failed:', error);
        return false;
      }
    }
    
    // Web/PWA check: Check if WebAuthn is supported and a platform authenticator (TouchID/FaceID/Fingerprint) is available
    try {
      return !!window.PublicKeyCredential && 
             await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Gets the type of biometry available (Fingerprint, FaceID, etc.)
   */
  async getBiometryType(): Promise<BiometryType | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBiometric.isAvailable();
        return result.biometryType || null;
      } catch {
        return null;
      }
    }
    return BiometryType.FINGERPRINT; // Default for web
  },

  /**
   * Securely saves credentials to the device's Keychain or WebAuthn storage
   */
  async saveCredentials(creds: BiometricCredentials): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.setCredentials({
          username: creds.email,
          password: creds.password,
          server: SERVER_ID,
          accessControl: AccessControl.BIOMETRY_ANY,
        });
      } else {
        // WebAuthn "Registration" simulation for PWA
        // This triggers the biometric prompt on the browser
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Flash Pay" },
            user: {
              id: new Uint8Array(16),
              name: creds.email,
              displayName: creds.email
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: { userVerification: "required" }
          }
        });

        // Store credentials obfuscated for web
        localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(creds)));
      }
      
      localStorage.setItem('biometric_enabled', 'true');
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
      if (Capacitor.isNativePlatform()) {
        const credentials = await NativeBiometric.getSecureCredentials({
          server: SERVER_ID,
          reason: 'Connectez-vous à Flash Pay avec votre empreinte',
          title: 'Authentification Biométrique',
          subtitle: 'Utilisez votre capteur pour continuer',
          description: 'Veuillez scanner votre empreinte digitale ou votre visage.',
        });

        return {
          email: credentials.username,
          password: credentials.password
        };
      } else {
        // WebAuthn "Authentication" for PWA
        // First check if we have something stored locally, otherwise WebAuthn will show "No credentials"
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          console.warn('No biometric credentials stored in localStorage for this PWA.');
          return null;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.get({
          publicKey: {
            challenge,
            userVerification: "required"
          }
        });

        return JSON.parse(atob(stored));
      }
    } catch (error: any) {
      console.warn('Biometric authentication cancelled or failed:', error);
      return null;
    }
  },

  /**
   * Removes stored credentials and disables biometric login
   */
  async removeCredentials(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.deleteCredentials({
          server: SERVER_ID,
        });
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      localStorage.removeItem('biometric_enabled');
    } catch (error) {
      console.error('Failed to delete biometric credentials:', error);
    }
  }
};
