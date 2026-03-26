// ============================================================
// Tests for capabilityIntersect (Feature #09)
// ============================================================

import { describe, it, expect } from 'vitest';
import { capabilityIntersect } from '../src/runtime/capabilityIntersect.js';
import type { PluginCapabilities } from '../src/plugins/plugin.types.js';

describe('capabilityIntersect', () => {
  describe('when both declared and override are undefined', () => {
    it('returns an empty object', () => {
      expect(capabilityIntersect(undefined, undefined)).toEqual({});
    });
  });

  describe('when override is undefined', () => {
    it('returns declared as-is', () => {
      const declared: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com'] },
        env: { allowKeys: ['ACME_KEY'] },
      };
      expect(capabilityIntersect(declared, undefined)).toEqual(declared);
    });
  });

  describe('when declared is undefined', () => {
    it('returns override as-is', () => {
      const override: PluginCapabilities = {
        env: { allowKeys: ['SOME_KEY'] },
      };
      expect(capabilityIntersect(undefined, override)).toEqual(override);
    });
  });

  describe('network capabilities', () => {
    it('returns intersection of domains', () => {
      const declared: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com', 'cdn.acme.com'] },
      };
      const override: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com', 'evil.com'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.network?.allowDomains).toEqual(['api.acme.com']);
    });

    it('returns empty array when override blocks all domains', () => {
      const declared: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com'] },
      };
      const override: PluginCapabilities = {
        network: { allowDomains: [] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.network?.allowDomains).toEqual([]);
    });

    it('installer cannot grant domains not declared by the author', () => {
      const declared: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com'] },
      };
      const override: PluginCapabilities = {
        network: { allowDomains: ['api.acme.com', 'extra-domain.com'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.network?.allowDomains).toEqual(['api.acme.com']);
    });
  });

  describe('filesystem capabilities', () => {
    it('intersects readAllowPaths', () => {
      const declared: PluginCapabilities = {
        filesystem: { readAllowPaths: ['/app/data', '/app/public'] },
      };
      const override: PluginCapabilities = {
        filesystem: { readAllowPaths: ['/app/data'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.filesystem?.readAllowPaths).toEqual(['/app/data']);
    });

    it('intersects writeAllowPaths', () => {
      const declared: PluginCapabilities = {
        filesystem: { writeAllowPaths: ['/app/tmp', '/app/output'] },
      };
      const override: PluginCapabilities = {
        filesystem: { writeAllowPaths: ['/app/tmp'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.filesystem?.writeAllowPaths).toEqual(['/app/tmp']);
    });
  });

  describe('env capabilities', () => {
    it('intersects allowKeys', () => {
      const declared: PluginCapabilities = {
        env: { allowKeys: ['API_KEY', 'SECRET', 'ANOTHER'] },
      };
      const override: PluginCapabilities = {
        env: { allowKeys: ['API_KEY'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.env?.allowKeys).toEqual(['API_KEY']);
    });

    it('installer cannot grant env keys not declared by the author', () => {
      const declared: PluginCapabilities = {
        env: { allowKeys: ['API_KEY'] },
      };
      const override: PluginCapabilities = {
        env: { allowKeys: ['API_KEY', 'EXTRA_SECRET'] },
      };
      const result = capabilityIntersect(declared, override);
      expect(result.env?.allowKeys).toEqual(['API_KEY']);
    });
  });

  describe('process capabilities', () => {
    it('most restrictive wins: declared=true, override=false → false', () => {
      const declared: PluginCapabilities = { process: { allowSpawn: true } };
      const override: PluginCapabilities = { process: { allowSpawn: false } };
      const result = capabilityIntersect(declared, override);
      expect(result.process?.allowSpawn).toBe(false);
    });

    it('most restrictive wins: declared=false, override=true → false', () => {
      const declared: PluginCapabilities = { process: { allowSpawn: false } };
      const override: PluginCapabilities = { process: { allowSpawn: true } };
      const result = capabilityIntersect(declared, override);
      expect(result.process?.allowSpawn).toBe(false);
    });

    it('both true → true', () => {
      const declared: PluginCapabilities = { process: { allowSpawn: true } };
      const override: PluginCapabilities = { process: { allowSpawn: true } };
      const result = capabilityIntersect(declared, override);
      expect(result.process?.allowSpawn).toBe(true);
    });
  });

  describe('independent capability axes', () => {
    it('does not include axes not present in either side', () => {
      const declared: PluginCapabilities = { env: { allowKeys: ['KEY'] } };
      const override: PluginCapabilities = { env: { allowKeys: ['KEY'] } };
      const result = capabilityIntersect(declared, override);
      expect(result.network).toBeUndefined();
      expect(result.filesystem).toBeUndefined();
      expect(result.process).toBeUndefined();
    });
  });
});
