import { h, render } from 'preact';
import type { ApprovalRequest, HitlLabels } from '@owllayer/core';

interface PendingApprovalView {
  request: ApprovalRequest;
  resolve: (approved: boolean) => void;
  labels: HitlLabels;
}

function Overlay(props: PendingApprovalView) {
  const riskLabel = props.request.risk === 'critical' ? 'CRITIQUE' : 'IMPORTANT';
  const accent = props.request.risk === 'critical' ? '#dc2626' : '#f59e0b';
  const toolLabel = props.labels.toolLabels?.[props.request.toolName] ?? props.request.toolName;

  return h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: '0',
        background: 'rgba(15, 23, 42, 0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '2147483647',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      },
    },
    h(
      'div',
      {
        style: {
          width: 'min(92vw, 520px)',
          background: '#ffffff',
          borderRadius: '14px',
          border: `1px solid ${accent}`,
          boxShadow: '0 20px 80px rgba(2, 6, 23, 0.35)',
          overflow: 'hidden',
        },
      },
      h(
        'div',
        {
          style: {
            padding: '16px 20px',
            borderBottom: `1px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          },
        },
        h(
          'span',
          {
            style: {
              background: accent,
              color: '#fff',
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em',
            },
          },
          riskLabel,
        ),
        h('strong', null, props.labels.title ?? 'Confirmation requise'),
      ),
      h(
        'div',
        { style: { padding: '18px 20px' } },
        h('p', { style: { margin: '0 0 8px', color: '#0f172a' } }, props.labels.message ?? props.request.message),
        h(
          'pre',
          {
            style: {
              margin: '0',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
          },
          `${toolLabel}(${JSON.stringify(props.request.args, null, 2)})`,
        ),
      ),
      h(
        'div',
        {
          style: {
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          },
        },
        h(
          'button',
          {
            type: 'button',
            onClick: () => props.resolve(false),
            style: {
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: 600,
            },
          },
          props.labels.deny ?? 'Refuser',
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: () => props.resolve(true),
            style: {
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: 700,
            },
          },
          props.labels.approve ?? 'Approuver',
        ),
      ),
    ),
  );
}

export class HitlOverlay {
  private host: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private pending: PendingApprovalView | null = null;
  private readonly labels: HitlLabels;

  constructor(labels: HitlLabels = {}) {
    this.labels = labels;
  }

  mount(): void {
    if (typeof document === 'undefined' || this.host) return;
    this.host = document.createElement('div');
    this.host.setAttribute('data-owllayer-hitl-overlay', 'browser');
    document.body.appendChild(this.host);
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
    this.update();
  }

  show(request: ApprovalRequest, resolve: (approved: boolean) => void): void {
    this.pending = {
      request,
      labels: this.labels,
      resolve: (approved: boolean) => {
        resolve(approved);
        this.pending = null;
        this.update();
      },
    };
    this.update();
  }

  unmount(): void {
    if (!this.host) return;
    render(null, this.shadowRoot!);
    this.host.remove();
    this.host = null;
    this.shadowRoot = null;
    this.pending = null;
  }

  private update(): void {
    if (!this.shadowRoot) return;
    if (!this.pending) {
      render(null, this.shadowRoot);
      return;
    }
    render(h(Overlay, this.pending), this.shadowRoot);
  }
}
