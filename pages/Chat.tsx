
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ChatMessage } from '../types';
import { Send, Trash2, User, MessageSquare } from 'lucide-react';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User Identity
  const currentUser = localStorage.getItem('safemaint_user') || 'ANÔNIMO';
  const currentRole = localStorage.getItem('safemaint_role') || 'OPERADOR';

  useEffect(() => {
    loadMessages();
    window.addEventListener('safemaint_chat_update', loadMessages);

    return () => {
        window.removeEventListener('safemaint_chat_update', loadMessages);
    };
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
        sender: currentUser,
        role: currentRole,
        text: inputText,
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
            <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <MessageSquare className="text-green-600" />
                    CHAT INTERNO
                </h2>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs font-bold text-gray-400 uppercase">REDE LOCAL (ABAS): <span className="text-green-600">ATIVA</span></p>
                </div>
            </div>
            {currentRole === 'ADMIN' && (
                <button 
                    onClick={handleClear}
                    className="text-red-500 hover:text-red-700 font-black text-xs flex items-center gap-1"
                >
                    <Trash2 size={14} /> LIMPAR HISTÓRICO
                </button>
            )}
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare size={48} className="opacity-20 mb-2" />
                        <p className="font-bold text-sm">CANAL DE COMUNICAÇÃO ABERTO.</p>
                        <p className="text-xs">Mensagens enviadas aqui aparecem em todos os terminais locais (abas do navegador).</p>
                    </div>
                )}
                
                {messages.map((msg) => {
                    const isMe = msg.sender === currentUser;
                    const time = new Date(msg.timestamp).toLocaleTimeString().slice(0,5);

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                                isMe 
                                ? 'bg-green-100 text-green-900 rounded-tr-none' 
                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                            }`}>
                                <div className="flex justify-between items-baseline gap-4 mb-1 border-b border-black/5 pb-1">
                                    <span className={`text-[10px] font-black uppercase ${isMe ? 'text-green-700' : 'text-blue-600'}`}>
                                        {msg.sender} <span className="opacity-50">({msg.role})</span>
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">{time}</span>
                                </div>
                                <p className="text-sm font-bold whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-100 border-t border-gray-200">
                <form onSubmit={handleSend} className="flex gap-2">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="DIGITE SUA MENSAGEM..."
                            className="w-full pl-4 pr-10 py-3 rounded-lg border-2 border-gray-300 focus:border-green-500 focus:ring-green-500 font-bold uppercase text-sm"
                        />
                        <div className="absolute right-3 top-3 text-gray-400">
                           <User size={18} />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 rounded-lg font-black flex items-center gap-2 transition-colors"
                    >
                        <Send size={18} />
                        ENVIAR
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
