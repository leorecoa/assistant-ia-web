
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Message, 
  ChatSession, 
  AssistantSettings 
} from './types';
import { geminiService } from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Settings, 
  Moon, 
  Sun, 
  Trash2, 
  Terminal, 
  Cpu,
  AlertCircle,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('ai_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    const saved = localStorage.getItem('ai_settings');
    return saved ? JSON.parse(saved) : { isTechnicalMode: false, theme: 'light' };
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('ai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setError(null);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      targetSessionId = newId;
      setCurrentSessionId(newId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => 
      s.id === targetSessionId 
        ? { ...s, messages: [...s.messages, userMessage], title: s.messages.length === 0 ? input.slice(0, 30) : s.title } 
        : s
    ));
    
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const history = sessions.find(s => s.id === targetSessionId)?.messages || [];
      const aiResponse = await geminiService.sendMessage(input, history, settings.isTechnicalMode);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setSessions(prev => prev.map(s => 
        s.id === targetSessionId 
          ? { ...s, messages: [...s.messages, assistantMessage] } 
          : s
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const toggleTechnicalMode = () => {
    setSettings(prev => ({ ...prev, isTechnicalMode: !prev.isTechnicalMode }));
  };

  return (
    <div className={`flex h-screen bg-white dark:bg-gray-950 font-sans transition-colors duration-200`}>
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } fixed lg:static z-40 transition-all duration-300 h-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col`}
      >
        <div className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2.5 px-4 rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={18} />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Sparkles className="mx-auto text-gray-300 dark:text-gray-700 mb-2" size={32} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa ainda. Comece uma agora!</p>
            </div>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  currentSessionId === s.id 
                    ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <MessageSquare size={18} className="flex-shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{s.title}</span>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 rounded transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
              title="Alternar Tema"
            >
              {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={toggleTechnicalMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                settings.isTechnicalMode 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title="Modo Resposta Técnica"
            >
              <Cpu size={16} />
              <span>{settings.isTechnicalMode ? 'Técnico' : 'Geral'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Terminal size={20} className="text-brand-500" />
                AI Assistente Geral
              </h1>
              {settings.isTechnicalMode && (
                <span className="text-[10px] uppercase tracking-widest text-purple-500 font-bold -mt-1">Modo Técnico Ativo</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Indicators can go here */}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-0">
          <div className="max-w-4xl mx-auto space-y-8">
            {!currentSession || currentSession.messages.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-500">
                  <Cpu size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Como posso ajudar hoje?</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mt-2 mx-auto">
                    Sou seu assistente inteligente. Posso ajudar com códigos, estudos, explicar erros complexos ou apenas conversar.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                  {[
                    "Explique o que é Clean Architecture",
                    "Como corrigir erro 404 no FastAPI?",
                    "Dicas para estudar para prova de cálculo",
                    "Gere 5 ideias de posts para LinkedIn"
                  ].map(prompt => (
                    <button 
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-sm text-gray-600 dark:text-gray-400"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map(m => (
                <div 
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-brand-500 text-white rounded-tr-none' 
                      : 'bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 opacity-60 text-[11px] font-bold uppercase tracking-wider">
                      {m.role === 'user' ? 'Você' : 'Assistente AI'}
                    </div>
                    <div className="leading-relaxed">
                      {m.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <MarkdownRenderer content={m.content} isDark={settings.theme === 'dark'} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-none p-4 flex gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/30">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                  <button onClick={() => setError(null)} className="ml-2 hover:underline">Fechar</button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 lg:p-6 bg-gradient-to-t from-white dark:from-gray-950 via-white dark:via-gray-950 to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <form 
              onSubmit={handleSendMessage}
              className="relative flex items-end gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 pl-4 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all shadow-xl shadow-gray-200/50 dark:shadow-none"
            >
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Pergunte qualquer coisa..."
                className="w-full bg-transparent border-none outline-none resize-none py-3 max-h-48 min-h-[44px] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                rows={1}
                autoFocus
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  input.trim() && !isLoading 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </form>
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-2">
              Gemini AI pode cometer erros. Considere verificar informações importantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
