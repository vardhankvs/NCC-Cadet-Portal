// src/features/Career/CareerGuidanceView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { getCollectionRef, saveCareerNotice, deleteCareerNotice, submitMentorshipRequest } from '../../firebase/firestoreService.js';
import { onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import axios from 'axios';
import { 
    Megaphone, 
    ExternalLink, 
    Trash2, 
    Edit3, 
    Plus, 
    Briefcase, 
    Award, 
    BookOpen, 
    Clock, 
    Users, 
    Star, 
    Target, 
    Activity, 
    ShieldCheck, 
    FileText, 
    Download, 
    ChevronRight, 
    Sparkles 
} from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

// Web Audio API Synthesized Audio Beeps
const playBeep = (freq = 800, duration = 0.15) => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn('Audio Context not allowed or initialized', e);
    }
};

const ppdtSlides = [
    {
        id: 1,
        title: "Camp Security & Patrolling",
        image: "https://images.unsplash.com/photo-1579710039805-a50d4922f28e?auto=format&fit=crop&q=80&w=800",
        description: "A military camp layout with cadets patrolling or standing guard."
    },
    {
        id: 2,
        title: "Group Interaction & Strategic Briefing",
        image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800",
        description: "A group of young people interacting in a rural or office setting."
    },
    {
        id: 3,
        title: "Disaster Relief & Landslide Area",
        image: "https://images.unsplash.com/photo-1508847154043-be12a3b53a21?auto=format&fit=crop&q=80&w=800",
        description: "People helping clear paths or assisting during a heavy rainfall scenario."
    },
    {
        id: 4,
        title: "Village Reconstruction & Social Service",
        image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
        description: "Group of cadets collaborating in an open-air community project."
    }
];

const oirQuestions = [
    {
        id: 1,
        question: "If 'COMMAND' is coded as 'EPQOCPF', what is the code for 'ARMY'?",
        options: ["CTOA", "CTOC", "CSOA", "BSNZ"],
        answer: 0,
        explanation: "Every letter is shifted forward by 2 positions (A+2 = C, R+2 = T, M+2 = O, Y+2 = A)."
    },
    {
        id: 2,
        question: "Complete the series: 3, 8, 18, 38, 78, ...",
        options: ["118", "138", "158", "178"],
        answer: 2,
        explanation: "The pattern is: next term = (current term * 2) + 2. So (78 * 2) + 2 = 156 + 2 = 158."
    },
    {
        id: 3,
        question: "Which of the following numbers is the odd one out: 27, 64, 125, 144, 216?",
        options: ["64", "125", "144", "216"],
        answer: 2,
        explanation: "All others are perfect cubes (27 = 3³, 64 = 4³, 125 = 5³, 216 = 6³), whereas 144 is a perfect square (12²)."
    },
    {
        id: 4,
        question: "A man walks 6 km South, turns Left and walks 4 km, then turns Left again and walks 5 km. Which direction is he facing now?",
        options: ["North", "South", "East", "West"],
        answer: 0,
        explanation: "Walking South, turning left faces him East. Turning left again turns him North."
    },
    {
        id: 5,
        question: "If '+' means '*', '-' means '/', '*' means '+' and '/' means '-', what is the value of: 15 - 3 + 10 * 5 / 2?",
        options: ["53", "48", "37", "50"],
        answer: 0,
        explanation: "Substitute the operators: 15 / 3 * 10 + 5 - 2. By BODMAS, division first: 5 * 10 + 5 - 2 = 50 + 5 - 2 = 53."
    }
];

const defaultCalculatorSchemes = [
    {
        title: "NCC Special Entry Scheme (Indian Army)",
        type: "Direct SSB (No Written Exam)",
        description: "Provides direct entry into the Indian Army as a Short Service Commissioned Officer. No CDSE written exam is required; shortlisted candidates are called directly for SSB.",
        ageLimit: "19 to 25 Years",
        minAge: "19",
        maxAge: "25",
        degreeStatus: "completed_or_pursuing",
        cgpa: "50",
        certType: "C",
        certGrade: "B",
        link: "https://joinindianarmy.nic.in/"
    },
    {
        title: "NCC Special Entry Scheme (Indian Navy)",
        type: "Direct SSB (No Written Exam)",
        description: "Provides direct entry into the Executive/Technical branch of the Indian Navy. Selected cadets bypass the INET written exam and go directly to the SSB interview.",
        ageLimit: "19 to 24 Years",
        minAge: "19",
        maxAge: "24",
        degreeStatus: "completed_or_pursuing",
        cgpa: "50",
        certType: "C",
        certGrade: "B",
        link: "https://www.joinindiannavy.gov.in/"
    },
    {
        title: "NCC Special Entry (Indian Air Force - Flying Branch)",
        type: "Direct SSB (No Written Exam)",
        description: "Direct entry into the Flying Branch of the IAF. Bypass the written AFCAT exam and proceed directly to SSB and AFSB testing.",
        ageLimit: "20 to 24 Years",
        minAge: "20",
        maxAge: "24",
        degreeStatus: "completed_or_pursuing",
        cgpa: "60",
        certType: "C",
        certGrade: "B",
        link: "https://afcat.cdac.in/"
    },
    {
        title: "CDS Entry (UPSC Exam - Army/Navy/Air Force)",
        type: "Written Exam + SSB (NCC Cadets Reservation)",
        description: "Standard combined defense entry with written CDSE exam. NCC 'C' certificate holders get valuable relaxation marks and dedicated vacancy reservations (approx. 10-15 seats per course).",
        ageLimit: "19 to 24 Years",
        minAge: "19",
        maxAge: "24",
        degreeStatus: "completed_or_pursuing",
        cgpa: "35",
        certType: "none",
        certGrade: "none",
        link: "https://www.upsc.gov.in/"
    },
    {
        title: "AFCAT Entry (IAF Air Force Common Admission Test)",
        type: "Written Exam + AFSB",
        description: "Standard entry for technical and ground duty branches of the Indian Air Force. Written exam is required, but NCC background helps immensely in the interview phase.",
        ageLimit: "20 to 26 Years (20-24 Flying, 20-26 Ground Duty)",
        minAge: "20",
        maxAge: "26",
        degreeStatus: "completed_or_pursuing",
        cgpa: "60",
        certType: "none",
        certGrade: "none",
        link: "https://afcat.cdac.in/"
    }
];

const featuredDefenseAlumni = [
    {
        name: "Lieutenant Satish Verma",
        rank: "Lt.",
        wing: "Army Wing",
        year: "2022",
        commission: "16 Madras Regiment",
        achievement: "Commissioned through NCC Special Entry Scheme (Direct SSB OTA Chennai)",
        email: "satish.verma@indianarmy.nic.in"
    },
    {
        name: "Sub Inspector Satyam Naidu",
        rank: "SI",
        wing: "Navy Wing",
        year: "2021",
        commission: "Border Security Force (BSF)",
        achievement: "Cleared CDSE and CAPF Assistant Commandant Interviews",
        email: "satyam.naidu@bsf.gov.in"
    },
    {
        name: "Flying Officer Hemant Kumar",
        rank: "Fg Offr",
        wing: "Air Wing",
        year: "2023",
        commission: "IAF Fighter Squadron",
        achievement: "Commissioned through Air Wing NCC Direct Entry (AFSB Mysore)",
        email: "hemant.kumar@iaf.in"
    }
];

// Logic matching calculator parameters against database schemes
const checkEligibilityList = (inputs, schemesList) => {
    const age = parseInt(inputs.age || '0');
    const degreeStatus = inputs.degreeStatus; 
    const cgpa = parseFloat(inputs.cgpa || '0');
    const certType = inputs.certType; 
    const certGrade = inputs.certGrade; 

    return schemesList.filter(scheme => {
        const minAge = parseInt(scheme.minAge || '17');
        const maxAge = parseInt(scheme.maxAge || '30');
        if (age < minAge || age > maxAge) return false;

        const reqDegree = scheme.degreeStatus || 'completed_or_pursuing';
        if (reqDegree === 'completed' && degreeStatus !== 'completed') return false;
        if (reqDegree === 'completed_or_pursuing' && degreeStatus === 'no') return false;

        const reqCgpa = parseFloat(scheme.cgpa || '0');
        if (cgpa < reqCgpa) return false;

        const getCertWeight = (c) => {
            if (c === 'C') return 3;
            if (c === 'B') return 2;
            if (c === 'A') return 1;
            return 0;
        };
        const reqCert = scheme.certType || 'none';
        if (getCertWeight(certType) < getCertWeight(reqCert)) return false;

        const getGradeWeight = (g) => {
            if (g === 'A') return 3;
            if (g === 'B') return 2;
            if (g === 'C') return 1;
            return 0;
        };
        const reqGrade = scheme.certGrade || 'none';
        if (reqCert !== 'none' && certType !== 'none' && reqGrade !== 'none') {
            if (getGradeWeight(certGrade) < getGradeWeight(reqGrade)) return false;
        }

        return true;
    });
};

export const CareerGuidanceView = () => {
    const { userRole, userProfile: authProfile, userEnrollmentId, userName, user } = useAuthContext();
    const { alumni, cadets, staff } = useDataContext();
    const isWriteAllowed = userRole === 'superadmin' || userRole === 'battalion_admin';

    const userProfile = useMemo(() => {
        if (userRole === 'cadet') {
            const found = cadets.find(c => (c.enrollmentId || '').toLowerCase() === (userEnrollmentId || '').toLowerCase() || c.id === user?.uid);
            if (found) return found;
        }
        const staffFound = staff?.find(s => (s.staffId || '').toLowerCase() === (userEnrollmentId || '').toLowerCase() || (s.email || '').toLowerCase() === (user?.email || '').toLowerCase());
        if (staffFound) return staffFound;

        return authProfile || {
            id: user?.uid || 'user_unknown',
            name: userName || user?.displayName || user?.email || (userRole === 'admin' ? 'ANO / Admin' : 'User'),
            enrollmentId: userEnrollmentId || 'N/A',
            phonePersonal: user?.phoneNumber || '',
            phone: user?.phoneNumber || '',
            personalEmail: user?.email || ''
        };
    }, [cadets, staff, userRole, userEnrollmentId, userName, user, authProfile]);
    
    const [activeSection, setActiveSection] = useState('notices'); 
    
    // Dynamic collections loaded from Firestore
    const [dbWatWords, setDbWatWords] = useState([]);
    const [dbPpdtSlides, setDbPpdtSlides] = useState([]);
    const [dbOirQuestions, setDbOirQuestions] = useState([]);
    const [dbSchemes, setDbSchemes] = useState([]);
    const [dbMentors, setDbMentors] = useState([]);
    const [dbRequests, setDbRequests] = useState([]);

    // Notices states
    const [notices, setNotices] = useState([]);
    const [loadingNotices, setLoadingNotices] = useState(true);
    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', link: '', category: 'Armed Forces' });
    
    // SSB Hub states
    const [ssbTab, setSsbTab] = useState('wat'); 
    
    // WAT states
    const watWordsFallback = useMemo(() => [
        'CONQUER', 'INITIATIVE', 'INTEGRITY', 'TEAM', 'DECISION', 'OBSTACLE', 'COURAGE', 
        'COOPERATION', 'RESPONSIBILITY', 'SACRIFICE', 'HONOR', 'FEAR', 'SUCCESS', 'FAILURE', 
        'COMMAND', 'DISCIPLINE', 'ALERT', 'RISK', 'INTELLIGENCE', 'LOGIC', 'WAR', 'PEACE', 
        'LEADER', 'DETERMINATION', 'LOYALTY', 'ADAPTABILITY', 'CONFIDENCE', 'DUTY', 'JUSTICE', 'EFFORT'
    ], []);

    const activeWatWords = useMemo(() => {
        if (dbWatWords.length > 0) {
            return dbWatWords.map(w => w.word.toUpperCase());
        }
        return watWordsFallback;
    }, [dbWatWords, watWordsFallback]);

    const [watStarted, setWatStarted] = useState(false);
    const [watIndex, setWatIndex] = useState(0);
    const [watTimer, setWatTimer] = useState(15);
    const [watAnswers, setWatAnswers] = useState({});
    const [watSubmitted, setWatSubmitted] = useState(false);
    const watIntervalRef = useRef(null);
    
    // PPDT states
    const activePpdtSlides = useMemo(() => {
        if (dbPpdtSlides.length > 0) {
            return dbPpdtSlides;
        }
        return ppdtSlides;
    }, [dbPpdtSlides]);

    const [ppdtStarted, setPpdtStarted] = useState(false);
    const [ppdtPhase, setPpdtPhase] = useState('view'); 
    const [ppdtTimer, setPpdtTimer] = useState(30);
    const [ppdtSelectedImage, setPpdtSelectedImage] = useState(activePpdtSlides[0] || ppdtSlides[0]);
    const ppdtIntervalRef = useRef(null);

    useEffect(() => {
        if (activePpdtSlides.length > 0) {
            setPpdtSelectedImage(activePpdtSlides[0]);
        }
    }, [activePpdtSlides]);
    
    // OIR states
    const activeOirQuestions = useMemo(() => {
        if (dbOirQuestions.length > 0) {
            return dbOirQuestions;
        }
        return oirQuestions;
    }, [dbOirQuestions]);

    const [oirStarted, setOirStarted] = useState(false);
    const [oirAnswers, setOirAnswers] = useState({});
    const [oirSubmitted, setOirSubmitted] = useState(false);
    
    // Calculator states
    const activeSchemes = useMemo(() => {
        if (dbSchemes.length > 0) {
            return dbSchemes;
        }
        return defaultCalculatorSchemes;
    }, [dbSchemes]);

    const [calculatorInputs, setCalculatorInputs] = useState({
        age: '21',
        gender: 'male',
        degreeStatus: 'completed',
        cgpa: '65',
        certType: 'C',
        certGrade: 'A'
    });

    const activeEligibilityResults = useMemo(() => {
        return checkEligibilityList(calculatorInputs, activeSchemes);
    }, [calculatorInputs, activeSchemes]);
    
    // Mentors states
    const activeMentors = useMemo(() => {
        if (dbMentors.length > 0) return dbMentors;
        return featuredDefenseAlumni;
    }, [dbMentors]);

    // Filter Alumni in Defense Service from Global Context
    const defenseAlumniFromDb = useMemo(() => {
        if (!Array.isArray(alumni)) return [];
        return alumni.filter(a => {
            const org = (a.hallOfFameDetails?.organization || '').toLowerCase();
            const achievement = (a.hallOfFameDetails?.achievement || '').toLowerCase();
            const rank = (a.rank || '').toLowerCase();
            
            const matchesService = org.includes('army') || org.includes('navy') || org.includes('air') || org.includes('defence') || org.includes('police') || org.includes('bsf') || org.includes('crpf') || org.includes('force');
            const matchesAchievement = achievement.includes('lieutenant') || achievement.includes('captain') || achievement.includes('commissioned') || achievement.includes('ssb') || achievement.includes('officer');
            const matchesRank = rank !== 'cdt' && rank !== 'cadet' && rank !== '';
            
            return matchesService || matchesAchievement || matchesRank;
        });
    }, [alumni]);

    const [showMentorshipModal, setShowMentorshipModal] = useState(false);
    const [mentorshipStep, setMentorshipStep] = useState(1);
    const [selectedMentorForRequest, setSelectedMentorForRequest] = useState(null);

    // --- Admin Console states ---
    const [adminSubTab, setAdminSubTab] = useState('wat'); 
    
    // Admin CRUD forms
    const [newWatWord, setNewWatWord] = useState('');
    
    const [ppdtForm, setPpdtForm] = useState({ title: '', image: '', description: '' });
    const [editPpdtId, setEditPpdtId] = useState(null);

    const [oirForm, setOirForm] = useState({
        question: '',
        optA: '',
        optB: '',
        optC: '',
        optD: '',
        answer: '0',
        explanation: ''
    });
    const [editOirId, setEditOirId] = useState(null);

    const [schemeForm, setSchemeForm] = useState({
        title: '',
        type: 'Direct SSB (No Written Exam)',
        description: '',
        ageLimit: '19 to 25 Years',
        minAge: '19',
        maxAge: '25',
        degreeStatus: 'completed_or_pursuing',
        cgpa: '50',
        certType: 'C',
        certGrade: 'B',
        link: ''
    });
    const [editSchemeId, setEditSchemeId] = useState(null);

    const [mentorForm, setMentorForm] = useState({
        name: '',
        rank: 'Lt.',
        wing: 'Army Wing',
        year: '2025',
        commission: '',
        achievement: '',
        email: ''
    });
    const [editMentorId, setEditMentorId] = useState(null);

    // --- Dynamic Subscriptions ---

    // Load Notices
    useEffect(() => {
        const ref = getCollectionRef('career_notices');
        if (!ref) return;
        
        const q = query(ref, orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingNotices(false);
        });
        return unsubscribe;
    }, []);

    // Load WAT Words from DB
    useEffect(() => {
        const ref = getCollectionRef('ssb_wat_words');
        if (!ref) return;
        const q = query(ref, orderBy('word', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setDbWatWords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    // Load PPDT Slides from DB
    useEffect(() => {
        const ref = getCollectionRef('ssb_ppdt_slides');
        if (!ref) return;
        const q = query(ref, orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setDbPpdtSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    // Load OIR Questions from DB
    useEffect(() => {
        const ref = getCollectionRef('ssb_oir_questions');
        if (!ref) return;
        const q = query(ref, orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setDbOirQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    // Load Schemes from DB
    useEffect(() => {
        const ref = getCollectionRef('ssb_calculator_schemes');
        if (!ref) return;
        const q = query(ref, orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setDbSchemes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    // Load Mentors from DB
    useEffect(() => {
        const ref = getCollectionRef('ssb_mentors');
        if (!ref) return;
        const q = query(ref, orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setDbMentors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    // Load Requests from DB (Admins only)
    useEffect(() => {
        if (!isWriteAllowed) return;
        const ref = getCollectionRef('mentorship_requests');
        if (!ref) return;
        const q = query(ref, orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setDbRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [isWriteAllowed]);

    // WAT Interval Controller
    useEffect(() => {
        if (watStarted) {
            watIntervalRef.current = setInterval(() => {
                setWatTimer((prev) => {
                    if (prev <= 1) {
                        playBeep(900, 0.2); 
                        setWatIndex((prevIdx) => {
                            if (prevIdx >= activeWatWords.length - 1) {
                                setWatStarted(false);
                                setWatSubmitted(true);
                                clearInterval(watIntervalRef.current);
                                toast.success("WAT Training Session Complete!");
                                return prevIdx;
                            }
                            return prevIdx + 1;
                        });
                        return 15;
                    }
                    if (prev === 4 || prev === 3 || prev === 2) {
                        playBeep(450, 0.08); 
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (watIntervalRef.current) clearInterval(watIntervalRef.current);
        }
        return () => { if (watIntervalRef.current) clearInterval(watIntervalRef.current); };
    }, [watStarted, activeWatWords]);

    const handleNextWatWord = () => {
        playBeep(900, 0.15);
        setWatIndex((prevIdx) => {
            if (prevIdx >= activeWatWords.length - 1) {
                setWatStarted(false);
                setWatSubmitted(true);
                if (watIntervalRef.current) clearInterval(watIntervalRef.current);
                toast.success("WAT Training Session Complete!");
                return prevIdx;
            }
            setWatTimer(15);
            return prevIdx + 1;
        });
    };

    const downloadWatResponses = () => {
        let content = "=== GMRIT NCC - SSB Word Association Test (WAT) Responses ===\n\n";
        content += `Date: ${new Date().toLocaleDateString()}\n`;
        content += `Cadet Name: ${userProfile?.name || 'Cadet'}\n`;
        content += `Regimental Number: ${userProfile?.enrollmentId || 'N/A'}\n\n`;
        activeWatWords.forEach((word, idx) => {
            const answer = watAnswers[idx] || "(No sentence written)";
            content += `${idx + 1}. ${word} => ${answer}\n`;
        });
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `WAT_Practice_Responses_${userProfile?.name || 'Cadet'}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // PPDT Interval Controller
    useEffect(() => {
        if (ppdtStarted) {
            ppdtIntervalRef.current = setInterval(() => {
                setPpdtTimer((prev) => {
                    if (prev <= 1) {
                        if (ppdtPhase === 'view') {
                            playBeep(1000, 0.4);
                            setPpdtPhase('write');
                            return 240; 
                        } else {
                            playBeep(1200, 0.6);
                            setPpdtStarted(false);
                            toast.success("PPDT Writing Session Time Up!");
                            return 30;
                        }
                    }
                    if (ppdtPhase === 'write' && prev === 30) {
                        playBeep(500, 0.3);
                        toast.warning("30 Seconds Remaining!");
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (ppdtIntervalRef.current) clearInterval(ppdtIntervalRef.current);
        }
        return () => { if (ppdtIntervalRef.current) clearInterval(ppdtIntervalRef.current); };
    }, [ppdtStarted, ppdtPhase]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Notices Sync
    const handleSync = async () => {
        setSyncing(true);
        try {
            const queryVal = encodeURIComponent('Army Recruitment India');
            const feedUrl = `https://news.google.com/rss/search?q=${queryVal}&hl=en-IN&gl=IN&ceid=IN:en`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
            
            const response = await axios.get(proxyUrl);
            const xmlString = response.data.contents;
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

    // Notice submissions
    const handleNoticeSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await saveCareerNotice(formData, editingId);
                toast.success("Notice updated successfully.");
                sendPushToAll('💼 Career Notice Updated', `${formData.title} has been updated.`, 'career');
                setEditingId(null);
            } else {
                await saveCareerNotice(formData);
                toast.success("Notice posted successfully.");
                sendPushToAll('💼 New Career Opportunity', `${formData.title} has been posted.`, 'career');
            }
            setFormData({ title: '', description: '', link: '', category: 'Armed Forces' });
            setShowNoticeForm(false);
        } catch (err) {
            toast.error("Failed to save: " + err.message);
        }
    };

    const handleNoticeEdit = (notice) => {
        setFormData({
            title: notice.title || '',
            description: notice.description || '',
            link: notice.link || '',
            category: notice.category || 'Armed Forces'
        });
        setEditingId(notice.id);
        setShowNoticeForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleNoticeDelete = async (id) => {
        if (!window.confirm("Delete this notice?")) return;
        try {
            await deleteCareerNotice(id);
            toast.success("Notice deleted.");
        } catch (err) {
            toast.error("Failed to delete.");
        }
    };

    // Mentorship Requests creation
    const handleMentorshipRequest = async () => {
        const cadetProfile = cadets.find(c => c.enrollmentId === userEnrollmentId) 
            || staff?.find(s => s.staffId === userEnrollmentId || s.email === user?.email)
            || userProfile;
        const cadetId = cadetProfile?.id || user?.uid || 'unknown';
        const name = cadetProfile?.name || userName || user?.displayName || user?.email || 'User';
        const enrollId = cadetProfile?.enrollmentId || cadetProfile?.staffId || userEnrollmentId || 'N/A';
        const contact = cadetProfile?.phonePersonal || cadetProfile?.phone || cadetProfile?.personalEmail || cadetProfile?.email || user?.email || 'No Contact Info Provided';
        const mentorName = selectedMentorForRequest?.name || 'Senior Mentor';
        
        try {
            await submitMentorshipRequest(cadetId, name, enrollId, `Mentorship Request for SSB with ${mentorName}. Contact details: ${contact}`);
            setMentorshipStep(2);
        } catch (err) {
            toast.error("Failed to submit request: " + (err.message || err));
            console.error("Mentorship request error:", err);
        }
    };


    // ─── ADMIN CRUD HANDLERS ───

    // WAT CRUD
    const handleAddWatWord = async (e) => {
        e.preventDefault();
        if (!newWatWord.trim()) return;
        try {
            const ref = getCollectionRef('ssb_wat_words');
            await addDoc(ref, {
                word: newWatWord.trim().toUpperCase(),
                createdAt: new Date().toISOString()
            });
            setNewWatWord('');
            toast.success("Word added to database.");
        } catch (e) {
            toast.error("Failed to add word.");
        }
    };

    const handleDeleteWatWord = async (id) => {
        if (!window.confirm("Delete this word?")) return;
        try {
            const ref = getCollectionRef('ssb_wat_words');
            await deleteDoc(doc(ref, id));
            toast.success("Word deleted.");
        } catch (e) {
            toast.error("Failed to delete word.");
        }
    };

    const handleSeedWatWords = async () => {
        if (!window.confirm("Seed default 30 words?")) return;
        try {
            const ref = getCollectionRef('ssb_wat_words');
            for (const word of watWordsFallback) {
                if (!dbWatWords.some(w => w.word.toUpperCase() === word.toUpperCase())) {
                    await addDoc(ref, { word: word.toUpperCase(), createdAt: new Date().toISOString() });
                }
            }
            toast.success("Default words seeded.");
        } catch (e) {
            toast.error("Failed to seed words.");
        }
    };

    // PPDT CRUD
    const handleSavePpdtSlide = async (e) => {
        e.preventDefault();
        if (!ppdtForm.title || !ppdtForm.image) return;
        try {
            const ref = getCollectionRef('ssb_ppdt_slides');
            if (editPpdtId) {
                await updateDoc(doc(ref, editPpdtId), {
                    title: ppdtForm.title,
                    image: ppdtForm.image,
                    description: ppdtForm.description,
                    updatedAt: new Date().toISOString()
                });
                toast.success("Slide updated.");
                setEditPpdtId(null);
            } else {
                await addDoc(ref, {
                    title: ppdtForm.title,
                    image: ppdtForm.image,
                    description: ppdtForm.description,
                    createdAt: new Date().toISOString()
                });
                toast.success("Slide created.");
            }
            setPpdtForm({ title: '', image: '', description: '' });
        } catch (e) {
            toast.error("Failed to save slide.");
        }
    };

    const handleEditPpdtSlide = (slide) => {
        setPpdtForm({
            title: slide.title || '',
            image: slide.image || '',
            description: slide.description || ''
        });
        setEditPpdtId(slide.id);
    };

    const handleDeletePpdtSlide = async (id) => {
        if (!window.confirm("Delete this slide?")) return;
        try {
            const ref = getCollectionRef('ssb_ppdt_slides');
            await deleteDoc(doc(ref, id));
            toast.success("Slide deleted.");
        } catch (e) {
            toast.error("Failed to delete slide.");
        }
    };

    const handleSeedPpdtSlides = async () => {
        if (!window.confirm("Seed default slides?")) return;
        try {
            const ref = getCollectionRef('ssb_ppdt_slides');
            for (const s of ppdtSlides) {
                if (!dbPpdtSlides.some(slide => slide.title === s.title)) {
                    await addDoc(ref, {
                        title: s.title,
                        image: s.image,
                        description: s.description,
                        createdAt: new Date().toISOString()
                    });
                }
            }
            toast.success("Default slides seeded.");
        } catch (e) {
            toast.error("Failed to seed slides.");
        }
    };

    // OIR CRUD
    const handleSaveOirQuestion = async (e) => {
        e.preventDefault();
        if (!oirForm.question || !oirForm.optA || !oirForm.optB) return;
        try {
            const ref = getCollectionRef('ssb_oir_questions');
            const options = [oirForm.optA, oirForm.optB, oirForm.optC, oirForm.optD].filter(Boolean);
            const payload = {
                question: oirForm.question,
                options,
                answer: parseInt(oirForm.answer),
                explanation: oirForm.explanation,
                updatedAt: new Date().toISOString()
            };

            if (editOirId) {
                await updateDoc(doc(ref, editOirId), payload);
                toast.success("Question updated.");
                setEditOirId(null);
            } else {
                await addDoc(ref, {
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                toast.success("Question created.");
            }
            setOirForm({ question: '', optA: '', optB: '', optC: '', optD: '', answer: '0', explanation: '' });
        } catch (e) {
            toast.error("Failed to save question.");
        }
    };

    const handleEditOirQuestion = (q) => {
        setOirForm({
            question: q.question || '',
            optA: q.options[0] || '',
            optB: q.options[1] || '',
            optC: q.options[2] || '',
            optD: q.options[3] || '',
            answer: (q.answer ?? 0).toString(),
            explanation: q.explanation || ''
        });
        setEditOirId(q.id);
    };

    const handleDeleteOirQuestion = async (id) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            const ref = getCollectionRef('ssb_oir_questions');
            await deleteDoc(doc(ref, id));
            toast.success("Question deleted.");
        } catch (e) {
            toast.error("Failed to delete question.");
        }
    };

    const handleSeedOirQuestions = async () => {
        if (!window.confirm("Seed default OIR questions?")) return;
        try {
            const ref = getCollectionRef('ssb_oir_questions');
            for (const q of oirQuestions) {
                if (!dbOirQuestions.some(oq => oq.question === q.question)) {
                    await addDoc(ref, {
                        question: q.question,
                        options: q.options,
                        answer: q.answer,
                        explanation: q.explanation,
                        createdAt: new Date().toISOString()
                    });
                }
            }
            toast.success("Default questions seeded.");
        } catch (e) {
            toast.error("Failed to seed questions.");
        }
    };

    // Calculator Schemes CRUD
    const handleSaveScheme = async (e) => {
        e.preventDefault();
        if (!schemeForm.title || !schemeForm.minAge || !schemeForm.maxAge) return;
        try {
            const ref = getCollectionRef('ssb_calculator_schemes');
            const payload = {
                ...schemeForm,
                updatedAt: new Date().toISOString()
            };
            if (editSchemeId) {
                await updateDoc(doc(ref, editSchemeId), payload);
                toast.success("Scheme updated.");
                setEditSchemeId(null);
            } else {
                await addDoc(ref, {
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                toast.success("Scheme created.");
            }
            setSchemeForm({
                title: '',
                type: 'Direct SSB (No Written Exam)',
                description: '',
                ageLimit: '19 to 25 Years',
                minAge: '19',
                maxAge: '25',
                degreeStatus: 'completed_or_pursuing',
                cgpa: '50',
                certType: 'C',
                certGrade: 'B',
                link: ''
            });
        } catch (e) {
            toast.error("Failed to save entry scheme.");
        }
    };

    const handleEditScheme = (scheme) => {
        setSchemeForm({
            title: scheme.title || '',
            type: scheme.type || 'Direct SSB (No Written Exam)',
            description: scheme.description || '',
            ageLimit: scheme.ageLimit || '19 to 25 Years',
            minAge: (scheme.minAge || '19').toString(),
            maxAge: (scheme.maxAge || '25').toString(),
            degreeStatus: scheme.degreeStatus || 'completed_or_pursuing',
            cgpa: (scheme.cgpa || '50').toString(),
            certType: scheme.certType || 'C',
            certGrade: scheme.certGrade || 'B',
            link: scheme.link || ''
        });
        setEditSchemeId(scheme.id);
    };

    const handleDeleteScheme = async (id) => {
        if (!window.confirm("Delete this scheme?")) return;
        try {
            const ref = getCollectionRef('ssb_calculator_schemes');
            await deleteDoc(doc(ref, id));
            toast.success("Scheme deleted.");
        } catch (e) {
            toast.error("Failed to delete scheme.");
        }
    };

    const handleSeedSchemes = async () => {
        if (!window.confirm("Seed default entry schemes?")) return;
        try {
            const ref = getCollectionRef('ssb_calculator_schemes');
            for (const s of defaultCalculatorSchemes) {
                if (!dbSchemes.some(scheme => scheme.title === s.title)) {
                    await addDoc(ref, { ...s, createdAt: new Date().toISOString() });
                }
            }
            toast.success("Default schemes seeded.");
        } catch (e) {
            toast.error("Failed to seed schemes.");
        }
    };

    // Mentors CRUD
    const handleSaveMentor = async (e) => {
        e.preventDefault();
        if (!mentorForm.name || !mentorForm.commission) return;
        try {
            const ref = getCollectionRef('ssb_mentors');
            const payload = {
                ...mentorForm,
                updatedAt: new Date().toISOString()
            };
            if (editMentorId) {
                await updateDoc(doc(ref, editMentorId), payload);
                toast.success("Mentor updated.");
                setEditMentorId(null);
            } else {
                await addDoc(ref, {
                    ...payload,
                    createdAt: new Date().toISOString()
                });
                toast.success("Mentor added.");
            }
            setMentorForm({
                name: '',
                rank: 'Lt.',
                wing: 'Army Wing',
                year: '2025',
                commission: '',
                achievement: '',
                email: ''
            });
        } catch (e) {
            toast.error("Failed to save mentor.");
        }
    };

    const handleEditMentor = (mentor) => {
        setMentorForm({
            name: mentor.name || '',
            rank: mentor.rank || 'Lt.',
            wing: mentor.wing || 'Army Wing',
            year: mentor.year || '2025',
            commission: mentor.commission || '',
            achievement: mentor.achievement || '',
            email: mentor.email || ''
        });
        setEditMentorId(mentor.id);
    };

    const handleDeleteMentor = async (id) => {
        if (!window.confirm("Delete this mentor?")) return;
        try {
            const ref = getCollectionRef('ssb_mentors');
            await deleteDoc(doc(ref, id));
            toast.success("Mentor deleted.");
        } catch (e) {
            toast.error("Failed to delete mentor.");
        }
    };

    const handleSeedMentors = async () => {
        if (!window.confirm("Seed default featured mentors?")) return;
        try {
            const ref = getCollectionRef('ssb_mentors');
            for (const m of featuredDefenseAlumni) {
                if (!dbMentors.some(men => men.name === m.name)) {
                    await addDoc(ref, { ...m, createdAt: new Date().toISOString() });
                }
            }
            toast.success("Default mentors seeded.");
        } catch (e) {
            toast.error("Failed to seed mentors.");
        }
    };

    // Mentorship requests state updates
    const handleUpdateReqStatus = async (id, status) => {
        try {
            const ref = getCollectionRef('mentorship_requests');
            await updateDoc(doc(ref, id), { status, updatedAt: new Date().toISOString() });
            toast.success("Request status updated.");
        } catch (e) {
            toast.error("Failed to update request.");
        }
    };

    const handleDeleteRequest = async (id) => {
        if (!window.confirm("Delete request record?")) return;
        try {
            const ref = getCollectionRef('mentorship_requests');
            await deleteDoc(doc(ref, id));
            toast.success("Request deleted.");
        } catch (e) {
            toast.error("Failed to delete request.");
        }
    };

    return (
        <div className="space-y-6 fade-in pb-12">
            {/* Top Bar Header with Unified Portal Overview */}
            <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-2">
                        <Award className="w-8 h-8 text-ncc-gold" /> SSB & Career Hub
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Strategic defense preparation suite and commission schemes calculator.</p>
                </div>
                
                {/* Section selection pill tabs */}
                <div className="flex bg-[#f5f0e8] dark:bg-[#0a1628] p-1 rounded-xl border border-[#ddd8cc] dark:border-white/10 gap-1 overflow-x-auto max-w-full">
                    {[
                        { id: 'notices', label: '📢 Notices' },
                        { id: 'ssb', label: '🎯 SSB Prep' },
                        { id: 'calculator', label: '🧮 Calculator' },
                        { id: 'alumni', label: '🎖️ Mentors' },
                        ...(isWriteAllowed ? [{ id: 'admin_console', label: '⚙️ Admin Console' }] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveSection(tab.id);
                                setWatStarted(false);
                                setPpdtStarted(false);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeSection === tab.id 
                                    ? 'bg-ncc-navy text-ncc-gold shadow-md' 
                                    : 'text-gray-500 dark:text-white/60 hover:text-ncc-navy dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT: NOTICES */}
            {activeSection === 'notices' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-display font-bold text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-ncc-gold" /> Alerts & Vacancies
                            </h3>
                            {isWriteAllowed && (
                                <div className="flex gap-2">
                                    <button onClick={handleSync} disabled={syncing} className="ncc-btn ncc-btn-secondary flex items-center gap-2 text-xs py-2">
                                        <Clock className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync News
                                    </button>
                                    <button onClick={() => { setEditingId(null); setFormData({ title: '', description: '', link: '', category: 'Armed Forces' }); setShowNoticeForm(!showNoticeForm); }} className="ncc-btn ncc-btn-primary flex items-center gap-2 text-xs py-2">
                                        <Plus className="w-3.5 h-3.5" /> Post Alert
                                    </button>
                                </div>
                            )}
                        </div>

                        {showNoticeForm && (
                            <form onSubmit={handleNoticeSubmit} className="ncc-card p-6 border-2 border-ncc-gold/30 space-y-4 animate-in slide-in-from-top-4">
                                <h4 className="font-bold text-ncc-navy dark:text-white uppercase tracking-widest text-xs">
                                    {editingId ? 'Edit Notice' : 'Post New Notice'}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Opportunity Title" className="ncc-input text-xs" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    <select className="ncc-input text-xs" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="Armed Forces">Armed Forces</option>
                                        <option value="SSB Prep">SSB Prep</option>
                                        <option value="Govt Jobs">Govt Jobs</option>
                                        <option value="Automated Alert">Automated Alert</option>
                                    </select>
                                </div>
                                <textarea placeholder="Description, age criteria, certificate benefits..." className="ncc-input text-xs h-24" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                <input type="url" placeholder="Official Application URL" className="ncc-input text-xs" value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} />
                                <div className="flex justify-end gap-3 text-xs">
                                    <button type="button" onClick={() => { setShowNoticeForm(false); setEditingId(null); }} className="text-gray-400 font-bold uppercase tracking-widest px-4">Cancel</button>
                                    <button type="submit" className="ncc-btn ncc-btn-success">Save Notice</button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-4">
                            {loadingNotices ? (
                                <div className="p-20 text-center italic text-gray-400">Loading career announcements...</div>
                            ) : notices.length === 0 ? (
                                <div className="p-20 text-center text-gray-400 dark:text-white/60 italic bg-white dark:bg-[#050b14] rounded-3xl border border-dashed border-[#ddd8cc] dark:border-white/10">
                                    No notices currently logged. Click live sync to pull recent alerts.
                                </div>
                            ) : (
                                notices.map(notice => (
                                    <div key={notice.id} className="ncc-card p-6 flex gap-6 relative group hover:border-ncc-gold transition-all">
                                        <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ede8df] dark:border-white/5 shrink-0">
                                            <Megaphone className="w-5 h-5 text-ncc-gold mb-1" />
                                            <p className="text-[9px] font-black text-ncc-navy dark:text-white uppercase leading-none">
                                                {formatDate(notice.createdAt).split(' ').slice(0, 2).join(' ')}
                                            </p>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <span className="px-2 py-0.5 rounded-full bg-ncc-gold/10 text-ncc-gold text-[9px] font-black tracking-widest uppercase mb-2 inline-block">
                                                {notice.category}
                                            </span>
                                            <h4 className="font-display font-bold text-base text-ncc-navy dark:text-white mb-1.5">{notice.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-white/80 leading-relaxed mb-3">{notice.description}</p>
                                            {notice.link && (
                                                <a href={notice.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest hover:text-ncc-gold transition-colors">
                                                    Apply Here <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        {isWriteAllowed && (
                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleNoticeEdit(notice)} className="p-1.5 text-gray-400 hover:text-ncc-navy dark:hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleNoticeDelete(notice.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="ncc-card p-6 bg-ncc-navy border-none text-white relative overflow-hidden">
                            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-ncc-gold" /> Quick Resources
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {[
                                    { name: "SSB Selection Procedure Guide", link: "https://joinindianarmy.nic.in/ssb-overview.htm" },
                                    { name: "NCC Special Entry Scheme FAQs", link: "https://joinindianarmy.nic.in/ncc-special-entry.htm" },
                                    { name: "CDSE Syllabus & UPSC Calendars", link: "https://www.upsc.gov.in/" }
                                ].map((res, idx) => (
                                    <a key={idx} href={res.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 bg-white/10 border border-white/5 rounded-xl hover:bg-white/20 hover:border-ncc-gold/50 transition-all text-xs font-bold text-white">
                                        {res.name} <ExternalLink className="w-3.5 h-3.5 text-ncc-gold" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="ncc-card p-6">
                            <h3 className="font-display font-bold text-base text-ncc-navy dark:text-white mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-ncc-gold" /> Career Materials
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl hover:border-ncc-gold transition-all cursor-pointer border border-[#ede8df] dark:border-white/5">
                                    <div>
                                        <p className="font-bold text-ncc-navy dark:text-white">Officer Entry Schemes Guide</p>
                                        <p className="text-[10px] text-gray-400">PDF Guide • 2.4 MB</p>
                                    </div>
                                    <Download className="w-4 h-4 text-ncc-gold" />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl hover:border-ncc-gold transition-all cursor-pointer border border-[#ede8df] dark:border-white/5">
                                    <div>
                                        <p className="font-bold text-ncc-navy dark:text-white">SSB Obstacle Course Training</p>
                                        <p className="text-[10px] text-gray-400">PDF Guide • 1.8 MB</p>
                                    </div>
                                    <Download className="w-4 h-4 text-ncc-gold" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SSB PREP HUB */}
            {activeSection === 'ssb' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column Navigation */}
                    <div className="lg:col-span-3 space-y-2">
                        {[
                            { id: 'wat', label: '🎴 Word Association (WAT)', desc: `Total words available: ${activeWatWords.length}` },
                            { id: 'ppdt', label: '🖼️ Picture Perception (PPDT)', desc: `Total slides available: ${activePpdtSlides.length}` },
                            { id: 'oir', label: '🧠 Mock OIR Tests', desc: `Total questions available: ${activeOirQuestions.length}` }
                        ].map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => {
                                    setSsbTab(sub.id);
                                    setWatStarted(false);
                                    setPpdtStarted(false);
                                }}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    ssbTab === sub.id 
                                        ? 'bg-white dark:bg-[#0a1628] border-ncc-gold shadow-md' 
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-[#ddd8cc] dark:hover:border-white/5'
                                }`}
                            >
                                <p className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white">{sub.label}</p>
                                <p className="text-[10px] text-gray-500 dark:text-white/60 mt-0.5">{sub.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Right Column Test Interface */}
                    <div className="lg:col-span-9">
                        <div className="ncc-card p-8 min-h-[450px] flex flex-col justify-between">
                            
                            {/* WAT Test Interface */}
                            {ssbTab === 'wat' && (
                                <div className="space-y-6 flex flex-col items-center justify-center flex-1 py-6 text-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">SSB WAT Training Panel</h4>
                                    
                                    {!watStarted && !watSubmitted ? (
                                        <div className="space-y-4 max-w-md">
                                            <Target className="w-12 h-12 text-ncc-gold mx-auto mb-2" />
                                            <h5 className="text-lg font-bold text-ncc-navy dark:text-white">Word Association Test</h5>
                                            <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed">
                                                Observe the words prompt in sequence for 15 seconds each. Write the first positive, grammatical, and construct-based sentence that comes to your mind.
                                            </p>
                                            <button onClick={() => { setWatAnswers({}); setWatIndex(0); setWatTimer(15); setWatStarted(true); setWatSubmitted(false); playBeep(800, 0.3); }} className="ncc-btn ncc-btn-primary px-8">
                                                Start Practice Session
                                            </button>
                                        </div>
                                    ) : watStarted && !watSubmitted ? (
                                        <div className="space-y-8 w-full max-w-md animate-in fade-in">
                                            <div className="w-20 h-20 rounded-full border-4 border-ncc-gold flex items-center justify-center mx-auto text-2xl font-black text-ncc-navy dark:text-white relative bg-[#f5f0e8] dark:bg-[#0a1628]">
                                                {watTimer}
                                                <span className="text-[8px] font-bold uppercase tracking-wider absolute bottom-2.5">sec</span>
                                            </div>
                                            
                                            <div className="bg-[#f5f0e8] dark:bg-[#0a1628] py-8 px-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-inner">
                                                <span className="text-3xl sm:text-4xl font-display font-black tracking-widest text-ncc-navy dark:text-white">
                                                    {activeWatWords[watIndex]}
                                                </span>
                                            </div>

                                            <div className="space-y-3 text-left">
                                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                                    Your Sentence Response:
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-[#f5f0e8] dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-4 text-xs font-bold text-center text-ncc-navy dark:text-white focus:border-ncc-gold focus:ring-1 focus:ring-ncc-gold outline-none"
                                                    placeholder="Type sentence & press Enter or click Next..."
                                                    value={watAnswers[watIndex] || ''}
                                                    onChange={e => setWatAnswers({ ...watAnswers, [watIndex]: e.target.value })}
                                                    autoFocus
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            handleNextWatWord();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                                    <span>WORD PROMPT PROGRESS</span>
                                                    <span>{watIndex + 1} / {activeWatWords.length}</span>
                                                </div>
                                                <div className="w-full bg-[#f5f0e8] dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-ncc-gold h-full transition-all duration-300" style={{ width: `${((watIndex + 1) / activeWatWords.length) * 100}%` }} />
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-xs">
                                                <button onClick={() => { setWatStarted(false); setWatSubmitted(false); }} className="text-red-500 font-bold uppercase tracking-widest hover:underline">
                                                    Abort Session
                                                </button>
                                                <button onClick={handleNextWatWord} className="ncc-btn ncc-btn-primary py-2 px-4 text-xs">
                                                    {watIndex >= activeWatWords.length - 1 ? 'Finish' : 'Next Word'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 w-full max-w-2xl animate-in zoom-in-95">
                                            <div className="text-center space-y-1">
                                                <h5 className="text-lg font-bold text-ncc-navy dark:text-white">WAT Practice Summary</h5>
                                                <p className="text-xs text-gray-500 dark:text-white/70">
                                                    Review your responses below. You can download them or retake the test.
                                                </p>
                                            </div>
                                            
                                            <div className="overflow-y-auto max-h-[300px] border border-[#ddd8cc] dark:border-white/10 rounded-2xl ncc-scrollbar">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-[#f5f0e8] dark:bg-[#0a1628] text-ncc-navy dark:text-white border-b border-[#ddd8cc] dark:border-white/10">
                                                            <th className="p-3 font-bold uppercase tracking-widest text-[10px]">#</th>
                                                            <th className="p-3 font-bold uppercase tracking-widest text-[10px]">Word</th>
                                                            <th className="p-3 font-bold uppercase tracking-widest text-[10px]">Your Response Sentence</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#ddd8cc] dark:divide-white/5 bg-white dark:bg-[#050b14]">
                                                        {activeWatWords.map((word, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                                                <td className="p-3 font-black text-ncc-navy dark:text-white">{word}</td>
                                                                <td className="p-3 italic text-gray-600 dark:text-white/85">
                                                                    {watAnswers[idx] ? watAnswers[idx] : <span className="text-red-500 font-bold not-italic">(No answer typed)</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                                <button onClick={downloadWatResponses} className="ncc-btn ncc-btn-primary flex items-center gap-2 text-xs py-2.5 px-6">
                                                    <Download className="w-4 h-4" /> Download Responses (.txt)
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setWatAnswers({});
                                                        setWatIndex(0);
                                                        setWatTimer(15);
                                                        setWatSubmitted(false);
                                                        setWatStarted(true);
                                                    }} 
                                                    className="ncc-btn ncc-btn-secondary text-xs py-2.5 px-6"
                                                >
                                                    Retake Test
                                                </button>
                                                <button onClick={() => { setWatAnswers({}); setWatSubmitted(false); setWatIndex(0); }} className="text-xs text-gray-400 font-bold uppercase tracking-widest hover:underline px-4">
                                                    Close Summary
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PPDT Test Interface */}
                            {ssbTab === 'ppdt' && (
                                <div className="space-y-6 flex flex-col flex-1 py-4 justify-between">
                                    <div className="text-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">SSB PPDT Mock Test</h4>
                                    </div>
                                    
                                    {!ppdtStarted ? (
                                        <div className="space-y-6 max-w-lg mx-auto text-center py-6">
                                            <Activity className="w-12 h-12 text-ncc-gold mx-auto mb-1" />
                                            <div>
                                                <h5 className="text-lg font-bold text-ncc-navy dark:text-white">Picture Perception & Description Test</h5>
                                                <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed mt-2">
                                                    Select a slide, observe the blurred image shown for 30 seconds to capture context, then write a logical story in the writing phase.
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                                                {activePpdtSlides.map(slide => (
                                                    <button
                                                        key={slide.id}
                                                        onClick={() => setPpdtSelectedImage(slide)}
                                                        className={`p-2 rounded-xl border overflow-hidden relative group text-left ${
                                                            ppdtSelectedImage.id === slide.id 
                                                                ? 'border-ncc-gold ring-2 ring-ncc-gold/20' 
                                                                : 'border-[#ddd8cc] dark:border-white/5 hover:border-gray-400'
                                                        }`}
                                                    >
                                                        <img src={slide.image} alt="" className="h-16 w-full object-cover rounded-lg blur-[2px]" />
                                                        <p className="text-[9px] font-bold mt-1 text-ncc-navy dark:text-white truncate">{slide.title}</p>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            <button onClick={() => { setPpdtTimer(30); setPpdtPhase('view'); setPpdtStarted(true); playBeep(800, 0.3); }} className="ncc-btn ncc-btn-primary px-8">
                                                Launch PPDT Module
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-center bg-[#f5f0e8] dark:bg-[#0a1628] px-4 py-2.5 rounded-xl border border-[#ddd8cc] dark:border-white/10 text-xs">
                                                <span className="font-bold uppercase tracking-widest text-ncc-navy dark:text-white">
                                                    Phase: {ppdtPhase === 'view' ? '🔴 VIEWING IMAGE' : '✍️ WRITING STORY'}
                                                </span>
                                                <span className="font-mono font-black text-ncc-gold tracking-widest text-sm bg-ncc-navy dark:bg-slate-900 px-2 py-0.5 rounded">
                                                    TIMER: {formatTime(ppdtTimer)}
                                                </span>
                                            </div>
                                            
                                            {ppdtPhase === 'view' ? (
                                                <div className="relative rounded-2xl overflow-hidden border border-[#ddd8cc] dark:border-white/10 max-h-[300px] flex-1 flex items-center justify-center bg-black">
                                                    <img 
                                                        src={ppdtSelectedImage.image} 
                                                        alt="PPDT Slide" 
                                                        className="w-full h-full object-cover select-none pointer-events-none"
                                                        style={{ filter: 'blur(12px) contrast(1.2)' }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/10" />
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col space-y-3">
                                                    <textarea 
                                                        placeholder="Write your story here... Detail the characters (Age, Gender, Mood), the action/situation, and the logical outcome."
                                                        className="w-full flex-1 min-h-[220px] bg-[#f5f0e8] dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-4 text-xs outline-none text-ncc-navy dark:text-white resize-none shadow-inner"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-end">
                                                <button onClick={() => setPpdtStarted(false)} className="text-xs text-red-500 font-bold uppercase tracking-widest hover:underline">
                                                    Abort Test
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* OIR Mock Quiz */}
                            {ssbTab === 'oir' && (
                                <div className="space-y-6 flex flex-col flex-1 py-4 justify-between">
                                    <div className="text-center">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">SSB Reasoning Mock Test</h4>
                                    </div>
                                    
                                    {!oirStarted ? (
                                        <div className="space-y-4 max-w-md mx-auto text-center py-8">
                                            <FileText className="w-12 h-12 text-ncc-gold mx-auto mb-2" />
                                            <h5 className="text-lg font-bold text-ncc-navy dark:text-white">Officer Intelligence Rating Mock</h5>
                                            <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed">
                                                A short mock test containing reasoning questions similar to the official OIR screening test.
                                            </p>
                                            <button onClick={() => { setOirAnswers({}); setOirSubmitted(false); setOirStarted(true); }} className="ncc-btn ncc-btn-primary px-8">
                                                Start OIR Mock Test
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 flex-1 flex flex-col justify-between">
                                            <div className="space-y-6 overflow-y-auto max-h-[380px] pr-2 ncc-scrollbar">
                                                {activeOirQuestions.map((q, idx) => (
                                                    <div key={q.id || idx} className="p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10 space-y-3">
                                                        <p className="text-xs font-bold text-ncc-navy dark:text-white">
                                                            Question {idx + 1}: {q.question}
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {(q.options || []).map((opt, optIdx) => {
                                                                const isSelected = oirAnswers[q.id || idx] === optIdx;
                                                                const isCorrect = q.answer === optIdx;
                                                                
                                                                let btnCls = "border border-[#ddd8cc] dark:border-white/5 hover:border-ncc-gold text-gray-600 dark:text-white/80 bg-white dark:bg-slate-800";
                                                                if (oirSubmitted) {
                                                                    if (isCorrect) btnCls = "bg-emerald-500/20 border-emerald-500 text-emerald-600 font-bold";
                                                                    else if (isSelected) btnCls = "bg-red-500/20 border-red-500 text-red-500 font-bold";
                                                                } else if (isSelected) {
                                                                    btnCls = "bg-ncc-navy text-ncc-gold border-ncc-navy dark:bg-ncc-gold dark:text-ncc-navy dark:border-ncc-gold font-bold";
                                                                }
                                                                
                                                                return (
                                                                    <button
                                                                        key={optIdx}
                                                                        type="button"
                                                                        disabled={oirSubmitted}
                                                                        onClick={() => setOirAnswers({ ...oirAnswers, [q.id || idx]: optIdx })}
                                                                        className={`p-2.5 rounded-xl text-left text-xs transition-all ${btnCls}`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {oirSubmitted && q.explanation && (
                                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-gray-500 leading-normal">
                                                                <strong className="text-ncc-gold uppercase">Explanation:</strong> {q.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex justify-between items-center border-t border-[#ddd8cc] dark:border-white/10 pt-4 mt-2">
                                                <button onClick={() => setOirStarted(false)} className="text-xs text-red-500 font-bold uppercase tracking-widest hover:underline">
                                                    Quit Test
                                                </button>
                                                
                                                {!oirSubmitted ? (
                                                    <button 
                                                        onClick={() => {
                                                            if (Object.keys(oirAnswers).length < activeOirQuestions.length) {
                                                                if (!window.confirm("You have unanswered questions. Submit anyway?")) return;
                                                            }
                                                            setOirSubmitted(true);
                                                            let score = 0;
                                                            activeOirQuestions.forEach((q, idx) => { if (oirAnswers[q.id || idx] === q.answer) score++; });
                                                            const rating = score === activeOirQuestions.length ? 'OIR-1 (Outstanding)' : score >= activeOirQuestions.length - 1 ? 'OIR-2 (Excellent)' : score >= activeOirQuestions.length / 2 ? 'OIR-3 (Average)' : 'OIR-4 / 5 (Needs Improvement)';
                                                            toast.info(`OIR Score: ${score}/${activeOirQuestions.length}. Rating: ${rating}`);
                                                        }} 
                                                        className="ncc-btn ncc-btn-success text-xs"
                                                    >
                                                        Submit Test
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setOirAnswers({}); setOirSubmitted(false); }} className="ncc-btn ncc-btn-primary text-xs">
                                                        Retake Test
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ELIGIBILITY CALCULATOR */}
            {activeSection === 'calculator' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5">
                        <div className="ncc-card p-6 space-y-4">
                            <h3 className="text-sm font-display font-bold text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Star className="w-5 h-5 text-ncc-gold" /> Parameters Configuration
                            </h3>
                            
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Gender</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['male', 'female'].map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => setCalculatorInputs({ ...calculatorInputs, gender: g })}
                                            className={`p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                                calculatorInputs.gender === g 
                                                    ? 'bg-ncc-navy border-ncc-navy text-ncc-gold dark:bg-ncc-gold dark:border-ncc-gold dark:text-ncc-navy' 
                                                    : 'bg-white dark:bg-slate-800 border-[#ddd8cc] dark:border-white/5 text-gray-500 dark:text-white/60'
                                            }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Age Limits ({calculatorInputs.age} Years)</label>
                                <input 
                                    type="range" 
                                    min="16" 
                                    max="30" 
                                    className="w-full accent-ncc-gold cursor-pointer"
                                    value={calculatorInputs.age} 
                                    onChange={e => setCalculatorInputs({ ...calculatorInputs, age: e.target.value })} 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Academic Degree / Graduation Status</label>
                                <select 
                                    className="ncc-input text-xs"
                                    value={calculatorInputs.degreeStatus}
                                    onChange={e => setCalculatorInputs({ ...calculatorInputs, degreeStatus: e.target.value })}
                                >
                                    <option value="completed">Completed Graduation / Degree</option>
                                    <option value="pursuing">Pursuing Final Year (Graduate)</option>
                                    <option value="no">10+2 / Undergrad (Non-final year)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Degree Aggregate Marks ({calculatorInputs.cgpa}%)</label>
                                <input 
                                    type="number" 
                                    min="30" 
                                    max="100" 
                                    className="ncc-input text-xs" 
                                    value={calculatorInputs.cgpa} 
                                    onChange={e => setCalculatorInputs({ ...calculatorInputs, cgpa: e.target.value })} 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">NCC Cert Type</label>
                                    <select 
                                        className="ncc-input text-xs"
                                        value={calculatorInputs.certType}
                                        onChange={e => setCalculatorInputs({ ...calculatorInputs, certType: e.target.value })}
                                    >
                                        <option value="C">C Certificate</option>
                                        <option value="B">B Certificate</option>
                                        <option value="A">A Certificate</option>
                                        <option value="none">None / No Cert</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Cert Grade / Alpha</label>
                                    <select 
                                        className="ncc-input text-xs"
                                        value={calculatorInputs.certGrade}
                                        onChange={e => setCalculatorInputs({ ...calculatorInputs, certGrade: e.target.value })}
                                    >
                                        <option value="A">A Grade</option>
                                        <option value="B">B Grade</option>
                                        <option value="C">C Grade</option>
                                        <option value="none">None / NA</option>
                                    </select>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Results Display */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-display font-bold text-ncc-navy dark:text-white uppercase tracking-widest">
                                Eligible Entry Schemes ({activeEligibilityResults.length})
                            </h3>
                        </div>
                        
                        {activeEligibilityResults.length === 0 ? (
                            <div className="p-16 text-center text-gray-400 dark:text-white/60 italic bg-white dark:bg-[#050b14] rounded-3xl border border-dashed border-[#ddd8cc] dark:border-white/10">
                                No defense entry commissions found matching your parameters.
                            </div>
                        ) : (
                            activeEligibilityResults.map((scheme, idx) => (
                                <div key={idx} className="ncc-card p-6 relative overflow-hidden group hover:border-ncc-gold transition-colors bg-white dark:bg-[#050b14]">
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <h4 className="font-display font-bold text-base text-ncc-navy dark:text-white leading-tight">{scheme.title}</h4>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black tracking-widest uppercase shrink-0">
                                            {scheme.type}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-normal mb-4">{scheme.description}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 border-t border-[#ede8df] dark:border-white/5 pt-3.5 text-[10px]">
                                        <div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest">Age Limit</p>
                                            <p className="font-bold text-ncc-navy dark:text-white">{scheme.ageLimit || `${scheme.minAge}-${scheme.maxAge} Years`}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest">Eligibility Rules</p>
                                            <p className="font-bold text-ncc-navy dark:text-white truncate" title={scheme.requirement || `CGPA: ${scheme.cgpa}%, NCC: ${scheme.certType} Cert (${scheme.certGrade} Grade)`}>
                                                {scheme.requirement || `CGPA: ${scheme.cgpa}%, NCC: ${scheme.certType} (${scheme.certGrade} Grade)`}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {scheme.link && (
                                        <div className="mt-4 flex justify-end">
                                            <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[9px] font-black text-ncc-gold uppercase tracking-widest hover:underline">
                                                Go to portal <ChevronRight className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DEFENSE ALUMNI MENTORS */}
            {activeSection === 'alumni' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-display font-bold text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-ncc-gold" /> Serving Defense Mentors
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {activeMentors.map((mentor, idx) => (
                                <div key={mentor.id || idx} className="bg-gradient-to-br from-[#0a1628] to-[#11233e] p-0.5 rounded-3xl relative group overflow-hidden border border-ncc-gold/10 hover:border-ncc-gold transition-colors shadow-lg">
                                    <div className="bg-[#0a1628] p-5 rounded-[1.4rem] space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 bg-ncc-gold text-ncc-navy rounded-2xl flex items-center justify-center font-black text-base shadow-lg shadow-ncc-gold/10">
                                                {mentor.rank}
                                            </div>
                                            <div>
                                                <h4 className="font-display font-black text-sm text-white">{mentor.name}</h4>
                                                <p className="text-[10px] text-ncc-gold font-bold uppercase tracking-widest">{mentor.wing} • Batch of {mentor.year}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t border-white/5 pt-3 space-y-1">
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Active Posting</p>
                                            <p className="text-xs text-white/90 font-semibold">{mentor.commission}</p>
                                            <p className="text-[10px] text-white/60 leading-normal italic mt-1.5">"{mentor.achievement}"</p>
                                        </div>
                                        
                                        <div className="pt-2 flex justify-between items-center text-xs">
                                            <a href={`mailto:${mentor.email}`} className="text-[10px] font-black uppercase text-white/40 hover:text-white">Email Contact</a>
                                            <button 
                                                onClick={() => { setSelectedMentorForRequest(mentor); setMentorshipStep(1); setShowMentorshipModal(true); }}
                                                className="px-3.5 py-1.5 bg-ncc-gold text-ncc-navy font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-ncc-gold/90 transition-colors"
                                            >
                                                Request SSB Help
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <h3 className="text-sm font-display font-bold text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-ncc-gold" /> Alumni Mentorship Network Directory
                        </h3>
                        
                        {defenseAlumniFromDb.length === 0 ? (
                            <div className="p-16 text-center text-gray-400 dark:text-white/60 italic bg-white dark:bg-[#050b14] rounded-3xl border border-dashed border-[#ddd8cc] dark:border-white/10">
                                No additional military mentors listed in directory yet. Admins can induct alumni as mentors via the Alumni Directory tab.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {defenseAlumniFromDb.map(alumnus => (
                                    <div key={alumnus.id} className="ncc-card p-4 flex justify-between items-center bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-ncc-navy/5 text-ncc-navy rounded-xl flex items-center justify-center font-bold text-sm">
                                                {alumnus.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs text-ncc-navy dark:text-white">{alumnus.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {alumnus.hallOfFameDetails?.achievement || 'Defense Alumni'} • Batch of {alumnus.year || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => { setSelectedMentorForRequest({ name: alumnus.name, email: alumnus.personalEmail || '' }); setMentorshipStep(1); setShowMentorshipModal(true); }}
                                            className="px-3 py-1 bg-[#f5f0e8] dark:bg-slate-800 text-ncc-navy dark:text-white font-black text-[9px] uppercase tracking-widest rounded-lg border border-[#ddd8cc] dark:border-white/5 hover:border-ncc-gold"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: BATTALION ADMIN CRUD CONSOLE */}
            {activeSection === 'admin_console' && isWriteAllowed && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Admin Sub Navigation */}
                    <div className="lg:col-span-3 space-y-2">
                        {[
                            { id: 'wat', label: '🎴 Manage WAT Words', count: dbWatWords.length },
                            { id: 'ppdt', label: '🖼️ Manage PPDT Slides', count: dbPpdtSlides.length },
                            { id: 'oir', label: '🧠 Manage OIR Quiz', count: dbOirQuestions.length },
                            { id: 'calculator', label: '🧮 Calculator Schemes', count: dbSchemes.length },
                            { id: 'mentors', label: '🎖️ Mentors & Requests', count: `${dbMentors.length} / ${dbRequests.length}` }
                        ].map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => setAdminSubTab(sub.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    adminSubTab === sub.id 
                                        ? 'bg-white dark:bg-[#0a1628] border-ncc-gold shadow-md' 
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-[#ddd8cc] dark:hover:border-white/5'
                                }`}
                            >
                                <p className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white">{sub.label}</p>
                                <p className="text-[10px] text-gray-500 dark:text-white/60 mt-0.5">Records in DB: {sub.count}</p>
                            </button>
                        ))}
                    </div>

                    {/* Admin Sub Views */}
                    <div className="lg:col-span-9 space-y-6">
                        
                        {/* WAT Admin */}
                        {adminSubTab === 'wat' && (
                            <div className="ncc-card p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">WAT Word Prompts Database</h4>
                                    <button onClick={handleSeedWatWords} className="ncc-btn ncc-btn-secondary text-[10px] py-1.5 px-3">
                                        Seed Default 30 Words
                                    </button>
                                </div>

                                <form onSubmit={handleAddWatWord} className="flex gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Enter WAT Word (e.g. INTEGRITY)" 
                                        className="ncc-input text-xs flex-1 uppercase"
                                        required
                                        value={newWatWord}
                                        onChange={e => setNewWatWord(e.target.value)}
                                    />
                                    <button type="submit" className="ncc-btn ncc-btn-primary text-xs flex items-center gap-1">
                                        <Plus className="w-4 h-4" /> Add Word
                                    </button>
                                </form>

                                <div className="border-t border-[#ddd8cc] dark:border-white/5 pt-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Stored Words</p>
                                    {dbWatWords.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Database is empty. Click seed button to add default items.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {dbWatWords.map(w => (
                                                <span key={w.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-ncc-navy/5 text-ncc-navy dark:bg-slate-800 dark:text-white text-xs font-bold border border-[#ede8df] dark:border-white/5">
                                                    {w.word}
                                                    <button type="button" onClick={() => handleDeleteWatWord(w.id)} className="text-red-500 hover:text-red-700 font-bold ml-1 text-sm leading-none">
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PPDT Admin */}
                        {adminSubTab === 'ppdt' && (
                            <div className="ncc-card p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">PPDT Slides Database</h4>
                                    <button onClick={handleSeedPpdtSlides} className="ncc-btn ncc-btn-secondary text-[10px] py-1.5 px-3">
                                        Seed Default Slides
                                    </button>
                                </div>

                                <form onSubmit={handleSavePpdtSlide} className="space-y-4 p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                                    <h5 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                        {editPpdtId ? '📝 Edit Slide Details' : '➕ Create New PPDT Slide'}
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Slide Title" 
                                            className="ncc-input text-xs"
                                            required
                                            value={ppdtForm.title}
                                            onChange={e => setPpdtForm({...ppdtForm, title: e.target.value})}
                                        />
                                        <input 
                                            type="url" 
                                            placeholder="Image URL" 
                                            className="ncc-input text-xs"
                                            required
                                            value={ppdtForm.image}
                                            onChange={e => setPpdtForm({...ppdtForm, image: e.target.value})}
                                        />
                                    </div>
                                    <textarea 
                                        placeholder="Scene description"
                                        className="ncc-input text-xs h-16"
                                        value={ppdtForm.description}
                                        onChange={e => setPpdtForm({...ppdtForm, description: e.target.value})}
                                    />
                                    <div className="flex justify-end gap-2 text-xs">
                                        {editPpdtId && (
                                            <button type="button" onClick={() => { setEditPpdtId(null); setPpdtForm({ title: '', image: '', description: '' }); }} className="text-gray-400 font-bold uppercase tracking-widest px-3">
                                                Cancel
                                            </button>
                                        )}
                                        <button type="submit" className="ncc-btn ncc-btn-success text-xs">
                                            {editPpdtId ? 'Update Slide' : 'Create Slide'}
                                        </button>
                                    </div>
                                </form>

                                <div className="border-t border-[#ddd8cc] dark:border-white/5 pt-4 space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved Slides</p>
                                    {dbPpdtSlides.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No PPDT slides stored. Seed defaults to initialize.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {dbPpdtSlides.map(slide => (
                                                <div key={slide.id} className="p-3 bg-white dark:bg-slate-900 border border-[#ede8df] dark:border-white/5 rounded-2xl flex gap-3 items-center group relative">
                                                    <img src={slide.image} alt="" className="w-16 h-12 object-cover rounded-lg blur-[1px] shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-xs text-ncc-navy dark:text-white truncate">{slide.title}</p>
                                                        <p className="text-[9px] text-gray-400 truncate">{slide.description || 'No description'}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditPpdtSlide(slide)} className="p-1 text-gray-400 hover:text-ncc-navy dark:hover:text-white">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeletePpdtSlide(slide.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* OIR Admin */}
                        {adminSubTab === 'oir' && (
                            <div className="ncc-card p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">OIR Reasoning Questions</h4>
                                    <button onClick={handleSeedOirQuestions} className="ncc-btn ncc-btn-secondary text-[10px] py-1.5 px-3">
                                        Seed Default Quiz
                                    </button>
                                </div>

                                <form onSubmit={handleSaveOirQuestion} className="space-y-4 p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                                    <h5 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                        {editOirId ? '📝 Edit Question Details' : '➕ Create New OIR Question'}
                                    </h5>
                                    <div>
                                        <textarea 
                                            placeholder="Question content..."
                                            className="ncc-input text-xs h-16"
                                            required
                                            value={oirForm.question}
                                            onChange={e => setOirForm({...oirForm, question: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="Option A" className="ncc-input text-xs" required value={oirForm.optA} onChange={e => setOirForm({...oirForm, optA: e.target.value})} />
                                        <input type="text" placeholder="Option B" className="ncc-input text-xs" required value={oirForm.optB} onChange={e => setOirForm({...oirForm, optB: e.target.value})} />
                                        <input type="text" placeholder="Option C" className="ncc-input text-xs" value={oirForm.optC} onChange={e => setOirForm({...oirForm, optC: e.target.value})} />
                                        <input type="text" placeholder="Option D" className="ncc-input text-xs" value={oirForm.optD} onChange={e => setOirForm({...oirForm, optD: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Correct Answer</label>
                                            <select 
                                                className="ncc-input text-xs"
                                                value={oirForm.answer}
                                                onChange={e => setOirForm({...oirForm, answer: e.target.value})}
                                            >
                                                <option value="0">Option A</option>
                                                <option value="1">Option B</option>
                                                <option value="2">Option C</option>
                                                <option value="3">Option D</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Explanation</label>
                                            <input 
                                                type="text" 
                                                placeholder="Provide detailed answer reason" 
                                                className="ncc-input text-xs"
                                                value={oirForm.explanation}
                                                onChange={e => setOirForm({...oirForm, explanation: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 text-xs">
                                        {editOirId && (
                                            <button type="button" onClick={() => { setEditOirId(null); setOirForm({ question: '', optA: '', optB: '', optC: '', optD: '', answer: '0', explanation: '' }); }} className="text-gray-400 font-bold uppercase tracking-widest px-3">
                                                Cancel
                                            </button>
                                        )}
                                        <button type="submit" className="ncc-btn ncc-btn-success text-xs">
                                            {editOirId ? 'Update Question' : 'Create Question'}
                                        </button>
                                    </div>
                                </form>

                                <div className="border-t border-[#ddd8cc] dark:border-white/5 pt-4 space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question List</p>
                                    {dbOirQuestions.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No questions stored. Seed defaults to initialize.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {dbOirQuestions.map((q, idx) => (
                                                <div key={q.id} className="p-4 bg-white dark:bg-slate-900 border border-[#ede8df] dark:border-white/5 rounded-2xl flex justify-between items-start gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-xs text-ncc-navy dark:text-white leading-normal">
                                                            {idx + 1}. {q.question}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            {(q.options || []).map((o, oidx) => (
                                                                <span key={oidx} className={`text-[10px] px-2 py-1 rounded-lg border ${q.answer === oidx ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-transparent'}`}>
                                                                    {o}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={() => handleEditOirQuestion(q)} className="p-1.5 text-gray-400 hover:text-ncc-navy dark:hover:text-white">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteOirQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Calculator Schemes Admin */}
                        {adminSubTab === 'calculator' && (
                            <div className="ncc-card p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">Eligibility Calculator Entry Schemes</h4>
                                    <button onClick={handleSeedSchemes} className="ncc-btn ncc-btn-secondary text-[10px] py-1.5 px-3">
                                        Seed Default Schemes
                                    </button>
                                </div>

                                <form onSubmit={handleSaveScheme} className="space-y-4 p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                                    <h5 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                        {editSchemeId ? '📝 Edit Entry Scheme' : '➕ Create Entry Scheme'}
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Scheme Title</label>
                                            <input type="text" placeholder="e.g. NCC Special Entry (Army)" className="ncc-input text-xs" required value={schemeForm.title} onChange={e => setSchemeForm({...schemeForm, title: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry Type</label>
                                            <input type="text" placeholder="e.g. Direct SSB / Written Exam" className="ncc-input text-xs" value={schemeForm.type} onChange={e => setSchemeForm({...schemeForm, type: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Minimum Age</label>
                                            <input type="number" className="ncc-input text-xs" required value={schemeForm.minAge} onChange={e => setSchemeForm({...schemeForm, minAge: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Maximum Age</label>
                                            <input type="number" className="ncc-input text-xs" required value={schemeForm.maxAge} onChange={e => setSchemeForm({...schemeForm, maxAge: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Display Age Range</label>
                                            <input type="text" placeholder="e.g. 19 to 25 Years" className="ncc-input text-xs" value={schemeForm.ageLimit} onChange={e => setSchemeForm({...schemeForm, ageLimit: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Degree Req.</label>
                                            <select className="ncc-input text-xs" value={schemeForm.degreeStatus} onChange={e => setSchemeForm({...schemeForm, degreeStatus: e.target.value})}>
                                                <option value="completed">Completed Only</option>
                                                <option value="completed_or_pursuing">Completed / Pursuing</option>
                                                <option value="any">Any Status</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Min CGPA %</label>
                                            <input type="number" className="ncc-input text-xs" value={schemeForm.cgpa} onChange={e => setSchemeForm({...schemeForm, cgpa: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">NCC Cert Req.</label>
                                            <select className="ncc-input text-xs" value={schemeForm.certType} onChange={e => setSchemeForm({...schemeForm, certType: e.target.value})}>
                                                <option value="none">None</option>
                                                <option value="A">A Cert</option>
                                                <option value="B">B Cert</option>
                                                <option value="C">C Cert</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Min Grade</label>
                                            <select className="ncc-input text-xs" value={schemeForm.certGrade} onChange={e => setSchemeForm({...schemeForm, certGrade: e.target.value})}>
                                                <option value="none">None</option>
                                                <option value="C">C Grade</option>
                                                <option value="B">B Grade</option>
                                                <option value="A">A Grade</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Official Portal URL</label>
                                            <input type="url" className="ncc-input text-xs" value={schemeForm.link} onChange={e => setSchemeForm({...schemeForm, link: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Brief Description</label>
                                            <input type="text" className="ncc-input text-xs" value={schemeForm.description} onChange={e => setSchemeForm({...schemeForm, description: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 text-xs">
                                        {editSchemeId && (
                                            <button type="button" onClick={() => { setEditSchemeId(null); setSchemeForm({ title: '', type: 'Direct SSB (No Written Exam)', description: '', ageLimit: '19 to 25 Years', minAge: '19', maxAge: '25', degreeStatus: 'completed_or_pursuing', cgpa: '50', certType: 'C', certGrade: 'B', link: '' }); }} className="text-gray-400 font-bold uppercase tracking-widest px-3">
                                                Cancel
                                            </button>
                                        )}
                                        <button type="submit" className="ncc-btn ncc-btn-success text-xs">
                                            {editSchemeId ? 'Update Scheme' : 'Create Scheme'}
                                        </button>
                                    </div>
                                </form>

                                <div className="border-t border-[#ddd8cc] dark:border-white/5 pt-4 space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculator Schemes</p>
                                    {dbSchemes.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No entry schemes configured in database. Seed default schemes to initialize.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {dbSchemes.map(s => (
                                                <div key={s.id} className="p-4 bg-white dark:bg-slate-900 border border-[#ede8df] dark:border-white/5 rounded-2xl flex justify-between items-center gap-4">
                                                    <div>
                                                        <h5 className="font-bold text-xs text-ncc-navy dark:text-white leading-tight">{s.title}</h5>
                                                        <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-mono">
                                                            Age: {s.minAge}-{s.maxAge} Years | Degree: {s.degreeStatus} (Min {s.cgpa}%) | NCC: {s.certType} ({s.certGrade} Grade)
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => handleEditScheme(s)} className="p-1 text-gray-400 hover:text-ncc-navy dark:hover:text-white">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteScheme(s.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mentors and requests Admin */}
                        {adminSubTab === 'mentors' && (
                            <div className="space-y-6">
                                <div className="ncc-card p-6 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">Defense Mentors List</h4>
                                        <button onClick={handleSeedMentors} className="ncc-btn ncc-btn-secondary text-[10px] py-1.5 px-3">
                                            Seed Default Mentors
                                        </button>
                                    </div>

                                    <form onSubmit={handleSaveMentor} className="space-y-4 p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                                        <h5 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                            {editMentorId ? '📝 Edit Mentor' : '➕ Add Featured Mentor'}
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mentor Name</label>
                                                <input type="text" placeholder="e.g. Lt. Aditya Verma" className="ncc-input text-xs" required value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rank Prefix</label>
                                                <input type="text" placeholder="e.g. Lt. / SI / Fg Offr" className="ncc-input text-xs" required value={mentorForm.rank} onChange={e => setMentorForm({...mentorForm, rank: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Branch Wing</label>
                                                <input type="text" placeholder="e.g. Army Wing" className="ncc-input text-xs" required value={mentorForm.wing} onChange={e => setMentorForm({...mentorForm, wing: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Passing Batch Year</label>
                                                <input type="text" className="ncc-input text-xs" required value={mentorForm.year} onChange={e => setMentorForm({...mentorForm, year: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Commission Regiment</label>
                                                <input type="text" placeholder="e.g. 16 Madras Regiment" className="ncc-input text-xs" required value={mentorForm.commission} onChange={e => setMentorForm({...mentorForm, commission: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Email</label>
                                                <input type="email" placeholder="e.g. name@army.in" className="ncc-input text-xs" value={mentorForm.email} onChange={e => setMentorForm({...mentorForm, email: e.target.value})} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Achievement Description</label>
                                            <input type="text" placeholder="e.g. Direct Entry commission via OTA Chennai" className="ncc-input text-xs" value={mentorForm.achievement} onChange={e => setMentorForm({...mentorForm, achievement: e.target.value})} />
                                        </div>
                                        <div className="flex justify-end gap-2 text-xs">
                                            {editMentorId && (
                                                <button type="button" onClick={() => { setEditMentorId(null); setMentorForm({ name: '', rank: 'Lt.', wing: 'Army Wing', year: '2025', commission: '', achievement: '', email: '' }); }} className="text-gray-400 font-bold uppercase tracking-widest px-3">
                                                    Cancel
                                                </button>
                                            )}
                                            <button type="submit" className="ncc-btn ncc-btn-success text-xs">
                                                {editMentorId ? 'Update Mentor' : 'Add Mentor'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="border-t border-[#ddd8cc] dark:border-white/5 pt-4 space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configured Mentors</p>
                                        {dbMentors.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">No mentors configured. Seed default featured mentors to initialize.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {dbMentors.map(m => (
                                                    <div key={m.id} className="p-3 bg-white dark:bg-slate-900 border border-[#ede8df] dark:border-white/5 rounded-2xl flex gap-3 justify-between items-center">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-xs text-ncc-navy dark:text-white truncate">{m.name}</p>
                                                            <p className="text-[9px] text-gray-400 truncate">{m.commission} ({m.wing})</p>
                                                        </div>
                                                        <div className="flex gap-1 shrink-0">
                                                            <button onClick={() => handleEditMentor(m)} className="p-1 text-gray-400 hover:text-ncc-navy dark:hover:text-white">
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteMentor(m.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="ncc-card p-6 space-y-4">
                                    <h4 className="font-display font-black text-sm text-ncc-navy dark:text-white uppercase tracking-widest">Mentorship Request Logs</h4>
                                    
                                    {dbRequests.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-4">No mentorship requests logged in database.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {dbRequests.map(req => (
                                                <div key={req.id} className="p-4 bg-white dark:bg-slate-900 border border-[#ede8df] dark:border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-ncc-navy dark:text-white text-sm">{req.cadetName}</p>
                                                            <span className="text-[9px] text-gray-400 font-mono">({req.enrollmentId})</span>
                                                        </div>
                                                        <p className="text-gray-500 dark:text-white/80 leading-normal">{req.contactInfo}</p>
                                                        <p className="text-[10px] text-ncc-gold font-semibold uppercase">Status: {req.status || 'pending'}</p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        {req.status !== 'assigned' && (
                                                            <button onClick={() => handleUpdateReqStatus(req.id, 'assigned')} className="px-3 py-1.5 bg-ncc-navy text-ncc-gold font-bold text-[10px] uppercase rounded-xl border border-transparent hover:border-ncc-gold transition-colors">
                                                                Mark Assigned
                                                            </button>
                                                        )}
                                                        {req.status !== 'completed' && (
                                                            <button onClick={() => handleUpdateReqStatus(req.id, 'completed')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase rounded-xl border border-transparent hover:border-emerald-500 transition-colors">
                                                                Complete
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Mentorship Request Modal (Cadet view) */}
            {showMentorshipModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMentorshipModal(false)} />
                    <div className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl relative border border-[#ddd8cc] dark:border-white/10 z-10 animate-in zoom-in-95 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />
                        
                        {mentorshipStep === 1 ? (
                            <div className="space-y-6">
                                <div className="w-14 h-14 bg-ncc-navy/5 rounded-2xl flex items-center justify-center">
                                    <Users className="w-7 h-7 text-ncc-navy dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white">Request Direct Mentorship</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed mt-1">
                                        We will notify **{selectedMentorForRequest?.name}** and log a request for mock SSB interviews/guidance.
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-[11px] text-gray-500 leading-normal border border-gray-100 dark:border-white/5">
                                    <strong className="text-ncc-gold uppercase">Privacy Warning:</strong> This will share your phone number and email registered with GMRIT NCC with the alumnus so they can reach out to you via WhatsApp/Email.
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <button onClick={() => setShowMentorshipModal(false)} className="px-6 py-3 font-bold text-gray-400 uppercase tracking-widest">Cancel</button>
                                    <button onClick={handleMentorshipRequest} className="flex-1 ncc-btn ncc-btn-primary">Confirm & Send</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                    <ShieldCheck className="w-7 h-7 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white">Request Submitted!</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed mt-1">
                                        Jai Hind! Mentorship request logged successfully. An alumni member will get in touch with you shortly.
                                    </p>
                                </div>
                                <button onClick={() => setShowMentorshipModal(false)} className="ncc-btn ncc-btn-primary w-full">Understood</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
