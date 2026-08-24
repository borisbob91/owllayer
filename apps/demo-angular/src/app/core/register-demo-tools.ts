import { z } from 'zod';
import {
  injectOwlLayer,
  type AgentContextPayload,
  type AgentToolDeclaration,
  registerToolResolver,
  registerNavigationTool,
  registerViewStateTool,
  createResolverFromSwitch,
  createCRUDResolver,
} from '@owllayer/angular';
import { ListingsStoreService } from '../marketplace/store/listings.store.js';
import { ListingFiltersService } from '../marketplace/store/listing-filters.service.js';
import type { ListingCategory } from '../marketplace/models/listing.types.js';
import { inject } from '@angular/core';

/**
 * Enregistre tous les tools marketplace avec descriptions LLM riches.
 * Démontre TOUTE la surface SDK Angular pour le tool registration:
 * - registerToolResolver
 * - createResolverFromSwitch
 * - createCRUDResolver
 * - registerNavigationTool
 * - registerViewStateTool
 */
export function registerDemoTools(): VoidFunction {
  const owllayer = injectOwlLayer();
  const store = inject(ListingsStoreService);
  const filtersService = inject(ListingFiltersService);
  const disposers: VoidFunction[] = [];

  // ------------------------------------------------------------------
  // NAVIGATION TOOLS — registerNavigationTool
  // ------------------------------------------------------------------
  const disposeNavigation = registerNavigationTool(
    async ({ url, replace, state }) => {
      // Le router Angular est injecté automatiquement dans le composant,
      // ici on retourne juste un signal pour le handler
      return {
        success: true,
        navigatedTo: url,
        state,
      };
    }
  );
  disposers.push(disposeNavigation);

  // ------------------------------------------------------------------
  // SEARCH & FILTERS TOOLS — createResolverFromSwitch
  // ------------------------------------------------------------------
  const searchConfig = createResolverFromSwitch({
    search_listings: {
      description:
        'Rechercher des annonces par mots-clés dans le titre, la description ou le nom du vendeur',
      schema: z.object({
        query: z
          .string()
          .describe(
            'Mots-clés de recherche: titre, description ou nom du vendeur. Ex: "vélo", "paris", "iPhone"'
          ),
        category: z
          .enum([
            'vehicules',
            'immobilier',
            'electronique',
            'sport',
            'maison',
            'divers',
          ])
          .optional()
          .describe(
            'Filtrer par catégorie: vehicules, immobilier, electronique, sport, maison, divers'
          ),
      }) as any,
      handler: async ({ query, category }) => {
        filtersService.setQuery(query);
        if (category) {
          filtersService.setCategory(category as ListingCategory);
        }
        const results = store.list(filtersService.filters());
        return {
          count: results.length,
          listings: results.map((l) => ({
            id: l.id,
            title: l.title,
            price: l.price,
            category: l.category,
            location: l.location,
          })),
        };
      },
      risk: 'none',
    },
    filter_by_category: {
      description:
        'Filtrer les annonces par catégorie spécifique ou retirer le filtre catégorie',
      schema: z.object({
        category: z
          .enum([
            'vehicules',
            'immobilier',
            'electronique',
            'sport',
            'maison',
            'divers',
            'none',
          ])
          .describe(
            'Catégorie à filtrer (vehicules, immobilier, electronique, sport, maison, divers) ou "none" pour retirer le filtre'
          ),
      }) as any,
      handler: async ({ category }) => {
        const targetCategory = category === 'none' ? null : category;
        filtersService.setCategory(targetCategory as ListingCategory | null);
        const results = store.list(filtersService.filters());
        return {
          category: targetCategory,
          count: results.length,
        };
      },
      risk: 'none',
    },
    set_price_range: {
      description:
        'Définir une fourchette de prix minimum et/ou maximum pour filtrer les annonces',
      schema: z.object({
        minPrice: z
          .number()
          .optional()
          .describe('Prix minimum en euros. Ex: 50'),
        maxPrice: z
          .number()
          .optional()
          .describe('Prix maximum en euros. Ex: 500'),
      }) as any,
      handler: async ({ minPrice, maxPrice }) => {
        filtersService.setPriceRange(minPrice, maxPrice);
        const results = store.list(filtersService.filters());
        return {
          priceRange: { min: minPrice ?? null, max: maxPrice ?? null },
          count: results.length,
        };
      },
      risk: 'none',
    },
    reset_filters: {
      description:
        'Réinitialiser tous les filtres de recherche (catégorie, prix, mots-clés)',
      schema: z.object({}) as any,
      handler: async () => {
        filtersService.reset();
        const results = store.list();
        return {
          message: 'Filtres réinitialisés',
          totalListings: results.length,
        };
      },
      risk: 'none',
    },
  });

  const searchHandle = registerToolResolver({
    search: searchConfig.main,
  });
  disposers.push(() => searchHandle.destroy());

  // ------------------------------------------------------------------
  // FAVORITES TOOLS — createResolverFromSwitch
  // ------------------------------------------------------------------
  const favoritesConfig = createResolverFromSwitch({
    add_favorite: {
      description: 'Ajouter une annonce aux favoris de l\'utilisateur',
      schema: z.object({
        listingId: z
          .string()
          .describe('Identifiant unique de l\'annonce à ajouter aux favoris'),
      }) as any,
      handler: async ({ listingId }) => {
        const listing = store.getById(listingId);
        if (!listing) {
          return { success: false, error: 'Annonce introuvable' };
        }
        const isNowFavorite = store.toggleFavorite(listingId);
        if (!isNowFavorite) {
          // Était déjà en favoris, on l'a retiré, on le remet
          store.toggleFavorite(listingId);
        }
        return {
          success: true,
          listing: {
            id: listing.id,
            title: listing.title,
            price: listing.price,
          },
          favoritesCount: store.favoriteIds().length,
        };
      },
      risk: 'none',
    },
    remove_favorite: {
      description: 'Retirer une annonce des favoris de l\'utilisateur',
      schema: z.object({
        listingId: z
          .string()
          .describe('Identifiant unique de l\'annonce à retirer des favoris'),
      }) as any,
      handler: async ({ listingId }) => {
        const isFavorite = store.isFavorite(listingId);
        if (!isFavorite) {
          return {
            success: false,
            error: 'Cette annonce n\'est pas dans vos favoris',
          };
        }
        store.toggleFavorite(listingId);
        return {
          success: true,
          listingId,
          favoritesCount: store.favoriteIds().length,
        };
      },
      risk: 'none',
    },
    view_favorites: {
      description:
        'Consulter la liste complète des annonces favorites de l\'utilisateur',
      schema: z.object({}) as any,
      handler: async () => {
        const favorites = store.favorites();
        return {
          count: favorites.length,
          favorites: favorites.map((l) => ({
            id: l.id,
            title: l.title,
            price: l.price,
            category: l.category,
            location: l.location,
          })),
        };
      },
      risk: 'none',
    },
  });

  const favoritesHandle = registerToolResolver({
    favorites: favoritesConfig.main,
  });
  disposers.push(() => favoritesHandle.destroy());

  // ------------------------------------------------------------------
  // LISTING CRUD TOOLS — createCRUDResolver
  // ------------------------------------------------------------------
  const listingCRUDConfig = createCRUDResolver('listing', {
    onCreate: async (data: any) => {
      const created = store.createListing({
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        location: data.location,
        seller: data.seller,
        sellerPhone: data.sellerPhone,
        imageUrl: data.imageUrl,
      });
      return {
        id: created.id,
        title: created.title,
        price: created.price,
        category: created.category,
      };
    },
    onUpdate: async (id: string, data: any) => {
      const updated = store.updateListing(id, data);
      if (!updated) {
        throw new Error('Annonce introuvable');
      }
      return {
        id: updated.id,
        title: updated.title,
        price: updated.price,
        category: updated.category,
      };
    },
    onDelete: async (id: string) => {
      const deleted = store.deleteListing(id);
      if (!deleted) {
        throw new Error('Annonce introuvable ou déjà supprimée');
      }
      return { id, deleted: true };
    },
    onRead: async (id: string) => {
      const listing = store.getById(id);
      if (!listing) {
        throw new Error('Annonce introuvable');
      }
      return {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        location: listing.location,
        seller: listing.seller,
        sellerPhone: listing.sellerPhone,
        imageUrl: listing.imageUrl,
        createdAt: listing.createdAt,
        isFavorite: store.isFavorite(listing.id),
      };
    },
    onList: async (filters?: any) => {
      const listings = store.list(filters);
      return {
        count: listings.length,
        listings: listings.map((l) => ({
          id: l.id,
          title: l.title,
          price: l.price,
          category: l.category,
          location: l.location,
          createdAt: l.createdAt,
        })),
      };
    },
  });

  const crudHandle = registerToolResolver(listingCRUDConfig);
  disposers.push(() => crudHandle.destroy());

  // ------------------------------------------------------------------
  // VIEW STATE TOOLS — registerViewStateTool
  // Exemple: ouvrir/fermer panneau filtres (action UI locale sans impact store)
  // ------------------------------------------------------------------
  const disposeViewState = registerViewStateTool(
    async ({ viewId, action, params }) => {
      // Dans une vraie app, on manipulerait un signal local UI
      // Ici on simule juste la réponse
      return {
        viewId,
        action,
        success: true,
        message: `Action "${action}" exécutée sur la vue "${viewId}"`,
        params,
      };
    }
  );
  disposers.push(disposeViewState);

  // ------------------------------------------------------------------
  // CONTACT SELLER TOOL — registerTool classique
  // Utilisé par le OwlLayerToolButtonComponent dans listing-detail-page
  // ------------------------------------------------------------------
  const disposeContactSeller = owllayer.registerTool(
    {
      name: 'contact_seller',
      description:
        'Contacter le vendeur d\'une annonce pour obtenir ses coordonnées ou poser une question',
      parameters: {
        type: 'OBJECT',
        properties: {
          listingId: {
            type: 'STRING',
            description: 'Identifiant unique de l\'annonce concernée',
          },
          seller: {
            type: 'STRING',
            description: 'Nom du vendeur',
          },
          message: {
            type: 'STRING',
            description:
              'Message optionnel à envoyer au vendeur (dans un contexte réel)',
          },
        },
      },
    },
    async (args: any) => {
      const listing = store.getById(args.listingId as string);
      if (!listing) {
        return {
          success: false,
          error: 'Annonce introuvable',
        };
      }
      return {
        success: true,
        seller: listing.seller,
        phone: listing.sellerPhone ?? 'Non renseigné',
        message: args.message ?? null,
        note: 'Dans une vraie application, cela enverrait un message au vendeur',
      };
    }
  );
  disposers.push(disposeContactSeller);

  // ------------------------------------------------------------------
  // DISPOSE FUNCTION
  // ------------------------------------------------------------------
  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
