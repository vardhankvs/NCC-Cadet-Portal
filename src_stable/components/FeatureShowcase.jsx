import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, ChevronLeft, Shield, BarChart, 
    Users, BookOpen, Bell, Check, X,
    MessageSquare, Award, Clock, History
} from '../components/Icons.jsx';

const FEATURES = [
    {
        id: 'genesis',
        title: 'Genesis of NCC',
        description: 'Raised on 16 April 1948 under the National Cadet Corps Act, NCC started with a strength of 20,000 cadets. Today, it has grown into the largest uniformed youth organization in the world with over 13 lakh cadets.',
        icon: History,
        color: '#1B3A6B', // Navy
        bgColor: 'bg-blue-50',
        image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&q=80',
        detail: 'Headquartered in New Delhi, spanning across 676+ districts nationwide.'
    },
    {
        id: 'aim',
        title: 'The Aim of NCC',
        description: 'To develop character, comradeship, discipline, leadership, secular outlook, and ideals of selfless service amongst the youth of the country.',
        icon: Award,
        color: '#16a34a', // Green
        bgColor: 'bg-green-50',
        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80',
        detail: 'Creating a pool of organized, trained, and motivated youth ready to serve the Nation.'
    },
    {
        id: 'motto',
        title: 'Motto & Unity',
        description: '"Unity and Discipline" (Ekta aur Anushasan) is the core motto. It was adopted in 1957 to guide cadets toward a unified national vision and disciplined lifestyle.',
        icon: Shield,
        color: '#b8830e', // Gold
        bgColor: 'bg-amber-50',
        image: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&q=80',
        detail: 'The NCC flag symbolizes the 17 Directorates, united by the gold lotus wreath.'
    },
    {
        id: 'organization',
        title: 'Tri-Service Organization',
        description: 'NCC is a Tri-Services Organization comprising the Army, Navy, and Air Force. It provides a unique platform for youth from all three wings to train together.',
        icon: Users,
        color: '#0A1628', // Navy
        bgColor: 'bg-blue-50',
        image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect x="0" y="0" width="800" height="200" fill="%23ef4444" /><rect x="0" y="200" width="800" height="200" fill="%231e3a8a" /><rect x="0" y="400" width="800" height="200" fill="%2338bdf8" /></svg>',
        detail: 'Led by the Director General (DG NCC), a Lieutenant General rank officer.'
    },
    {
        id: 'training',
        title: 'Training & Values',
        description: 'Focus on military training, adventure activities, and social service. Cadets are trained to be responsible citizens and future leaders of the nation.',
        icon: BookOpen,
        color: '#3B82F6', // Blue
        bgColor: 'bg-sky-50',
        image: 'https://images.unsplash.com/photo-1523966211575-eb4a01e7dd51?w=800&q=80',
        detail: 'Quality training over quantity, with a focus on digital transformation.'
    }
];

export const FeatureShowcase = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const feature = FEATURES[currentStep];
    const isLast = currentStep === FEATURES.length - 1;

    const handleNext = () => {
        if (isLast) {
            handleClose();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 600);
    };

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 transition-all duration-700 ${isExiting ? 'opacity-0 scale-95 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#0A1628]/95 backdrop-blur-2xl" />

            <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[600px]">
                
                {/* Visual Side */}
                <div className="w-full md:w-5/12 relative h-64 md:h-full overflow-hidden">
                    <img 
                        src={feature.image} 
                        alt={feature.title} 
                        className="w-full h-full object-cover transition-all duration-1000 transform scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/20 to-transparent" />
                    
                    <div className="absolute bottom-8 left-8 right-8">
                        <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center shadow-xl mb-4 border border-white/20`}>
                            <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                        </div>
                        <h3 className="text-white text-2xl font-display font-bold leading-tight">{feature.title}</h3>
                        <div className="w-12 h-1 bg-ncc-gold mt-2 rounded-full" />
                    </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 flex flex-col p-8 md:p-12">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex gap-1">
                            {FEATURES.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-8 bg-ncc-navy' : 'w-2 bg-gray-200'}`} 
                                />
                            ))}
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">NCC Knowledge Highlights</p>
                        <h2 className="text-3xl font-display font-bold text-ncc-navy leading-tight">{feature.title}</h2>
                        <p className="text-gray-500 text-lg leading-relaxed">
                            {feature.description}
                        </p>
                        
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-ncc-navy/5 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-ncc-navy" />
                            </div>
                            <p className="text-sm font-bold text-gray-600 leading-snug">
                                {feature.detail}
                            </p>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="mt-12 flex items-center justify-between">
                        <button 
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 cursor-default' : 'text-gray-400 hover:text-ncc-navy'}`}
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        <button 
                            onClick={handleNext}
                            className="bg-ncc-navy text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-ncc-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            {isLast ? 'Explore Portal' : 'Next Topic'}
                            {!isLast && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Counter (Mobile) */}
            <div className="absolute bottom-10 text-white/40 text-[10px] font-black uppercase tracking-[0.4em] md:hidden">
                Step {currentStep + 1} of {FEATURES.length}
            </div>
        </div>
    );
};
