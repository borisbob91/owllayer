import type { PluginCapabilities } from '../plugins/plugin.types.js';

// ============================================================
// capabilityIntersect
//
// Computes the effective capabilities for a plugin in `untrusted` mode.
//
// Rule: the installer can only restrict, never grant more than what
// the plugin author declared in `meta.capabilities`.
//
// If the installer provides no capabilities override, the plugin's
// declared capabilities are used as-is.
// ============================================================

/**
 * Returns the intersection of two domain lists.
 * If either list is undefined, the other is used as the baseline.
 * An explicit empty array means "nothing allowed".
 */
function intersectStringArrays(
  declared: string[] | undefined,
  override: string[] | undefined,
): string[] | undefined {
  if (override === undefined) return declared;
  if (declared === undefined) return override;
  return override.filter((item) => declared.includes(item));
}

/**
 * Computes effective capabilities by intersecting the plugin's declared
 * capabilities with the installer's optional override.
 *
 * The result is always a subset of `declared` — the installer cannot
 * grant access that the plugin author did not declare.
 *
 * @param declared - Capabilities from `plugin.meta.capabilities`
 * @param override - Capabilities from `PluginRuntimeOptions.capabilities`
 * @returns Effective capabilities applied at runtime
 */
export function capabilityIntersect(
  declared: PluginCapabilities | undefined,
  override: PluginCapabilities | undefined,
): PluginCapabilities {
  if (!override) return declared ?? {};
  if (!declared) return override;

  const result: PluginCapabilities = {};

  // Network
  if (declared.network !== undefined || override.network !== undefined) {
    result.network = {
      allowDomains: intersectStringArrays(
        declared.network?.allowDomains,
        override.network?.allowDomains,
      ),
    };
  }

  // Filesystem
  if (declared.filesystem !== undefined || override.filesystem !== undefined) {
    result.filesystem = {
      readAllowPaths: intersectStringArrays(
        declared.filesystem?.readAllowPaths,
        override.filesystem?.readAllowPaths,
      ),
      writeAllowPaths: intersectStringArrays(
        declared.filesystem?.writeAllowPaths,
        override.filesystem?.writeAllowPaths,
      ),
    };
  }

  // Env
  if (declared.env !== undefined || override.env !== undefined) {
    result.env = {
      allowKeys: intersectStringArrays(
        declared.env?.allowKeys,
        override.env?.allowKeys,
      ),
    };
  }

  // Process — most restrictive wins: false overrides true
  if (declared.process !== undefined || override.process !== undefined) {
    const declaredSpawn = declared.process?.allowSpawn ?? true;
    const overrideSpawn = override.process?.allowSpawn ?? true;
    result.process = { allowSpawn: declaredSpawn && overrideSpawn };
  }

  return result;
}
