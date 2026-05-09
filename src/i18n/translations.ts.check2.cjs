const fs = require('fs');
const content = fs.readFileSync('c:/Users/Clauseph/Desktop/Flash Pay React/src/i18n/translations.ts', 'utf8');

const languages = ['fr', 'en', 'ru'];

languages.forEach(lang => {
    console.log(`Checking ${lang}...`);
    // Find the start of the object for this language
    const startIdx = content.indexOf(`  ${lang}: {`);
    if (startIdx === -1) {
        console.log(`Could not find ${lang} section`);
        return;
    }
    
    // Find the matching closing brace (simple version: find next '  }')
    // Actually, let's just find the content between '  lang: {' and the next '  }'
    const subContent = content.substring(startIdx);
    const endIdx = subContent.indexOf('\n  }');
    const section = subContent.substring(0, endIdx);
    
    const lines = section.split('\n');
    const keys = new Map();
    lines.forEach((line, i) => {
        const match = line.match(/"([^"]+)":/);
        if (match) {
            const key = match[1];
            if (keys.has(key)) {
                console.log(`DUPLICATE KEY in ${lang}: "${key}" at line ${i} of section (previous at ${keys.get(key)})`);
            }
            keys.set(key, i);
        }
    });
});
