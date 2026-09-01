<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProducts, CATEGORIES } from '../store/products';
import { useI18n, type CategoryKey } from '../i18n';
import type { Category } from '../store/products';

const props = defineProps<{ id?: string }>();
const router = useRouter();
const { addProduct, editProduct, getProduct } = useProducts();
const { t, format, getProductName, getProductDescription } = useI18n();

const isEditing = computed(() => !!props.id);
const pageTitle = computed(() => isEditing.value ? t.value.form.editTitle : t.value.form.newTitle);

const form = ref({
  name: '',
  price: '' as string | number,
  stock: '' as string | number,
  category: CATEGORIES[0] as Category,
  description: '',
  status: 'draft' as 'active' | 'draft' | 'archived',
});

const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});

onMounted(() => {
  if (props.id) {
    const product = getProduct(props.id);
    if (product) {
      form.value = {
        name: getProductName(product),
        price: product.price,
        stock: product.stock,
        category: product.category as Category,
        description: getProductDescription(product),
        status: product.status,
      };
    } else {
      router.replace('/products');
    }
  }
});

function validate(): boolean {
  errors.value = {};
  if (!form.value.name.trim()) errors.value.name = t.value.form.nameRequired;
  if (!form.value.price || Number(form.value.price) <= 0) errors.value.price = t.value.form.priceInvalid;
  if (form.value.stock === '' || Number(form.value.stock) < 0) errors.value.stock = t.value.form.stockInvalid;
  if (!form.value.description.trim()) errors.value.description = t.value.form.descriptionRequired;
  return Object.keys(errors.value).length === 0;
}

function submit() {
  if (!validate()) return;
  const data = {
    name: form.value.name.trim(),
    price: Number(form.value.price),
    stock: Number(form.value.stock),
    category: form.value.category,
    description: form.value.description.trim(),
    status: form.value.status,
  };

  if (isEditing.value && props.id) {
    editProduct(props.id, data);
  } else {
    addProduct(data);
  }
  router.push('/products');
}
</script>

<template>
  <div class="px-8 py-6 max-w-2xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/products" class="text-slate-400 hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <div>
        <h1 class="text-2xl font-bold text-white">{{ pageTitle }}</h1>
        <p class="text-slate-400 text-sm mt-0.5">
          {{ isEditing ? format(t.form.editSubtitle, { id: props.id }) : t.form.newSubtitle }}
        </p>
      </div>
    </div>

    <!-- Form card -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-5">

      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.nameLabel }} <span class="text-red-400">*</span></label>
        <input
          v-model="form.name"
          type="text"
          :placeholder="t.form.namePlaceholder"
          class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
          :class="errors.name ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
        />
        <p v-if="errors.name" class="text-red-400 text-xs mt-1">{{ errors.name }}</p>
      </div>

      <!-- Price + Stock -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.priceLabel }} ({{ t.common.currencySymbol }}) <span class="text-red-400">*</span></label>
          <input
            v-model="form.price"
            type="number"
            min="0"
            step="0.01"
            :placeholder="t.form.pricePlaceholder"
            class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
            :class="errors.price ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
          />
          <p v-if="errors.price" class="text-red-400 text-xs mt-1">{{ errors.price }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.stockLabel }} <span class="text-red-400">*</span></label>
          <input
            v-model="form.stock"
            type="number"
            min="0"
            step="1"
            :placeholder="t.form.stockPlaceholder"
            class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
            :class="errors.stock ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
          />
          <p v-if="errors.stock" class="text-red-400 text-xs mt-1">{{ errors.stock }}</p>
        </div>
      </div>

      <!-- Category + Status -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.categoryLabel }}</label>
          <select
            v-model="form.category"
            class="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ t.categories[cat as CategoryKey] || cat }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.statusLabel }}</label>
          <select
            v-model="form.status"
            class="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="active">{{ t.status.active }}</option>
            <option value="draft">{{ t.status.draft }}</option>
            <option value="archived">{{ t.status.archived }}</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">{{ t.form.descriptionLabel }} <span class="text-red-400">*</span></label>
        <textarea
          v-model="form.description"
          rows="3"
          :placeholder="t.form.descriptionPlaceholder"
          class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition resize-none"
          :class="errors.description ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
        />
        <p v-if="errors.description" class="text-red-400 text-xs mt-1">{{ errors.description }}</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-2">
        <button
          @click="submit"
          class="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg transition-colors"
        >
          {{ isEditing ? t.common.save : t.common.create }}
        </button>
        <RouterLink
          to="/products"
          class="px-4 py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm rounded-lg transition-colors"
        >
          {{ t.common.cancel }}
        </RouterLink>
      </div>
    </div>

    <!-- Voice hint -->
    <p class="mt-4 text-slate-600 text-xs text-center">
      {{ t.agent.voiceHintForm }}
    </p>
  </div>
</template>
