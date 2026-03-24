import { useRef } from 'react';
import { useAgentTool } from '../../hooks/useAgentTool.js';
import type { DomOSToolProps } from './types.js';

// ============================================================
// DomOSTool — transparent wrapper that co-locates an agent tool
// directly with its UI element.
//
// How it works:
//   • Renders a <span style="display:contents"> — invisible to layout
//   • Registers a tool via useAgentTool (mounts/unmounts with the component)
//   • Agent triggers either a DOM action on the child, or a direct handler
//
// DomOSTool vs useAgentTool — when to use which:
//
//   ✅ DomOSTool — single standalone element, outside a list
//      <DomOSTool name="clear_cart" action="click" ...>
//        <button onClick={clearCart}>Clear cart</button>
//      </DomOSTool>
//
//   ✅ useAgentTool — N elements in a .map() loop
//      → one tool with an exhaustive description of all items
//      → avoids N near-identical tools that confuse the LLM
//
// Supported actions:
//   • click          → element.click()
//   • focus          → element.focus()
//   • scrollIntoView → element.scrollIntoView({ behavior: 'smooth' })
//   • show           → element.style.display = ''
//   • hide           → element.style.display = 'none'
// ============================================================

/**
 * `DomOSTool` — Co-locate an agent tool with its UI element.
 *
 * Transparent wrapper (`display:contents`) that automatically registers
 * an agent tool on mount and unregisters it on unmount.
 *
 * Provide either `action` (DOM interaction) OR `handler` (direct callback).
 *
 * @example DOM action — button with existing onClick
 * ```tsx
 * <DomOSTool
 *   name="clear_cart"
 *   description="Clear the cart entirely. Irreversible action."
 *   risk="high"
 *   action="click"
 * >
 *   <button onClick={clearCart}>Clear cart</button>
 * </DomOSTool>
 * ```
 *
 * @example DOM action — React Router Link
 * ```tsx
 * <DomOSTool
 *   name="go_to_checkout"
 *   description="Navigate to the checkout page to place an order."
 *   risk="none"
 *   action="click"
 * >
 *   <Link to="/checkout">Checkout →</Link>
 * </DomOSTool>
 * ```
 *
 * @example Direct handler — no existing event on the child
 * ```tsx
 * <DomOSTool
 *   name="toggle_theme"
 *   description="Switch between light and dark theme."
 *   risk="none"
 *   handler={toggleTheme}
 *   context={{ currentTheme: theme }}
 * >
 *   <ThemeIcon />
 * </DomOSTool>
 * ```
 *
 * @example Context — data injected into the description
 * ```tsx
 * // Agent sees: "Add to favorites. Context: {"id":"42","name":"Nike Air"}"
 * <DomOSTool
 *   name="toggle_favorite"
 *   description="Add this product to favorites"
 *   context={{ id: product.id, name: product.name }}
 *   action="click"
 * >
 *   <button onClick={() => toggleFavorite(product.id)}>♡</button>
 * </DomOSTool>
 * ```
 */
export function DomOSTool({
  name,
  description,
  risk = 'none',
  context,
  action,
  handler,
  children,
}: DomOSToolProps) {
  if (action && handler) {
    throw new Error(`DomOSTool "${name}": provide action OR handler, not both.`);
  }
  if (!action && !handler) {
    throw new Error(`DomOSTool "${name}": action or handler is required.`);
  }

  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Serialize context appended to description.
  // When context changes, description changes → useAgentTool re-registers the tool.
  const fullDescription = context
    ? `${description}. Context: ${JSON.stringify(context)}`
    : description;

  useAgentTool(
    { name, description: fullDescription, risk },
    () => {
      if (handler) return handler();

      const child = wrapperRef.current?.firstElementChild as HTMLElement | null;
      if (!child) return;

      switch (action) {
        case 'click':
          child.click();
          break;
        case 'focus':
          child.focus();
          break;
        case 'scrollIntoView':
          child.scrollIntoView({ behavior: 'smooth' });
          break;
        case 'show':
          child.style.display = '';
          break;
        case 'hide':
          child.style.display = 'none';
          break;
      }
    },
  );

  // display:contents — the <span> is transparent to layout.
  // It adds no CSS box, does not affect flexbox/grid or child styling.
  return (
    <span ref={wrapperRef} style={{ display: 'contents' }}>
      {children}
    </span>
  );
}
