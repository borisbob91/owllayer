import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../src/core/SessionManager.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('cree une session', () => {
    const session = manager.create('conn_1', 'pk_test');

    expect(session.id).toContain('sess_');
    expect(session.connId).toBe('conn_1');
    expect(session.apiKey).toBe('pk_test');
    expect(session.state).toBe('handshake');
    expect(manager.size).toBe(1);
  });

  it('active une session', () => {
    const session = manager.create('conn_1', 'pk_test');
    manager.activate(session.id);

    const fetched = manager.get(session.id);
    expect(fetched?.state).toBe('active');
  });

  it('recupere par connexion', () => {
    const session = manager.create('conn_1', 'pk_test');
    const found = manager.getByConnection('conn_1');

    expect(found?.id).toBe(session.id);
  });

  it('retourne undefined pour connexion inconnue', () => {
    expect(manager.getByConnection('unknown')).toBeUndefined();
  });

  it('met a jour le contexte', () => {
    const session = manager.create('conn_1', 'pk_test');
    manager.updateContext(
      session.id,
      '/products',
      'Produits',
      [{ name: 'search', description: 'Rechercher' }],
      { category: 'laptops', visibleCount: 12 }
    );

    const updated = manager.get(session.id);
    expect(updated?.context.url).toBe('/products');
    expect(updated?.context.data).toEqual({ category: 'laptops', visibleCount: 12 });
    expect(updated?.toolRegistry.size).toBe(1);
  });

  it('detruit une session', () => {
    const session = manager.create('conn_1', 'pk_test');
    manager.destroy(session.id);

    expect(manager.get(session.id)).toBeUndefined();
    expect(manager.getByConnection('conn_1')).toBeUndefined();
    expect(manager.size).toBe(0);
  });

  it('detruit par connexion', () => {
    manager.create('conn_1', 'pk_test');
    manager.destroyByConnection('conn_1');

    expect(manager.size).toBe(0);
  });

  it('gere plusieurs sessions', () => {
    manager.create('conn_1', 'pk_test');
    manager.create('conn_2', 'pk_test');
    manager.create('conn_3', 'pk_other');

    expect(manager.size).toBe(3);
    expect(manager.getAll()).toHaveLength(3);
  });
});
