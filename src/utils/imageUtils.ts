/**
 * Compresses an image file by resizing it and reducing its quality.
 * Target size is roughly < 1MB.
 */
export const compressImage = async (file: File, maxWidth = 900, quality = 0.5): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      console.log('FileReader loaded');
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        console.log('Image object loaded', img.width, img.height);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            console.log('Blob created', blob?.size);
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (e) => {
        console.error('Image load error', e);
        reject(e);
      };
    };
    reader.onerror = (e) => {
      console.error('FileReader error', e);
      reject(e);
    };
  });
};
