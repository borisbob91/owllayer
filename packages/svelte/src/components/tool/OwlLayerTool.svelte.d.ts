import { SvelteComponent } from 'svelte';
import type { Snippet } from 'svelte';

interface OwlLayerToolProps {
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
  handler?: () => unknown | Promise<unknown>;
  children: Snippet;
}

export default class OwlLayerTool extends SvelteComponent<OwlLayerToolProps> {}
