<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProducts } from '../store/products';
import { useI18n, type CategoryKey } from '../i18n';
import { OwlLayerTool } from '@owllayer/vue';

const router = useRouter();
const { products, stats, deleteProduct } = useProducts();
const { t, format, formatCurrency, getProductName, getProductDescription } = useI18n();

const search = ref('');
const categoryFilter = ref('');

const filtered = computed(() => {
  return products.filter(p => {
    const locName = getProductName(p).toLowerCase();
    const locDesc = getProductDescription(p).toLowerCase();
    const q = search.value.toLowerCase();
    const matchSearch = !q || locName.includes(q) || locDesc.includes(q) || p.name.toLowerCase().includes(q);
    const matchCat = !categoryFilter.value || p.category === categoryFilter.value;
    return matchSearch && matchCat;
  });
});

const categories = computed(() => [...new Set(products.map(p => p.category))]);

function confirmDelete(id: string, name: string) {
  if (confirm(format(t.value.catalog.confirmDelete, { name }))) {
    deleteProduct(id);
  }
}

function stockClass(stock: number) {
  if (stock === 0) return 'text-red-400';
  if (stock < 10) return 'text-amber-400';
  return 'text-green-400';
}

function statusClass(status: string) {
  switch (status) {
    case 'active': return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'draft': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'archived': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return '';
  }
}

const statusLabel = computed(() => ({
  active: t.value.status.active,
  draft: t.value.status.draft,
  archived: t.value.status.archived,
}));
</script>

<template>
  <div class="px-8 py-6 max-w-6xl">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">{{ t.catalog.title }}</h1>
        <p class="text-slate-400 text-sm mt-1">
          {{ format(t.catalog.subtitle, { total: stats.total, value: formatCurrency(stats.totalValue) }) }}
        </p>
      </div>
      <!-- ① OwlLayerTool — same button activated by human click OR admin AI agent -->
      <OwlLayerTool
        name="go_to_add_product"
        :description="t.agent.goToAddProductDesc"
        action="click"
      >
        <RouterLink
          to="/products/add"
          class="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span class="text-base leading-none">+</span> {{ t.catalog.addProductBtn }}
        </RouterLink>
      </OwlLayerTool>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wide">{{ t.catalog.total }}</p>
        <p class="text-2xl font-bold text-white mt-1">{{ stats.total }}</p>
      </div>
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wide">{{ t.catalog.active }}</p>
        <p class="text-2xl font-bold text-green-400 mt-1">{{ stats.active }}</p>
      </div>
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wide">{{ t.catalog.lowStock }}</p>
        <p class="text-2xl font-bold text-amber-400 mt-1">{{ stats.lowStock }}</p>
      </div>
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <p class="text-slate-400 text-xs font-medium uppercase tracking-wide">{{ t.catalog.outOfStock }}</p>
        <p class="text-2xl font-bold text-red-400 mt-1">{{ stats.outOfStock }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4">
      <input
        v-model="search"
        type="text"
        :placeholder="t.catalog.searchPlaceholder"
        class="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-violet-500 w-60"
      />
      <select
        v-model="categoryFilter"
        class="bg-slate-800 border border-slate-700 text-sm text-slate-300 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value="">{{ t.catalog.allCategories }}</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ t.categories[cat as CategoryKey] || cat }}</option>
      </select>
      <span class="text-slate-500 text-sm ml-auto">{{ format(t.catalog.resultsCount, { count: filtered.length }) }}</span>
    </div>

    <!-- Table -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-700/60">
            <th class="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thProduct }}</th>
            <th class="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thCategory }}</th>
            <th class="text-right text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thPrice }}</th>
            <th class="text-right text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thStock }}</th>
            <th class="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thStatus }}</th>
            <th class="text-left text-slate-400 font-medium px-4 py-3 text-xs uppercase tracking-wide">{{ t.catalog.thId }}</th>
            <th class="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in filtered"
            :key="product.id"
            class="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors"
          >
            <td class="px-4 py-3">
              <div>
                <p class="text-white font-medium">{{ getProductName(product) }}</p>
                <p class="text-slate-500 text-xs mt-0.5 truncate max-w-xs">{{ getProductDescription(product) }}</p>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-300">{{ t.categories[product.category as CategoryKey] || product.category }}</td>
            <td class="px-4 py-3 text-right text-white font-medium">{{ formatCurrency(product.price) }}</td>
            <td class="px-4 py-3 text-right font-semibold" :class="stockClass(product.stock)">
              {{ product.stock === 0 ? t.catalog.outOfStockAlert : product.stock }}
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border"
                :class="statusClass(product.status)"
              >
                {{ statusLabel[product.status] }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500 text-xs font-mono">{{ product.id }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <RouterLink
                  :to="`/products/edit/${product.id}`"
                  class="text-slate-400 hover:text-violet-400 transition-colors"
                  :title="t.common.edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </RouterLink>
                <button
                  @click="confirmDelete(product.id, getProductName(product))"
                  class="text-slate-400 hover:text-red-400 transition-colors"
                  :title="t.common.delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="px-4 py-10 text-center text-slate-500 text-sm">
              {{ t.catalog.noProducts }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Voice hint -->
    <p class="mt-4 text-slate-600 text-xs text-center">
      {{ t.agent.voiceHint }}
    </p>
  </div>
</template>
