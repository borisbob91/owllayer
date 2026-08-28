/**
 * Utilitaire de rendu Markdown sécurisé et léger pour les bulles de dialogue de l'assistant.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderMarkdown(rawText: string): string {
  if (!rawText) return '';

  // 1. Échappement HTML préalable (sécurité XSS)
  let text = escapeHtml(rawText);

  // 2. Normalisation des listes à puces inline produites par certains LLMs
  // Ex: "Voici les options : - **Hôtel** ... - **Villa** ..." -> saut de ligne avant chaque puce
  text = text.replace(/([^\n])\s+[\*\-]\s+(\*\*|\w)/g, '$1\n- $2');

  // 3. Blocs de code (```lang ... ```)
  text = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="chat-code-block"><code>${code.trim()}</code></pre>`;
  });

  // 4. Code inline (`code`)
  text = text.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');

  // 5. Gras (**texte** ou __texte__)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="chat-bold">$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong class="chat-bold">$1</strong>');

  // 6. Italique (*texte* ou _texte_)
  text = text.replace(/\*([^\*\n]+)\*/g, '<em class="chat-italic">$1</em>');
  text = text.replace(/_([^_\n]+)_/g, '<em class="chat-italic">$1</em>');

  // 7. Liens [texte](url)
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );

  // 8. Transformation des lignes en listes ou paragraphes
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const listMatch = line.match(/^[\*\-]\s+(.*)$/);

    if (listMatch) {
      if (!inList) {
        result.push('<ul class="chat-list">');
        inList = true;
      }
      result.push(`<li class="chat-list-item"><span class="chat-bullet">•</span><span>${listMatch[1]}</span></li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line.length > 0) {
        result.push(i > 0 && result.length > 0 ? `<div class="chat-paragraph">${line}</div>` : `<div>${line}</div>`);
      }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('');
}
