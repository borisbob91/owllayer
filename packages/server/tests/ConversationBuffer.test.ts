import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationBuffer } from '../src/memory/ConversationBuffer.js';

describe('ConversationBuffer', () => {
  let buffer: ConversationBuffer;

  beforeEach(() => {
    buffer = new ConversationBuffer(5);
  });

  it('ajoute des messages', () => {
    buffer.addUserMessage('Bonjour');
    buffer.addAssistantMessage('Salut !');

    expect(buffer.length).toBe(2);
    expect(buffer.getMessages()[0]).toEqual({ role: 'user', content: 'Bonjour' });
    expect(buffer.getMessages()[1]).toEqual({ role: 'assistant', content: 'Salut !' });
  });

  it('tronque au-dela de la limite', () => {
    for (let i = 0; i < 10; i++) {
      buffer.addUserMessage(`Message ${i}`);
    }

    expect(buffer.length).toBe(5);
    expect(buffer.getMessages()[0].content).toBe('Message 5');
  });

  it('preserve le message systeme initial lors du trim', () => {
    buffer.addSystemMessage('Tu es un assistant');
    for (let i = 0; i < 10; i++) {
      buffer.addUserMessage(`Message ${i}`);
    }

    const messages = buffer.getMessages();
    expect(messages[0]).toEqual({ role: 'system', content: 'Tu es un assistant' });
    expect(messages.length).toBe(5);
  });

  it('retourne les derniers messages', () => {
    buffer.addUserMessage('A');
    buffer.addUserMessage('B');
    buffer.addUserMessage('C');

    const last = buffer.getLastMessages(2);
    expect(last).toHaveLength(2);
    expect(last[0].content).toBe('B');
    expect(last[1].content).toBe('C');
  });

  it('vide l\'historique', () => {
    buffer.addUserMessage('test');
    buffer.clear();

    expect(buffer.length).toBe(0);
  });

  it('retourne une copie des messages', () => {
    buffer.addUserMessage('test');
    const messages = buffer.getMessages();
    messages.push({ role: 'user', content: 'injected' });

    expect(buffer.length).toBe(1); // L'original n'est pas modifie
  });
});
