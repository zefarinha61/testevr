
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

    // KPI Desperdício
    const kpiGlobalWaste = document.getElementById('kpiGlobalWaste');
    if (state.data.length > 0) {
        let totalNet = 0;
        let totalWaste = 0;

        state.data.forEach(row => {
            totalNet += Number(row['CDU_PesoLiquido']) || 0;
            totalWaste += Number(row['CDU_DesperdicioReal']) || 0;
        });

        const totalGross = totalNet + totalWaste;
        let wastePercentage = 0;

        if (totalGross > 0) {
            wastePercentage = (totalWaste / totalGross) * 100;
        }

        kpiGlobalWaste.textContent = wastePercentage.toFixed(2) + '%';

        // Color Coding
        kpiGlobalWaste.style.color = wastePercentage > 5 ? '#ef4444' : '#10b981'; // Red if > 5%, else Green
        // Add absolute value in title for tooltip
        kpiGlobalWaste.title = `Total Desperdício: ${totalWaste.toLocaleString()} Kg`;

    } else {
        kpiGlobalWaste.textContent = '0%';
        kpiGlobalWaste.style.color = 'var(--text-primary)';
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
                maintainAspectRatio: false, // Permite ajustar altura pelo CSS
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

    // Gráfico de Unidade de Negócio (€)
    updateTop5Chart(document.getElementById('buPriceChart'), 'buPriceChart', 'CDU_UnidadeNegocioDescricao', 'Unidade de Negócio (€)');
}

// Helper genérico para Top 5 Pie/Doughnut charts
function updateTop5Chart(ctx, chartStateKey, dataKey, label) {
    if (state.data.length > 0) {
        const counts = {};
        state.data.forEach(row => {
            const key = row[dataKey] || 'Desconhecido';
            let value = 0;

            if (chartStateKey === 'buPriceChart') {
                // Cálculo de Valor: Peso * Preço
                const weight = parseFloat(row['CDU_PesoLiquido']) || 0;
                const price = parseFloat(row['CDU_PrecoVenda']) || 0;
                value = weight * price;
            } else {
                // Padrão: Soma do Peso Líquido (para outros gráficos)
                // Nota: Top 5 sempre usa Peso como base atualmente, exceto se mudarmos a lógica.
                // Mas aqui dataKey é usado para agrupar. O valor somado é sempre Peso, 
                // a menos que especifiquemos outra métrica.
                // Como a função original somava 'weight' fixo, vamos manter isso 
                // mas permitir flexibilidade se quisermos contar.
                value = parseFloat(row['CDU_PesoLiquido']) || 0;
            }

            counts[key] = (counts[key] || 0) + value;
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
                    label: label || 'Valor', // Use dynamic label or default
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

// function updateTable() { ... } // Removido

init();
