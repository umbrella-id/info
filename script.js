// ==================== KONFIGURASI ====================
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzzYiVd0aqzdzmohQnBfvZJRdnwyeSNb-75H_pO5Fxh2-S3aU111rdW8w9aQ0306MNR/exec';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentTab = 'monthly';

// ==================== API CALLS ====================
async function callApi(action, params = {}) {
  const url = new URL(API_BASE_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  currentTab = tab;
  const monthlyTab = document.getElementById('monthlyTab');
  const historyTab = document.getElementById('historyTab');
  
  if (tab === 'monthly') {
    monthlyTab.style.display = 'block';
    historyTab.style.display = 'none';
    loadMonthly();
  } else {
    monthlyTab.style.display = 'none';
    historyTab.style.display = 'block';
    loadHistory();
  }
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
}

// ==================== LOAD MONTHLY TABLE ====================
async function loadMonthly(tahun = currentYear, bulan = currentMonth) {
  const container = document.getElementById('monthlyContent');
  container.innerHTML = '<div class="loading">Memuat data...</div>';
  
  const result = await callApi('getMonthlyTable', { tahun: tahun, bulan: bulan });
  
  if (!result.success) {
    container.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
    return;
  }
  
  if (result.data.length === 0) {
    container.innerHTML = '<div class="loading">✨ Tidak ada member aktif</div>';
    return;
  }
  
  let html = '<div class="scroll-hint">← Geser ke kanan untuk lihat semua →</div>';
  html += '<table>';
  
  // === HEADER 2 TINGKAT ===
  html += `<thead><tr>`;
  html += `<th colspan="1" style="text-align:left; font-weight:bold; color:#22c55e;">Saldo Kas: ${formatRupiah(result.saldoKas)}</th>`;
  html += `<th colspan="${result.totalMinggu}" style="text-align:center; font-size:1.1rem; color:#f1f5f9; cursor:pointer;" onclick="toggleBulanDropdown(event, ${tahun}, ${bulan})">${result.bulanNama}</th>`;
  html += `<th colspan="2" style="text-align:right; font-weight:bold; color:#94a3b8;">${formatRupiah(result.tarif)} / Minggu</th>`;
  html += `</tr>`;
  
  html += `<tr>`;
  html += `<th style="text-align:left;">IGN</th>`;
  for (const sabtu of result.sabtuList) {
    html += `<th>${sabtu}</th>`;
  }
  html += `<th>Deposit</th>`;
  html += `<th>Estimasi</th>`;
  html += `</tr></thead>`;
  
  // === BODY ===
  html += `<tbody>`;
  for (const row of result.data) {
    html += '<tr>';
    html += `<td class="member-col">${escapeHtml(row.ign)}</td>`;
    for (const c of row.centang) {
      html += `<td>${c ? '<span class="centang">✅</span>' : ''}</td>`;
    }
    html += `<td class="deposit">${formatRupiah(row.deposit)}</td>`;
    html += `<td class="estimasi">${row.estimasi}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table>';
  
  container.innerHTML = html;
}

// ==================== LOAD HISTORY ====================
async function loadHistory() {
  const container = document.getElementById('historyContent');
  container.innerHTML = '<div class="loading">Memuat history...</div>';
  
  const ignFilter = document.getElementById('ignFilter').value;
  const result = await callApi('getHistoryKas', {
    tahun: currentYear,
    bulan: currentMonth,
    ignFilter: ignFilter
  });
  
  if (!result.success) {
    container.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
    return;
  }
  
  if (result.data.length === 0) {
    container.innerHTML = '<div class="loading">📭 Tidak ada transaksi</div>';
    return;
  }
  
  let html = '<div class="scroll-hint">📋 ' + result.data.length + ' transaksi ditemukan</div>';
  html += '<table class="history-table"><thead><tr>';
  html += '<th>Tanggal</th><th>IGN</th><th>Nominal</th><th>Keterangan</th><th>Bendahara</th>';
  html += '</tr></thead><tbody>';
  
  for (const tx of result.data) {
    const nominalClass = tx.spina > 0 ? 'positive' : 'negative';
    const nominal = tx.spina > 0 ? `+${formatRupiah(tx.spina)}` : formatRupiah(tx.spina);
    html += '<tr>';
    html += `<td>${formatDate(tx.date)}</td>`;
    html += `<td>${escapeHtml(tx.ign)}</td>`;
    html += `<td class="${nominalClass}">${nominal}</td>`;
    html += `<td>${escapeHtml(tx.notes || '-')}</td>`;
    html += `<td>${escapeHtml(tx.adm || '-')}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ==================== DROPDOWN BULAN ====================
function toggleBulanDropdown(event, tahun, bulan) {
  let dropdown = document.getElementById('bulanDropdown');
  if (!dropdown) {
    const div = document.createElement('div');
    div.id = 'bulanDropdown';
    div.className = 'bulan-dropdown';
    document.body.appendChild(div);
    dropdown = div;
  }
  
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    return;
  }
  
  const rect = event.target.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + 4) + 'px';
  dropdown.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  dropdown.style.display = 'block';
  dropdown.innerHTML = '';
  
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bulanNama = getNamaBulan(d.getMonth() + 1);
    const tahunNama = d.getFullYear();
    const isActive = (d.getMonth() + 1 === bulan && d.getFullYear() === tahun);
    
    const item = document.createElement('div');
    item.className = 'item' + (isActive ? ' active' : '');
    item.textContent = `${bulanNama} ${tahunNama}`;
    item.onclick = (function(t, b) {
      return function() {
        currentYear = t;
        currentMonth = b;
        loadMonthly(t, b);
        dropdown.style.display = 'none';
      };
    })(d.getFullYear(), d.getMonth() + 1);
    dropdown.appendChild(item);
  }
}

// ==================== HELPERS ====================
function getNamaBulan(bulan) {
  const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return nama[bulan - 1];
}

function formatRupiah(angka) {
  if (angka === 0 || !angka) return 'Rp0';
  return 'Rp' + angka.toLocaleString('id-ID');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
  loadMonthly();
  
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('bulanDropdown');
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.bulan')) {
      dropdown.style.display = 'none';
    }
  });
});
