const fs = require('fs');
const path = require('path');

const filepath = 'c:\\Users\\Brian Murray\\iCloudDrive\\workspace\\cubr-web\\src\\data\\cstimer_20260419_095023.txt';
const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
const session1 = data.session1;

console.log("Total solves in session1:", session1.length);
for (let i = 0; i < 10; i++) {
    const s = session1[i];
    const timestamp = s[3];
    const date = new Date(timestamp * 1000);
    console.log(`#${i}: Time: ${s[0][1]}ms, TS: ${timestamp}, Date: ${date.toISOString()}`);
}
