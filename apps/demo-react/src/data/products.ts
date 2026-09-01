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
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    category: 'audio',
    stock: 15,
    rating: 4.7,
  },
  {
    id: 'clavier-meca',
    name: 'Clavier Mecanique RGB',
    description: 'Switches Cherry MX Brown, retro-eclairage RGB, chassis aluminium.',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    category: 'peripheriques',
    stock: 23,
    rating: 4.5,
  },
  {
    id: 'webcam-4k',
    name: 'Webcam 4K Ultra HD',
    description: 'Capteur Sony, autofocus, micro integre, compatible streaming.',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    category: 'video',
    stock: 8,
    rating: 4.3,
  },
  {
    id: 'souris-ergo',
    name: 'Souris Ergonomique Sans Fil',
    description: 'Design vertical, capteur 4000 DPI, rechargeable USB-C.',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
    category: 'peripheriques',
    stock: 42,
    rating: 4.6,
  },
  {
    id: 'ecran-27',
    name: 'Ecran 27" QHD 165Hz',
    description: 'Dalle IPS, 1ms, HDR400, USB-C avec charge 65W.',
    price: 349.99,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
    category: 'moniteurs',
    stock: 5,
    rating: 4.8,
  },
  {
    id: 'hub-usbc',
    name: 'Hub USB-C 7-en-1',
    description: 'HDMI 4K, 3x USB-A, SD/microSD, charge 100W pass-through.',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&auto=format&fit=crop&q=80',
    category: 'accessoires',
    stock: 67,
    rating: 4.4,
  },
];

const PRODUCT_KEYWORDS: Record<string, string[]> = {
  'casque-bt-pro': ['headphones', 'headset', 'audio', 'earphones', 'bluetooth', 'casque', 'ecouteurs', 'anc', 'wireless'],
  'clavier-meca': ['keyboard', 'clavier', 'mecanique', 'mechanical', 'rgb', 'cherry', 'gaming'],
  'webcam-4k': ['webcam', 'camera', 'streaming', 'video', 'sony', '4k', 'ultra hd'],
  'souris-ergo': ['mouse', 'souris', 'wireless', 'sans fil', 'ergonomic', 'ergonomique', 'dpi', 'vertical'],
  'ecran-27': ['monitor', 'screen', 'display', 'moniteur', 'ecran', 'qhd', '165hz', 'ips', '27'],
  'hub-usbc': ['hub', 'dock', 'adapter', 'adaptateur', 'usb-c', 'usbc', 'hdmi', 'sd', '7-in-1'],
};

const CATEGORY_ALIASES: Record<string, string> = {
  'monitors': 'moniteurs',
  'monitor': 'moniteurs',
  'peripherals': 'peripheriques',
  'peripheral': 'peripheriques',
  'accessories': 'accessoires',
  'accessory': 'accessoires',
};

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return products;

  return products.filter((p) => {
    // 1. Recherche directe dans les champs de base (FR)
    if (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    ) {
      return true;
    }

    // 2. Recherche dans les mots-clés multilingues (EN & FR)
    const keywords = PRODUCT_KEYWORDS[p.id] || [];
    return keywords.some((k) => k.includes(q) || q.includes(k));
  });
}

export function filterByCategory(category: string): Product[] {
  const cat = category.toLowerCase().trim();
  const normalized = CATEGORY_ALIASES[cat] || cat;
  return products.filter((p) => p.category === normalized || p.category === cat);
}

export const categories = [...new Set(products.map((p) => p.category))];
