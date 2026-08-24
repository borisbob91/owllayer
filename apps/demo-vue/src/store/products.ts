import { reactive, computed } from 'vue';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
}

export const CATEGORIES = ['Audio', 'Peripherals', 'Monitors', 'Video', 'Storage', 'Networking'] as const;
export type Category = typeof CATEGORIES[number];

const state = reactive<{ products: Product[] }>({
  products: [
    { id: 'prod-001', name: 'BT Pro Headphones', price: 149.99, stock: 45, category: 'Audio', description: 'Premium Bluetooth ANC headphones, 30h battery life', status: 'active', createdAt: '2024-01-15' },
    { id: 'prod-002', name: 'Mechanical RGB Keyboard', price: 129.00, stock: 12, category: 'Peripherals', description: 'Cherry MX Red switches, full RGB backlighting', status: 'active', createdAt: '2024-02-01' },
    { id: 'prod-003', name: 'Ergonomic Mouse', price: 79.90, stock: 0, category: 'Peripherals', description: '6-button ergonomic mouse, 12000 DPI sensor', status: 'draft', createdAt: '2024-02-20' },
    { id: 'prod-004', name: '4K 27" Monitor', price: 499.00, stock: 8, category: 'Monitors', description: 'IPS 4K 144Hz, G-Sync compatible, HDR400', status: 'active', createdAt: '2024-03-01' },
    { id: 'prod-005', name: 'HD Pro Webcam', price: 89.99, stock: 30, category: 'Video', description: '1080p 60fps autofocus, integrated stereo mic', status: 'active', createdAt: '2024-03-10' },
    { id: 'prod-006', name: '1TB NVMe SSD', price: 109.90, stock: 3, category: 'Storage', description: 'PCIe 4.0 NVMe, up to 7400 MB/s read speed', status: 'active', createdAt: '2024-03-15' },
  ],
});

export function useProducts() {
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const id = `prod-${String(Date.now()).slice(-6)}`;
    const product: Product = { ...data, id, createdAt: new Date().toISOString().split('T')[0] };
    state.products.push(product);
    return product;
  };

  const editProduct = (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Product | null => {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(state.products[idx], updates);
    return state.products[idx];
  };

  const deleteProduct = (id: string): boolean => {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    state.products.splice(idx, 1);
    return true;
  };

  const getProduct = (id: string): Product | null => state.products.find(p => p.id === id) ?? null;

  const stats = computed(() => ({
    total: state.products.length,
    active: state.products.filter(p => p.status === 'active').length,
    lowStock: state.products.filter(p => p.stock > 0 && p.stock < 10).length,
    outOfStock: state.products.filter(p => p.stock === 0).length,
    totalValue: state.products.reduce((s, p) => s + p.price * p.stock, 0),
  }));

  return { products: state.products, stats, addProduct, editProduct, deleteProduct, getProduct };
}
