import { RiskLevel } from '../tools/types.js';
import type { ApprovalRequest } from './hitl.types.js';
import { generateId } from '../utils/uuid.js';

/**
 * Action a prendre selon le niveau de risque.
 */
export type SecurityAction =
  | { type: 'execute' }
  | { type: 'execute_with_notification'; message: string }
  | { type: 'require_approval'; request: ApprovalRequest };

/**
 * SecurityPolicy - Determine l'action a prendre avant d'executer un tool.
 *
 * @example
 * ```ts
 * const policy = new HITLPolicy();
 * const action = policy.evaluate('delete_account', RiskLevel.HIGH, { confirmed: true });
 *
 * if (action.type === 'require_approval') {
 *   showApprovalModal(action.request);
 * }
 * ```
 */
export class HITLPolicy {
  /**
   * Evaluer un appel de tool et determiner l'action a prendre.
   */
  evaluate(
    callId: string,
    toolName: string,
    risk: RiskLevel,
    args: Record<string, unknown>
  ): SecurityAction {
    switch (risk) {
      case RiskLevel.NONE:
        return { type: 'execute' };

      case RiskLevel.LOW:
        return {
          type: 'execute_with_notification',
          message: `L'assistant a execute : ${toolName}`,
        };

      case RiskLevel.HIGH:
        return {
          type: 'require_approval',
          request: this.createApprovalRequest(
            callId,
            toolName,
            args,
            risk,
            `L'assistant souhaite executer "${toolName}". Confirmer ?`
          ),
        };

      case RiskLevel.CRITICAL:
        return {
          type: 'require_approval',
          request: this.createApprovalRequest(
            callId,
            toolName,
            args,
            risk,
            `ACTION CRITIQUE : L'assistant souhaite executer "${toolName}". ` +
            `Cette action est irreversible. Etes-vous certain ?`
          ),
        };

      default:
        return { type: 'execute' };
    }
  }

  private createApprovalRequest(
    callId: string,
    toolName: string,
    args: Record<string, unknown>,
    risk: RiskLevel,
    message: string
  ): ApprovalRequest {
    return {
      id: generateId(),
      callId,
      toolName,
      args,
      risk,
      message,
      requestedAt: Date.now(),
    };
  }
}
