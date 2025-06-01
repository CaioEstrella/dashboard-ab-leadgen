// Supabase Configuration
const SUPABASE_URL = 'https://eugvprcvaryunadretbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Z3ZwcmN2YXJ5dW5hZHJldGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI4OTYyNywiZXhwIjoyMDYxODY1NjI3fQ.bba2qfmbBDlJ3FvOoPxJiJqzLdqky3YSRUB-0aZ88e4';

// Initialize Supabase with error handling
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
    console.error('Erro ao inicializar Supabase:', error);
}

// Global Variables
let allBitlyData = [];
let allLeadsData = [];
let filteredLeadsData = [];
let currentPage = 1;
const leadsPerPage = 10;
let timelineChart = null;
let originChart = null;

// Color Palettes
const colors = {
    light: ["#0d1b2a","#1b263b","#415a77","#778da9","#e0e1dd"],
    dark: ["#000008","#0a0f1a","#1a2635","#2d4a6b","#b8b9b4"],
    neon: ["#00ffff","#ff00ff","#00ff00","#ffff00","#ff0080"]
};

// Sample fallback data for demonstration
const sampleBitlyData = [
    { date: '2025-05-01', clicks: 150, scans_loja: 45, scans_kasa123: 32 },
    { date: '2025-05-02', clicks: 200, scans_loja: 60, scans_kasa123: 40 },
    { date: '2025-05-03', clicks: 180, scans_loja: 55, scans_kasa123: 38 },
    { date: '2025-05-04', clicks: 220, scans_loja: 65, scans_kasa123: 45 },
    { date: '2025-05-05', clicks: 190, scans_loja: 58, scans_kasa123: 42 }
];

const sampleLeadsData = [
    { nome: 'João Silva', telefone: '(11) 99999-1234', origem: 'Instagram', data: '2025-05-01' },
    { nome: 'Maria Santos', telefone: '(11) 88888-5678', origem: 'Facebook', data: '2025-05-01' },
    { nome: 'Pedro Oliveira', telefone: '(11) 77777-9012', origem: 'WhatsApp', data: '2025-05-02' },
    { nome: 'Ana Costa', telefone: '(11) 66666-3456', origem: 'Site', data: '2025-05-02' },
    { nome: 'Carlos Lima', telefone: '(11) 55555-7890', origem: 'Instagram', data: '2025-05-03' }
];

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const themeToggle = document.getElementById('themeToggle');
const dateStart = document.getElementById('dateStart');
const dateEnd = document.getElementById('dateEnd');
const searchText = document.getElementById('searchText');
const originFilter = document.getElementById('originFilter');
const totalClicks = document.getElementById('totalClicks');
const totalScansLoja = document.getElementById('totalScansLoja');
const totalScansKasa123 = document.getElementById('totalScansKasa123');
const totalLeads = document.getElementById('totalLeads');
const leadsTableBody = document.getElementById('leadsTableBody');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Aplicação iniciando...');
    initializeTheme();
    setupEventListeners();
    await loadData();
    hideLoading();
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-color-scheme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.querySelector('.theme-icon');
    const themeText = document.querySelector('.theme-text');
    
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Modo Claro';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Modo Noturno';
    }
    
    // Update charts if they exist
    if (timelineChart || originChart) {
        setTimeout(() => {
            updateCharts();
        }, 100);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Event Listeners
function setupEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    dateStart.addEventListener('change', applyFilters);
    dateEnd.addEventListener('change', applyFilters);
    searchText.addEventListener('input', debounce(applyFilters, 300));
    originFilter.addEventListener('change', applyFilters);
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatNumber(number) {
    return new Intl.NumberFormat('pt-BR').format(number);
}

// Data Loading
async function loadData() {
    console.log('Carregando dados...');
    try {
        if (supabase) {
            console.log('Tentando carregar dados do Supabase...');
            await Promise.all([
                loadBitlyData(),
                loadLeadsData()
            ]);
        } else {
            console.log('Supabase não disponível, usando dados de exemplo...');
            useSampleData();
        }
        
        console.log('Dados carregados:', { bitly: allBitlyData.length, leads: allLeadsData.length });
        
        applyFilters();
        updateMetrics();
        updateCharts();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        console.log('Usando dados de exemplo devido ao erro...');
        useSampleData();
        applyFilters();
        updateMetrics();
        updateCharts();
    }
}

function useSampleData() {
    allBitlyData = [...sampleBitlyData];
    allLeadsData = [...sampleLeadsData];
    console.log('Dados de exemplo carregados');
}

async function loadBitlyData() {
    try {
        const { data, error } = await supabase
            .from('afrobasico_leadgen_bitly_summary')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) {
            console.error('Erro ao carregar dados Bitly:', error);
            throw error;
        }
        
        allBitlyData = data || [];
        console.log('Dados Bitly carregados:', allBitlyData.length);
        
        // Se não há dados, usar dados de exemplo
        if (allBitlyData.length === 0) {
            console.log('Nenhum dado Bitly encontrado, usando dados de exemplo');
            allBitlyData = [...sampleBitlyData];
        }
    } catch (error) {
        console.error('Erro na consulta Bitly:', error);
        allBitlyData = [...sampleBitlyData];
    }
}

async function loadLeadsData() {
    try {
        const { data, error } = await supabase
            .from('ab_leads_wp')
            .select('*')
            .order('data', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar dados de leads:', error);
            throw error;
        }
        
        allLeadsData = data || [];
        console.log('Dados de leads carregados:', allLeadsData.length);
        
        // Se não há dados, usar dados de exemplo
        if (allLeadsData.length === 0) {
            console.log('Nenhum dado de lead encontrado, usando dados de exemplo');
            allLeadsData = [...sampleLeadsData];
        }
    } catch (error) {
        console.error('Erro na consulta de leads:', error);
        allLeadsData = [...sampleLeadsData];
    }
}

// Filters
function applyFilters() {
    const startDate = dateStart.value;
    const endDate = dateEnd.value;
    const searchTerm = searchText.value.toLowerCase();
    const origin = originFilter.value;
    
    filteredLeadsData = allLeadsData.filter(lead => {
        // Date filter
        if (startDate && lead.data < startDate) return false;
        if (endDate && lead.data > endDate) return false;
        
        // Search filter
        if (searchTerm && 
            !lead.nome?.toLowerCase().includes(searchTerm) && 
            !lead.telefone?.includes(searchTerm)) return false;
        
        // Origin filter
        if (origin && lead.origem !== origin) return false;
        
        return true;
    });
    
    currentPage = 1;
    updateTable();
    updateMetrics();
    updateCharts();
}

// Metrics Update
function updateMetrics() {
    const filteredBitlyData = filterBitlyDataByDate();
    
    const clicks = filteredBitlyData.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const scansLoja = filteredBitlyData.reduce((sum, item) => sum + (item.scans_loja || 0), 0);
    const scansKasa123 = filteredBitlyData.reduce((sum, item) => sum + (item.scans_kasa123 || 0), 0);
    const leads = filteredLeadsData.length;
    
    // Animate number changes
    animateNumber(totalClicks, clicks);
    animateNumber(totalScansLoja, scansLoja);
    animateNumber(totalScansKasa123, scansKasa123);
    animateNumber(totalLeads, leads);
}

function filterBitlyDataByDate() {
    const startDate = dateStart.value;
    const endDate = dateEnd.value;
    
    return allBitlyData.filter(item => {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
        return true;
    });
}

function animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 20);
    
    if (currentValue === targetValue) return;
    
    const animation = setInterval(() => {
        const newValue = parseInt(element.textContent.replace(/\D/g, '')) + increment;
        if ((increment > 0 && newValue >= targetValue) || (increment < 0 && newValue <= targetValue)) {
            element.textContent = formatNumber(targetValue);
            clearInterval(animation);
        } else {
            element.textContent = formatNumber(newValue);
        }
    }, 50);
}

// Charts
function updateCharts() {
    updateTimelineChart();
    updateOriginChart();
}

function updateTimelineChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    const filteredData = filterBitlyDataByDate();
    
    if (timelineChart) {
        timelineChart.destroy();
    }
    
    const labels = filteredData.map(item => formatDate(item.date));
    const clicksData = filteredData.map(item => item.clicks || 0);
    const scansLojaData = filteredData.map(item => item.scans_loja || 0);
    const scansKasa123Data = filteredData.map(item => item.scans_kasa123 || 0);
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Clicks',
                    data: clicksData,
                    borderColor: colors.neon[0], // cyan
                    backgroundColor: colors.neon[0] + '20',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: colors.neon[0],
                    pointBorderColor: colors.neon[0],
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    shadowColor: colors.neon[0],
                    shadowBlur: 15
                },
                {
                    label: 'Scans Loja',
                    data: scansLojaData,
                    borderColor: colors.neon[1], // magenta
                    backgroundColor: colors.neon[1] + '20',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: colors.neon[1],
                    pointBorderColor: colors.neon[1],
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    shadowColor: colors.neon[1],
                    shadowBlur: 15
                },
                {
                    label: 'Scans Kasa123',
                    data: scansKasa123Data,
                    borderColor: colors.neon[2], // green
                    backgroundColor: colors.neon[2] + '20',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: colors.neon[2],
                    pointBorderColor: colors.neon[2],
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    shadowColor: colors.neon[2],
                    shadowBlur: 15
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text'),
                        usePointStyle: true,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-border')
                    }
                },
                y: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-border')
                    }
                }
            },
            elements: {
                point: {
                    hoverBorderWidth: 3
                }
            }
        }
    });
}

function updateOriginChart() {
    const ctx = document.getElementById('originChart').getContext('2d');
    
    if (originChart) {
        originChart.destroy();
    }
    
    const originCounts = {};
    filteredLeadsData.forEach(lead => {
        const origem = lead.origem || 'Outros';
        originCounts[origem] = (originCounts[origem] || 0) + 1;
    });
    
    const labels = Object.keys(originCounts);
    const data = Object.values(originCounts);
    
    originChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.neon.slice(0, labels.length),
                borderColor: colors.neon.slice(0, labels.length),
                borderWidth: 3,
                hoverBorderWidth: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--color-text'),
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 3,
                    hoverBorderWidth: 5
                }
            }
        }
    });
}

// Table Management
function updateTable() {
    const start = (currentPage - 1) * leadsPerPage;
    const end = start + leadsPerPage;
    const pageData = filteredLeadsData.slice(start, end);
    
    leadsTableBody.innerHTML = '';
    
    pageData.forEach(lead => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lead.nome || '-'}</td>
            <td>${lead.telefone || '-'}</td>
            <td><span class="status status--info">${lead.origem || 'Outros'}</span></td>
            <td>${formatDate(lead.data)}</td>
        `;
        leadsTableBody.appendChild(row);
    });
    
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
    
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages || totalPages === 0;
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updateTable();
    }
}