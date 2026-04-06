import type { DomOSAngularService } from '@domos/angular';

export function registerDemoTools(domos: DomOSAngularService): VoidFunction {
  return domos.registerTool(
    {
      name: 'demo_echo',
      description: 'Retourne la charge utile recue pour valider le pont Angular vers DomOS.',
      parameters: {
        type: 'OBJECT',
        properties: {
          message: {
            type: 'STRING',
            description: 'Message a renvoyer tel quel.',
          },
        },
      },
    },
    async (args) => ({
      source: 'angular-demo',
      echoed: args.message ?? null,
    })
  );
}