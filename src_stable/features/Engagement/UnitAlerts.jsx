// src/features/Engagement/CadetNotifications.jsx
import React, { useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { Bell, Calendar, User, Info, AlertTriangle, Shield } from '../../components/Icons.jsx';
import { requestNotificationPermission } from '../../firebase/messagingService';
import { toast } from 'react-toastify';

export const UnitAlerts = () => {
    const { announcements, notifications, loading } = useDataContext();
    const { userEnrollmentId, user } = useAuthContext();

    if (loading) return <div className="p-8 text-center text-text-dim italic">Scanning unit logs...</div>;

    // Filter notifications for the cadet's unit/group
    const unitBroadcasts = (notifications || []).map(n => ({
        ...n,
        displayType: n.type === 'blood_emergency' ? 'emergency' : 'broadcast',
        title: n.subject || (n.type === 'blood_emergency' ? 'Blood Emergency' : 'Unit Broadcast'),
        content: n.message || n.content
    }));
    
    const allNotes = [...unitBroadcasts].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
    });


    const [permissionStatus, setPermissionStatus] = useState('Notification' in window ? Notification.permission : 'denied');

    return (
        <div className="space-y-6 max-w-3xl mx-auto py-4">
            <header className="mb-8">
                <h2 className="text-2xl font-display font-black text-main flex items-center gap-3">
                    <Megaphone className="w-7 h-7 text-ncc-navy dark:text-ncc-gold" />
                    Unit Communications
                </h2>
                <p className="text-text-dim mt-1">Official instructions, announcements, and emergency alerts</p>
            </header>

            {permissionStatus !== 'granted' && 'Notification' in window && (
                <div className="bg-ncc-navy text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 text-ncc-gold" />
                        </div>
                        <div>
                            <h3 className="font-bold">Enable Push Notifications</h3>
                            <p className="text-xs text-white/70">Get instant updates for parades, camps, and emergencies directly on your phone.</p>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            const token = await requestNotificationPermission(user?.uid, 'cadets');
                            if (token) {
                                setPermissionStatus('granted');
                                toast.success("Notifications enabled! You will now receive unit broadcasts.");
                            } else {
                                toast.error("Please allow notifications in your browser popup.");
                            }
                        }}
                        className="bg-ncc-gold text-ncc-navy font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-yellow-500 transition-colors whitespace-nowrap shrink-0 w-full sm:w-auto"
                    >
                        Enable Notifications
                    </button>
                </div>
            )}

            {allNotes.length === 0 ? (
                <div className="ncc-card p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info className="w-8 h-8 text-text-dim opacity-20" />
                    </div>
                    <p className="text-text-dim font-medium">All clear! No new communications for your account.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {allNotes.map((note, idx) => (
                        <div key={note.id || idx} className={`ncc-card p-5 group transition-all reveal slide-up ${note.displayType === 'personal' ? 'border-l-4 border-l-ncc-gold' : ''}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    note.isUrgent || note.type === 'error' ? 'bg-ncc-red/10 text-ncc-red' : 
                                    note.displayType === 'personal' ? 'bg-ncc-gold/10 text-ncc-gold' :
                                    'bg-ncc-navy/5 text-ncc-navy dark:bg-white/5 dark:text-ncc-gold'
                                }`}>
                                    {note.isUrgent ? <AlertTriangle className="w-6 h-6" /> : 
                                     note.displayType === 'personal' ? <Shield className="w-6 h-6" /> :
                                     <Megaphone className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h3 className="font-bold text-main group-hover:text-ncc-gold transition-colors truncate">
                                            {note.title}
                                        </h3>
                                        <span className={`text-[10px] font-bold whitespace-nowrap px-3 py-1 rounded-full shadow-sm ${
                                            note.displayType === 'emergency' ? 'bg-ncc-red text-white' : 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy'
                                        }`}>
                                            {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : 'Today'}
                                        </span>
                                    </div>
                                    <p className="text-text-dim text-sm leading-relaxed">
                                        {note.content || note.message}
                                    </p>
                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-main text-[10px] font-bold uppercase tracking-widest text-text-dim">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3 h-3" />
                                            {note.sender || (note.displayType === 'personal' ? 'System Verification' : 'Unit Admin')}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Info className="w-3 h-3" />
                                            {note.displayType === 'personal' ? 'Secure Alert' : 'Strategic Update'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Megaphone = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
);
