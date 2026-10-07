import { assertType, expectTypeOf, test } from 'vitest';
import type {
  LiveSessionConfig,
  SpeechStreamState,
  STTService,
  STTTurnEvent,
  STTTurnStream,
  StreamingSTTService,
  StreamingTTSService,
  TTSService,
  TTSSpeechStream,
} from '../src/index.js';

// ============================================================
// Verification de type pure (T009X/#109, correction d'audit mutation C06) :
// ce fichier n'est JAMAIS execute a l'execution (aucun `it`/`expect`
// runtime) — il est verifie par `tsc` (script `pretest`, voir
// `tsconfig.typecheck.json`). Contrairement aux assertions `const x: T = {...}`
// dans `voice.streaming.test.ts`, une regression de type ici (ex.
// `conversationHistory` rendu obligatoire) fait echouer `pnpm test`.
// ============================================================

// ------------------------------------------------------------
// LiveSessionConfig : les deux nouveaux champs restent optionnels.
// ------------------------------------------------------------

test('LiveSessionConfig sans conversationHistory/onToolCallCancelled reste assignable', () => {
  assertType<LiveSessionConfig>({
    systemPrompt: 'Tu es un assistant vocal.',
    tools: [],
  });
});

test('LiveSessionConfig avec conversationHistory/onToolCallCancelled reste assignable', () => {
  assertType<LiveSessionConfig>({
    systemPrompt: 'Tu es un assistant vocal.',
    tools: [],
    conversationHistory: [{ role: 'user', content: 'salut' }],
    onToolCallCancelled: (_callIds: string[]) => {},
  });
});

// ------------------------------------------------------------
// STTTurnEvent : exactement les sept variantes documentees.
// ------------------------------------------------------------

test("STTTurnEvent['type'] vaut exactement les sept litteraux documentes", () => {
  expectTypeOf<STTTurnEvent['type']>().toEqualTypeOf<
    | 'turn.started'
    | 'transcript.partial'
    | 'turn.tentative_end'
    | 'turn.resumed'
    | 'turn.ended'
    | 'stream.error'
    | 'stream.closed'
  >();
});

// ------------------------------------------------------------
// Les contrats streaming et batch restent independants (additifs, pas de
// sous-typage implicite dans un sens ou dans l'autre).
// ------------------------------------------------------------

test('StreamingSTTService et STTService ne sont pas assignables l un a l autre', () => {
  expectTypeOf<StreamingSTTService>().not.toMatchTypeOf<STTService>();
  expectTypeOf<STTService>().not.toMatchTypeOf<StreamingSTTService>();
});

test('StreamingTTSService et TTSService ne sont pas assignables l un a l autre', () => {
  expectTypeOf<StreamingTTSService>().not.toMatchTypeOf<TTSService>();
  expectTypeOf<TTSService>().not.toMatchTypeOf<StreamingTTSService>();
});

// ------------------------------------------------------------
// Forme exacte des flux actifs.
// ------------------------------------------------------------

test('STTTurnStream expose sendAudio, endAudioTurn, close, et un state en lecture seule', () => {
  expectTypeOf<STTTurnStream>().toHaveProperty('sendAudio');
  expectTypeOf<STTTurnStream>().toHaveProperty('endAudioTurn');
  expectTypeOf<STTTurnStream>().toHaveProperty('close');
  expectTypeOf<STTTurnStream>().toHaveProperty('state');
  expectTypeOf<STTTurnStream['sendAudio']>().toEqualTypeOf<(audioBase64: string) => void>();
  expectTypeOf<STTTurnStream['endAudioTurn']>().toEqualTypeOf<() => Promise<void>>();
  expectTypeOf<STTTurnStream['close']>().toEqualTypeOf<() => Promise<void>>();
  expectTypeOf<STTTurnStream['state']>().toEqualTypeOf<SpeechStreamState>();

  const stream = {} as STTTurnStream;
  // @ts-expect-error `state` est en lecture seule (readonly).
  stream.state = 'ready';
});

test('TTSSpeechStream expose appendText, flush, interrupt, close', () => {
  expectTypeOf<TTSSpeechStream>().toHaveProperty('appendText');
  expectTypeOf<TTSSpeechStream>().toHaveProperty('flush');
  expectTypeOf<TTSSpeechStream>().toHaveProperty('interrupt');
  expectTypeOf<TTSSpeechStream>().toHaveProperty('close');
  expectTypeOf<TTSSpeechStream['appendText']>().toEqualTypeOf<(text: string) => void>();
  expectTypeOf<TTSSpeechStream['flush']>().toEqualTypeOf<() => Promise<void>>();
  expectTypeOf<TTSSpeechStream['interrupt']>().toEqualTypeOf<() => Promise<void>>();
  expectTypeOf<TTSSpeechStream['close']>().toEqualTypeOf<() => Promise<void>>();
});
