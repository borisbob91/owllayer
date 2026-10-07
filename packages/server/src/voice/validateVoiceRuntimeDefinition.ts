/**
 * Definition serialisable d'un runtime vocal, independante des instances de provider —
 * reutilisable par le registre et le Studio (voir contracts/server-voice-pipeline.md).
 */
export interface VoiceRuntimeDefinitionInput {
  mode: 'pipeline' | 'realtime';
  stt?: unknown;
  tts?: unknown;
  live?: unknown;
}

export type VoiceRuntimeValidation =
  | { valid: true }
  | {
      valid: false;
      code: 'VOICE_MODE_CONFLICT' | 'VOICE_PIPELINE_INCOMPLETE' | 'VOICE_REALTIME_INCOMPLETE';
      missing?: ('stt' | 'tts' | 'live')[];
    };

/**
 * Valide une definition de runtime vocal : un seul mode a la fois (`pipeline` xor `realtime`),
 * et toutes les parts requises par le mode choisi.
 *
 * Fonction pure, sans import de provider — ne remplace pas la precedence historique de
 * `OwlLayerServer` (constructeur inchange, `live` reste prioritaire — voir R8 de research.md).
 */
export function validateVoiceRuntimeDefinition(
  definition: VoiceRuntimeDefinitionInput
): VoiceRuntimeValidation {
  const hasLive = definition.live !== undefined && definition.live !== null;

  if (definition.mode === 'pipeline') {
    if (hasLive) {
      return { valid: false, code: 'VOICE_MODE_CONFLICT' };
    }
    const missing: ('stt' | 'tts')[] = [];
    if (definition.stt === undefined || definition.stt === null) missing.push('stt');
    if (definition.tts === undefined || definition.tts === null) missing.push('tts');
    if (missing.length > 0) {
      return { valid: false, code: 'VOICE_PIPELINE_INCOMPLETE', missing };
    }
    return { valid: true };
  }

  // mode === 'realtime'
  const hasStt = definition.stt !== undefined && definition.stt !== null;
  const hasTts = definition.tts !== undefined && definition.tts !== null;
  if (hasStt || hasTts) {
    return { valid: false, code: 'VOICE_MODE_CONFLICT' };
  }
  if (!hasLive) {
    return { valid: false, code: 'VOICE_REALTIME_INCOMPLETE', missing: ['live'] };
  }
  return { valid: true };
}
