// src/components/ui/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Sun, Moon } from '../Icons.jsx';

export const ThemeToggle = ({ className = "" }) => {
    const { isDarkMode, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            data-testid="theme-toggle"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 border active:scale-90 ${
                isDarkMode 
                ? 'bg-ncc-navy-mid/40 text-ncc-gold border-ncc-gold/30 hover:bg-ncc-gold/20 shadow-[0_0_15px_rgba(201,146,42,0.1)]' 
                : 'bg-white text-ncc-navy border-ncc-navy/10 hover:border-ncc-navy/30 shadow-lg'
            } ${className}`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Tactical Dark Mode'}
        >
            {isDarkMode ? <Sun className="w-5 h-5 animate-pulse-slow" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};
