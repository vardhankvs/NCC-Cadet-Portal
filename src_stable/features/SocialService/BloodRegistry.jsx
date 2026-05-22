import React, { useState, useMemo, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, MessageCircle, Droplet, Filter, Heart, Users, AlertTriangle, CheckCircle, X, Info, Edit2, Trash2, History, Send } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { DirectChat } from '../Engagement/DirectChat.jsx';
import { db } from '../../firebase/config';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { sendPushToAll, sendPushToAdmins } from '../../firebase/pushNotifications.js';


const BloodGroupTag = ({ group, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
            isActive 
            ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 scale-105' 
            : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-500 dark:text-white/50 hover:border-red-200 hover:text-red-500'
        }`}
    >
        {group}
    </button>
);

const DonorCard = ({ donor, onChat }) => {
    const cadetPhone = donor.phonePersonal || donor.phone || donor.phoneNumber;

    const handleCall = () => {
        if (!cadetPhone) return toast.info("Phone number not listed");
        window.open(`tel:${cadetPhone}`);
    };

    const handleInternalChat = () => {
        if (onChat) onChat(donor.enrollmentId);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-500/5 rounded-bl-[4rem] flex items-start justify-end p-4">
                <span className="text-2xl font-black text-red-600 dark:text-red-400">{donor.bloodGroup}</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden">
                    {donor.photoURL ? (
                        <img src={donor.photoURL} alt={donor.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">
                            {donor.name?.[0]}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-black text-ncc-navy dark:text-white group-hover:text-red-600 transition-colors">{donor.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{donor.regimentalNumber}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    <span>{donor.rank || 'CDT'} • {donor.unit || 'Unit 1'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-wider bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-lg w-fit">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Available to Donate
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleCall}
                    className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl hover:bg-ncc-navy hover:text-white transition-all active:scale-95"
                >
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                </button>
                <button 
                    onClick={handleInternalChat}
                    className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-200/50"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
                </button>
            </div>
        </motion.div>
    );
};

const ActiveRequestCard = ({ request, userEnrollmentId, userRole, cadets, userInstitutionId, onEdit, onDelete, onChat }) => {
    const isAccepted = request.acceptedBy?.includes(userEnrollmentId);
    const isAdmin = userRole === 'admin';

    const handleAccept = async () => {
        if (isAccepted || isAdmin) return;
        try {
            const reqRef = doc(getCollectionRef('blood_requests'), request.id);
            const cadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
            
            await updateDoc(reqRef, {
                acceptedBy: arrayUnion(userEnrollmentId)
            });

            await addDoc(getCollectionRef('blood_donation_logs'), {
                requestId: request.id,
                patientName: request.patientName,
                location: request.hospital,
                patientPhone: request.patientPhone,
                donorName: cadet?.name || 'Unknown',
                donorRegNo: userEnrollmentId,
                bloodGroup: request.bloodGroup,
                institutionId: userInstitutionId || '14a-bn-srikakulam',
                timestamp: serverTimestamp()
            });

            toast.success("Thank you for accepting! You can now call the patient.");
            sendPushToAdmins('🩸 Donor Available', `Cadet ${cadet?.name || userEnrollmentId} has volunteered to donate blood for ${request.patientName}.`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to accept request.");
        }
    };


    const handleAdminChat = () => {
        if (onChat) onChat('admin');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 rounded-[2.5rem] relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-full bg-red-100 dark:bg-red-500/10 -skew-x-12 translate-x-16"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex flex-col items-center justify-center text-white">
                        <span className="text-[10px] font-black uppercase opacity-60">Group</span>
                        <span className="text-2xl font-black">{request.bloodGroup}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-red-600 italic">Emergency: {request.patientName}</h3>
                        <p className="text-xs font-bold text-gray-500 dark:text-white/60">{request.hospital} • {request.details}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {isAdmin && (
                        <>
                            <button 
                                onClick={() => onEdit(request)}
                                className="p-2.5 bg-ncc-navy text-white rounded-xl hover:scale-105 transition-all shadow-md active:scale-95"
                                title="Edit Request"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => onDelete(request.id)}
                                className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:scale-105 transition-all shadow-md active:scale-95"
                                title="Delete Request"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}

                    {(isAccepted || isAdmin) ? (
                        <button 
                            onClick={() => window.open(`tel:${request.patientPhone}`)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-ncc-navy text-white rounded-xl hover:scale-105 transition-all shadow-md active:scale-95"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Call Patient</span>
                        </button>
                    ) : (
                        <button 
                            onClick={handleAccept}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:scale-105 transition-all shadow-md active:scale-95 animate-pulse"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">I can Donate</span>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const BloodRegistry = ({ onChat }) => {
    const { cadets } = useDataContext();
    const { userRole, userEnrollmentId, userInstitutionId } = useAuthContext();
    const [search, setSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('ALL');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [activeRequests, setActiveRequests] = useState([]);
    const [donationLogs, setDonationLogs] = useState([]);
    const [editingRequestId, setEditingRequestId] = useState(null);
    const [activeTab, setActiveTab] = useState('registry');
    const [logSearch, setLogSearch] = useState('');

    const [formData, setFormData] = useState({
        patientName: '',
        patientPhone: '',
        hospital: '',
        bloodGroup: '',
        details: ''
    });

    const bloodGroups = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    useEffect(() => {
        const ref = getCollectionRef('blood_requests');
        if (!ref) return;
        const q = query(ref, orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const targetUnitId = userInstitutionId || '14a-bn-srikakulam';
            
            const reqs = allReqs.filter(r => r.institutionId === targetUnitId);
            
            const now = new Date().getTime();
            setActiveRequests(reqs.filter(r => {
                if (!r.timestamp) return true;
                return (now - r.timestamp.toDate().getTime()) < 48 * 60 * 60 * 1000;
            }));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (userRole !== 'admin') return;
        const q = query(getCollectionRef('blood_donation_logs'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setDonationLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [userRole]);

    const donors = useMemo(() => {
        return cadets.filter(c => {
            const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || 
                                c.regimentalNumber?.toLowerCase().includes(search.toLowerCase());
            const matchesGroup = selectedGroup === 'ALL' || c.bloodGroup === selectedGroup;
            return matchesSearch && matchesGroup && c.bloodGroup;
        });
    }, [cadets, search, selectedGroup]);

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!formData.patientName || !formData.patientPhone || !formData.bloodGroup) {
            toast.warning("Please fill all required fields");
            return;
        }

        try {
            if (editingRequestId) {
                const reqRef = doc(getCollectionRef('blood_requests'), editingRequestId);
                await updateDoc(reqRef, {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
                toast.success("Emergency Request updated successfully!");
            } else {
                await addDoc(getCollectionRef('blood_requests'), {
                    ...formData,
                    timestamp: serverTimestamp(),
                    acceptedBy: [],
                    institutionId: userInstitutionId || '14a-bn-srikakulam'
                });

                await addDoc(getCollectionRef('notifications'), {
                    subject: `URGENT: ${formData.bloodGroup} Blood Required`,
                    message: `Patient ${formData.patientName} at ${formData.hospital} needs blood. Help if possible.`,
                    timestamp: new Date().toISOString(),
                    sender: 'Medical Cell',
                    target: 'All',
                    type: 'blood_emergency',
                    institutionId: userInstitutionId || '14a-bn-srikakulam'
                });

                toast.success("Emergency Alert Broadcasted successfully!");
                sendPushToAll('🩸 Blood Bank Alert', `URGENT: ${formData.bloodGroup} blood needed for ${formData.patientName} at ${formData.hospital}`);
            }
            
            setShowRequestModal(false);
            setEditingRequestId(null);
            setFormData({ patientName: '', patientPhone: '', hospital: '', bloodGroup: '', details: '' });
        } catch (e) {
            console.error(e);
            toast.error("Failed to process request.");
        }
    };

    const handleEditRequest = (req) => {
        setFormData({
            patientName: req.patientName,
            patientPhone: req.patientPhone,
            hospital: req.hospital,
            bloodGroup: req.bloodGroup,
            details: req.details || ''
        });
        setEditingRequestId(req.id);
        setShowRequestModal(true);
    };

    const handleDeleteRequest = async (id) => {
        if (!window.confirm("Are you sure you want to delete this emergency request?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('blood_requests'), id));
            toast.success("Request deleted.");
        } catch (e) {
            console.error(e);
            toast.error("Delete failed.");
        }
    };

    const handleDeleteLog = async (id) => {
        if (!window.confirm("Delete this log entry?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('blood_donation_logs'), id));
            toast.success("Log removed.");
        } catch (e) {
            console.error(e);
            toast.error("Delete failed.");
        }
    };

    const openCreateModal = () => {
        setEditingRequestId(null);
        setFormData({ patientName: '', patientPhone: '', hospital: '', bloodGroup: '', details: '' });
        setShowRequestModal(true);
    };

    return (
        <div className="space-y-8 fade-in">
            <header className="relative p-10 rounded-[3rem] bg-gradient-to-br from-red-600 to-red-800 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-full h-full opacity-10">
                    <Droplet className="w-96 h-96 -mr-20 -mt-20 transform rotate-12" />
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-4">
                            <Heart className="w-4 h-4 text-white fill-white animate-pulse" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Emergency Services</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 italic">Blood <span className="text-red-200">Registry</span></h1>
                        <p className="text-red-100/70 text-sm max-w-md">
                            A searchable directory of cadet blood groups for emergency community support. Every drop counts.
                        </p>
                    </div>
                    
                    {userRole === 'admin' && (
                        <button 
                            onClick={openCreateModal}
                            className="group flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                <AlertTriangle className="w-6 h-6 text-red-600 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Action</p>
                                <p className="text-xs font-black text-red-600 uppercase">Create Emergency Request</p>
                            </div>
                        </button>
                    )}
                </div>
            </header>

            {/* Tab Switcher */}
            <div className="flex justify-center p-1 bg-gray-100 dark:bg-white/5 rounded-2xl w-fit mx-auto">
                <button 
                    onClick={() => setActiveTab('registry')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-white dark:bg-ncc-navy text-red-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Droplet className="w-4 h-4" />
                    Registry
                </button>
                {userRole === 'admin' ? (
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-ncc-navy text-red-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <History className="w-4 h-4" />
                        Response Log
                    </button>
                ) : (
                    <button 
                        onClick={() => setActiveTab('chat_admin')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'chat_admin' ? 'bg-white dark:bg-ncc-navy text-red-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chat with Admin
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'registry' ? (
                    <motion.div 
                        key="registry-tab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        {/* Active Requests Section */}
                        {activeRequests.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    Active Emergency Requests
                                </h2>
                                {activeRequests.map(req => (
                                    <ActiveRequestCard 
                                        key={req.id} 
                                        request={req} 
                                        userEnrollmentId={userEnrollmentId} 
                                        userRole={userRole} 
                                        userInstitutionId={userInstitutionId}
                                        cadets={cadets} 
                                        onEdit={handleEditRequest}
                                        onDelete={handleDeleteRequest}
                                        onChat={onChat}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Only show Search and Donor List to Admins or if active tab is registry */}
                        {userRole === 'admin' ? (
                            <>
                                <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm">
                                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                                        <div className="relative w-full md:w-96">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input 
                                                type="text"
                                                placeholder="Search donors by name..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-gray-700 dark:text-white transition-all"
                                            />
                                        </div>
                                        
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {bloodGroups.map(group => (
                                                <BloodGroupTag 
                                                    key={group} 
                                                    group={group} 
                                                    isActive={selectedGroup === group}
                                                    onClick={() => setSelectedGroup(group)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {donors.length > 0 ? (
                                            donors.map(donor => (
                                                <DonorCard key={donor.id} donor={donor} onChat={onChat} />
                                            ))
                                        ) : (
                                            <motion.div 
                                                initial={{ opacity: 0 }} 
                                                animate={{ opacity: 1 }}
                                                className="col-span-full py-20 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10"
                                            >
                                                <Droplet className="w-16 h-16 text-gray-200 dark:text-white/10 mx-auto mb-4" />
                                                <p className="text-gray-400 dark:text-white/40 font-black uppercase tracking-widest">No donors found for this criteria</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : activeRequests.length === 0 && (
                            <div className="py-20 text-center bg-white dark:bg-[#050b14] rounded-[3rem] border border-gray-100 dark:border-white/10 shadow-sm">
                                <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-black text-ncc-navy dark:text-white mb-2">Unit Safety Secured</h3>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">There are currently no active emergency blood requests. Thank you for being ready to serve.</p>
                            </div>
                        )}
                    </motion.div>
                ) : activeTab === 'chat_admin' ? (
                    <motion.div
                        key="chat-tab"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-transparent rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5"
                    >
                        <DirectChat initialCadetId="admin" onClose={() => setActiveTab('registry')} />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="logs-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {/* Donation Response Log - ADMIN ONLY */}
                        <div className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] border border-[#ddd8cc] shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                                <h2 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                    <History className="w-4 h-4 text-ncc-navy dark:text-white" />
                                    Donation Response Log
                                </h2>

                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input 
                                        type="text"
                                        placeholder="Search by Name or Reg No..."
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-xs text-gray-700 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                            
                            {donationLogs.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/10">
                                                <th className="pb-4 px-2">Date</th>
                                                <th className="pb-4 px-2">Donor</th>
                                                <th className="pb-4 px-2">Patient</th>
                                                <th className="pb-4 px-2">Location</th>
                                                <th className="pb-4 px-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs font-bold text-gray-600 dark:text-white/70">
                                            {donationLogs.filter(log => 
                                                log.donorName?.toLowerCase().includes(logSearch.toLowerCase()) ||
                                                log.donorRegNo?.toLowerCase().includes(logSearch.toLowerCase())
                                            ).map(log => (
                                                <tr key={log.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="py-4 px-2">{log.timestamp?.toDate().toLocaleDateString()}</td>
                                                    <td className="py-4 px-2">
                                                        <div className="flex flex-col">
                                                            <span>{log.donorName}</span>
                                                            <span className="text-[10px] text-gray-400">{log.donorRegNo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-red-600">{log.patientName}</span>
                                                            <span className="text-[10px] text-gray-400">{log.bloodGroup}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 truncate max-w-[150px]">{log.location}</td>
                                                    <td className="py-4 px-2">
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => window.open(`tel:${log.patientPhone}`)}
                                                                className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-ncc-navy hover:text-white transition-all"
                                                            >
                                                                <Phone className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteLog(log.id)}
                                                                className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <Info className="w-16 h-16 text-gray-200 dark:text-white/10 mx-auto mb-4" />
                                    <p className="text-gray-400 dark:text-white/40 font-black uppercase tracking-widest">No donation responses logged yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                )}
            </AnimatePresence>

            {/* Request Modal */}
            <AnimatePresence>
                {showRequestModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-ncc-navy/80 backdrop-blur-sm"
                            onClick={() => setShowRequestModal(false)}
                        />
                        <motion.form 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onSubmit={handleCreateRequest}
                            className="relative w-full max-w-lg bg-white dark:bg-[#050b14] rounded-[3rem] shadow-2xl p-10 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
                            <button 
                                type="button"
                                onClick={() => setShowRequestModal(false)}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-2xl font-black text-ncc-navy dark:text-white mb-2">
                                {editingRequestId ? 'Edit' : 'Create'} Emergency <span className="text-red-600">Request</span>
                            </h2>
                            <p className="text-gray-400 dark:text-white/60 text-xs mb-8">
                                {editingRequestId ? 'Update the details for this patient.' : 'This will notify all cadets in real-time.'}
                            </p>

                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="Patient Name *"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl font-bold"
                                    value={formData.patientName}
                                    onChange={e => setFormData({...formData, patientName: e.target.value})}
                                />
                                <input 
                                    type="tel" 
                                    placeholder="Patient/Attendant Phone *"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl font-bold"
                                    value={formData.patientPhone}
                                    onChange={e => setFormData({...formData, patientPhone: e.target.value})}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Hospital Name *"
                                    required
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl font-bold"
                                    value={formData.hospital}
                                    onChange={e => setFormData({...formData, hospital: e.target.value})}
                                />
                                <select 
                                    className="w-full p-4 bg-gray-50 dark:bg-[#0a1628] border border-gray-100 dark:border-white/10 rounded-2xl font-bold text-ncc-navy dark:text-white outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                                    required
                                    value={formData.bloodGroup}
                                    onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                                >
                                    <option value="" className="dark:bg-[#0a1628]">Select Blood Group *</option>
                                    {bloodGroups.filter(g => g !== 'ALL').map(g => (
                                        <option key={g} value={g} className="dark:bg-[#0a1628] dark:text-white">
                                            {g}
                                        </option>
                                    ))}
                                </select>
                                <textarea 
                                    placeholder="Additional Details (e.g. Unit requirement, deadline)"
                                    className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl font-bold h-24 resize-none"
                                    value={formData.details}
                                    onChange={e => setFormData({...formData, details: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full mt-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 dark:shadow-none"
                            >
                                {editingRequestId ? 'Update Request' : 'Broadcast Alert'}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BloodRegistry;
