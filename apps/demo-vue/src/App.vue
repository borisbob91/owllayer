<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useNavigationTool, useAgentToolResolver, useAgentContext, useDevTools } from '@owllayer/vue';
import { z } from 'zod';
import { useProducts, CATEGORIES } from './store/products';
import { useI18n, type CategoryKey } from './i18n';
import Sidebar from './components/Sidebar.vue';
import AgentPanel from './components/AgentPanel.vue';
import VoiceWidgetStt from './components/VoiceWidgetStt.vue';

if (import.meta.env.DEV) useDevTools();
const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

const router = useRouter();
const { products, stats, addProduct, editProduct, deleteProduct, getProduct } = useProducts();
const { t, format, currentLocale, getProductName, getProductDescription } = useI18n();

// Navigation tool with dynamic description
useNavigationTool(({ url }) => router.push(url), {
  description: t.value.nav.routesDescription,
});

// Role context - dynamic getter evaluates reactive locale and server configuration
useAgentContext(() => ({
  role: 'admin',
  description: t.value.agent.roleDescription,
  language: currentLocale.value,
  currency: t.value.common.currency,
}));

// Product CRUD tools - fully localized using active dictionary
useAgentToolResolver(
  {
    products: {
      tools: {
        get_catalog: {
          description: t.value.agent.getCatalogDesc,
          schema: z.object({}),
          risk: 'none',
          handler: async () => ({
            products: products.map(p => ({
              id: p.id,
              name: getProductName(p),
              price: `${p.price} ${t.value.common.currency}`,
              stock: p.stock,
              status: p.status,
              category: t.value.categories[p.category as CategoryKey] || p.category,
              description: getProductDescription(p),
            })),
            stats: stats.value,
          }),
        },

        add_product: {
          description: t.value.agent.addProductDesc,
          schema: z.object({
            name: z.string().min(1).describe(t.value.form.nameLabel),
            price: z.number().positive().describe(t.value.form.priceLabel),
            stock: z.number().int().min(0).describe(t.value.form.stockLabel),
            category: z.enum(CATEGORIES).describe(t.value.form.categoryLabel),
            description: z.string().describe(t.value.form.descriptionLabel),
            status: z.enum(['active', 'draft', 'archived']).default('draft').describe(t.value.form.statusLabel),
          }),
          risk: 'low',
          handler: async (args) => {
            const product = addProduct(args);
            router.push('/products');
            return {
              success: true,
              message: format(t.value.agent.productCreatedMsg, { name: product.name, id: product.id }),
              product,
            };
          },
        },

        edit_product: {
          description: t.value.agent.editProductDesc,
          schema: z.object({
            id: z.string().describe(t.value.agent.editIdParamDesc),
            name: z.string().optional().describe(t.value.form.nameLabel),
            price: z.number().positive().optional().describe(t.value.form.priceLabel),
            stock: z.number().int().min(0).optional().describe(t.value.form.stockLabel),
            category: z.enum(CATEGORIES).optional().describe(t.value.form.categoryLabel),
            description: z.string().optional().describe(t.value.form.descriptionLabel),
            status: z.enum(['active', 'draft', 'archived']).optional().describe(t.value.form.statusLabel),
          }),
          risk: 'low',
          handler: async ({ id, ...updates }) => {
            const product = editProduct(id, updates);
            if (!product) return { success: false, error: format(t.value.agent.productNotFoundMsg, { id }) };
            return { success: true, message: format(t.value.agent.productUpdatedMsg, { name: product.name }), product };
          },
        },

        delete_product: {
          description: t.value.agent.deleteProductDesc,
          schema: z.object({
            id: z.string().describe(t.value.agent.deleteIdParamDesc),
          }),
          risk: 'high',
          handler: async ({ id }) => {
            const product = getProduct(id);
            if (!product) return { success: false, error: format(t.value.agent.productNotFoundMsg, { id }) };
            const ok = deleteProduct(id);
            return ok
              ? { success: true, message: format(t.value.agent.productDeletedMsg, { name: product.name }) }
              : { success: false, error: t.value.agent.deleteFailedMsg };
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
    <AgentPanel v-if="!USE_DEFAULT_WIDGET" />
    <VoiceWidgetStt v-if="!USE_DEFAULT_WIDGET" />
  </div>
</template>
