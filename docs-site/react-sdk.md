# React SDK Integration

The `@domos/react` package provides React-specific bindings, components, and state management wrappers around `DomOSClient`.

---

## Installation

Install the package and its validation dependencies:
```bash
pnpm add @domos/react @domos/core zod
```

---

## 1. Setup (`DomOSProvider`)

Wrap your main application entry point with `DomOSProvider` to instantiate the websocket client context:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DomOSProvider } from '@domos/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <DomOSProvider
    apiKey="pk_live_xxxx"
    endpoint="wss://api.domos.dev/domos"
    config={{
      voice: true,
      debug: false,
      approvalBanner: false
    }}
  >
    <App />
  </DomOSProvider>
);
```

---

## 2. Registering Tools (`useAgentTool`)

To register a tool for a specific component, use the `useAgentTool` hook. The tool will automatically register when the component mounts and deregister when it unmounts.

```tsx
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

function ProductCard({ product }) {
  const [likes, setLikes] = useState(0);

  // This tool is only visible to the AI while ProductCard is rendered
  useAgentTool({
    name: `like_product_${product.id}`,
    description: `Add "${product.name}" to the favorites list`,
    schema: z.object({
      notify: z.boolean().describe('Should show a notification toast')
    }),
    risk: 'none', // Direct execution
  }, async ({ notify }) => {
    setLikes(prev => prev + 1);
    return { success: true, newLikesCount: likes + 1 };
  });

  return <div>{product.name} ({likes} Likes)</div>;
}
```

---

## 3. Centralized Tools Resolver (`useAgentToolResolver`)

For larger applications with global actions (such as routing, cart operations, settings, or CRUD), use the `useAgentToolResolver` hook. This replaces monolithic switch-cases with a clean, structured schema.

```tsx
import { useAgentToolResolver } from '@domos/react';
import { z } from 'zod';

function Layout({ children }) {
  const navigate = useNavigate();

  useAgentToolResolver({
    navigation: {
      tools: {
        navigate_to: {
          description: "Navigate between application views.",
          schema: z.object({
            path: z.enum(['/', '/cart', '/checkout', '/profile'])
          }),
          handler: async ({ path }) => {
            navigate(path);
            return { redirected: true, path };
          }
        }
      }
    }
  });

  return <div>{children}</div>;
}
```

---

## 4. Feeding Passive Context (`useAgentContext`)

Provide the model with read-only state metadata using `useAgentContext`:

```tsx
import { useAgentContext } from '@domos/react';

function UserDashboard({ user }) {
  useAgentContext({
    userId: user.id,
    userTier: user.tier,
    activeCartItemsCount: user.cart.length
  });

  return <div>Welcome back, {user.name}</div>;
}
```

---

## 5. UI Components

The React SDK exposes several pre-built UI components:

| Component | Description |
|---|---|
| `<AgentIndicator />` | Displays connection, thinking, and speaking status. |
| `<ApprovalModal />` | Rendered automatically in `high` or `critical` risk events. |
| `<Notification />` | Renders a toast notification for `low` risk operations. |
| `<ShadowContainer />` | Renders children in an isolated closed Shadow DOM. |
| `<DomOSWidget />` | Standard chat & voice assistant bubble layout. |

### CRITICAL RULE: Shadow DOM Isolation

The React SDK uses a custom `<ShadowContainer />` to isolate the security modals and the widget style sheets from the main document scope.

`WidgetInner.tsx` instantiates its own `createRoot` within a Shadow DOM container. **This nested root does not share the parent's React Context.**

> [!CAUTION]
> Any component calling `useAgentTool`, `useAgent`, or `useVoiceMode` **MUST NOT** be placed inside the `<ShadowContainer />` or custom markup within the widget children. They must remain in the main Light DOM hierarchy to access the `DomOSProvider` context:

```tsx
// CORRECT: Provider context is accessible
return (
  <>
    <ActiveToolsComponent /> {/* OUTSIDE the ShadowContainer */}
    <ShadowContainer styles={styles}>
      <WidgetUI /> {/* Isolated styles here */}
    </ShadowContainer>
  </>
);
```
