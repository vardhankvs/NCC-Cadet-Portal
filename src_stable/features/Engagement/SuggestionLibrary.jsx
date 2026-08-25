// src_stable/features/Engagement/SuggestionLibrary.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    X, 
    Sparkles, 
    User, 
    Compass, 
    BookOpen, 
    Shield, 
    HelpCircle, 
    ChevronLeft, 
    ArrowRight 
} from '../../components/Icons.jsx';

const CATEGORY_ICONS = {
    Sparkles: Sparkles,
    User: User,
    Compass: Compass,
    BookOpen: BookOpen,
    Shield: Shield,
    HelpCircle: HelpCircle
};

export const SuggestionLibrary = ({ isOpen, onClose, onSelectSuggestion, suggestionsData = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter categories and suggestions based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return suggestionsData;
        const q = searchQuery.toLowerCase().trim();

        return suggestionsData.map(cat => {
            const matchingPrompts = cat.suggestions.filter(s => s.toLowerCase().includes(q));
            if (matchingPrompts.length > 0 || cat.category.toLowerCase().includes(q)) {
                return {
                    ...cat,
                    suggestions: matchingPrompts.length > 0 ? matchingPrompts : cat.suggestions
                };
            }
            return null;
        }).filter(Boolean);
    }, [suggestionsData, searchQuery]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-white/95 dark:bg-[#050b14]/95 backdrop-blur-md flex flex-col overflow-hidden rounded-3xl sm:rounded-2xl"
            >
                {/* Top Header matching YouTube Studio */}
                <div className="bg-ncc-navy p-4 flex items-center justify-between shadow-md shrink-0 border-b border-ncc-gold/20">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group text-sm font-semibold"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                            <ChevronLeft className="w-4 h-4 text-ncc-gold" />
                        </div>
                        <span className="font-display tracking-tight text-white font-bold">Suggestion library</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 bg-gray-50 dark:bg-[#02050A] border-b border-gray-100 dark:border-white/10 shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search prompt suggestions..."
                            className="w-full bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 focus:border-ncc-gold rounded-xl py-2 pl-10 pr-8 text-xs outline-none text-ncc-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/40"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Suggestion Categories List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 ncc-scrollbar">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-12 px-4 text-gray-400 dark:text-white/40">
                            <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-50 text-ncc-gold" />
                            <p className="text-sm font-semibold">No suggestions match "{searchQuery}"</p>
                            <p className="text-xs mt-1">Try searching for attendance, camps, exams, or rank promotion.</p>
                        </div>
                    ) : (
                        filteredCategories.map((cat, catIdx) => {
                            const IconComponent = CATEGORY_ICONS[cat.icon] || Sparkles;

                            return (
                                <motion.div
                                    key={catIdx}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: catIdx * 0.05 }}
                                    className="space-y-2.5"
                                >
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-ncc-navy/10 dark:bg-ncc-gold/10 flex items-center justify-center">
                                                <IconComponent className="w-3.5 h-3.5 text-ncc-gold" />
                                            </div>
                                            <h3 className="text-xs font-display font-black text-ncc-navy dark:text-white uppercase tracking-wider">
                                                {cat.category}
                                            </h3>
                                        </div>

                                        {cat.badge && (
                                            <span className="text-[9px] bg-ncc-gold/20 text-ncc-gold border border-ncc-gold/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
                                                {cat.badge}
                                            </span>
                                        )}
                                    </div>

                                    {cat.description && (
                                        <p className="text-[10px] text-gray-500 dark:text-white/40 -mt-1 font-medium">
                                            {cat.description}
                                        </p>
                                    )}

                                    {/* Prompts Pill Stack */}
                                    <div className="flex flex-col gap-2 pt-1">
                                        {cat.suggestions.map((promptText, pIdx) => (
                                            <button
                                                key={pIdx}
                                                onClick={() => {
                                                    onSelectSuggestion(promptText);
                                                    onClose();
                                                }}
                                                className="group text-left px-3.5 py-2.5 bg-gray-50 dark:bg-[#0a1628] hover:bg-ncc-navy hover:text-white dark:hover:bg-ncc-gold dark:hover:text-ncc-navy border border-gray-200/80 dark:border-white/10 rounded-xl transition-all duration-200 flex items-center justify-between shadow-sm hover:shadow-md"
                                            >
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-white dark:group-hover:text-ncc-navy leading-snug">
                                                    {promptText}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-ncc-gold dark:group-hover:text-ncc-navy shrink-0 ml-2" />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Footer Banner */}
                <div className="p-3 bg-ncc-navy/5 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-500 dark:text-white/40">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-ncc-gold" />
                        AI Profile Training Active
                    </span>
                    <span>Powered by Llama 3.3 & Vanguard Engine</span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
