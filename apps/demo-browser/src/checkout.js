import { OwlLayer, startOwlLayer, getCart, saveCart, cartItemCount, cartSubtotal } from './owllayer.js';

function updateCartBadge() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = String(cartItemCount(getCart()));
}

// ── Récap commande (colonne latérale) ────────────────────────────────────────
function renderOrderSummary() {
  const cart    = getCart();
  const itemsEl = document.getElementById('order-items');
  const totalEl = document.getElementById('order-total');

  if (!itemsEl) return;

  const shipping = document.querySelector('input[name="shipping"]:checked')?.value ?? 'standard';
  const shippingCost = shipping === 'express' ? 9.99 : shipping === 'gratuit' ? 0 : 4.99;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total    = subtotal + shippingCost;

  itemsEl.innerHTML = cart.map(item => `
    <div class="py-2 flex justify-between">
      <span class="truncate pr-2">${item.name} ×${item.qty}</span>
      <span class="shrink-0 font-medium">${(item.price * item.qty).toFixed(2).replace('.', ',')} €</span>
    </div>
  `).join('') + `
    <div class="py-2 flex justify-between text-slate-400">
      <span>Livraison</span>
      <span>${shippingCost === 0 ? 'Gratuite' : shippingCost.toFixed(2).replace('.', ',') + ' €'}</span>
    </div>
  `;

  if (totalEl) totalEl.textContent = total.toFixed(2).replace('.', ',') + ' €';
}

// Recalcul si l'utilisateur change la livraison
document.querySelectorAll('input[name="shipping"]').forEach(r =>
  r.addEventListener('change', renderOrderSummary)
);

// ── Confirmation ──────────────────────────────────────────────────────────────
window.confirmOrder = function() {
  const firstName = document.getElementById('field-firstName')?.value.trim();
  const lastName  = document.getElementById('field-lastName')?.value.trim();
  const email     = document.getElementById('field-email')?.value.trim();
  const address   = document.getElementById('field-address')?.value.trim();
  const city      = document.getElementById('field-city')?.value.trim();

  if (!firstName || !lastName || !email || !address || !city) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return;
  }

  // Passage à l'étape confirmation
  document.getElementById('step-1')?.classList.add('hidden');
  document.getElementById('step-3')?.classList.remove('hidden');

  // Indicateurs d'étapes
  document.getElementById('step-dot-1')?.classList.replace('step-active', 'step-done');
  document.getElementById('step-dot-2')?.classList.replace('step-inactive', 'step-done');
  document.getElementById('step-dot-3')?.classList.replace('step-inactive', 'step-active');

  // Référence commande
  const ref = 'CMD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const refEl = document.getElementById('confirm-ref');
  if (refEl) refEl.textContent = `Référence : ${ref}`;

  // Vider le panier
  saveCart([]);
  updateCartBadge();
};

// ── Init ─────────────────────────────────────────────────────────────────────
updateCartBadge();
renderOrderSummary();

// ── OwlLayer init + tools + context ──────────────────────────────────────────────────
startOwlLayer({
  role: 'shopping',
  description: "Tu es l'assistant vocal de la boutique OwlLayer. L'utilisateur finalise sa commande : tu l'aides à renseigner son adresse de livraison, choisir un mode de livraison et confirmer son achat.",
  voice: { enabled: true, fallbackToText: true, live: true },
}).then(() => {
  OwlLayer.registerTool('fill_address', {
    description: "Remplit automatiquement les champs du formulaire de livraison (prénom, nom, email, adresse, ville, code postal).",
    parameters: {
      type: 'object',
      properties: {
        firstName:  { type: 'string', description: 'Prénom' },
        lastName:   { type: 'string', description: 'Nom de famille' },
        email:      { type: 'string', description: 'Adresse email' },
        address:    { type: 'string', description: 'Adresse postale complète' },
        city:       { type: 'string', description: 'Ville' },
        postalCode: { type: 'string', description: 'Code postal' },
      },
      required: [],
    },
    risk: 'low',
    handler({ firstName, lastName, email, address, city, postalCode }) {
      const fields = { firstName, lastName, email, address, city, postalCode };
      for (const [key, value] of Object.entries(fields)) {
        if (value) {
          const el = document.getElementById(`field-${key}`);
          if (el) el.value = value;
        }
      }
      return { success: true };
    },
  });

  OwlLayer.registerTool('select_shipping', {
    description: "Sélectionne un mode de livraison : 'standard' (4,99 €), 'express' (9,99 €) ou 'gratuit' (commande ≥ 100 €).",
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: "Mode de livraison : 'standard', 'express' ou 'gratuit'" },
      },
      required: ['mode'],
    },
    risk: 'none',
    handler({ mode }) {
      const radio = document.querySelector(`input[name="shipping"][value="${mode}"]`);
      if (!radio) return { success: false, error: `Mode inconnu : ${mode}. Valeurs disponibles : standard, express, gratuit.` };
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, selectedMode: mode };
    },
  });

  OwlLayer.registerTool('confirm_order', {
    description: "Valide et soumet la commande après vérification des champs obligatoires. Action irréversible.",
    parameters: { type: 'object', properties: {}, required: [] },
    risk: 'high',
    handler() {
      window.confirmOrder();
      return { success: true };
    },
  });

  const cart = getCart();
  const subtotal = cartSubtotal(cart);
  OwlLayer.updateContext({
    currentPage: 'Commande',
    userLocation: "L'utilisateur est sur la page de finalisation de sa commande. Il doit remplir son adresse de livraison, choisir un mode de livraison, puis confirmer.",
    availableActions: [
      'Remplir les champs de livraison → fill_address(firstName, lastName, email, address, city, postalCode)',
      'Choisir la livraison → select_shipping(mode) — modes : standard (4,99 €), express (9,99 €), gratuit (si total ≥ 100 €)',
      'Confirmer la commande → confirm_order()',
    ],
    cart: {
      itemCount: cartItemCount(cart),
      subtotal: subtotal.toFixed(2) + ' €',
      eligibleFreeShipping: subtotal >= 100,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, unitPrice: i.price })),
    },
  });
});
