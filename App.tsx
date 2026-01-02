
import React, { useState, useEffect, useRef } from 'react';
import { 
  Message, 
  ChatSession, 
  AssistantSettings,
  GroundingSource
} from './types';
import { geminiService } from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Moon, 
  Sun, 
  Trash2, 
  Terminal, 
  Cpu,
  AlertCircle,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  Search
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId]);

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
        title: input.slice(0, 30),
        messages: [],
        createdAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      targetSessionId = newId;
      setCurrentSessionId(newId);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => 
      s.id === targetSessionId 
        ? { ...s, messages: [...s.messages, userMsg], title: s.messages.length === 0 ? input.slice(0, 30) : s.title } 
        : s
    ));
    
    const userPrompt = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const history = sessions.find(s => s.id === targetSessionId)?.messages || [];
      const assistantMsgId = (Date.now() + 1).toString();
      
      // Inicializa a mensagem do assistente vazia
      setSessions(prev => prev.map(s => 
        s.id === targetSessionId 
          ? { ...s, messages: [...s.messages, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() }] } 
          : s
      ));

      const stream = geminiService.sendMessageStream(userPrompt, history, settings.isTechnicalMode);
      
      for await (const chunk of stream) {
        setSessions(prev => prev.map(s => 
          s.id === targetSessionId 
            ? { 
                ...s, 
                messages: s.messages.map(m => 
                  m.id === assistantMsgId 
                    ? { ...m, content: chunk.text, sources: chunk.sources } 
                    : m
                ) 
              } 
            : s
        ));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 font-sans transition-colors duration-200 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} fixed lg:static z-40 transition-all duration-300 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-medium shadow-lg shadow-brand-500/20 transition-all">
            <Plus size={18} /> Nova Conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.map(s => (
            <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
              <MessageSquare size={18} className="flex-shrink-0" />
              <span className="flex-1 truncate text-sm font-medium">{s.title || 'Sem título'}</span>
              <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-2">
          <button onClick={() => setSettings(s => ({...s, theme: s.theme === 'light' ? 'dark' : 'light'}))} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
            {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setSettings(s => ({...s, isTechnicalMode: !s.isTechnicalMode}))} className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter transition-all ${settings.isTechnicalMode ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 border border-purple-200 dark:border-purple-800' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
            <Cpu size={14} /> {settings.isTechnicalMode ? 'Modo Técnico' : 'Modo Geral'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Menu size={20} /></button>
            <h1 className="text-lg font-bold flex items-center gap-2"><Terminal size={20} className="text-brand-500" /> AI Assistente</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {!currentSession || currentSession.messages.length === 0 ? (
              <div className="py-20 text-center space-y-6">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-500 mx-auto"><Sparkles size={32} /></div>
                <h2 className="text-2xl font-bold">O que vamos criar hoje?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {["Explique o erro NullPointerException", "Crie um plano de estudos de Python", "Ideias para um app de receitas", "Como funciona o Google Search Grounding?"].map(t => (
                    <button key={t} onClick={() => setInput(t)} className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 text-left transition-all">"{t}"</button>
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl p-4 ${m.role === 'user' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10' : 'bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'}`}>
                    <div className="text-[10px] uppercase font-black opacity-40 mb-2 tracking-widest">{m.role === 'user' ? 'Você' : 'Assistente'}</div>
                    <MarkdownRenderer content={m.content || (isLoading && m.role === 'assistant' ? '...' : '')} isDark={settings.theme === 'dark'} />
                    
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase mb-2">
                          <Search size={12} /> Fontes da Pesquisa
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {m.sources.map((s, idx) => (
                            <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:text-brand-500 transition-colors">
                              <ExternalLink size={10} /> {s.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            <div ref={messagesEndRef} className="h-20" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-t from-white dark:from-gray-950 via-white dark:via-gray-950 to-transparent sticky bottom-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-end gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-2xl shadow-gray-200/50 dark:shadow-none focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
              placeholder="Digite sua dúvida aqui..."
              className="flex-1 bg-transparent border-none outline-none p-3 resize-none max-h-40 min-h-[44px]"
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || isLoading} className={`p-3 rounded-xl transition-all ${input.trim() && !isLoading ? 'bg-brand-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
