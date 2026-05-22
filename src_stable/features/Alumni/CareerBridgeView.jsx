
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Briefcase, Users, Award, ShieldCheck, Mail, MapPin, Filter, Search, Clock, Plus, Trash2, Edit3 } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { JobForm } from './JobForm.jsx';
import { deleteJobOpportunity } from '../../firebase/firestoreService.js';

export const CareerBridgeView = () => {
    const { user, userRole } = useAuthContext();
    const { cadets = [], jobs = [], alumni = [] } = useDataContext();
    const [activeTab, setActiveTab] = useState('jobs');
    const [searchTerm, setSearchTerm] = useState('');
    const [showJobForm, setShowJobForm] = useState(false);
    const [editingJob, setEditingJob] = useState(null);

    // alumni is already provided by context
    const mentors = alumni.filter(a => a.isMentor);

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.type.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm("Are you sure you want to delete this opportunity?")) return;
        try {
            await deleteJobOpportunity(jobId);
            toast.success("Opportunity removed.");
        } catch (error) {
            toast.error("Failed to delete opportunity.");
        }
    };

    return (
        <div className="space-y-8 fade-in">
            <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Alumni Career Bridge</h2>
                        <p className="text-gray-500 dark:text-white/70">Connecting NCC discipline with military and corporate excellence.</p>
                    </div>
                    <div className="flex bg-ncc-navy/5 dark:bg-white/5 p-1 rounded-xl shrink-0 border border-ncc-navy/5 dark:border-white/5">
                        <button 
                            onClick={() => setActiveTab('jobs')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'jobs' ? 'bg-ncc-navy text-white shadow-md' : 'text-ncc-navy dark:text-white/40 dark:hover:text-white hover:text-ncc-navy'}`}
                        >
                            Job Board
                        </button>
                        <button 
                            onClick={() => setActiveTab('mentorship')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'mentorship' ? 'bg-ncc-navy text-white shadow-md' : 'text-ncc-navy dark:text-white/40 dark:hover:text-white hover:text-ncc-navy'}`}
                        >
                            Mentors
                        </button>
                    </div>
                    {userRole === 'admin' && activeTab === 'jobs' && (
                        <button onClick={() => { setEditingJob(null); setShowJobForm(true); }} className="ncc-btn ncc-btn-primary whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Add Opportunity
                        </button>
                    )}
                </div>
            </header>

            {activeTab === 'jobs' ? (
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/80" />
                        <input 
                            type="text" 
                            placeholder="Search opportunities (e.g. SSB, Corporate, Tech Entry)..."
                            className="w-full pl-12 pr-6 py-5 bg-white dark:bg-[#050b14] rounded-2xl border border-ncc-navy/5 shadow-sm outline-none focus:border-ncc-gold/30 transition-all font-bold text-ncc-navy dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredJobs.length === 0 ? (
                            <div className="col-span-full py-12 text-center">
                                <p className="text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest text-xs italic">No active opportunities found.</p>
                            </div>
                        ) : (
                            filteredJobs.map(job => (
                                <div key={job.id} className="ncc-card group flex flex-col relative">
                                <div className="p-8 flex-1 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            job.type === 'Armed Forces' ? 'bg-ncc-navy text-white' : 'bg-ncc-gold text-ncc-navy dark:text-white'
                                        }`}>
                                            {job.type}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-white font-bold text-[10px] uppercase bg-ncc-red px-2 py-0.5 rounded-full">
                                            <Clock className="w-3 h-3 text-white" /> <span className="text-white">Ends: {job.deadline}</span>
                                         </div>
                                    </div>
                                    
                                        <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors pr-8">{job.title}</h3>
                                        <div className="flex items-center gap-2 text-gray-400 dark:text-white/80 text-xs mt-1 font-bold uppercase">
                                            <MapPin className="w-3 h-3" /> {job.location}
                                        </div>
                                    {userRole === 'admin' && (
                                        <div className="absolute top-6 right-6 flex gap-2">
                                            <button 
                                                onClick={() => { setEditingJob(job); setShowJobForm(true); }}
                                                className="p-2 text-gray-300 hover:text-ncc-navy dark:hover:text-white transition-colors"
                                                title="Edit Opportunity"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteJob(job.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete Opportunity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-500 dark:text-white/70 leading-relaxed italic">"{job.description}"</p>
                                </div>
                                
                                <div className="p-6 bg-ncc-navy/5 border-t border-ncc-navy/5 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">C-Cert Advantage</span>
                                    </div>
                                    <a 
                                        href={job.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest hover:text-ncc-gold transition-colors flex items-center"
                                    >
                                        Apply Now &rarr;
                                    </a>
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mentors.length === 0 ? (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-ncc-navy/5 rounded-full flex items-center justify-center mx-auto">
                                <Users className="w-10 h-10 text-ncc-navy dark:text-white/20" />
                            </div>
                            <p className="text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest text-xs italic">No mentors registered in the bridge yet.</p>
                        </div>
                    ) : (
                        mentors.map(mentor => (
                            <div key={mentor.id} className="ncc-card p-8 group">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-3xl bg-ncc-navy flex items-center justify-center mx-auto shadow-2xl shadow-ncc-navy/20 border-2 border-transparent group-hover:border-ncc-gold transition-all relative overflow-hidden">
                                        <span className="text-ncc-gold text-2xl font-bold font-display">{mentor.name[0]}</span>
                                        <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy/40 to-transparent" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-display font-bold text-ncc-navy dark:text-white">{mentor.name}</h4>
                                        <p className="text-[10px] text-ncc-gold font-black uppercase tracking-widest">{mentor.currentDesignation || 'Officer / Professional'}</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-ncc-navy/5 flex justify-center gap-4">
                                    <button className="p-3 rounded-xl bg-ncc-navy/5 text-ncc-navy dark:text-white hover:bg-ncc-navy hover:text-white transition-all shadow-sm">
                                        <Mail className="w-4 h-4" />
                                    </button>
                                    <button className="flex-1 ncc-btn ncc-btn-primary py-3 text-[9px]">Request Call</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showJobForm && <JobForm onClose={() => { setShowJobForm(false); setEditingJob(null); }} editingJob={editingJob} />}
        </div>
    );
};
