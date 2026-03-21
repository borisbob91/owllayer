<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useNavigationTool, useAgentToolResolver, useAgentContext, ApprovalBanner } from '@domos/vue';
import { z } from 'zod';
import { useProducts, CATEGORIES } from './store/products';
import Sidebar from './components/Sidebar.vue';
import AgentPanel from './components/AgentPanel.vue';
import VoiceWidgetStt from './components/VoiceWidgetStt.vue';
const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

const router = useRouter();
const { products, stats, addProduct, editProduct, deleteProduct, getProduct } = useProducts();

// Navigation globale avec description des routes admin
useNavigationTool(({ url }) => router.push(url), {
  description:
    "Naviguer dans le dashboard admin. Routes disponibles : " +
    "/products (liste des produits, tableau de bord principal), " +
    "/products/add (formulaire pour créer un nouveau produit), " +
    "/products/edit/:id (modifier un produit — remplacer :id par l'ID réel, ex: /products/edit/prod-001).",
});

// Contexte de rôle — indique au LLM qu'il est en mode admin
useAgentContext({
  role: 'admin',
  description: "Tu es l'assistant admin du dashboard DomOS. Tu gères le catalogue de produits (consulter, ajouter, modifier, supprimer). Utilise les outils disponibles pour répondre aux demandes de l'administrateur.",
});

// Tools CRUD produits — disponibles sur toutes les routes
useAgentToolResolver(
  {
    products: {
      tools: {
        get_catalog: {
          description: 'Obtenir la liste complète des produits avec leurs stats (stock, statut, prix).',
          schema: z.object({}),
          risk: 'none',
          handler: async () => ({
            products: products.map(p => ({
              id: p.id,
              name: p.name,
              price: `${p.price} EUR`,
              stock: p.stock,
              status: p.status,
              category: p.category,
            })),
            stats: stats.value,
          }),
        },

        add_product: {
          description: `Créer un nouveau produit dans le catalogue. Catégories disponibles : ${CATEGORIES.join(', ')}.`,
          schema: z.object({
            name: z.string().min(1).describe('Nom du produit'),
            price: z.number().positive().describe('Prix en EUR'),
            stock: z.number().int().min(0).describe('Quantité en stock'),
            category: z.enum(CATEGORIES).describe('Catégorie du produit'),
            description: z.string().describe('Description courte du produit'),
            status: z.enum(['active', 'draft', 'archived']).default('draft').describe('Statut : active (en vente), draft (brouillon), archived (archivé)'),
          }),
          risk: 'low',
          handler: async (args) => {
            const product = addProduct(args);
            router.push('/products');
            return {
              success: true,
              message: `Produit "${product.name}" créé avec l'ID ${product.id}.`,
              product,
            };
          },
        },

        edit_product: {
          description: `Modifier un produit existant. Produits disponibles : ${products.map(p => `${p.name} (id:${p.id})`).join(', ')}.`,
          schema: z.object({
            id: z.string().describe('ID du produit à modifier'),
            name: z.string().optional().describe('Nouveau nom'),
            price: z.number().positive().optional().describe('Nouveau prix en EUR'),
            stock: z.number().int().min(0).optional().describe('Nouveau stock'),
            category: z.enum(CATEGORIES).optional().describe('Nouvelle catégorie'),
            description: z.string().optional().describe('Nouvelle description'),
            status: z.enum(['active', 'draft', 'archived']).optional().describe('Nouveau statut'),
          }),
          risk: 'low',
          handler: async ({ id, ...updates }) => {
            const product = editProduct(id, updates);
            if (!product) return { success: false, error: `Produit "${id}" introuvable. Vérifiez l'ID avec get_catalog.` };
            return { success: true, message: `Produit "${product.name}" mis à jour.`, product };
          },
        },

        delete_product: {
          description: `Supprimer définitivement un produit du catalogue. Produits : ${products.map(p => `${p.name} (id:${p.id})`).join(', ')}.`,
          schema: z.object({
            id: z.string().describe('ID du produit à supprimer'),
          }),
          risk: 'high',
          handler: async ({ id }) => {
            const product = getProduct(id);
            if (!product) return { success: false, error: `Produit "${id}" introuvable.` };
            const ok = deleteProduct(id);
            return ok
              ? { success: true, message: `Produit "${product.name}" supprimé définitivement.` }
              : { success: false, error: 'Erreur lors de la suppression.' };
          },
        },
      },
    },
  },
  { global: true },
);
</script>

<template>
  <div class="flex h-screen bg-slate-950 overflow-hidden">
    <Sidebar />
    <main class="flex-1 overflow-y-auto">
      <RouterView />
    </main>
    <ApprovalBanner />
    <AgentPanel v-if="!USE_DEFAULT_WIDGET" />
    <VoiceWidgetStt v-if="!USE_DEFAULT_WIDGET" />
  </div>
</template>
