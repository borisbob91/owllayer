/**
 * Utilitaire de formatage Markdown sécurisé pour le widget OwlLayer Browser (vanilla/Preact).
 * Échappe le HTML brut puis convertit le markdown (gras, italique, code, listes, liens, etc.).
 */
export function formatMarkdown(text: string): string {
  if (!text) return '';

  // 1. Échappement des caractères spéciaux HTML contre les failles XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // 2. Blocs de code ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="owllayer-code-block"><code>${code.trim()}</code></pre>`;
  });

  // 3. Code en ligne `code`
  html = html.replace(/`([^`]+)`/g, '<code class="owllayer-inline-code">$1</code>');

  // 4. Gras **texte** ou __texte__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 5. Italique *texte* ou _texte_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // 6. Barré ~~texte~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 7. Liens sécurisés [texte](url) (uniquement http://, https://, mailto:, /)
  html = html.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="owllayer-link">$1</a>'
  );

  // 8. Listes à puces (- élément ou * élément)
  html = html.replace(/(?:^|\n)[-*]\s+([^\n]+)/g, '<div class="owllayer-list-item"><span class="owllayer-bullet">•</span><span>$1</span></div>');

  // 9. Listes numérotées (1. élément)
  html = html.replace(/(?:^|\n)(\d+)\.\s+([^\n]+)/g, '<div class="owllayer-list-item"><span class="owllayer-num">$1.</span><span>$2</span></div>');

  // 10. Retours à la ligne
  html = html.replace(/\n/g, '<br/>');

  return html;
}
