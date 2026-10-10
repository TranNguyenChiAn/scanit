// Mock catalog: general retail + apparel.
// In a real app, replace lookupByBarcode() with a network call to your
// barcode API of choice (e.g. Open Food Facts, UPCitemdb, or your own backend).

export const PRODUCTS = [
  {
    id: 'p1',
    barcode: '0012345678905',
    name: 'AeroSound Wireless Earbuds',
    brand: 'AeroSound',
    category: 'Electronics',
    price: 79.99,
    currency: 'USD',
    description:
      'True wireless earbuds with active noise cancellation, 28-hour total battery life, and IPX4 sweat resistance.',
    image: 'https://picsum.photos/seed/earbuds/600/600',
  },
  {
    id: 'p2',
    barcode: '0023456789012',
    name: 'BrightHome LED Desk Lamp',
    brand: 'BrightHome',
    category: 'Household',
    price: 34.5,
    currency: 'USD',
    description:
      'Adjustable-arm LED desk lamp with 5 brightness levels, 3 color temperatures, and a built-in USB charging port.',
    image: 'https://picsum.photos/seed/lamp/600/600',
  },
  {
    id: 'p3',
    barcode: '0034567890129',
    name: 'PowerCell 10,000mAh Power Bank',
    brand: 'PowerCell',
    category: 'Electronics',
    price: 24.99,
    currency: 'USD',
    description:
      'Compact fast-charging power bank with dual USB-A ports and USB-C input, enough for 2 full phone charges.',
    image: 'https://picsum.photos/seed/powerbank/600/600',
  },
  {
    id: 'p4',
    barcode: '0045678901236',
    name: 'CleanBrew 12-Cup Coffee Maker',
    brand: 'CleanBrew',
    category: 'Household',
    price: 49.99,
    currency: 'USD',
    description:
      'Programmable drip coffee maker with reusable filter, auto shut-off, and a 12-cup glass carafe.',
    image: 'https://picsum.photos/seed/coffeemaker/600/600',
  },
  {
    id: 'p5',
    barcode: '0056789012343',
    name: 'FlexFit Adjustable Dumbbell Set',
    brand: 'FlexFit',
    category: 'Sports & Fitness',
    price: 129.0,
    currency: 'USD',
    description:
      'Space-saving adjustable dumbbells, 5–25 lbs per hand with quick-turn weight selection dial.',
    image: 'https://picsum.photos/seed/dumbbell/600/600',
  },
  {
    id: 'p6',
    barcode: '0067890123450',
    name: 'QuietNight Memory Foam Pillow',
    brand: 'QuietNight',
    category: 'Household',
    price: 29.99,
    currency: 'USD',
    description:
      'Contoured memory foam pillow with cooling gel layer and removable, machine-washable cover.',
    image: 'https://picsum.photos/seed/pillow/600/600',
  },
  {
    id: 'p7',
    barcode: '0078901234567',
    name: 'SnapView 4K Action Camera',
    brand: 'SnapView',
    category: 'Electronics',
    price: 89.99,
    currency: 'USD',
    description:
      'Waterproof 4K action camera with image stabilization, WiFi transfer, and a full mounting accessory kit.',
    image: 'https://picsum.photos/seed/actioncam/600/600',
  },
  {
    id: 'p8',
    barcode: '0089012345674',
    name: 'TidyTote Storage Bin Set (3-Pack)',
    brand: 'TidyTote',
    category: 'Household',
    price: 22.49,
    currency: 'USD',
    description:
      'Stackable storage bins with lids in three sizes, ideal for closet, pantry, or garage organization.',
    image: 'https://picsum.photos/seed/storagebin/600/600',
  },
  {
    id: 'p9',
    barcode: '0090123456781',
    name: 'VoltEdge Smart Power Strip',
    brand: 'VoltEdge',
    category: 'Electronics',
    price: 27.99,
    currency: 'USD',
    description:
      'WiFi-enabled power strip with 4 smart outlets, 2 USB-C ports, and per-outlet scheduling via app.',
    image: 'https://picsum.photos/seed/powerstrip/600/600',
  },
  {
    id: 'p10',
    barcode: '0101234567898',
    name: 'GreenLeaf Ceramic Planter Set',
    brand: 'GreenLeaf',
    category: 'Household',
    price: 19.99,
    currency: 'USD',
    description:
      'Set of 3 minimalist ceramic planters with drainage holes and bamboo trays, for small indoor plants.',
    image: 'https://picsum.photos/seed/planter/600/600',
  },

  // --- Shop items: MEI.BEE studio, Set len khoá kéo 8922# ---
  // Real product photos bundled locally (src/assets/products). Prices are
  // placeholders — update them to your actual retail prices.
  {
    id: 'p11',
    barcode: '8922000001',
    name: 'Set len khoá kéo 8922# - Xám than',
    brand: 'MEI.BEE studio',
    category: 'Apparel',
    price: 350000,
    currency: 'VND',
    description:
      'Set áo khoác len mũ trùm khoá kéo phối chân váy dài chữ A, màu xám than. Chất len mềm, co giãn nhẹ, phối cùng áo ba lỗ len bên trong.',
    image: require('../assets/products/set8922-charcoal.jpg'),
  },
  {
    id: 'p12',
    barcode: '8922000002',
    name: 'Set len khoá kéo 8922# - Nâu đậm',
    brand: 'MEI.BEE studio',
    category: 'Apparel',
    price: 350000,
    currency: 'VND',
    description:
      'Set áo khoác len mũ trùm khoá kéo phối chân váy dài chữ A, màu nâu đậm. Chất len mềm, co giãn nhẹ, phối cùng áo ba lỗ len bên trong.',
    image: require('../assets/products/set8922-brown.jpg'),
  },
  {
    id: 'p13',
    barcode: '8922000003',
    name: 'Set len khoá kéo 8922# - Be',
    brand: 'MEI.BEE studio',
    category: 'Apparel',
    price: 350000,
    currency: 'VND',
    description:
      'Set áo khoác len mũ trùm khoá kéo phối chân váy dài chữ A, màu be. Chất len mềm, co giãn nhẹ, phối cùng áo ba lỗ len bên trong.',
    image: require('../assets/products/set8922-taupe.jpg'),
  },
];

// Simulates a barcode-lookup network call against the mock catalog.
export function lookupByBarcode(barcode) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const match = PRODUCTS.find((p) => p.barcode === barcode);
      resolve(match || null);
    }, 400);
  });
}
