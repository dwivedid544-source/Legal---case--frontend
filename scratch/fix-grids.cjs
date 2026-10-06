const fs = require('fs');

const file = 'i:/legal-case-management-final/legal-case-management-frontend/src/pages/CourtFormsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace repeat(2, 1fr) and repeat(3, 1fr) with auto-fit in grids
content = content.replace(/gridTemplateColumns:\s*'repeat\(2, 1fr\)'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");
content = content.replace(/gridTemplateColumns:\s*'repeat\(3, 1fr\)'/g, "gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed grids in CourtFormsPage');
