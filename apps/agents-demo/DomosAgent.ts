// agents-demo/DomosAgent.ts

import { DomOSClient } from '@domos/core';
import type { ToolDefinition } from '@domos/core';

// Exemple de mémoire (session/persistante)
const agentMemory = {
  session: [],
  persistent: {
    preferences: { language: 'fr', theme: 'dark' },
    objectives: [],
    history: []
  }
};

// Exemple de tools
const tools: ToolDefinition[] = [
  {
    name: 'add_to_cart',
    description: 'Ajouter un produit au panier',
    risk: 'low',
    // schema, handler à compléter
  },
  {
    name: 'search_products',
    description: 'Rechercher des produits',
    risk: 'none',
    // schema, handler à compléter
  }
];

// Exemple de context
const agentContext = {
  page: 'Home',
  data: {},
  historique: [],
  preferences: agentMemory.persistent.preferences,
  role: 'assistant',
};

// Exemple de state
const agentState = {
  status: 'connected',
};

// Exemple de rôles
const agentRoles = [
  { name: 'assistant', permissions: ['read', 'write'], restrictions: [] },
  { name: 'expert', permissions: ['read', 'write', 'delete'], restrictions: ['critical'] },
];

// Initialisation de l’agent
export class DomosAgentDemo {
  client: DomOSClient;
  memory: typeof agentMemory;
  tools: ToolDefinition[];
  context: typeof agentContext;
  state: typeof agentState;
  roles: typeof agentRoles;

  constructor() {
    this.client = new DomOSClient({
      url: 'ws://localhost:3000/domos',
      memory: agentMemory,
      tools: tools,
      context: agentContext,
      state: agentState,
      roles: agentRoles,
      // autres configs à compléter
    });
    this.memory = agentMemory;
    this.tools = tools;
    this.context = agentContext;
    this.state = agentState;
    this.roles = agentRoles;
  }

  // Exemple d’appel LLM
  async callLLM(request: string) {
    const payload = {
      context: this.client.getContext(),
      tools: this.tools,
      history: this.memory.session,
      request,
    };
    // Appel API LLM à compléter
    // const response = await fetchLLM(payload);
    // this.handleLLMResponse(response);
  }

  // Ajout de feedback utilisateur
  addFeedback(feedback: any) {
    this.memory.session.push(feedback);
  }

  // Visualisation mémoire
  getMemory() {
    return {
      session: this.memory.session,
      persistent: this.memory.persistent,
    };
  }

  // Gestion des rôles
  setRole(roleName: string) {
    const role = this.roles.find(r => r.name === roleName);
    if (role) this.context.role = role.name;
  }

}
