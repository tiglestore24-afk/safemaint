
import React, { useState, useEffect, useRef } from 'react';
import { StorageService, KEYS } from '../services/storage';
import { ChatMessage } from '../types';
import { Send, Trash2, User, MessageSquare } from 'lucide-react';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = localStorage.getItem('safemaint_user') || 'ANÔNIMO';
  const currentRole = localStorage.getItem('safemaint_role') || 'OPERADOR';

  useEffect(() => {
    loadMessages();
    
    const handleUpdate = (e: any) => {
        if (e.detail?.key === KEYS.CHAT) {
            loadMessages();
        }
    };

    window.addEventListener('safemaint_storage_update', handleUpdate);
    return () => window.removeEventListener('safemaint_storage_update', handleUpdate);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    setMessages(StorageService.getChatMessages());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: currentUser.toUpperCase(),
        role: currentRole,
        text: inputText.toUpperCase(),
        timestamp: new Date().toISOString()
    };

    StorageService.sendChatMessage(newMessage);
    setInputText('');
  };

  const handleClear = () => {
      if(window.confirm("Limpar todo o histórico de conversa?")) {
          StorageService.clearChat();
      }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
            <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                    <MessageSquare className="text-vale-green" />
                    Canal Interno
                </h2>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronização Local de Terminal</p>
                </div>
            </div>
            {currentRole === 'ADMIN' && (
                <button onClick={handleClear} className="text-red-500 hover:text-red-700 font-black text-[10px] uppercase flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    <Trash2 size={14} /> Limpar
                </button>
            )}
        </div>

        <div className="flex-1 bg-white rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50">
                        <MessageSquare size={64} className="mb-4" />
                        <p className="font-black text-xs uppercase tracking-[0.3em]">Histórico de mensagens vazio</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender.toUpperCase() === currentUser.toUpperCase();
                        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                                    isMe 
                                    ? 'bg-vale-green text-white rounded-tr-none' 
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                }`}>
                                    <div className={`flex justify-between items-baseline gap-4 mb-2 border-b pb-1 ${isMe ? 'border-white/10' : 'border-gray-100'}`}>
                                        <span className={`text-[9px] font-black uppercase ${isMe ? 'text-teal-100' : 'text-vale-blue'}`}>
                                            {msg.sender} <span className="opacity-60 text-[8px]">({msg.role})</span>
                                        </span>
                                        <span className={`text-[8px] font-mono ${isMe ? 'text-teal-200' : 'text-gray-400'}`}>{time}</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap uppercase">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="flex gap-2">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="DIGITE SUA MENSAGEM..."
                            className="w-full pl-5 pr-12 py-4 rounded-2xl border-2 border-gray-100 focus:border-vale-green focus:bg-gray-50 font-bold uppercase text-xs outline-none transition-all shadow-inner"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                           <User size={20} />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-vale-green hover:bg-[#00605d] disabled:bg-gray-200 text-white px-8 rounded-2xl font-black flex items-center justify-center transition-all active:scale-95 shadow-lg"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
