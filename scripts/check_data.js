const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const fileToCheck = '2026_2.json'; // The first entry in metadata.json

try {
    const filePath = path.join(dataDir, fileToCheck);
    if (!fs.existsSync(filePath)) {
        console.error(`File ${fileToCheck} not found.`);
        process.exit(1);
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let nonZeroCount = 0;
    let zeroCount = 0;

    console.log(`Checking ${fileToCheck} for CDU_PrecoVenda...`);

    content.forEach((row, index) => {
        const price = Number(row['CDU_PrecoVenda']);
        if (price > 0) {
            nonZeroCount++;
            if (nonZeroCount <= 5) console.log(`Row ${index}: Preco=${price}, Peso=${row['CDU_PesoLiquido']}`);
        } else {
            zeroCount++;
        }
    });

    console.log(`Total Rows: ${content.length}`);
    console.log(`Non-Zero Prices: ${nonZeroCount}`);
    console.log(`Zero Prices: ${zeroCount}`);

} catch (e) {
    console.error(e);
}
