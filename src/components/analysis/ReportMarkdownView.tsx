import React from 'react';

interface ReportMarkdownViewProps {
  content: string;
}

/**
 * Custom lightweight Markdown Parser that renders rich React nodes
 * with Tailwind typography, styled section cards, bullet lists, and bold highlights.
 */
export const ReportMarkdownView: React.FC<ReportMarkdownViewProps> = ({ content }) => {
  if (!content) return null;

  // Split into blocks by double newlines or single newlines
  const lines = content.split('\n');

  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}_list`} className="space-y-2 my-3 pl-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-stone-700 text-sm leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-nature-600 mt-2 shrink-0" />
              <span className="flex-1">{parseInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`flush_${index}`);
      return;
    }

    // Horizontal Rule
    if (line === '---' || line === '***' || line === '___') {
      flushList(`hr_${index}`);
      elements.push(<hr key={`hr_${index}`} className="border-t border-nature-200/80 my-5" />);
      return;
    }

    // Headings: ### or ####
    if (line.startsWith('#### ')) {
      flushList(`h4_${index}`);
      const title = line.replace(/^####\s+/, '');
      elements.push(
        <h4 key={`h4_${index}`} className="text-sm font-bold text-stone-900 mt-4 mb-2 flex items-center gap-2">
          {parseInlineFormatting(title)}
        </h4>
      );
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`h3_${index}`);
      const title = line.replace(/^###\s+/, '');
      elements.push(
        <div
          key={`h3_${index}`}
          className="mt-6 mb-3 pt-3 pb-2 px-3.5 rounded-2xl bg-nature-50/80 border border-nature-200/60"
        >
          <h3 className="text-base font-extrabold text-nature-900 flex items-center gap-2">
            {parseInlineFormatting(title)}
          </h3>
        </div>
      );
      return;
    }

    if (line.startsWith('## ')) {
      flushList(`h2_${index}`);
      const title = line.replace(/^##\s+/, '');
      elements.push(
        <h2 key={`h2_${index}`} className="text-lg font-extrabold text-stone-900 mt-6 mb-2">
          {parseInlineFormatting(title)}
        </h2>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList(`h1_${index}`);
      const title = line.replace(/^#\s+/, '');
      elements.push(
        <h1 key={`h1_${index}`} className="text-xl font-black text-stone-900 mt-6 mb-3">
          {parseInlineFormatting(title)}
        </h1>
      );
      return;
    }

    // Bullet list items (- or * or •)
    if (/^[-*•]\s+/.test(line)) {
      const itemText = line.replace(/^[-*•]\s+/, '');
      currentList.push(itemText);
      return;
    }

    // Numbered lists: 1. 2.
    if (/^\d+\.\s+/.test(line)) {
      flushList(`num_${index}`);
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        const num = match[1];
        const text = match[2];
        elements.push(
          <div key={`num_${index}`} className="flex items-start gap-2.5 my-2 pl-1">
            <span className="w-5 h-5 rounded-lg bg-nature-100 text-nature-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {num}
            </span>
            <div className="text-sm text-stone-700 leading-relaxed flex-1">
              {parseInlineFormatting(text)}
            </div>
          </div>
        );
        return;
      }
    }

    // Blockquote or Disclaimer (starts with > or contains disclaimer)
    if (line.startsWith('> ') || /disclaimer/i.test(line)) {
      flushList(`quote_${index}`);
      const quoteText = line.replace(/^>\s*/, '');
      elements.push(
        <div
          key={`quote_${index}`}
          className="my-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1"
        >
          <div className="font-semibold">{parseInlineFormatting(quoteText)}</div>
        </div>
      );
      return;
    }

    // Regular Paragraph
    flushList(`p_${index}`);
    elements.push(
      <p key={`p_${index}`} className="text-sm text-stone-700 leading-relaxed my-2">
        {parseInlineFormatting(line)}
      </p>
    );
  });

  flushList('final_flush');

  return <div className="space-y-1">{elements}</div>;
};

/**
 * Parses inline bold (**text**), italic (*text* or _text_), and inline code (`text`)
 */
function parseInlineFormatting(text: string): React.ReactNode {
  // Tokenize by bold, italic, code
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex for bold: **...**, italic: *...*, code: `...`
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/;

  while (remaining.length > 0) {
    const match = remaining.match(regex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      parts.push(remaining.substring(0, matchIndex));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Bold
      const inner = match[2];
      parts.push(
        <strong key={`b_${keyIndex++}`} className="font-bold text-stone-900">
          {inner}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      // Italic
      const inner = match[3];
      parts.push(
        <em key={`i_${keyIndex++}`} className="italic text-stone-800">
          {inner}
        </em>
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      // Code
      const inner = match[4];
      parts.push(
        <code key={`c_${keyIndex++}`} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 font-mono text-xs">
          {inner}
        </code>
      );
    }

    remaining = remaining.substring(matchIndex + fullMatch.length);
  }

  return <>{parts}</>;
}
