# Feature #37 : Fournisseur LLM selectionnable dans la demo (Google, OpenAI, DeepSeek)

**Statut** : Jaune - Validee  
**Domaine** : demos (`apps/demo-server`, `apps/demo-react`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-09-26  
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/85

---

## Besoin

Tester OpenAI (Realtime GA) ou DeepSeek (API compatible OpenAI, texte seul, adresse d'API dediee) sans modifier le code du serveur de demo, et sans dupliquer une deuxieme application.

## Perimetre strict

### Ce que cette feature fait

- `apps/demo-server` : `LLM_PROVIDER=google|openai|deepseek` (defaut `google`, comportement inchange).
  - `deepseek` : `OpenAIAdapter` avec `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DEEPSEEK_THINKING` ; pas d'audio live natif, voix possible via Google STT/TTS (mode hybride) si `GOOGLE_API_KEY` est defini.
  - `openai` : `OpenAIAdapter` + `OpenAILiveAdapter` (`OPENAI_*`).
  - `deepseek.env.example` + script `dev:deepseek` (`--env-file=.env.deepseek`) : la demo DeepSeek se lance comme une demo a part, sans seconde application.
- Outil checkout renomme `fill_checkout_form` dans la page ET dans tous les prompts serveur (EN/FR).
- `apps/demo-react` : une seule UI HITL (modale, libelles traduits via #84), endpoint par defaut sur l'hote de la page + proxy WebSocket Vite `/owllayer`.

### Ce que cette feature ne fait pas

- Pas d'application `demo-server-deepseek` separee (code duplique, Dockerfile errone sur la branche de travail).
- Pas de delai artificiel apres navigation (rendu inutile par #76).
- Pas de changement des demos Vue, Svelte, Angular, Browser.

## Validation

- `@owllayer/demo-server` et `@owllayer/demo-react` : build OK.
- Demarrage verifie pour `google`, `openai` et `deepseek` (`dev:deepseek`).
- Verification manuelle avec de vraies cles.
