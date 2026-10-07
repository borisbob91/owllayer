// Tests de types, verifies par `tsc` (script `pretest`) et jamais executes :
// les exemples documentes doivent compiler, les usages invalides doivent echouer.
import {
  DeepgramAuraTTS,
  DeepgramNovaSTT,
  type DeepgramFluxSTTOptions,
  type DeepgramNovaSTTOptions,
  type DeepgramVoiceAgentOptions,
} from '../src/index.js';

// Exemples du README : seuls la cle et les reglages voulus sont fournis, les defauts s'appliquent.
new DeepgramNovaSTT({ apiKey: 'key', language: 'fr' });
new DeepgramAuraTTS({ apiKey: 'key', language: 'fr' });

const flux: DeepgramFluxSTTOptions = { apiKey: 'key', language: 'fr', turnDetection: { endOfTurnThreshold: 0.75 } };
const agent: DeepgramVoiceAgentOptions = { apiKey: 'key', think: { provider: 'anthropic', model: 'claude-haiku-4-5' } };

// @ts-expect-error la cle API est obligatoire
const missingKey: DeepgramNovaSTTOptions = { language: 'fr' };

// @ts-expect-error un fournisseur hors catalogue est refuse par le type
const unknownProvider: DeepgramVoiceAgentOptions = { apiKey: 'key', think: { provider: 'unknown' } };

void flux;
void agent;
void missingKey;
void unknownProvider;
