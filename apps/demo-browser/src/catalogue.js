import { OwlLayer, startOwlLayer, getCart, saveCart, cartItemCount, cartSubtotal } from './owllayer.js';
import { getLocale, setLocale, t, formatPrice } from './i18n.js';

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

const PRODUCT_KEYWORDS = {
  'casque-bt-pro': ['headphones', 'headset', 'audio', 'earphones', 'bluetooth', 'casque', 'ecouteurs', 'anc', 'wireless'],
  'clavier-meca': ['keyboard', 'clavier', 'mecanique', 'mechanical', 'rgb', 'cherry', 'gaming'],
  'webcam-4k': ['webcam', 'camera', 'streaming', 'video', 'sony', '4k', 'ultra hd'],
  'souris-ergo': ['mouse', 'souris', 'wireless', 'sans fil', 'ergonomic', 'ergonomique', 'dpi', 'vertical'],
  'ecran-27': ['monitor', 'screen', 'display', 'moniteur', 'ecran', 'qhd', '165hz', 'ips', '27'],
  'hub-usbc': ['hub', 'dock', 'adapter', 'adaptateur', 'usb-c', 'usbc', 'hdmi', 'sd', '7-in-1'],
  'micro-usb': ['mic', 'microphone', 'audio', 'condensateur', 'streaming', 'voice', 'voix'],
  'casque-gaming': ['gaming headset', 'headset', 'headphones', 'casque', 'surround', 'pc', 'ps5', 'audio'],
  'tapis-xxl': ['mousepad', 'desk mat', 'mat', 'tapis', 'souris', 'gaming', 'xxl'],
  'stand-laptop': ['laptop stand', 'stand', 'support', 'laptop', 'pc', 'rehaussable', 'aluminium'],
  'clavier-bt': ['wireless keyboard', 'keyboard', 'clavier', 'compact', 'bluetooth', 'bt'],
};

const CATEGORY_ALIASES = {
  'monitors': 'moniteurs',
  'monitor': 'moniteurs',
  'peripherals': 'peripheriques',
  'peripheral': 'peripheriques',
  'accessories': 'accessoires',
  'accessory': 'accessoires',
};

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function renderLocalizedUI() {
  const loc = getLocale();
  const tr = t(loc);

  // Navbar
  const brandEl = document.getElementById('nav-brand');
  if (brandEl) brandEl.textContent = tr.nav.brand;
  const catNav = document.getElementById('nav-catalogue');
  if (catNav) catNav.textContent = tr.nav.catalogue;
  const panierNav = document.getElementById('nav-panier');
  if (panierNav) panierNav.textContent = tr.nav.panier;
  const cmdNav = document.getElementById('nav-commande');
  if (cmdNav) cmdNav.textContent = tr.nav.commande;
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) langBtn.textContent = loc === 'fr' ? '🇬🇧 English' : '🇫🇷 Français';

  // Hero
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) heroTitle.textContent = tr.hero.title;
  const heroSub = document.getElementById('hero-subtitle');
  if (heroSub) heroSub.textContent = tr.hero.subtitle;
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = tr.hero.searchPlaceholder;

  // Category buttons
  const catAll = document.getElementById('cat-all');
  if (catAll) catAll.textContent = tr.categories.all;
  const catAudio = document.getElementById('cat-audio');
  if (catAudio) catAudio.textContent = tr.categories.audio;
  const catPeriph = document.getElementById('cat-peripheriques');
  if (catPeriph) catPeriph.textContent = tr.categories.peripheriques;
  const catVideo = document.getElementById('cat-video');
  if (catVideo) catVideo.textContent = tr.categories.video;
  const catMoniteurs = document.getElementById('cat-moniteurs');
  if (catMoniteurs) catMoniteurs.textContent = tr.categories.moniteurs;
  const catAccessoires = document.getElementById('cat-accessoires');
  if (catAccessoires) catAccessoires.textContent = tr.categories.accessoires;

  // Product cards
  document.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    const item = tr.productsData?.[id];
    if (item) {
      const titleEl = card.querySelector('h2');
      if (titleEl) titleEl.textContent = item.name;
      const descEl = card.querySelector('p.line-clamp-2');
      if (descEl) descEl.textContent = item.desc;
    }
    const price = parseFloat(card.dataset.price);
    const priceEl = card.querySelector('.text-xl.font-bold');
    if (priceEl) priceEl.textContent = formatPrice(price, loc);

    const addBtn = card.querySelector('.btn-add');
    if (addBtn) addBtn.textContent = tr.product.addToCart;
  });
}

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
  const tr = t();
  showToast(tr.product.addedToast.replace('{name}', name));
}

// ── Filtres ───────────────────────────────────────────────────────────────────
let currentCat = null;
let currentSearch = '';

function applyFilters() {
  const cards = document.querySelectorAll('.product-card');
  let visible = 0;
  const q = normalizeText(currentSearch);
  const targetCat = currentCat ? (CATEGORY_ALIASES[normalizeText(currentCat)] || currentCat) : null;

  cards.forEach(card => {
    const id = card.dataset.id;
    const cat = card.dataset.cat;
    const name = normalizeText(card.dataset.name);
    const keywords = (PRODUCT_KEYWORDS[id] || []).map(normalizeText);

    const catOk = !targetCat || cat === targetCat;
    const searchOk = !q || name.includes(q) || keywords.some(k => k.includes(q) || q.includes(k));

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

// ── Wiring boutons Ajouter au panier & Langue ─────────────────────────────────
document.querySelectorAll('.btn-add').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.product-card');
    const id    = card.dataset.id;
    const name  = card.querySelector('h2').textContent.trim();
    const price = parseFloat(card.dataset.price);
    addToCart(id, name, price);
  });
});

document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
  const next = getLocale() === 'fr' ? 'en' : 'fr';
  setLocale(next);
  renderLocalizedUI();
  applyFilters();
});

// Init UI localisée
renderLocalizedUI();
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
      const q = normalizeText(query);
      window.filterSearch(query);
      const inputEl = document.getElementById('search-input');
      if (inputEl) inputEl.value = query;
      const matches = PRODUCTS.filter(p => {
        const nameNorm = normalizeText(p.name);
        const catNorm = normalizeText(p.cat);
        const keywords = (PRODUCT_KEYWORDS[p.id] || []).map(normalizeText);
        return nameNorm.includes(q) || catNorm.includes(q) || keywords.some(k => k.includes(q) || q.includes(k));
      });
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
      const cat = normalizeText(category);
      const resolvedCat = CATEGORY_ALIASES[cat] || cat;
      const validCat = CATEGORIES.includes(resolvedCat) ? resolvedCat : null;
      window.filterCat(validCat);
      const matches = validCat ? PRODUCTS.filter(p => p.cat === validCat) : PRODUCTS;
      return { category: validCat || 'tous', count: matches.length };
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
