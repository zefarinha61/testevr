
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Caminhos corretos baseados na estrutura de pastas
const EXCEL_PATH = path.resolve(__dirname, '../VR.xlsx');
// Os dados devem ir para public/data para serem acessíveis pelo frontend
const DATA_DIR = path.resolve(__dirname, '../public/data');

// Garantir que diretório de dados existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`Lendo ficheiro Excel: ${EXCEL_PATH}`);

try {
    if (!fs.existsSync(EXCEL_PATH)) {
        throw new Error(`Ficheiro não encontrado: ${EXCEL_PATH}`);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    console.log(`Usando folha: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];

    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    console.log(`Dados carregados: ${data.length} linhas.`);

    if (data.length === 0) {
        console.error('Nenhum dado encontrado no Excel.');
        process.exit(1);
    }

    // Identificar colunas de Ano e Mes (suporte a variações)
    const keys = Object.keys(data[0]);
    const anoKey = keys.find(k => k.trim() === 'Ano' || k.trim() === 'CDU_Ano') || 'Ano';
    const mesKey = keys.find(k => k.trim() === 'Mes' || k.trim() === 'CDU_Mes') || 'Mes';

    console.log(`Usando colunas: Ano='${anoKey}', Mes='${mesKey}'`);

    // Agrupar por Ano e Mês
    const groupedData = {};
    const metadataSet = new Set();

    let errors = 0;
    data.forEach(row => {
        const ano = row[anoKey];
        const mes = row[mesKey];

        if (!ano || !mes) {
            errors++;
            return;
        }

        const key = `${ano}_${mes}`;

        if (!groupedData[key]) {
            groupedData[key] = [];
            metadataSet.add(JSON.stringify({ ano, mes, key }));
        }
        groupedData[key].push(row);
    });

    if (errors > 0) {
        console.warn(`Aviso: ${errors} linhas ignoradas por falta de Ano/Mes.`);
    }

    // Escrever ficheiros fragmentados
    let totalFiles = 0;
    for (const [key, rows] of Object.entries(groupedData)) {
        const filePath = path.join(DATA_DIR, `${key}.json`);
        // Otimização: remover colunas vazias ou nulas se necessário, aqui mantemos raw
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
        totalFiles++;
    }

    // Processar metadata
    const metadata = Array.from(metadataSet).map(item => JSON.parse(item));

    // Ordenar metadata
    metadata.sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mes - a.mes;
    });

    fs.writeFileSync(path.join(DATA_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log(`Processamento concluído com sucesso!`);
    console.log(`- ${totalFiles} ficheiros de dados gerados em: ${DATA_DIR}`);

} catch (error) {
    console.error('Erro fatal ao processar dados:', error);
    process.exit(1);
}
