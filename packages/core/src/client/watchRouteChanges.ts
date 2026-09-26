import type { OwlLayerClient } from './OwlLayerClient.js';

/**
 * Synchroniser la page courante avec le serveur lors des navigations cote client.
 *
 * Les routeurs (Vue Router, SvelteKit, Angular Router, routeurs vanilla) utilisent
 * history.pushState/replaceState, qui ne declenchent pas popstate : on les enveloppe
 * pour detecter ces navigations. Un CONTEXT_UPDATE n'est envoye que si le chemin
 * change (query et hash ignores) et qu'une session est etablie, meme si l'agent est
 * occupe (navigation declenchee par un tool).
 *
 * Retourne une fonction de nettoyage. Sans window (SSR), ne fait rien.
 */
export function watchRouteChanges(
  client: Pick<OwlLayerClient, 'sessionId' | 'syncToolsWithServer'>
): () => void {
  if (typeof window === 'undefined' || !window.history) {
    return () => {};
  }

  let lastPath = window.location.pathname;
  const handleUrlChange = () => {
    const path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    if (client.sessionId !== null) {
      client.syncToolsWithServer();
    }
  };

  const { history } = window;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  const patchedPushState: History['pushState'] = function (this: History, ...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };
  const patchedReplaceState: History['replaceState'] = function (this: History, ...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };
  history.pushState = patchedPushState;
  history.replaceState = patchedReplaceState;
  window.addEventListener('popstate', handleUrlChange);

  return () => {
    window.removeEventListener('popstate', handleUrlChange);
    // Ne pas ecraser un wrapper pose apres le notre par une autre bibliotheque
    if (history.pushState === patchedPushState) history.pushState = originalPushState;
    if (history.replaceState === patchedReplaceState) history.replaceState = originalReplaceState;
  };
}
