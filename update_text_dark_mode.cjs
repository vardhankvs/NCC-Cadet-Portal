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
        { regex: /dark:text-gray-400/g, replacement: 'dark:text-white/70' },
        { regex: /dark:text-gray-300/g, replacement: 'dark:text-white/80' },
        { regex: /dark:text-gray-200/g, replacement: 'dark:text-white/90' },
        { regex: /dark:text-gray-100/g, replacement: 'dark:text-white' },
        { regex: /dark:text-gray-500/g, replacement: 'dark:text-white/60' },
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
        console.log(`Updated Text Colors: ${filePath.replace(__dirname, '')}`);
    }
};

walk('./src/features').forEach(processFile);
