const fs = require('fs');

// 1. Fix NCCKnowledgeView.jsx
let ncc = fs.readFileSync('src/features/References/NCCKnowledgeView.jsx', 'utf8');

// Specific fix for certificates to be black
ncc = ncc.replace(/className="rounded-2xl overflow-hidden border"\s*style=\{\{\s*borderColor:\s*c\.border\s*\}\}>/g, 
    'className="rounded-2xl overflow-hidden border dark:!bg-black dark:!border-white/10" style={{ borderColor: c.border }}>');
ncc = ncc.replace(/<div style=\{\{\s*background:\s*c\.bg\s*\}\}\s*className="p-4 space-y-3">/g, 
    '<div style={{ background: c.bg }} className="p-4 space-y-3 dark:!bg-black">');

// Blanket background changes for other boxes in NCC Knowledge to navy blue
// We replace bg-ncc-navy/5, bg-white, bg-gray-50, bg-blue-50, etc. with dark:!bg-[#0a1628]
ncc = ncc.replace(/bg-ncc-navy\/5/g, 'bg-ncc-navy/5 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-ncc-gold\/10/g, 'bg-ncc-gold/10 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-green-50/g, 'bg-green-50 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-blue-50/g, 'bg-blue-50 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-red-50/g, 'bg-red-50 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-teal-50/g, 'bg-teal-50 dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-white/g, 'bg-white dark:!bg-[#0a1628]');
ncc = ncc.replace(/bg-gray-50/g, 'bg-gray-50 dark:!bg-[#0a1628]');

fs.writeFileSync('src/features/References/NCCKnowledgeView.jsx', ncc);

// 2. Fix AnnouncementsView.jsx (Unit Broadcast) date styling
let ann = fs.readFileSync('src/features/Engagement/AnnouncementsView.jsx', 'utf8');
ann = ann.replace(/className="flex items-center gap-1\.5 text-\[10px\] font-bold text-gray-400 dark:text-white\/80"/g, 
    'className="flex items-center gap-1.5 text-[10px] font-bold bg-ncc-navy text-white px-2 py-0.5 rounded-full"');
fs.writeFileSync('src/features/Engagement/AnnouncementsView.jsx', ann);

console.log('Applied specific dark mode styles to NCC Knowledge and Announcements.');
