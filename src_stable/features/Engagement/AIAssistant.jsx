import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, X } from '../../components/Icons.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const SYSTEM_PROMPT = `You are Vanguard AI, an expert, highly disciplined, and helpful assistant for the National Cadet Corps (NCC). 
Your primary duty is to answer questions related strictly to NCC, military, defense forces, leadership, camps (like RDC, TSC, ATC), ranks, uniform, exams ('B' and 'C' certificates), and related topics.

CRITICAL INSTRUCTION: You are also the official guide for the "NCC Vanguard Portal" web app! If a user asks how to use the app, where to find something, or what the app can do, guide them to the correct sidebar tab:
- "My Hub": Contains NCC Knowledge, My Profile, Attendance, My Fee, Kit Sizes, Apply Leave.
- "Intelligence": Contains Unit Hierarchy, Honour Roll (Leaderboard), Unit Excellence, Staff, Alumni.
- "Training": Contains Calendar, Mock Exams, My Fitness (PFT Tracker), My Camps, Digital Library.
- "Engagement": Contains Notice Board, Broadcasts, Messages, Events, Unit Gallery, Social Service, Blood Bank.
- "Services": Contains Career Hub, Career Bridge, Report Issue, Feedback, AI Assistant.

Keep your answers concise, respectful, structured, and informative. Always address the user politely.
If a user asks about anything completely unrelated (like coding, cooking, celebrity gossip, or general chitchat), you MUST politely decline and remind them that your operational scope is limited to NCC and Defense matters. 
Format your responses using Markdown (bolding, bullet points, numbered lists) to make them easy to read. Keep your responses under 200 words if possible.`;

const suggestions = [
    "What is the NCC Motto?",
    "Tell me about the 'C' Certificate",
    "What are the benefits?",
    "How are ranks structured?",
];

export const AIAssistant = () => {
    const { userName } = useAuthContext();
    const [isOpen, setIsOpen] = useState(false);
    
    // We store the full message history for Groq context, but render only user/assistant messages
    const [conversation, setConversation] = useState([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'assistant', content: `Jai Hind, ${userName?.split(' ')[0] || 'Cadet'}! I am Vanguard AI. Ask me anything about NCC, Defense, or Leadership.` }
    ]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [conversation, isTyping, isOpen]);

    const handleSend = async (text) => {
        if (!text.trim()) return;

        const userMessage = { role: 'user', content: text };
        const updatedConversation = [...conversation, userMessage];
        
        setConversation(updatedConversation);
        setInput('');
        setIsTyping(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            
            if (!apiKey) {
                throw new Error("API Key is missing. Please check .env file.");
            }

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: updatedConversation,
                    temperature: 0.5,
                    max_tokens: 1024,
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to fetch from Groq");
            }

            const data = await response.json();
            const botResponse = data.choices[0]?.message?.content || "I am currently unable to process that request.";
            setConversation([...updatedConversation, { role: 'assistant', content: botResponse }]);
        } catch (error) {
            console.error("Groq API Error:", error);
            setConversation([...updatedConversation, { role: 'assistant', content: `Connection Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const constraintsRef = useRef(null);

    return (
        <>
            <div ref={constraintsRef} className="fixed inset-4 z-[998] pointer-events-none" />
            <motion.div 
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                className="fixed bottom-6 right-6 z-[999] flex flex-col items-end pointer-events-auto"
                style={{ touchAction: "none" }}
            >
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[350px] sm:w-[450px] h-[550px] max-h-[85vh] flex flex-col bg-white dark:bg-[#050b14] rounded-[2rem] border border-[#ddd8cc] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-ncc-navy p-4 flex items-center justify-between shadow-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                                    <Sparkles className="w-5 h-5 text-ncc-gold" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                                        Vanguard AI
                                    </h2>
                                    <p className="text-white/60 text-[10px]">NCC Intelligence Guide</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#02050A] ncc-scrollbar">
                            <AnimatePresence initial={false}>
                                {conversation.filter(msg => msg.role !== 'system').map((msg, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="w-7 h-7 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                                                <Bot className="w-3.5 h-3.5 text-ncc-gold" />
                                            </div>
                                        )}
                                        
                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                                            msg.role === 'user' 
                                                ? 'bg-ncc-navy text-white rounded-br-none' 
                                                : 'bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-bl-none prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-white/5'
                                        }`}>
                                            <div className="text-[13px] leading-relaxed break-words">
                                                {msg.role === 'assistant' ? (
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isTyping && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3 justify-start"
                                >
                                    <div className="w-7 h-7 rounded-full bg-ncc-navy flex-shrink-0 flex items-center justify-center shadow-md border border-ncc-gold/30 mt-1">
                                        <Bot className="w-3.5 h-3.5 text-ncc-gold" />
                                    </div>
                                    <div className="bg-white dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-ncc-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-white dark:bg-[#050b14] border-t border-gray-100 dark:border-white/10 p-4">
                            {conversation.length === 2 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {suggestions.map((sug, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleSend(sug)}
                                            className="px-2.5 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-gold hover:text-ncc-gold transition-colors rounded-full text-[9px] font-bold text-gray-500 dark:text-gray-400"
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                                    placeholder="Ask Vanguard AI..."
                                    className="w-full bg-gray-50 dark:bg-[#02050A] border border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl py-3 pl-4 pr-12 text-sm outline-none transition-all text-ncc-navy dark:text-white"
                                />
                                <button 
                                    onClick={() => handleSend(input)}
                                    disabled={!input.trim() || isTyping}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-ncc-gold text-ncc-navy rounded-lg flex items-center justify-center hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                >
                                    <Send className="w-3.5 h-3.5 -ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Button (FAB) */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-ncc-navy rounded-full shadow-2xl flex items-center justify-center border-2 border-ncc-gold overflow-hidden relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-ncc-navy via-ncc-navy to-ncc-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bot className={`w-6 h-6 text-ncc-gold transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
                <X className={`w-6 h-6 text-ncc-gold absolute transition-transform duration-300 ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'}`} />
            </motion.button>
        </motion.div>
        </>
    );
};
