import { SvelteComponent } from 'svelte';
import type { Snippet } from 'svelte';

interface OwlLayerToolBtnProps {
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  handler: () => unknown | Promise<unknown>;
  class?: string;
  disabled?: boolean;
  children: Snippet;
}

export default class OwlLayerToolBtn extends SvelteComponent<OwlLayerToolBtnProps> {}
