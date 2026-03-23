// Step 2 — Address form: billing + optional separate shipping address
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { StoreApiClient } from '../../../api/StoreApiClient.js';
import type { AddressData, CheckoutState } from '../types.js';

interface Props {
  api: StoreApiClient;
  state: CheckoutState;
  onUpdate: (patch: Partial<CheckoutState>) => void;
  onNext: () => void;
  onBack: () => void;
}

type FieldKey = keyof AddressData;

const REQUIRED_FIELDS: FieldKey[] = [
  'first_name', 'last_name', 'email', 'phone',
  'address_1', 'city', 'postcode', 'country',
];

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateAddress(addr: Partial<AddressData>): string | null {
  for (const f of REQUIRED_FIELDS) {
    if (!addr[f]?.trim()) return `Le champ "${f.replace('_', ' ')}" est requis.`;
  }
  if (!isValidEmail(addr.email ?? '')) return 'Adresse e-mail invalide.';
  return null;
}

export function AddressForm({ api, state, onUpdate, onNext, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billing = state.billingAddress;
  const shipping = state.sameAsShipping ? billing : state.shippingAddress;

  function patchBilling(field: FieldKey, value: string) {
    onUpdate({ billingAddress: { ...billing, [field]: value } });
  }

  function patchShipping(field: FieldKey, value: string) {
    onUpdate({ shippingAddress: { ...state.shippingAddress, [field]: value } });
  }

  async function handleNext() {
    const err = validateAddress(billing);
    if (err) { setError(err); return; }
    if (!state.sameAsShipping) {
      const errS = validateAddress(state.shippingAddress);
      if (errS) { setError(errS); return; }
    }
    setError(null);
    setSaving(true);
    try {
      // WC Blocks: PUT /checkout with full billing + shipping objects
      const shippingAddr = state.sameAsShipping ? billing : state.shippingAddress;
      await api.put('/checkout', {
        billing_address: billing,
        shipping_address: shippingAddr,
      });
      onNext();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function renderFields(addr: Partial<AddressData>, patch: (k: FieldKey, v: string) => void, prefix: string) {
    return (
      <div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for={`${prefix}-fn`}>Prénom *</label>
            <input id={`${prefix}-fn`} class="form-input" type="text" value={addr.first_name ?? ''}
              onInput={(e) => patch('first_name', (e.target as HTMLInputElement).value)} />
          </div>
          <div class="form-group">
            <label class="form-label" for={`${prefix}-ln`}>Nom *</label>
            <input id={`${prefix}-ln`} class="form-input" type="text" value={addr.last_name ?? ''}
              onInput={(e) => patch('last_name', (e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for={`${prefix}-email`}>E-mail *</label>
          <input id={`${prefix}-email`} class="form-input" type="email" value={addr.email ?? ''}
            onInput={(e) => patch('email', (e.target as HTMLInputElement).value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for={`${prefix}-phone`}>Téléphone *</label>
          <input id={`${prefix}-phone`} class="form-input" type="tel" value={addr.phone ?? ''}
            onInput={(e) => patch('phone', (e.target as HTMLInputElement).value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for={`${prefix}-a1`}>Adresse *</label>
          <input id={`${prefix}-a1`} class="form-input" type="text" value={addr.address_1 ?? ''}
            onInput={(e) => patch('address_1', (e.target as HTMLInputElement).value)} />
        </div>
        <div class="form-group">
          <label class="form-label" for={`${prefix}-a2`}>Complément</label>
          <input id={`${prefix}-a2`} class="form-input" type="text" value={addr.address_2 ?? ''}
            onInput={(e) => patch('address_2', (e.target as HTMLInputElement).value)} />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for={`${prefix}-city`}>Ville *</label>
            <input id={`${prefix}-city`} class="form-input" type="text" value={addr.city ?? ''}
              onInput={(e) => patch('city', (e.target as HTMLInputElement).value)} />
          </div>
          <div class="form-group">
            <label class="form-label" for={`${prefix}-zip`}>Code postal *</label>
            <input id={`${prefix}-zip`} class="form-input" type="text" value={addr.postcode ?? ''}
              onInput={(e) => patch('postcode', (e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for={`${prefix}-country`}>Pays *</label>
            <input id={`${prefix}-country`} class="form-input" type="text" value={addr.country ?? ''}
              onInput={(e) => patch('country', (e.target as HTMLInputElement).value)} />
          </div>
          <div class="form-group">
            <label class="form-label" for={`${prefix}-state`}>Région</label>
            <input id={`${prefix}-state`} class="form-input" type="text" value={addr.state ?? ''}
              onInput={(e) => patch('state', (e.target as HTMLInputElement).value)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div class="modal-body">
        {error && <div class="error-banner">{error}</div>}
        <p class="section-title">Adresse de facturation</p>
        {renderFields(billing, patchBilling, 'bill')}
        <label class="toggle-row">
          <input class="toggle-checkbox" type="checkbox"
            checked={state.sameAsShipping}
            onChange={(e) => onUpdate({ sameAsShipping: (e.target as HTMLInputElement).checked })} />
          <span class="toggle-label">Adresse de livraison identique</span>
        </label>
        {!state.sameAsShipping && (
          <div>
            <p class="section-title">Adresse de livraison</p>
            {renderFields(shipping, patchShipping, 'ship')}
          </div>
        )}
      </div>
      <div class="modal-footer">
        <button class="btn-back" onClick={onBack}>Retour</button>
        <button class="btn-next" onClick={handleNext} disabled={saving}>
          {saving ? <span class="spinner" /> : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
