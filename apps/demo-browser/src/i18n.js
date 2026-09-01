// apps/demo-browser/src/i18n.js
// Système d'internationalisation réactif et centralisé pour la démo Vanilla Browser

export const TRANSLATIONS = {
  fr: {
    nav: {
      brand: 'Boutique OwlLayer',
      catalogue: 'Catalogue',
      panier: 'Panier',
      commande: 'Commande',
      agentReady: 'OwlLayer prêt',
      agentConnecting: 'OwlLayer…',
      agentError: 'Erreur',
      toggleLang: 'English',
    },
    hero: {
      title: 'Catalogue',
      subtitle: 'Démo e-commerce — testez le chat et la voix OwlLayer !',
      searchPlaceholder: 'Rechercher…',
    },
    categories: {
      all: 'Tous',
      audio: 'Audio',
      peripheriques: 'Périphériques',
      video: 'Vidéo',
      moniteurs: 'Moniteurs',
      accessoires: 'Accessoires',
    },
    product: {
      stock: 'en stock',
      addToCart: 'Ajouter au panier',
      addedToast: '"{name}" ajouté au panier !',
      noResults: 'Aucun produit ne correspond à votre recherche.',
    },
    cart: {
      title: 'Votre Panier',
      subtitle: 'Vérifiez vos articles avant de finaliser la commande.',
      empty: 'Votre panier est vide',
      emptyDesc: 'Explorez le catalogue et ajoutez des articles à votre panier.',
      browseBtn: 'Voir le catalogue',
      productCol: 'Produit',
      priceCol: 'Prix unitaire',
      qtyCol: 'Quantité',
      totalCol: 'Total',
      summaryTitle: 'Récapitulatif',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      freeShipping: 'Gratuite',
      total: 'Total TTC',
      checkoutBtn: 'Passer la commande',
      clearBtn: 'Vider le panier',
    },
    checkout: {
      title: 'Finaliser la commande',
      subtitle: 'Saisissez vos coordonnées de livraison et de paiement.',
      addressTitle: 'Adresse de livraison',
      shippingTitle: 'Mode de livraison',
      paymentTitle: 'Paiement sécurisé (simulation)',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Adresse email',
      address: 'Adresse',
      city: 'Ville',
      postalCode: 'Code postal',
      country: 'Pays',
      cardNumber: 'Numéro de carte',
      expiry: 'MM/AA',
      cvc: 'CVC',
      simulatedWarning: 'Ceci est une simulation — aucun prélèvement bancaire réel n\'est effectué.',
      payBtn: 'Payer et commander',
      orderConfirmed: 'Commande confirmée !',
      thankYou: 'Merci pour votre achat. Votre commande a été enregistrée avec succès.',
    },
    productsData: {
      'casque-bt-pro': {
        name: 'Casque Bluetooth Pro',
        desc: 'Casque sans fil avec réduction de bruit active, autonomie 30h, son Hi-Fi.',
      },
      'clavier-meca': {
        name: 'Clavier Mécanique RGB',
        desc: 'Switches Cherry MX Brown, rétro-éclairage RGB, châssis aluminium.',
      },
      'webcam-4k': {
        name: 'Webcam 4K Ultra HD',
        desc: 'Capteur Sony, autofocus, micro intégré, compatible streaming.',
      },
      'souris-ergo': {
        name: 'Souris Ergonomique Sans Fil',
        desc: 'Design vertical, capteur 4000 DPI, rechargeable USB-C.',
      },
      'ecran-27': {
        name: 'Écran 27" QHD 165Hz',
        desc: 'Dalle IPS, 1ms, HDR400, USB-C avec charge 65W.',
      },
      'hub-usbc': {
        name: 'Hub USB-C 7-en-1',
        desc: 'HDMI 4K, 3× USB-A, SD/microSD, charge 100W pass-through.',
      },
      'micro-usb': {
        name: 'Microphone USB Condensateur',
        desc: 'Cardioïde, 192kHz/24bit, pied ajustable inclus, plug & play.',
      },
      'casque-gaming': {
        name: 'Casque Gaming 7.1 Surround',
        desc: 'Son surround 7.1 virtuel, micro rétractable, RGB, compatible PC/PS5.',
      },
      'tapis-xxl': {
        name: 'Tapis de Souris XXL Gaming',
        desc: '900×400mm, surface optimisée vitesse/précision, bords cousus antidérapants.',
      },
      'stand-laptop': {
        name: 'Stand Laptop Réglable Alu',
        desc: 'Aluminium, 6 hauteurs, pliable ultra-compact, compatible 10–17 pouces.',
      },
      'clavier-bt': {
        name: 'Clavier Sans Fil Compact BT',
        desc: 'Bluetooth 5.0, multi-device 3 appareils, rétroéclairage blanc, autonomie 3 mois.',
      },
    },
    agent: {
      systemPrompt: "Tu es l'assistant de la boutique OwlLayer — périphériques informatiques. Tu aides les clients à découvrir les produits, filtrer par catégorie, ajouter des articles au panier et passer commande.",
      navigateDesc: "Naviguer vers une page de la boutique (catalogue, panier, commande).",
      addToCartDesc: "Ajouter un produit au panier par son identifiant et sa quantité.",
      searchProductsDesc: "Rechercher des produits dans le catalogue par nom, description ou catégorie.",
      filterCategoryDesc: "Filtrer les produits par catégorie.",
      cartSummaryDesc: "Obtenir le résumé du panier (articles, quantités, total).",
    },
  },
  en: {
    nav: {
      brand: 'OwlLayer Store',
      catalogue: 'Catalog',
      panier: 'Cart',
      commande: 'Checkout',
      agentReady: 'OwlLayer ready',
      agentConnecting: 'OwlLayer…',
      agentError: 'Error',
      toggleLang: 'Français',
    },
    hero: {
      title: 'Catalog',
      subtitle: 'E-Commerce Demo — experience OwlLayer voice & text agent!',
      searchPlaceholder: 'Search products…',
    },
    categories: {
      all: 'All',
      audio: 'Audio',
      peripheriques: 'Peripherals',
      video: 'Video',
      moniteurs: 'Monitors',
      accessoires: 'Accessories',
    },
    product: {
      stock: 'in stock',
      addToCart: 'Add to cart',
      addedToast: '"{name}" added to cart!',
      noResults: 'No products matched your search criteria.',
    },
    cart: {
      title: 'Shopping Cart',
      subtitle: 'Review your items before proceeding to checkout.',
      empty: 'Your cart is empty',
      emptyDesc: 'Explore our catalog and find great tech peripherals!',
      browseBtn: 'Browse Catalog',
      productCol: 'Product',
      priceCol: 'Unit Price',
      qtyCol: 'Quantity',
      totalCol: 'Subtotal',
      summaryTitle: 'Order Summary',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      freeShipping: 'Free',
      total: 'Total',
      checkoutBtn: 'Proceed to Checkout',
      clearBtn: 'Clear Cart',
    },
    checkout: {
      title: 'Order Checkout',
      subtitle: 'Enter your shipping address and simulated payment details.',
      addressTitle: 'Shipping Address',
      shippingTitle: 'Shipping Method',
      paymentTitle: 'Payment Method (Simulation)',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email Address',
      address: 'Street Address',
      city: 'City',
      postalCode: 'Postal Code',
      country: 'Country',
      cardNumber: 'Card Number',
      expiry: 'MM/YY',
      cvc: 'CVC',
      simulatedWarning: 'This is a simulation — no real payment is charged.',
      payBtn: 'Pay & Confirm Order',
      orderConfirmed: 'Order Confirmed!',
      thankYou: 'Thank you for your purchase. Your order has been placed successfully.',
    },
    productsData: {
      'casque-bt-pro': {
        name: 'BT Pro Wireless Headphones',
        desc: 'Wireless Bluetooth headphones with active noise cancellation, 30h battery life, Hi-Fi audio.',
      },
      'clavier-meca': {
        name: 'RGB Mechanical Keyboard',
        desc: 'Cherry MX Brown switches, full RGB backlighting, durable aluminum chassis.',
      },
      'webcam-4k': {
        name: '4K Ultra HD Webcam',
        desc: 'Sony CMOS sensor, autofocus, built-in dual microphone, streaming ready.',
      },
      'souris-ergo': {
        name: 'Ergonomic Wireless Mouse',
        desc: 'Vertical ergonomic design, 4000 DPI optical sensor, USB-C rechargeable.',
      },
      'ecran-27': {
        name: '27" QHD 165Hz Monitor',
        desc: 'IPS panel, 1ms response time, HDR400, USB-C dock with 65W charging.',
      },
      'hub-usbc': {
        name: '7-in-1 USB-C Hub',
        desc: '4K HDMI, 3x USB-A ports, SD/microSD reader, 100W Power Delivery.',
      },
      'micro-usb': {
        name: 'USB Condenser Microphone',
        desc: 'Cardioid polar pattern, 192kHz/24bit, adjustable desktop stand included, plug & play.',
      },
      'casque-gaming': {
        name: '7.1 Surround Gaming Headset',
        desc: '7.1 virtual surround sound, retractable mic, dynamic RGB, PC/PS5 compatible.',
      },
      'tapis-xxl': {
        name: 'XXL Gaming Mousepad',
        desc: '900x400mm desk mat, micro-woven cloth surface, anti-fray stitched edges.',
      },
      'stand-laptop': {
        name: 'Adjustable Aluminum Laptop Stand',
        desc: 'Ergonomic aluminum construction, 6 height adjustments, ultra-portable folding.',
      },
      'clavier-bt': {
        name: 'Compact Wireless Bluetooth Keyboard',
        desc: 'Bluetooth 5.0, 3 multi-device pairing, clean white backlighting, 3-month battery life.',
      },
    },
    agent: {
      systemPrompt: "You are the voice & chat assistant for OwlLayer Store — computer hardware and peripherals shop. You help customers discover products, filter categories, add items to cart, and checkout.",
      navigateDesc: "Navigate to a shop page (catalog, cart, checkout).",
      addToCartDesc: "Add a product to cart by its ID and quantity.",
      searchProductsDesc: "Search products in the catalog by query or category.",
      filterCategoryDesc: "Filter products by category.",
      cartSummaryDesc: "Get current cart summary (items, quantity, total).",
    },
  },
};

export function getLocale() {
  try {
    const saved = localStorage.getItem('owllayer_demo_lang_browser');
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {}
  return 'fr';
}

export function setLocale(locale) {
  try {
    localStorage.setItem('owllayer_demo_lang_browser', locale);
  } catch {}
}

export function t(locale = getLocale()) {
  return TRANSLATIONS[locale] || TRANSLATIONS.fr;
}

export function formatPrice(price, locale = getLocale()) {
  if (locale === 'en') {
    return `$${Number(price).toFixed(2)}`;
  }
  return `${Number(price).toFixed(2)} €`;
}
