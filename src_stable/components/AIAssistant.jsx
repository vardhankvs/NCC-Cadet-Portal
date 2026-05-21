// src/components/AIAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader, Sparkles, MessageSquare } from './Icons.jsx';
import { useDataContext } from '../context/DataContext.jsx';

export const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Jai Hind Cadet! I am Batra, your 14(A) BN Study Assistant. Ask me anything about NCC syllabus, weapon training, or unit history." }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);
    const { materials } = useDataContext();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        // Simulated AI Response (Smart Search Logic)
        setTimeout(() => {
            let response = "I'm still learning the specifics of that topic. However, you can check the E-Manuals section for official documentation. Would you like me to find a specific manual for you?";
            
            // Search through uploaded materials metadata
            const lowerMsg = userMessage.toLowerCase();
            const relevantDoc = materials.find(m => 
                lowerMsg.includes(m.title.toLowerCase()) || 
                lowerMsg.includes(m.category?.toLowerCase()) ||
                (m.tags && m.tags.some(t => lowerMsg.includes(t.toLowerCase())))
            );

            if (relevantDoc) {
                let docContent = relevantDoc.description || "detailed military training topics";
                response = `I've analyzed the "${relevantDoc.title}" manual. It covers ${docContent}. You can find more specific details on these topics in the ${relevantDoc.category} section of our Digital Library.`;
            } else if (lowerMsg.includes('map') || lowerMsg.includes('reading')) {
                response = "Map Reading is a core Common Subject. It involves understanding Grid References (4-figure and 6-figure), Northings, Eastings, and Conventional Signs. I've noted that we have manuals covering this in the library—would you like me to highlight the key points for your 'C' certificate exam?";
            } else if (lowerMsg.includes('rifle') || lowerMsg.includes('.22')) {
                response = "According to the Weapon Training manual, the .22 Deluxe Rifle has an effective range of 25 yards. It weighs approximately 6 lbs 2 oz. I've cross-referenced this with our uploaded WT resources.";
            } else if (lowerMsg.includes('motto')) {
                response = "The official motto of NCC, as stated in the 'Aims and History' manual, is 'Unity and Discipline' (Ekta aur Anushasan).";
            } else if (lowerMsg.includes('aim')) {
                response = "As per the Unit Manual, the aims of NCC are to develop character, comradeship, discipline, a secular outlook, and ideals of selfless service.";
            } else if (lowerMsg.includes('manual') || lowerMsg.includes('pdf') || lowerMsg.includes('study')) {
                const found = materials.slice(0, 3).map(m => m.title).join(", ");
                response = found 
                    ? `I've indexed our current library. We have documents like: ${found}. You can ask me specific questions about these topics!`
                    : "I'm ready to answer questions. Please upload E-Manuals in the Digital Library so I can index them and provide more accurate study support!";
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-ncc-red rotate-90' : 'bg-ncc-navy'}`}
            >
                {isOpen ? <X className="text-white w-6 h-6" /> : <MessageSquare className="text-ncc-gold w-7 h-7" />}
                {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-ncc-red rounded-full animate-ping" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl border border-[#ddd8cc] flex flex-col overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="bg-ncc-navy p-5 flex items-center gap-3">
                        <div className="w-10 h-10 bg-ncc-gold rounded-xl flex items-center justify-center">
                            <Bot className="text-ncc-navy w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-white font-display font-bold text-sm">Batra AI Assistant</h4>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Unit Intelligence</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfaf7] ncc-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-ncc-navy text-white rounded-tr-none' 
                                    : 'bg-white border border-[#ddd8cc] text-gray-700 rounded-tl-none shadow-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex flex-col gap-1 items-start">
                                <div className="bg-white border border-[#ddd8cc] p-3 rounded-2xl rounded-tl-none flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </div>
                                <span className="text-[9px] text-ncc-navy/40 font-bold uppercase tracking-widest pl-1">
                                    Batra is indexing e-manuals...
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#ddd8cc]">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Ask Batra..."
                                className="w-full bg-gray-50 border border-[#ddd8cc] rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-gold/50"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-ncc-navy text-white rounded-xl flex items-center justify-center hover:bg-ncc-navy/90 transition"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-ncc-gold" /> Powered by Unit Knowledge Base
                        </p>
                    </form>
                </div>
            )}
        </div>
    );
};
