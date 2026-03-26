'use client';

import type { DomOSClientPlugin } from '@domos/core';
import { usePluginComponents } from './usePluginComponents.js';

export interface PluginRendererProps {
  /** Plugin dont on veut rendre un composant */
  plugin: DomOSClientPlugin<any>;
  /** Nom du composant tel que declare dans plugin.ui.components */
  component: string;
  /** Props transmises au composant */
  props?: Record<string, unknown>;
}

/**
 * PluginRenderer — Rendu declaratif d'un composant de plugin.
 *
 * Raccourci pour usePluginComponents + render inline.
 * Retourne null si le composant n'est pas declare dans le plugin.
 *
 * @example
 * ```tsx
 * <PluginRenderer
 *   plugin={BarChartReactPlugin}
 *   component="BarChart"
 *   props={{ data: salesData, title: "Ventes mensuelles" }}
 * />
 * ```
 */
export function PluginRenderer({ plugin, component, props = {} }: PluginRendererProps) {
  const components = usePluginComponents(plugin);
  const Component = components[component] as React.ComponentType<any> | undefined;

  if (!Component) return null;
  return <Component {...props} />;
}

// React est necessaire pour JSX
import React from 'react';
