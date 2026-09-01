import { OwlLayer, startOwlLayer, getCart, saveCart, cartItemCount, cartSubtotal } from './owllayer.js';
import { getLocale, setLocale, t, formatPrice } from './i18n.js';

function updateCartBadge() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = String(cartItemCount(getCart()));
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

  // Page titles
  const titleEl = document.getElementById('cart-page-title');
  if (titleEl) titleEl.textContent = tr.cart.title;
  const emptyText = document.getElementById('cart-empty-text');
  if (emptyText) emptyText.textContent = tr.cart.empty;
  const browseBtn = document.getElementById('cart-browse-btn');
  if (browseBtn) browseBtn.textContent = tr.cart.browseBtn;
  const totalLabel = document.getElementById('cart-total-label');
  if (totalLabel) totalLabel.textContent = tr.cart.total;
  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) clearBtn.textContent = tr.cart.clearBtn;
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) checkoutBtn.textContent = tr.cart.checkoutBtn + ' →';
}

// ── Rendu ─────────────────────────────────────────────────────────────────────
function render() {
  const loc      = getLocale();
  const tr       = t(loc);
  const cart     = getCart();
  const empty    = document.getElementById('cart-empty');
  const itemsEl  = document.getElementById('cart-items');
  const summaryEl= document.getElementById('cart-summary');

  renderLocalizedUI();
  updateCartBadge();

  if (cart.length === 0) {
    empty?.classList.remove('hidden');
    summaryEl?.classList.add('hidden');
    if (itemsEl) itemsEl.innerHTML = '';
    return;
  }

  empty?.classList.add('hidden');
  summaryEl?.classList.remove('hidden');

  // Calcul total
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatPrice(total, loc);

  // Lignes d'articles
  if (itemsEl) {
    itemsEl.innerHTML = cart.map(item => {
      const localizedName = tr.productsData?.[item.id]?.name || item.name;
      return `
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4" data-id="${item.id}">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 truncate">${localizedName}</p>
            <p class="text-sm text-slate-400">${formatPrice(item.price, loc)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="changeQty('${item.id}', -1)"
              class="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-base flex items-center justify-center transition">−</button>
            <span class="w-6 text-center font-semibold text-slate-800 text-sm">${item.qty}</span>
            <button onclick="changeQty('${item.id}', +1)"
              class="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-base flex items-center justify-center transition">+</button>
          </div>
          <span class="w-24 text-right font-bold text-slate-900 text-sm shrink-0">${formatPrice(item.price * item.qty, loc)}</span>
          <button onclick="removeItem('${item.id}')"
            class="text-slate-300 hover:text-red-400 transition ml-1" title="Supprimer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
window.changeQty = function(id, delta) {
  const cart = getCart();
  const idx  = cart.findIndex(i => i.id === id);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  render();
};

window.removeItem = function(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  render();
};

function clearCart() {
  saveCart([]);
  render();
}

// Bouton "Vider le panier" — data-owllayer-risk="high" déjà dans le HTML
const clearBtn = document.getElementById('clear-cart');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (!confirm(getLocale() === 'fr' ? 'Vider complètement le panier ?' : 'Clear entire shopping cart?')) return;
    clearCart();
  });
}

document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
  const next = getLocale() === 'fr' ? 'en' : 'fr';
  setLocale(next);
  render();
});

// ── Init ──────────────────────────────────────────────────────────────────────
render();

// ── Init OwlLayer puis tools + context ──────────────────────────────────────────────────
startOwlLayer({
  role: 'shopping',
  description: "Tu es l'assistant vocal de la boutique OwlLayer. L'utilisateur consulte son panier : tu l'aides à modifier les quantités, supprimer des articles, vider le panier ou passer commande.",
  voice: { enabled: true, fallbackToText: true, live: true },
}).then(() => {
  OwlLayer.registerTool('update_quantity', {
    description: "Modifie la quantité d'un article dans le panier. Utilise l'id produit (ex: 'p1') et la nouvelle quantité absolue.",
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: "Identifiant du produit (ex: 'p1')" },
        qty:       { type: 'number', description: 'Nouvelle quantité désirée (0 = supprimer)' },
      },
      required: ['productId', 'qty'],
    },
    risk: 'none',
    handler({ productId, qty }) {
      const cart = getCart();
      const item = cart.find(i => i.id === productId);
      if (!item) return { success: false, error: `Produit ${productId} absent du panier.` };
      const target = Math.round(qty);
      if (target <= 0) {
        window.removeItem(productId);
      } else {
        window.changeQty(productId, target - item.qty);
      }
      const updated = getCart();
      return { success: true, cartCount: cartItemCount(updated), cartTotal: cartSubtotal(updated).toFixed(2) };
    },
  });

  OwlLayer.registerTool('remove_from_cart', {
    description: "Supprime un article du panier par son identifiant.",
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: "Identifiant du produit à supprimer (ex: 'p3')" },
      },
      required: ['productId'],
    },
    risk: 'low',
    handler({ productId }) {
      const before = getCart().length;
      window.removeItem(productId);
      return { success: getCart().length < before, removedId: productId };
    },
  });

  OwlLayer.registerTool('clear_cart', {
    description: "Vide entièrement le panier. Action destructive — nécessite confirmation de l'utilisateur.",
    parameters: { type: 'object', properties: {}, required: [] },
    risk: 'high',
    handler() {
      clearCart();
      return { success: true };
    },
  });

  const cart = getCart();
  const cartItems = cart.map(i => ({
    id: i.id,
    name: i.name,
    qty: i.qty,
    unitPrice: i.price,
    lineTotal: (i.price * i.qty).toFixed(2) + ' €',
  }));
  OwlLayer.updateContext({
    currentPage: 'Panier',
    userLocation: "L'utilisateur est sur la page Panier. Il voit la liste de ses articles avec les quantités et le total.",
    availableActions: [
      'Modifier la quantité d\'un article → update_quantity(productId, qty)',
      'Supprimer un article → remove_from_cart(productId)',
      'Vider tout le panier → clear_cart()',
      'Passer la commande → go_to_checkout()',
      'Retourner au catalogue → continue_shopping()',
    ],
    cart: {
      isEmpty: cart.length === 0,
      itemCount: cartItemCount(cart),
      total: cartSubtotal(cart).toFixed(2) + ' €',
      productIds: cart.map(i => i.id),
      items: cartItems,
    },
  });
});
