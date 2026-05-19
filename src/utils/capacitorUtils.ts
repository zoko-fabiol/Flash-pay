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

export const downloadPdfNative = async (
  base64Data: string, 
  fileName: string,
  mode: 'download' | 'share' = 'download'
): Promise<'saved' | 'shared' | 'fallback_shared' | 'failed'> => {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    // Remove the prefix if present (e.g., data:application/pdf;base64,)
    const base64 = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;

    if (mode === 'download') {
      // 1. Try to check/request storage permissions (required for public Documents directory on some Android versions)
      try {
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permError) {
        console.warn('[Capacitor] Permission check/request bypassed or failed:', permError);
      }

      // Try 1: Write directly to the root of the public Documents folder (Scoped Storage safe, no folder creation required!)
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
        });
        console.log('[Capacitor] PDF written directly to root of Documents:', fileName);
        return 'saved';
      } catch (err1) {
        console.warn('[Capacitor] Try 1 failed (root of Documents), trying subfolder:', err1);

        // Try 2: Write to the subfolder inside public Documents
        try {
          try {
            await Filesystem.mkdir({
              path: 'Flash Pay',
              directory: Directory.Documents,
              recursive: true,
            });
          } catch (m1) {
            console.warn('[Capacitor] mkdir Documents/Flash Pay failed, continuing anyway:', m1);
          }

          await Filesystem.writeFile({
            path: `Flash Pay/${fileName}`,
            data: base64,
            directory: Directory.Documents,
          });
          console.log('[Capacitor] PDF written to Documents/Flash Pay:', fileName);
          return 'saved';
        } catch (err2) {
          console.warn('[Capacitor] Try 2 failed (Documents subfolder), trying root of External storage:', err2);

          // Try 3: Write directly to the root of App-Specific External Storage (100% success on modern Android)
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.External,
            });
            console.log('[Capacitor] PDF written directly to root of External storage:', fileName);
            return 'saved';
          } catch (err3) {
            console.warn('[Capacitor] Try 3 failed (root of External), trying subfolder of External storage:', err3);

            // Try 4: Write to subfolder inside App-Specific External Storage
            try {
              try {
                await Filesystem.mkdir({
                  path: 'Documents/Flash Pay',
                  directory: Directory.External,
                  recursive: true,
                });
              } catch (m2) {
                console.warn('[Capacitor] mkdir External/Documents/Flash Pay failed:', m2);
              }

              await Filesystem.writeFile({
                path: `Documents/Flash Pay/${fileName}`,
                data: base64,
                directory: Directory.External,
              });
              console.log('[Capacitor] PDF written to External/Documents/Flash Pay:', fileName);
              return 'saved';
            } catch (err4) {
              console.error('[Capacitor] All download attempts failed, falling back to Share sheet:', err4);
              throw err4; // Let the catch block handle the share sheet fallback
            }
          }
        }
      }
    } else {
      // Save to cache directory + Native Share sheet
      const { Share } = await import('@capacitor/share');

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        url: result.uri,
      });

      return 'shared';
    }
  } catch (error) {
    console.error('[Capacitor] PDF Native Action failed, trying fallback Share sheet:', error);
    
    // Fallback if direct download fails (e.g. permission or platform issues)
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64 = base64Data.includes('base64,') 
        ? base64Data.split('base64,')[1] 
        : base64Data;

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        url: result.uri,
      });

      return mode === 'download' ? 'fallback_shared' : 'shared';
    } catch (fallbackError) {
      console.error('[Capacitor] PDF Native completely failed:', fallbackError);
      return 'failed';
    }
  }
};
