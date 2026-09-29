import { describe, it, expect } from 'vitest';
import { SpeechServiceError } from '@owllayer/core';
import { getDeepgramErrorDetails, toSpeechServiceError } from '../src/errors.js';

describe('toSpeechServiceError / getDeepgramErrorDetails', () => {
  it.each([
    [400, 'INVALID_REQUEST'],
    [401, 'AUTH_FAILED'],
    [402, 'QUOTA_EXCEEDED'],
    [403, 'AUTH_FAILED'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [429, 'RATE_LIMITED'],
    [500, 'PROVIDER_UNAVAILABLE'],
    [503, 'PROVIDER_UNAVAILABLE'],
  ] as const)('maps HTTP %i to code %s', (status, expectedCode) => {
    const error = toSpeechServiceError({ kind: 'http', status });
    expect(error.provider).toBe('deepgram');
    expect(error.code).toBe(expectedCode);
    expect(error.statusCode).toBe(status);
  });

  it.each([
    [1005, 'REMOTE_CLOSED'],
    [1008, 'INVALID_REQUEST'],
    [1011, 'PROVIDER_UNAVAILABLE'],
  ] as const)('maps WS close code %i to code %s', (code, expectedCode) => {
    const error = toSpeechServiceError({ kind: 'wsClose', code });
    expect(error.code).toBe(expectedCode);
  });

  it('maps a local timeout to TIMEOUT', () => {
    const error = toSpeechServiceError({ kind: 'timeout', operation: 'open' });
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toContain('open');
  });

  it('maps a Flux ConfigureFailure to INVALID_REQUEST', () => {
    const error = toSpeechServiceError({ kind: 'configureFailure' });
    expect(error.code).toBe('INVALID_REQUEST');
  });

  it('passes through an already-qualified local error', () => {
    const error = toSpeechServiceError({ kind: 'local', code: 'AUDIO_QUEUE_FULL', message: 'queue is full' });
    expect(error.code).toBe('AUDIO_QUEUE_FULL');
    expect(error.message).toBe('queue is full');
  });

  it.each(['RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'TIMEOUT', 'REMOTE_CLOSED'] as const)(
    'flags %s as retryable',
    (code) => {
      const error = toSpeechServiceError({ kind: 'local', code, message: 'x' });
      expect(getDeepgramErrorDetails(error).retryable).toBe(true);
    },
  );

  it.each([
    'AUTH_FAILED',
    'QUOTA_EXCEEDED',
    'INVALID_REQUEST',
    'PAYLOAD_TOO_LARGE',
    'INVALID_SETTINGS',
    'UNSUPPORTED_LANGUAGE',
    'UNSUPPORTED_PROVIDER',
    'AUDIO_QUEUE_FULL',
    'TEXT_QUEUE_FULL',
  ] as const)('flags %s as not retryable', (code) => {
    const error = toSpeechServiceError({ kind: 'local', code, message: 'x' });
    expect(getDeepgramErrorDetails(error).retryable).toBe(false);
  });

  it('keeps the provider request id out of the message but reachable through getDeepgramErrorDetails', () => {
    const error = toSpeechServiceError({ kind: 'http', status: 500, requestId: 'req-123' });
    expect(error.message).not.toContain('req-123');
    expect(getDeepgramErrorDetails(error).requestId).toBe('req-123');
  });

  it('returns no requestId when none was supplied', () => {
    const error = toSpeechServiceError({ kind: 'http', status: 500 });
    expect(getDeepgramErrorDetails(error).requestId).toBeUndefined();
  });

  it('never includes a provider response body or an API key fragment in any generated message', () => {
    const secretLike = 'sk-super-secret-deepgram-key';
    const messages = [
      toSpeechServiceError({ kind: 'http', status: 401 }).message,
      toSpeechServiceError({ kind: 'wsClose', code: 1011 }).message,
      toSpeechServiceError({ kind: 'timeout', operation: 'handshake' }).message,
      toSpeechServiceError({ kind: 'configureFailure' }).message,
    ];
    for (const message of messages) {
      expect(message).not.toContain(secretLike);
      expect(message.toLowerCase()).not.toContain('authorization');
    }
  });

  it('returns retryable=false for a plain SpeechServiceError not created by this module (no requestId leak either)', () => {
    // Simule une erreur d'un autre module portant un code inconnu de ce package.
    const foreign = new SpeechServiceError('some other provider error', 'deepgram', 'SOME_OTHER_CODE');
    expect(getDeepgramErrorDetails(foreign).retryable).toBe(false);
    expect(getDeepgramErrorDetails(foreign).requestId).toBeUndefined();
  });
});
