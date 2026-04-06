import React, { useState } from "react";
import { Copy, Check, Download, Play, X } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const PREVIEWABLE = ["html", "css", "javascript", "js", "svg", "xml"];

const CodeBlock = ({ language, content }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const canPreview = PREVIEWABLE.includes((language || "").toLowerCase());

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const blob = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(blob);
    element.download = `snippet.${language || 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const buildPreviewDoc = () => {
    const lang = (language || "").toLowerCase();
    if (lang === "html") return content;
    if (lang === "css") return `<!DOCTYPE html><html><head><style>${content}</style></head><body><div class="demo">CSS Preview</div></body></html>`;
    if (lang === "javascript" || lang === "js") return `<!DOCTYPE html><html><head></head><body><script>${content}<\/script></body></html>`;
    if (lang === "svg" || lang === "xml") return `<!DOCTYPE html><html><body>${content}</body></html>`;
    return content;
  };

  return (
    <>
      <div className="rounded-md overflow-hidden bg-[#1e1e1e] my-4 border border-white/10 shadow-sm text-[14px]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-[#b4b4b4] text-xs font-sans">
          <span className="flex gap-2 items-center">
              <span className="opacity-80 lowercase font-semibold">{language || "text"}</span>
          </span>
          <div className="flex items-center gap-3">
            {canPreview && (
              <button
                onClick={() => setShowPreview(true)}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-emerald-500/70"
                title="Live Preview"
              >
                <Play className="w-3.5 h-3.5" />
                Preview
              </button>
            )}
            <button
              onClick={handleCopy}
              className="hover:text-[#ececf1] transition-colors flex items-center gap-1.5"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy code"}
            </button>
            <button
              onClick={handleDownload}
              className="hover:text-[#ececf1] transition-colors flex items-center gap-1.5"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <SyntaxHighlighter
            language={language || "text"}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.875rem",
            }}
            wrapLines={true}
          >
             {content || "// Empty stream"}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Live Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[80vh] bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#2d2d2d] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <Play className="w-4 h-4" />
                Live Preview
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* iframe */}
            <iframe
              srcDoc={buildPreviewDoc()}
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts"
              title="Live Preview"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(CodeBlock);
