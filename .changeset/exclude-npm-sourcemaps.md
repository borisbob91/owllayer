---
"@owllayer/core": patch
"@owllayer/ui": patch
"@owllayer/browser": patch
"@owllayer/react": patch
"@owllayer/vue": patch
"@owllayer/svelte": patch
"@owllayer/angular": patch
"@owllayer/server": patch
"@owllayer/adapter-openai": patch
"@owllayer/adapter-google": patch
"@owllayer/adapter-anthropic": patch
"@owllayer/adapter-livekit": patch
---

Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
