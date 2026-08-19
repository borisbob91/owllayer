import type {
  OwlLayerClientOptions,
  ToolDeclaration,
  ToolParameters,
} from '@owllayer/core';

export interface OwlLayerAngularConfig extends OwlLayerClientOptions {
  componentId?: string;
}

export type OwlLayerContextValue = Record<string, unknown>;

export type OwlLayerContextInput = OwlLayerContextValue | (() => OwlLayerContextValue);

export type OwlLayerToolArgs = object;

export type OwlLayerToolSchema<TArgs extends OwlLayerToolArgs = OwlLayerToolArgs> = {
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

export interface OwlLayerToolDefinition<TArgs extends OwlLayerToolArgs = OwlLayerToolArgs>
  extends Omit<ToolDeclaration, 'parameters'> {
  parameters?: ToolParameters;
  schema?: OwlLayerToolSchema<TArgs>;
  componentId?: string;
  global?: boolean;
}

type OwlLayerToolArgsCallback<TArgs extends OwlLayerToolArgs> = {
  bivarianceHack(args: TArgs): void | Promise<void>;
}['bivarianceHack'];

type OwlLayerToolCallback<TArgs extends OwlLayerToolArgs, TResult> = {
  bivarianceHack(args: TArgs, result: TResult): void | Promise<void>;
}['bivarianceHack'];

type OwlLayerToolErrorCallback<TArgs extends OwlLayerToolArgs> = {
  bivarianceHack(args: TArgs, error: Error): void | Promise<void>;
}['bivarianceHack'];

export type OwlLayerToolHandler<TArgs extends OwlLayerToolArgs = OwlLayerToolArgs> = {
  bivarianceHack(args: TArgs): Promise<unknown> | unknown;
}['bivarianceHack'];

export interface OwlLayerNavigationArgs {
  url: string;
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface OwlLayerNavigationOptions {
  description?: string;
  /** Si true, le tool ne s'enregistre pas. */
  disabled?: boolean;
  /**
   * Si true, le tool persiste après le démontage du composant.
   * Défaut : true (la navigation est globale par nature).
   */
  global?: boolean;
}

export type OwlLayerNavigationHandler = OwlLayerToolHandler<OwlLayerNavigationArgs>;

export interface OwlLayerViewStateArgs {
  viewId: string;
  action: string;
  params?: Record<string, unknown>;
}

export type OwlLayerViewStateHandler = OwlLayerToolHandler<OwlLayerViewStateArgs>;

export interface OwlLayerViewStateOptions {
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

export interface OwlLayerResolverToolDefinition<
  TArgs extends OwlLayerToolArgs = OwlLayerToolArgs,
> {
  description: string;
  schema?: OwlLayerToolSchema<TArgs>;
  parameters?: ToolParameters;
  handler: OwlLayerToolHandler<TArgs>;
  risk?: ToolDeclaration['risk'];
  onBeforeCall?: OwlLayerToolArgsCallback<TArgs>;
  onAfterCall?: OwlLayerToolCallback<TArgs, unknown>;
  onError?: OwlLayerToolErrorCallback<TArgs>;
}

export interface OwlLayerResolverToolGroup {
  prefix?: string;
  tools: Record<string, OwlLayerResolverToolDefinition>;
}

export interface OwlLayerResolverConfig {
  [groupName: string]: OwlLayerResolverToolGroup;
}

export interface OwlLayerResolverOptions {
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

export interface OwlLayerResolverHandle {
  toolCount: number;
  toolNames: string[];
  destroy: VoidFunction;
}
