
import Chart from 'chart.js/auto';

// Estado da aplicação
const state = {
    metadata: [],
    currentYear: null,
    currentMonth: null,
    data: [],
    lineChart: null,
    productChart: null
};

// Elementos DOM
const yearSelect = document.getElementById('yearSelect');
const monthSelect = document.getElementById('monthSelect');
const kpiTotalRows = document.getElementById('kpiTotalRows');
const kpiTotalProduction = document.getElementById('kpiTotalProduction');
const dataTableBody = document.querySelector('#dataTable tbody');
const dataTableHead = document.querySelector('#dataTable thead');

// Inicialização
async function init() {
    try {
        const response = await fetch('/data/metadata.json');
        if (!response.ok) throw new Error('Falha ao carregar metadados');

        state.metadata = await response.json();

        populateYearSelect();

        // Selecionar o primeiro ano/mês disponível por padrão
        if (state.metadata.length > 0) {
            yearSelect.value = state.metadata[0].ano;
            populateMonthSelect(state.metadata[0].ano);
            monthSelect.value = state.metadata[0].mes;

            // Trigger load
            handleSelectionChange();
        }

        // Listeners
        yearSelect.addEventListener('change', () => {
            populateMonthSelect(parseInt(yearSelect.value));
            handleSelectionChange();
        });
        monthSelect.addEventListener('change', handleSelectionChange);

    } catch (error) {
        console.error('Erro de inicialização:', error);
        alert('Erro ao carregar dados iniciais. Verifique se o processamento de dados foi executado.');
    }
}

// Popula o select de Anos (valores únicos)
function populateYearSelect() {
    const years = [...new Set(state.metadata.map(item => item.ano))];
    yearSelect.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
}

// Popula o select de Meses baseado no Ano selecionado
function populateMonthSelect(selectedYear) {
    const months = state.metadata
        .filter(item => item.ano === selectedYear)
        .map(item => item.mes);

    monthSelect.innerHTML = '';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
}

// Carrega e renderiza os dados
async function handleSelectionChange() {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);

    if (!year || !month) return;

    try {
        const response = await fetch(`/data/${year}_${month}.json`);
        if (!response.ok) throw new Error(`Falha ao carregar dados de ${year}/${month}`);

        state.data = await response.json();

        updateKPIs();
        updateCharts();
        updateKPIs();
        updateCharts();
        // updateTable(); // Removido
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        state.data = [];
        updateKPIs();
        // updateTable(); // Removido
    }
}

function updateKPIs() {
    kpiTotalRows.textContent = state.data.length.toLocaleString();

    // Tentar identificar coluna de produção/peso
    // Baseado na análise anterior: 'CDU_PesoLiquido' ou 'Peso'
    const productionKey = state.data.length > 0 && 'CDU_PesoLiquido' in state.data[0] ? 'CDU_PesoLiquido' : 'Peso';

    if (productionKey && state.data.length > 0 && state.data[0][productionKey] !== undefined) {
        const total = state.data.reduce((sum, row) => sum + (Number(row[productionKey]) || 0), 0);
        kpiTotalProduction.textContent = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kg';
    } else {
        kpiTotalProduction.textContent = 'N/A';
    }
}

function updateCharts() {
    // Gráfico de Linhas de Produção
    const linesCtx = document.getElementById('lineChart');
    const lineKey = 'CDU_LinhaProducao';

    if (state.data.length > 0) {
        const lineCounts = {};
        state.data.forEach(row => {
            const line = row[lineKey] || 'Outros';
            // Somar Peso Liquido em vez de contar
            const weight = Number(row['CDU_PesoLiquido']) || 0;
            lineCounts[line] = (lineCounts[line] || 0) + weight;
        });

        const sortedEntries = Object.entries(lineCounts).sort((a, b) => {
            return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
        });

        const labels = sortedEntries.map(entry => entry[0]);
        // Arredondar valores para 2 casas decimais
        const data = sortedEntries.map(entry => Number(entry[1].toFixed(2)));

        if (state.lineChart) state.lineChart.destroy();

        state.lineChart = new Chart(linesCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Peso Líquido (Kg)',
                    data: data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#334155' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Gráfico de Produtos (Top 5)
    updateTop5Chart(document.getElementById('productChart'), 'productChart', 'CDU_Artigo', 'Top Artigos');

    // Gráfico de Clientes (Top 5)
    updateTop5Chart(document.getElementById('clientChart'), 'clientChart', 'CDU_NomeCliente', 'Top Clientes');

    // Gráfico de Unidade de Negócio
    updateTop5Chart(document.getElementById('buChart'), 'buChart', 'CDU_UnidadeNegocioDescricao', 'Unidade de Negócio');
}

// Helper genérico para Top 5 Pie/Doughnut charts
function updateTop5Chart(ctx, chartStateKey, dataKey, label) {
    if (state.data.length > 0) {
        const counts = {};
        state.data.forEach(row => {
            const key = row[dataKey] || 'Desconhecido';
            // Somar Peso Liquido se possível, senão contar
            const weight = Number(row['CDU_PesoLiquido']) || 0;
            counts[key] = (counts[key] || 0) + weight;
        });

        // Top 5
        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Outros
        // const totalOthers = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(5).reduce((acc, curr) => acc + curr[1], 0);
        // if(totalOthers > 0) sorted.push(['Outros', totalOthers]);

        if (state[chartStateKey]) state[chartStateKey].destroy();

        state[chartStateKey] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sorted.map(i => i[0]),
                datasets: [{
                    label: 'Peso (Kg)',
                    data: sorted.map(i => Number(i[1].toFixed(2))),
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#64748b',
                        '#06b6d4',
                        '#ec4899'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Importante para o wrapper CSS controlar o tamanho
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            boxWidth: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }
}

function updateTable() {
    // Limpar tabela
    dataTableHead.innerHTML = '';
    dataTableBody.innerHTML = '';

    if (state.data.length === 0) return;

    // Colunas explícitas para melhor UX
    const displayKeys = [
        'CDU_OrdemFabrico',
        'CDU_Artigo',
        'CDU_Descricao',
        'CDU_LoteFilkemp',
        'CDU_PesoLiquido',
        'CDU_LinhaProducao',
        'CDU_Estado'
    ];

    const trHead = document.createElement('tr');
    displayKeys.forEach(key => {
        const th = document.createElement('th');
        // Remover prefixo CDU_ para display
        th.textContent = key.replace('CDU_', '');
        trHead.appendChild(th);
    });
    dataTableHead.appendChild(trHead);

    // Rows (Limitar a 100 para performance de renderização na tabela)
    state.data.slice(0, 100).forEach(row => {
        const tr = document.createElement('tr');
        displayKeys.forEach(key => {
            const td = document.createElement('td');
            let val = row[key];

            // Formatar números se necessário
            if (typeof val === 'number' && key.includes('Peso')) {
                val = val.toFixed(2);
            }

            td.textContent = val !== null && val !== undefined ? val : '';
            tr.appendChild(td);
        });
        dataTableBody.appendChild(tr);
    });
}

init();
