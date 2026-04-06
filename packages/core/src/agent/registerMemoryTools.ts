import type { DomOSClient } from '../client/DomOSClient.js';
import type { DomosAgent } from './DomosAgent.js';

/**
 * Enregistre les tools LLM de gestion mémoire sur un client DomOS.
 *
 * À appeler une fois après `domosAgent.init()`.
 * Les tools sont globaux — ils ne sont jamais désinscrits par unregisterToolsByComponent.
 *
 * Tools enregistrés :
 * - `domos_save_summary` : le LLM appelle ce tool pour mémoriser un résumé
 *   cumulatif de la session. Le résumé est ajouté dans `persistent.summaries[]`
 *   et persisté via l'adapter configuré.
 */
export function registerMemoryTools(client: DomOSClient, agent: DomosAgent): void {
  client.registerTool({
    declaration: {
      name: 'domos_save_summary',
      description:
        "Sauvegarde un résumé complet et cumulatif de la session courante et de " +
        "l'historique connu de l'utilisateur. " +
        "Appelle ce tool à la fin d'une session significative, ou quand tu détectes " +
        "une préférence ou un contexte important à retenir. " +
        "Le résumé DOIT être cumulatif : inclure ce qui était connu avant + ce qui est nouveau. " +
        "Format : texte libre, max 500 mots.",
      parameters: {
        type: 'OBJECT',
        properties: {
          summary: {
            type: 'STRING',
            description: "Résumé complet et cumulatif de l'utilisateur et de ses sessions.",
          },
        },
        required: ['summary'],
      },
      risk: 'none',
    },
    handler: async (args: { summary: string }) => {
      agent.appendSummary(args.summary);
      return { ok: true, savedAt: Date.now() };
    },
    global: true,
  });
}
