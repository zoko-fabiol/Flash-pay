/**
 * Converts a File to a base64 DataURL.
 * Images are compressed, while non-image files such as PDFs are preserved as-is.
 */
export const fileToBase64 = (file: File, maxWidth = 800, quality = 0.65): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read file'));
        return;
      }

      if (!file.type.startsWith('image/')) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.src = result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log('[imageUtils] Image compressée, taille:', Math.round(dataUrl.length / 1024), 'KB');
        resolve(dataUrl);
      };
      img.onerror = reject;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
