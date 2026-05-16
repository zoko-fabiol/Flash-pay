
export const pinService = {
  isEnabled(): boolean {
    return localStorage.getItem('admin_pin_enabled') === 'true';
  },

  setPin(pin: string): void {
    localStorage.setItem('admin_pin', btoa(pin)); // Basic obfuscation
    localStorage.setItem('admin_pin_enabled', 'true');
  },

  verifyPin(pin: string): boolean {
    const stored = localStorage.getItem('admin_pin');
    return stored === btoa(pin);
  },

  removePin(): void {
    localStorage.removeItem('admin_pin');
    localStorage.removeItem('admin_pin_enabled');
    localStorage.removeItem('admin_app_lock_enabled');
  },

  isAppLockEnabled(): boolean {
    return localStorage.getItem('admin_app_lock_enabled') === 'true';
  },

  setAppLockEnabled(enabled: boolean): void {
    localStorage.setItem('admin_app_lock_enabled', String(enabled));
  }
};
