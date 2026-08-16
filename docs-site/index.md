---
layout: home

hero:
  name: "OwlLayer AI"
  text: "Agentic UI SDK"
  tagline: "Give your AI agent real-time control over your existing user interface with the OwlLayer AI Runtime."
  image:
    src: /logo-owl.png
    alt: OwlLayer AI Owl Symbol
  actions:
    - theme: brand
      text: Get Started
      link: /introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/borisbob91/domos

features:
  - icon:
      src: /icons/brain.svg
      alt: Neural-DOM
    title: Neural-DOM Binding
    details: Components declare AI tools locally. The agent's capability registry adapts dynamically to what the user sees on the screen.
  - icon:
      src: /icons/shield-check.svg
      alt: Security
    title: HITL Security Built-in
    details: Human-in-the-Loop sandbox. High-risk operations (e.g. processing payments, clearing cart) require explicit user approval.
  - icon:
      src: /icons/microphone.svg
      alt: Audio
    title: Native Audio Pipeline
    details: Stream PCM audio packages directly between the browser, OwlLayer Server, and LLM providers for natural voice interactions.
  - icon:
      src: /icons/plugs.svg
      alt: SDKs
    title: "Agentic UI SDKs"
    details: Out-of-the-box integrations for React, Vue, Svelte, Angular, Vanilla Browser, Shopify, and WooCommerce.
---

## Use Cases

<div class="use-cases-grid">
  <div class="use-case-card">
    <h3>
      <svg class="use-case-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z"/></svg>
      Intelligent E-Commerce
    </h3>
    <p>Allow vocal or text agents to filter products catalog, update shopping carts, apply coupon codes, and guide customers directly to checkout.</p>
  </div>
  <div class="use-case-card">
    <h3>
      <svg class="use-case-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M226.76,69a8,8,0,0,0-12.84-2.88l-40.3,37.19-17.23-3.7-3.7-17.23,37.19-40.3A8,8,0,0,0,187,29.24,72,72,0,0,0,88,96,72.34,72.34,0,0,0,94,124.94L33.79,177c-.15.12-.29.26-.43.39a32,32,0,0,0,45.26,45.26c.13-.13.27-.28.39-.42L131.06,162A72,72,0,0,0,232,96,71.56,71.56,0,0,0,226.76,69ZM160,152a56.14,56.14,0,0,1-27.07-7,8,8,0,0,0-9.92,1.77L67.11,211.51a16,16,0,0,1-22.62-22.62L109.18,133a8,8,0,0,0,1.77-9.93,56,56,0,0,1,58.36-82.31l-31.2,33.81a8,8,0,0,0-1.94,7.1L141.83,108a8,8,0,0,0,6.14,6.14l26.35,5.66a8,8,0,0,0,7.1-1.94l33.81-31.2A56.06,56.06,0,0,1,160,152Z"/></svg>
      Guided Customer Support
    </h3>
    <p>Help users navigate complex dashboards, pre-fill tedious profile address form fields, and resolve settings options using simple speech.</p>
  </div>
  <div class="use-case-card">
    <h3>
      <svg class="use-case-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z"/></svg>
      Data Exploration & Charts
    </h3>
    <p>Command complex analytical visual charts, adjust time range sliders, filter metrics categories, and export records instantly.</p>
  </div>
  <div class="use-case-card">
    <h3>
      <svg class="use-case-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"/></svg>
      Hands-Free Vocal Audits
    </h3>
    <p>Allow workers to log notes, query checklists, and execute commands via high-fidelity audio streams while working on-site.</p>
  </div>
</div>

---

## 3-Step Quick Tutorial

### 1. Declare a Client Tool
Register a local function inside your front-end component using React hooks. The tool lives and dies with the component lifecycle.

```typescript
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

useAgentTool({
  name: 'apply_promo_coupon',
  description: 'Apply checkout discount code',
  schema: z.object({ code: z.string() }),
  risk: 'low'
}, async ({ code }) => {
  const result = await cart.apply(code);
  return { success: result.ok, discount: result.amount };
});
```

### 2. Run the WebSocket Server
Create a lightweight OwlLayer Server orchestrator powered by Gemini or GPT adapters.

```typescript
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY }),
  port: 4001
});

server.listen();
```

### 3. Talk to Your Interface
Embed the UI widget block or talk to the client. When you type or say *"Apply coupon SALE10"*, the server coordinates the LLM, validates parameters via Zod, forwards the execution call to your React handler, and streams back the result!
