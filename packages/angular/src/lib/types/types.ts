import type {
  DomOSClientOptions,
  ToolDeclaration,
  ToolParameters,
} from '@domos/core';

export interface DomOSAngularConfig extends DomOSClientOptions {
  componentId?: string;
}

export type DomOSContextValue = Record<string, unknown>;

export type DomOSContextInput = DomOSContextValue | (() => DomOSContextValue);

export type DomOSToolArgs = object;

export type DomOSToolSchema<TArgs extends DomOSToolArgs = DomOSToolArgs> = {
  safeParse: (
    input: unknown
  ) =>
    | {
        success: true;
        data: TArgs;
      }
    | {
        success: false;
        error: {
          issues: Array<{
            message?: string;
          }>;
        };
      };
};

export interface DomOSToolDefinition<TArgs extends DomOSToolArgs = DomOSToolArgs>
  extends Omit<ToolDeclaration, 'parameters'> {
  parameters?: ToolParameters;
  schema?: DomOSToolSchema<TArgs>;
  componentId?: string;
  global?: boolean;
}

type DomOSToolArgsCallback<TArgs extends DomOSToolArgs> = {
  bivarianceHack(args: TArgs): void | Promise<void>;
}['bivarianceHack'];

type DomOSToolCallback<TArgs extends DomOSToolArgs, TResult> = {
  bivarianceHack(args: TArgs, result: TResult): void | Promise<void>;
}['bivarianceHack'];

type DomOSToolErrorCallback<TArgs extends DomOSToolArgs> = {
  bivarianceHack(args: TArgs, error: Error): void | Promise<void>;
}['bivarianceHack'];

export type DomOSToolHandler<TArgs extends DomOSToolArgs = DomOSToolArgs> = {
  bivarianceHack(args: TArgs): Promise<unknown> | unknown;
}['bivarianceHack'];

export interface DomOSNavigationArgs {
  url: string;
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface DomOSNavigationOptions {
  description?: string;
  /** Si true, le tool ne s'enregistre pas. */
  disabled?: boolean;
  /**
   * Si true, le tool persiste après le démontage du composant.
   * Défaut : true (la navigation est globale par nature).
   */
  global?: boolean;
}

export type DomOSNavigationHandler = DomOSToolHandler<DomOSNavigationArgs>;

export interface DomOSViewStateArgs {
  viewId: string;
  action: string;
  params?: Record<string, unknown>;
}

export type DomOSViewStateHandler = DomOSToolHandler<DomOSViewStateArgs>;

export interface DomOSViewStateOptions {
  /** Description du tool exposée au LLM. Par défaut : description générique. */
  description?: string;
  /** Si true, le tool ne s'enregistre pas. */
  disabled?: boolean;
  /**
   * Si true, le tool persiste après le démontage du composant.
   * Défaut : false (ui_state est local par nature).
   */
  global?: boolean;
}

export interface DomOSResolverToolDefinition<
  TArgs extends DomOSToolArgs = DomOSToolArgs,
> {
  description: string;
  schema?: DomOSToolSchema<TArgs>;
  parameters?: ToolParameters;
  handler: DomOSToolHandler<TArgs>;
  risk?: ToolDeclaration['risk'];
  onBeforeCall?: DomOSToolArgsCallback<TArgs>;
  onAfterCall?: DomOSToolCallback<TArgs, unknown>;
  onError?: DomOSToolErrorCallback<TArgs>;
}

export interface DomOSResolverToolGroup {
  prefix?: string;
  tools: Record<string, DomOSResolverToolDefinition>;
}

export interface DomOSResolverConfig {
  [groupName: string]: DomOSResolverToolGroup;
}

export interface DomOSResolverOptions {
  prefix?: string;
  debug?: boolean;
  disabled?: boolean;
  global?: boolean;
  onBeforeAnyCall?: (toolName: string, args: Record<string, unknown>) => void | Promise<void>;
  onAfterAnyCall?: (
    toolName: string,
    args: Record<string, unknown>,
    result: unknown
  ) => void | Promise<void>;
  onErrorAnyCall?: (
    toolName: string,
    args: Record<string, unknown>,
    error: Error
  ) => void | Promise<void>;
}

export interface DomOSResolverHandle {
  toolCount: number;
  toolNames: string[];
  destroy: VoidFunction;
}
