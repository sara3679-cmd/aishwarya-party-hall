const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 600000;
const MAX_EDGE = 1600;

/** Resize locally and strip camera metadata by encoding a fresh JPEG. */
export async function prepareDecorationPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose JPG, PNG or WebP photos. For HEIC photos, export them as JPG first.');
  }
  if (!file.size || file.size > MAX_INPUT_BYTES) {
    throw new Error(`${file.name}: choose a photo smaller than 25 MB.`);
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image resizing is unavailable in this browser.');
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      for (const quality of [0.88, 0.78, 0.68, 0.58]) {
        const result = canvas.toDataURL('image/jpeg', quality);
        const encoded = result.split(',')[1];
        const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
        if (result.startsWith('data:image/jpeg;base64,') && bytes <= MAX_OUTPUT_BYTES) return result;
      }
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
    throw new Error('Unable to compress this photo. Try another image.');
  } catch (error) {
    throw new Error(`${file.name}: ${error instanceof Error ? error.message : 'Unable to read this photo.'}`);
  } finally {
    URL.revokeObjectURL(url);
    image.src = '';
  }
}
