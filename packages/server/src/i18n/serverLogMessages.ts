export type ServerLanguage = 'en' | 'fr';

export const serverMessages = {
  en: {
    toolTimeout: (name: string, ms: number) => `Tool "${name}" timed out after ${ms}ms`,
    cannotSendToolCall: (sessionId: string) => `Unable to send TOOL_CALL to client (session: ${sessionId})`,
    toolExecutionError: (name: string, error: string) => `Error executing tool "${name}": ${error}`,
    unknownTool: (name: string) => `Unknown tool: ${name}`,
    unknownToolResult: (callId: string) => `TOOL_RESULT for unknown call: ${callId}`,
    connClosed: (connId: string) => `Unable to send to ${connId}: connection closed`,
    toolRejectedSecurity: (name: string, reason: string) => `Tool call "${name}" rejected by security policy: ${reason}`,
    invalidAuth: 'Invalid authentication credentials',
    unauthorized: 'Unauthorized',
    missingToken: 'Missing or malformed Authorization header',
    rateLimitExceeded: 'Too many login attempts. Please try again later.',
  },
  fr: {
    toolTimeout: (name: string, ms: number) => `Tool "${name}" timeout après ${ms}ms`,
    cannotSendToolCall: (sessionId: string) => `Impossible d'envoyer TOOL_CALL au client (session: ${sessionId})`,
    toolExecutionError: (name: string, error: string) => `Erreur lors de l'exécution du tool "${name}": ${error}`,
    unknownTool: (name: string) => `Tool inconnu : ${name}`,
    unknownToolResult: (callId: string) => `TOOL_RESULT pour un call inconnu : ${callId}`,
    connClosed: (connId: string) => `Impossible d'envoyer à ${connId} : connexion fermée`,
    toolRejectedSecurity: (name: string, reason: string) => `Appel du tool "${name}" rejeté par la sécurité : ${reason}`,
    invalidAuth: 'Identifiants invalides',
    unauthorized: 'Non autorisé',
    missingToken: 'Header Authorization manquant ou invalide',
    rateLimitExceeded: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
  },
};

let activeServerLanguage: ServerLanguage = 'en';

export function setServerLanguage(lang: ServerLanguage): void {
  activeServerLanguage = lang;
}

export function getServerLanguage(): ServerLanguage {
  return activeServerLanguage;
}

export function getServerMessages(lang?: ServerLanguage) {
  return serverMessages[lang ?? activeServerLanguage] ?? serverMessages.en;
}
