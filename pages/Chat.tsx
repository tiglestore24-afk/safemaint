
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ChatMessage } from '../types';
import { Send, Trash2, MessageSquare, Volume2, BellRing } from 'lucide-react';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentUser = localStorage.getItem('safemaint_user') || 'ANÔNIMO';
  const currentRole = localStorage.getItem('safemaint_role') || 'OPERADOR';

  useEffect(() => {
    // Alerta sonoro (Ping Industrial)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    loadMessages();
    window.addEventListener('safemaint_chat_update', handleNewMessage);

    return () => {
        window.removeEventListener('safemaint_chat_update', handleNewMessage);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    setMessages(StorageService.getChatMessages());
  };

  const handleNewMessage = () => {
    const newMessages = StorageService.getChatMessages();
    
    // Toca alerta se a mensagem não for minha
    if (newMessages.length > 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.sender !== currentUser) {
            audioRef.current?.play().catch(e => console.log("Som bloqueado pelo browser"));
        }
    }
    
    setMessages(newMessages);
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
      if(window.confirm("LIMPAR TODO O HISTÓRICO DE CONVERSA?")) {
          StorageService.clearChat();
      }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center mb-4 border-b-2 border-vale-green pb-2">
            <div>
                <h2 className="text-2xl font-black text-vale-darkgray flex items-center gap-2">
                    <MessageSquare className="text-vale-green" />
                    COMUNICAÇÃO DA EQUIPE
                </h2>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] font-black text-vale-green uppercase flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <Volume2 size={12} className="text-vale-blue" /> 
                        ALERTAS SONOROS ATIVOS
                    </p>
                </div>
            </div>
            {currentRole === 'ADMIN' && (
                <button 
                    onClick={handleClear}
                    className="text-vale-cherry hover:underline font-black text-[10px] flex items-center gap-1 uppercase bg-red-50 px-4 py-1.5 rounded-lg border border-red-100"
                >
                    <Trash2 size={14} /> LIMPAR HISTÓRICO
                </button>
            )}
        </div>

        <div className="flex-1 bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-30">
                        <MessageSquare size={100} className="mb-4" />
                        <p className="font-black text-sm uppercase">Nenhuma mensagem registrada.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender === currentUser;
                        const time = new Date(msg.timestamp).toLocaleTimeString().slice(0,5);

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                                    isMe 
                                    ? 'bg-vale-green text-white rounded-tr-none' 
                                    : 'bg-white border border-gray-200 text-vale-darkgray rounded-tl-none'
                                }`}>
                                    <div className="flex justify-between items-baseline gap-4 mb-2 border-b border-black/5 pb-1">
                                        <span className={`text-[10px] font-black uppercase ${isMe ? 'text-vale-yellow' : 'text-vale-blue'}`}>
                                            {msg.sender} <span className="opacity-60">({msg.role})</span>
                                        </span>
                                        <span className={`text-[9px] font-mono font-bold ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{time}</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed uppercase">{msg.text}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t-2 border-gray-100">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="DIGITE SUA MENSAGEM PARA A EQUIPE..."
                        className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-vale-green focus:bg-white font-black uppercase text-xs outline-none transition-all shadow-inner"
                    />
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-vale-green hover:bg-vale-green/90 disabled:bg-gray-200 text-white px-8 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl border-b-4 border-green-800"
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
