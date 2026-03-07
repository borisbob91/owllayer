import {
  HITLPolicy,
  RiskLevel,
  createLogger,
  type ToolCallPayload,
  type ToolDefinition,
} from '@domos/core';
import type { Session } from '../core/SessionManager.js';

const log = createLogger('DomOS:Security');

/**
 * Resultat de la verification de securite d'un tool call.
 */
export type SecurityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string }
  | { allowed: 'pending_approval'; approvalMessage: string };

/**
 * Middleware de securite pour les appels de tools.
 */
export class HITLSecurityMiddleware {
  private policy = new HITLPolicy();
  private blockedTools = new Set<string>();

  /**
   * Bloquer un tool (empecher son execution).
   */
  blockTool(name: string): void {
    this.blockedTools.add(name);
  }

  /**
   * Debloquer un tool.
   */
  unblockTool(name: string): void {
    this.blockedTools.delete(name);
  }

  /**
   * Verifier si un tool call est autorise.
   */
  check(session: Session, toolCall: ToolCallPayload): SecurityCheckResult {
    // 1. Verifier si le tool est bloque
    if (this.blockedTools.has(toolCall.name)) {
      log.warn(`Tool bloque: ${toolCall.name}`);
      return { allowed: false, reason: `Tool "${toolCall.name}" est bloque par le serveur` };
    }

    // 2. Verifier si le tool existe dans le registre de la session
    const tool = session.toolRegistry.get(toolCall.name);
    if (!tool) {
      log.warn(`Tool inconnu: ${toolCall.name} (session: ${session.id})`);
      return { allowed: false, reason: `Tool "${toolCall.name}" non disponible` };
    }

    // 3. Evaluer le risque
    const action = this.policy.evaluate(
      toolCall.callId,
      toolCall.name,
      tool.risk,
      toolCall.args
    );

    switch (action.type) {
      case 'execute':
      case 'execute_with_notification':
        return { allowed: true };

      case 'require_approval':
        return {
          allowed: 'pending_approval',
          approvalMessage: action.request.message,
        };

      default:
        return { allowed: true };
    }
  }
}
