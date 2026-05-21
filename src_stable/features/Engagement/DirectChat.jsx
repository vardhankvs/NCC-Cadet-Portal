import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { db } from '../../firebase/config.js';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Send, Search, User, MessageCircle, Clock, CheckCircle, ChevronLeft, Droplet, Users, Trash2, Edit3, X } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const DirectChat = ({ initialCadetId, onClose }) => {
    const { user, userRole, userEnrollmentId } = useAuthContext();
    const { cadets } = useDataContext();
    const isAdmin = userRole === 'admin';
    
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Edit state
    const [editingMsg, setEditingMsg] = useState(null);
    const [editValue, setEditValue] = useState('');
    
    // Context Menu / Long Press state
    const [contextMenu, setContextMenu] = useState(null); // { x, y, msgId }
    
    const scrollRef = useRef(null);
    const longPressTimer = useRef(null);
    const isTypingRef = useRef(false);
    const typingTimeout = useRef(null);

    // 1. Fetch Conversations
    useEffect(() => {
        const ref = getCollectionRef('conversations');
        if (!ref) return;

        let q;
        if (isAdmin) {
            q = query(ref);
        } else {
            q = query(ref, where('participants', 'array-contains', userEnrollmentId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Sort in memory to avoid index requirements
            data.sort((a, b) => (b.lastTimestamp?.seconds || 0) - (a.lastTimestamp?.seconds || 0));
            
            setConversations(data);
            
            if (!isAdmin && !activeConv) {
                const adminConv = data.find(c => c.participants.includes('admin') && c.participants.includes(userEnrollmentId));
                if (adminConv) {
                    setActiveConv(adminConv);
                } else {
                    setActiveConv({
                        id: `new_admin`,
                        cadetName: 'Admin',
                        cadetEnrollmentId: 'admin',
                        participants: ['admin', userEnrollmentId]
                    });
                }
            } else if (isAdmin && initialCadetId && !activeConv) {
                const targetId = initialCadetId;
                const existing = data.find(c => c.participants.includes(targetId) && c.participants.includes('admin'));
                
                if (existing) {
                    setActiveConv(existing);
                } else {
                    const targetCadet = cadets.find(c => c.enrollmentId === initialCadetId);
                    if (targetCadet) {
                        setActiveConv({
                            id: `new_${initialCadetId}`,
                            cadetName: targetCadet.name,
                            cadetEnrollmentId: initialCadetId,
                            participants: ['admin', initialCadetId]
                        });
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [isAdmin, userEnrollmentId, initialCadetId]);

    // 2. Fetch Messages for Active Conversation
    useEffect(() => {
        if (!activeConv || activeConv.id.startsWith('new_')) {
            setMessages([]);
            return;
        }

        const msgRef = collection(getCollectionRef('conversations'), activeConv.id, 'messages');
        const q = query(msgRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Mark conversation as read
            const isUnreadByMe = activeConv.unreadBy?.includes(isAdmin ? 'admin' : userEnrollmentId);
            if (isUnreadByMe) {
                const convRef = doc(getCollectionRef('conversations'), activeConv.id);
                updateDoc(convRef, {
                    unreadBy: []
                });
            }

            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsubscribe();
    }, [activeConv, isAdmin, userEnrollmentId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConv) return;

        setLoading(true);
        try {
            const currentCadetId = isAdmin ? activeConv.cadetEnrollmentId : userEnrollmentId;
            let convId = activeConv.id;

            if (convId.startsWith('new_')) {
                convId = `admin_${currentCadetId}`;
                const newConvRef = doc(getCollectionRef('conversations'), convId);
                const cadetName = isAdmin ? activeConv.cadetName : (cadets.find(c => c.enrollmentId === userEnrollmentId)?.name || 'Cadet');
                
                await setDoc(newConvRef, {
                    participants: ['admin', currentCadetId],
                    cadetName: cadetName,
                    cadetEnrollmentId: currentCadetId,
                    lastMessage: newMessage,
                    lastTimestamp: serverTimestamp(),
                    unreadBy: isAdmin ? [currentCadetId] : ['admin']
                });
                setActiveConv({ ...activeConv, id: convId });
            } else {
                await updateDoc(doc(getCollectionRef('conversations'), convId), {
                    lastMessage: newMessage,
                    lastTimestamp: serverTimestamp(),
                    unreadBy: isAdmin ? [currentCadetId] : ['admin'],
                    [`typing.${isAdmin ? 'admin' : userEnrollmentId}`]: false
                });
            }

            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            isTypingRef.current = false;

            const msgRef = collection(getCollectionRef('conversations'), convId, 'messages');
            await addDoc(msgRef, {
                senderId: isAdmin ? 'admin' : userEnrollmentId,
                senderName: isAdmin ? 'Admin' : (cadets.find(c => c.enrollmentId === userEnrollmentId)?.name || 'Cadet'),
                text: newMessage,
                timestamp: serverTimestamp(),
                isRead: false
            });

            setNewMessage('');
            if (isAdmin) sendPushToAll('💬 New Message from Admin', 'You have a new message. Check your messages tab.');
        } catch (err) {
            console.error(err);
            toast.error("Failed to send message. Permission Denied.");
        } finally {
            setLoading(false);
        }
    };

    const handleUnsend = async (msgId) => {
        if (!activeConv) return;
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        // Smart check: Only allow if unread by recipient
        const isReadByRecipient = activeConv.unreadBy?.length === 0;
        if (isReadByRecipient) {
            return toast.info("Cannot unsend: Message already read.");
        }

        try {
            const msgRef = doc(getCollectionRef('conversations'), activeConv.id, 'messages', msgId);
            await deleteDoc(msgRef);
            toast.success("Message unsent.");
            setContextMenu(null);
        } catch (e) {
            toast.error("Unsend failed.");
        }
    };

    const handleEditStart = (msg) => {
        const isReadByRecipient = activeConv.unreadBy?.length === 0;
        if (isReadByRecipient) {
            return toast.info("Cannot edit: Message already read.");
        }
        setEditingMsg(msg);
        setEditValue(msg.text);
        setContextMenu(null);
    };

    const handleSaveEdit = async () => {
        if (!editingMsg || !editValue.trim()) return;
        try {
            const msgRef = doc(getCollectionRef('conversations'), activeConv.id, 'messages', editingMsg.id);
            await updateDoc(msgRef, {
                text: editValue,
                isEdited: true
            });
            setEditingMsg(null);
            setEditValue('');
            toast.success("Message updated.");
        } catch (e) {
            toast.error("Update failed.");
        }
    };

    // Long Press Handlers
    const onTouchStart = (e, msgId) => {
        const touch = e.touches[0];
        longPressTimer.current = setTimeout(() => {
            setContextMenu({ x: touch.clientX, y: touch.clientY, msgId });
        }, 600);
    };

    const onMouseDown = (e, msgId) => {
        longPressTimer.current = setTimeout(() => {
            setContextMenu({ x: e.clientX, y: e.clientY, msgId });
        }, 600);
    };

    const clearTimer = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const filteredConversations = conversations.filter(c => 
        c.cadetName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.cadetEnrollmentId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Global Cadet Search (to start new chats)
    const searchResults = searchQuery.trim() ? cadets.filter(c => {
        const isMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.enrollmentId?.toLowerCase().includes(searchQuery.toLowerCase());
        const alreadyInConvs = conversations.some(conv => conv.participants.includes(c.enrollmentId));
        return isMatch && !alreadyInConvs;
    }) : [];

    const startNewChat = (cadet) => {
        setActiveConv({
            id: `new_${cadet.enrollmentId}`,
            cadetName: cadet.name,
            cadetEnrollmentId: cadet.enrollmentId,
            participants: ['admin', cadet.enrollmentId]
        });
        setSearchQuery('');
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        
        if (!activeConv || activeConv.id.startsWith('new_')) return;
        
        const currentUserId = isAdmin ? 'admin' : userEnrollmentId;
        const convRef = doc(getCollectionRef('conversations'), activeConv.id);

        if (e.target.value.trim() === '') {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                updateDoc(convRef, {
                    [`typing.${currentUserId}`]: false
                }).catch(() => {});
            }
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            return;
        }

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            updateDoc(convRef, {
                [`typing.${currentUserId}`]: true
            }).catch(() => {});
        }

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            isTypingRef.current = false;
            updateDoc(convRef, {
                [`typing.${currentUserId}`]: false
            }).catch(() => {});
        }, 2000);
    };

    const currentLiveConv = activeConv ? conversations.find(c => c.id === activeConv.id) || activeConv : null;
    const otherUserId = activeConv ? (isAdmin ? activeConv.cadetEnrollmentId : 'admin') : null;
    const isOtherTyping = currentLiveConv?.typing?.[otherUserId];

    return (
        <div className="h-[85vh] flex bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-[#ddd8cc] dark:border-white/10 shadow-2xl overflow-hidden fade-in relative">
            {/* Sidebar */}
            {isAdmin && (
                <div className={`w-full md:w-80 border-r border-gray-100 dark:border-white/10 flex flex-col ${activeConv ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-gray-50 dark:border-white/5">
                        <h2 className="text-xl font-black text-ncc-navy dark:text-white mb-4 italic">Strategy <span className="text-ncc-gold">Center</span></h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search Name or Reg No..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-ncc-gold transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto ncc-scrollbar">
                        {/* Search Results (New Contacts) */}
                        {searchResults.length > 0 && (
                            <div className="p-3">
                                <p className="text-[8px] font-black text-ncc-gold uppercase tracking-[0.2em] px-3 mb-2">Unit Directory Results</p>
                                {searchResults.map(cadet => (
                                    <button
                                        key={cadet.id}
                                        onClick={() => startNewChat(cadet)}
                                        className="w-full p-3 flex items-center gap-3 rounded-2xl hover:bg-ncc-navy/5 dark:hover:bg-white/5 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-ncc-gold/10 flex items-center justify-center font-black text-ncc-gold shrink-0 group-hover:bg-ncc-gold group-hover:text-white transition-all">
                                            {cadet.name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-black text-ncc-navy dark:text-white truncate">{cadet.name}</h4>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase">{cadet.enrollmentId}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Recent Conversations */}
                        {searchQuery && filteredConversations.length > 0 && (
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] px-6 mt-4 mb-2">Existing Chats</p>
                        )}
                        
                        {filteredConversations.map(conv => {
                            const isThisOtherTyping = conv.typing?.[isAdmin ? conv.cadetEnrollmentId : 'admin'];
                            return (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConv(conv)}
                                className={`w-full p-4 flex items-center gap-3 border-b border-gray-50 dark:border-white/5 transition-all hover:bg-gray-50 dark:hover:bg-white/5 text-left ${activeConv?.id === conv.id ? 'bg-gray-50 dark:bg-white/10 border-l-4 border-l-ncc-gold' : ''}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-ncc-navy flex items-center justify-center font-bold text-ncc-gold shrink-0 shadow-lg shadow-ncc-navy/20">
                                    {conv.cadetName?.[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-sm font-black text-ncc-navy dark:text-white truncate">{conv.cadetName}</h4>
                                        <span className="text-[8px] text-gray-400 font-black">
                                            {conv.lastTimestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {isThisOtherTyping ? (
                                        <p className="text-[10px] text-ncc-gold font-bold uppercase tracking-widest animate-pulse">Typing...</p>
                                    ) : (
                                        <p className="text-[10px] text-gray-400 truncate font-bold uppercase tracking-widest">{conv.lastMessage || 'Open conversation'}</p>
                                    )}
                                </div>
                                {conv.unreadBy?.includes(isAdmin ? 'admin' : userEnrollmentId) && (
                                    <div className="w-2.5 h-2.5 bg-red-600 rounded-full ml-auto animate-pulse shadow-sm shadow-red-200"></div>
                                )}
                            </button>
                            );
                        })}

                        {!searchQuery && conversations.length === 0 && (
                            <div className="p-10 text-center opacity-20">
                                <Users className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No active chats</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!activeConv && isAdmin ? 'hidden md:flex' : 'flex'}`}>
                {activeConv ? (
                    <>
                        <header className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#050b14]/50 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                {isAdmin && (
                                    <button onClick={() => setActiveConv(null)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="w-10 h-10 rounded-full bg-ncc-navy flex items-center justify-center font-bold text-ncc-gold">
                                    {isAdmin ? activeConv.cadetName?.[0] : 'A'}
                                </div>
                                <div>
                                    <h3 className="font-black text-ncc-navy dark:text-white text-sm">{isAdmin ? activeConv.cadetName : 'Admin (Unit Officer)'}</h3>
                                    {isOtherTyping ? (
                                        <p className="text-[10px] font-black text-ncc-gold uppercase tracking-widest animate-pulse">Typing...</p>
                                    ) : (
                                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Connection</p>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 ncc-scrollbar bg-gray-50/30 dark:bg-transparent" onClick={() => setContextMenu(null)}>
                            {messages.map(msg => {
                                const isMe = isAdmin ? msg.senderId === 'admin' : msg.senderId === userEnrollmentId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div 
                                            onTouchStart={(e) => isMe && onTouchStart(e, msg.id)}
                                            onTouchEnd={clearTimer}
                                            onMouseDown={(e) => isMe && onMouseDown(e, msg.id)}
                                            onMouseUp={clearTimer}
                                            className={`group relative max-w-[70%] p-4 rounded-3xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer ${isMe ? 'bg-ncc-navy text-white rounded-tr-none' : 'bg-white dark:bg-white/10 text-ncc-navy dark:text-white rounded-tl-none border border-gray-100 dark:border-white/5'}`}
                                        >
                                            <p>{msg.text}</p>
                                            {msg.isEdited && <span className="text-[8px] opacity-40 italic block mt-1">(edited)</span>}
                                            <div className={`text-[8px] mt-2 flex items-center gap-1 opacity-50 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <Clock className="w-2 h-2" />
                                                {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {isOtherTyping && (
                                <div className="flex justify-start fade-in">
                                    <div className="bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 rounded-3xl rounded-tl-none p-4 w-16 h-12 flex items-center justify-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}

                            <div ref={scrollRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#050b14]">
                            {editingMsg ? (
                                <div className="flex gap-4 items-center bg-ncc-gold/10 p-2 pr-4 rounded-2xl border border-ncc-gold/30">
                                    <input 
                                        type="text"
                                        className="flex-1 bg-transparent py-3 px-4 outline-none font-bold text-sm text-ncc-navy dark:text-white"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={() => setEditingMsg(null)} className="p-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    <button onClick={handleSaveEdit} className="p-3 bg-ncc-gold text-white rounded-xl hover:scale-105 transition-all"><CheckCircle className="w-5 h-5" /></button>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex gap-4 items-center bg-gray-50 dark:bg-white/5 p-2 pr-2 rounded-2xl border border-gray-100 dark:border-white/10">
                                    <input 
                                        type="text"
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent py-3 px-4 outline-none font-bold text-sm dark:text-white"
                                        value={newMessage}
                                        onChange={handleTyping}
                                    />
                                    <button 
                                        disabled={loading || !newMessage.trim()}
                                        className="w-12 h-12 flex items-center justify-center bg-ncc-navy text-white rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-30">
                        <MessageCircle className="w-24 h-24 text-gray-300 mb-8" />
                        <h3 className="text-2xl font-black text-ncc-navy dark:text-white mb-2">Unit Secure Messaging</h3>
                        <p className="text-sm font-bold">Strategic real-time communication channel.</p>
                    </div>
                )}
            </div>

            {/* Context Menu Modal */}
            <AnimatePresence>
                {contextMenu && (
                    <div 
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
                        onClick={() => setContextMenu(null)}
                    >
                        <div 
                            className="bg-white dark:bg-[#0a1628] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 p-2 min-w-[180px] scale-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => handleEditStart(messages.find(m => m.id === contextMenu.msgId))}
                                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl text-xs font-black text-gray-600 dark:text-white uppercase tracking-widest transition-all"
                            >
                                <Edit3 className="w-4 h-4 text-ncc-gold" />
                                Edit Message
                            </button>
                            <button 
                                onClick={() => handleUnsend(contextMenu.msgId)}
                                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Unsend (Delete)
                            </button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
