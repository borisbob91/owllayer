import { ref, computed } from 'vue';

export type Locale = 'en' | 'fr';

const initialLocale: Locale = (() => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('owllayer_lang') : null;
  if (saved === 'en' || saved === 'fr') return saved;
  const envLang = import.meta.env.VITE_APP_LANGUAGE;
  if (envLang === 'fr' || envLang === 'en') return envLang;
  return 'en';
})();

const currentLocale = ref<Locale>(initialLocale);

export const translations = {
  en: {
    common: {
      currency: 'USD',
      currencySymbol: '$',
      cancel: 'Cancel',
      confirm: 'Confirm',
      deny: 'Deny',
      save: 'Save Changes',
      create: 'Create Product',
      edit: 'Edit',
      delete: 'Delete',
      voice: 'voice',
    },
    nav: {
      catalog: 'Catalog',
      addProduct: 'Add Product',
      products: 'Products',
      adminDashboard: 'Admin Dashboard',
      agent: 'OwlLayer Agent',
      routesDescription:
        'Navigate within the admin dashboard. Available routes: /products (product list, main dashboard), /products/add (form to create a new product), /products/edit/:id (edit an existing product — replace :id with product ID, e.g. /products/edit/prod-001).',
    },
    status: {
      active: 'Active',
      draft: 'Draft',
      archived: 'Archived',
      connecting: 'Connecting…',
      thinking: 'Thinking…',
      speaking: 'Responding…',
      listening: 'Listening…',
      error: 'Error',
      connected: 'Connected',
      disconnected: 'Disconnected',
      connectingFeedback: 'Connecting to server…',
      serverUnreachable: 'Server unreachable',
      incidentFeedback: 'Non-blocking incident',
    },
    categories: {
      Audio: 'Audio',
      Peripherals: 'Peripherals',
      Monitors: 'Monitors',
      Video: 'Video',
      Storage: 'Storage',
      Networking: 'Networking',
    },
    productItems: {
      'prod-001': {
        name: 'BT Pro Headphones',
        description: 'Premium Bluetooth ANC headphones, 30h battery life',
      },
      'prod-002': {
        name: 'Mechanical RGB Keyboard',
        description: 'Cherry MX Red switches, full RGB backlighting',
      },
      'prod-003': {
        name: 'Ergonomic Mouse',
        description: '6-button ergonomic mouse, 12000 DPI sensor',
      },
      'prod-004': {
        name: '4K 27" Monitor',
        description: 'IPS 4K 144Hz, G-Sync compatible, HDR400',
      },
      'prod-005': {
        name: 'HD Pro Webcam',
        description: '1080p 60fps autofocus, integrated stereo mic',
      },
      'prod-006': {
        name: '1TB NVMe SSD',
        description: 'PCIe 4.0 NVMe, up to 7400 MB/s read speed',
      },
    } as Record<string, { name: string; description: string }>,
    agent: {
      roleDescription:
        'You are the admin assistant for the OwlLayer dashboard. You manage the product catalog (view, add, edit, delete). Use the available tools to fulfill administrator requests.',
      getCatalogDesc: 'Get the full list of products along with statistics (stock, status, prices).',
      addProductDesc: 'Create a new product in the catalog. Available categories: Audio, Peripherals, Monitors, Video, Storage, Networking.',
      editProductDesc: 'Modify an existing product in the catalog.',
      deleteProductDesc: 'Permanently delete a product from the catalog.',
      editIdParamDesc: 'ID of the product to modify (e.g. prod-001)',
      deleteIdParamDesc: 'ID of the product to delete (e.g. prod-001)',
      productCreatedMsg: 'Product "{name}" created with ID {id}.',
      productUpdatedMsg: 'Product "{name}" updated successfully.',
      productDeletedMsg: 'Product "{name}" permanently deleted.',
      productNotFoundMsg: 'Product "{id}" not found. Verify the ID with get_catalog.',
      deleteFailedMsg: 'Failed to delete product.',
      sttWelcome: 'STT/TTS mode active. Speak or type your request, the reply will be read aloud.',
      adminWelcome: 'Hello! I am your admin assistant. I can view, add, edit, or delete products. Speak or type your request.',
      sttListening: '● Recording (STT)…',
      sttThinking: '● STT → LLM…',
      sttSpeaking: '● TTS speaking…',
      adminThinking: '● Thinking…',
      adminSpeaking: '● Responding…',
      adminListening: '● Listening to your voice…',
      approvalRequiredTitle: 'Confirmation Required',
      approvalRequiredDesc: 'The assistant is requesting confirmation for this action.',
      approvalDeleteTitle: 'Product Deletion',
      approvalDeleteDesc: 'Are you sure you want to permanently delete this product from the catalog?',
      approvalEditTitle: 'Product Modification',
      approvalEditDesc: 'Do you confirm the requested changes for this product?',
      inputPlaceholder: 'Type or speak…',
      voiceHint: '💡 Try asking the assistant: "Add Sony headphones for $199 with stock 20" · "Update headphone stock to 50" · "Delete the ergonomic mouse"',
      voiceHintForm: '💡 You can also ask the assistant: "Add a Logitech keyboard for $89, stock 40, category Peripherals"',
      goToAddProductDesc: 'Navigate to the product creation form in the catalog.',
    },
    catalog: {
      title: 'Product Catalog',
      subtitle: '{total} products · stock value {value}',
      addProductBtn: 'Add Product',
      total: 'Total',
      active: 'Active',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      searchPlaceholder: 'Search products…',
      allCategories: 'All Categories',
      resultsCount: '{count} result(s)',
      thProduct: 'Product',
      thCategory: 'Category',
      thPrice: 'Price',
      thStock: 'Stock',
      thStatus: 'Status',
      thId: 'ID',
      outOfStockAlert: '⚠ Out of stock',
      noProducts: 'No products found.',
      confirmDelete: 'Delete "{name}"? This action cannot be undone.',
    },
    form: {
      newTitle: 'New Product',
      editTitle: 'Edit Product',
      newSubtitle: 'Fill in the form or dictate to the voice assistant.',
      editSubtitle: 'ID: {id}',
      nameLabel: 'Product Name',
      namePlaceholder: 'e.g. BT Pro 2 Headphones',
      priceLabel: 'Price',
      pricePlaceholder: 'e.g. 149.99',
      stockLabel: 'Stock',
      stockPlaceholder: 'e.g. 50',
      categoryLabel: 'Category',
      statusLabel: 'Status',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'e.g. Premium Bluetooth ANC headphones with 30h battery life…',
      nameRequired: 'Product name is required.',
      priceInvalid: 'Invalid price.',
      stockInvalid: 'Invalid stock quantity.',
      descriptionRequired: 'Description is required.',
    },
  },

  fr: {
    common: {
      currency: 'EUR',
      currencySymbol: '€',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      deny: 'Refuser',
      save: 'Enregistrer les modifications',
      create: 'Créer le produit',
      edit: 'Modifier',
      delete: 'Supprimer',
      voice: 'vocal',
    },
    nav: {
      catalog: 'Catalogue',
      addProduct: 'Ajouter produit',
      products: 'Produits',
      adminDashboard: 'Dashboard Admin',
      agent: 'Agent OwlLayer',
      routesDescription:
        'Naviguer dans le dashboard admin. Routes disponibles : /products (liste des produits, tableau de bord principal), /products/add (formulaire pour créer un nouveau produit), /products/edit/:id (modifier un produit — remplacer :id par l\'ID réel, ex: /products/edit/prod-001).',
    },
    status: {
      active: 'Actif',
      draft: 'Brouillon',
      archived: 'Archivé',
      connecting: 'Connexion…',
      thinking: 'Réfléchit…',
      speaking: 'Répond…',
      listening: 'Écoute…',
      error: 'Erreur',
      connected: 'Connecté',
      disconnected: 'Déconnecté',
      connectingFeedback: 'Connexion au serveur…',
      serverUnreachable: 'Serveur inaccessible',
      incidentFeedback: 'Incident non bloquant',
    },
    categories: {
      Audio: 'Audio',
      Peripherals: 'Périphériques',
      Monitors: 'Moniteurs',
      Video: 'Vidéo',
      Storage: 'Stockage',
      Networking: 'Réseaux',
    },
    productItems: {
      'prod-001': {
        name: 'Casque BT Pro',
        description: 'Casque Bluetooth ANC premium, autonomie de 30h',
      },
      'prod-002': {
        name: 'Clavier mécanique RGB',
        description: 'Switches Cherry MX Red, rétroéclairage complet RGB',
      },
      'prod-003': {
        name: 'Souris ergonomique',
        description: 'Souris ergonomique 6 boutons, capteur 12000 DPI',
      },
      'prod-004': {
        name: 'Écran 4K 27"',
        description: 'Dalle IPS 4K 144Hz, compatible G-Sync, HDR400',
      },
      'prod-005': {
        name: 'Webcam HD Pro',
        description: 'Autofocus 1080p 60fps, micro stéréo intégré',
      },
      'prod-006': {
        name: 'SSD NVMe 1 To',
        description: 'PCIe 4.0 NVMe, jusqu\'à 7400 Mo/s en lecture',
      },
    } as Record<string, { name: string; description: string }>,
    agent: {
      roleDescription:
        'Tu es l\'assistant admin du dashboard OwlLayer. Tu gères le catalogue de produits (consulter, ajouter, modifier, supprimer). Utilise les outils disponibles pour répondre aux demandes de l\'administrateur.',
      getCatalogDesc: 'Obtenir la liste complète des produits avec leurs stats (stock, statut, prix).',
      addProductDesc: 'Créer un nouveau produit dans le catalogue. Catégories disponibles : Audio, Périphériques, Moniteurs, Vidéo, Stockage, Réseaux.',
      editProductDesc: 'Modifier un produit existant dans le catalogue.',
      deleteProductDesc: 'Supprimer définitivement un produit du catalogue.',
      editIdParamDesc: 'ID du produit à modifier (ex : prod-001)',
      deleteIdParamDesc: 'ID du produit à supprimer (ex : prod-001)',
      productCreatedMsg: 'Produit "{name}" créé avec l\'ID {id}.',
      productUpdatedMsg: 'Produit "{name}" mis à jour avec succès.',
      productDeletedMsg: 'Produit "{name}" supprimé définitivement.',
      productNotFoundMsg: 'Produit "{id}" introuvable. Vérifiez l\'ID avec get_catalog.',
      deleteFailedMsg: 'Échec de la suppression du produit.',
      sttWelcome: 'Mode STT/TTS actif. Parlez ou tapez, la réponse sera lue à voix haute (Google Neural2-A).',
      adminWelcome: 'Bonjour ! Je suis votre assistant admin. Je peux ajouter, modifier ou supprimer des produits. Parlez ou tapez votre commande.',
      sttListening: '● Enregistrement (STT)…',
      sttThinking: '● STT → LLM…',
      sttSpeaking: '● TTS en lecture…',
      adminThinking: '● Réfléchit…',
      adminSpeaking: '● Répond…',
      adminListening: '● Écoute votre voix…',
      approvalRequiredTitle: 'Confirmation requise',
      approvalRequiredDesc: 'L\'assistant demande votre confirmation pour effectuer cette action.',
      approvalDeleteTitle: 'Suppression de produit',
      approvalDeleteDesc: 'Êtes-vous sûr de vouloir supprimer définitivement ce produit du catalogue ?',
      approvalEditTitle: 'Modification de produit',
      approvalEditDesc: 'Confirmez-vous les modifications demandées sur ce produit ?',
      inputPlaceholder: 'Tapez ou parlez…',
      voiceHint: '💡 Dites à l\'assistant : "Ajoute un casque Sony à 199€, stock 20" · "Modifie le stock du casque à 50" · "Supprime la souris ergonomique"',
      voiceHintForm: '💡 Vous pouvez aussi demander à l\'assistant : "Ajoute un clavier Logitech à 89€, stock 40, catégorie Périphériques"',
      goToAddProductDesc: 'Naviguer vers le formulaire de création d\'un nouveau produit dans le catalogue.',
    },
    catalog: {
      title: 'Catalogue produits',
      subtitle: '{total} produits · valeur stock {value}',
      addProductBtn: 'Ajouter un produit',
      total: 'Total',
      active: 'Actifs',
      lowStock: 'Stock faible',
      outOfStock: 'Rupture',
      searchPlaceholder: 'Rechercher un produit…',
      allCategories: 'Toutes catégories',
      resultsCount: '{count} résultat(s)',
      thProduct: 'Produit',
      thCategory: 'Catégorie',
      thPrice: 'Prix',
      thStock: 'Stock',
      thStatus: 'Statut',
      thId: 'ID',
      outOfStockAlert: '⚠ Rupture',
      noProducts: 'Aucun produit trouvé.',
      confirmDelete: 'Supprimer "{name}" ? Cette action est irréversible.',
    },
    form: {
      newTitle: 'Nouveau produit',
      editTitle: 'Modifier le produit',
      newSubtitle: 'Remplissez le formulaire ou dictez à l\'assistant vocal.',
      editSubtitle: 'ID : {id}',
      nameLabel: 'Nom du produit',
      namePlaceholder: 'ex : Casque BT Pro 2',
      priceLabel: 'Prix',
      pricePlaceholder: 'ex : 149.99',
      stockLabel: 'Stock',
      stockPlaceholder: 'ex : 50',
      categoryLabel: 'Catégorie',
      statusLabel: 'Statut',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'ex : Casque Bluetooth premium avec réduction de bruit active…',
      nameRequired: 'Le nom est requis.',
      priceInvalid: 'Prix invalide.',
      stockInvalid: 'Stock invalide.',
      descriptionRequired: 'La description est requise.',
    },
  },
};

export const CATEGORY_KEYS = ['Audio', 'Peripherals', 'Monitors', 'Video', 'Storage', 'Networking'] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];

export function useI18n() {
  const locale = computed(() => currentLocale.value);

  function setLocale(newLocale: Locale) {
    currentLocale.value = newLocale;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('owllayer_lang', newLocale);
    }
  }

  function toggleLocale() {
    setLocale(currentLocale.value === 'en' ? 'fr' : 'en');
  }

  const t = computed(() => translations[currentLocale.value]);

  function format(template: string, params?: Record<string, string | number | undefined>): string {
    if (!params) return template;
    let res = template;
    for (const [key, value] of Object.entries(params)) {
      res = res.replace(new RegExp(`\\{${key}\\}`, 'g'), value !== undefined ? String(value) : '');
    }
    return res;
  }

  function formatCurrency(amount: number): string {
    if (currentLocale.value === 'fr') {
      return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    }
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function getProductName(product: { id: string; name: string }): string {
    const item = (t.value.productItems as Record<string, { name: string; description: string }>)?.[product.id];
    return item?.name ?? product.name;
  }

  function getProductDescription(product: { id: string; description: string }): string {
    const item = (t.value.productItems as Record<string, { name: string; description: string }>)?.[product.id];
    return item?.description ?? product.description;
  }

  return {
    locale,
    currentLocale,
    setLocale,
    toggleLocale,
    t,
    format,
    formatCurrency,
    getProductName,
    getProductDescription,
  };
}
