import type { DomOSAngularService } from '@domos/angular';
import { describe, expect, it, vi } from 'vitest';
import { registerDemoTools } from './register-demo-tools.js';

describe('registerDemoTools', () => {
  it('registers demo_echo through @domos/angular', async () => {
    const dispose = vi.fn();
    const registerTool = vi.fn(() => dispose);
    const domos = { registerTool } as unknown as DomOSAngularService;

    const cleanup = registerDemoTools(domos);

    expect(registerTool).toHaveBeenCalledTimes(1);

    const [definition, handler] = registerTool.mock.calls[0] as [
      { name: string },
      (args: Record<string, unknown>) => Promise<unknown>
    ];

    expect(definition.name).toBe('demo_echo');
    await expect(handler({ message: 'bonjour' })).resolves.toEqual({
      source: 'angular-demo',
      echoed: 'bonjour',
    });

    cleanup();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});