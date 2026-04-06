// Payment widget types — WooCommerce Store API Blocks checkout flow

export interface AddressData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  address_2?: string;
  city: string;
  postcode: string;
  country: string;
  state?: string;
}

export interface WooShippingRate {
  rate_id: string;
  name: string;
  price: string;        // formatted display string
  currency_code: string;
  instance_id: number;
}

export type PaymentMethod = 'stripe' | 'paypal' | 'redirect';

export interface CheckoutState {
  step: 1 | 2 | 3 | 4 | 5;
  billingAddress: Partial<AddressData>;
  shippingAddress: Partial<AddressData>;
  sameAsShipping: boolean;
  availableRates: WooShippingRate[];
  selectedRate: WooShippingRate | null;
  promoCode: string;
  promoApplied: boolean;
  promoDiscount: string;
  selectedPayment: PaymentMethod | null;
  loading: boolean;
  error: string | null;
}

export const initialCheckoutState: CheckoutState = {
  step: 1,
  billingAddress: {},
  shippingAddress: {},
  sameAsShipping: true,
  availableRates: [],
  selectedRate: null,
  promoCode: '',
  promoApplied: false,
  promoDiscount: '',
  selectedPayment: null,
  loading: false,
  error: null,
};
