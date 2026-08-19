# OwlLayer Documentation Site

Ce répertoire (`apps/docs-site`) contient le site de documentation officiel de OwlLayer. Il est construit avec [Starlight](https://starlight.astro.build/), un framework de documentation puissant basé sur Astro.

Cette approche nous permet de créer une documentation technique de qualité "Entreprise" (thème sombre/clair natif, recherche rapide, i18n, composants interactifs) tout en écrivant de simples fichiers Markdown.

---

## 🚀 Comment lancer la doc en local ?

Depuis la racine du monorepo :

```bash
pnpm --filter @owllayer/docs-site dev
```

Le site sera accessible sur [http://localhost:4321/](http://localhost:4321/).

---

## ✍️ Comment faire évoluer la documentation ?

### 1. Ajouter ou modifier une page
Toute la documentation réside dans le dossier `src/content/docs/`. 
Actuellement, le français est la langue racine, donc ses fichiers sont directement dans `src/content/docs/`.

Vous pouvez écrire en **Markdown classique (`.md`)** ou en **MDX (`.mdx`)** si vous souhaitez intégrer des composants interactifs.

**Format d'une page :**
Chaque page doit commencer par un bloc de métadonnées (Frontmatter) :

```yaml
---
title: Mon Nouveau Chapitre
description: Une brève description pour le SEO et l'aperçu.
---

## Bienvenue
Voici le contenu de ma page...
```

### 2. Ajouter la page au menu de navigation (Sidebar)
Une fois votre page créée (ex: `src/content/docs/mon-chapitre.md`), vous devez l'ajouter au menu latéral de gauche pour qu'elle soit visible.

Ouvrez le fichier `astro.config.mjs` à la racine de `apps/docs-site` et ajoutez l'entrée dans le tableau `sidebar` :

```javascript
sidebar: [
  {
    label: 'Commencer',
    items: [
      { label: 'Introduction', slug: '' },
      // ... autres pages
      { label: 'Mon Chapitre', slug: 'mon-chapitre' }, // <- Ajout ici (sans le .md)
    ],
  },
]
```

### 3. Utiliser les composants Starlight (MDX)
La force de Starlight est de pouvoir intégrer des composants UI directement dans le Markdown.
*Note : Votre fichier doit avoir l'extension `.mdx` pour que cela fonctionne.*

#### Afficher une arborescence de fichiers
```mdx
import { FileTree } from '@astrojs/starlight/components';

<FileTree>
- apps/
  - dashboard/
  - server/
</FileTree>
```

#### Ajouter des encarts d'avertissement ou de conseil
Starlight utilise une syntaxe Markdown étendue pour ça :
```markdown
:::tip[Astuce]
Ceci est une astuce pour gagner du temps.
:::

:::danger[Attention]
Ne supprimez jamais ce dossier.
:::
```

#### Créer des onglets (Tabs)
Très utile pour montrer le code React vs Angular !
```mdx
import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
  <TabItem label="React">
    ```tsx
    import { OwlLayerWidget } from '@owllayer/react';
    ```
  </TabItem>
  <TabItem label="Angular">
    ```ts
    import { OwlLayerWidgetComponent } from '@owllayer/angular';
    ```
  </TabItem>
</Tabs>
```

### 4. Gérer les images et les assets
Placez vos images dans le dossier `src/assets/` (par exemple `src/assets/docs/` pour les illustrations de guides).
Pour les inclure dans une page MD/MDX, utilisez un chemin relatif classique :

```markdown
![Légende de l'image](../../assets/docs/mon-image.png)
```
Astro se chargera automatiquement d'optimiser, compresser et redimensionner l'image pour le web lors du build.

### 5. Multilinguisme (i18n)
Le site est configuré pour supporter plusieurs langues. Le français est la locale `root` et reste directement dans `src/content/docs/`.
Pour ajouter l'anglais :
1. Créez un dossier `src/content/docs/en/`.
2. Traduisez vos fichiers avec les mêmes noms (ex: `src/content/docs/en/getting-started.md`).
3. Astro gérera automatiquement le sélecteur de langue en haut à droite du site !
