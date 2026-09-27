import React, { useEffect, useState } from 'react';
import { 
    Shield, 
    Users, 
    Award, 
    Target, 
    ChevronRight, 
    ArrowRight,
    Star,
    CheckCircle,
    Flag,
    MapPin,
    Calendar,
    BookOpen,
    Mail,
    Phone,
    Heart,
    Menu,
    X,
    Music,
    Globe,
    VisibilityIcon,
    ChevronDown,
    FileText,
    Moon,
    Sun,
    Download
} from './Icons.jsx';

import { ThemeToggle } from './ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useInView } from 'react-intersection-observer';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import CountUp from 'react-countup';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';

import { db } from '../firebase/config';
import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { getCollectionRef } from '../firebase/firestoreService';

// Asset Imports
import nccLogo from '../assets/ncc_logo.jpg';
import heroBg from '../assets/hero_bg.png';
import legacyBg from '../assets/legacy_bg.png';
import socialBg from '../assets/social_bg.png';
import campLifeImg from '../assets/camp_life.png';
import disciplineImg from '../assets/discipline.png';
import rdParadeImg from '../assets/rd_parade.png';
import adventureImg from '../assets/adventure.png';
import drillImg from '../assets/drill_practice.png';
import shootingImg from '../assets/shooting_range.png';
import ceremonyImg from '../assets/ceremony.png';
import genesisThumb from '../assets/genesis_real.png';
import flagThumb from '../assets/flag_thumb.png';
import pledgeThumb from '../assets/cta_guard.png';
import mottoThumb from '../assets/cta_unity.png';
import aimThumb from '../assets/aim_real.png';
import songThumb from '../assets/motto_real.png';
import trainingThumb from '../assets/training_thumb.png';
import valuesThumb from '../assets/values_thumb.png';
import ctaCadet from '../assets/cta_cadet.png';
import ctaUnity from '../assets/cta_unity.png';
import ctaGuard from '../assets/cta_guard.png';
import curriculumTrainingImg from '../assets/training_bg.png';
import ctaMisc from '../assets/training_thumb.png';

// New Asset Imports
import trekkingImg from '../assets/activities_trekking.png';
import statueImg from '../assets/ncc_statue.png';
import socialServiceImg from '../assets/social_service.png';

// Statue Legend Imports
import statueKunzru from '../assets/statue_kunzru.png';
import statueWings from '../assets/statue_wings.png';
import statueHistoric from '../assets/statue_historic.png';

export const LandingPage = ({ onGetStarted, user }) => {
    const { tenant } = useTenant();
    const { isDarkMode } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [modalContent, setModalContent] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeStatue, setActiveStatue] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    // PWA Install Logic
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const [isPWA, setIsPWA] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    useEffect(() => {
        setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            setShowInstallGuide(true);
        }
    };

    const tourSteps = [
        {
            target: '.hero-content',
            content: 'Welcome to the 14(A) BN NCC Portal! This is your gateway to excellence.',
            placement: 'bottom',
        },
        {
            target: '#training',
            content: 'Explore our specialized training modules designed to build character and leadership.',
        },
        {
            target: '#impact',
            content: 'Witness the real-world impact of our cadets through animated live statistics.',
        },
        {
            target: '.archives-section',
            content: 'Dive into our historical archives and honor the legends of NCC.',
        },
        {
            target: '.login-actions',
            content: 'Ready to join? Sign up or log in here to access your personal dashboard.',
        }
    ];

    /*
    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
        }
    };
    */

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            
            // Calculate scroll progress
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    // Lock scroll when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);


    const legalDocs = {
        privacy: {
            title: "Privacy Policy",
            content: `
                <div class="space-y-6 text-gray-600 dark:text-gray-300">
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">1. Data Collection</h4>
                        <p>We collect essential cadet information including full name, regimental number, contact details, and academic department for unit management purposes.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">2. How We Use Your Data</h4>
                        <p>Your data is used exclusively for attendance tracking, camp nominations, and the generation of digital certificates and ID cards.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">3. Data Security</h4>
                        <p>All personal information is stored securely using Firebase encrypted storage. Access is strictly limited to authorized Unit Officers and Administrators.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">4. Third-Party Sharing</h4>
                        <p>We do not share your personal information with third-party commercial entities. Data may only be shared with official NCC Directorates for administrative requirements.</p>
                    </section>
                </div>
            `
        },
        terms: {
            title: "Terms of Service",
            content: `
                <div class="space-y-6 text-gray-600 dark:text-gray-300">
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">1. Eligibility</h4>
                        <p>This portal is exclusively for currently enrolled students of GMR Institute of Technology who are registered cadets of 14(A) BN NCC.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">2. Code of Conduct</h4>
                        <p>Users must adhere to the highest standards of discipline. Any misuse of the portal or falsification of data may lead to disciplinary action and revocation of access.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">3. User Responsibility</h4>
                        <p>Cadets are responsible for maintaining the confidentiality of their login credentials and ensuring their profile information remains accurate and up-to-date.</p>
                    </section>
                    <section>
                        <h4 class="font-bold text-ncc-navy dark:text-white mb-2">4. Service Modifications</h4>
                        <p>The Unit reserves the right to modify or terminate portal access to any user based on unit requirements or disciplinary grounds.</p>
                    </section>
                </div>
            `
        },
        impact: {
            title: "Our Impact Stories",
            image: valuesThumb,
            content: `
                <div class="space-y-8">
                    <div class="group p-6 bg-gray-50 dark:bg-[#0a1628] rounded-3xl border border-transparent hover:border-ncc-gold/20 transition-all">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold">🩸</div>
                            <h4 class="font-black text-ncc-navy dark:text-white text-xl">Mega Blood Donation Drive</h4>
                        </div>
                        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">Cadets of 14(A) BN organized a record-breaking donation camp, collecting 150+ units for the Srikakulam Red Cross Society, potentially saving hundreds of lives in the local community.</p>
                    </div>
                    <div class="group p-6 bg-gray-50 dark:bg-[#0a1628] rounded-3xl border border-transparent hover:border-ncc-gold/20 transition-all">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold">🌳</div>
                            <h4 class="font-black text-ncc-navy dark:text-white text-xl">Green Campus Initiative</h4>
                        </div>
                        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">As part of our commitment to the environment, cadets successfully planted and adopted 200+ native saplings across Srikakulam, creating a sustainable green lung for future generations.</p>
                    </div>
                    <div class="group p-6 bg-gray-50 dark:bg-[#0a1628] rounded-3xl border border-transparent hover:border-ncc-gold/20 transition-all">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">🧹</div>
                            <h4 class="font-black text-ncc-navy dark:text-white text-xl">Swachh Bharat Abhiyan</h4>
                        </div>
                        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">Weekly cleaning drives in Rajam town have not only improved local hygiene but also educated over 500 households on the importance of waste segregation and plastic-free living.</p>
                    </div>
                    <div class="group p-6 bg-gray-50 dark:bg-[#0a1628] rounded-3xl border border-transparent hover:border-ncc-gold/20 transition-all">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-ncc-navy/10 rounded-xl flex items-center justify-center text-ncc-navy dark:text-white font-bold">🛡️</div>
                            <h4 class="font-black text-ncc-navy dark:text-white text-xl">Disaster Management Training</h4>
                        </div>
                        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">Collaborating with state emergency services, our cadets underwent intensive training in rescue operations and first aid, standing ready to serve the nation during natural calamities.</p>
                    </div>
                </div>
            `
        },
        syllabus: {
            title: "NCC Certificate Syllabus Overview",
            image: trainingThumb,
            content: `
                <div class="space-y-10">
                    <div class="p-8 bg-ncc-navy text-white rounded-[2.5rem]">
                        <h4 class="text-2xl font-black mb-6 flex items-center gap-4">
                            <span class="w-10 h-10 bg-ncc-gold rounded-xl flex items-center justify-center text-white text-sm">B</span>
                            'B' Certificate Syllabus (2nd Year)
                        </h4>
                        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/70 text-sm">
                            <li class="flex items-center gap-2">🟢 Foot Drill & Arms Drill</li>
                            <li class="flex items-center gap-2">🟢 Weapon Training (.22 Rifle)</li>
                            <li class="flex items-center gap-2">🟢 National Integration & Awareness</li>
                            <li class="flex items-center gap-2">🟢 Civil Defence & First Aid</li>
                            <li class="flex items-center gap-2">🟢 Social Service Activities</li>
                            <li class="flex items-center gap-2">🟢 Personality Development</li>
                        </ul>
                    </div>
                    <div class="p-8 border-2 border-ncc-navy/10 rounded-[2.5rem]">
                        <h4 class="text-2xl font-black text-ncc-navy dark:text-white mb-6 flex items-center gap-4">
                            <span class="w-10 h-10 bg-ncc-red rounded-xl flex items-center justify-center text-white text-sm">C</span>
                            'C' Certificate Syllabus (3rd Year)
                        </h4>
                        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-500 dark:text-gray-400 text-sm">
                            <li class="flex items-center gap-2">🔵 Advanced Map Reading</li>
                            <li class="flex items-center gap-2">🔵 Field Craft & Battle Craft</li>
                            <li class="flex items-center gap-2">🔵 Military History & Geography</li>
                            <li class="flex items-center gap-2">🔵 Communication Fundamentals</li>
                            <li class="flex items-center gap-2">🔵 Obstacle Training</li>
                            <li class="flex items-center gap-2">🔵 Leadership Traits & Management</li>
                        </ul>
                    </div>
                    <p class="text-xs text-center text-gray-400 font-medium italic">*Note: Minimum 75% attendance and 1 National Camp attendance required for exam eligibility.</p>
                </div>
            `
        },
        aim: {
            title: "Aim of NCC",
            image: aimThumb,
            content: `
                <div class="space-y-6 text-gray-600 dark:text-gray-300">
                    <p class="text-lg font-bold text-ncc-navy dark:text-white">The Aims of the NCC are:</p>
                    <ul class="space-y-4">
                        <li class="flex gap-4">
                            <span class="text-ncc-gold font-black">01</span>
                            <p>To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure and ideals of selfless service among the youth of the country.</p>
                        </li>
                        <li class="flex gap-4">
                            <span class="text-ncc-gold font-black">02</span>
                            <p>To create a human resource of organized, trained and motivated youth, to provide leadership in all walks of life and be always available for the service of the nation.</p>
                        </li>
                        <li class="flex gap-4">
                            <span class="text-ncc-gold font-black">03</span>
                            <p>To provide a suitable environment to motivate the youth to take up a career in the Armed Forces.</p>
                        </li>
                    </ul>
                </div>
            `
        },
        motto: {
            title: "Motto of NCC",
            image: mottoThumb,
            content: `
                <div class="text-center space-y-8 py-10">
                    <h4 class="text-6xl font-display font-black text-ncc-navy dark:text-white tracking-tighter">UNITY AND <br/><span class="text-ncc-gold">DISCIPLINE</span></h4>
                    <p class="text-xl font-bold text-gray-400 uppercase tracking-[0.3em]">(Ekta aur Anushasan)</p>
                    <div class="max-w-md mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                        Adopted on 23 Dec 1957, these two words form the bedrock of the National Cadet Corps, guiding every cadet towards a life of order and national togetherness.
                    </div>
                </div>
            `
        },
        pledge: {
            title: "The NCC Pledge",
            image: pledgeThumb,
            content: `
                <div class="bg-ncc-navy p-10 rounded-[3rem] text-white space-y-6 italic leading-loose text-lg">
                    "We the cadet of the National Cadet Corps, do solemnly pledge that we shall always uphold the unity of India. We resolve to be disciplined and responsible citizen of our Nation. We shall undertake positive community service in the spirit of selflessness and concern for our fellow beings."
                </div>
            `
        },
        genesis: {
            title: "Genesis (History)",
            image: genesisThumb,
            content: `
                <div class="space-y-6 text-gray-600 dark:text-gray-300">
                    <p>The NCC in India was formed with the National Cadet Corps Act of 1948. It was raised on 15 July 1948.</p>
                    <p>The origin of NCC can be traced back to the ‘University Corps’, which was created under the Indian Defence Act 1917, with the object to make up for the shortage in the Army.</p>
                    <p>In 1920, when the Indian Territorial Act was passed, the ‘University Corps’ was replaced by the University Training Corps (UTC). The aim was to raise the status of the UTC and make it more attractive to the youth.</p>
                    <p>In 1946, the Kunzru Committee was set up under Pandit HN Kunzru for establishment of a nationwide youth organization. The recommendations were accepted and the NCC came into existence.</p>
                </div>
            `
        },
        flag: {
            title: "The NCC Flag",
            image: flagThumb,
            content: `
                <div class="space-y-8">
                    <div class="h-48 w-full rounded-3xl overflow-hidden flex shadow-2xl">
                        <div class="h-full flex-1 bg-[#b01020]" title="Army"></div>
                        <div class="h-full flex-1 bg-[#0a1628]" title="Navy"></div>
                        <div class="h-full flex-1 bg-[#87ceeb]" title="Air Force"></div>
                    </div>
                    <div class="space-y-4 text-gray-600 dark:text-gray-300">
                        <p>The NCC flag was introduced in 1954. It features three vertical stripes of equal width:</p>
                        <ul class="space-y-2">
                            <li><span class="font-bold text-[#b01020]">Red:</span> Represents the Indian Army</li>
                            <li><span class="font-bold text-[#0a1628]">Deep Blue:</span> Represents the Indian Navy</li>
                            <li><span class="font-bold text-[#87ceeb]">Light Blue:</span> Represents the Indian Air Force</li>
                        </ul>
                        <p>The center contains the NCC crest surrounded by 17 lotuses, representing the 17 Directorates across India.</p>
                    </div>
                </div>
            `
        },
        song: {
            title: "NCC Song",
            image: songThumb,
            content: `
                <div class="space-y-6 text-center py-6">
                    <h4 class="text-2xl font-black text-ncc-navy dark:text-white">Hum Sab Bharatiya Hain</h4>
                    <div class="text-gray-500 dark:text-gray-400 space-y-1 font-medium italic overflow-y-auto max-h-[40vh] p-4 bg-gray-50 dark:bg-[#0a1628] rounded-2xl">
                        Hum Sab Bharatiya Hain, Hum Sab Bharatiya Hain<br/>
                        Apni Manzil Ek Hai, Ha, Ha, Ha, Ek Hai, Ho, Ho, Ho, Ek Hai.<br/>
                        Hum Sab Bharatiya Hain.<br/><br/>
                        Kashmir Ki Dharti Rani Hai, Sartaj Himalaya Hai,<br/>
                        Saadiyon Se Humne Isko Apne Khoon Se Pala Hai.<br/>
                        Desh Ki Raksha Ki Khatir Hum Shamshir Utha Lenge,<br/>
                        Hum Shamshir Utha Lenge.<br/><br/>
                        Bhikre Bhikre Taare Hain Hum Lekin Jhilmil Ek Hai,<br/>
                        Ha, Ha, Ha, Ek Hai.<br/>
                        Hum Sab Bharatiya Hain.<br/><br/>
                        Mandir Gurudwaare Bhi Hain Yahan Aur Masjid Bhi Hai Yahan<br/>
                        Girja Ka Hai Ghariyal Kahin Mullah Ki Kahin Azaan<br/>
                        Ek Hi Apna Ram Hain, Ek Hi Allah Taala Hai,<br/>
                        Ek Hi Allah Taala Hai.<br/><br/>
                        Rang Birange Deepak Hain Hum, Lekin Jyoti Ek Hai,<br/>
                        Ha Ha Ha Ek Hai, Ho Ho Ho Ek Hai.<br/>
                        Hum Sab Bharatiya Hain, Hum Sab Bharatiya Hain.
                    </div>
                </div>
            `
        },
        dg_ncc: {
            title: "DG NCC Corner - Leadership",
            content: `
                <div class="space-y-8">
                    <div class="p-6 bg-ncc-navy rounded-3xl text-white">
                        <h4 class="text-xl font-bold mb-2">Lt Gen Gurbirpal Singh, AVSM, VSM</h4>
                        <p class="text-ncc-gold font-black text-xs uppercase tracking-widest">Director General, NCC</p>
                    </div>
                    <div class="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                        <p>Lieutenant General Gurbirpal Singh took over as the Director General of National Cadet Corps (NCC) on September 27, 2021.</p>
                        <p>An alumnus of the National Defence Academy and Indian Military Academy, the General was commissioned into the PARAS (Special Forces) in 1987. He has a rich experience of command and staff appointments in various operational environments.</p>
                        <h5 class="font-black text-ncc-navy dark:text-white mt-6">Organizational Structure:</h5>
                        <ul class="space-y-2 list-disc pl-5">
                            <li>National HQ: New Delhi</li>
                            <li>State Directorates: 17 across India</li>
                            <li>Groups: Over 90 Group HQs</li>
                            <li>Units: Over 800 Units (Army, Navy, Air)</li>
                        </ul>
                    </div>
                </div>
            `
        },
        rti: {
            title: "RTI - Transparency & Governance",
            content: `
                <div class="space-y-6 text-gray-600 dark:text-gray-300">
                    <p class="font-bold text-ncc-navy dark:text-white">Information under Section 4(1)(b) of RTI Act 2005:</p>
                    <div class="p-6 bg-gray-50 dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-white/10">
                        <h5 class="font-black text-ncc-navy dark:text-white mb-2">Central Public Information Officer (CPIO)</h5>
                        <p>Director (Adm), HQ DG NCC, West Block-IV, RK Puram, New Delhi.</p>
                    </div>
                    <p>The National Cadet Corps is committed to transparency and accountability. Citizens can file RTI applications to seek information regarding unit administration, training schedules, and enrollment procedures.</p>
                    <h5 class="font-black text-ncc-navy dark:text-white">How to file:</h5>
                    <p>Applications can be filed online via the RTI Portal (rti.gov.in) or submitted manually to the respective Directorate/Unit headquarters with the prescribed fee.</p>
                </div>
            `
        },
        training_material: {
            title: "Training Material & Syllabus",
            content: `
                <div class="space-y-8">
                    <section>
                        <h5 class="font-black text-ncc-red uppercase tracking-widest text-xs mb-4">Common Subjects (All Wings)</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ Drill & Parade</div>
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ Weapon Training</div>
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ National Integration</div>
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ Disaster Management</div>
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ Social Service</div>
                            <div class="p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl">✓ Health & Hygiene</div>
                        </div>
                    </section>
                    <section>
                        <h5 class="font-black text-ncc-navy dark:text-white uppercase tracking-widest text-xs mb-4">Army Specialized Subjects</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">🛡️ Armed Forces Intro</div>
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">🗺️ Map Reading</div>
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">🌲 Field Craft & Battle Craft</div>
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">🔫 Infantry Weapons</div>
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">📜 Military History</div>
                            <div class="p-3 bg-ncc-navy/5 rounded-xl">📡 Communication</div>
                        </div>
                    </section>
                </div>
            `
        }
    };

    return (
        <div className={`min-h-screen selection:bg-ncc-gold/30 transition-colors duration-1000 overflow-x-hidden ${isDarkMode ? 'dark' : ''}`} style={{ background: 'var(--bg-page)', color: 'var(--text-main)' }}>
            {/* --- ELITE TOP PROGRESS BAR --- */}
            <div 
                className="fixed top-0 left-0 h-1 bg-gradient-to-r from-ncc-gold via-white to-ncc-gold z-[1000] transition-all duration-300"
                style={{ width: `${scrollProgress}%`, boxShadow: '0 0 20px rgba(201, 146, 42, 0.5)' }}
            />

            {/* --- GRAINY OVERLAY (Tactical Feel) --- */}
            <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] dark:opacity-[0.08]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />

            {/* --- FLOATING ACTION BUTTON --- */}
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: scrolled ? 1 : 0, opacity: scrolled ? 1 : 0 }}
                className="fixed bottom-10 left-10 z-[100] hidden md:block"
            >
                <button 
                    onClick={() => onGetStarted('cadet', true)}
                    className="flex items-center gap-3 bg-ncc-navy dark:bg-ncc-gold text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all group border border-white/10"
                >
                    <Users className="w-4 h-4 text-ncc-gold dark:text-white" />
                    <span>Join the Unit</span>
                    <div className="w-2 h-2 bg-ncc-red rounded-full animate-pulse" />
                </button>
            </motion.div>
            {/* --- NAVIGATION --- */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 ${
                scrolled ? 'shadow-2xl py-2 sm:py-2.5' : 'bg-transparent py-3 sm:py-5'
            }`} style={scrolled ? { background: 'var(--nav-header)', backdropFilter: 'blur(16px)' } : {}}>
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-ncc-gold/20 rounded-full blur-lg group-hover:bg-ncc-gold/40 transition-all" />
                            <img 
                                src={nccLogo} 
                                alt="NCC Logo" 
                                className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain relative z-10 transition-transform group-hover:scale-110 duration-500"
                            />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg md:text-xl font-display font-black leading-none tracking-tight" style={{ color: scrolled ? 'var(--text-main)' : 'white' }}>14(A) BN NCC</h1>
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-ncc-gold font-black mt-0.5 sm:mt-1">Srikakulam</p>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center gap-8 xl:gap-10">
                        {['About', 'Legacy', 'Training', 'Impact', 'FAQs'].map((item) => (
                            <a 
                                key={item}
                                href={`#${item.toLowerCase()}`} 
                                className="text-[11px] font-black uppercase tracking-[0.25em] transition-all relative overflow-hidden group"
                                style={{ color: scrolled ? 'var(--text-main)' : (window.innerWidth < 1024 ? 'var(--text-main)' : 'white') }}
                            >
                                {item}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-ncc-red group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                        <ThemeToggle />
                        <div className="hidden lg:flex items-center gap-4 login-actions">
                            <button 
                                onClick={() => onGetStarted('cadet', true)}
                                className="text-[11px] font-black uppercase tracking-[0.25em] transition-all hover:text-ncc-red"
                                style={{ color: scrolled ? 'var(--text-main)' : 'white' }}
                            >
                                Sign Up
                            </button>
                            <button 
                                onClick={() => onGetStarted('cadet', false)}
                                className="bg-ncc-navy text-white px-6 xl:px-8 py-2.5 xl:py-3 rounded-full text-[11px] font-black uppercase tracking-[0.25em] hover:bg-ncc-red shadow-xl shadow-ncc-navy/20 transition-all active:scale-95 hover:shadow-ncc-red/30"
                            >
                                Login
                            </button>
                        </div>
                        {!isPWA && (
                            <button 
                                onClick={handleInstallClick}
                                className="hidden sm:flex items-center gap-2 bg-ncc-gold/20 hover:bg-ncc-gold text-ncc-gold hover:text-ncc-navy px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border border-ncc-gold/30"
                            >
                                <Download className="w-3.5 h-3.5" /> Install
                            </button>
                        )}

                        {/* Mobile Toggle */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 rounded-xl transition-all"
                            style={{ 
                                background: scrolled ? 'var(--bg-page)' : 'rgba(255,255,255,0.1)',
                                color: scrolled ? 'var(--text-main)' : 'white'
                            }}
                            aria-label="Toggle navigation menu"
                        >
                            {isMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-screen min-h-[100dvh] flex flex-col justify-between pt-20 sm:pt-24 md:pt-28 pb-6 sm:pb-8 overflow-hidden">
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${heroBg})` }}
                >
                    <img 
                        src={tenant?.heroBg || heroBg} 
                        alt={`${tenant?.unitName || '14(A) BN NCC'} Parade`} 
                        onError={(e) => {
                            if (e.currentTarget.src !== heroBg) {
                                e.currentTarget.src = heroBg;
                            }
                        }}
                        className="w-full h-full object-cover brightness-[0.85]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-ncc-navy/95 via-ncc-navy/70 lg:via-ncc-navy/40 to-ncc-navy/20" />
                    <div className="absolute inset-0 bg-black/25" />
                </div>

                <div className="relative z-10 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 my-auto py-6 sm:py-10">
                    <div className="max-w-3xl lg:max-w-4xl space-y-4 sm:space-y-6 fade-in-up">
                        <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/10 dark:bg-[#050b14]/30 backdrop-blur-xl border border-white/20 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-lg">
                            <span className="w-2 h-2 bg-ncc-gold rounded-full animate-pulse shadow-[0_0_15px_rgba(201,146,42,0.8)]" />
                            <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.25em] sm:tracking-[0.3em]">Official Unit Portal</span>
                        </div>
                        
                        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-black text-white leading-[1.02] sm:leading-[0.95] tracking-tighter">
                            National <br/>
                            <span className="text-ncc-gold border-b-4 sm:border-b-[6px] border-ncc-gold/60 relative inline-block pb-0.5 sm:pb-1">
                                Cadet
                                <Star className="absolute -top-2 sm:-top-3 -right-6 sm:-right-8 w-6 h-6 sm:w-10 sm:h-10 text-ncc-gold opacity-50 hidden sm:block" />
                            </span> <br/>
                            Corps.
                        </h2>
                        
                        <p className="text-sm sm:text-base md:text-lg text-white/90 font-medium sm:font-bold leading-relaxed max-w-xl drop-shadow-2xl">
                            Official portal of {tenant?.unitName || '14(A) BN NCC'}, Srikakulam. Join the mission of character building and selfless service to the nation.
                        </p>

                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto">
                            <button 
                                onClick={() => onGetStarted('cadet', true)}
                                className="bg-ncc-red text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white dark:bg-[#050b14] hover:text-ncc-red shadow-[0_15px_40px_rgba(192,21,42,0.4)] transition-all flex items-center justify-center gap-3 sm:gap-4 group active:scale-95 text-xs sm:text-sm text-center"
                            >
                                <span>Start Your Journey</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-2 transition-transform duration-500 shrink-0" />
                            </button>
                            <a 
                                href="#about"
                                className="bg-white/10 dark:bg-[#050b14]/30 backdrop-blur-xl text-white border-2 border-white/30 dark:border-white/20 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white hover:text-ncc-navy dark:hover:bg-[#050b14] dark:hover:text-white transition-all active:scale-95 flex items-center justify-center text-xs sm:text-sm text-center"
                            >
                                Explore More
                            </a>

                            {!isPWA && (
                                <button 
                                    onClick={handleInstallClick}
                                    className="bg-ncc-gold text-ncc-navy px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-3 sm:gap-4 group text-xs sm:text-sm shadow-xl shadow-ncc-gold/20 text-center font-bold"
                                >
                                    <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    <span>Download App</span>
                                </button>
                            )}
                        </div>

                        {/* Quick Highlights Row on Left */}
                        <div className="pt-3 sm:pt-4 flex flex-wrap items-center gap-3 sm:gap-6 text-white/75 text-xs font-semibold">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-ncc-gold shrink-0" />
                                <span>50+ Years Legacy</span>
                            </div>
                            <div className="h-3 w-px bg-white/20 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-ncc-gold shrink-0" />
                                <span>Army Wing Tri-Service</span>
                            </div>
                            <div className="h-3 w-px bg-white/20 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-ncc-gold shrink-0" />
                                <span>Unity &amp; Discipline</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity hidden sm:flex pb-2">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em] text-white">Scroll</p>
                    <div className="w-0.5 h-10 sm:h-14 bg-gradient-to-b from-ncc-gold to-transparent rounded-full animate-pulse" />
                </div>
            </section>

            {/* --- ABOUT SECTION --- */}
            <section id="about" className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] lg:w-[800px] h-[500px] lg:h-[800px] bg-ncc-gold/5 rounded-full -mr-48 lg:-mr-96 -mt-48 lg:-mt-96 blur-[80px] lg:blur-[120px] pointer-events-none" />
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    <div className="space-y-6 sm:space-y-10 reveal">
                        <div className="space-y-2 sm:space-y-4">
                            <p className="text-ncc-red font-black uppercase tracking-[0.3em] text-xs">About the Unit</p>
                            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black text-ncc-navy dark:text-white leading-tight">Legacy of Unity <br/>and Discipline</h3>
                        </div>
                        
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm sm:text-base md:text-lg lg:text-xl font-medium">
                            The 14(A) Battalion NCC unit, Srikakulam is dedicated to providing a platform for students to develop their personality, character, and leadership skills. We follow the core motto: <span className="text-ncc-navy dark:text-white font-black">Unity and Discipline</span>.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                            {[
                                { icon: Shield, title: "Character Building", desc: "Instilling core values and self-discipline." },
                                { icon: Users, title: "Team Leadership", desc: "Practical experience in leading units." },
                                { icon: Award, title: "Nation Service", desc: "Preparing for careers in armed forces." },
                                { icon: Target, title: "Skill Dev", desc: "Rifle training, map reading & more." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] hover:bg-gray-50 dark:bg-[#0a1628] dark:hover:bg-[#0a1628] border border-transparent hover:border-ncc-gold/20 transition-all duration-500 group">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-ncc-navy/5 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-ncc-navy group-hover:rotate-6 transition-all duration-500">
                                        <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-navy dark:text-white group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-ncc-navy dark:text-white text-sm sm:text-base">{item.title}</h4>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-1.5 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative group mt-6 lg:mt-0">
                        <div className="absolute inset-0 bg-ncc-gold rounded-3xl sm:rounded-[4rem] rotate-3 sm:rotate-6 opacity-10 group-hover:rotate-2 sm:group-hover:rotate-3 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-ncc-red rounded-3xl sm:rounded-[4rem] -rotate-2 sm:-rotate-3 opacity-5 group-hover:rotate-0 transition-transform duration-700" />
                        <div className="relative overflow-hidden rounded-3xl sm:rounded-[4rem] shadow-[0_30px_70px_-15px_rgba(10,22,40,0.25)] lg:shadow-[0_50px_100px_-20px_rgba(10,22,40,0.3)] z-10">
                            <img 
                                src={legacyBg} 
                                alt="NCC Cadets Parade" 
                                className="w-full h-[320px] sm:h-[450px] md:h-[550px] lg:h-[650px] object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                        <div className="absolute -bottom-4 sm:-bottom-8 lg:-bottom-10 left-3 sm:left-4 lg:-left-10 bg-ncc-navy p-4 sm:p-6 lg:p-10 rounded-2xl sm:rounded-[3rem] shadow-2xl z-20 text-white max-w-[210px] sm:max-w-[250px] lg:max-w-[280px] animate-float border border-white/10">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-ncc-gold">50+</span>
                                <div className="h-7 sm:h-10 w-1 bg-ncc-gold/30 rounded-full" />
                            </div>
                            <p className="text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-black text-white/60 leading-relaxed">Years of Continuous Excellence in Unit 14(A) BN</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- NCC FUNDAMENTALS (A to Z) --- */}
            <section id="legacy" className="py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-8 sm:space-y-12">
                    <div className="text-center space-y-3 sm:space-y-4 reveal">
                        <p className="text-ncc-red font-black uppercase tracking-[0.3em] text-[10px]">NCC Fundamentals</p>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ncc-navy dark:text-white tracking-tight">Legacy from A to Z</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm sm:text-base font-medium">Detailed insights into the core pillars, history, and values of the National Cadet Corps.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {[
                            { id: 'genesis', title: "Genesis", icon: Globe, desc: "The history and raising of NCC in 1948.", bg: "bg-slate-100", accent: "text-slate-600", image: genesisThumb },
                            { id: 'aim', title: "Aim", icon: Target, desc: "The core objectives of youth development.", bg: "bg-amber-50", accent: "text-amber-600", image: aimThumb },
                            { id: 'motto', title: "Motto", icon: Shield, desc: "Unity and Discipline (Ekta aur Anushasan).", bg: "bg-blue-50", accent: "text-blue-600", image: mottoThumb },
                            { id: 'pledge', title: "Pledge", icon: CheckCircle, desc: "The solemn oath taken by every cadet.", bg: "bg-emerald-50", accent: "text-emerald-600", image: pledgeThumb },
                            { id: 'flag', title: "NCC Flag", icon: Flag, desc: "Representing the three services: Army, Navy, and Air Force.", bg: "bg-ncc-gold/10", accent: "text-ncc-gold", image: flagThumb },
                            { id: 'song', title: "NCC Song", icon: Music, desc: "Hum Sab Bharatiya Hain - Our anthem.", bg: "bg-indigo-50", accent: "text-indigo-600", image: songThumb },
                            { id: 'syllabus', title: "Training", icon: BookOpen, desc: "Detailed syllabus for B & C certificates.", bg: "bg-gray-100", accent: "text-gray-600 dark:text-gray-300", image: trainingThumb },
                            { id: 'impact', title: "Core Values", icon: Heart, desc: "Integrity, selfless service, and patriotism.", bg: "bg-rose-50", accent: "text-rose-600", image: valuesThumb }
                        ].map((topic, i) => (
                            <button 
                                key={topic.id}
                                onClick={() => setModalContent(legalDocs[topic.id])}
                                className={`group relative bg-white dark:bg-[#0d2137] rounded-2xl sm:rounded-3xl text-left border border-gray-100 dark:border-white/5 hover:border-ncc-gold/30 shadow-sm hover:shadow-2xl transition-all duration-500 reveal overflow-hidden flex flex-col h-full`}
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                {/* Image Header */}
                                {topic.image && (
                                    <div className="h-36 sm:h-40 w-full overflow-hidden relative flex-shrink-0">
                                        <img 
                                            src={topic.image} 
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                            alt={topic.title} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d2137] via-transparent to-transparent opacity-40" />
                                        <div className={`absolute top-3 sm:top-4 right-3 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 dark:bg-[#050b14]/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg group-hover:bg-ncc-navy group-hover:rotate-12 transition-all duration-500`}>
                                            <topic.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${topic.accent} group-hover:text-white transition-colors`} />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="p-4 sm:p-6 flex flex-col flex-1">
                                    {!topic.image && (
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-[#050b14] rounded-xl flex items-center justify-center mb-4 sm:mb-5 shadow-sm group-hover:bg-ncc-navy group-hover:rotate-12 transition-all duration-500`}>
                                            <topic.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${topic.accent} group-hover:text-white transition-colors`} />
                                        </div>
                                    )}
                                    <h4 className="text-base sm:text-lg font-black text-ncc-navy dark:text-white mb-1.5 sm:mb-2">{topic.title}</h4>
                                    <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium line-clamp-2">{topic.desc}</p>
                                    
                                    <div className="mt-auto pt-4 sm:pt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] font-black uppercase tracking-widest text-ncc-gold">
                                            Read Heritage <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <div className="w-6 sm:w-8 h-1 bg-gray-100 dark:bg-white/5 rounded-full group-hover:w-12 group-hover:bg-ncc-gold transition-all duration-500" />
                                    </div>
                                </div>
                            </button>
                        ))}
                        
                        {/* Static Links for Image parity */}
                        <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-4 sm:mt-6">
                            <button 
                                onClick={() => setModalContent(legalDocs.dg_ncc)}
                                className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-ncc-navy text-white flex items-center justify-between group hover:bg-ncc-red transition-all cursor-pointer text-left relative z-10"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <Users className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-gold" />
                                    <div>
                                        <h4 className="text-base sm:text-lg font-black leading-none">DG NCC Corner</h4>
                                        <p className="text-white/50 text-[9px] sm:text-[10px] mt-1.5 uppercase tracking-widest">Leadership Hub</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform shrink-0" />
                            </button>
                            
                            <button 
                                onClick={() => setModalContent(legalDocs.rti)}
                                className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#050b14] border-2 border-ncc-navy/5 rounded-3xl flex items-center justify-between group hover:border-ncc-gold transition-all cursor-pointer text-left relative z-10" 
                                style={{ transitionDelay: '100ms' }}
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-navy dark:text-white" />
                                    <div>
                                        <h4 className="text-base sm:text-lg font-black leading-none text-ncc-navy dark:text-white">RTI Section</h4>
                                        <p className="text-gray-400 text-[9px] sm:text-[10px] mt-1.5 uppercase tracking-widest">Transparency</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform shrink-0" />
                            </button>
                            
                            <button 
                                onClick={() => setModalContent(legalDocs.training_material)}
                                className="p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-[#F5F0E8] dark:bg-ncc-navy flex items-center justify-between group hover:bg-ncc-gold hover:text-white transition-all cursor-pointer text-left relative z-10" 
                                style={{ transitionDelay: '200ms' }}
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-gold group-hover:text-white" />
                                    <div>
                                        <h4 className="text-base sm:text-lg font-black leading-none text-ncc-navy dark:text-white group-hover:text-white">Training Material</h4>
                                        <p className="text-gray-500 dark:text-gray-300 text-[9px] sm:text-[10px] mt-1.5 uppercase tracking-widest group-hover:text-white/60">Study Resources</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 dark:text-white group-hover:translate-x-2 transition-transform shrink-0" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CADET EXPERIENCE --- */}
            <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gray-50 dark:bg-[#0a1628]">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="order-2 lg:order-1 reveal">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-3 sm:space-y-4">
                                <div className="h-36 sm:h-44 md:h-56 bg-ncc-navy rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-end text-white overflow-hidden group relative">
                                    <img src={campLifeImg} alt="Camp Life" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy to-transparent opacity-80" />
                                    <div className="relative z-10">
                                        <h4 className="text-base sm:text-lg font-black mb-1">Life at Camp</h4>
                                        <p className="text-[9px] sm:text-[10px] text-white/70 leading-relaxed">Outdoor training, firing ranges, and cross-cultural friendship.</p>
                                    </div>
                                </div>
                                <div className="h-48 sm:h-56 md:h-72 bg-ncc-gold rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-end text-white overflow-hidden group relative">
                                    <img src={disciplineImg} alt="Discipline" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy to-transparent opacity-80" />
                                    <div className="relative z-10">
                                        <h4 className="text-base sm:text-lg font-black mb-1">Discipline First</h4>
                                        <p className="text-[9px] sm:text-[10px] text-white/70 leading-relaxed">Instilling order and respect as a foundation for growth.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 sm:space-y-4 pt-0 sm:pt-6 md:pt-8">
                                <div className="h-48 sm:h-56 md:h-72 bg-ncc-red rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-end text-white overflow-hidden group relative">
                                    <img src={legacyBg} alt="RD Parade" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ncc-red to-transparent opacity-80" />
                                    <div className="relative z-10">
                                        <h4 className="text-base sm:text-lg font-black mb-1">RD Parade</h4>
                                        <p className="text-[9px] sm:text-[10px] text-white/70 leading-relaxed">The ultimate dream of marching on Rajpath.</p>
                                    </div>
                                </div>
                                <div className="h-36 sm:h-44 md:h-56 bg-ncc-navy/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-end text-white overflow-hidden group relative">
                                    <img src={adventureImg} alt="Adventure" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy to-transparent opacity-80" />
                                    <div className="relative z-10">
                                        <h4 className="text-base sm:text-lg font-black mb-1">Adventure</h4>
                                        <p className="text-[9px] sm:text-[10px] text-white/70 leading-relaxed">Trekking, mountaineering, and parasailing.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 sm:space-y-6 order-1 lg:order-2 reveal">
                        <p className="text-ncc-gold font-black uppercase tracking-[0.3em] text-[10px]">The Cadet Journey</p>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ncc-navy dark:text-white leading-tight">Beyond the <br className="hidden md:block" />Classroom Walls</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium leading-relaxed">
                            NCC isn't just an extra-curricular; it's a transformative life experience. We take you from being a student to becoming a motivated human resource.
                        </p>
                        <ul className="space-y-2.5 sm:space-y-3">
                            {[
                                "Regular Parade & Drill Practice",
                                "National Level Achievement Camps",
                                "Career Guidance for Defense Services",
                                "Leadership Workshops & Seminars"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 group">
                                    <div className="w-5 h-5 bg-ncc-gold/10 rounded-full flex items-center justify-center group-hover:bg-ncc-gold transition-colors shrink-0">
                                        <CheckCircle className="w-3.5 h-3.5 text-ncc-gold group-hover:text-white" />
                                    </div>
                                    <span className="font-bold text-ncc-navy dark:text-white text-xs sm:text-sm">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* --- CADET'S CORNER (Across Country) --- */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white dark:bg-[#050b14] relative overflow-hidden">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-10 sm:space-y-16">
                    <div className="text-center space-y-3 sm:space-y-4 reveal">
                        <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-ncc-navy/5 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full">
                            <Globe className="w-3.5 h-3.5 text-ncc-navy dark:text-white" />
                            <span className="text-ncc-navy dark:text-white font-black uppercase tracking-[0.3em] text-[9px]">Nationwide Impact</span>
                        </div>
                        <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black text-ncc-navy dark:text-white tracking-tight">Cadet's Corner</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm sm:text-base font-medium">Witness the vibrant activities and selfless service performed by NCC cadets across every corner of India.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {[
                            { 
                                title: "Adventure Training", 
                                loc: "Himalayan Region", 
                                desc: "High-altitude trekking and mountaineering expeditions that build grit and endurance.", 
                                img: trekkingImg, 
                                tag: "Endurance" 
                            },
                            { 
                                title: "Social Service", 
                                loc: "Pan India", 
                                desc: "Active participation in Swachh Bharat and community welfare drives at historical sites.", 
                                img: socialServiceImg, 
                                tag: "Service" 
                            },
                            { 
                                title: "National Integration", 
                                loc: "New Delhi", 
                                desc: "Cadets from 17 Directorates coming together to celebrate India's diverse cultural heritage.", 
                                img: campLifeImg, 
                                tag: "Unity" 
                            }
                        ].map((act, i) => (
                            <Tilt key={i} perspective={1000} scale={1.02} transitionSpeed={1000} className="reveal" style={{ transitionDelay: `${i * 200}ms` }}>
                                <div className="group relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden bg-gray-100 dark:bg-white/5 h-[380px] sm:h-[420px] md:h-[450px]">
                                    <img src={act.img} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={act.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy via-ncc-navy/20 to-transparent" />
                                    <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
                                        <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">{act.tag}</span>
                                    </div>
                                    <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 sm:right-8 space-y-1.5 sm:space-y-2">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-ncc-gold mb-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{act.loc}</span>
                                        </div>
                                        <h4 className="text-xl sm:text-2xl font-black text-white leading-tight">{act.title}</h4>
                                        <p className="text-white/80 text-xs sm:text-sm font-medium leading-relaxed opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">{act.desc}</p>
                                    </div>
                                </div>
                            </Tilt>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- STATS SECTION --- */}
            <section id="impact" className="py-14 sm:py-20 md:py-24 bg-ncc-navy text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                </div>
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 md:gap-16 text-center">
                        {[
                            { label: "Active Cadets", value: 250, suffix: "+", color: "text-ncc-gold" },
                            { label: "Camps Attended", value: 15, suffix: "+", color: "text-white" },
                            { label: "Medals Won", value: 85, suffix: "+", color: "text-ncc-gold" },
                            { label: "Officers Produced", value: 12, suffix: "", color: "text-white" }
                        ].map((stat, i) => (
                            <div key={i} className="space-y-2 md:space-y-4 reveal" style={{ transitionDelay: `${i * 150}ms` }}>
                                <p className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black ${stat.color}`}>
                                    <CountUp end={stat.value} duration={3} enableScrollSpy scrollSpyOnce />
                                    {stat.suffix}
                                </p>
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                    <div className="w-6 sm:w-8 h-0.5 bg-ncc-gold/30 rounded-full" />
                                    <p className="text-[8px] sm:text-[9px] md:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.4em] font-black text-white/50">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- VISION & MISSION --- */}
            <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#FDFCFB] relative">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-ncc-navy text-white space-y-4 sm:space-y-6 shadow-xl relative overflow-hidden group reveal">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-ncc-gold/10 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000 pointer-events-none" />
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 dark:bg-[#050b14]/10 backdrop-blur-xl rounded-xl sm:rounded-2xl flex items-center justify-center">
                            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-gold" />
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-display font-black tracking-tight">Our Vision</h3>
                        <p className="text-sm sm:text-base text-white/70 leading-relaxed font-medium">
                            To create a human resource of organized, trained and motivated youth, to provide leadership in all walks of life and be always available for the service of the nation.
                        </p>
                    </div>
                    <div className="p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border-2 border-ncc-navy/5 bg-white dark:bg-[#050b14] space-y-4 sm:space-y-6 hover:border-ncc-gold transition-all duration-700 relative overflow-hidden group reveal" style={{ transitionDelay: '200ms' }}>
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-ncc-red/5 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-ncc-red group-hover:rotate-12 transition-all duration-500">
                            <Target className="w-6 h-6 sm:w-7 sm:h-7 text-ncc-red group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-display font-black text-ncc-navy dark:text-white tracking-tight">Our Mission</h3>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            To develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure and ideals of selfless service among the youth of the country.
                        </p>
                    </div>
                </div>
            </section>

            {/* --- DETAILED TRAINING --- */}
            <section id="training" className="py-14 sm:py-20 px-4 sm:px-6 bg-white dark:bg-[#050b14] relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <img src={heroBg} className="w-full h-full object-cover grayscale" alt="bg" />
                </div>
                
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-8 sm:space-y-12 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-8">
                        <div className="max-w-2xl space-y-3 sm:space-y-4 reveal">
                            <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-ncc-navy/5 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full">
                                <BookOpen className="w-3.5 h-3.5 text-ncc-navy dark:text-white" />
                                <span className="text-ncc-navy dark:text-white font-black uppercase tracking-[0.3em] text-[9px]">Unit Curriculum</span>
                            </div>
                            <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black text-ncc-navy dark:text-white tracking-tight leading-none">Training <br/><span className="text-ncc-red">Excellence.</span></h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm sm:text-base font-medium leading-relaxed reveal" style={{ transitionDelay: '200ms' }}>
                            A comprehensive multi-year program designed to transform students into disciplined leaders.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {[
                            { 
                                category: "Military Fundamentals", 
                                items: [
                                    { title: "Drill & Parade", desc: "Mastering precision and synchronization." },
                                    { title: "Weapon Training", desc: "Safe handling and firing fundamentals." },
                                    { title: "Map Reading", desc: "Tactical navigation and analysis." }
                                ],
                                icon: Shield,
                                color: "border-ncc-navy",
                                image: curriculumTrainingImg
                            },
                            { 
                                category: "Field & Life Skills", 
                                items: [
                                    { title: "Field Craft", desc: "Survival and tactical field signals." },
                                    { title: "First Aid", desc: "Emergency medical response." },
                                    { title: "Disaster Mgmt", desc: "Coordinated response strategies." }
                                ],
                                icon: Target,
                                color: "border-ncc-red",
                                image: ctaMisc
                            },
                            { 
                                category: "Leadership & Ethics", 
                                items: [
                                    { title: "Personality Dev", desc: "Building confidence and professional ethics." },
                                    { title: "Command", desc: "Experience in leading sections." },
                                    { title: "Social Service", desc: "Spirit of selfless community service." }
                                ],
                                icon: Award,
                                color: "border-ncc-gold",
                                image: ctaCadet
                            }
                        ].map((module, i) => (
                            <Tilt key={i} perspective={1000} scale={1.02} transitionSpeed={1000} className="reveal h-full" style={{ transitionDelay: `${i * 200}ms` }}>
                                <div className={`bg-white dark:bg-[#050b14] rounded-2xl sm:rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all duration-700 group overflow-hidden h-full flex flex-col`}>
                                    {/* Image Header */}
                                    <div className="h-44 sm:h-52 overflow-hidden relative">
                                        <img 
                                            src={module.image} 
                                            alt={module.category} 
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t from-white dark:from-[#050b14] via-transparent to-transparent opacity-60`} />
                                        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${
                                            i === 0 ? 'from-ncc-navy to-blue-500' : 
                                            i === 1 ? 'from-ncc-red to-orange-500' : 
                                            'from-ncc-gold to-yellow-500'
                                        }`} />
                                        <div className="absolute bottom-4 sm:bottom-6 left-5 sm:left-8">
                                            <div className="flex items-center gap-2.5 sm:gap-3">
                                                <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                                    <module.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                </div>
                                                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-white drop-shadow-md">{module.category}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-8 flex flex-col h-full bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 dark:to-transparent">
                                        <div className="space-y-4 sm:space-y-6 flex-1">
                                            {module.items.map((item, j) => (
                                                <div key={j} className="group/item relative pl-4 sm:pl-5">
                                                    <div className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-ncc-gold rounded-full group-hover/item:scale-150 transition-transform" />
                                                    <h5 className="font-bold text-ncc-navy dark:text-white text-sm sm:text-base leading-none tracking-tight">{item.title}</h5>
                                                    <p className="text-[11px] sm:text-[12px] text-gray-400 mt-1.5 sm:mt-2 leading-relaxed font-medium">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 sm:mt-10 pt-4 sm:pt-5 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-ncc-navy dark:text-white/30">
                                            <span>Official Module</span>
                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </Tilt>
                        ))}
                    </div>

                    <div className="bg-ncc-navy p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 sm:gap-8 reveal overflow-hidden relative group">
                        <div className="absolute inset-0 bg-ncc-gold/5 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700 pointer-events-none" />
                        <div className="space-y-1 relative z-10 text-center md:text-left">
                            <h4 className="text-xl sm:text-2xl font-display font-black text-white">Download Official Syllabus</h4>
                            <p className="text-white/60 text-xs sm:text-sm font-medium">Get the complete 14(A) BN Army Wing training handbook (PDF).</p>
                        </div>
                        <a 
                            href="https://indiancc.nic.in/wp-content/uploads/2021/11/Army-Syllabus.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-ncc-gold text-white px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-white dark:bg-[#050b14] hover:text-ncc-navy dark:text-white transition-all shadow-xl relative z-10 active:scale-95 text-center text-xs"
                        >
                            Download PDF
                        </a>
                    </div>
                </div>
            </section>

            {/* --- MOMENTS OF EXCELLENCE (GALLERY) --- */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50 dark:bg-[#050b14]/50 relative overflow-hidden">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-10 sm:space-y-16">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-8">
                        <div className="max-w-2xl space-y-3 sm:space-y-4 reveal">
                            <p className="text-ncc-red font-black uppercase tracking-[0.3em] text-[10px]">Visual Journey</p>
                            <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ncc-navy dark:text-white tracking-tight leading-none">Moments of <br/><span className="text-ncc-gold">Excellence.</span></h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-xs sm:text-sm font-medium leading-relaxed reveal" style={{ transitionDelay: '200ms' }}>
                            A glimpse into the rigorous training and ceremonial pride of the 14(A) BN NCC cadets.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 min-h-[480px] md:h-[580px] lg:h-[600px]">
                        <div className="h-[280px] sm:h-[350px] md:h-full md:col-span-8 group relative overflow-hidden rounded-2xl sm:rounded-[3rem] shadow-2xl reveal">
                            <img src={rdParadeImg} alt="Ceremonial Parade" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy via-transparent to-transparent opacity-60" />
                            <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 text-white">
                                <h4 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2">Ceremonial Pride</h4>
                                <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-widest">Annual Unit Parade</p>
                            </div>
                        </div>
                        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-4 sm:gap-6">
                            <div className="h-[200px] sm:h-[220px] md:h-full group relative overflow-hidden rounded-2xl sm:rounded-[3rem] shadow-2xl reveal" style={{ transitionDelay: '200ms' }}>
                                <img src={drillImg} alt="Drill Practice" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy/60 to-transparent opacity-40" />
                                <div className="absolute bottom-5 sm:bottom-8 left-5 sm:left-8 text-white">
                                    <h4 className="text-lg sm:text-xl font-black mb-0.5 sm:mb-1">Precision</h4>
                                    <p className="text-white/60 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Daily Drill Session</p>
                                </div>
                            </div>
                            <div className="h-[200px] sm:h-[220px] md:h-full group relative overflow-hidden rounded-2xl sm:rounded-[3rem] shadow-2xl reveal" style={{ transitionDelay: '400ms' }}>
                                <img src={shootingImg} alt="Shooting Range" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-ncc-red/40 to-transparent opacity-40" />
                                <div className="absolute bottom-5 sm:bottom-8 left-5 sm:left-8 text-white">
                                    <h4 className="text-lg sm:text-xl font-black mb-0.5 sm:mb-1">Focus</h4>
                                    <p className="text-white/60 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Range Practice</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- NCC STATUES (ARCHIVES) --- */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-ncc-navy text-white relative overflow-hidden archives-section">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
                </div>
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-10 sm:space-y-16 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-end">
                        <div className="space-y-4 sm:space-y-6 reveal">
                            <div className="space-y-2 sm:space-y-4">
                                <p className="text-ncc-gold font-black uppercase tracking-[0.3em] text-[10px]">Historical Legacy</p>
                                <h3 className="text-3xl sm:text-4xl md:text-6xl font-display font-black leading-none tracking-tight">NCC Statues <br/><span className="text-white/40">(Archives)</span></h3>
                            </div>
                            <p className="text-white/70 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl">
                                Immortalizing the legends who shaped the National Cadet Corps. These monuments preserve our timeless heritage, from our visionary founders to the birth of the corps.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:gap-6 reveal" style={{ transitionDelay: '200ms' }}>
                            <div className="p-4 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-xl">
                                <h4 className="text-2xl sm:text-3xl font-black text-ncc-gold mb-1">100+</h4>
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50">Monuments Nationwide</p>
                            </div>
                            <div className="p-4 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-xl">
                                <h4 className="text-2xl sm:text-3xl font-black text-ncc-gold mb-1">75</h4>
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50">Years of History</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8">
                        {[
                            { img: statueKunzru, title: "Pandit Kunzru", subtitle: "The Visionary Founder", delay: "300ms" },
                            { img: statueWings, title: "Tri-Service Unity", subtitle: "Army, Navy & Air Wings", delay: "500ms" },
                            { img: statueHistoric, title: "1948 Inception", subtitle: "First Prime Minister's Parade", delay: "700ms" }
                        ].map((s, idx) => (
                            <div key={idx} className="group relative h-[380px] sm:h-[440px] md:h-[500px] rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 sm:border-[8px] border-white/5 reveal" style={{ transitionDelay: s.delay }}>
                                <div className="absolute -inset-4 bg-ncc-gold/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                <img src={s.img} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" alt={s.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy via-ncc-navy/20 to-transparent opacity-80" />
                                <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 sm:right-8 flex justify-between items-end">
                                    <div className="transform group-hover:-translate-y-2 transition-transform duration-500">
                                        <h4 className="text-xl sm:text-2xl font-black mb-1">{s.title}</h4>
                                        <p className="text-ncc-gold text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">{s.subtitle}</p>
                                    </div>
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-ncc-gold group-hover:scale-110 transition-all duration-500 shrink-0">
                                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FAQs SECTION --- */}
            <section id="faqs" className="py-14 sm:py-20 px-4 sm:px-6 bg-[#FDFCFB] dark:bg-black">
                <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
                    <div className="text-center space-y-3 sm:space-y-4 reveal">
                        <p className="text-ncc-red font-black uppercase tracking-[0.3em] text-[10px]">Help & Support</p>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ncc-navy dark:text-white tracking-tight">Frequently Asked Questions</h3>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4 reveal">
                        {[
                            { q: "How can I join the 14(A) BN NCC?", a: "Enrollment typically happens at the beginning of the academic year. Keep an eye on unit announcements or contact your institution's Associate NCC Officer (ANO) for selection dates." },
                            { q: "Is there any age limit for joining?", a: "The age limit for Senior Division (SD) and Senior Wing (SW) is 26 years." },
                            { q: "What are the benefits of C-Certificate?", a: "C-certificate holders get significant bonus marks in defense exams (CDS, AFCAT) and a direct entry for SSB interviews in many wings of the Armed Forces." },
                            { q: "Are there any physical requirements?", a: "Yes, basic physical fitness is required, including running and basic exercises. A medical fitness certificate is mandatory for selection." }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white dark:bg-ncc-navy p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
                                <h4 className="text-sm sm:text-base font-black text-ncc-navy dark:text-white mb-2 sm:mb-3 flex items-start sm:items-center gap-2.5 sm:gap-3">
                                    <span className="w-6 h-6 sm:w-7 sm:h-7 bg-ncc-gold/10 text-ncc-gold rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5 sm:mt-0 font-bold">Q</span>
                                    <span>{faq.q}</span>
                                </h4>
                                <p className="text-gray-500 dark:text-white/80 leading-relaxed font-medium text-xs sm:text-sm pl-8 sm:pl-10">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FEATURES SECTION --- */}
            <section className="py-14 sm:py-20 px-4 sm:px-6 bg-ncc-navy relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-8 sm:space-y-12 relative z-10">
                    <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto reveal">
                        <p className="text-ncc-gold font-black uppercase tracking-[0.3em] text-[10px]">Digital Portal</p>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-tight">Smart Unit Management</h3>
                        <p className="text-white/60 text-sm sm:text-base font-medium leading-relaxed">Our custom-built ecosystem streamlines the entire NCC lifecycle for cadets and officers.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { icon: Calendar, title: "Smart Attendance", desc: "Automated QR-based muster tracking for daily parades and events.", color: "bg-blue-600" },
                            { icon: BookOpen, title: "Digital Library", desc: "Access verified study materials, manuals, and mock exams for B & C certificates.", color: "bg-ncc-gold" },
                            { icon: Flag, title: "Camp Management", desc: "Nomination tracking and logistics management for national and local camps.", color: "bg-ncc-red" },
                            { icon: Star, title: "Honour Roll", desc: "Real-time leaderboard and achievement tracking for outstanding cadets.", color: "bg-emerald-600" },
                            { icon: MapPin, title: "Live Tracking", desc: "Monitor unit movement and event locations in real-time via maps.", color: "bg-indigo-600" },
                            { icon: CheckCircle, title: "Digital ID Cards", desc: "Instantly generated official digital IDs for secure verification.", color: "bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white" }
                        ].map((feat, i) => (
                            <div key={i} className="bg-ncc-navy dark:bg-[#050b14]/5 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 hover:border-ncc-gold/40 hover:bg-[#0c1a30] dark:hover:bg-[#050b14]/10 transition-all duration-700 group reveal" style={{ transitionDelay: `${i * 150}ms` }}>
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${feat.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-2xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}>
                                    <feat.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>
                                <h4 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 tracking-tight">{feat.title}</h4>
                                <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- SOCIAL SERVICE HIGHLIGHT --- */}
            <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white dark:bg-[#050b14] overflow-hidden">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden group shadow-2xl reveal">
                        <img 
                            src={socialBg} 
                            className="w-full h-[380px] sm:h-[450px] md:h-[500px] object-cover group-hover:scale-105 transition-transform duration-[2s]" 
                            alt="Social Service" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ncc-navy via-ncc-navy/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-5 sm:p-8 md:p-10 space-y-3 sm:space-y-4 max-w-2xl text-white">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-ncc-gold rounded-xl flex items-center justify-center shadow-lg shrink-0">
                                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <p className="text-ncc-gold font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[9px] sm:text-[10px]">Community Engagement</p>
                            </div>
                            <h3 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight">Beyond the Uniform</h3>
                            <p className="text-xs sm:text-base text-white/80 leading-relaxed font-medium line-clamp-3 sm:line-clamp-none">
                                Our cadets are at the forefront of social change. From environmental conservation to blood donation drives.
                            </p>
                            <div className="pt-1 sm:pt-2">
                                <button 
                                    onClick={() => setModalContent(legalDocs.impact)}
                                    className="bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-ncc-gold hover:text-white transition-all shadow-2xl active:scale-95 text-xs"
                                >
                                    View Impact Stories
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- LOCATION & CONTACT --- */}
            <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#FDFCFB] dark:bg-ncc-navy">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    <div className="lg:col-span-1 space-y-6 sm:space-y-10 reveal">
                        <div className="space-y-2 sm:space-y-4">
                            <h3 className="text-3xl sm:text-4xl font-display font-black text-ncc-navy dark:text-white tracking-tight">Get in Touch</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium leading-relaxed">Have questions? Reach out to us directly.</p>
                        </div>
                        
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex gap-3 sm:gap-4 group">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-[#050b14] border border-gray-100 dark:border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:bg-ncc-navy group-hover:rotate-6 transition-all duration-500">
                                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-ncc-navy dark:text-white group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-ncc-navy dark:text-white text-base sm:text-lg">Our Unit Office</h4>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">14(A) Bn NCC Headquarters, Ramakrishna Nagar, Srikakulam, Andhra Pradesh - 532001.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 sm:gap-4 group">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-[#050b14] border border-gray-100 dark:border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:bg-ncc-gold group-hover:rotate-6 transition-all duration-500">
                                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-ncc-gold group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-ncc-navy dark:text-white text-base sm:text-lg">Call Us</h4>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">08942-223234</p>
                                </div>
                            </div>
                            <div className="flex gap-3 sm:gap-4 group">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-[#050b14] border border-gray-100 dark:border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:bg-ncc-red group-hover:-rotate-6 transition-all duration-500">
                                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-ncc-red group-hover:text-white transition-colors" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-ncc-navy dark:text-white text-base sm:text-lg">Email Us</h4>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">14abnnccsklm@gmail.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-4 sm:border-[8px] border-white dark:border-white/10 h-[300px] sm:h-[380px] md:h-[450px] relative reveal" style={{ transitionDelay: '300ms' }}>
                        <iframe 
                            src="https://maps.google.com/maps?q=14(A)%20Battalion%20NCC%20Ramakrishna%20Nagar%20Srikakulam&t=&z=15&ie=UTF8&iwloc=&output=embed"
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen="" 
                            loading="lazy" 
                            title="NCC Unit Location Map"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
                <div className="w-full max-w-[1700px] mx-auto bg-ncc-navy rounded-3xl sm:rounded-[4rem] p-6 sm:p-12 md:p-20 lg:p-24 text-center relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(10,22,40,0.4)] reveal">
                    {/* Background Image Layer */}
                    <div className="absolute inset-0 z-0">
                        <img src={ctaGuard} className="w-full h-full object-cover opacity-20 grayscale group-hover:scale-110 transition-transform duration-[3s]" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-br from-ncc-navy via-ncc-navy/90 to-ncc-red/80" />
                    </div>

                    {/* Floating Decorative Images */}
                    <div className="absolute top-10 left-10 w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl hidden lg:block animate-float opacity-40">
                        <img src={ctaCadet} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl hidden lg:block animate-float-delayed opacity-40">
                        <img src={ctaMisc} className="w-full h-full object-cover" alt="" />
                    </div>

                    <div className="relative z-10 space-y-6 sm:space-y-10">
                        <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-white/10 backdrop-blur-xl border border-white/10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ncc-gold animate-spin-slow" />
                            <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.3em] sm:tracking-[0.4em]">Become a Leader</span>
                        </div>
                        
                        <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-white leading-tight tracking-tight">
                            Ready to Serve the <br/> <span className="text-ncc-gold underline-gold">Nation?</span>
                        </h3>
                        
                        <p className="text-white/70 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                            Join the ranks of disciplined leaders. Register your profile today and start tracking your journey in the 14(A) BN NCC.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-6 pt-2 sm:pt-6 w-full sm:w-auto">
                            <button 
                                onClick={() => onGetStarted('cadet', true)}
                                className="group bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] hover:bg-ncc-gold hover:text-white hover:scale-105 transition-all shadow-2xl active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-3"
                            >
                                <span>Register as Cadet</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-2 transition-transform shrink-0" />
                            </button>
                            <button 
                                onClick={() => onGetStarted('cadet', false)}
                                className="text-white border-2 border-white/20 px-6 sm:px-10 py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] hover:border-white hover:bg-white/10 transition-all active:scale-95 text-xs sm:text-sm text-center"
                            >
                                Login to Portal
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-12 sm:py-20 px-4 sm:px-6 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#050b14]">
                <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-8 sm:space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 sm:gap-12">
                        <div className="flex items-center gap-4 sm:gap-5 text-center sm:text-left">
                            <img src={nccLogo} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" alt="Logo" />
                            <div>
                                <p className="text-lg sm:text-xl font-black text-ncc-navy dark:text-white uppercase tracking-tight">14(A) BN NCC Srikakulam</p>
                                <p className="text-[9px] sm:text-[11px] text-gray-400 font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase">Unity & Discipline Since Establishment</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-5 sm:gap-8 lg:gap-10 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-400">
                            <button 
                                onClick={() => setModalContent(legalDocs.privacy)}
                                className="hover:text-ncc-navy dark:text-white dark:hover:text-white transition-all relative group"
                            >
                                Privacy Policy
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ncc-navy dark:bg-white group-hover:w-full transition-all duration-300" />
                            </button>
                            <button 
                                onClick={() => setModalContent(legalDocs.terms)}
                                className="hover:text-ncc-navy dark:text-white dark:hover:text-white transition-all relative group"
                            >
                                Terms of Service
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ncc-navy dark:bg-white group-hover:w-full transition-all duration-300" />
                            </button>
                            <a 
                                href="https://indiancc.nic.in/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-ncc-navy dark:text-white dark:hover:text-white transition-all relative group"
                            >
                                Official NCC Site
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ncc-navy dark:bg-white group-hover:w-full transition-all duration-300" />
                            </a>
                        </div>
                    </div>
                    <div className="pt-6 sm:pt-12 border-t border-gray-50 dark:border-white/5 text-center">
                        <p className="text-[8px] sm:text-[10px] text-gray-400 uppercase tracking-[0.25em] sm:tracking-[0.5em] font-black">© 2026 Official Unit Management System | Digitalized by 14(A) BN NCC</p>
                    </div>
                </div>
            </footer>

            {/* --- MOBILE SIDEBAR (ROOT LEVEL) --- */}
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden transition-opacity duration-500 ${
                    isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Sidebar Content */}
            <div 
                className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-[#0A1628] z-[110] lg:hidden transition-transform duration-500 ease-out shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col ${
                    isMenuOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
                }`}
                style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
            >
                <div className="flex flex-col h-full p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8 sm:mb-12">
                        <div className="flex items-center gap-3">
                            <img src={nccLogo} className="w-9 h-9 sm:w-10 sm:h-10" alt="Logo" />
                            <div className="flex flex-col">
                                <h2 className="text-white font-display font-black text-base sm:text-lg leading-none">14(A) BN</h2>
                                <p className="text-ncc-gold text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-1">BATTALION HQ</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsMenuOpen(false)} 
                            className="bg-white dark:bg-[#050b14]/10 p-2.5 sm:p-3 rounded-xl text-white active:scale-90 transition-all hover:bg-ncc-red"
                            aria-label="Close navigation menu"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                    
                    {/* Navigation Links */}
                    <nav className="flex-1 space-y-1.5 sm:space-y-2 overflow-y-auto">
                        {['About', 'Legacy', 'Training', 'Impact', 'FAQs'].map((item) => (
                            <a 
                                key={item}
                                href={`#${item.toLowerCase()}`} 
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-display font-black text-white hover:bg-white/5 transition-all group"
                            >
                                <span>{item}</span>
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-ncc-gold group-hover:translate-x-1 transition-transform" />
                            </a>
                        ))}
                    </nav>

                    {/* Footer Actions */}
                    <div className="mt-auto space-y-3 pt-6 sm:pt-10">
                        <button 
                            onClick={() => { setIsMenuOpen(false); onGetStarted('cadet', false); }}
                            className="w-full bg-ncc-gold text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm shadow-xl shadow-ncc-gold/20 active:scale-95 transition-transform"
                        >
                            Portal Login
                        </button>
                        <button 
                            onClick={() => { setIsMenuOpen(false); onGetStarted('cadet', true); }}
                            className="w-full border-2 border-white/20 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm hover:bg-white hover:text-ncc-navy active:scale-95 transition-all"
                        >
                            Create Account
                        </button>
                    </div>
                </div>
            </div>

            {/* --- LEGAL MODAL --- */}
            {modalContent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-ncc-navy/80 backdrop-blur-md"
                        onClick={() => setModalContent(null)}
                    />
                    <div className="relative bg-white dark:bg-[#050b14] w-full max-w-2xl rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        <div className="bg-ncc-navy p-5 sm:p-8 flex justify-between items-center text-white shrink-0">
                            <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight">{modalContent.title}</h3>
                            <button 
                                onClick={() => setModalContent(null)}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-sm"
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5 sm:p-10 overflow-y-auto">
                            {modalContent.image && (
                                <div className="mb-6 sm:mb-8 rounded-xl sm:rounded-[2rem] overflow-hidden shadow-2xl h-40 sm:h-48 md:h-72 bg-gray-100 dark:bg-white/5">
                                    <img src={modalContent.image} className="w-full h-full object-cover" alt={modalContent.title} />
                                </div>
                            )}
                            <div dangerouslySetInnerHTML={{ __html: modalContent.content }} />
                        </div>
                        <div className="p-4 sm:p-8 border-t border-gray-50 dark:border-white/5 flex justify-end shrink-0">
                            <button 
                                onClick={() => setModalContent(null)}
                                className="bg-ncc-navy text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] hover:bg-ncc-red transition-all text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SCROLL TO TOP --- */}
            {scrolled && (
                <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 bg-ncc-navy text-white w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(10,22,40,0.3)] hover:bg-ncc-red transition-all hover:scale-110 active:scale-95 group border border-white/10"
                    aria-label="Scroll to top"
                >
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90 group-hover:-translate-y-1 transition-transform" />
                </button>
            )}

            {/* --- INSTALL GUIDE MODAL --- */}
            {showInstallGuide && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-ncc-navy/60 backdrop-blur-md">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#0a1628] w-full max-w-lg rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-2xl border border-white/20"
                    >
                        <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-ncc-gold rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-ncc-gold/20">
                                    <Download className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                                <button onClick={() => setShowInstallGuide(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all" aria-label="Close install modal">
                                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-2 sm:space-y-4">
                                <h3 className="text-2xl sm:text-3xl font-display font-black text-ncc-navy dark:text-white">Install NCC Portal</h3>
                                <p className="text-gray-500 dark:text-white/60 text-xs sm:text-sm">Follow these simple steps to add the portal to your device for a native app experience.</p>
                            </div>

                            <div className="space-y-3 sm:space-y-6">
                                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-ncc-navy/5 dark:bg-white/5 rounded-xl sm:rounded-2xl">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-ncc-navy dark:bg-ncc-gold rounded-lg flex items-center justify-center text-white text-xs sm:text-sm font-black shrink-0">1</div>
                                    <p className="text-xs sm:text-sm font-bold text-ncc-navy dark:text-white">On Desktop: Look for the <span className="text-ncc-gold">Install Icon</span> in your browser's address bar (URL bar).</p>
                                </div>
                                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-ncc-navy/5 dark:bg-white/5 rounded-xl sm:rounded-2xl">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-ncc-navy dark:bg-ncc-gold rounded-lg flex items-center justify-center text-white text-xs sm:text-sm font-black shrink-0">2</div>
                                    <p className="text-xs sm:text-sm font-bold text-ncc-navy dark:text-white">On Mobile: Tap the <span className="text-ncc-gold">Browser Menu (3 dots)</span> and select <span className="text-ncc-gold">"Install App"</span> or <span className="text-ncc-gold">"Add to Home Screen"</span>.</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowInstallGuide(false)}
                                className="w-full bg-ncc-navy text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-ncc-red transition-all"
                            >
                                Got it, thanks!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .dark {
                    transition: background-color 1s ease-in-out;
                }
                * {
                    transition: border-color 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
                }
                .underline-gold {
                    background-image: linear-gradient(120deg, #C9922A 0%, #C9922A 100%);
                    background-repeat: no-repeat;
                    background-size: 100% 0.3em;
                    background-position: 0 95%;
                }
                .fade-in-up {
                    animation: fadeInUp 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(60px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slow-zoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.05); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s infinite alternate ease-in-out;
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 6s infinite ease-in-out;
                }
                .animate-float-delayed {
                    animation: float 6s infinite ease-in-out;
                    animation-delay: 3s;
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .reveal {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 1s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .reveal.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                html { scroll-behavior: smooth; }
            ` }} />
        </div>
    );
};
