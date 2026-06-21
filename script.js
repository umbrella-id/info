// ==================== KONFIGURASI ====================
const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec';
const CACHE_KEY = 'kas_data';
const CACHE_KEY_HISTORY = 'kas_history';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 jam
const START_YEAR = 2025;
const START_MONTH = 6;

// ==================== STATE ====================
let currentTahun = new Date().getFullYear();
let currentBulan = new Date().getMonth() + 1;
let availableMonths = [];
let allHistoryData = [];
let historyLoaded = false;
let isFetching = false;
let isFetchingHistory = false;
let historyRendered = false;

// ==================== DOM REFS ====================
const $ = (id) => document.getElementById(id);
const monthLabel = $('monthLabel');
const prevBtn = $('prevMonth');
const nextBtn = $('nextMonth');
const searchInput = $('searchInput');
const tableHead = $('tableHead');
const tableBody = $('tableBody');
const tableContainer = $('tableContainer');
const skeletonContainer = $('skeletonContainer');
const skeletonBody = $('skeletonBody');
const historySearch = $('historySearch');
const historyBody = $('historyBody');
const historyContainer = $('historyContainer');
const loadingHistory = $('loadingHistory');

// ==================== CACHE FUNCTIONS ====================
function getCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_KEY + '_' + key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.value;
    } catch (e) { return null; }
}

function setCache(key, value) {
    try {
        localStorage.setItem(CACHE_KEY + '_' + key, JSON.stringify({
            timestamp: Date.now(),
            value: value
        }));
    } catch (e) { /* ignore */ }
}

function getHistoryCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY_HISTORY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.value;
    } catch (e) { return null; }
}

function setHistoryCache(value) {
    try {
        localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify({
            timestamp: Date.now(),
            value: value
        }));
    } catch (e) { /* ignore */ }
}

// ==================== GENERATE MONTHS ====================
function generateMonthList() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const months = [];
    let year = START_YEAR;
    let month = START_MONTH;

    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
        months.push({
            tahun: year,
            bulan: month,
            label: getNamaBulan(month) + ' ' + year
        });
        month++;
        if (month > 12) { month = 1;
            year++; }
    }
    return months;
}

// ==================== SKELETON ====================
function showSkeleton(count) {
    count = count || 30;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += '<tr class="skeleton-row">';
        html += '<td></td><td></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="deposit"></td>';
        html += '<td class="estimasi"></td>';
        html += '</tr>';
    }
    skeletonBody.innerHTML = html;
    skeletonContainer.style.display = 'block';
    tableContainer.style.display = 'none';
}

function hideSkeleton() {
    skeletonContainer.style.display = 'none';
}

// ==================== FORMAT SPINA ====================
function formatSpina(angka) {
    if (angka === undefined || angka === null) return '0 S';
    return Math.round(angka).toLocaleString('id-ID') + ' S';
}

function formatSpinaRaw(angka) {
    if (angka === undefined || angka === null) return '0';
    return Math.round(angka).toLocaleString('id-ID');
}

// ==================== MENU (FLOATING) ====================
const menuToggle = $('menuToggle');
const menuOverlay = $('menuOverlay');
const menuPanel = $('menuPanel');
const menuClose = $('menuClose');

function toggleMenu(open) {
    menuOverlay.classList.toggle('open', open);
    menuPanel.classList.toggle('open', open);
}
menuToggle.addEventListener('click', () => toggleMenu(true));
menuClose.addEventListener('click', () => toggleMenu(false));
menuOverlay.addEventListener('click', () => toggleMenu(false));

// ==================== FLOATING MENU NAVIGATION ====================
document.querySelectorAll('.menu-panel ul li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-panel ul li').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        const page = this.dataset.page;
        toggleMenu(false);

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.querySelector('.header-kas').style.display = 'flex';

        if (page === 'segera') {
            document.querySelector('.header-kas').style.display = 'none';
            document.querySelector('.tab-selector').style.display = 'none';
            document.querySelector('.dual-panel').style.display = 'none';
            $('pageSegera').classList.add('active');
        } else {
            document.querySelector('.header-kas').style.display = 'flex';
            document.querySelector('.dual-panel').style.display = 'grid';
            if (window.innerWidth < 900) {
                document.querySelector('.tab-selector').style.display = 'flex';
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                $('panelKas').classList.add('active');
            } else {
                document.querySelector('.tab-selector').style.display = 'none';
                document.querySelectorAll('.panel').forEach(p => p.classList.add('active'));
                if (allHistoryData.length > 0) {
                    renderHistory(allHistoryData);
                    loadingHistory.style.display = 'none';
                    historyContainer.style.display = 'block';
                    historyRendered = true;
                }
            }
        }
    });
});

// ==================== TAB SELECTOR (layar kecil) ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const target = this.dataset.tab;

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        if (target === 'kas') {
            $('panelKas').classList.add('active');
        } else if (target === 'history') {
            $('panelHistory').classList.add('active');
            if (allHistoryData.length > 0) {
                renderHistory(allHistoryData);
                loadingHistory.style.display = 'none';
                historyContainer.style.display = 'block';
                historyRendered = true;
            } else {
                loadHistory();
            }
        }
    });
});

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', function() {
    const isWide = window.innerWidth >= 900;
    const tabSelector = document.querySelector('.tab-selector');
    const panels = document.querySelectorAll('.panel');

    if (isWide) {
        tabSelector.style.display = 'none';
        panels.forEach(p => p.classList.add('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
        if (allHistoryData.length > 0) {
            renderHistory(allHistoryData);
            loadingHistory.style.display = 'none';
            historyContainer.style.display = 'block';
            historyRendered = true;
        }
    } else {
        tabSelector.style.display = 'flex';
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const target = activeTab.dataset.tab;
            panels.forEach(p => p.classList.remove('active'));
            if (target === 'kas') {
                $('panelKas').classList.add('active');
            } else if (target === 'history') {
                $('panelHistory').classList.add('active');
                if (allHistoryData.length > 0) {
                    renderHistory(allHistoryData);
                    loadingHistory.style.display = 'none';
                    historyContainer.style.display = 'block';
                    historyRendered = true;
                } else {
                    loadHistory();
                }
            }
        }
    }
});

// ==================== RENDER TABLE ====================
function renderTable(data) {
    const totalMinggu = data.totalMinggu || 0;
    const sabtuList = data.sabtuList || [];

    let headerHtml = '<tr><th>#</th><th>IGN</th>';
    for (let i = 0; i < totalMinggu; i++) {
        const tgl = sabtuList[i] || '';
        headerHtml += '<th class="centang-header">' + tgl + '</th>';
    }
    headerHtml += '<th class="deposit-header">Deposit</th><th class="estimasi-header">Estimasi</th></tr>';
    tableHead.innerHTML = headerHtml;

    let bodyHtml = '';
    let index = 1;
    const members = data.data || [];

    for (const member of members) {
        const centang = member.centang || [];
        const deposit = member.deposit || 0;
        const tarif = data.tarif || 0;

        let estimasi = '-';
        if (deposit > 0 && tarif > 0) {
            const mingguTambahan = Math.floor(deposit / tarif);
            if (mingguTambahan > 0 && sabtuList.length > 0) {
                const lastSabtu = new Date(currentTahun, currentBulan - 1, sabtuList[sabtuList.length - 1]);
                lastSabtu.setDate(lastSabtu.getDate() + (mingguTambahan * 7));
                estimasi = formatTanggalEstimasi(lastSabtu);
            } else {
                estimasi = 's/d akhir bulan';
            }
        }

        bodyHtml += '<tr>';
        bodyHtml += '<td style="color:#5a6488;">' + (index++) + '</td>';
        bodyHtml += '<td class="ign">' + (member.ign || '-') + '</td>';

        for (let i = 0; i < totalMinggu; i++) {
            const status = centang[i];
            let icon = '';
            let cls = 'empty';
            if (status === true) {
                icon = '<i class="fas fa-check-circle"></i>';
                cls = 'paid';
            } else if (status === false) {
                icon = '<i class="fas fa-times-circle"></i>';
                cls = 'unpaid';
            } else {
                icon = '—';
                cls = 'empty';
            }
            bodyHtml += '<td class="centang-cell"><span class="' + cls + '">' + icon + '</span></td>';
        }

        bodyHtml += '<td class="deposit">' + formatSpina(deposit) + '</td>';
        bodyHtml += '<td class="estimasi">' + estimasi + '</td>';
        bodyHtml += '</tr>';
    }

    tableBody.innerHTML = bodyHtml;
    tableContainer.style.display = 'block';
    hideSkeleton();
    applySearch();
}

// ==================== UPDATE HEADER ====================
function updateHeader(data) {
    if (data.saldoKas !== undefined) {
        $('totalKasHeader').textContent = formatSpina(data.saldoKas);
    }
    if (data.tarif) {
        $('tarifHeader').textContent = Math.round(data.tarif).toLocaleString('id-ID') + ' S';
    }
    if (data.bendahara && data.bendahara.length > 0) {
        let html = '';
        for (const b of data.bendahara) {
            html += '<span>' + b.nama + ': <span class="saldo">' + formatSpina(b.saldo) + '</span></span>';
        }
        $('bendaharaList').innerHTML = html;
    } else {
        $('bendaharaList').innerHTML = '<span>-</span>';
    }
}

// ==================== HISTORY ====================
function loadHistory() {
    if (isFetchingHistory) return;
    isFetchingHistory = true;

    const cachedHistory = getHistoryCache();
    
    if (cachedHistory && cachedHistory.length > 0) {
        console.log('✅ HISTORY: Load dari cache, jumlah:', cachedHistory.length);
        allHistoryData = cachedHistory;
        historyLoaded = true;
        renderHistory(allHistoryData);
        loadingHistory.style.display = 'none';
        historyContainer.style.display = 'block';
        historyRendered = true;
    } else {
        console.log('⏳ HISTORY: Tidak ada cache, tampilkan spinner');
        loadingHistory.style.display = 'block';
        historyContainer.style.display = 'none';
        historyRendered = false;
    }

    fetch(BASE_URL + '?action=getHistory&limit=100')
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                console.log('🔄 HISTORY: Update dari server, jumlah:', data.data.length);
                allHistoryData = data.data;
                historyLoaded = true;
                setHistoryCache(allHistoryData);
                renderHistory(allHistoryData);
                loadingHistory.style.display = 'none';
                historyContainer.style.display = 'block';
                historyRendered = true;
            } else if (!cachedHistory || cachedHistory.length === 0) {
                loadingHistory.style.display = 'none';
                historyBody.innerHTML =
                    '<tr><td colspan="5" style="text-align:center;padding:20px;color:#5a6488;">📭 Belum ada transaksi</td></tr>';
                historyContainer.style.display = 'block';
                historyRendered = true;
            }
        })
        .catch((err) => {
            console.warn('⚠️ HISTORY: Gagal fetch, pakai cache jika ada', err);
            if (!cachedHistory || cachedHistory.length === 0) {
                loadingHistory.style.display = 'none';
                historyBody.innerHTML =
                    '<tr><td colspan="5" style="text-align:center;padding:20px;color:#f44336;">❌ Gagal memuat history</td></tr>';
                historyContainer.style.display = 'block';
                historyRendered = true;
            }
        })
        .finally(() => {
            isFetchingHistory = false;
        });
}

// ==================== RENDER HISTORY ====================
function renderHistory(data) {
    if (!data || data.length === 0) {
        historyBody.innerHTML =
            '<tr><td colspan="5" style="text-align:center;padding:20px;color:#5a6488;">📭 Belum ada transaksi</td></tr>';
        historyContainer.style.display = 'block';
        loadingHistory.style.display = 'none';
        return;
    }

    let html = '';
    for (const item of data) {
        const date = new Date(item.date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateStr = String(date.getDate()).padStart(2, '0') + '-' + 
                        months[date.getMonth()] + '-' + 
                        String(date.getFullYear()).slice(-2);
        
        const spina = item.spina || 0;
        const spinaClass = spina >= 0 ? 'spina-positive' : 'spina-negative';
        const spinaFormatted = (spina >= 0 ? '+' : '') + formatSpinaRaw(spina) + ' S';
        
        html += '<tr>';
        html += '<td class="col-date">' + dateStr + '</td>';
        html += '<td class="col-ign">' + (item.ign || '-') + '</td>';
        html += '<td class="col-amount ' + spinaClass + '">' + spinaFormatted + '</td>';
        html += '<td class="col-notes" data-notes="' + (item.notes || '').replace(/"/g, '&quot;') + '">' + (item.notes || '-') + '</td>';
        html += '<td class="col-admin">' + (item.adm || '-') + '</td>';
        html += '</tr>';
    }
    historyBody.innerHTML = html;
    historyContainer.style.display = 'block';
    loadingHistory.style.display = 'none';
}

// ==================== POPUP DETAIL ====================
function initPopup() {
    // Buat elemen popup jika belum ada
    if (!document.getElementById('popupOverlay')) {
        const popupHTML = `
            <div class="popup-overlay" id="popupOverlay">
                <div class="popup-content">
                    <button class="popup-close" id="popupClose"><i class="fas fa-times"></i></button>
                    <div class="popup-title">📝 Detail Transaksi</div>
                    <div class="popup-ign" id="popupIgn">-</div>
                    <hr class="popup-divider" />
                    <div class="popup-row">
                        <span class="label">📅 Tanggal</span>
                        <span class="value" id="popupDate">-</span>
                    </div>
                    <div class="popup-row">
                        <span class="label">💰 Jumlah</span>
                        <span class="value" id="popupAmount">-</span>
                    </div>
                    <div class="popup-row">
                        <span class="label">👤 Admin</span>
                        <span class="value" id="popupAdmin">-</span>
                    </div>
                    <hr class="popup-divider" />
                    <div class="popup-title" style="font-size:11px; margin-bottom:6px;">📋 Catatan Lengkap</div>
                    <div class="popup-notes" id="popupNotes">-</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    }

    const popupOverlay = document.getElementById('popupOverlay');
    const popupClose = document.getElementById('popupClose');
    const popupIgn = document.getElementById('popupIgn');
    const popupDate = document.getElementById('popupDate');
    const popupAmount = document.getElementById('popupAmount');
    const popupAdmin = document.getElementById('popupAdmin');
    const popupNotes = document.getElementById('popupNotes');

    function closePopup() {
        popupOverlay.classList.remove('active');
    }

    popupClose.addEventListener('click', closePopup);
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === this) closePopup();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closePopup();
    });

    window.openPopup = function(item) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const date = new Date(item.date);
        const dateStr = String(date.getDate()).padStart(2, '0') + '-' + 
                        months[date.getMonth()] + '-' + 
                        String(date.getFullYear()).slice(-2);
        
        const spina = item.spina || 0;
        const spinaClass = spina >= 0 ? 'positive' : 'negative';
        const spinaFormatted = (spina >= 0 ? '+' : '') + formatSpinaRaw(spina) + ' S';
        
        popupIgn.textContent = item.ign || '-';
        popupDate.textContent = dateStr;
        popupAmount.textContent = spinaFormatted;
        popupAmount.className = 'value ' + spinaClass;
        popupAdmin.textContent = item.adm || '-';
        popupNotes.textContent = item.notes || 'Tidak ada catatan';
        
        popupOverlay.classList.add('active');
    };

    // Event listener untuk klik pada kolom notes
    document.addEventListener('click', function(e) {
        const notesCell = e.target.closest('.col-notes');
        if (notesCell) {
            const row = notesCell.closest('tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    // Ambil data dari data attribute atau text
                    const notes = notesCell.getAttribute('data-notes') || notesCell.textContent.trim();
                    const item = {
                        date: cells[0].textContent.trim(),
                        ign: cells[1].textContent.trim(),
                        spina: parseFloat(cells[2].textContent.replace(/[^0-9\-]/g, '')) || 0,
                        notes: notes,
                        adm: cells[4].textContent.trim()
                    };
                    
                    // Konversi date string ke format yang bisa diparse
                    const parts = item.date.split('-');
                    if (parts.length === 3) {
                        const monthMap = {'Jan':0,'Feb':1,'Mar':2,'Apr':3,'Mei':4,'Jun':5,'Jul':6,'Agu':7,'Sep':8,'Okt':9,'Nov':10,'Des':11};
                        const year = 2000 + parseInt(parts[2]);
                        const month = monthMap[parts[1]] || 0;
                        const day = parseInt(parts[0]);
                        item.date = new Date(year, month, day).toISOString();
                    }
                    
                    if (window.openPopup) {
                        window.openPopup(item);
                    }
                }
            }
        }
    });
}

// ==================== SEARCH ====================
function applySearch() {
    const keyword = searchInput.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');
    let visible = 0;
    for (const row of rows) {
        const ignCell = row.querySelector('td.ign');
        if (ignCell) {
            const ign = ignCell.textContent.toLowerCase();
            const match = !keyword || ign.includes(keyword);
            row.style.display = match ? '' : 'none';
            if (match) visible++;
        }
    }
}
searchInput.addEventListener('input', applySearch);

historySearch.addEventListener('input', function() {
    const keyword = this.value.toLowerCase().trim();
    const filtered = allHistoryData.filter(item => {
        const ign = (item.ign || '').toLowerCase();
        return !keyword || ign.includes(keyword);
    });
    renderHistory(filtered);
});

// ==================== NAVIGASI ====================
function updateNavButtons() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    prevBtn.disabled = (idx <= 0);
    nextBtn.disabled = (idx >= availableMonths.length - 1 || idx === -1);
}

prevBtn.addEventListener('click', function() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx > 0) {
        currentTahun = availableMonths[idx - 1].tahun;
        currentBulan = availableMonths[idx - 1].bulan;
        monthLabel.textContent = availableMonths[idx - 1].label;
        loadData();
    }
});

nextBtn.addEventListener('click', function() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx < availableMonths.length - 1 && idx !== -1) {
        currentTahun = availableMonths[idx + 1].tahun;
        currentBulan = availableMonths[idx + 1].bulan;
        monthLabel.textContent = availableMonths[idx + 1].label;
        loadData();
    }
});

// ==================== LOAD DATA (CACHE FIRST, THEN UPDATE) ====================
async function loadData() {
    const key = currentTahun + '-' + currentBulan;
    
    const cached = getCache(key);
    
    if (cached) {
        console.log('✅ DATA KAS: Load dari cache untuk ' + key);
        renderTable(cached);
        updateHeader(cached);
        monthLabel.textContent = cached.bulanNama || (currentBulan + '/' + currentTahun);
        updateNavButtons();
        hideSkeleton();
    } else {
        console.log('⏳ DATA KAS: Tidak ada cache, tampilkan skeleton');
        showSkeleton(30);
    }

    loadHistory();

    if (!isFetching) {
        isFetching = true;
        try {
            const url = BASE_URL + '?action=getMonthlyTable&tahun=' + currentTahun + '&bulan=' + currentBulan;
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            if (data.success) {
                setCache(key, data);
                console.log('🔄 DATA KAS: Update dari server untuk ' + key);
                renderTable(data);
                updateHeader(data);
                monthLabel.textContent = data.bulanNama || (currentBulan + '/' + currentTahun);
                updateNavButtons();
                hideSkeleton();
            } else {
                if (!cached) {
                    showError(data.error || 'Gagal memuat data');
                }
            }
        } catch (e) {
            console.error('❌ DATA KAS: Error fetch:', e);
            if (!cached) {
                showError('Error: ' + e.message);
            }
        }
        isFetching = false;
    }
}

// ==================== PRELOAD BULAN SEBELUMNYA ====================
function preloadPrevMonth() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx > 0) {
        const prev = availableMonths[idx - 1];
        const key = prev.tahun + '-' + prev.bulan;
        if (!getCache(key)) {
            console.log('⏳ PRELOAD: Fetch ' + prev.label);
            const url = BASE_URL + '?action=getMonthlyTable&tahun=' + prev.tahun + '&bulan=' + prev.bulan;
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        setCache(key, data);
                        console.log('✅ PRELOAD: Cache saved untuk ' + prev.label);
                    }
                })
                .catch(() => {});
        } else {
            console.log('✅ PRELOAD: Sudah ada cache untuk ' + prev.label);
        }
    }
}

// ==================== UTILITY ====================
function formatTanggalEstimasi(date) {
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear();
}

function showError(msg) {
    tableContainer.style.display = 'block';
    tableHead.innerHTML = '';
    tableBody.innerHTML =
        '<tr><td colspan="10" style="text-align:center;padding:30px;color:#f44336;">❌ ' + msg + '</td></tr>';
    hideSkeleton();
}

function getNamaBulan(bulan) {
    const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober',
        'November', 'Desember'
    ];
    return nama[bulan - 1] || bulan;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 APP STARTED');
    
    availableMonths = generateMonthList();
    const last = availableMonths[availableMonths.length - 1];
    currentTahun = last.tahun;
    currentBulan = last.bulan;
    monthLabel.textContent = last.label;
    updateNavButtons();

    const isWide = window.innerWidth >= 900;
    if (isWide) {
        document.querySelectorAll('.panel').forEach(p => p.classList.add('active'));
    } else {
        document.querySelector('.tab-selector').style.display = 'flex';
        document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
        $('panelKas').classList.add('active');
    }

    // Inisialisasi popup
    initPopup();

    loadData();
    setTimeout(preloadPrevMonth, 500);
});

// ==================== FORCE REFRESH ====================
window.forceRefresh = function() {
    const key = currentTahun + '-' + currentBulan;
    localStorage.removeItem(CACHE_KEY + '_' + key);
    localStorage.removeItem(CACHE_KEY_HISTORY);
    console.log('🗑️ Cache cleared, reloading...');
    allHistoryData = [];
    historyLoaded = false;
    historyRendered = false;
    loadData();
};

// ==================== DEBUG: Cek Cache ====================
window.showCache = function() {
    console.log('📦 CACHE DATA:');
    console.log('  - Kas:', localStorage.getItem(CACHE_KEY + '_' + currentTahun + '-' + currentBulan) ? '✅ Ada' : '❌ Tidak ada');
    console.log('  - History:', localStorage.getItem(CACHE_KEY_HISTORY) ? '✅ Ada' : '❌ Tidak ada');
    
    const history = getHistoryCache();
    if (history) {
        console.log('  - History jumlah:', history.length);
        console.log('  - History sample:', history.slice(0, 3));
    }
};
