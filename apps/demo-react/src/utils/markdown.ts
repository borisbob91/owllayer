/**
 * Utilitaire de rendu Markdown léger et sécurisé (anti-XSS) pour les messages du chat React.
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
  text = text.replace(/([^\n])\s+\*\s+(\*\*|\w)/g, '$1\n* $2');
  text = text.replace(/([^\n])\s+-\s+(\*\*|\w)/g, '$1\n- $2');

  // 3. Blocs de code (```lang ... ```)
  text = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="my-2 p-2.5 bg-slate-950/90 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800"><code>${code.trim()}</code></pre>`;
  });

  // 4. Code inline (`code`)
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-950/70 text-emerald-300 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-800/80">$1</code>');

  // 5. Gras (**texte** ou __texte__)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>');

  // 6. Italique (*texte* ou _texte_)
  text = text.replace(/\*([^\*\n]+)\*/g, '<em class="italic text-gray-700">$1</em>');
  text = text.replace(/_([^_\n]+)_/g, '<em class="italic text-gray-700">$1</em>');

  // 7. Liens [texte](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-owllayer-600 underline hover:text-owllayer-500">$1</a>');

  // 8. Transformation des lignes en listes ou paragraphes
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const listMatch = line.match(/^[\*\-]\s+(.*)$/);

    if (listMatch) {
      if (!inList) {
        result.push('<ul class="my-1.5 space-y-1 list-none pl-1">');
        inList = true;
      }
      result.push(`<li class="flex items-start gap-1.5"><span class="text-owllayer-500 select-none leading-relaxed">•</span><span>${listMatch[1]}</span></li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line.length > 0) {
        result.push(i > 0 && result.length > 0 ? `<div class="mt-1">${line}</div>` : `<div>${line}</div>`);
      }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('');
}
