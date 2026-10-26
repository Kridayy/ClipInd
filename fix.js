const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
// Remove backslashes right before backticks and dollar signs (since they were improperly escaped by a previous tool call)
html = html.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('public/index.html', html);
console.log('Fixed index.html');
