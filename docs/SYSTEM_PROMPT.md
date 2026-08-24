# SystemPromptConfig — System Prompt Structure

OwlLayer supporte deux formats de system prompt : un **string brut** (compatible existant) ou un **objet structure** `SystemPromptConfig` qui se compile automatiquement.

## Usage

### String classique (toujours supporte)

```ts
const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    systemPrompt: 'Tu es un assistant shopping...',
  }),
});
```

### Config structuree

```ts
import { type SystemPromptConfig } from '@owllayer/core';

const prompt: SystemPromptConfig = {
  name: 'Alex',
  language: 'fr',
  role: 'Tu es Alex, un assistant shopping expert pour notre boutique e-commerce.',
  personality: 'Tu es amical, professionnel et concis. Tu tutoies le client.',
  capabilities: [
    'Chercher des produits dans le catalogue',
    'Ajouter/retirer des articles du panier',
    'Repondre aux questions sur les produits',
    'Guider l\'utilisateur dans son parcours d\'achat',
  ],
  rules: [
    'Ne jamais inventer de produit qui n\'existe pas',
    'Toujours confirmer avant une action critique (paiement, suppression)',
    'Repondre dans la langue du client',
    'Ne pas partager de prix si non disponible',
  ],
  context: () => `Date: ${new Date().toLocaleDateString('fr-FR')}`,
  toolInstructions: 'Utilise les tools disponibles pour manipuler l\'interface.',
  responseFormat: 'Reponses courtes (2-3 phrases max). Utilise les tools quand possible.',
  sections: {
    'TON': 'Professionnel mais accessible. Pas de jargon technique.',
    'INTERDICTIONS': [
      'Ne jamais mentionner que tu es une IA',
      'Ne pas proposer de produits concurrents',
    ],
  },
};

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    systemPrompt: prompt,
  }),
});
```

## Interface

```ts
interface SystemPromptConfig {
  name?: string;              // Nom de l'agent ("Alex")
  language?: string;          // Langue ("fr", "en")
  role: string;               // Role principal (requis)
  personality?: string;       // Ton et personnalite
  capabilities?: string[];    // Liste de capacites
  rules?: string[];           // Regles strictes
  context?: string | (() => string); // Contexte dynamique
  toolInstructions?: string;  // Instructions pour les tools
  responseFormat?: string;    // Format de reponse attendu
  sections?: Record<string, string | string[]>; // Sections custom
}
```

## Compilation

Le `SystemPromptConfig` est automatiquement compile en string structure :

```
[CONTEXTE]
Langue: fr
Date: 09/02/2026

[NOM]
Ton nom est Alex.

[ROLE]
Tu es Alex, un assistant shopping expert...

[PERSONNALITE]
Tu es amical, professionnel et concis...

[CAPACITES]
- Chercher des produits dans le catalogue
- Ajouter/retirer des articles du panier
...

[REGLES]
- Ne jamais inventer de produit qui n'existe pas
...

[TOOLS]
Utilise les tools disponibles...

[FORMAT]
Reponses courtes (2-3 phrases max)...

[TON]
Professionnel mais accessible...

[INTERDICTIONS]
- Ne jamais mentionner que tu es une IA
- Ne pas proposer de produits concurrents
```

## Type union

Le type `SystemPrompt = string | SystemPromptConfig` est accepte partout ou un system prompt est attendu :

```ts
// Les deux formats fonctionnent
new GoogleAdapter({ systemPrompt: 'Tu es un assistant...' });
new GoogleAdapter({ systemPrompt: { role: 'Tu es un assistant...' } });
```

## Fonctions utilitaires

```ts
import { compileSystemPrompt, resolveSystemPrompt } from '@owllayer/core';

// Compiler un config en string
const str = compileSystemPrompt(config);

// Resoudre un SystemPrompt (string ou config) en string
const result = resolveSystemPrompt(prompt); // fonctionne avec les deux types
```
