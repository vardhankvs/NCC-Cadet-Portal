const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
};

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');

    const replacements = [
        { regex: /\bbg-white\b(?!\s*dark:)/g, replacement: 'bg-white dark:bg-[#050b14]' },
        { regex: /\bbg-gray-50\b(?!\s*dark:)/g, replacement: 'bg-gray-50 dark:bg-[#0a1628]' },
        { regex: /\bbg-gray-100\b(?!\s*dark:)/g, replacement: 'bg-gray-100 dark:bg-[#0d2137]' },
        { regex: /\btext-ncc-navy\b(?!\s*dark:)/g, replacement: 'text-ncc-navy dark:text-white' },
        { regex: /\btext-gray-900\b(?!\s*dark:)/g, replacement: 'text-gray-900 dark:text-white' },
        { regex: /\btext-gray-800\b(?!\s*dark:)/g, replacement: 'text-gray-800 dark:text-gray-100' },
        { regex: /\btext-gray-700\b(?!\s*dark:)/g, replacement: 'text-gray-700 dark:text-gray-200' },
        { regex: /\btext-gray-600\b(?!\s*dark:)/g, replacement: 'text-gray-600 dark:text-gray-300' },
        { regex: /\btext-gray-500\b(?!\s*dark:)/g, replacement: 'text-gray-500 dark:text-gray-400' },
        { regex: /\bborder-gray-200\b(?!\s*dark:)/g, replacement: 'border-gray-200 dark:border-white/10' },
        { regex: /\bborder-gray-100\b(?!\s*dark:)/g, replacement: 'border-gray-100 dark:border-white/5' },
        { regex: /\bdivide-gray-200\b(?!\s*dark:)/g, replacement: 'divide-gray-200 dark:divide-white/10' },
        { regex: /\bdivide-gray-100\b(?!\s*dark:)/g, replacement: 'divide-gray-100 dark:divide-white/5' },
        { regex: /\btext-black\b(?!\s*dark:)/g, replacement: 'text-black dark:text-white' },
    ];

    let modified = false;
    replacements.forEach(({ regex, replacement }) => {
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath.replace(__dirname, '')}`);
    }
};

const files = walk('./src/features');
files.forEach(processFile);

// Also process CadetProfileView specifically for its custom colors:
const profilePath = path.resolve('./src/features/Profile/CadetProfileView.jsx');
let pContent = fs.readFileSync(profilePath, 'utf8');
pContent = pContent.replace(/bg-\[#f5f0e8\]/g, 'bg-[#f5f0e8] dark:bg-[#0A1628]')
                   .replace(/border-\[#ddd8cc\]/g, 'border-[#ddd8cc] dark:border-white/10')
                   .replace(/divide-\[#ddd8cc\]/g, 'divide-[#ddd8cc] dark:divide-white/10')
                   .replace(/hover:bg-\[#f5f0e8\]/g, 'hover:bg-[#f5f0e8] dark:hover:bg-white/5');
fs.writeFileSync(profilePath, pContent, 'utf8');
console.log('Custom updates applied to CadetProfileView.jsx');
