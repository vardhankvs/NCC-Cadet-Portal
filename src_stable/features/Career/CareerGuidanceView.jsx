// src/features/Career/CareerGuidanceView.jsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getCollectionRef, saveCareerNotice, deleteCareerNotice } from '../../firebase/firestoreService.js';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import axios from 'axios';
import { Megaphone, ExternalLink, Trash2, Edit3, Plus, Briefcase, Award, BookOpen, Clock } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const CareerGuidanceView = () => {
    const { userRole } = useAuthContext();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', link: '', category: 'Armed Forces' });

    useEffect(() => {
        const ref = getCollectionRef('career_notices');
        if (!ref) return;
        
        const q = query(ref, orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await saveCareerNotice(formData, editingId);
                toast.success("Notice updated successfully.");
                setEditingId(null);
            } else {
                await saveCareerNotice(formData);
                toast.success("Notice posted successfully.");
                sendPushToAll('💼 New Career Opportunity', `${formData.title} has been posted. Check the Careers tab.`);
            }
            setFormData({ title: '', description: '', link: '', category: 'Armed Forces' });
            setShowForm(false);
        } catch (err) {
            toast.error("Failed to save: " + err.message);
        }
    };

    const handleEdit = (notice) => {
        setFormData({
            title: notice.title || '',
            description: notice.description || '',
            link: notice.link || '',
            category: notice.category || 'Armed Forces'
        });
        setEditingId(notice.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this notice?")) return;
        try {
            await deleteCareerNotice(id);
            toast.success("Notice deleted.");
        } catch (err) {
            toast.error("Failed to delete.");
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            // Fetching "from Google" (Google News RSS for Army Recruitment India)
            const query = encodeURIComponent('Army Recruitment India');
            const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
            
            const response = await axios.get(proxyUrl);
            const xmlString = response.data.contents;
            
            // Parse XML manually using browser's DOMParser
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const items = xmlDoc.querySelectorAll("item");
            
            let added = 0;
            const newNotices = [];
            
            items.forEach(item => {
                const title = item.querySelector("title")?.textContent || "";
                const description = item.querySelector("description")?.textContent || "";
                const link = item.querySelector("link")?.textContent || "";
                
                const titleLower = title.toLowerCase();
                const keywords = ['army', 'navy', 'air force', 'defence', 'recruitment', 'cds', 'afcat', 'agniveer', 'officer', 'commission'];
                
                if (keywords.some(k => titleLower.includes(k))) {
                    if (!notices.some(n => n.title === title)) {
                        newNotices.push({
                            title,
                            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
                            link,
                            category: 'Automated Alert'
                        });
                        added++;
                    }
                }
            });

            // Batch save to Firestore
            for (const noticeData of newNotices.slice(0, 5)) {
                await saveCareerNotice(noticeData);
            }
            
            toast.success(`Sync Complete: Added ${added} new notices.`);
        } catch (err) {
            console.error("Sync Error:", err);
            toast.error("Sync failed: " + (err.message || "Network error"));
        } finally {
            setSyncing(false);
        }
    };

    const ssbResources = [
        { title: "Service Selection Board (SSB) Overview", link: "https://joinindianarmy.nic.in/ssb-overview.htm" },
        { title: "CDS Entrance Preparation Guide", link: "https://www.upsc.gov.in/" },
        { title: "AFCAT Entry Requirements", link: "https://afcat.cdac.in/AFCAT/" },
        { title: "NCC Special Entry Scheme", link: "https://joinindianarmy.nic.in/ncc-special-entry.htm" }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 fade-in">
            {/* Left Column: Notices & Opportunities */}
            <div className="lg:col-span-8 space-y-6">
                <header className="flex justify-between items-center bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Career Hub</h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm">Opportunities in Armed Forces & Public Services.</p>
                    </div>
                    {userRole === 'admin' && (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSync}
                                disabled={syncing}
                                className="ncc-btn ncc-btn-secondary flex items-center gap-2"
                            >
                                <Clock className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> 
                                {syncing ? 'Syncing...' : 'Sync Live'}
                            </button>
                            <button 
                                onClick={() => {
                                    setEditingId(null);
                                    setFormData({ title: '', description: '', link: '', category: 'Armed Forces' });
                                    setShowForm(!showForm);
                                }}
                                className="ncc-btn ncc-btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Post Notice
                            </button>
                        </div>
                    )}
                </header>

                {showForm && (
                    <form onSubmit={handleSubmit} className="ncc-card p-6 border-2 border-ncc-gold/30 space-y-4 animate-in slide-in-from-top-4">
                        <h3 className="font-bold text-ncc-navy dark:text-white uppercase tracking-widest text-xs mb-2">
                            {editingId ? 'Edit Career Notice' : 'New Career Notice'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input 
                                type="text" 
                                placeholder="Opportunity Title (e.g. CDS 2026)" 
                                className="ncc-input"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                            <select 
                                className="ncc-input"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Armed Forces">Armed Forces</option>
                                <option value="SSB Prep">SSB Prep</option>
                                <option value="Govt Jobs">Govt Jobs</option>
                                <option value="Higher Education">Higher Ed</option>
                            </select>
                        </div>
                        <textarea 
                            placeholder="Brief description or eligibility criteria..." 
                            className="ncc-input h-24"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                        <input 
                            type="url" 
                            placeholder="Application/Info Link (optional)" 
                            className="ncc-input"
                            value={formData.link}
                            onChange={e => setFormData({ ...formData, link: e.target.value })}
                        />
                        <div className="flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => { 
                                    setShowForm(false); 
                                    setEditingId(null); 
                                    setFormData({ title: '', description: '', link: '', category: 'Armed Forces' }); 
                                }} 
                                className="text-gray-400 dark:text-white/80 text-xs font-bold uppercase tracking-widest px-4"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="ncc-btn ncc-btn-success px-8">
                                {editingId ? 'Update Notice' : 'Post Opportunity'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {loading ? (
                        <div className="p-20 text-center italic text-gray-400 dark:text-white/80">Loading notices...</div>
                    ) : notices.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 dark:text-white/80 italic bg-white dark:bg-[#050b14] rounded-3xl border-2 border-dashed border-[#ddd8cc]">
                            No career notices at the moment. Check back soon!
                        </div>
                    ) : (
                        notices.map(notice => (
                            <div key={notice.id} className="ncc-card p-6 flex gap-6 relative group overflow-hidden hover:border-ncc-gold transition-all">
                                <div className="hidden sm:flex flex-col items-center justify-center w-24 h-24 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl shrink-0 border border-[#ede8df] group-hover:border-ncc-gold/30 transition-colors">
                                    <Clock className="w-5 h-5 text-ncc-gold mb-2" />
                                    <p className="text-[10px] font-black text-ncc-navy dark:text-white text-center uppercase leading-tight">
                                        {formatDate(notice.createdAt).split(' ').slice(0, 2).join('\n')}
                                    </p>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded-full bg-ncc-gold/10 text-ncc-gold text-[9px] font-black tracking-widest uppercase">
                                            {notice.category}
                                        </span>
                                    </div>
                                    <h4 className="font-display font-bold text-lg text-ncc-navy dark:text-white mb-2">{notice.title}</h4>
                                    <p className="text-sm text-gray-600 dark:text-white/80 leading-relaxed mb-4">{notice.description}</p>
                                    
                                    {notice.link && (
                                        <a 
                                            href={notice.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest hover:text-ncc-gold transition-colors"
                                        >
                                            View Details <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                                
                                {userRole === 'admin' && (
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button 
                                            onClick={() => handleEdit(notice)}
                                            className="p-2 text-gray-300 hover:text-ncc-navy dark:hover:text-white transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(notice.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Resources & SSB Prep */}
            <div className="lg:col-span-4 space-y-6">
                <div className="ncc-card p-6 bg-ncc-navy border-none shadow-2xl relative overflow-hidden">
                    {/* Background Accent */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white dark:bg-[#050b14]/5 rounded-full blur-3xl" />
                    
                    <h3 className="text-white font-display font-bold text-xl mb-6 relative flex items-center gap-3">
                        <Award className="w-6 h-6 text-ncc-gold" /> SSB Preparation
                    </h3>
                    
                    <div className="space-y-4 relative">
                        {ssbResources.map((res, i) => (
                            <a 
                                key={i} 
                                href={res.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 hover:border-ncc-gold/50 transition-all group"
                            >
                                <span className="text-xs font-bold text-white group-hover:text-ncc-gold transition-colors">{res.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-ncc-gold" />
                            </a>
                        ))}
                    </div>
                    
                    <div className="mt-8 p-4 bg-ncc-gold/10 border border-ncc-gold/20 rounded-xl">
                        <p className="text-[10px] text-ncc-gold font-bold uppercase tracking-widest mb-1">Expert Advice</p>
                        <p className="text-xs text-white/60 italic leading-relaxed">
                            "The SSB tests your personality, not just your knowledge. Be original, be honest."
                        </p>
                    </div>
                </div>

                <div className="ncc-card p-6">
                    <h3 className="text-ncc-navy dark:text-white font-display font-bold text-lg mb-4 flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-ncc-gold" /> Career Library
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 hover:bg-[#f5f0e8] dark:bg-[#0a1628] rounded-xl transition-colors cursor-pointer group">
                            <div className="p-2 bg-ncc-navy/5 rounded-lg group-hover:bg-ncc-navy transition-colors">
                                <Briefcase className="w-4 h-4 text-ncc-navy dark:text-white group-hover:text-ncc-gold" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-ncc-navy dark:text-white">Officer Entry Schemes</p>
                                <p className="text-[10px] text-gray-500 dark:text-white/70">PDF Guide • 2.4 MB</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 hover:bg-[#f5f0e8] dark:bg-[#0a1628] rounded-xl transition-colors cursor-pointer group">
                            <div className="p-2 bg-ncc-navy/5 rounded-lg group-hover:bg-ncc-navy transition-colors">
                                <Briefcase className="w-4 h-4 text-ncc-navy dark:text-white group-hover:text-ncc-gold" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-ncc-navy dark:text-white">Physical Fitness Standards</p>
                                <p className="text-[10px] text-gray-500 dark:text-white/70">PDF Guide • 1.1 MB</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
