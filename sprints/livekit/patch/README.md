# LiveKit - Track de correction provider-neutral

Date : 2026-07-17  
Statut : **planifie, execution bloquee par les fondations communes**

## Finalite

Corriger `@domos/adapter-livekit` pour que LiveKit reste un runtime media et
Agents optionnel, sans devenir le centre de DomOS et sans imposer Gemini. La
valeur produit reste le Neural-DOM Binding : le serveur expose uniquement les
tools effectivement montes, puis renvoie leur execution au client DomOS.

## Decision d'architecture

L'API publique cible reste compatible avec la composition actuelle du serveur :

```ts
const server = new DomOSServer({
  llm,
  live: new LiveKitLiveAdapter({
    engine: {
      kind: 'realtime',
      model: openAIRealtime,
    },
  }),
});
```

- `LiveKitLiveAdapter` est l'unique facade LiveKit recommandee.
- Le chemin texte DomOS continue d'exister et sert de fallback produit.
- LiveKit possede la Room, l'`AgentSession`, le moteur vocal et leur cleanup.
- `pipeline` compose STT, LLM et TTS ; `realtime` utilise un modele speech-to-speech.
- Un registry choisit explicitement un binding LiveKit Inference, plugin direct
  ou bridge DomOS. Une combinaison inconnue echoue avant la creation de session.
- `GeminiLiveAdapter` devient un shim de migration ou un binding interne ;
  Gemini ne definit plus la configuration generale du package.
- Les contrats `STTService` et `TTSService` actuels sont conserves pendant la
  migration. Un renommage futur doit rester additif et justifie par les contrats
  communs, pas par LiveKit.
- Core et server ne doivent jamais importer LiveKit.

La spec externe propose parfois une union publique stricte `pipeline | live` et
une facade `DomOSAgent`. Elle n'est pas reprise telle quelle : dans le code reel,
`DomosAgent` est un objet de memoire/session et DomOS doit pouvoir conserver un
LLM texte avec une voie live optionnelle.

## Dependances obligatoires

Ce track ne peut entrer en implementation que lorsque :

- le contrat de compatibilite ADTP est valide ;
- le lifecycle vocal serveur est stabilise ;
- les contrats media/audio ont rejoint core ;
- OpenAI ou Deepgram a valide les contrats sans LiveKit ;
- le porteur du produit autorise explicitement la reprise.

## Ordre des sprints

| Sprint | Resultat |
| --- | --- |
| `SPRINT-LK-P00-contract-and-public-surface.md` | Caracteriser l'existant et poser `LiveKitLiveAdapter` |
| `SPRINT-LK-P01-engine-bridge-registry.md` | Rendre pipeline/realtime et les providers composables |
| `SPRINT-LK-P02-session-tool-lifecycle.md` | Unifier Room, AgentSession, tools, HITL et interruption |
| `SPRINT-LK-P03-token-client-media-security.md` | Fermer la frontiere token et raccorder les SDK media |
| `SPRINT-LK-P04-studio-catalog-resolution.md` | Configurer et observer LiveKit depuis le dashboard |
| `SPRINT-LK-P05-conformance-docs-migration.md` | Verrouiller tests, migration, docs et publication |

Un seul sprint est implemente a la fois. Son fichier `progress/**` contient son
DoD, les decisions prises, les preuves et la prochaine etape persistante.

## Sources normatives

- Spec produit locale :
  `C:\Users\BorisBob\Downloads\dmos_roadmap\DOMOS_VOICE_ADAPTERS_DEEPGRAM_LIVEKIT_SPEC\DOMOS_VOICE_ADAPTERS_DEEPGRAM_LIVEKIT_SPEC`
- LiveKit Agents : https://docs.livekit.io/agents/
- AgentSession : https://docs.livekit.io/agents/logic/sessions/
- LiveKit Inference : https://docs.livekit.io/agents/models/inference/
- Modeles realtime : https://docs.livekit.io/agents/models/realtime/

## Hors scope du track

- JSON-RPC ou RPC LiveKit comme protocole public DomOS ;
- execution directe des tools UI par LiveKit ;
- remplacement d'ADTP par LiveKit Data/RPC ;
- telephonie, SIP ou video avant conformite du socle vocal ;
- suppression immediate des exports historiques sans periode de migration.

## Commit documentaire attendu

`docs(sprints): plan livekit provider-neutral correction track`
