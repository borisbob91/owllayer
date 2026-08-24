import { useAgentTool } from '../../hooks/useAgentTool.js';
import type { OwlLayerToolBtnProps } from './types.js';

// ============================================================
// OwlLayerToolBtn — self-rendered <button> with built-in agent tool.
//
// Difference from OwlLayerTool:
//   • OwlLayerTool    → wrapper around an EXISTING element
//   • OwlLayerToolBtn → renders its own <button>, styleable via className
//
// The handler is called via TWO independent paths:
//   1. User click → via the <button> onClick
//   2. Agent call → via useAgentTool (independent of the DOM)
//
// Important — disabled does NOT block the agent:
//   disabled={true} disables the human click (UX feedback),
//   but useAgentTool is registered independently of the button.
//   The agent can still trigger the action (e.g. while a loading spinner shows).
// ============================================================

/**
 * `OwlLayerToolBtn` — Styleable button with built-in agent tool registration.
 *
 * Renders its own `<button>` and automatically registers an agent tool on mount.
 * The handler is called both by the agent and by the user's click.
 *
 * @example Clear cart button
 * ```tsx
 * <OwlLayerToolBtn
 *   name="clear_cart"
 *   description="Clear the cart entirely. Irreversible action."
 *   risk="high"
 *   className="w-full text-sm text-red-500 hover:text-red-700"
 *   handler={clearCart}
 * >
 *   Clear cart
 * </OwlLayerToolBtn>
 * ```
 *
 * @example With context — agent sees the element identity
 * ```tsx
 * <OwlLayerToolBtn
 *   name="subscribe_newsletter"
 *   description="Subscribe to the newsletter"
 *   risk="low"
 *   className="btn-primary"
 *   handler={() => subscribe(user.email)}
 *   context={{ userEmail: user.email }}
 * >
 *   Subscribe
 * </OwlLayerToolBtn>
 * ```
 *
 * @example disabled — blocks human click but not the agent
 * ```tsx
 * <OwlLayerToolBtn
 *   name="submit_order"
 *   description="Confirm and place the order"
 *   risk="high"
 *   handler={submitOrder}
 *   disabled={isLoading}   // spinner shown, agent can still confirm
 * >
 *   {isLoading ? 'Submitting...' : 'Place order'}
 * </OwlLayerToolBtn>
 * ```
 */
export function OwlLayerToolBtn({
  name,
  description,
  risk = 'none',
  context,
  handler,
  className,
  disabled,
  children,
}: OwlLayerToolBtnProps) {
  const fullDescription = context
    ? `${description}. Context: ${JSON.stringify(context)}`
    : description;

  // Independent registration — the agent calls this path.
  useAgentTool(
    { name, description: fullDescription, risk },
    () => handler(),
  );

  // User click → same handler, same result.
  return (
    <button className={className} disabled={disabled} onClick={() => handler()}>
      {children}
    </button>
  );
}
