
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isDark }) => {
  return (
    <ReactMarkdown
      className="prose dark:prose-invert max-w-none prose-pre:p-0"
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="relative group">
              <SyntaxHighlighter
                style={isDark ? vscDarkPlus : vs}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !my-0 border border-gray-200 dark:border-gray-700"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
              <button
                onClick={() => navigator.clipboard.writeText(String(children))}
                className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                Copiar
              </button>
            </div>
          ) : (
            <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-brand-600 dark:text-brand-400 font-mono`} {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
