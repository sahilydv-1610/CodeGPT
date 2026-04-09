import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, Terminal, Bot, ChevronDown } from "lucide-react";
import ChatWindow from "./components/ChatWindow";
import Controls from "./components/Controls";
import { API_BASE_URL } from "./config/api";

// ─── Model Tier Colors ──────────────────────────────────────────────
const TIER_STYLES = {
  premium: { dot: "bg-violet-500", badge: "text-violet-400 bg-violet-500/10" },
  fast:    { dot: "bg-emerald-500", badge: "text-emerald-400 bg-emerald-500/10" },
  lite:    { dot: "bg-amber-500", badge: "text-amber-400 bg-amber-500/10" },
};

function App() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Hello! I'm CodeGPT. How can I help you write or debug code today?",
      type: "text",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [language, setLanguage] = useState("Auto");
  const [mode, setMode] = useState("generate");
  const [loading, setLoading] = useState(false);

  // ─── Model State ────────────────────────────────────────────────
  const DEFAULT_MODEL = "gemini-pro";
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [availableModels, setAvailableModels] = useState([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const modelPickerRef = useRef(null);

  const endOfMessagesRef = useRef(null);

  // Fetch available models on mount
  // Fetch available models from server (which discovers them from Gemini API)
  const fetchModels = () => {
    fetch(`${API_BASE_URL}/models`)
      .then((res) => res.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
        if (data.default) setSelectedModel(data.default);
      })
      .catch(() => {
        // Minimal fallback if server is unreachable
        setAvailableModels([
          { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "fast", free: true, description: "Fast & capable" },
        ]);
      });
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Close model picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const currentModel = useMemo(() => availableModels.find((m) => m.id === selectedModel) || { name: selectedModel, tier: "fast" }, [availableModels, selectedModel]);
  const tierStyle = useMemo(() => TIER_STYLES[currentModel.tier] || TIER_STYLES.fast, [currentModel.tier]);

  const handleGenerate = useCallback(async (e) => {
    e?.preventDefault();
    if ((!prompt.trim() && attachedFiles.length === 0) || loading) return;

    const userMessage = { role: "user", content: prompt, files: attachedFiles, type: "text" };
    const initialAiMessage = { role: "ai", content: "", type: "response" };
    
    setMessages((prev) => [...prev, userMessage, initialAiMessage]);
    setPrompt("");
    setAttachedFiles([]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          files: attachedFiles,
          language,
          mode,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to AI server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamFinished = false;

      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            
            if (dataStr === '[DONE]') {
              streamFinished = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content: newMessages[newMessages.length - 1].content + parsed.text
                  };
                  return newMessages;
                });
              } else if (parsed.error) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "ai",
                    content: `⚠️ Error: ${parsed.error}`,
                    type: "error",
                  };
                  return newMessages;
                });
              }
            } catch (err) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "ai",
          content: "Sorry, I encountered an error while processing your request. Please ensure the backend is running and you have a valid API key.",
          type: "error",
        };
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  }, [prompt, attachedFiles, language, mode, selectedModel, loading]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "ai",
        content: "Starting a fresh conversation. What's next?",
        type: "text",
      },
    ]);
  }, []);

  return (
    <div className="flex h-screen bg-[#343541] text-[#ececf1] font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[260px] bg-[#202123] border-r border-[#4d4d4f] shrink-0 p-3">
        <button
          onClick={clearChat}
          className="flex items-center gap-3 px-3 py-3 border border-white/20 rounded-md text-sm hover:bg-white/5 transition-colors text-white font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
        
        <div className="flex-1 mt-6">
          <p className="px-3 text-xs font-semibold text-slate-500 mb-2">History</p>
          <div className="flex flex-col gap-1">
             <div className="px-3 py-2 text-sm text-slate-300 bg-white/5 rounded-md truncate cursor-pointer">
               Current Conversation
             </div>
          </div>
        </div>
        
        {/* Model Selector in Sidebar */}
        <div className="border-t border-white/10 pt-3 mt-auto" ref={modelPickerRef}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Model</p>
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full ${tierStyle.dot} shrink-0`} />
              <span className="text-sm font-medium text-slate-200 truncate">{currentModel.name}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Picker Dropdown */}
          {showModelPicker && (
            <div className="absolute bottom-16 left-3 w-[236px] bg-[#2a2b32] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 model-picker-enter">
              <div className="p-2 border-b border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">Select Model</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1.5">
                {availableModels.map((m) => {
                  const style = TIER_STYLES[m.tier] || TIER_STYLES.fast;
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelPicker(false);
                      }}
                      className={`w-full flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className={`text-sm font-semibold ${isSelected ? "text-emerald-400" : "text-slate-200"}`}>
                          {m.name}
                        </span>
                        {m.free === false && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 leading-none">Paid</span>
                        )}
                        {m.free === true && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 leading-none">Free</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 ml-3.5">{m.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#343541] relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#4d4d4f] bg-[#343541] shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="text-emerald-500 w-5 h-5" />
            <h1 className="text-lg font-semibold tracking-tight">CodeGPT</h1>
          </div>
          <button onClick={clearChat} className="p-1.5 focus:outline-none">
            <Plus className="w-5 h-5 text-slate-300" />
          </button>
        </header>

        {/* Active model indicator bar (top of chat) */}
        <div className="flex items-center justify-center py-1.5 border-b border-white/5 bg-[#2f2f35] shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${tierStyle.dot}`} />
            <span className="text-xs font-medium text-slate-400">{currentModel.name}</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${tierStyle.badge}`}>
              {currentModel.tier}
            </span>
          </div>
        </div>

        {/* Chat Window Container */}
        <ChatWindow 
          messages={messages} 
          loading={loading} 
          endOfMessagesRef={endOfMessagesRef} 
        />

        {/* Floating Input Area */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#343541] via-[#343541] to-transparent pt-6">
          <div className="max-w-3xl mx-auto px-4 pb-4">
            <Controls
              prompt={prompt}
              setPrompt={setPrompt}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              language={language}
              setLanguage={setLanguage}
              mode={mode}
              setMode={setMode}
              handleGenerate={handleGenerate}
              loading={loading}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
