# Introduction to DomOS

DomOS is an open-source **Agentic UI framework** designed to give AI models direct, secure, and real-time control over web applications.

Unlike generic chatbots or UI generation tools, DomOS connects an AI agent directly to the active elements of your existing application. The agent sees what the user sees, reasons about the context, and invokes actions (tools) declared natively by your front-end components.

---

## The Philosophy: Agentic UI

Traditional approaches to building AI interfaces fall into three categories:

| Approach | Description | Limitation |
|---|---|---|
| **Chatbots** | Floating windows replying with text. | Isolated from the app; cannot perform actions for the user. |
| **Generative UI** | Dynamically generating a new UI from scratch using the LLM. | Fragile, inconsistent branding, hard to control business rules. |
| **Agentic UI (DomOS)** | Connecting the AI directly to your **existing** components and actions. | None. You keep your styles, business logic, and security rules. |

With DomOS, your application remains the owner of its business logic. The AI is simply a new way to pilot the existing interface.

---

## Core Characteristics

* **Dynamic Tool Registration**: Tools are linked to the lifecycle of the active view. If a component unmounts, its tools are automatically deregistered. The model only sees actions relevant to the current screen.
* **Passive Shadow Context**: Continuous lightweight sync of the viewport state (URL, active page, product details, loaded IDs) to give the model immediate situational awareness without calling tools.
* **Human-in-the-Loop (HITL)**: Robust security sandbox. Actions marked with high or critical risk levels trigger interactive overlays requiring explicit human confirmation.
* **PCM Voice Streaming**: Direct audio capture, state management, and playback synchronization designed for bidirectional vocal conversations.

---

## Architecture Overview

DomOS acts as a bridge between the Browser and the Server via a custom WebSocket protocol called **ADTP** (Agent-to-DOM Transfer Protocol):

```
┌─────────────────────────────────────────────────────────┐
│                      Web Browser                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ ProductCard  │  │  CartPage   │  │   ChatPanel   │  │
│  │             │  │             │  │               │  │
│  │useAgentTool │  │useAgentTool │  │  sendText()   │  │
│  │ add_to_cart │  │ confirm_order│  │  sendAudio()  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘  │
│         │                │                  │          │
│  ┌──────┴──────────────┴──────────────────┴───────┐  │
│  │           DomOSClient (@domos/core)             │  │
│  │                                                  │  │
│  │  Tool Registry ◄—► CONTEXT_UPDATE ◄—► WebSocket  │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │ ADTP (WebSocket JSON)        │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                   DomOS Server                          │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │              ADTPTransport (WebSocket)              │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                                │
│  ┌──────────┐  ┌────────┴───────┐  ┌──────────────────┐│
│  │   Auth   │  │ SessionManager │  │ HITLSecurity     ││
│  │Middleware│  │                │  │ Middleware        ││
│  └──────────┘  │ Tool Registry  │  └──────────────────┘│
│                │ Shadow Context │                        │
│                └────────┬───────┘                        │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │           LLM Adapter (Google Gemini)               │ │
│  │                                                      │ │
│  │  System Prompt + Tools + Context → Response + Calls  │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```
