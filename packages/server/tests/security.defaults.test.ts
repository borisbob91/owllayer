import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminAuthManager } from '../src/auth/AdminAuthManager.js';
import { validateToolArgs } from '../src/core/validateToolArgs.js';
import { makeServer } from './helpers/securityServer.js';

describe('Mot de passe admin', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = env; });

  it('signale les mots de passe courts ou publics', () => {
    expect(AdminAuthManager.checkPasswordStrength('adminpassword123')).toMatch(/publicly known/);
    expect(AdminAuthManager.checkPasswordStrength('short')).toMatch(/12 characters/);
    expect(AdminAuthManager.checkPasswordStrength('a-long-and-unique-passphrase')).toBeNull();
  });

  it('refuse de demarrer en production avec un mot de passe faible', () => {
    process.env.NODE_ENV = 'production';
    expect(() => new AdminAuthManager({ username: 'admin', password: 'adminpassword123' })).toThrow(/rejected/);
  });
});

describe('Validation des arguments des tools serveur', () => {
  const parameters = {
    type: 'OBJECT' as const,
    properties: {
      orderId: { type: 'STRING' as const },
      amount: { type: 'NUMBER' as const },
      mode: { type: 'STRING' as const, enum: ['full', 'partial'] },
    },
    required: ['orderId'],
  };

  it('detecte un argument manquant, de mauvais type ou hors enum', () => {
    expect(validateToolArgs(parameters, {})).toMatch(/orderId is required/);
    expect(validateToolArgs(parameters, { orderId: 'o_1', amount: '10' })).toMatch(/amount must be a number/);
    expect(validateToolArgs(parameters, { orderId: 'o_1', mode: 'all' })).toMatch(/one of full, partial/);
    expect(validateToolArgs(parameters, { orderId: 'o_1', amount: 10, mode: 'full' })).toBeNull();
  });

  it('n appelle pas le handler quand les arguments sont invalides', async () => {
    const { server } = makeServer();
    const handler = vi.fn();
    server.tool('refund', { description: 'Refund', risk: 'none', parameters }, handler);
    const router = (server as any).toolRouter;

    await expect(router.runServerTool('call_1', 'refund', { orderId: 42 })).rejects.toThrow(/invalid arguments/);
    expect(handler).not.toHaveBeenCalled();
  });
});
