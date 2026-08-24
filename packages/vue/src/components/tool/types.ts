// ============================================================
// Shared types — OwlLayerTool + OwlLayerToolBtn (@owllayer/vue)
// ============================================================

export type RiskLevel = 'none' | 'low' | 'high' | 'critical';

export interface OwlLayerToolBaseProps {
  /**
   * Unique tool name within the page.
   * Must be unique among all simultaneously registered tools.
   *
   * ⚠️  Do not use these components inside a `v-for` loop:
   * N near-identical tools confuse the LLM and waste tokens.
   * For lists, prefer a single `useAgentTool` with an exhaustive description.
   */
  name: string;

  /** Human-readable description for the LLM — explain WHEN to use this tool. */
  description: string;

  /** Risk level for HITL (Human-in-the-Loop) confirmation. */
  risk?: RiskLevel;

  /**
   * Contextual data automatically appended to the description.
   *
   * The agent sees: `"${description}. Context: ${JSON.stringify(context)}"`
   *
   * Useful for co-locating element identity with the component:
   * @example
   * ```vue
   * <OwlLayerTool
   *   name="toggle_favorite"
   *   description="Add this product to favorites"
   *   :context="{ productId: product.id, name: product.name }"
   *   action="click"
   * >
   *   <button>♡</button>
   * </OwlLayerTool>
   * ```
   */
  context?: Record<string, unknown>;
}

/**
 * Props for `OwlLayerTool` — transparent wrapper around an existing child element.
 *
 * Provide either `action` OR `handler`, never both.
 */
export interface OwlLayerToolProps extends OwlLayerToolBaseProps {
  /**
   * DOM action triggered on the wrapper's first child element.
   *
   * - `click`          → `.click()` — works with `<button>`, `<a>`, `<RouterLink>`
   * - `focus`          → `.focus()`
   * - `scrollIntoView` → `.scrollIntoView({ behavior: 'smooth' })`
   * - `show` / `hide`  → toggles `style.display`
   *
   * Mutually exclusive with `handler`.
   */
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';

  /**
   * Direct callback invoked by the agent — no DOM interaction.
   * Use when the child element has no existing event handler to reuse.
   *
   * Mutually exclusive with `action`.
   */
  handler?: () => unknown | Promise<unknown>;
}

/**
 * Props for `OwlLayerToolBtn` — self-rendered `<button>` with built-in tool registration.
 *
 * The handler is called both by the agent AND by the user's click.
 * `disabled` only blocks the human click — the agent can still invoke the action.
 */
export interface OwlLayerToolBtnProps extends OwlLayerToolBaseProps {
  /** Called by the agent AND on user click. */
  handler: () => unknown | Promise<unknown>;

  /** CSS classes applied to the rendered `<button>`. Vue uses `class`, not `className`. */
  class?: string;

  /**
   * Visually disables the button for the user.
   * Does NOT prevent the agent from calling the action.
   */
  disabled?: boolean;
}
