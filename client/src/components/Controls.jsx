import React, { useRef, useEffect, useState } from "react";
import { Send, Settings2, Paperclip, X, FileText, Cpu, ChevronUp } from "lucide-react";

const LANGUAGES = [
  "Auto",
  "React",
  "HTML",
  "JavaScript",
  "Python"
];

const Controls = ({
  prompt,
  setPrompt,
  attachedFiles,
  setAttachedFiles,
  language,
  setLanguage,
  mode,
  setMode,
  handleGenerate,
  loading,
  selectedModel,
  setSelectedModel,
  availableModels,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const modelDropRef = useRef(null);
  const [showModelDrop, setShowModelDrop] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target)) {
        setShowModelDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate(e);
    }
  };

  const onSubmit = (selectedMode) => (e) => {
    e.preventDefault();
    setMode(selectedMode);
    setTimeout(() => handleGenerate(e), 0);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          type: file.type || 'text/plain',
          base64: event.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const currentModel = (availableModels || []).find(m => m.id === selectedModel);
  const modelLabel = currentModel?.name || selectedModel || "Gemini 2.5 Flash";

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-3xl flex flex-col bg-[#40414f] border border-white/10 rounded-2xl p-2 shadow-md">
        
        {/* Render Attachments Chips */}
        {attachedFiles && attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
            {attachedFiles.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[#202123] px-3 py-1.5 rounded-lg border border-white/5 text-xs text-slate-300">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold truncate max-w-[120px]">{f.name}</span>
                <button 
                  onClick={() => removeFile(idx)} 
                  className="hover:text-red-400 focus:outline-none transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end w-full gap-1">
          
          {/* Paperclip Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none shrink-0 mb-0.5"
            title="Attach file"
          >
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.csv"
            />
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            placeholder="Message CodeGPT..."
            className="flex-1 min-w-0 bg-transparent text-[#ececf1] placeholder:text-[#8e8ea0] resize-none focus:outline-none py-2.5 text-[15px] scroll-smooth custom-scrollbar"
            rows="1"
          />

          {/* Send Button */}
          <button
            onClick={onSubmit("generate")}
            disabled={(!prompt.trim() && attachedFiles.length === 0) || loading}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:bg-transparent shadow-sm flex items-center justify-center cursor-pointer shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 mb-1 text-xs text-[#8e8ea0] w-full max-w-3xl px-1 flex-wrap">
        
        {/* Model Quick Switcher (Mobile-friendly) */}
        <div className="relative" ref={modelDropRef}>
          <button
            onClick={() => setShowModelDrop(!showModelDrop)}
            disabled={loading}
            className="flex items-center gap-1.5 hover:text-[#ececf1] transition-colors cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium">{modelLabel}</span>
            <ChevronUp className={`w-3 h-3 transition-transform ${showModelDrop ? '' : 'rotate-180'}`} />
          </button>

          {showModelDrop && (
            <div className="absolute bottom-full mb-2 left-0 w-[260px] bg-[#2a2b32] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden model-picker-enter">
              <div className="p-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                {(availableModels || []).map((m) => {
                  const isSelected = m.id === selectedModel;
                  const dotColor = m.tier === "premium" ? "bg-violet-500" : m.tier === "lite" ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelDrop(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isSelected ? "bg-emerald-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[13px] font-semibold truncate ${isSelected ? "text-emerald-400" : "text-slate-200"}`}>
                            {m.name}
                          </span>
                          {m.free === false && (
                            <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 leading-none shrink-0">Paid</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 truncate">{m.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <span className="text-slate-600">|</span>
        
        <div className="flex items-center gap-1.5">
           <Settings2 className="w-3.5 h-3.5" />
           <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="bg-transparent hover:text-[#ececf1] cursor-pointer focus:outline-none appearance-none"
           >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-[#40414f] text-[#ececf1]">{lang}</option>
              ))}
           </select>
        </div>

        <span className="ml-auto text-[11px] text-slate-600 hidden sm:inline">
          CodeGPT can make mistakes. Verify important code.
        </span>
      </div>
    </div>
  );
};

export default Controls;
