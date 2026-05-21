const fs = require('fs');
const path = require('path');

// Helper to replace with regex
const r = (file, regex, replacement) => {
    let fp = path.resolve('src/features', file);
    if (!fs.existsSync(fp)) { console.log('File not found:', fp); return; }
    let c = fs.readFileSync(fp, 'utf8');
    c = c.replace(regex, replacement);
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Updated:', file);
};

// 1. Social Service
r('SocialService/SocialServiceView.jsx', /text-gray-400/g, 'text-gray-400 dark:text-white/60');
r('SocialService/SocialServiceView.jsx', /text-ncc-navy(?! dark:)/g, 'text-ncc-navy dark:text-white');
r('SocialService/SocialServiceView.jsx', /bg-white(?! dark:)/g, 'bg-white dark:bg-[#0a1628]');

// 2. My Camps - total cadets in black
r('Camps/CampNominationView.jsx', /text-gray-400([^>]*>)\s*Total Cadets/g, 'text-black font-black dark:text-white$1Total Cadets');
r('Camps/CampsView.jsx', /text-gray-400([^>]*>)\s*Total/gi, 'text-black font-black dark:text-white$1Total');
r('Camps/CampNominationView.jsx', /text-gray-[345]00/g, 'text-gray-500 dark:text-white/70');
r('Camps/CampsView.jsx', /text-gray-[345]00/g, 'text-gray-500 dark:text-white/70');

// 3. Mock Exams
r('Training/TrainingHub.jsx', /Mock Exam Engine/g, 'Mock Exam Engine'); 
// The user says "symbol for Mock Exam Engine should be in white and enter module should be also in white". 
// This is in TrainingHub.jsx where the cards are defined.
// Let's globally add dark:text-white to text-ncc-navy and text-gray-500 in TrainingHub
r('Training/TrainingHub.jsx', /text-ncc-navy(?! dark:)/g, 'text-ncc-navy dark:text-white');
r('Training/TrainingHub.jsx', /text-gray-500(?! dark:)/g, 'text-gray-500 dark:text-white/70');
// "view progress report...it should look like button" -> ncc-btn ncc-btn-primary
r('Training/TrainingHub.jsx', /className="text-xs font-bold text-ncc-navy dark:text-white uppercase tracking-widest"/g, 'className="ncc-btn ncc-btn-primary ncc-btn-sm"');
r('Training/TrainingHub.jsx', /className="text-xs font-bold text-ncc-navy uppercase tracking-widest"/g, 'className="ncc-btn ncc-btn-primary ncc-btn-sm"');
r('Training/TrainingHub.jsx', /Enter Module/g, '<span className="text-white">Enter Module</span>');

// 4. Notice Board (AnnouncementsView)
r('Engagement/AnnouncementsView.jsx', /text-ncc-gold/g, 'text-white'); // Maybe the symbol was gold?
r('Engagement/AnnouncementsView.jsx', /text-ncc-navy(?! dark:)/g, 'text-ncc-navy dark:text-white');

// 5. Broadcast (NotificationCenter) - date bold black
r('Engagement/NotificationCenter.jsx', /text-gray-400([^>]*>)\s*\{formatDate/g, 'text-black font-black$1{formatDate');
r('Engagement/NotificationCenter.jsx', /text-xs text-gray-400([^>]*>)\s*\{new Date/g, 'text-xs text-black font-black$1{new Date');
r('Engagement/AnnouncementsView.jsx', /text-gray-400([^>]*>)\s*\{formatDate/g, 'text-black font-black$1{formatDate');

// 6. Kit Sizes (KitManagementView) - "update sizing profiles" like a button
r('Inventory/KitManagementView.jsx', /className="text-xs font-bold text-ncc-navy dark:text-white uppercase tracking-widest hover:text-ncc-gold transition"/g, 'className="ncc-btn ncc-btn-primary"');
r('Inventory/KitManagementView.jsx', /className="text-xs font-bold text-ncc-navy uppercase tracking-widest hover:text-ncc-gold transition"/g, 'className="ncc-btn ncc-btn-primary"');
r('Inventory/KitManagementView.jsx', /Update Sizing Profiles/g, 'Update Sizing Profiles'); 
// If it's a span or div, it will just get the button classes.
r('Inventory/KitManagementView.jsx', /<span[^>]*>Update Sizing Profiles<\/span>/g, '<button className="ncc-btn ncc-btn-primary">Update Sizing Profiles</button>');
r('Inventory/KitManagementView.jsx', /<p[^>]*>Update Sizing Profiles<\/p>/g, '<button className="ncc-btn ncc-btn-primary">Update Sizing Profiles</button>');

// 7. Apply Leave (LeaveRequestView) - symbol white
r('Cadets/LeaveRequestView.jsx', /text-ncc-navy(?! dark:)/g, 'text-ncc-navy dark:text-white');
r('Cadets/LeaveRequestView.jsx', /text-ncc-gold/g, 'text-white');

// 8. My Fitness (PFTTrackerView) - "submit PFT scores" like a button
r('Training/PFTTrackerView.jsx', /Submit PFT Scores/g, 'Submit PFT Scores');
// Replace the class of the button/span containing "Submit PFT Scores"
r('Training/PFTTrackerView.jsx', /className="[^"]*"\s*>\s*<[^>]*>\s*Submit PFT Scores/g, 'className="ncc-btn ncc-btn-primary"> <span className="mr-2">🏋️</span> Submit PFT Scores');
r('Training/PFTTrackerView.jsx', /className="[^"]*"(>| >)\s*(<[^>]*>)?\s*Submit PFT Scores/g, 'className="ncc-btn ncc-btn-primary"$1$2Submit PFT Scores');

// 9. Career Bridge (CareerBridgeView) - date white
r('Alumni/CareerBridgeView.jsx', /text-gray-400([^>]*>)\s*\{formatDate/g, 'text-gray-400 dark:text-white$1{formatDate');

// 10. Calendar (TrainingCalendarView) - dates white
r('Training/TrainingCalendarView.jsx', /text-gray-900(?! dark:)/g, 'text-gray-900 dark:text-white');
r('Training/TrainingCalendarView.jsx', /text-gray-700(?! dark:)/g, 'text-gray-700 dark:text-white');

// Add a general blanket to everything in src/features: Convert text-gray-* to dark:text-white if not already
const blanket = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        let full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) blanket(full);
        else if (full.endsWith('.jsx')) {
            let c = fs.readFileSync(full, 'utf8');
            let modified = false;
            // Catch anything that still has light text colors and force them to white in dark mode
            const fixes = [
                { regex: /text-gray-400(?! dark:)/g, replacement: 'text-gray-400 dark:text-white/80' },
                { regex: /text-gray-500(?! dark:)/g, replacement: 'text-gray-500 dark:text-white/90' },
                { regex: /text-gray-600(?! dark:)/g, replacement: 'text-gray-600 dark:text-white' },
                { regex: /text-ncc-navy(?! dark:)/g, replacement: 'text-ncc-navy dark:text-white' },
                { regex: /bg-\[#f5f0e8\](?! dark:)/g, replacement: 'bg-[#f5f0e8] dark:bg-[#0a1628]' },
                { regex: /bg-gray-50(?! dark:)/g, replacement: 'bg-gray-50 dark:bg-[#0a1628]' },
                { regex: /bg-gray-100(?! dark:)/g, replacement: 'bg-gray-100 dark:bg-[#0d2137]' },
                { regex: /bg-white(?! dark:)/g, replacement: 'bg-white dark:bg-[#0a1628]' },
            ];
            fixes.forEach(f => {
                if (f.regex.test(c)) {
                    c = c.replace(f.regex, f.replacement);
                    modified = true;
                }
            });
            if (modified) fs.writeFileSync(full, c, 'utf8');
        }
    });
};
blanket('src/features');

console.log('Script execution complete.');
