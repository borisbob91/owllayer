import { describe, expect, it } from 'vitest';
import { validateVoiceRuntimeDefinition } from '../src/voice/validateVoiceRuntimeDefinition.js';

describe('validateVoiceRuntimeDefinition', () => {
  it('accepts a complete pipeline definition (stt + tts, no live)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'pipeline', stt: {}, tts: {} })).toEqual({
      valid: true,
    });
  });

  it('accepts a complete realtime definition (live, no stt/tts)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'realtime', live: {} })).toEqual({
      valid: true,
    });
  });

  it('rejects a pipeline definition that also sets live (VOICE_MODE_CONFLICT, S11)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'pipeline', stt: {}, tts: {}, live: {} })).toEqual({
      valid: false,
      code: 'VOICE_MODE_CONFLICT',
    });
  });

  it('rejects a realtime definition that also sets stt (VOICE_MODE_CONFLICT)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'realtime', live: {}, stt: {} })).toEqual({
      valid: false,
      code: 'VOICE_MODE_CONFLICT',
    });
  });

  it('rejects a realtime definition that also sets tts (VOICE_MODE_CONFLICT)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'realtime', live: {}, tts: {} })).toEqual({
      valid: false,
      code: 'VOICE_MODE_CONFLICT',
    });
  });

  it('rejects an incomplete pipeline definition and names the missing part (missing tts)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'pipeline', stt: {} })).toEqual({
      valid: false,
      code: 'VOICE_PIPELINE_INCOMPLETE',
      missing: ['tts'],
    });
  });

  it('rejects an incomplete pipeline definition and names the missing part (missing stt)', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'pipeline', tts: {} })).toEqual({
      valid: false,
      code: 'VOICE_PIPELINE_INCOMPLETE',
      missing: ['stt'],
    });
  });

  it('rejects an incomplete pipeline definition and names both missing parts', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'pipeline' })).toEqual({
      valid: false,
      code: 'VOICE_PIPELINE_INCOMPLETE',
      missing: ['stt', 'tts'],
    });
  });

  it('rejects an incomplete realtime definition and names live as missing', () => {
    expect(validateVoiceRuntimeDefinition({ mode: 'realtime' })).toEqual({
      valid: false,
      code: 'VOICE_REALTIME_INCOMPLETE',
      missing: ['live'],
    });
  });

  it('treats null the same as undefined for every optional field', () => {
    expect(
      validateVoiceRuntimeDefinition({ mode: 'pipeline', stt: null, tts: {} })
    ).toEqual({ valid: false, code: 'VOICE_PIPELINE_INCOMPLETE', missing: ['stt'] });
    expect(validateVoiceRuntimeDefinition({ mode: 'realtime', live: null })).toEqual({
      valid: false,
      code: 'VOICE_REALTIME_INCOMPLETE',
      missing: ['live'],
    });
  });
});
