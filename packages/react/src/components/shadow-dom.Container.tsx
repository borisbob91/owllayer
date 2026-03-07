import { useRef, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * ShadowContainer - Isole les composants DomOS dans un Shadow DOM ferme.
 *
 * Garantit que :
 * 1. Le CSS du site hote ne casse pas l'UI DomOS
 * 2. L'IA ne peut pas manipuler les elements de securite (boutons de confirmation)
 *    car ils vivent dans le Shadow DOM, pas le Light DOM
 */
export function ShadowContainer({ children, styles }: { children: ReactNode; styles?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    if (!hostRef.current || shadowRootRef.current) return;

    // Creer le Shadow DOM ferme
    const shadow = hostRef.current.attachShadow({ mode: 'closed' });
    shadowRootRef.current = shadow;

    // Injecter les styles
    if (styles) {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      shadow.appendChild(styleEl);
    }

    // Creer le container React dans le Shadow DOM
    const container = document.createElement('div');
    container.id = 'domos-shadow-root';
    shadow.appendChild(container);

    reactRootRef.current = createRoot(container);

    return () => {
      const host = hostRef.current;
      // En StrictMode dev, React demonte/remonte les effets sans retirer le host du DOM.
      // On n'unmount que si le host est vraiment detache.
      if (host && host.isConnected) return;
      // Defer unmount to avoid "synchronously unmount while rendering" warning.
      // React may still be in a render cycle when this cleanup fires.
      const root = reactRootRef.current;
      reactRootRef.current = null;
      shadowRootRef.current = null;
      setTimeout(() => root?.unmount(), 0);
    };
  }, []);

  // Re-render les children dans le Shadow DOM
  useEffect(() => {
    reactRootRef.current?.render(children);
  }, [children]);

  return <div ref={hostRef} style={{ position: 'fixed', zIndex: 999999 }} />;
}
