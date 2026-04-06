import { assertInInjectionContext, DestroyRef, inject } from '@angular/core';
import { createLogger } from '@domos/core';
import { injectDomOS } from './provideDomOS.js';
import type {
  DomOSResolverConfig,
  DomOSResolverHandle,
  DomOSResolverOptions,
  DomOSResolverToolDefinition,
} from './types.js';

const log = createLogger('DomOS:AngularToolResolver');

export function registerToolResolver(
  config: DomOSResolverConfig,
  options: DomOSResolverOptions = {}
): DomOSResolverHandle {
  assertInInjectionContext(registerToolResolver);

  const domos = injectDomOS();
  const destroyRef = inject(DestroyRef);
  const flatTools: Array<[string, DomOSResolverToolDefinition]> = [];
  const globalPrefix = options.prefix ?? '';

  for (const group of Object.values(config)) {
    const effectivePrefix = globalPrefix || group.prefix || '';

    for (const [toolName, toolDefinition] of Object.entries(group.tools)) {
      const fullName = effectivePrefix ? `${effectivePrefix}${toolName}` : toolName;
      flatTools.push([fullName, toolDefinition]);
    }
  }

  const toolNames = flatTools.map(([toolName]) => toolName);

  if (options.disabled) {
    return {
      toolCount: toolNames.length,
      toolNames,
      destroy: () => {},
    };
  }

  const disposers = flatTools.map(([toolName, toolDefinition]) => {
    return domos.registerTool(
      {
        name: toolName,
        description: toolDefinition.description,
        parameters: toolDefinition.parameters,
        schema: toolDefinition.schema,
        risk: toolDefinition.risk ?? 'low',
        global: options.global,
      },
      async (rawArgs) => {
        const startTime = Date.now();
        let args = rawArgs;

        try {
          if (toolDefinition.schema) {
            const parsed = toolDefinition.schema.safeParse(rawArgs);

            if (!parsed.success) {
              throw new Error(
                `Validation failed for \"${toolName}\": ${parsed.error.issues[0]?.message ?? 'invalid arguments'}`
              );
            }

            args = parsed.data as Record<string, unknown>;
          }

          const anyCallArgs = args as Record<string, unknown>;

          await toolDefinition.onBeforeCall?.(args);
          await options.onBeforeAnyCall?.(toolName, anyCallArgs);

          const result = await toolDefinition.handler(args);

          await toolDefinition.onAfterCall?.(args, result);
          await options.onAfterAnyCall?.(toolName, anyCallArgs, result);

          if (options.debug) {
            log.debug(`${toolName} completed in ${Date.now() - startTime}ms`, result);
          }

          return result;
        } catch (error) {
          const resolvedError = error instanceof Error ? error : new Error(String(error));
          const anyCallArgs = args as Record<string, unknown>;

          await toolDefinition.onError?.(args, resolvedError);
          await options.onErrorAnyCall?.(toolName, anyCallArgs, resolvedError);

          if (options.debug) {
            log.error(`${toolName} failed`, resolvedError);
          }

          throw resolvedError;
        }
      }
    );
  });

  let destroyed = false;

  const destroy = () => {
    if (destroyed) {
      return;
    }

    destroyed = true;

    for (const dispose of disposers) {
      dispose();
    }
  };

  if (!options.global) {
    destroyRef.onDestroy(destroy);
  }

  return {
    toolCount: toolNames.length,
    toolNames,
    destroy,
  };
}