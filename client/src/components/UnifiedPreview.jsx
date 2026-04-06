import React, { useState, useMemo } from "react";
import { Play, X, Maximize2, Minimize2, RotateCcw, Smartphone, Monitor, Tablet } from "lucide-react";

const UnifiedPreview = ({ codeBlocks }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [viewportMode, setViewportMode] = useState("desktop"); // desktop, tablet, mobile
  const [refreshKey, setRefreshKey] = useState(0);

  // Build one unified HTML document from all code blocks
  const unifiedDoc = useMemo(() => {
    let htmlParts = [];
    let cssParts = [];
    let jsParts = [];

    codeBlocks.forEach(({ language, content }) => {
      const lang = (language || "").toLowerCase();
      if (lang === "html") {
        htmlParts.push(content);
      } else if (lang === "css") {
        cssParts.push(content);
      } else if (lang === "javascript" || lang === "js" || lang === "jsx" || lang === "ts" || lang === "typescript") {
        jsParts.push(content);
      } else if (lang === "svg" || lang === "xml") {
        htmlParts.push(content);
      }
    });

    // If there's a full HTML doc (<!DOCTYPE or <html>), try to inject CSS/JS into it
    const fullHtmlBlock = htmlParts.find(
      (h) => h.trim().toLowerCase().startsWith("<!doctype") || h.trim().toLowerCase().startsWith("<html")
    );

    if (fullHtmlBlock) {
      let doc = fullHtmlBlock;

      // Inject collected CSS into <head>
      if (cssParts.length > 0) {
        const cssInsert = `<style>\n${cssParts.join("\n\n")}\n</style>`;
        if (doc.includes("</head>")) {
          doc = doc.replace("</head>", `${cssInsert}\n</head>`);
        } else if (doc.includes("<body")) {
          doc = doc.replace("<body", `<head>${cssInsert}</head>\n<body`);
        } else {
          doc = cssInsert + "\n" + doc;
        }
      }

      // Inject collected JS before </body>
      if (jsParts.length > 0) {
        const jsInsert = `<script>\n${jsParts.join("\n\n")}\n<\/script>`;
        if (doc.includes("</body>")) {
          doc = doc.replace("</body>", `${jsInsert}\n</body>`);
        } else {
          doc += `\n${jsInsert}`;
        }
      }

      return doc;
    }

    // No full HTML doc — build one from scratch
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${cssParts.join("\n\n")}
  </style>
</head>
<body>
  ${htmlParts.join("\n\n")}
  <script>
    ${jsParts.join("\n\n")}
  <\/script>
</body>
</html>`;
  }, [codeBlocks]);

  // Only show if there are previewable blocks
  const hasPreviewable = codeBlocks.some(({ language }) => {
    const l = (language || "").toLowerCase();
    return ["html", "css", "javascript", "js", "jsx", "svg", "xml"].includes(l);
  });

  if (!hasPreviewable) return null;

  const viewportWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  return (
    <>
      {/* Unified Preview Button */}
      <button
        onClick={() => setShowPreview(true)}
        className="unified-preview-btn"
      >
        <Play className="w-4 h-4" />
        <span>Preview Complete Code</span>
        <span className="unified-preview-badge">{codeBlocks.length} files</span>
      </button>

      {/* Full-screen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-6xl h-[90vh] bg-[#1a1a1e] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#232328] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-125 transition-all"
                    title="Close"
                  />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 ml-2">
                  <Play className="w-4 h-4" />
                  Unified Preview
                </div>

                <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {codeBlocks.length} code blocks merged
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Viewport selector */}
                <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewportMode("mobile")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewportMode === "mobile"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Mobile"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewportMode("tablet")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewportMode === "tablet"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Tablet"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewportMode("desktop")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewportMode === "desktop"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Desktop"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Refresh */}
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Refresh preview"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Close */}
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview iframe area */}
            <div className="flex-1 flex items-start justify-center overflow-auto bg-[#111113] p-4">
              <div
                className="h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
                style={{ width: viewportWidths[viewportMode], maxWidth: "100%" }}
              >
                <iframe
                  key={refreshKey}
                  srcDoc={unifiedDoc}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-modals"
                  title="Unified Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedPreview;
