import { PRODUCTS } from './products';

// Stubbed "AI" image recognition.
//
// Swap this out for a real call later, e.g.:
//   const res = await fetch('https://your-api.com/recognize', {
//     method: 'POST',
//     body: formData, // the captured photo
//   });
//   return await res.json();
//
// For now it simulates a vision model by picking a random product from the
// catalog most of the time, and returning null (no confident match) the
// rest of the time — since a snapshot recognition is inherently uncertain.
//
// Per product behavior: when this returns null, the Scanner screen simply
// keeps the camera open and does nothing further (the image case is
// ignored) — only a barcode miss should surface the Not Found screen.
export function recognizeProductFromImage(photoUri) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const confident = Math.random() > 0.35;
      if (!confident) {
        resolve(null);
        return;
      }
      const pick = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      resolve(pick);
    }, 900);
  });
}
