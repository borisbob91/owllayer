export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
}

export const products: Product[] = [
  {
    id: 'casque-bt-pro',
    name: 'Casque Bluetooth Pro',
    description: 'Casque sans fil avec reduction de bruit active, autonomie 30h, son Hi-Fi.',
    price: 149.99,
    image: 'https://placehold.co/400x400/0070c7/ffffff?text=Casque+BT',
    category: 'audio',
    stock: 15,
    rating: 4.7,
  },
  {
    id: 'clavier-meca',
    name: 'Clavier Mecanique RGB',
    description: 'Switches Cherry MX Brown, retro-eclairage RGB, chassis aluminium.',
    price: 89.99,
    image: 'https://placehold.co/400x400/054c85/ffffff?text=Clavier+Meca',
    category: 'peripheriques',
    stock: 23,
    rating: 4.5,
  },
  {
    id: 'webcam-4k',
    name: 'Webcam 4K Ultra HD',
    description: 'Capteur Sony, autofocus, micro integre, compatible streaming.',
    price: 79.99,
    image: 'https://placehold.co/400x400/0a406e/ffffff?text=Webcam+4K',
    category: 'video',
    stock: 8,
    rating: 4.3,
  },
  {
    id: 'souris-ergo',
    name: 'Souris Ergonomique Sans Fil',
    description: 'Design vertical, capteur 4000 DPI, rechargeable USB-C.',
    price: 49.99,
    image: 'https://placehold.co/400x400/072849/ffffff?text=Souris+Ergo',
    category: 'peripheriques',
    stock: 42,
    rating: 4.6,
  },
  {
    id: 'ecran-27',
    name: 'Ecran 27" QHD 165Hz',
    description: 'Dalle IPS, 1ms, HDR400, USB-C avec charge 65W.',
    price: 349.99,
    image: 'https://placehold.co/400x400/0c8ee9/ffffff?text=Ecran+27',
    category: 'moniteurs',
    stock: 5,
    rating: 4.8,
  },
  {
    id: 'hub-usbc',
    name: 'Hub USB-C 7-en-1',
    description: 'HDMI 4K, 3x USB-A, SD/microSD, charge 100W pass-through.',
    price: 39.99,
    image: 'https://placehold.co/400x400/36a9f8/ffffff?text=Hub+USB-C',
    category: 'accessoires',
    stock: 67,
    rating: 4.4,
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}

export function filterByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export const categories = [...new Set(products.map((p) => p.category))];
