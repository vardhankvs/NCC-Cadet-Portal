const fs = require('fs');

let content = fs.readFileSync('src/features/Ranks/UnitOrganogram.jsx', 'utf8');

// Replace cardStyle background with CSS variables or remove background from inline style
content = content.replace(/cardStyle:\s*\{\s*background:\s*'#ffffff',\s*border:\s*'([^']+)'\s*\}/g, "cardStyle: { border: '$1' }");

// Replace nameColor with a dynamic one, but since they are unique per rank, 
// let's just make the text white in dark mode. 
// At line 172: <p className={`font-bold ...`} style={{ color: rank.nameColor }}>
content = content.replace(/style=\{\{\s*color:\s*rank\.nameColor\s*\}\}/g, "style={{ color: rank.nameColor }} className={`!text-black dark:!text-white`}");

// At line 177: <p ... style={{ color: rank.idColor }}>
content = content.replace(/style=\{\{\s*color:\s*rank\.idColor\s*\}\}/g, "style={{ color: rank.idColor }} className={`!text-gray-500 dark:!text-white/70`}");

// Wait, if we use className with !important, it will override the inline style!
// So let's add these classes.
content = content.replace(/style=\{\{\s*color:\s*rank\.nameColor\s*\}\}/g, "style={{ color: 'var(--name-color)' }}");
// Actually, it's easier to just use `isDarkMode`. But `useTheme` is not imported.

// Let's modify the CadetCard to use `dark:bg-[#0a1628]`
content = content.replace(/className={`([^`]+)`}/g, (match, p1) => {
    if (p1.includes('relative group flex flex-col items-center')) {
        return `className={\`\n                bg-white dark:bg-[#0a1628]\n                \${sz.card} w-full\n                \${centerContent ? 'justify-center' : ''}\n                relative group flex flex-col items-center gap-2 p-3 pt-4 rounded-2xl\n                shadow-sm hover:shadow-lg hover:-translate-y-1\n                transition-all duration-300 cursor-pointer\n            \`}`;
    }
    return match;
});

// Let's just fix the CadetCard inline style directly.
content = content.replace(/<p className=\{`font-bold leading-snug break-words \$\{sz.nameCls\} transition-colors duration-200 group-hover:opacity-80`\}\s*style=\{\{\s*color:\s*rank\.nameColor\s*\}\}\s*>/g, 
    "<p className={`font-bold leading-snug break-words ${sz.nameCls} transition-colors duration-200 group-hover:opacity-80 text-[${rank.nameColor}] dark:text-white`} style={{ color: 'inherit' }}>");

content = content.replace(/<p className=\{`font-mono mt-0\.5 break-all \$\{sz\.idCls\}`\}\s*style=\{\{\s*color:\s*rank\.idColor\s*\}\}\s*>/g, 
    "<p className={`font-mono mt-0.5 break-all ${sz.idCls} text-[${rank.idColor}] dark:text-white/70`} style={{ color: 'inherit' }}>");

fs.writeFileSync('src/features/Ranks/UnitOrganogram.jsx', content);
console.log('Fixed UnitOrganogram');
