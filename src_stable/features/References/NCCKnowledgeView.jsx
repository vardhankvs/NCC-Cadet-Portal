import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, BookOpen, Search, X } from '../../components/Icons.jsx';
import genesisImg from '../../assets/genesis_real.png';
import aimImg from '../../assets/aim_real.png';
import mottoImg from '../../assets/motto_real.png';
import flagImg from '../../assets/ceremony.png';
import pledgeImg from '../../assets/drill_practice.png';
import songImg from '../../assets/rd_parade.png';
import trainingImg from '../../assets/shooting_range.png';
import valuesImg from '../../assets/social_bg.png';
import ctaGuard from '../../assets/cta_guard.png';

// ── Data ────────────────────────────────────────────────────────────────────

const SECTIONS = [
    {
        id: 'about',
        label: 'ABOUT NCC',
        icon: '🇮🇳',
        color: '#1B3A6B',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <p>
                    The <strong>National Cadet Corps (NCC)</strong> is a Tri-Services Organisation comprising the Army, Navy and Air Force, headquartered in New Delhi. It is open to school and college students on a voluntary basis.
                </p>
                <p>
                    NCC was raised on <strong>16 April 1948</strong> under the National Cadet Corps Act of 1948. It was started with a strength of <strong>20,000 cadets</strong>.
                </p>
                <p>
                    Today, NCC has grown to a strength of over <strong>13 lakh cadets</strong> spread across the country. It is the largest uniformed youth organisation in the world.
                </p>
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">Key Facts</p>
                    <ul className="space-y-1 text-xs">
                        <li>• Established: 16 April 1948</li>
                        <li>• Headquarters: New Delhi</li>
                        <li>• Three wings: Army, Navy, Air Force</li>
                        <li>• Over 13 lakh cadets nationwide</li>
                        <li>• Present in 676+ districts</li>
                        <li>• 17 State Directorates</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        id: 'dg',
        label: 'DG NCC CORNER',
        icon: '⭐',
        color: '#b8830e',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <p>
                    The <strong>Director General NCC (DG NCC)</strong> is a Lieutenant General rank officer of the Indian Army who heads the NCC Directorate.
                </p>
                <div className="bg-ncc-gold/10 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-gold/20">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">Vision</p>
                    <p className="text-xs italic">
                        "To empower the youth of the nation through military training, adventure and social service, so that they are ready to serve the nation in any capacity."
                    </p>
                </div>
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">Priorities</p>
                    <ul className="space-y-1 text-xs">
                        <li>• Quality training over quantity</li>
                        <li>• Digital transformation of NCC</li>
                        <li>• Inclusion of youth from border/coastal regions</li>
                        <li>• Focus on adventure & social service</li>
                        <li>• NCC alumni integration with national defence</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        id: 'aim',
        label: 'AIM',
        icon: '🎯',
        color: '#16a34a',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <p>The aim of the NCC is to develop character, comradeship, discipline, leadership, secular outlook, spirit of adventure, and ideals of selfless service amongst the youth of the country.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {[
                        { label: 'Character', desc: 'Building moral fibre and integrity' },
                        { label: 'Comradeship', desc: 'Unity among youth of all regions' },
                        { label: 'Discipline', desc: 'Self-discipline and orderly conduct' },
                        { label: 'Leadership', desc: 'Training future leaders of India' },
                        { label: 'Secular Outlook', desc: 'Harmony across communities' },
                        { label: 'Adventure', desc: 'Courage through challenges' },
                    ].map(item => (
                        <div key={item.label} className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-lg p-3 border border-ncc-navy/10">
                            <p className="font-bold text-ncc-navy dark:text-white text-xs">{item.label}</p>
                            <p className="text-[11px] text-gray-500 dark:text-white/70 mt-0.5">{item.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-green-50 dark:!bg-[#0a1628] rounded-xl p-4 border border-green-100 mt-2">
                    <p className="font-bold text-green-800 text-xs uppercase tracking-widest mb-1">To Create a pool of</p>
                    <p className="text-xs text-green-700">Organised, trained and motivated youth with potential of leadership in all walks of life who will serve the Nation regardless of which career they choose.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'genesis',
        label: 'GENESIS',
        icon: '📜',
        color: '#7c3aed',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <div className="space-y-3">
                    {[
                        { year: '1917', event: 'University Corps established under the Indian Defence Force Act.' },
                        { year: '1920', event: 'University Training Corps (UTC) formed under the Indian Territorial Act.' },
                        { year: '1942', event: 'During WWII, UTC replaced by University Officers Training Corps (UOTC).' },
                        { year: '1946', event: 'National Cadet Corps Committee constituted under the chairmanship of Pandit H N Kunzru.' },
                        { year: '1948', event: 'NCC Act passed on 16 April 1948. NCC formally established with 20,000 cadets.' },
                        { year: '1950', event: 'Naval Wing added to NCC.' },
                        { year: '1952', event: 'Air Wing added. NCC becomes a Tri-Services organisation.' },
                        { year: '1968', event: 'NCC introduced in schools.' },
                        { year: '2001', event: 'NCC expanded to border and coastal areas.' },
                    ].map(item => (
                        <div key={item.year} className="flex gap-4 items-start">
                            <span className="flex-shrink-0 w-12 text-right text-[11px] font-black text-ncc-gold mt-0.5">{item.year}</span>
                            <div className="flex-1 flex gap-2 items-start">
                                <div className="w-2 h-2 rounded-full bg-ncc-navy mt-1.5 flex-shrink-0" />
                                <p className="text-xs text-gray-600 dark:text-white/80">{item.event}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'motto',
        label: 'MOTTO',
        icon: '🏅',
        color: '#dc2626',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                <div className="text-center py-6 bg-gradient-to-br from-ncc-navy to-ncc-navy-mid rounded-2xl text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)' }} />
                    <p className="text-3xl font-display font-black text-ncc-gold tracking-widest mb-2 relative">
                        UNITY AND DISCIPLINE
                    </p>
                    <p className="text-sm text-white/60 italic relative">— Official Motto of the NCC</p>
                </div>
                <p className="leading-relaxed">
                    The motto <strong>"Unity and Discipline"</strong> was adopted in <strong>1978</strong>. It reflects the core values that the NCC seeks to instil in every cadet — the spirit of oneness regardless of religion, region, or background, and the discipline required to serve the nation.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:!bg-[#0a1628] rounded-xl p-4 border border-blue-100 text-center">
                        <p className="font-black text-blue-800 text-sm mb-1">UNITY</p>
                        <p className="text-[11px] text-blue-600">Oneness of purpose across all communities and wings</p>
                    </div>
                    <div className="bg-red-50 dark:!bg-[#0a1628] rounded-xl p-4 border border-red-100 text-center">
                        <p className="font-black text-red-800 text-sm mb-1">DISCIPLINE</p>
                        <p className="text-[11px] text-red-600">Self-regulation, obedience and dedication to duty</p>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'core',
        label: 'CORE VALUES',
        icon: '💎',
        color: '#0891b2',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90">
                {[
                    { val: 'Integrity', desc: 'Absolute honesty in thought and action.', icon: '🛡️' },
                    { val: 'Dedication', desc: 'Commitment to the mission and the nation.', icon: '🔥' },
                    { val: 'Unity', desc: 'Cohesion among cadets irrespective of background.', icon: '🤝' },
                    { val: 'Discipline', desc: 'Adherence to rules, orders and code of conduct.', icon: '⚖️' },
                    { val: 'Selfless Service', desc: 'Placing the nation above self.', icon: '🌿' },
                    { val: 'Leadership', desc: 'Leading by example at all times.', icon: '⭐' },
                    { val: 'Patriotism', desc: 'Love for the motherland and its people.', icon: '🇮🇳' },
                    { val: 'Camaraderie', desc: 'Bond of brotherhood across all three wings.', icon: '🪖' },
                ].map(item => (
                    <div key={item.val} className="flex items-center gap-3 p-3 bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl border border-ncc-navy/10 hover:bg-ncc-navy/10 transition-colors">
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <div>
                            <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-wider">{item.val}</p>
                            <p className="text-[11px] text-gray-500 dark:text-white/70 mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'pledge',
        label: 'PLEDGE',
        icon: '✋',
        color: '#9a3412',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                <div className="bg-gradient-to-br from-ncc-navy to-[#1B3A6B] rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white dark:!bg-[#0a1628] dark:bg-[#050b14]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ncc-gold mb-4">The NCC Pledge</p>
                    <p className="text-sm leading-loose italic relative">
                        "We, the Cadets of the National Cadet Corps, do solemnly pledge that we shall always uphold the unity of India. We resolve to be disciplined and responsible citizens of our Nation. We shall undertake positive community service in the spirit of selflessness and concern for our fellow beings."
                    </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-white/70 italic text-center">
                    The NCC Pledge is taken by all cadets at their enrolment and at all formal parades.
                </p>
            </div>
        ),
    },
    {
        id: 'flag',
        label: 'NCC FLAG',
        icon: '🚩',
        color: '#1d4ed8',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-3">Description</p>
                    <ul className="space-y-2 text-xs">
                        <li className="flex gap-2"><span className="text-ncc-gold font-bold">•</span> The NCC flag has three colours — <strong>Red, Deep Blue and Light Blue</strong> — representing the Army, Navy, and Air Force wings respectively.</li>
                        <li className="flex gap-2"><span className="text-ncc-gold font-bold">•</span> The <strong>NCC Crest</strong> is placed at the centre of the flag with the motto "Unity and Discipline" written below it.</li>
                        <li className="flex gap-2"><span className="text-ncc-gold font-bold">•</span> The crest consists of a lotus with 17 petals representing 17 State Directorates, surrounded by a wreath and surmounted by the National Emblem.</li>
                    </ul>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { color: '#dc2626', name: 'RED', wing: 'Army Wing' },
                        { color: '#1d4ed8', name: 'DEEP BLUE', wing: 'Naval Wing' },
                        { color: '#38bdf8', name: 'LIGHT BLUE', wing: 'Air Force Wing' },
                    ].map(item => (
                        <div key={item.name} className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 text-center">
                            <div className="h-10" style={{ background: item.color }} />
                            <div className="p-2">
                                <p className="font-black text-[10px] text-gray-700 dark:text-white/90">{item.name}</p>
                                <p className="text-[9px] text-gray-400 dark:text-white/80 mt-0.5">{item.wing}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'song',
        label: 'NCC SONG',
        icon: '🎵',
        color: '#7e22ce',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                <div className="bg-gradient-to-br from-purple-900 to-ncc-navy rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-2 right-4 text-4xl opacity-20">♪</div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 mb-3">Official NCC Song — "Hum Sab Bharatiya Hain"</p>
                    <div className="space-y-2 text-sm leading-loose">
                        <p className="italic">हम सब भारतीय हैं, हम सब भारतीय हैं।</p>
                        <p className="italic">अपनी मंजिल एक है, हा हा हा एक है,</p>
                        <p className="italic">हम सब भारतीय हैं।</p>
                    </div>
                </div>
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">About the Song</p>
                    <p className="text-xs text-gray-600 dark:text-white/80">The NCC Song <em>"Hum Sab Bharatiya Hain"</em> captures the essence of unity that the NCC stands for. It emphasises that regardless of religion, caste, or region, all cadets are first and foremost Indians, united in their goal to serve the nation.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'rti',
        label: 'RTI',
        icon: '📋',
        color: '#0f766e',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90 leading-relaxed">
                <p>
                    The <strong>Right to Information Act, 2005 (RTI)</strong> applies to NCC as it is a government body. Citizens have the right to seek information about NCC activities, expenditure and policies.
                </p>
                <div className="bg-teal-50 dark:!bg-[#0a1628] rounded-xl p-4 border border-teal-100">
                    <p className="font-bold text-teal-800 text-xs uppercase tracking-widest mb-2">Central Public Information Officer (CPIO)</p>
                    <ul className="space-y-1 text-xs text-teal-700">
                        <li>• Applications are directed to the CPIO at NCC Directorate level</li>
                        <li>• Response must be given within <strong>30 days</strong></li>
                        <li>• Fee: ₹10 per application (BPL cardholders exempt)</li>
                        <li>• First Appellate Authority exists at State Directorate level</li>
                        <li>• Second appeal goes to the Central Information Commission (CIC)</li>
                    </ul>
                </div>
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">What Can Be Sought</p>
                    <ul className="space-y-1 text-xs">
                        <li>• Documents, records, memos, e-mails</li>
                        <li>• Reports, data, samples, models</li>
                        <li>• Logbooks, contracts, agreements</li>
                        <li>• Any held information in any form</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        id: 'training',
        label: 'TRAINING MATERIAL',
        icon: '📚',
        color: '#b45309',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90">
                <p className="text-xs text-gray-500 dark:text-white/70">Core syllabus topics for NCC B and C Certificate examinations.</p>
                <div className="space-y-2">
                    {[
                        { cat: 'Drill', topics: ['Attention, Stand at Ease, Stand Easy', 'Turning Movements', 'Saluting — On the march and at the halt', 'Slow and Quick March', 'Fall In / Fall Out / Dismiss'] },
                        { cat: 'Weapon Training', topics: ['Parts of Rifle (5.56mm INSAS / SLR)', 'Stripping and Assembling', 'Immediate Action', 'Firing Positions', 'Safety Precautions'] },
                        { cat: 'Map Reading', topics: ['Types of Maps', 'Representative Fraction (RF)', 'Conventional Signs', 'Magnetic Bearing and Declination', 'Setting a Map'] },
                        { cat: 'First Aid', topics: ['Principles of First Aid', 'Bandaging Techniques', 'Fractures and Dislocations', 'Burns and Scalds', 'Recovery Position'] },
                        { cat: 'Personality Development & Leadership', topics: ['Qualities of a Good Leader', 'Communication Skills', 'Decision Making', 'Motivation Theories', 'Group Discussion'] },
                        { cat: 'NCC Knowledge', topics: ['NCC History and Organisation', 'NCC Act, Aims, Motto, Pledge', 'Flag and Badges', 'Rank Structure', 'NCC Song and Slogan'] },
                    ].map(item => (
                        <div key={item.cat} className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl border border-ncc-navy/10 overflow-hidden">
                            <div className="bg-ncc-navy px-4 py-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">{item.cat}</p>
                            </div>
                            <ul className="p-3 space-y-1">
                                {item.topics.map(t => (
                                    <li key={t} className="flex gap-2 text-xs text-gray-600 dark:text-white/80">
                                        <span className="text-ncc-gold font-bold flex-shrink-0">›</span> {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'ranks',
        label: 'RANKS & STRUCTURE',
        icon: '🪖',
        color: '#1B3A6B',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                {[
                    {
                        wing: 'Army Wing',
                        color: '#dc2626',
                        bg: '#fef2f2',
                        border: '#fecaca',
                        ranks: [
                            { rank: 'Cadet (CDT)', note: 'Entry level' },
                            { rank: 'Lance Corporal (LCPL)', note: '1 chevron' },
                            { rank: 'Corporal (CPL)', note: '2 chevrons' },
                            { rank: 'Sergeant (SGT)', note: '3 chevrons' },
                            { rank: 'Company Sergeant Major (CSM)', note: 'Senior NCO' },
                            { rank: 'Company Quarter Master Sergeant (CQMS)', note: 'Admin NCO' },
                            { rank: 'Junior Under Officer (JUO)', note: 'Officer cadet' },
                            { rank: 'Senior Under Officer (SUO)', note: 'Senior officer cadet' },
                            { rank: 'Under Officer (UO)', note: 'Highest cadet rank' },
                        ]
                    },
                    {
                        wing: 'Naval Wing',
                        color: '#1d4ed8',
                        bg: '#eff6ff',
                        border: '#bfdbfe',
                        ranks: [
                            { rank: 'Cadet (CDT)', note: 'Entry level' },
                            { rank: 'Able Cadet (AC)', note: '1 badge' },
                            { rank: 'Leading Cadet (LC)', note: '2 badges' },
                            { rank: 'Petty Officer Cadet (POC)', note: 'Senior cadet' },
                            { rank: 'Chief Petty Officer Cadet (CPOC)', note: 'Senior NCO' },
                            { rank: 'Junior Under Officer (JUO)', note: 'Officer cadet' },
                            { rank: 'Senior Under Officer (SUO)', note: 'Highest cadet rank' },
                        ]
                    },
                    {
                        wing: 'Air Force Wing',
                        color: '#0284c7',
                        bg: '#f0f9ff',
                        border: '#bae6fd',
                        ranks: [
                            { rank: 'Cadet (CDT)', note: 'Entry level' },
                            { rank: 'Corporal (CPL)', note: '2 chevrons' },
                            { rank: 'Sergeant (SGT)', note: '3 chevrons' },
                            { rank: 'Flight Sergeant (FS)', note: 'Senior NCO' },
                            { rank: 'Warrant Officer Cadet (WOC)', note: 'Senior cadet' },
                            { rank: 'Junior Under Officer (JUO)', note: 'Officer cadet' },
                            { rank: 'Senior Under Officer (SUO)', note: 'Highest cadet rank' },
                        ]
                    },
                ].map(w => (
                    <div key={w.wing} className="rounded-xl overflow-hidden border" style={{ borderColor: w.border }}>
                        <div className="px-4 py-2.5" style={{ background: w.color }}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">{w.wing}</p>
                        </div>
                        <div className="bg-ncc-navy divide-y divide-white/10">
                            {w.ranks.map((r, i) => (
                                <div key={r.rank} className="flex items-center justify-between px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ background: w.color }}>{i + 1}</span>
                                        <span className="text-xs font-bold text-white">{r.rank}</span>
                                    </div>
                                    <span className="text-[10px] text-white/60 italic">{r.note}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'certificates',
        label: 'NCC CERTIFICATES',
        icon: '🎖️',
        color: '#b8830e',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed">NCC offers three levels of certificates. Higher certificate holders receive additional benefits in government recruitment and defence services.</p>
                <div className="space-y-3">
                    {[
                        {
                            cert: 'A Certificate',
                            level: 'Junior Division / Wing',
                            color: '#16a34a',
                            bg: '#f0fdf4',
                            border: '#bbf7d0',
                            criteria: [
                                'Minimum 75% attendance in training',
                                'Minimum 2 years in NCC',
                                'Pass the A Certificate examination',
                                'Age: 12–17 years (school cadets)',
                            ],
                            benefits: ['10 bonus marks in state govt recruitment', 'Priority in NCC-quota college admissions'],
                        },
                        {
                            cert: 'B Certificate',
                            level: 'Senior Division / Wing',
                            color: '#1d4ed8',
                            bg: '#eff6ff',
                            border: '#bfdbfe',
                            criteria: [
                                'Minimum 75% attendance in training',
                                'Minimum 2 years in NCC (Senior wing)',
                                'Pass the B Certificate examination',
                                'Age: 17–26 years (college cadets)',
                            ],
                            benefits: ['Extra marks in UPSC / state PSC exams', 'Bonus in CDS examination', 'Preference in police & paramilitary recruitment'],
                        },
                        {
                            cert: 'C Certificate',
                            level: 'Senior Division / Wing (Advanced)',
                            color: '#b8830e',
                            bg: '#fffbeb',
                            border: '#fde68a',
                            criteria: [
                                'Hold a B Certificate',
                                'Minimum 75% attendance in 3rd year',
                                'Pass the C Certificate examination',
                                'Must have attended a minimum of 1 camp',
                            ],
                            benefits: [
                                'Best bonus benefits across all certificates',
                                'Direct entry to Army / Navy / AF as commissioned officer (in some schemes)',
                                'Relaxation in physical standards for defence entry',
                                'Additional weightage in UPSC / CDS / SSB',
                            ],
                        },
                    ].map(c => (
                        <div key={c.cert} className="rounded-2xl overflow-hidden border dark:!bg-black dark:!border-white/10" style={{ borderColor: c.border }}>
                            <div className="px-5 py-3 flex items-center justify-between" style={{ background: c.color }}>
                                <div>
                                    <p className="font-black text-white text-sm tracking-wide">{c.cert}</p>
                                    <p className="text-[10px] text-white/70 mt-0.5">{c.level}</p>
                                </div>
                                <span className="text-2xl">🎖️</span>
                            </div>
                            <div style={{ background: c.bg }} className="p-4 space-y-3 dark:!bg-black">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: c.color }}>Eligibility Criteria</p>
                                    <ul className="space-y-1">
                                        {c.criteria.map(cr => (
                                            <li key={cr} className="flex gap-2 text-xs text-gray-600 dark:text-white/80">
                                                <span className="font-bold flex-shrink-0" style={{ color: c.color }}>✓</span> {cr}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: c.color }}>Benefits</p>
                                    <ul className="space-y-1">
                                        {c.benefits.map(b => (
                                            <li key={b} className="flex gap-2 text-xs text-gray-600 dark:text-white/80">
                                                <span className="font-bold flex-shrink-0" style={{ color: c.color }}>›</span> {b}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'camps',
        label: 'NCC CAMPS',
        icon: '⛺',
        color: '#15803d',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90">
                <p className="text-xs text-gray-500 dark:text-white/70">Camps are a mandatory component of NCC training. They build teamwork, physical fitness and leadership.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                        { name: 'Annual Training Camp (ATC)', abbr: 'ATC', desc: 'Basic camp mandatory for certificate. Held at Battalion level, 10 days.', icon: '🏕️', color: '#16a34a' },
                        { name: 'Basic Leadership Camp (BLC)', abbr: 'BLC', desc: 'Leadership skills development. Selected Senior Division cadets only.', icon: '⭐', color: '#1d4ed8' },
                        { name: 'National Integration Camp (NIC)', abbr: 'NIC', desc: 'Inter-state cultural exchange programme. Promotes national unity.', icon: '🇮🇳', color: '#dc2626' },
                        { name: 'Republic Day Camp (RDC)', abbr: 'RDC', desc: 'Prestigious national level camp. Held in New Delhi every January.', icon: '🏆', color: '#b8830e' },
                        { name: 'Army Attachment Camp', abbr: 'AAC', desc: 'Cadets attached to regular Army units for live training exposure.', icon: '🪖', color: '#374151' },
                        { name: 'Thal Sainik Camp (TSC)', abbr: 'TSC', desc: 'Competitive national camp for Army wing cadets. Tests military skills.', icon: '🎯', color: '#7c3aed' },
                        { name: 'Vayu Sainik Camp (VSC)', abbr: 'VSC', desc: 'Competitive national camp for Air Force wing cadets.', icon: '✈️', color: '#0284c7' },
                        { name: 'Nau Sainik Camp (NSC)', abbr: 'NSC', desc: 'Competitive national camp for Naval wing cadets. Includes water activities.', icon: '⚓', color: '#1d4ed8' },
                        { name: 'Adventure Courses', abbr: 'ADV', desc: 'Rock climbing, trekking, paragliding, kayaking. Builds mental toughness.', icon: '🧗', color: '#9a3412' },
                    ].map(c => (
                        <div key={c.abbr} className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-2 mb-1.5">
                                <span className="text-lg leading-none">{c.icon}</span>
                                <div>
                                    <p className="font-black text-[10px] uppercase tracking-wider" style={{ color: c.color }}>{c.abbr}</p>
                                    <p className="font-bold text-xs text-gray-800 dark:text-white leading-tight">{c.name}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-white/70 leading-relaxed">{c.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'days',
        label: 'IMPORTANT DAYS',
        icon: '📅',
        color: '#dc2626',
        content: (
            <div className="space-y-2 text-sm text-gray-700 dark:text-white/90">
                {[
                    { date: '26 Jan', event: 'Republic Day', note: 'RDC Parade at Rajpath, New Delhi' },
                    { date: '16 Apr', event: 'NCC Raising Day', note: 'NCC established on 16 April 1948' },
                    { date: '15 Aug', event: 'Independence Day', note: 'Parade at Red Fort, New Delhi' },
                    { date: '27 Oct', event: 'Infantry Day', note: 'Commemorates 1st para troops landing in J&K (1947)' },
                    { date: '4 Dec', event: 'Navy Day', note: 'Commemorates Operation Trident (1971)' },
                    { date: '2nd Sat of Nov', event: 'NCC Day', note: 'Annual NCC Day Parade and activities' },
                    { date: '8 Dec', event: 'Air Force Day Parade', note: 'IAF celebrates annually on 8 Oct' },
                    { date: '15 Jan', event: 'Army Day', note: 'Gen. Cariappa took command (1949)' },
                    { date: '1 Dec', event: 'BSF Raising Day', note: 'Border Security Force established (1965)' },
                    { date: '5 Sep', event: "Teacher's Day", note: 'Observed in NCC institutions' },
                    { date: '21 Jun', event: 'International Yoga Day', note: 'NCC cadets lead mass yoga events' },
                    { date: '2 Oct', event: 'Gandhi Jayanti / NSS Day', note: 'Social service and cleanliness drives' },
                ].map(d => (
                    <div key={d.date} className="flex gap-3 p-3 rounded-xl bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] border border-gray-100 dark:border-white/5 hover:border-red-100 hover:bg-red-50 dark:!bg-[#0a1628]/30 transition-colors group">
                        <div className="w-14 flex-shrink-0 bg-ncc-navy rounded-lg flex flex-col items-center justify-center py-2">
                            <p className="text-[9px] font-black text-ncc-gold/70 uppercase tracking-widest leading-none">DATE</p>
                            <p className="text-[11px] font-black text-white text-center leading-tight mt-0.5">{d.date}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-ncc-navy dark:text-white group-hover:text-red-700 transition-colors">{d.event}</p>
                            <p className="text-[11px] text-gray-400 dark:text-white/80 mt-0.5 leading-tight">{d.note}</p>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: 'org',
        label: 'NCC ORGANISATION',
        icon: '🏛️',
        color: '#374151',
        content: (
            <div className="space-y-4 text-sm text-gray-700 dark:text-white/90">
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-3">Chain of Command</p>
                    <div className="space-y-1">
                        {[
                            { level: 'Ministry of Defence', icon: '🏛️', note: 'Apex body' },
                            { level: 'Directorate General NCC (DGNCC)', icon: '⭐', note: 'Lt Gen rank, New Delhi' },
                            { level: 'State Directorate (17 States)', icon: '🗺️', note: 'Maj Gen rank' },
                            { level: 'Group Headquarters (GHQ)', icon: '🏢', note: 'Brig / Col rank' },
                            { level: 'NCC Battalion / Ship / Squadron', icon: '🪖', note: 'Col / Cdr / Gp Capt rank' },
                            { level: 'School / College NCC Unit', icon: '🎓', note: 'ANO — Lt / Capt / Flt Lt' },
                        ].map((item, i) => (
                            <div key={item.level} className="flex gap-3 items-center">
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-ncc-navy flex items-center justify-center text-ncc-gold font-black text-xs">{i + 1}</div>
                                    {i < 5 && <div className="w-0.5 h-3 bg-ncc-navy/30" />}
                                </div>
                                <div className="flex-1 py-1">
                                    <p className="font-bold text-xs text-ncc-navy dark:text-white">{item.level}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/80">{item.note}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Army Wing', short: 'SD/JD', desc: 'Senior/Junior Division', color: '#dc2626' },
                        { label: 'Naval Wing', short: 'SW', desc: 'Senior Wing', color: '#1d4ed8' },
                        { label: 'Air Force Wing', short: 'AW', desc: 'Air Wing', color: '#0284c7' },
                    ].map(w => (
                        <div key={w.label} className="rounded-xl p-3 text-center border border-gray-200 dark:border-white/10 bg-white dark:!bg-[#0a1628] dark:bg-[#050b14]">
                            <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-black" style={{ background: w.color }}>{w.short}</div>
                            <p className="font-bold text-xs text-gray-800 dark:text-white">{w.label}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/80 mt-0.5">{w.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-ncc-navy/5 dark:!bg-[#0a1628] rounded-xl p-4 border border-ncc-navy/10">
                    <p className="font-bold text-ncc-navy dark:text-white text-xs uppercase tracking-widest mb-2">Associate NCC Officer (ANO)</p>
                    <ul className="space-y-1 text-xs text-gray-600 dark:text-white/80">
                        <li>• Civilian teacher/lecturer commissioned as NCC officer</li>
                        <li>• Ranks: Second Lieutenant to Major (Army); Sub-Lt to Cdr (Navy)</li>
                        <li>• Responsible for day-to-day cadet training at unit level</li>
                        <li>• Appointed by Ministry of Defence via State Directorate</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        id: 'alumni',
        label: 'NOTABLE ALUMNI',
        icon: '🌟',
        color: '#7c3aed',
        content: (
            <div className="space-y-3 text-sm text-gray-700 dark:text-white/90">
                <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed">Many distinguished Indians have been NCC cadets. Their service is a testament to the NCC's legacy of leadership.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { name: 'Dr. A.P.J. Abdul Kalam', role: '11th President of India', note: 'NCC Cadet — Air Wing', emoji: '🚀' },
                        { name: 'Field Marshal S.H.F.J. Manekshaw', role: 'First Field Marshal of India', note: 'Distinguished NCC patron', emoji: '⭐' },
                        { name: 'Kapil Dev', role: 'Former Indian Cricket Captain', note: 'NCC Cadet — Haryana', emoji: '🏏' },
                        { name: 'Priyanka Chopra Jonas', role: 'Actress & UNICEF Goodwill Ambassador', note: 'NCC Cadet — Senior Wing', emoji: '🎬' },
                        { name: 'Air Marshal Arjan Singh', role: 'Marshal of the Indian Air Force', note: 'NCC patron and veteran', emoji: '✈️' },
                        { name: 'Major D.P. Dhar', role: 'Veteran Army Officer', note: 'Decorated NCC alumni', emoji: '🪖' },
                        { name: 'Sunita Williams', role: 'NASA Astronaut (Indian origin)', note: 'Associated with NCC programmes', emoji: '🛸' },
                        { name: 'Vikram Batra (Capt.)', role: 'Param Vir Chakra Awardee', note: 'NCC instilled military values', emoji: '🎖️' },
                    ].map(a => (
                        <div key={a.name} className="p-3 rounded-xl bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] border border-purple-100 hover:border-purple-200 hover:shadow-sm transition-all">
                            <div className="flex items-start gap-2">
                                <span className="text-xl leading-none flex-shrink-0">{a.emoji}</span>
                                <div>
                                    <p className="font-bold text-xs text-ncc-navy dark:text-white leading-tight">{a.name}</p>
                                    <p className="text-[10px] text-purple-600 font-semibold mt-0.5">{a.role}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/80 mt-0.5 italic">{a.note}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
];

// Custom inline SVGs for sections needing specific imagery
const RDC_RALLY_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%23001f5b'/><stop offset='100%25' stop-color='%230a3580'/></linearGradient><linearGradient id='ground' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%23c8a84b'/><stop offset='100%25' stop-color='%23a07830'/></linearGradient></defs><rect width='800' height='450' fill='url(%23sky)'/><rect y='350' width='800' height='100' fill='url(%23ground)'/><rect y='340' width='800' height='14' fill='%23c8a84b' opacity='0.4'/>${Array.from({length:22},(_,i)=>`<rect x='${28+i*34}' y='${200+Math.sin(i*0.7)*8}' width='14' height='140' rx='2' fill='%23${i%3===0?"c8001a":i%3===1?"001f5b":"4a90d9"}'/><circle cx='${35+i*34}' cy='${190+Math.sin(i*0.7)*8}' r='10' fill='%23f5d78a'/>`).join('')}<text x='400' y='60' text-anchor='middle' font-family='Georgia,serif' font-size='28' font-weight='bold' fill='%23f5d78a' letter-spacing='4'>NCC REPUBLIC DAY CAMP</text><text x='400' y='95' text-anchor='middle' font-family='Georgia,serif' font-size='14' fill='%23c8a84b' letter-spacing='6'>ARMY  ✦  NAVY  ✦  AIR FORCE</text><rect x='360' y='108' width='80' height='3' fill='%23c8a84b' opacity='0.6' rx='1'/></svg>`;

const DG_PORTRAIT_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%230a1628'/><stop offset='100%25' stop-color='%231b3a6b'/></linearGradient><linearGradient id='gold' x1='0' y1='0' x2='1' y2='0'><stop offset='0%25' stop-color='%23b8830e'/><stop offset='50%25' stop-color='%23f5d78a'/><stop offset='100%25' stop-color='%23b8830e'/></linearGradient></defs><rect width='800' height='450' fill='url(%23bg)'/><circle cx='400' cy='185' r='95' fill='%231b3a6b' stroke='%23f5d78a' stroke-width='3'/><circle cx='400' cy='165' r='52' fill='%23c8a84b' opacity='0.2'/><ellipse cx='400' cy='280' rx='80' ry='35' fill='%23f5d78a' opacity='0.1'/><rect x='370' y='220' width='60' height='90' rx='4' fill='%231b3a6b' stroke='%23f5d78a' stroke-width='1.5'/><rect x='360' y='218' width='80' height='12' rx='3' fill='%23c8001a'/><circle cx='383' cy='236' r='5' fill='%23f5d78a'/><circle cx='400' cy='236' r='5' fill='%23f5d78a'/><circle cx='417' cy='236' r='5' fill='%23f5d78a'/><text x='400' y='390' text-anchor='middle' font-family='Georgia,serif' font-size='22' font-weight='bold' fill='%23f5d78a' letter-spacing='2'>Lt Gen VIRENDRA VATS</text><text x='400' y='418' text-anchor='middle' font-family='Georgia,serif' font-size='13' fill='%23c8a84b' letter-spacing='4'>DIRECTOR GENERAL, NCC</text><rect x='280' y='428' width='240' height='2' fill='url(%23gold)' rx='1'/></svg>`;

const IMAGE_MAP = {
    'about': ctaGuard,
    'dg': DG_PORTRAIT_SVG,
    'aim': aimImg,
    'genesis': genesisImg,
    'motto': mottoImg,
    'core': valuesImg,
    'pledge': pledgeImg,
    'flag': flagImg,
    'song': songImg,
    'rti': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    'training': trainingImg,
    'ranks': `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><defs><linearGradient id='ag' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%234a5e2a'/><stop offset='100%25' stop-color='%232d3a18'/></linearGradient><linearGradient id='ng' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%230a1628'/><stop offset='100%25' stop-color='%231b3a6b'/></linearGradient><linearGradient id='afg' x1='0' y1='0' x2='0' y2='1'><stop offset='0%25' stop-color='%231a5276'/><stop offset='100%25' stop-color='%2338bdf8'/></linearGradient></defs><rect width='800' height='450' fill='%23111'/><rect x='0' y='0' width='265' height='450' fill='url(%23ag)'/><rect x='267' y='0' width='265' height='450' fill='url(%23ng)'/><rect x='534' y='0' width='266' height='450' fill='url(%23afg)'/><rect x='264' y='0' width='4' height='450' fill='%23f5d78a' opacity='0.5'/><rect x='531' y='0' width='4' height='450' fill='%23f5d78a' opacity='0.5'/><text x='132' y='60' text-anchor='middle' font-family='Georgia,serif' font-size='13' font-weight='bold' fill='%23f5d78a' letter-spacing='3'>ARMY</text><circle cx='132' cy='130' r='48' fill='%23f5d78a' opacity='0.1' stroke='%23f5d78a' stroke-width='1.5'/><text x='132' y='122' text-anchor='middle' font-size='22' fill='%23f5d78a'>★</text><text x='107' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><text x='157' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><rect x='70' y='200' width='124' height='8' rx='4' fill='%23f5d78a' opacity='0.6'/><rect x='85' y='215' width='94' height='5' rx='2' fill='%23f5d78a' opacity='0.3'/><text x='132' y='260' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%23c8d8a0' letter-spacing='1'>LT COLONEL</text><text x='132' y='278' text-anchor='middle' font-family='Georgia,serif' font-size='10' fill='%23f5d78a' opacity='0.5'>to</text><text x='132' y='296' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%23c8d8a0' letter-spacing='1'>CADET</text><text x='399' y='60' text-anchor='middle' font-family='Georgia,serif' font-size='13' font-weight='bold' fill='%23f5d78a' letter-spacing='3'>NAVY</text><circle cx='399' cy='130' r='48' fill='%23f5d78a' opacity='0.1' stroke='%23f5d78a' stroke-width='1.5'/><text x='399' y='122' text-anchor='middle' font-size='22' fill='%23f5d78a'>★</text><text x='374' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><text x='424' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><rect x='337' y='200' width='124' height='8' rx='4' fill='%23f5d78a' opacity='0.6'/><rect x='352' y='215' width='94' height='5' rx='2' fill='%23f5d78a' opacity='0.3'/><text x='399' y='260' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%23a8c4e0' letter-spacing='1'>MIDSHIPMAN</text><text x='399' y='278' text-anchor='middle' font-family='Georgia,serif' font-size='10' fill='%23f5d78a' opacity='0.5'>to</text><text x='399' y='296' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%23a8c4e0' letter-spacing='1'>CADET</text><text x='667' y='60' text-anchor='middle' font-family='Georgia,serif' font-size='13' font-weight='bold' fill='%23f5d78a' letter-spacing='3'>AIR FORCE</text><circle cx='667' cy='130' r='48' fill='%23f5d78a' opacity='0.1' stroke='%23f5d78a' stroke-width='1.5'/><text x='667' y='122' text-anchor='middle' font-size='22' fill='%23f5d78a'>★</text><text x='642' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><text x='692' y='148' text-anchor='middle' font-size='18' fill='%23f5d78a'>★</text><rect x='605' y='200' width='124' height='8' rx='4' fill='%23f5d78a' opacity='0.6'/><rect x='620' y='215' width='94' height='5' rx='2' fill='%23f5d78a' opacity='0.3'/><text x='667' y='260' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%2393c5fd' letter-spacing='1'>FLIGHT CADET</text><text x='667' y='278' text-anchor='middle' font-family='Georgia,serif' font-size='10' fill='%23f5d78a' opacity='0.5'>to</text><text x='667' y='296' text-anchor='middle' font-family='Georgia,serif' font-size='11' fill='%2393c5fd' letter-spacing='1'>CADET</text><text x='400' y='400' text-anchor='middle' font-family='Georgia,serif' font-size='16' font-weight='bold' fill='%23f5d78a' letter-spacing='5'>NCC RANKS &amp; STRUCTURE</text><rect x='280' y='412' width='240' height='2' rx='1' fill='%23f5d78a' opacity='0.4'/></svg>`,
    'certificates': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    'camps': 'https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=800&q=80',
    'days': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80',
    'org': flagImg,
    'alumni': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80'
};

// ── Component ────────────────────────────────────────────────────────────────

export const NCCKnowledgeView = () => {
    const [openId, setOpenId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toggle = (id) => setOpenId(prev => (prev === id ? null : id));

    const filteredSections = SECTIONS.filter(s => 
        s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 fade-in pb-20">
            {/* Header */}
            <header className="bg-ncc-navy rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute right-0 top-0 w-48 h-48 bg-white dark:!bg-[#0a1628] dark:bg-[#050b14]/5 rounded-full -translate-y-1/4 translate-x-1/4 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative">
                    <div className="w-12 h-12 bg-ncc-gold/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-ncc-gold" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ncc-gold/80 mb-0.5">14(A) BN NCC</p>
                        <h2 className="text-xl font-display font-bold">NCC Knowledge Base</h2>
                        <p className="text-xs text-white/50 mt-0.5">Official reference guide for all cadets</p>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400 dark:text-white/80 group-focus-within:text-ncc-navy dark:text-white transition-colors" />
                </div>
                <input 
                    type="text"
                    placeholder="Search knowledge base (e.g. Ranks, Motto, Camps)..."
                    className="w-full pl-11 pr-4 py-4 bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] border-2 border-transparent rounded-2xl shadow-sm focus:border-ncc-navy/20 focus:ring-4 focus:ring-ncc-navy/5 outline-none transition-all text-sm font-bold text-ncc-navy dark:text-white placeholder-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Big Box Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {filteredSections.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                        <div className="w-16 h-16 bg-gray-50 dark:!bg-[#0a1628] dark:bg-[#0a1628] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest text-xs">No matching topics found</p>
                        <button onClick={() => setSearchQuery('')} className="mt-4 text-ncc-navy dark:text-white font-black text-[10px] uppercase tracking-widest hover:underline">Clear Search</button>
                    </div>
                ) : filteredSections.map((section) => (
                    <div
                        key={section.id}
                        className="bg-white dark:!bg-[#0a1628] dark:bg-[#050b14] rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 dark:border-white/5 flex flex-col group h-full"
                    >
                        {/* Image Header */}
                        <div className="w-full h-56 relative overflow-hidden bg-gray-100 dark:bg-[#0d2137] flex-shrink-0">
                            <img 
                                src={IMAGE_MAP[section.id] || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80'} 
                                alt={section.label} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            
                            <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:!bg-[#0a1628] dark:bg-[#050b14]/20 backdrop-blur-md border border-white/30 text-2xl shadow-xl flex-shrink-0">
                                    {section.icon}
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-2xl uppercase tracking-widest drop-shadow-md leading-tight">
                                        {section.label}
                                    </h3>
                                    <div className="w-10 h-1 mt-2 rounded-full" style={{ background: section.color }} />
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col">
                            <div className="prose max-w-none prose-sm md:prose-base">
                                {section.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
