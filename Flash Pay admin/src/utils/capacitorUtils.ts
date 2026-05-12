/**
 * capacitorUtils.ts
 * Wrappers around Capacitor plugins that fall back gracefully on web.
 * All functions are safe to call on both web and native Android/iOS.
 */

// ─── Clipboard ───────────────────────────────────────────────────────────────
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return true;
  } catch {
    // Fallback to web API
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
};

// ─── Share ────────────────────────────────────────────────────────────────────
export const nativeShare = async (options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share(options);
    return true;
  } catch {
    // Fallback to Web Share API
    if (navigator.share) {
      try {
        await navigator.share(options);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

// ─── Camera / File Picker ─────────────────────────────────────────────────────
export interface CapturedPhoto {
  dataUrl: string;  // base64 data URL
  blob: Blob;
  file: File;
}

/**
 * Open the native camera or gallery to pick an image.
 * Returns a File object compatible with existing upload logic.
 */
export const pickImageNative = async (
  source: 'CAMERA' | 'PHOTOS' | 'PROMPT' = 'PROMPT'
): Promise<File | null> => {
  try {
    const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');

    const sourceMap = {
      CAMERA: CameraSource.Camera,
      PHOTOS: CameraSource.Photos,
      PROMPT: CameraSource.Prompt,
    };

    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: sourceMap[source],
      saveToGallery: false,
    });

    if (!photo.base64String) return null;

    // Convert base64 to File
    const mimeType = `image/${photo.format || 'jpeg'}`;
    const byteChars = atob(photo.base64String);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: mimeType });
    const fileName = `photo_${Date.now()}.${photo.format || 'jpg'}`;
    return new File([blob], fileName, { type: mimeType });
  } catch (err: any) {
    // User cancelled or web environment
    if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return null;
    // On web, return null and let the fallback <input> handle it
    return null;
  }
};

// ─── Detect if running on Capacitor native ───────────────────────────────────
export const isNativeApp = (): boolean => {
  return typeof (window as any)?.Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.() === true;
};

// ─── PDF Download / Share (Native) ────────────────────────────────────────────
export const downloadPdfNative = async (base64Data: string, fileName: string): Promise<boolean> => {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    // Remove the prefix if present (e.g., data:application/pdf;base64,)
    const base64 = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;

    // Save to Cache directory for sharing
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    // Share the file (this allows user to "Save to Files" or send via WhatsApp/Email)
    await Share.share({
      title: fileName,
      url: result.uri,
    });

    return true;
  } catch (error) {
    console.error('PDF Native Error:', error);
    return false;
  }
};
