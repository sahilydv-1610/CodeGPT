import React, { useMemo } from "react";
import { User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";
import UnifiedPreview from "./UnifiedPreview";

/**
 * Extracts all fenced code blocks (with language) from a markdown string.
 * Returns an array of { language, content }.
 */
const extractCodeBlocks = (markdown) => {
  const blocks = [];
  const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ language: match[1] || "", content: match[2].replace(/\n$/, "") });
  }
  return blocks;
};

const ChatWindow = ({ messages, loading, endOfMessagesRef }) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar w-full">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          // Skip rendering empty AI streaming placeholder messages
          if (!isUser && !message.content && message.type !== "error") return null;

          // Extract code blocks for unified preview (only for AI messages with content)
          const codeBlocks =
            !isUser && message.content && message.type !== "error"
              ? extractCodeBlocks(message.content)
              : [];

          const hasMultiplePreviewable = codeBlocks.filter(({ language }) => {
            const l = (language || "").toLowerCase();
            return ["html", "css", "javascript", "js", "jsx", "svg", "xml"].includes(l);
          }).length >= 1;

          return (
            <div
              key={index}
              className={`flex gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar for AI */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Message Content */}
              <div
                className={`flex flex-col ${isUser
                    ? "bg-[#2f2f35] text-[#ececf1] px-5 py-3 rounded-3xl max-w-[85%] sm:max-w-[75%] leading-relaxed"
                    : "text-[#ececf1] w-full min-w-0" // AI is text directly in column
                  }`}
              >
                {/* Error handling text */}
                {message.type === "error" && (
                  <div className="text-red-400 bg-red-950/30 p-4 rounded-xl border border-red-500/20 w-fit">
                    {message.content}
                  </div>
                )}

                {/* Standard text / Markdown Stream */}
                {message.content && message.type !== "error" && (
                  <div className={`markdown-body break-words ${!isUser && 'leading-7 mt-1 text-[15px]'}`}>
                    {isUser ? (
                      <div className="flex flex-col">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        {/* Render User Attached File Chips */}
                        {message.files && message.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {message.files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5 text-xs text-slate-200">
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-semibold truncate max-w-[150px]">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, children, ...props }) => {
                            // If children contain block elements (like CodeBlock's div), 
                            // we must render them in a div, not a p.
                            return <div className="mb-4 last:mb-0" {...props}>{children}</div>
                          },
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';

                            return !inline ? (
                              <CodeBlock
                                language={language}
                                content={String(children).replace(/\n$/, '')}
                              />
                            ) : (
                              <code className="bg-[#40414f] px-1.5 py-0.5 rounded-md text-sm text-emerald-400 font-mono" {...props}>
                                {children}
                              </code>
                            )
                          },
                          img: ({ node, src, alt, ...props }) => {
                            // Auto-encode the URL to fix spaces the AI might leave in
                            const fixedSrc = src ? encodeURI(decodeURI(src)) : src;
                            return <img src={fixedSrc} alt={alt} className="max-w-full rounded-2xl shadow-xl my-4 border border-white/10" loading="lazy" />
                          },
                          a: ({ node, ...props }) => <a className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                          table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-[#4d4d4f]"><table className="w-full text-left border-collapse text-sm" {...props} /></div>,
                          th: ({ node, ...props }) => <th className="bg-[#2a2b32] border-b border-[#4d4d4f] px-4 py-3 font-semibold text-slate-200" {...props} />,
                          td: ({ node, ...props }) => <td className="border-b border-[#4d4d4f] px-4 py-3 text-slate-300 bg-[#343541]" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-2 italic opacity-90 my-4 bg-[#2a2b32] rounded-r-lg" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 space-y-1.5 my-3" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-1.5 my-3" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-white" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-white" {...props} />
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                )}

                {/* Unified Preview Button — shown after the full AI message */}
                {hasMultiplePreviewable && !loading && (
                  <UnifiedPreview codeBlocks={codeBlocks} />
                )}
              </div>

            </div>
          );
        })}

        {loading && !messages.some((m, i) => i > 0 && m.role === "ai" && m.content && i === messages.length - 1) && (
          <div className="flex gap-4 w-full justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} className="h-30" />
      </div>
    </div>
  );
};

export default React.memo(ChatWindow);
