const fs = require('fs');
const content = fs.readFileSync('c:/Users/Clauseph/Desktop/Flash Pay React/src/i18n/translations.ts', 'utf8');

const languages = ['fr', 'en', 'ru'];

languages.forEach(lang => {
    console.log(`Checking ${lang}...`);
    const startIdx = content.indexOf(`  ${lang}: {`);
    if (startIdx === -1) {
        console.log(`Could not find ${lang} section`);
        return;
    }
    
    // Find the matching closing brace by counting braces
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') depth--;
        if (depth === 0) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx === -1) {
        console.log(`Could not find end of ${lang} section`);
        return;
    }

    const section = content.substring(startIdx, endIdx + 1);
    const lines = section.split('\n');
    const keys = new Map();
    lines.forEach((line, i) => {
        const match = line.match(/"([^"]+)":/);
        if (match) {
            const key = match[1];
            if (keys.has(key)) {
                console.log(`DUPLICATE KEY in ${lang}: "${key}" (line ${i})`);
            }
            keys.set(key, i);
        }
    });
});
console.log("Check complete.");
