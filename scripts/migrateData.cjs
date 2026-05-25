const fs = require('fs');
const path = require('path');

const csvPath = 'C:\\Users\\Brian Murray\\iCloudDrive\\iCloud~md~obsidian\\Personal\\20 Reference Notes\\Cubr\\Session_3x3.csv';
const outputPath = 'c:\\Users\\Brian Murray\\iCloudDrive\\workspace\\cubr-web\\src\\data\\vaultData.ts';

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim().length > 0).slice(1);
    
    const solves = lines.map(line => {
        // Simple CSV parser for quoted scrambles
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!parts || parts.length < 5) return null;
        
        const timeSec = parts[0].trim();
        const penalty = parts[1].trim();
        const scramble = parts[3].trim().replace(/^"|"$/g, '').replace(/'/g, "\\'");
        const date = parts[4].trim();
        
        return `{
            id: '${Math.random().toString(36).substr(2, 9)}',
            timeMs: ${parseFloat(timeSec) * 1000},
            penalty: '${penalty}',
            scramble: '${scramble}',
            date: new Date('${date}')
        }`;
    }).filter(s => s !== null);

    const output = `import { SolveRecord } from '../types_new';\n\nexport const vaultSolves: SolveRecord[] = [\n  ${solves.join(',\n  ')}\n];`;
    fs.writeFileSync(outputPath, output);
    console.log(`Successfully migrated ${solves.length} solves.`);
} catch (err) {
    console.error('Migration failed:', err);
}
