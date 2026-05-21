const fs = require('fs');

const processFile = (path) => {
    let content = fs.readFileSync(path, 'utf8');

    const replacements = [
        // Replace f5f0e8 (folder tan) with dark navy
        { regex: /bg-\[#f5f0e8\]/g, replacement: 'bg-[#0A1628]' },
        // Replace text-ncc-navy on dark background to text-white
        { regex: /text-ncc-navy/g, replacement: 'text-white' },
        // Replace border-[#ddd8cc] with white/10
        { regex: /border-\[#ddd8cc\]/g, replacement: 'border-white/10' },
        // Replace divide-[#ddd8cc] with divide-white/10
        { regex: /divide-\[#ddd8cc\]/g, replacement: 'divide-white/10' },
        // Replace bg-gray-50 with dark bg
        { regex: /bg-gray-50/g, replacement: 'bg-[#0A1628]' },
        // Replace text-gray-500 with text-gray-300 or white/60
        { regex: /text-gray-500/g, replacement: 'text-white/60' },
        // Replace text-gray-400 with text-white/50
        { regex: /text-gray-400/g, replacement: 'text-white/50' },
        // Replace bg-white with dark bg
        { regex: /bg-white/g, replacement: 'bg-[#0A1628]' },
        // Replace bg-gray-200 with bg-white/10
        { regex: /bg-gray-200/g, replacement: 'bg-white/10' },
        // Replace text-gray-600 with text-white/70
        { regex: /text-gray-600/g, replacement: 'text-white/70' },
        // Replace bg-gray-100 with bg-white/5
        { regex: /bg-gray-100/g, replacement: 'bg-white/5' },
        // Replace text-gray-700 with text-white/80
        { regex: /text-gray-700/g, replacement: 'text-white/80' },
        // Remove 'hover:bg-[#f5f0e8]'
        { regex: /hover:bg-\[#f5f0e8\]/g, replacement: 'hover:bg-white/5' },
        // Adjust any remaining ncc-navy classes to white since they might be hidden on navy background
        { regex: /bg-ncc-navy\b/g, replacement: 'bg-[#0A1628]' },
    ];

    replacements.forEach(({ regex, replacement }) => {
        content = content.replace(regex, replacement);
    });

    fs.writeFileSync(path, content, 'utf8');
    console.log(`Successfully updated ${path}`);
};

processFile('./src/features/Profile/CadetProfileView.jsx');
