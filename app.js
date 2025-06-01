const SUPABASE_URL = 'https://eugvprcvaryunadretbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Z3ZwcmN2YXJ5dW5hZHJldGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI4OTYyNywiZXhwIjoyMDYxODY1NjI3fQ.bba2qfmbBDlJ3FvOoPxJiJqzLdqky3YSRUB-0aZ88e4';

// Configurações do Supabase - credenciais já definidas

// Estado global da aplicação
let supabaseClient = null;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
let currentSort = { field: 'data', direction: 'desc' };
let currentFilters = {
    dateStart: '',
    dateEnd: '',
    search: '',
    origin: ''
};

// Configurações
const RECORDS_PER_PAGE = 10;

// Dados de exemplo para demonstração
const mockData = {
    summary: [
        { date: '2024-01-01', clicks: 150, scans: 85 },
        { date: '2024-01-02', clicks: 200, scans: 120 },
        { date: '2024-01-03', clicks: 180, scans: 95 },
        { date: '2024-01-04', clicks: 250, scans: 140 },
        { date: '2024-01-05', clicks: 300, scans: 180 },
        { date: '2024-01-06', clicks: 220, scans: 110 },
        { date: '2024-01-07', clicks: 280, scans: 160 }
    ],
    leads: [
        { nome: 'João Silva', telefone: '(11) 99999-9999', origem: 'Instagram', data: '2024-01-01' },
        { nome: 'Maria Santos', telefone: '(11) 88888-8888', origem: 'Facebook', data: '2024-01-01' },
        { nome: 'Pedro Costa', telefone: '(11) 77777-7777', origem: 'WhatsApp', data: '2024-01-02' },
        { nome: 'Ana Oliveira', telefone: '(11) 66666-6666', origem: 'Site', data: '2024-01-02' },
        { nome: 'Carlos Ferreira', telefone: '(11) 55555-5555', origem: 'Instagram', data: '2024-01-03' },
        { nome: 'Lucia Souza', telefone: '(11) 44444-4444', origem: 'Facebook', data: '2024-01-03' },
        { nome: 'Roberto Lima', telefone: '(11) 33333-3333', origem: 'WhatsApp', data: '2024-01-04' },
        { nome: 'Fernanda Alves', telefone: '(11) 22222-2222', origem: 'Site', data: '2024-01-04' },
        { nome: 'Marcos Pereira', telefone: '(11) 11111-1111', origem: 'Instagram', data: '2024-01-05' },
        { nome: 'Patricia Rocha', telefone: '(11) 99999-0000', origem: 'Facebook', data: '2024-01-05' }
    ]
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Conectar automaticamente ao Supabase
    await connectToSupabase();
}

async function connectToSupabase() {
    showGlobalLoading(true);
    
    try {
        // Criar cliente Supabase
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        console.log('Testando conexão com Supabase...');
        
        // Testar conexão fazendo uma consulta simples na tabela de summary
        const { error: summaryError } = await supabaseClient
            .from('afrobasico_leadgen_bitly_summary')
            .select('count', { count: 'exact', head: true });
        
        if (summaryError) {
            console.warn('Erro ao acessar tabela summary:', summaryError.message);
            throw new Error(`Erro ao acessar tabela 'afrobasico_leadgen_bitly_summary': ${summaryError.message}`);
        }
        
        // Testar também a tabela de leads
        const { error: leadsError } = await supabaseClient
            .from('ab_leads_wp')
            .select('count', { count: 'exact', head: true });
        
        if (leadsError) {
            console.warn('Erro ao acessar tabela leads:', leadsError.message);
            throw new Error(`Erro ao acessar tabela 'ab_leads_wp': ${leadsError.message}`);
        }
        
        console.log('Conexão com Supabase estabelecida com sucesso!');
        // Conexão bem-sucedida, carregar dados
        loadDashboardData();
        
    } catch (error) {
        console.error('Erro ao conectar:', error);
        console.log('Usando dados de demonstração...');
        
        // Usar dados de exemplo se não conseguir conectar
        supabaseClient = null;
        loadDashboardDataMock();
    }
}

function setupEventListeners() {
    // Filtros
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    
    // Paginação
    document.getElementById('prev-page').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => changePage(currentPage + 1));
    
    // Ordenação da tabela
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });
    
    // Busca em tempo real (com debounce)
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = this.value;
            currentPage = 1;
            if (supabaseClient) {
                loadLeadsData();
            } else {
                loadLeadsDataMock();
            }
        }, 500);
    });
}

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('current-datetime').textContent = 
        now.toLocaleDateString('pt-BR', options);
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadMetrics(),
            loadChartData(),
            loadOriginChart(),
            loadOriginOptions(),
            loadLeadsData()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        console.log('Carregando dados de demonstração...');
        loadDashboardDataMock();
    } finally {
        showGlobalLoading(false);
    }
}

function loadDashboardDataMock() {
    console.log('Carregando dados de demonstração...');
    try {
        loadMetricsMock();
        loadChartDataMock();
        loadOriginChartMock();
        loadOriginOptionsMock();
        loadLeadsDataMock();
    } finally {
        showGlobalLoading(false);
    }
}

async function loadMetrics() {
    try {
        // Total de clicks e scans
        const { data: summaryData, error: summaryError } = await supabaseClient
            .from('afrobasico_leadgen_bitly_summary')
            .select('clicks, scans');
        
        if (summaryError) throw summaryError;
        
        const totalClicks = summaryData.reduce((sum, row) => sum + (row.clicks || 0), 0);
        const totalScans = summaryData.reduce((sum, row) => sum + (row.scans || 0), 0);
        
        // Total de leads
        const { count: totalLeads, error: leadsError } = await supabaseClient
            .from('ab_leads_wp')
            .select('*', { count: 'exact', head: true });
        
        if (leadsError) throw leadsError;
        
        // Atualizar métricas na tela
        document.getElementById('total-clicks').textContent = totalClicks.toLocaleString('pt-BR');
        document.getElementById('total-scans').textContent = totalScans.toLocaleString('pt-BR');
        document.getElementById('total-leads').textContent = (totalLeads || 0).toLocaleString('pt-BR');
        
    } catch (error) {
        console.error('Erro ao carregar métricas:', error);
        loadMetricsMock();
    }
}

function loadMetricsMock() {
    const totalClicks = mockData.summary.reduce((sum, row) => sum + row.clicks, 0);
    const totalScans = mockData.summary.reduce((sum, row) => sum + row.scans, 0);
    const totalLeads = mockData.leads.length;
    
    document.getElementById('total-clicks').textContent = totalClicks.toLocaleString('pt-BR');
    document.getElementById('total-scans').textContent = totalScans.toLocaleString('pt-BR');
    document.getElementById('total-leads').textContent = totalLeads.toLocaleString('pt-BR');
}

async function loadChartData() {
    try {
        const { data, error } = await supabaseClient
            .from('afrobasico_leadgen_bitly_summary')
            .select('date, clicks, scans')
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        const labels = data.map(row => {
            const date = new Date(row.date);
            return date.toLocaleDateString('pt-BR');
        });
        
        const clicksData = data.map(row => row.clicks || 0);
        const scansData = data.map(row => row.scans || 0);
        
        renderEngagementChart(labels, clicksData, scansData);
        
    } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
        loadChartDataMock();
    }
}

function loadChartDataMock() {
    const labels = mockData.summary.map(row => {
        const date = new Date(row.date);
        return date.toLocaleDateString('pt-BR');
    });
    
    const clicksData = mockData.summary.map(row => row.clicks);
    const scansData = mockData.summary.map(row => row.scans);
    
    renderEngagementChart(labels, clicksData, scansData);
}

async function loadOriginChart() {
    try {
        const { data, error } = await supabaseClient
            .from('ab_leads_wp')
            .select('origem')
            .not('origem', 'is', null);
        
        if (error) throw error;
        
        // Contar ocorrências por origem
        const originCounts = {};
        data.forEach(row => {
            const origin = row.origem || 'Não informado';
            originCounts[origin] = (originCounts[origin] || 0) + 1;
        });
        
        const labels = Object.keys(originCounts);
        const values = Object.values(originCounts);
        
        renderOriginChart(labels, values);
        
    } catch (error) {
        console.error('Erro ao carregar dados do gráfico de origens:', error);
        loadOriginChartMock();
    }
}

function loadOriginChartMock() {
    const originCounts = {};
    mockData.leads.forEach(lead => {
        const origin = lead.origem;
        originCounts[origin] = (originCounts[origin] || 0) + 1;
    });
    
    const labels = Object.keys(originCounts);
    const values = Object.values(originCounts);
    
    renderOriginChart(labels, values);
}

function renderEngagementChart(labels, clicksData, scansData) {
    const ctx = document.getElementById('engagement-chart').getContext('2d');
    
    // Destruir gráfico existente se houver
    if (window.engagementChart) {
        window.engagementChart.destroy();
    }
    
    window.engagementChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Clicks',
                    data: clicksData,
                    borderColor: '#0d1b2a',
                    backgroundColor: 'rgba(13, 27, 42, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Scans',
                    data: scansData,
                    borderColor: '#415a77',
                    backgroundColor: 'rgba(65, 90, 119, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(65, 90, 119, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(65, 90, 119, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function renderOriginChart(labels, values) {
    const ctx = document.getElementById('origin-chart').getContext('2d');
    
    // Destruir gráfico existente se houver
    if (window.originChart) {
        window.originChart.destroy();
    }
    
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
    
    window.originChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

async function loadOriginOptions() {
    try {
        const { data, error } = await supabaseClient
            .from('ab_leads_wp')
            .select('origem')
            .not('origem', 'is', null);
        
        if (error) throw error;
        
        const origins = [...new Set(data.map(row => row.origem).filter(Boolean))];
        populateOriginSelect(origins);
        
    } catch (error) {
        console.error('Erro ao carregar origens:', error);
        loadOriginOptionsMock();
    }
}

function loadOriginOptionsMock() {
    const origins = [...new Set(mockData.leads.map(lead => lead.origem))];
    populateOriginSelect(origins);
}

function populateOriginSelect(origins) {
    const select = document.getElementById('origin-filter');
    
    // Limpar opções existentes (exceto "Todas as origens")
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Adicionar novas opções
    origins.forEach(origin => {
        const option = document.createElement('option');
        option.value = origin;
        option.textContent = origin;
        select.appendChild(option);
    });
}

async function loadLeadsData() {
    showLeadsLoading(true);
    
    try {
        let query = supabaseClient
            .from('ab_leads_wp')
            .select('nome, telefone, origem, data', { count: 'exact' });
        
        // Aplicar filtros
        if (currentFilters.dateStart) {
            query = query.gte('data', currentFilters.dateStart);
        }
        if (currentFilters.dateEnd) {
            query = query.lte('data', currentFilters.dateEnd);
        }
        if (currentFilters.search) {
            query = query.or(`nome.ilike.%${currentFilters.search}%,telefone.ilike.%${currentFilters.search}%`);
        }
        if (currentFilters.origin) {
            query = query.eq('origem', currentFilters.origin);
        }
        
        // Aplicar ordenação
        query = query.order(currentSort.field, { ascending: currentSort.direction === 'asc' });
        
        // Aplicar paginação
        const from = (currentPage - 1) * RECORDS_PER_PAGE;
        const to = from + RECORDS_PER_PAGE - 1;
        query = query.range(from, to);
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        totalRecords = count || 0;
        totalPages = Math.max(1, Math.ceil(totalRecords / RECORDS_PER_PAGE));
        
        renderLeadsTable(data || []);
        updatePaginationInfo();
        
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
        loadLeadsDataMock();
    } finally {
        showLeadsLoading(false);
    }
}

function loadLeadsDataMock() {
    let filteredLeads = [...mockData.leads];
    
    // Aplicar filtros
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(lead => 
            lead.nome.toLowerCase().includes(searchTerm) || 
            lead.telefone.includes(searchTerm)
        );
    }
    
    if (currentFilters.origin) {
        filteredLeads = filteredLeads.filter(lead => lead.origem === currentFilters.origin);
    }
    
    if (currentFilters.dateStart) {
        filteredLeads = filteredLeads.filter(lead => lead.data >= currentFilters.dateStart);
    }
    
    if (currentFilters.dateEnd) {
        filteredLeads = filteredLeads.filter(lead => lead.data <= currentFilters.dateEnd);
    }
    
    // Aplicar ordenação
    filteredLeads.sort((a, b) => {
        const aValue = a[currentSort.field];
        const bValue = b[currentSort.field];
        
        if (currentSort.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    
    totalRecords = filteredLeads.length;
    totalPages = Math.max(1, Math.ceil(totalRecords / RECORDS_PER_PAGE));
    
    // Aplicar paginação
    const from = (currentPage - 1) * RECORDS_PER_PAGE;
    const to = from + RECORDS_PER_PAGE;
    const paginatedLeads = filteredLeads.slice(from, to);
    
    renderLeadsTable(paginatedLeads);
    updatePaginationInfo();
}

function renderLeadsTable(leads) {
    const tbody = document.getElementById('leads-tbody');
    
    if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">Nenhum lead encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = leads.map(lead => {
        const date = new Date(lead.data);
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        return `
            <tr>
                <td>${lead.nome || '-'}</td>
                <td>${lead.telefone || '-'}</td>
                <td>${lead.origem || '-'}</td>
                <td>${formattedDate}</td>
            </tr>
        `;
    }).join('');
}

function updatePaginationInfo() {
    const start = totalRecords > 0 ? (currentPage - 1) * RECORDS_PER_PAGE + 1 : 0;
    const end = Math.min(currentPage * RECORDS_PER_PAGE, totalRecords);
    
    document.getElementById('pagination-info-text').textContent = 
        `Mostrando ${start}-${end} de ${totalRecords} registros`;
    
    document.getElementById('page-info').textContent = 
        `Página ${currentPage} de ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        if (supabaseClient) {
            loadLeadsData();
        } else {
            loadLeadsDataMock();
        }
    }
}

function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // Atualizar indicadores visuais
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const currentTh = document.querySelector(`th[data-sort="${field}"]`);
    if (currentTh) {
        currentTh.classList.add(`sort-${currentSort.direction}`);
    }
    
    currentPage = 1;
    if (supabaseClient) {
        loadLeadsData();
    } else {
        loadLeadsDataMock();
    }
}

function applyFilters() {
    currentFilters.dateStart = document.getElementById('date-start').value;
    currentFilters.dateEnd = document.getElementById('date-end').value;
    currentFilters.origin = document.getElementById('origin-filter').value;
    
    currentPage = 1;
    if (supabaseClient) {
        loadLeadsData();
        loadOriginChart(); // Atualizar gráfico de pizza também
    } else {
        loadLeadsDataMock();
        loadOriginChartMock();
    }
}

function showGlobalLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showLeadsLoading(show) {
    const loading = document.getElementById('leads-loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Utilitários
function formatNumber(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}
