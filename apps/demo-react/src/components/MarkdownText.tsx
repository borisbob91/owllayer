import { renderMarkdown } from '../utils/markdown';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

export function MarkdownText({ content, className = '' }: MarkdownTextProps) {
  const html = renderMarkdown(content);
  return (
    <div
      className={`leading-relaxed break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
