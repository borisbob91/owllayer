import { OwlLayer, startOwlLayer, getCart, saveCart, cartItemCount, cartSubtotal } from './owllayer.js';

// ── Catalogue de produits (pour les descriptions des tools OwlLayer) ─────────────
const PRODUCTS = [
  { id: 'casque-bt-pro',   name: 'Casque Bluetooth Pro',          price: 149.99, cat: 'audio',          stock: 15 },
  { id: 'clavier-meca',    name: 'Clavier Mécanique RGB',          price:  89.99, cat: 'peripheriques',  stock: 23 },
  { id: 'webcam-4k',       name: 'Webcam 4K Ultra HD',             price:  79.99, cat: 'video',          stock:  8 },
  { id: 'souris-ergo',     name: 'Souris Ergonomique Sans Fil',    price:  49.99, cat: 'peripheriques',  stock: 42 },
  { id: 'ecran-27',        name: 'Écran 27" QHD 165Hz',           price: 349.99, cat: 'moniteurs',      stock:  5 },
  { id: 'hub-usbc',        name: 'Hub USB-C 7-en-1',              price:  39.99, cat: 'accessoires',    stock: 67 },
  { id: 'micro-usb',       name: 'Microphone USB Condensateur',   price:  69.99, cat: 'audio',          stock: 19 },
  { id: 'casque-gaming',   name: 'Casque Gaming 7.1 Surround',    price:  99.99, cat: 'audio',          stock: 11 },
  { id: 'tapis-xxl',       name: 'Tapis de Souris XXL Gaming',    price:  24.99, cat: 'accessoires',    stock: 88 },
  { id: 'stand-laptop',    name: 'Stand Laptop Réglable Alu',     price:  34.99, cat: 'accessoires',    stock: 34 },
  { id: 'clavier-bt',      name: 'Clavier Sans Fil Compact BT',   price:  59.99, cat: 'peripheriques',  stock:  7 },
];
const CATEGORIES = ['audio', 'peripheriques', 'video', 'moniteurs', 'accessoires'];
const PRODUCT_LIST_DESC = PRODUCTS
  .map(p => `${p.name} (id:${p.id}, ${p.price}€, stock:${p.stock})`)
  .join(' | ');

// ── Helpers locaux ────────────────────────────────────────────────────────────
function updateCartBadge() {
  const count = cartItemCount(getCart());
  const el = document.getElementById('cart-count');
  if (el) el.textContent = String(count);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const label = document.getElementById('toast-msg');
  if (!toast || !label) return;
  label.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function addToCart(id, name, price) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx >= 0) { cart[idx].qty++; } else { cart.push({ id, name, price, qty: 1 }); }
  saveCart(cart);
  updateCartBadge();
  showToast(`"${name}" ajouté au panier !`);
}

// ── Filtres ───────────────────────────────────────────────────────────────────
let currentCat = null;
let currentSearch = '';

function applyFilters() {
  const cards = document.querySelectorAll('.product-card');
  let visible = 0;
  cards.forEach(card => {
    const catOk    = !currentCat    || card.dataset.cat === currentCat;
    const searchOk = !currentSearch || card.dataset.name.includes(currentSearch);
    card.style.display = (catOk && searchOk) ? '' : 'none';
    if (catOk && searchOk) visible++;
  });
  document.getElementById('no-results')?.classList.toggle('hidden', visible > 0);
}

window.filterCat = function(cat) {
  currentCat = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('cat-active', 'bg-blue-50', 'text-blue-700', 'border-blue-500');
    btn.classList.add('border-slate-200', 'text-slate-600');
  });
  // Activer le bon bouton
  const activeBtn = cat
    ? [...document.querySelectorAll('.cat-btn')].find(b => b.getAttribute('onclick')?.includes(`'${cat}'`))
    : document.querySelector('.cat-btn');
  if (activeBtn) {
    activeBtn.classList.add('cat-active', 'bg-blue-50', 'text-blue-700', 'border-blue-500');
    activeBtn.classList.remove('border-slate-200', 'text-slate-600');
  }
  applyFilters();
};

window.filterSearch = function(val) {
  currentSearch = val.toLowerCase().trim();
  applyFilters();
};

// ── Wiring boutons Ajouter au panier ─────────────────────────────────────────
document.querySelectorAll('.btn-add').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.product-card');
    const id    = card.dataset.id;
    const name  = card.querySelector('h2').textContent.trim();
    const price = parseFloat(card.dataset.price);
    addToCart(id, name, price);
  });
});

// ── Init OwlLayer puis tools + context ──────────────────────────────────────────
updateCartBadge();

startOwlLayer({
  role: 'shopping',
  description: "Tu es l'assistant vocal de la boutique OwlLayer — périphériques informatiques. Tu aides les clients à découvrir et filtrer les produits, ajouter des articles au panier et naviguer dans la boutique.",
  voice: { enabled: true, fallbackToText: true, live: true },
}).then(() => {
  // navigate_to_page — l'agent peut changer de page
  OwlLayer.registerTool('navigate_to_page', {
    description: "Naviguer vers une page de la boutique. Pages disponibles : catalogue (index.html), panier (panier.html), commande (checkout.html).",
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', description: "Nom de la page : 'catalogue', 'panier', ou 'commande'" },
      },
      required: ['page'],
    },
    risk: 'none',
    handler: ({ page }) => {
      const routes = { catalogue: '/', panier: '/panier.html', commande: '/checkout.html' };
      const url = routes[String(page).toLowerCase()];
      if (!url) return { success: false, error: `Page inconnue: "${page}". Options: catalogue, panier, commande` };
      window.location.href = url;
      return { success: true, navigating_to: page };
    },
  });

  // add_to_cart — ajouter un produit par son id
  OwlLayer.registerTool('add_to_cart', {
    description: `Ajouter un produit au panier. Catalogue disponible : ${PRODUCT_LIST_DESC}.`,
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'ID du produit à ajouter' },
        quantity:  { type: 'number', description: 'Quantité (défaut: 1)' },
      },
      required: ['productId'],
    },
    risk: 'low',
    handler: ({ productId, quantity = 1 }) => {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return { success: false, error: `Produit "${productId}" introuvable. Produits valides: ${PRODUCTS.map(p => p.id).join(', ')}` };
      const qty = Math.max(1, Math.round(Number(quantity)));
      if (qty > product.stock) return { success: false, error: `Stock insuffisant (${product.stock} disponibles).` };
      for (let i = 0; i < qty; i++) addToCart(product.id, product.name, product.price);
      const cart = getCart();
      return {
        success: true,
        message: `${qty}× ${product.name} ajouté au panier.`,
        subtotal: (product.price * qty).toFixed(2) + ' €',
        cartCount: cartItemCount(cart),
      };
    },
  });

  // search_products — filtrer le catalogue par texte
  OwlLayer.registerTool('search_products', {
    description: `Rechercher des produits dans le catalogue par nom, description ou catégorie. Catégories: ${CATEGORIES.join(', ')}.`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
      },
      required: ['query'],
    },
    risk: 'none',
    handler: ({ query }) => {
      const q = String(query).toLowerCase().trim();
      window.filterSearch(q);
      document.getElementById('search-input').value = query;
      const matches = PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) || p.cat.includes(q)
      );
      return { count: matches.length, products: matches.map(p => ({ id: p.id, name: p.name, price: p.price })) };
    },
  });

  // filter_by_category — filtrer par catégorie
  OwlLayer.registerTool('filter_by_category', {
    description: `Filtrer les produits par catégorie. Catégories disponibles: ${CATEGORIES.join(', ')}.`,
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: `Catégorie parmi: ${CATEGORIES.join(', ')}` },
      },
      required: ['category'],
    },
    risk: 'none',
    handler: ({ category }) => {
      const cat = String(category).toLowerCase().trim();
      if (!CATEGORIES.includes(cat)) return { success: false, error: `Catégorie inconnue. Options: ${CATEGORIES.join(', ')}` };
      window.filterCat(cat);
      const matches = PRODUCTS.filter(p => p.cat === cat);
      return { category: cat, count: matches.length, products: matches.map(p => ({ id: p.id, name: p.name, price: p.price })) };
    },
  });

  // cart_summary — résumé du panier
  OwlLayer.registerTool('cart_summary', {
    description: "Obtenir le résumé du panier : articles, quantités, total.",
    parameters: { type: 'object', properties: {} },
    risk: 'none',
    handler: () => {
      const cart = getCart();
      return {
        itemCount: cartItemCount(cart),
        total: cartSubtotal(cart).toFixed(2) + ' €',
        empty: cart.length === 0,
        items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.qty, subtotal: (i.price * i.qty).toFixed(2) + ' €' })),
      };
    },
  });

  const cart = getCart();
  OwlLayer.updateContext({
    currentPage: 'Catalogue',
    userLocation: "L'utilisateur est sur la page Catalogue. Il voit les produits et peut les filtrer, rechercher ou ajouter au panier.",
    availableActions: [
      'Ajouter un produit au panier → add_to_cart(productId, quantity?)',
      'Rechercher des produits → search_products(query)',
      'Filtrer par catégorie → filter_by_category(category)',
      'Voir le résumé du panier → cart_summary()',
      'Naviguer vers une autre page → navigate_to_page(page)',
    ],
    catalogue: {
      productCount: PRODUCTS.length,
      categories: CATEGORIES,
      products: PRODUCTS.map(p => ({ id: p.id, name: p.name, price: p.price, cat: p.cat, stock: p.stock })),
    },
    cart: {
      itemCount: cartItemCount(cart),
      total: cartSubtotal(cart).toFixed(2) + ' €',
    },
  });
});
