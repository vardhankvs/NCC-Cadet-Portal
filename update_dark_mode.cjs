const fs = require('fs');
const path = './src/components/LandingPage.jsx';

let content = fs.readFileSync(path, 'utf8');

// Define replacements
const replacements = [
    { regex: /\bbg-white\b(?!\s*dark:)/g, replacement: 'bg-white dark:bg-[#050b14]' },
    { regex: /\btext-ncc-navy\b(?!\s*dark:)/g, replacement: 'text-ncc-navy dark:text-white' },
    { regex: /\bbg-gray-50\b(?!\s*dark:)/g, replacement: 'bg-gray-50 dark:bg-[#0a1628]' },
    { regex: /\bbg-gray-100\b(?!\s*dark:)/g, replacement: 'bg-gray-100 dark:bg-[#0d2137]' },
    { regex: /\btext-gray-500\b(?!\s*dark:)/g, replacement: 'text-gray-500 dark:text-gray-400' },
    { regex: /\btext-gray-600\b(?!\s*dark:)/g, replacement: 'text-gray-600 dark:text-gray-300' },
    { regex: /\bborder-gray-100\b(?!\s*dark:)/g, replacement: 'border-gray-100 dark:border-white/10' },
    { regex: /\bborder-gray-200\b(?!\s*dark:)/g, replacement: 'border-gray-200 dark:border-white/10' },
    { regex: /\bgray-50\b(?!\s*dark:)/g, replacement: 'gray-50 dark:border-white/5' }, // e.g. divide-gray-50
];

replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated LandingPage.jsx with dark mode classes.');
