# Quick Start

Get a local instance of the DomOS framework up and running in minutes using the provided e-commerce demo application.

---

## Prerequisites

Make sure you have the following installed on your machine:
* **Node.js** >= 18
* **pnpm** >= 9 (using workspaces)

---

## Installation

Clone the repository and install all dependencies:

```bash
# Clone the repository
git clone https://github.com/your-org/domos.git
cd domos

# Install dependencies using pnpm
pnpm install

# Build all package workspaces (core, server, react, vue, svelte, etc.)
pnpm build
```

---

## Running the Demo

To test DomOS, we run a local Node.js WebSocket server and a React shop front-end. You will need an API key from Google Gemini to power the server.

### 1. Launch the Server

First, configure your API keys in the demo server:

```bash
cd apps/demo-server
cp .env.example .env
```

Open the `.env` file and add your Google Gemini API key:
```env
PORT=4001
GOOGLE_API_KEY=your_gemini_api_key_here
DOMOS_API_KEY=pk_demo_local
```

Now start the development server:
```bash
pnpm dev
```
The server will start listening on `ws://localhost:4001/domos`.

### 2. Launch the Client

In a second terminal window, run the React client:

```bash
cd apps/demo
pnpm dev
```

Open your browser at `http://localhost:5173`. You will see **ShopMate**, a mock e-commerce store with an embedded DomOS chat bubble.

---

## Things to Try

Type or speak the following sentences into the chat widget:
* *"Show me Bluetooth accessories."* (Triggers product search/filtering tools)
* *"Add the Bluetooth headphones to my cart."* (Adds the item to the cart)
* *"Empty my cart."* (Triggers a `high` risk action, showing a **HITL confirmation dialog** in the UI)
* *"Confirm my order."* (Triggers a `critical` risk action requiring checkout authorization)
