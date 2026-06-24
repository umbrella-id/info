// ==================== MENU ====================
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');
const menuPanel = document.getElementById('menuPanel');
const menuClose = document.getElementById('menuClose');

// ==================== STATE ====================
let lastActiveTab = 'laporan';
let isSaranPopupOpen = false;
let isDetailPopupOpen = false;

function toggleMenu(open) {
    if (menuOverlay) menuOverlay.classList.toggle('open', open);
    if (menuPanel) menuPanel.classList.toggle('open', open);
}

if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu(true));
if (menuClose) menuClose.addEventListener('click', () => toggleMenu(false));
if (menuOverlay) menuOverlay.addEventListener('click', () => toggleMenu(false));

// ==================== BACK BUTTON MANAGER ====================
window.addEventListener('popstate', function(e) {
    // CEK POPUP SARAN
    if (isSaranPopupOpen) {
        const popup = document.getElementById('saranPopupOverlay');
        if (popup && popup.style.display !== 'none') {
            if (typeof closeSaran === 'function') {
                closeSaran();
                e.preventDefault();
                return;
            }
        }
    }
    
    // CEK POPUP DETAIL HISTORY
    if (isDetailPopupOpen) {
        const popupOverlay = document.getElementById('popupOverlay');
        if (popupOverlay && popupOverlay.classList.contains('active')) {
            if (typeof window.closePopup === 'function') {
                window.closePopup();
                e.preventDefault();
                return;
            }
        }
    }
});

// ==================== EXPOSE BACK BUTTON STATE ====================
window.setSaranPopupOpen = function(open) {
    isSaranPopupOpen = open;
};

window.setDetailPopupOpen = function(open) {
    isDetailPopupOpen = open;
};

// ==================== RENDER MENU ====================
function renderMenu() {
    var menuPanel = document.getElementById('menuPanel');
    if (!menuPanel) return;
    
    var ul = menuPanel.querySelector('ul');
    if (!ul) return;
    
    var items = ul.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.page === 'crysta') {
            items[i].innerHTML = ciMenu(10) + ' Daftar Crysta';
            items[i].className = '';
            break;
        }
    }
}

// Panggil setelah DOM ready
document.addEventListener('DOMContentLoaded', function() {
    renderMenu();
});

// ==================== NAVIGASI MENU ====================
document.querySelectorAll('.menu-panel ul li').forEach(function(item) {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-panel ul li').forEach(function(i) {
            i.classList.remove('active');
        });
        this.classList.add('active');
        const page = this.dataset.page;
        toggleMenu(false);

        // 🔥 SIMPAN TAB TERAKHIR (KECUALI SARAN)
        if (page !== 'saran') {
            lastActiveTab = page;
            
            // 🔥 UPDATE JUGA KE WINDOW
            if (window.setLastActiveTab) {
                window.setLastActiveTab(page);
            }
        }

        if (page === 'laporan') {
            if (typeof renderLaporan === 'function') {
                renderLaporan();
            }
        } else if (page === 'crysta') {
            if (typeof renderCrysta === 'function') {
                renderCrysta();
            }
        } else if (page === 'saran') {
            if (typeof renderSaran === 'function') {
                renderSaran();
            }
        } else if (page === 'segera') {
            if (typeof renderSegera === 'function') {
                renderSegera();
            }
        }
    });
});

// ==================== DEFAULT RENDER ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 APP STARTED');
    if (typeof renderLaporan === 'function') {
        renderLaporan();
    } else if (typeof renderSegera === 'function') {
        renderSegera();
    }
});

// ==================== EXPOSE ====================
window.lastActiveTab = lastActiveTab;
window.setLastActiveTab = function(tab) {
    lastActiveTab = tab;
};
window.getLastActiveTab = function() {
    return lastActiveTab;
};
