import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

class DeviceService {
  getPlatform(): Platform {
    const platform = Capacitor.getPlatform();
    return platform as Platform;
  }

  isIOS(): boolean {
    return this.getPlatform() === 'ios' || this.getMobileOperatingSystem() === 'iOS';
  }

  isAndroid(): boolean {
    return this.getPlatform() === 'android' || this.getMobileOperatingSystem() === 'Android';
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  getMobileOperatingSystem(): 'iOS' | 'Android' | 'unknown' {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const platform = navigator.platform || '';

    // Android detection
    if (/android/i.test(userAgent)) {
      return 'Android';
    }

    // iOS detection (iPhone, iPod, iPad)
    if (/iPad|iPhone|iPod/.test(userAgent) || 
       (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) { // iPad Pro / iPadOS Safari
      return 'iOS';
    }

    // Secondary check for platform string
    if (/android/i.test(platform)) {
      return 'Android';
    }
    
    if (/iPhone|iPad|iPod/i.test(platform)) {
      return 'iOS';
    }

    return 'unknown';
  }

  getDetailedInfo() {
    return {
      platform: this.getPlatform(),
      os: this.getMobileOperatingSystem(),
      isNative: this.isNative(),
      userAgent: navigator.userAgent
    };
  }

  getPlatformLabel(): string {
    if (this.isNative()) {
      return this.isIOS() ? 'iOS App' : 'Android App';
    }
    
    const os = this.getMobileOperatingSystem();
    if (os !== 'unknown') {
      return `${os} (PWA/Web)`;
    }
    
    return 'Web Browser';
  }

  // Auto-detection on load
  init() {
    console.log(`[DeviceDetection] Platform: ${this.getPlatformLabel()}`);
  }
}

export const deviceService = new DeviceService();
deviceService.init();
