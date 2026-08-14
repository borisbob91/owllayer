import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ADTP_VERSION,
  AITP_VERSION,
  MessageType,
  Messages,
} from '../src/index.js';
import type {
  ADTPMessage,
  ADTPMessageMeta,
  AITPMessage,
  AITPMessageMeta,
} from '../src/index.js';

describe('AITP public aliases', () => {
  it('keeps the AITP version equal to the ADTP compatibility value', () => {
    expect(AITP_VERSION).toBe(ADTP_VERSION);
  });

  it('keeps AITP message types compatible with ADTP types', () => {
    expectTypeOf<AITPMessage>().toEqualTypeOf<ADTPMessage>();
    expectTypeOf<AITPMessageMeta>().toEqualTypeOf<ADTPMessageMeta>();

    const adtpMessage: ADTPMessage = Messages.userInputText('compatibility');
    const aitpMessage: AITPMessage = adtpMessage;
    const aitpMeta: AITPMessageMeta = { sessionId: 'session-1' };
    const adtpMeta: ADTPMessageMeta = aitpMeta;

    expect(aitpMessage.type).toBe(MessageType.USER_INPUT);
    expect(adtpMeta.sessionId).toBe('session-1');
  });
});
