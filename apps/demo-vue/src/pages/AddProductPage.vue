<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProducts, CATEGORIES } from '../store/products';
import type { Category } from '../store/products';

const props = defineProps<{ id?: string }>();
const router = useRouter();
const { addProduct, editProduct, getProduct } = useProducts();

const isEditing = computed(() => !!props.id);
const pageTitle = computed(() => isEditing.value ? 'Modifier le produit' : 'Nouveau produit');

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
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category as Category,
        description: product.description,
        status: product.status,
      };
    } else {
      router.replace('/products');
    }
  }
});

function validate(): boolean {
  errors.value = {};
  if (!form.value.name.trim()) errors.value.name = 'Le nom est requis.';
  if (!form.value.price || Number(form.value.price) <= 0) errors.value.price = 'Prix invalide.';
  if (form.value.stock === '' || Number(form.value.stock) < 0) errors.value.stock = 'Stock invalide.';
  if (!form.value.description.trim()) errors.value.description = 'La description est requise.';
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
          {{ isEditing ? `ID : ${props.id}` : 'Remplissez le formulaire ou dictez à l\'assistant vocal.' }}
        </p>
      </div>
    </div>

    <!-- Form card -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-5">

      <!-- Nom -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">Nom du produit <span class="text-red-400">*</span></label>
        <input
          v-model="form.name"
          type="text"
          placeholder="ex : Casque BT Pro 2"
          class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
          :class="errors.name ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
        />
        <p v-if="errors.name" class="text-red-400 text-xs mt-1">{{ errors.name }}</p>
      </div>

      <!-- Prix + Stock -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">Prix (€) <span class="text-red-400">*</span></label>
          <input
            v-model="form.price"
            type="number"
            min="0"
            step="0.01"
            placeholder="ex : 149.99"
            class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
            :class="errors.price ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
          />
          <p v-if="errors.price" class="text-red-400 text-xs mt-1">{{ errors.price }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">Stock <span class="text-red-400">*</span></label>
          <input
            v-model="form.stock"
            type="number"
            min="0"
            step="1"
            placeholder="ex : 50"
            class="w-full bg-slate-900/80 border text-white placeholder-slate-600 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 transition"
            :class="errors.stock ? 'border-red-500/70 focus:ring-red-500/40' : 'border-slate-700 focus:ring-violet-500 focus:border-violet-500/50'"
          />
          <p v-if="errors.stock" class="text-red-400 text-xs mt-1">{{ errors.stock }}</p>
        </div>
      </div>

      <!-- Catégorie + Statut -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">Catégorie</label>
          <select
            v-model="form.category"
            class="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1.5">Statut</label>
          <select
            v-model="form.status"
            class="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="active">Actif (en vente)</option>
            <option value="draft">Brouillon</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-1.5">Description <span class="text-red-400">*</span></label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="ex : Casque Bluetooth premium avec réduction de bruit active…"
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
          {{ isEditing ? 'Enregistrer les modifications' : 'Créer le produit' }}
        </button>
        <RouterLink
          to="/products"
          class="px-4 py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm rounded-lg transition-colors"
        >
          Annuler
        </RouterLink>
      </div>
    </div>

    <!-- Voice hint -->
    <p class="mt-4 text-slate-600 text-xs text-center">
      💡 Vous pouvez aussi demander à l'assistant : "Ajoute un clavier Logitech à 89€, stock 40, catégorie Périphériques"
    </p>
  </div>
</template>
