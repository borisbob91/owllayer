export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

/**
 * Génère les ToolDeclarations e-commerce pour les agents vocaux.
 * Les 5 tools sont disponibles quel que soit le store connecté (Shopify ou WooCommerce).
 */
export function getStoreTools(): ToolDeclaration[] {
  return [
    {
      name: 'search_products',
      description: 'Rechercher des produits dans le catalogue du store',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Terme de recherche' },
          limit: { type: 'number', description: 'Nombre max de résultats (défaut: 10)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_product',
      description: "Obtenir les détails d'un produit par son ID",
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'ID du produit' },
        },
        required: ['productId'],
      },
    },
    {
      name: 'get_order_status',
      description: "Vérifier le statut d'une commande",
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Numéro de commande' },
        },
        required: ['orderId'],
      },
    },
    {
      name: 'search_orders',
      description: "Rechercher les commandes d'un client par email",
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email du client' },
          status: { type: 'string', description: 'Filtre par statut (pending, processing, shipped)' },
        },
        required: ['email'],
      },
    },
    {
      name: 'check_inventory',
      description: "Vérifier le stock d'un produit",
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'ID du produit' },
          variantId: { type: 'string', description: 'ID du variant (optionnel)' },
        },
        required: ['productId'],
      },
    },
  ];
}
