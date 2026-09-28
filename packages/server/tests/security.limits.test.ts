import { describe, it, expect } from 'vitest';
import { PassThrough } from 'stream';
import { readBody, BodyTooLargeError } from '../src/http/readBody.js';
import { makeServer, connect, userInput, systemErrors } from './helpers/securityServer.js';

describe('Limites de taille des messages', () => {
  it('refuse un message texte trop long sans appeler le LLM', async () => {
    const { server, llm, send } = makeServer({ limits: { maxTextInputChars: 100 } });
    server.addApiKey('pk_a');
    await connect(server, 'conn_1', 'pk_a');

    await (server as any).handleMessage('conn_1', userInput('x'.repeat(101)));

    expect(llm.chat).not.toHaveBeenCalled();
    expect(systemErrors(send).at(-1)?.payload.message).toMatch(/too long/);
  });

  it('refuse un CONTEXT_UPDATE avec trop de tools', async () => {
    const { server, send } = makeServer({ limits: { maxClientTools: 2 } });
    server.addApiKey('pk_a');
    const session = await connect(server, 'conn_1', 'pk_a');
    const tools = ['a', 'b', 'c'].map((name) => ({ name, description: name }));

    await (server as any).handleMessage('conn_1', {
      id: 'm1', type: 'CONTEXT_UPDATE', timestamp: Date.now(), payload: { url: '/', activeTools: tools },
    });

    expect(session.toolRegistry.getDeclarations()).toHaveLength(0);
    expect(systemErrors(send).at(-1)?.payload.message).toMatch(/Too many tools/);
  });

  it('readBody rejette un corps plus grand que la limite', async () => {
    const req = new PassThrough() as any;
    req.headers = {};
    const pending = readBody(req, 10);
    req.end('x'.repeat(11));

    await expect(pending).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});

describe('Debit et tour unique par session', () => {
  it('limite le nombre de messages utilisateur par minute et par connexion', async () => {
    const { server, llm, send } = makeServer({ rateLimit: { userInputsPerMinute: 2 } });
    server.addApiKey('pk_a');
    await connect(server, 'conn_1', 'pk_a');

    for (let i = 0; i < 3; i++) await (server as any).handleMessage('conn_1', userInput(`q${i}`));

    expect(llm.chat).toHaveBeenCalledTimes(2);
    expect(systemErrors(send).at(-1)?.payload.message).toMatch(/Too many messages/);
  });

  it('refuse un second message pendant qu un tour LLM est en cours', async () => {
    const { server, llm, send } = makeServer();
    server.addApiKey('pk_a');
    await connect(server, 'conn_1', 'pk_a');
    let release!: () => void;
    (llm.chat as any).mockImplementationOnce(() => new Promise((r) => { release = () => r({ text: 'ok' }); }));

    const first = (server as any).handleMessage('conn_1', userInput('premier'));
    await (server as any).handleMessage('conn_1', userInput('second'));
    release();
    await first;

    expect(llm.chat).toHaveBeenCalledTimes(1);
    expect(systemErrors(send).at(-1)?.payload.message).toMatch(/still answering/);
  });
});
