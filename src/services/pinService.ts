
export const pinService = {
  isEnabled(): boolean {
    return localStorage.getItem('pin_enabled') === 'true';
  },

  setPin(pin: string): void {
    localStorage.setItem('user_pin', btoa(pin)); // Basic obfuscation
    localStorage.setItem('pin_enabled', 'true');
  },

  verifyPin(pin: string): boolean {
    const stored = localStorage.getItem('user_pin');
    return stored === btoa(pin);
  },

  removePin(): void {
    localStorage.removeItem('user_pin');
    localStorage.removeItem('pin_enabled');
    localStorage.removeItem('app_lock_enabled');
  },

  isAppLockEnabled(): boolean {
    return localStorage.getItem('app_lock_enabled') === 'true';
  },

  setAppLockEnabled(enabled: boolean): void {
    localStorage.setItem('app_lock_enabled', String(enabled));
  }
};
