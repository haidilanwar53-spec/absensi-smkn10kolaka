// ─────────────────────────────────────────────
//  DATA MODEL
// ─────────────────────────────────────────────
let db = {
  guru:    null,   // { nama, nip, ta }
  mapel:   [],     // [ { id, nama, kelas:[{jurusan,tingkat}] } ]
  siswa:   {},     // { "TJKT-X": ["nama",...], ... }
  absensi: []      // [ { id, mapelId, mapelNama, jurusan, tingkat, tanggal, pertemuan, jamMasuk, jamKeluar, records:[{nama,status,jamMasuk,jamKeluar,ket}] } ]
};

const JURUSAN_TINGKAT = {
  TJKT: ['X','XI','XII'],
  MPLB: ['X','XI','XII'],
  GP:   ['X','XI','XII','XIII']
};

const BULAN = ['','Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function maskNIP(nip) {
  if (!nip) return '-';
  const str = String(nip).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '-';
  if (str.includes('••••')) return str;

  const prefixMatch = str.match(/^([A-Za-z.\s]+)/);
  const prefix = prefixMatch ? prefixMatch[1].trim() + ' ' : '';
  const digits = str.replace(/\D/g, '');

  if (digits.length === 0) return '-';
  if (digits.length <= 6) return (prefix || 'NIP. ') + '••••••';

  const start = digits.slice(0, 4);
  const end = digits.slice(-2);
  return (prefix || 'NIP. ') + start + '••••••••' + end;
}

function appConfirm(message, onConfirm) {
  const modal = document.getElementById('modal-app-confirm');
  const msgEl = document.getElementById('app-confirm-msg');
  const btnYes = document.getElementById('btn-app-confirm-yes');
  
  if (!modal || !msgEl || !btnYes) {
    if (window.confirm(message)) {
      try { onConfirm(); } catch(err) { console.error('Confirm error:', err); }
    }
    return;
  }
  
  msgEl.textContent = message;
  btnYes.onclick = () => {
    modal.style.display = 'none';
    try { onConfirm(); } catch(err) { console.error('Confirm callback error:', err); }
  };
  modal.style.display = 'flex';
}

function closeAppConfirm() {
  const modal = document.getElementById('modal-app-confirm');
  if (modal) modal.style.display = 'none';
}

// ─────────────────────────────────────────────
//  DYNAMIC ICON MICRO-ANIMATION INITIALIZER
// ─────────────────────────────────────────────
function initDynamicIconAnimations() {
  function processNode(el) {
    if (!el || (el.dataset && el.dataset.iconWrapped)) return;
    el.dataset.iconWrapped = 'true';
    for (let node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const text = node.textContent;
        const match = text.match(/^\s*([\p{Extended_Pictographic}\u2600-\u27bf\u2300-\u23ff\uFE0F\u200D]+)\s*(.*)$/su);
        if (match) {
          const span = document.createElement('span');
          span.className = 'icon-anim';
          const icon = match[1];
          span.textContent = icon;
          if (['🔄', '⚙️', '🕒', '⏳'].includes(icon)) span.classList.add('icon-spin');
          if (['🗑️', '🗑', '⚠️', '❌'].includes(icon)) span.classList.add('icon-shake');
          if (['💾', '📥', '📤', '📋'].includes(icon)) span.classList.add('icon-hop');
          if (['▶️', '⏹️', '📷', '📸'].includes(icon)) span.classList.add('icon-pulse');

          const textNode = document.createTextNode(match[2] ? ' ' + match[2] : '');
          el.replaceChild(textNode, node);
          el.insertBefore(span, textNode);
          break;
        }
      }
    }
  }

  const selector = 'button, .chip, .guru-switch-pill, .stat-pill, .kpi-card, .rs-item, .btn, .action-btn';
  document.querySelectorAll(selector).forEach(processNode);

  try {
    const observer = new MutationObserver((mutations) => {
      for (let m of mutations) {
        for (let added of m.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) {
            if (added.matches && added.matches(selector)) processNode(added);
            if (added.querySelectorAll) added.querySelectorAll(selector).forEach(processNode);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch(e) {
    console.warn('Icon anim observer error:', e);
  }
}

// ─────────────────────────────────────────────
//  THEME CONTROLLER (DARK & LIGHT MODE)
// ─────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('smkn10_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && prefersDark);
  applyTheme(isDark ? 'dark' : 'light', false);
}

function applyTheme(theme, showFeedback = true) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('dark-mode', isDark);

  // Update Center FAB Theme Button
  const fabIcon = document.getElementById('fab-theme-icon');
  const fabText = document.getElementById('fab-theme-text');
  if (fabIcon) fabIcon.textContent = isDark ? '☀️' : '🌙';
  if (fabText) fabText.textContent = isDark ? 'Terang' : 'Gelap';

  // Update Topbar Theme Button
  const topIcon = document.getElementById('topbar-theme-icon');
  const topText = document.getElementById('topbar-theme-text');
  if (topIcon) topIcon.textContent = isDark ? '☀️' : '🌙';
  if (topText) topText.textContent = isDark ? 'Terang' : 'Gelap';

  localStorage.setItem('smkn10_theme', theme);

  if (showFeedback && typeof showToast === 'function') {
    showToast(isDark ? 'Mode Gelap Aktif 🌙' : 'Mode Terang Aktif ☀️', 'ok');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  applyTheme(target, true);
}

// ─────────────────────────────────────────────
//  SIDEBAR MINIMIZE & TOGGLE CONTROLLER
// ─────────────────────────────────────────────
function initSidebarMinimize() {
  const savedMini = localStorage.getItem('smkn10_sidebar_mini') === 'true';
  if (savedMini && window.innerWidth > 720) {
    applySidebarMini(true, false);
  }
}

function applySidebarMini(isMini, showFeedback = true) {
  document.body.classList.toggle('sidebar-mini', isMini);
  localStorage.setItem('smkn10_sidebar_mini', isMini ? 'true' : 'false');

  // Update Topbar & Sidebar Head Icon
  const topbarIcon = document.getElementById('topbar-sidebar-toggle-icon');
  const sideIcon = document.getElementById('sidebar-toggle-icon');
  const fabText = document.getElementById('fab-sidebar-text');
  const fabIcon = document.getElementById('fab-sidebar-icon');

  if (topbarIcon) topbarIcon.textContent = isMini ? '▶' : '◀';
  if (sideIcon) sideIcon.textContent = isMini ? '▶' : '◀';
  if (fabText) fabText.textContent = isMini ? 'Perbesar' : 'Sidebar';
  if (fabIcon) fabIcon.textContent = isMini ? '📂' : '📑';

  if (showFeedback && typeof showToast === 'function') {
    showToast(isMini ? 'Sidebar Diperkecil (Icon Only) 📑' : 'Sidebar Diperluas 📑', 'info');
  }
}

function toggleSidebarMinimize() {
  // On mobile, toggle .open
  if (window.innerWidth <= 720) {
    toggleSidebar();
    return;
  }
  const isMini = document.body.classList.contains('sidebar-mini');
  applySidebarMini(!isMini, true);
}

// ─────────────────────────────────────────────
//  CENTER FAB CONTROLLER
// ─────────────────────────────────────────────
function toggleFabMenu() {
  const menu = document.getElementById('center-fab-menu');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'block' : 'none';
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close Fab Menu when clicking outside
document.addEventListener('click', (e) => {
  const dock = document.getElementById('center-fab-dock');
  const menu = document.getElementById('center-fab-menu');
  if (menu && menu.style.display === 'block') {
    if (dock && !dock.contains(e.target)) {
      menu.style.display = 'none';
    }
  }
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebarMinimize();
  loadCustomSKData();
  loadDB();
  renderDate();
  populateSKDropdowns();
  updateAdminLockUI();
  updateSettingsSKCard();
  initDynamicIconAnimations();
  setupOrbitalInputListeners();
  initSKDragAndDrop();

  if (db.guru) {
    refreshSidebarProfile();
    let savedPage = 'dashboard';
    try {
      savedPage = localStorage.getItem('smkn10_active_page') || 'dashboard';
    } catch(_) {}
    if (savedPage === 'pengaturan' && !isAdminAuthenticated()) {
      savedPage = 'dashboard';
    }
    showPage(savedPage);
  } else {
    refreshSidebarProfile();
    activatePage('setup');
  }
  initKelasRow(); // default 1 row in mapel form
});

const DEFAULT_STUDENTS_BY_CLASS = {
  "TJKT-X": ["Aditya Pratama Kolaka", "Annisa Fitriani", "Bambang Irawan", "Dian Permatasari", "Eko Wahyudi", "Fadhil Ramadhan", "Gita Maharani", "Hafiz Al-Farizi"],
  "TJKT-XI": ["Ilham Syahputra", "Jessica Aurelia", "Kevin Prasetya", "Lia Lestari", "Muhammad Rizky", "Nadya Utami", "Rendy Ardiansyah", "Safira Maharani"],
  "TJKT-XII": ["Muh. Ridwan Saputra", "Nadia Salsabila", "Okta Maulana", "Putri Handayani", "Reza Rahardian", "Siti Nurhaliza", "Teguh Prakoso", "Vina Melati"],
  "MPLB-X": ["Rahmat Hidayatullah", "Salsabila Putri Kolaka", "Taufik Qurrahman", "Ulfah Maghfirah", "Vina Panduwinata", "Wahyu Nugroho", "Yuli Anggraini", "Zulfikar Ahmad"],
  "MPLB-XI": ["Zahra Ainun Nisa", "Aldi Taher Saputra", "Bella Shofia", "Citra Kirana", "Dika Mahendra", "Elsa Safitri", "Fajar Nugraha", "Gita Paramita"],
  "MPLB-XII": ["Dimas Anggara", "Endah Retnowati", "Fajar Siddiq", "Gina Sonia", "Hendra Lesmana", "Indah Permata", "Joko Santoso", "Kartika Dewi"],
  "GP-X": ["Andi Baso Pomalaa", "Ayu Kartika Tambang", "Bayu Segara", "Chandra Wibowo", "Dedi Kusnandar", "Elsa Novitasari", "Farhan Tambang", "Gani Prakasa"],
  "GP-XI": ["Firman Utina Geologi", "Gita Gutawa Mining", "Heri Susanto", "Intan Permata Nikel", "Jafar Sodiq", "Kurnia Tambang", "Lukman Hakim", "Maya Anggrek"],
  "GP-XII": ["Joko Widodo Pomalaa", "Kurnia Meiga", "Lestari Indah Wati", "M. Syahrul Gunawan", "Noval Geologi", "Putri Lestari", "Raditya Tambang", "Surya Kencana"]
};

function repairAndSyncHaidilMapel() {
  if (!db.mapel || !Array.isArray(db.mapel)) db.mapel = [];

  let changed = false;

  // 1. Normalize all existing mapel: convert legacy 'TKJ' to 'TJKT'
  db.mapel.forEach(m => {
    if (Array.isArray(m.kelas)) {
      m.kelas.forEach(k => {
        if (k.jurusan === 'TKJ') {
          k.jurusan = 'TJKT';
          changed = true;
        }
      });
    }
  });

  // 2. Disassociate any IPAS, Fisika, or Kimia from Haidil Anwar (they belong to Guru 18: IMNAWAN MELI MUSLAN, S.Si)
  db.mapel.forEach(m => {
    if (/ipas|fisika|kimia/i.test(m.nama || '')) {
      if (m.guruNo === 17 || (m.guruNama && /haidil/i.test(m.guruNama))) {
        m.guruNo = 18;
        m.guruNama = "IMNAWAN MELI MUSLAN, S.Si";
        m.guruCode = "21";
        changed = true;
      }
    }
  });

  // 3. Helper to identify teacher Haidil Anwar (Strictly teacher 17 or name Haidil, NEVER teacher 18)
  const isHaidilTeacher = (m) => {
    if (!m) return false;
    if (/ipas|fisika|kimia/i.test(m.nama || '')) return false;
    const gNo = String(m.guruNo || '');
    const gName = String(m.guruNama || '').toLowerCase();
    const activeName = String(db.guru?.nama || '').toLowerCase();
    const activeNo = String(db.guru?.no || '');
    return gNo === '17' || gName.includes('haidil') || (activeNo === '17' && !gNo) || (activeName.includes('haidil') && !gNo);
  };

  // 4. Ensure Haidil Anwar's 3 official subjects (4 rombel total):
  // Subject 1: Informatika (1 rombel: X MPLB)
  let haidilInf = db.mapel.find(m => isHaidilTeacher(m) && /informatika/i.test(m.nama || ''));
  if (haidilInf) {
    haidilInf.guruNo = 17;
    haidilInf.guruCode = "18";
    if (!Array.isArray(haidilInf.kelas) || !haidilInf.kelas.length || !haidilInf.kelas.some(k => k.jurusan === 'MPLB' && k.tingkat === 'X')) {
      haidilInf.kelas = [{ jurusan: 'MPLB', tingkat: 'X' }];
      changed = true;
    }
  }

  // Subject 2: Projek Kreatif dan Kewirausahaan (PKK) (2 rombel: XI TJKT & XI GP)
  let haidilPKK = db.mapel.find(m => isHaidilTeacher(m) && /pkk|kreatif|kewirausahaan/i.test(m.nama || ''));
  if (haidilPKK) {
    haidilPKK.guruNo = 17;
    haidilPKK.guruCode = "18";
    if (!Array.isArray(haidilPKK.kelas)) haidilPKK.kelas = [];
    haidilPKK.kelas.forEach(k => { if (k.jurusan === 'TKJ') k.jurusan = 'TJKT'; });
    const hasTJKT = haidilPKK.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XI');
    const hasGP = haidilPKK.kelas.some(k => k.jurusan === 'GP' && k.tingkat === 'XI');
    if (!hasTJKT || !hasGP) {
      haidilPKK.kelas = [
        { jurusan: 'TJKT', tingkat: 'XI' },
        { jurusan: 'GP', tingkat: 'XI' }
      ];
      changed = true;
    }
  } else {
    db.mapel.push({
      id: 2049,
      nama: "Projek Kreatif dan Kewirausahaan (PKK)",
      guruNo: 17,
      guruNama: "HAIDIL ANWAR, S.Kom",
      guruCode: "18",
      guruNip: "NIPPK. 1993••••••••28",
      kelas: [
        { jurusan: "TJKT", tingkat: "XI" },
        { jurusan: "GP", tingkat: "XI" }
      ],
      isCustom: false
    });
    changed = true;
  }

  // Subject 3: Perencanaan dan Pengalamatan Jaringan (1 rombel: XII TJKT)
  let haidilNet = db.mapel.find(m => isHaidilTeacher(m) && /perencanaan.*jaringan|pengalamatan/i.test(m.nama || ''));
  if (haidilNet) {
    haidilNet.guruNo = 17;
    haidilNet.guruCode = "18";
    if (!Array.isArray(haidilNet.kelas) || !haidilNet.kelas.length || !haidilNet.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XII')) {
      haidilNet.kelas = [{ jurusan: 'TJKT', tingkat: 'XII' }];
      changed = true;
    }
  }

  // Also ensure student roster for TJKT-XI is present
  if (db.siswa) {
    if (!db.siswa["TJKT-XI"] || !db.siswa["TJKT-XI"].length) {
      if (db.siswa["TKJ-XI"] && db.siswa["TKJ-XI"].length) {
        db.siswa["TJKT-XI"] = [...db.siswa["TKJ-XI"]];
        changed = true;
      } else if (DEFAULT_STUDENTS_BY_CLASS["TJKT-XI"]) {
        db.siswa["TJKT-XI"] = [...DEFAULT_STUDENTS_BY_CLASS["TJKT-XI"]];
        changed = true;
      }
    }
  }

  if (changed) {
    saveDB();
  }
}

function repairAndSyncTJKTMapel() {
  if (!db.mapel || !Array.isArray(db.mapel)) db.mapel = [];
  let changed = false;

  // 1. Correct any swapped mapping between Guru 5 (Asrun Dilla) and Guru 12 (Jumardin):
  // - Guru 5 (Asrun Dilla) holds Keamanan Jaringan in XI TJKT and XII TJKT
  // - Guru 12 (Jumardin) holds Administrasi Sistem Jaringan in XI TJKT and Teknologi Jaringan Nirkabel in XII TJKT
  db.mapel.forEach(m => {
    const isAsrun = m.guruNo === 5 || (m.guruNama && /asrun/i.test(m.guruNama));
    const isJumardin = m.guruNo === 12 || (m.guruNama && /jumardin/i.test(m.guruNama));

    if (isAsrun && /nirkabel/i.test(m.nama || '')) {
      m.guruNo = 12;
      m.guruNama = "JUMARDIN, S.Kom";
      m.guruCode = "11";
      m.nama = "Teknologi Jaringan Nirkabel";
      m.kelas = [{ jurusan: "TJKT", tingkat: "XII" }];
      changed = true;
    }

    if (isJumardin && /keamanan/i.test(m.nama || '')) {
      m.guruNo = 5;
      m.guruNama = "ASRUN DILLA, S.Kom";
      m.guruCode = "07";
      m.nama = "Keamanan Jaringan";
      m.kelas = [
        { jurusan: "TJKT", tingkat: "XI" },
        { jurusan: "TJKT", tingkat: "XII" }
      ];
      changed = true;
    }
  });

  // 2. Ensure Asrun Dilla (Guru 5) has Keamanan Jaringan for both XI TJKT and XII TJKT
  let asrunKJ = db.mapel.find(m => (m.guruNo === 5 || (m.guruNama && /asrun/i.test(m.guruNama))) && /keamanan/i.test(m.nama || ''));
  if (asrunKJ) {
    asrunKJ.guruNo = 5;
    asrunKJ.guruNama = "ASRUN DILLA, S.Kom";
    asrunKJ.guruCode = "07";
    asrunKJ.nama = "Keamanan Jaringan";
    if (!Array.isArray(asrunKJ.kelas)) asrunKJ.kelas = [];
    asrunKJ.kelas.forEach(k => { if (k.jurusan === 'TKJ') k.jurusan = 'TJKT'; });
    const hasXI = asrunKJ.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XI');
    const hasXII = asrunKJ.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XII');
    if (!hasXI || !hasXII) {
      asrunKJ.kelas = [
        { jurusan: 'TJKT', tingkat: 'XI' },
        { jurusan: 'TJKT', tingkat: 'XII' }
      ];
      changed = true;
    }
  } else {
    db.mapel.push({
      id: 2005,
      nama: "Keamanan Jaringan",
      guruNo: 5,
      guruNama: "ASRUN DILLA, S.Kom",
      guruCode: "07",
      guruNip: "",
      kelas: [
        { jurusan: "TJKT", tingkat: "XI" },
        { jurusan: "TJKT", tingkat: "XII" }
      ],
      isCustom: false
    });
    changed = true;
  }

  // 3. Ensure Jumardin (Guru 12) has Administrasi Sistem Jaringan (ASJ) for XI TJKT
  let jumardinASJ = db.mapel.find(m => (m.guruNo === 12 || (m.guruNama && /jumardin/i.test(m.guruNama))) && /administrasi.*jaringan|asj/i.test(m.nama || ''));
  if (jumardinASJ) {
    jumardinASJ.guruNo = 12;
    jumardinASJ.guruNama = "JUMARDIN, S.Kom";
    jumardinASJ.guruCode = "11";
    jumardinASJ.nama = "Administrasi Sistem Jaringan";
    if (!Array.isArray(jumardinASJ.kelas)) jumardinASJ.kelas = [];
    jumardinASJ.kelas.forEach(k => { if (k.jurusan === 'TKJ') k.jurusan = 'TJKT'; });
    if (!jumardinASJ.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XI')) {
      jumardinASJ.kelas = [{ jurusan: 'TJKT', tingkat: 'XI' }];
      changed = true;
    }
  } else {
    db.mapel.push({
      id: 2012,
      nama: "Administrasi Sistem Jaringan",
      guruNo: 12,
      guruNama: "JUMARDIN, S.Kom",
      guruCode: "11",
      guruNip: "",
      kelas: [{ jurusan: "TJKT", tingkat: "XI" }],
      isCustom: false
    });
    changed = true;
  }

  // 4. Ensure Jumardin (Guru 12) has Teknologi Jaringan Nirkabel for XII TJKT
  let jumardinTJNK = db.mapel.find(m => (m.guruNo === 12 || (m.guruNama && /jumardin/i.test(m.guruNama))) && /nirkabel/i.test(m.nama || ''));
  if (jumardinTJNK) {
    jumardinTJNK.guruNo = 12;
    jumardinTJNK.guruNama = "JUMARDIN, S.Kom";
    jumardinTJNK.guruCode = "11";
    jumardinTJNK.nama = "Teknologi Jaringan Nirkabel";
    if (!Array.isArray(jumardinTJNK.kelas)) jumardinTJNK.kelas = [];
    jumardinTJNK.kelas.forEach(k => { if (k.jurusan === 'TKJ') k.jurusan = 'TJKT'; });
    if (!jumardinTJNK.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XII')) {
      jumardinTJNK.kelas = [{ jurusan: 'TJKT', tingkat: 'XII' }];
      changed = true;
    }
  } else {
    db.mapel.push({
      id: 2013,
      nama: "Teknologi Jaringan Nirkabel",
      guruNo: 12,
      guruNama: "JUMARDIN, S.Kom",
      guruCode: "11",
      guruNip: "",
      kelas: [{ jurusan: "TJKT", tingkat: "XII" }],
      isCustom: false
    });
    changed = true;
  }

  // Remove duplicates if any
  const seenMapel = new Set();
  const cleanMapel = [];
  db.mapel.forEach(m => {
    const k = `${m.guruNo}-${m.nama}-${(m.kelas || []).map(x => x.jurusan + x.tingkat).sort().join(',')}`;
    if (!seenMapel.has(k)) {
      seenMapel.add(k);
      cleanMapel.push(m);
    } else {
      changed = true;
    }
  });
  db.mapel = cleanMapel;

  if (changed) {
    saveDB();
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem('smkn10_v2');
    if (raw) db = JSON.parse(raw);
  } catch(_) {}
  db.adminPin    = db.adminPin    || 'admin10';
  db.teacherPins = db.teacherPins || {};
  db.guru        = db.guru        || null;
  db.mapel     = db.mapel     || [];
  db.siswa     = db.siswa     || {};
  db.absensi   = db.absensi   || [];
  db.faces     = db.faces     || {};
  db.absenGuru = db.absenGuru || [];
  db.penilaian = db.penilaian || {};
  db.deletedMapelIds = db.deletedMapelIds || [];

  if (db.guru) {
    db.guru.semester = db.guru.semester || 'Ganjil';
    if (db.guru.ta && (/ganjil/i.test(db.guru.ta) || /genap/i.test(db.guru.ta))) {
      if (/genap/i.test(db.guru.ta)) db.guru.semester = 'Genap';
      else db.guru.semester = 'Ganjil';
      db.guru.ta = db.guru.ta.replace(/ganjil/i, '').replace(/genap/i, '').replace(/[()]/g, '').trim() || '2026/2027';
    }
    if (db.guru.nip && !db.guru.nip.includes('••••')) {
      db.guru.nip = maskNIP(db.guru.nip);
    }
  }

  // Otomatis bersihkan riwayat absensi yang tersimpan dengan status non-Hadir (S, I, A) tetapi masih memiliki jam keluar/masuk
  if (Array.isArray(db.absensi)) {
    let sanitized = false;
    db.absensi.forEach(a => {
      if (Array.isArray(a.records)) {
        a.records.forEach(r => {
          if (r.status !== 'H' && (r.jamMasuk || r.jamKeluar)) {
            r.jamMasuk = '';
            r.jamKeluar = '';
            sanitized = true;
          }
        });
      }
    });
    if (sanitized) saveDB();
  }

  // Seed default students ONLY if not initialized before
  if (!db._studentsInitialized && (!db.siswa || Object.keys(db.siswa).length === 0)) {
    db.siswa = JSON.parse(JSON.stringify(DEFAULT_STUDENTS_BY_CLASS));
    db._studentsInitialized = true;
    saveDB();
  }

  // Ensure mapel data is clean, uses specific course names, and separates multi-subject teachers
  const haidilMissingXITjkt = db.mapel.some(m => {
    const isH = m.guruNo == 17 || /haidil/i.test(m.guruNama || '') || (db.guru && /haidil/i.test(db.guru.nama || ''));
    const isP = /pkk|kewirausahaan/i.test(m.nama || '');
    return isH && isP && !m.kelas?.some(k => (k.jurusan === 'TJKT' || k.jurusan === 'TKJ') && k.tingkat === 'XI');
  });

  const tjktNeedsRepair = db.mapel.some(m => {
    const isAsrun = m.guruNo === 5 || (m.guruNama && /asrun/i.test(m.guruNama));
    const isJumardin = m.guruNo === 12 || (m.guruNama && /jumardin/i.test(m.guruNama));
    return (isAsrun && /nirkabel/i.test(m.nama || '')) || (isJumardin && /keamanan/i.test(m.nama || ''));
  });

  const needsResync = !db.mapel || db.mapel.length === 0 ||
    haidilMissingXITjkt || tjktNeedsRepair ||
    db.mapel.some(m => !m.guruNo && !m.isCustom) ||
    db.mapel.some(m => /produktif\s+(otkp|tkj|gp|mplb)/i.test(m.nama)) ||
    db.mapel.some(m => m.nama.includes('&') || m.nama.includes('/'));
  syncAllSKMapel(needsResync);

  repairAndSyncHaidilMapel();
  repairAndSyncTJKTMapel();
}

function saveDB() { localStorage.setItem('smkn10_v2', JSON.stringify(db)); }

function renderDate() {
  const d = new Date();
  const str = d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('topbar-date').textContent = str;
}

// ─────────────────────────────────────────────
//  ORBITAL OTP VERIFICATION ENGINE (VIDEO SPEC COMPONENT · 89)
// ─────────────────────────────────────────────

function renderOrbitalSlots(container, count, value = '') {
  const el = (typeof container === 'string') ? document.getElementById(container) : container;
  if (!el) return;
  el.scrollLeft = 0;
  const card = el.closest('.orbital-auth-card');
  if (card) card.scrollLeft = 0;
  el.innerHTML = '';
  const currentLen = value ? value.length : 0;
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'orbital-slot';
    slot.dataset.index = i;
    const char = (value && value[i]) ? value[i].toUpperCase() : '';
    slot.textContent = char;
    if (i === currentLen && currentLen < count) {
      slot.classList.add('active');
    }
    el.appendChild(slot);
  }
}

function typeFillOrbital(inputEl, targetVal, onTyped) {
  if (!inputEl || !targetVal) return;
  inputEl.value = '';
  let idx = 0;
  const timer = setInterval(() => {
    if (idx < targetVal.length) {
      inputEl.value += targetVal[idx];
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      idx++;
    } else {
      clearInterval(timer);
      if (typeof onTyped === 'function') {
        setTimeout(onTyped, 120);
      }
    }
  }, 65);
}

function runOrbitalErrorAnimation({ slotsWrapEl, errorEl, message, inputEl }) {
  const slots = slotsWrapEl ? slotsWrapEl.querySelectorAll('.orbital-slot') : [];
  slots.forEach(s => {
    s.classList.remove('verifying', 'active');
    s.classList.add('error');
  });
  if (errorEl) {
    errorEl.style.display = 'block';
    if (message) errorEl.innerHTML = message;
  }
  setTimeout(() => {
    slots.forEach(s => s.classList.remove('error'));
    if (inputEl) {
      inputEl.value = '';
      const card = inputEl.closest('.orbital-auth-card');
      if (card) card.scrollLeft = 0;
      try { inputEl.focus({ preventScroll: true }); } catch(_) { inputEl.focus(); }
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, 750);
}


function runOrbitalVerificationAnimation({
  slotsWrapEl,
  stageEl,
  hubEl,
  checkEl,
  particlesEl,
  itemsWrapEl,
  titleEl,
  value,
  successTitle = 'Verified successfully ✓',
  onFinish
}) {
  const slots = slotsWrapEl ? slotsWrapEl.querySelectorAll('.orbital-slot') : [];
  slots.forEach(s => {
    s.classList.remove('active', 'error');
    s.classList.add('verifying');
  });

  // Short delay so user sees slots glow mint green
  setTimeout(() => {
    if (slotsWrapEl) slotsWrapEl.style.display = 'none';
    if (stageEl) {
      stageEl.style.display = 'flex';
      stageEl.classList.add('active');
    }
    if (hubEl) hubEl.classList.remove('success');
    if (checkEl) checkEl.style.display = 'none';
    if (particlesEl) particlesEl.innerHTML = '';
    if (itemsWrapEl) itemsWrapEl.innerHTML = '';

    const chars = String(value || '').split('');
    const N = Math.max(chars.length, 4);
    const radius = 45; // Matches compact orbit SVG ring r="45"
    const items = [];

    chars.forEach((ch, i) => {
      const item = document.createElement('div');
      item.className = 'orbit-slot-item';
      item.textContent = ch;
      item.style.position = 'absolute';
      item.style.width = '26px';
      item.style.height = '30px';
      item.style.left = 'calc(50% - 13px)';
      item.style.top = 'calc(50% - 15px)';

      const deg_i = (360 * i) / N - 90;
      item.style.transform = `rotate(${deg_i}deg) translate(${radius}px) rotate(${-deg_i}deg)`;
      if (itemsWrapEl) itemsWrapEl.appendChild(item);
      items.push({ el: item, baseDeg: deg_i });
    });

    // 450 degree smooth orbital spin + inward collapse into center hub
    const duration = 920;
    items.forEach(it => {
      const startDeg = it.baseDeg;
      const endDeg = startDeg + 450;
      it.el.animate([
        {
          transform: `rotate(${startDeg}deg) translate(${radius}px) rotate(${-startDeg}deg)`,
          opacity: 1,
          boxShadow: '0 0 16px rgba(46, 230, 168, 0.45)'
        },
        {
          transform: `rotate(${startDeg + 330}deg) translate(${radius}px) rotate(${-(startDeg + 330)}deg)`,
          opacity: 1,
          boxShadow: '0 0 24px rgba(46, 230, 168, 0.75)',
          offset: 0.74
        },
        {
          transform: `rotate(${endDeg}deg) translate(0px) scale(0.12) rotate(${-endDeg}deg)`,
          opacity: 0,
          boxShadow: '0 0 0px rgba(46, 230, 168, 0)',
          offset: 1
        }
      ], {
        duration: duration,
        easing: 'cubic-bezier(0.2, 0.8, 0.22, 1)',
        fill: 'forwards'
      });
    });

    // Center hub bloom, checkmark, and particle burst
    setTimeout(() => {
      if (hubEl) hubEl.classList.add('success');
      if (checkEl) checkEl.style.display = 'block';

      // 16 Neon Particles radiating outwards (matching compact hub)
      if (particlesEl) {
        particlesEl.innerHTML = '';
        for (let k = 0; k < 16; k++) {
          const p = document.createElement('div');
          p.className = 'orbit-particle';
          particlesEl.appendChild(p);
          const angle = (k / 16) * 360 + (Math.random() * 20 - 10);
          const dist = 22 + Math.random() * 20;
          const rad = (angle * Math.PI) / 180;
          const tx = Math.cos(rad) * dist;
          const ty = Math.sin(rad) * dist;
          p.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
          ], {
            duration: 450 + Math.random() * 120,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards'
          });
        }
      }

      if (titleEl) {
        titleEl.classList.add('success');
        titleEl.textContent = successTitle;
      }

      // Finish callback after satisfying visual confirmation
      setTimeout(() => {
        if (typeof onFinish === 'function') onFinish();
      }, 720);

    }, duration + 30);

  }, 220);
}

function setupOrbitalInputListeners() {
  const teacherInput = document.getElementById('switch-teacher-pin');
  if (teacherInput && !teacherInput._orbitalBound) {
    teacherInput._orbitalBound = true;
    teacherInput.addEventListener('input', () => {
      const sel = document.getElementById('switch-teacher-select');
      const sk = window.SMKN10_SK_DATA;
      const t = sk?.teachers?.find(x => String(x.no) === String(sel?.value));
      const expLen = t ? getTeacherExpectedPin(t).length : 6;
      renderOrbitalSlots('teacher-slots-row', expLen, teacherInput.value);
    });
    teacherInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTeacherSwitch();
    });
  }

  const adminInput = document.getElementById('admin-auth-input');
  if (adminInput && !adminInput._orbitalBound) {
    adminInput._orbitalBound = true;
    adminInput.addEventListener('input', () => {
      const pinLen = getAdminPin().length;
      renderOrbitalSlots('admin-slots-row', pinLen, adminInput.value);
    });
    adminInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdminAuth();
    });
  }
}

// ─────────────────────────────────────────────
//  CRYPTOGRAPHIC SECURITY ENGINE & ANTI-BRUTE-FORCE
// ─────────────────────────────────────────────

// 1. Ephemeral runtime secret in private closure memory (never written to web storage)
const _APP_RUNTIME_SECRET = (() => {
  try {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch(_) {
    return 'sec_' + Date.now() + '_' + Math.random().toString(36);
  }
})();

// Cryptographic SHA-256 helper
async function cryptoSha256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(String(message));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch(_) {
    let hash = 5381;
    const str = String(message);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// 2. Anti-Brute-Force Rate Limiter & Lockout Guard
const SecurityGuard = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 60 * 1000, // 60 seconds lockout
  lockoutTimers: {},
  attempts: {
    admin: { count: 0, lockedUntil: 0 },
    teacher: {} // teacherNo -> { count, lockedUntil }
  },

  isLocked(scope, id = 'default') {
    const state = scope === 'admin' ? this.attempts.admin : (this.attempts.teacher[id] || { count: 0, lockedUntil: 0 });
    if (state.lockedUntil > Date.now()) {
      return true;
    }
    if (state.lockedUntil > 0 && Date.now() >= state.lockedUntil) {
      state.count = 0;
      state.lockedUntil = 0;
      this.clearLockoutUI(scope);
    }
    return false;
  },

  getRemainingSeconds(scope, id = 'default') {
    const state = scope === 'admin' ? this.attempts.admin : (this.attempts.teacher[id] || { count: 0, lockedUntil: 0 });
    const diff = state.lockedUntil - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  },

  recordFailure(scope, id = 'default') {
    let state;
    if (scope === 'admin') {
      state = this.attempts.admin;
    } else {
      if (!this.attempts.teacher[id]) this.attempts.teacher[id] = { count: 0, lockedUntil: 0 };
      state = this.attempts.teacher[id];
    }

    state.count++;
    if (state.count >= this.MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + this.LOCKOUT_MS;
      this.startLockoutUI(scope, id);
      return { locked: true, remainingSec: Math.ceil(this.LOCKOUT_MS / 1000) };
    }
    return { locked: false, remainingAttempts: this.MAX_ATTEMPTS - state.count };
  },

  recordSuccess(scope, id = 'default') {
    if (scope === 'admin') {
      this.attempts.admin = { count: 0, lockedUntil: 0 };
      this.clearLockoutUI('admin');
    } else {
      if (!this.attempts.teacher) this.attempts.teacher = {};
      this.attempts.teacher[id] = { count: 0, lockedUntil: 0 };
      this.clearLockoutUI('teacher');
    }
  },

  reset(scope, id = 'default') {
    this.recordSuccess(scope, id);
  },

  startLockoutUI(scope, id) {
    const banner = document.getElementById(`${scope}-lockout-banner`);
    const msg = document.getElementById(`${scope}-lockout-msg`);
    const submitBtn = document.getElementById(scope === 'admin' ? 'btn-admin-auth-submit' : 'btn-teacher-switch-submit');
    const input = document.getElementById(scope === 'admin' ? 'admin-auth-input' : 'switch-teacher-pin');

    if (banner) banner.style.display = 'flex';
    if (submitBtn) submitBtn.disabled = true;
    if (input) input.disabled = true;

    if (this.lockoutTimers[scope]) clearInterval(this.lockoutTimers[scope]);

    const updateMsg = () => {
      const remaining = this.getRemainingSeconds(scope, id);
      if (remaining <= 0) {
        clearInterval(this.lockoutTimers[scope]);
        this.clearLockoutUI(scope);
        return;
      }
      if (msg) msg.textContent = `⛔ Terlalu banyak percobaan salah! Terkunci sementara selama ${remaining} detik.`;
    };

    updateMsg();
    this.lockoutTimers[scope] = setInterval(updateMsg, 1000);
  },

  clearLockoutUI(scope) {
    if (this.lockoutTimers[scope]) {
      clearInterval(this.lockoutTimers[scope]);
      delete this.lockoutTimers[scope];
    }
    const banner = document.getElementById(`${scope}-lockout-banner`);
    const submitBtn = document.getElementById(scope === 'admin' ? 'btn-admin-auth-submit' : 'btn-teacher-switch-submit');
    const input = document.getElementById(scope === 'admin' ? 'admin-auth-input' : 'switch-teacher-pin');

    if (banner) banner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    if (input) {
      input.disabled = false;
      try { input.focus({ preventScroll: true }); } catch(_) { input.focus(); }
    }
  }
};

// 3. Cryptographically Signed Admin Session & Auto-Timeout (15 min)
const ADMIN_SESSION_TIMEOUT_MS = 15 * 60 * 1000;
let _cachedAdminTokenVerified = false;
let _pendingAdminAuthCallback = null;

async function issueAdminSessionToken() {
  const sessionId = (typeof crypto.randomUUID === 'function') 
    ? crypto.randomUUID() 
    : ('sess_' + Date.now() + '_' + Math.random().toString(36));
  const expiresAt = Date.now() + ADMIN_SESSION_TIMEOUT_MS;
  const payload = `${sessionId}|${expiresAt}|smkn10_admin`;
  const signature = await cryptoSha256(payload + '|' + _APP_RUNTIME_SECRET);
  const sessionObj = { sessionId, expiresAt, signature };
  
  try {
    sessionStorage.setItem('smkn10_admin_session', JSON.stringify(sessionObj));
    sessionStorage.setItem('smkn10_admin_auth', 'authenticated');
  } catch(_) {}
  _cachedAdminTokenVerified = true;
  return sessionObj;
}

function verifyAdminSessionSync() {
  try {
    const raw = sessionStorage.getItem('smkn10_admin_session');
    if (!raw) {
      _cachedAdminTokenVerified = false;
      return false;
    }
    const session = JSON.parse(raw);
    if (!session || !session.expiresAt || !session.sessionId || !session.signature) {
      _cachedAdminTokenVerified = false;
      return false;
    }
    if (Date.now() > session.expiresAt) {
      lockAdminSession(true);
      return false;
    }
    return _cachedAdminTokenVerified;
  } catch(_) {
    _cachedAdminTokenVerified = false;
    return false;
  }
}

function isAdminAuthenticated() {
  return verifyAdminSessionSync();
}

function refreshAdminSessionActivity() {
  if (verifyAdminSessionSync()) {
    try {
      const raw = sessionStorage.getItem('smkn10_admin_session');
      if (raw) {
        const session = JSON.parse(raw);
        session.expiresAt = Date.now() + ADMIN_SESSION_TIMEOUT_MS;
        sessionStorage.setItem('smkn10_admin_session', JSON.stringify(session));
      }
    } catch(_) {}
  }
}
window.addEventListener('click', refreshAdminSessionActivity, { passive: true });
window.addEventListener('keydown', refreshAdminSessionActivity, { passive: true });

function getAdminPin() {
  if (db && db.adminPin) return String(db.adminPin);
  return 'admin10';
}

function updateAdminLockUI() {
  const ind = document.getElementById('sidebar-lock-indicator');
  if (ind) {
    if (isAdminAuthenticated()) {
      ind.textContent = '🔓';
      ind.style.color = '#10b981';
      ind.title = 'Sesi Administrator Aktif (Terautentikasi)';
    } else {
      ind.textContent = '🔒';
      ind.style.color = 'inherit';
      ind.title = 'Menu Pengaturan Terkunci';
    }
  }
  updateSettingsSKCard();
}

function openAdminAuthModal(onSuccess) {
  _pendingAdminAuthCallback = (typeof onSuccess === 'function') ? onSuccess : null;
  setupOrbitalInputListeners();

  const modal = document.getElementById('modal-admin-auth');
  const input = document.getElementById('admin-auth-input');
  const err = document.getElementById('admin-auth-error');
  const title = document.getElementById('admin-orbital-title');
  const slotsWrap = document.getElementById('admin-slots-row');
  const stage = document.getElementById('admin-orbit-stage');
  const hub = document.getElementById('admin-orbit-hub');
  const check = document.getElementById('admin-orbit-check');
  const btn = document.getElementById('btn-admin-auth-submit');

  if (err) err.style.display = 'none';
  if (title) {
    title.classList.remove('success');
    title.textContent = 'Kunci Pengaturan Admin';
  }
  if (slotsWrap) slotsWrap.style.display = 'flex';
  if (stage) {
    stage.style.display = 'none';
    stage.classList.remove('active');
  }
  if (hub) hub.classList.remove('success');
  if (check) check.style.display = 'none';
  if (btn) btn.disabled = false;

  const adminPin = getAdminPin();
  const slotCount = Math.max(adminPin.length, 6);

  if (input) {
    input.value = '';
    renderOrbitalSlots(slotsWrap, slotCount, '');
  }

  // Check if locked
  if (SecurityGuard.isLocked('admin')) {
    SecurityGuard.startLockoutUI('admin');
  } else {
    SecurityGuard.clearLockoutUI('admin');
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      const card = document.getElementById('admin-orbital-card');
      if (card) card.scrollLeft = 0;
      if (input && !SecurityGuard.isLocked('admin')) {
        try { input.focus({ preventScroll: true }); } catch(_) { input.focus(); }
      }
    }, 150);
  }
}

function closeAdminAuthModal() {
  const modal = document.getElementById('modal-admin-auth');
  if (modal) modal.style.display = 'none';
  _pendingAdminAuthCallback = null;
}

function focusAdminPinInput() {
  if (SecurityGuard.isLocked('admin')) return;
  const input = document.getElementById('admin-auth-input');
  const card = document.getElementById('admin-orbital-card');
  if (card) card.scrollLeft = 0;
  if (input) {
    try { input.focus({ preventScroll: true }); } catch(_) { input.focus(); }
  }
}

function autoFillAdminPass() {
  showToast('Fitur isi otomatis dinonaktifkan demi keamanan otorisasi administrator.', 'info');
}

async function submitAdminAuth() {
  if (SecurityGuard.isLocked('admin')) {
    const remaining = SecurityGuard.getRemainingSeconds('admin');
    showToast(`Otorisasi admin terkunci sementara (${remaining}s).`, 'err');
    return;
  }

  const input = document.getElementById('admin-auth-input');
  const err = document.getElementById('admin-auth-error');
  const slotsWrap = document.getElementById('admin-slots-row');
  const stage = document.getElementById('admin-orbit-stage');
  const hub = document.getElementById('admin-orbit-hub');
  const check = document.getElementById('admin-orbit-check');
  const particles = document.getElementById('admin-orbit-particles');
  const itemsWrap = document.getElementById('admin-orbit-items');
  const title = document.getElementById('admin-orbital-title');
  const btn = document.getElementById('btn-admin-auth-submit');

  const val = input ? input.value.trim() : '';
  const adminPin = getAdminPin();

  if (val === adminPin) {
    SecurityGuard.recordSuccess('admin');
    await issueAdminSessionToken();

    if (err) err.style.display = 'none';
    if (btn) btn.disabled = true;

    runOrbitalVerificationAnimation({
      slotsWrapEl: slotsWrap,
      stageEl: stage,
      hubEl: hub,
      checkEl: check,
      particlesEl: particles,
      itemsWrapEl: itemsWrap,
      titleEl: title,
      value: val,
      successTitle: 'Akses Terbuka! 🔓',
      onFinish: () => {
        closeAdminAuthModal();
        updateAdminLockUI();
        showToast('Otorisasi Administrator Berhasil! 🔓', 'ok');

        if (_pendingAdminAuthCallback) {
          const cb = _pendingAdminAuthCallback;
          _pendingAdminAuthCallback = null;
          cb();
        } else {
          showPage('pengaturan');
        }
      }
    });
  } else {
    const attemptResult = SecurityGuard.recordFailure('admin');
    if (attemptResult.locked) {
      runOrbitalErrorAnimation({
        slotsWrapEl: slotsWrap,
        errorEl: err,
        message: `⛔ Terlalu banyak percobaan salah! Akun terkunci selama ${attemptResult.remainingSec} detik.`,
        inputEl: input
      });
    } else {
      runOrbitalErrorAnimation({
        slotsWrapEl: slotsWrap,
        errorEl: err,
        message: `⚠️ Sandi Admin salah! Sisa percobaan: ${attemptResult.remainingAttempts} kali.`,
        inputEl: input
      });
    }
  }
}

function lockAdminSession(isExpired = false) {
  _cachedAdminTokenVerified = false;
  try {
    sessionStorage.removeItem('smkn10_admin_session');
    sessionStorage.removeItem('smkn10_admin_auth');
  } catch(_) {}
  updateAdminLockUI();
  if (isExpired) {
    showToast('Sesi Administrator telah kedaluwarsa demi keamanan 🔒', 'info');
  } else {
    showToast('Sesi Administrator telah dikunci kembali 🔒', 'ok');
  }
  if (activePageName === 'pengaturan') {
    showPage('dashboard');
  }
}

function toggleAdminPassVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

function simpanSandiAdmin() {
  const curInp = document.getElementById('admin-current-pin');
  const newInp = document.getElementById('admin-new-pin');
  const confInp = document.getElementById('admin-confirm-pin');
  const statusMsg = document.getElementById('admin-pin-status-msg');

  const curVal = curInp ? curInp.value.trim() : '';
  const newVal = newInp ? newInp.value.trim() : '';
  const confVal = confInp ? confInp.value.trim() : '';

  if (curVal !== getAdminPin()) {
    showToast('Sandi Admin saat ini tidak sesuai!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ Sandi saat ini salah!';
    }
    if (curInp) curInp.focus();
    return;
  }

  if (newVal.length < 4) {
    showToast('Sandi baru minimal 4 karakter!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ Sandi baru minimal 4 karakter!';
    }
    if (newInp) newInp.focus();
    return;
  }

  if (newVal !== confVal) {
    showToast('Konfirmasi sandi baru tidak cocok!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ Konfirmasi sandi tidak cocok!';
    }
    if (confInp) confInp.focus();
    return;
  }

  db.adminPin = newVal;
  saveDB();

  if (curInp) curInp.value = '';
  if (newInp) newInp.value = '';
  if (confInp) confInp.value = '';

  if (statusMsg) {
    statusMsg.style.color = '#10b981';
    statusMsg.textContent = '✅ Sandi Admin berhasil diperbarui!';
    setTimeout(() => { if (statusMsg) statusMsg.textContent = ''; }, 3500);
  }

  showToast('Sandi Administrator berhasil diperbarui! 🔑', 'ok');
}

function simpanPinGuru() {
  if (!db || !db.guru) {
    showToast('Tidak ada akun guru yang sedang aktif.', 'err');
    return;
  }
  const currentTeacherNo = db.guru.no;
  if (!currentTeacherNo) {
    showToast('Hanya guru terdaftar di SK yang dapat menyetel PIN pribadi.', 'err');
    return;
  }
  const sk = window.SMKN10_SK_DATA;
  const t = sk?.teachers?.find(x => String(x.no) === String(currentTeacherNo));
  if (!t) {
    showToast('Data guru tidak ditemukan di SK.', 'err');
    return;
  }

  const curInp = document.getElementById('guru-current-pin');
  const newInp = document.getElementById('guru-new-pin');
  const confInp = document.getElementById('guru-confirm-pin');
  const statusMsg = document.getElementById('guru-pin-status-msg');

  const curVal = curInp ? curInp.value.trim() : '';
  const newVal = newInp ? newInp.value.trim() : '';
  const confVal = confInp ? confInp.value.trim() : '';

  const expectedCurPin = getTeacherExpectedPin(t);
  if (curVal.toLowerCase() !== expectedCurPin.toLowerCase()) {
    showToast('PIN saat ini tidak cocok!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ PIN saat ini salah!';
    }
    if (curInp) curInp.focus();
    return;
  }

  if (newVal.length < 4) {
    showToast('PIN baru minimal 4 karakter!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ PIN baru minimal 4 karakter!';
    }
    if (newInp) newInp.focus();
    return;
  }

  if (newVal !== confVal) {
    showToast('Konfirmasi PIN baru tidak cocok!', 'err');
    if (statusMsg) {
      statusMsg.style.color = '#ef4444';
      statusMsg.textContent = '❌ Konfirmasi PIN tidak cocok!';
    }
    if (confInp) confInp.focus();
    return;
  }

  if (!db.teacherPins) db.teacherPins = {};
  db.teacherPins[currentTeacherNo] = newVal;
  saveDB();

  if (curInp) curInp.value = '';
  if (newInp) newInp.value = '';
  if (confInp) confInp.value = '';

  if (statusMsg) {
    statusMsg.style.color = '#10b981';
    statusMsg.textContent = '✅ PIN Akun Guru berhasil diperbarui!';
    setTimeout(() => { if (statusMsg) statusMsg.textContent = ''; }, 3500);
  }

  showToast(`PIN pribadi ${db.guru.nama || 'guru'} berhasil disimpan! 🔐`, 'ok');
}

// ─────────────────────────────────────────────
//  TEACHER MULTI-USER SWITCHER & PERSONAL PIN
// ─────────────────────────────────────────────
function getTeacherDefaultPin(name) {
  if (!name) return 'gur12@';
  const cleaned = name.replace(/^(dr|dra|drs|ir|prof|h|hj)\.?\s+/i, '').trim();
  const firstWord = cleaned.split(/[\s,.]+/)[0].replace(/[^a-zA-Z]/g, '');
  const prefix = (firstWord.slice(0, 3) || 'gur').toLowerCase();
  return prefix + '12@';
}

function getTeacherExpectedPin(teacher) {
  if (!teacher) return 'gur12@';
  if (db && db.teacherPins && db.teacherPins[teacher.no]) {
    return String(db.teacherPins[teacher.no]);
  }
  return getTeacherDefaultPin(teacher.name);
}

function isTeacherPinValid(teacher, enteredPin) {
  if (!teacher || !enteredPin) return false;
  const pin = enteredPin.trim().toLowerCase();
  
  // 1. Custom PIN set by teacher
  if (db && db.teacherPins && db.teacherPins[teacher.no]) {
    return pin === String(db.teacherPins[teacher.no]).trim().toLowerCase();
  }

  // 2. Standard Default PIN assigned to teacher (e.g. has12@)
  const defPin = getTeacherDefaultPin(teacher.name).toLowerCase();
  if (pin === defPin) return true;

  // Flexible without '@' (e.g. has12)
  const prefix = defPin.replace('12@', '');
  if (pin === prefix + '12') return true;

  return false;
}

function populateTeacherSwitchDropdown() {
  const sel = document.getElementById('switch-teacher-select');
  if (!sel) return;
  const sk = window.SMKN10_SK_DATA;
  if (!sk || !Array.isArray(sk.teachers)) return;

  sel.innerHTML = '<option value="">-- Pilih Nama Guru (24 Guru) --</option>';
  sk.teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = String(t.no);
    opt.textContent = `${t.no}. ${t.name} (${t.mapel || 'Guru'})`;
    sel.appendChild(opt);
  });

  if (db.guru) {
    let currentTeacherNo = db.guru.no;
    if (!currentTeacherNo && db.guru.nama) {
      const match = sk.teachers.find(t => t.name.trim().toLowerCase() === db.guru.nama.trim().toLowerCase());
      if (match) currentTeacherNo = match.no;
    }
    if (currentTeacherNo) {
      sel.value = String(currentTeacherNo);
      onSwitchTeacherSelectChange(currentTeacherNo);
    }
  }
}

function onSwitchTeacherSelectChange(noVal) {
  const preview = document.getElementById('teacher-preview-box');
  const err = document.getElementById('switch-teacher-error');
  const secDesc = document.getElementById('teacher-sec-desc');
  const slotsWrap = document.getElementById('teacher-slots-row');
  const pinInp = document.getElementById('switch-teacher-pin');
  if (err) err.style.display = 'none';

  if (!noVal) {
    if (preview) preview.style.display = 'none';
    if (secDesc) secDesc.textContent = 'Pilih guru terlebih dahulu dari daftar';
    if (slotsWrap) renderOrbitalSlots(slotsWrap, 6, '');
    SecurityGuard.clearLockoutUI('teacher');
    return;
  }

  const sk = window.SMKN10_SK_DATA;
  const t = sk?.teachers?.find(x => String(x.no) === String(noVal));
  if (!t) return;

  if (preview) {
    preview.style.display = 'flex';
    set('switch-preview-name', t.name);
    const maskedNip = maskNIP(t.nip);
    if (maskedNip && maskedNip !== '-') {
      set('switch-preview-nip', `🛡️ ${maskedNip}`);
    } else {
      set('switch-preview-nip', t.jabatan ? `🛡️ ${t.jabatan}` : '🛡️ Guru SMKN 10');
    }
    set('switch-preview-mapel', `Mapel: ${t.mapel || '-'}`);
    const av = document.getElementById('switch-preview-avatar');
    if (av) av.textContent = t.name.charAt(0).toUpperCase();
  }

  if (secDesc) {
    secDesc.textContent = `Masukkan 6-digit PIN rahasia untuk ${t.name}`;
  }

  // Check if this specific teacher account is locked
  if (SecurityGuard.isLocked('teacher', noVal)) {
    SecurityGuard.startLockoutUI('teacher', noVal);
  } else {
    SecurityGuard.clearLockoutUI('teacher');
  }

  const expectedPin = getTeacherExpectedPin(t);
  const slotCount = Math.max(expectedPin.length, 6);
  if (slotsWrap) {
    renderOrbitalSlots(slotsWrap, slotCount, '');
  }
  if (pinInp) {
    pinInp.value = '';
    const card = document.getElementById('teacher-orbital-card');
    if (card) card.scrollLeft = 0;
    if (!SecurityGuard.isLocked('teacher', noVal)) {
      try { pinInp.focus({ preventScroll: true }); } catch(_) { pinInp.focus(); }
    }
  }
}

function openTeacherSwitchModal() {
  setupOrbitalInputListeners();

  const modal = document.getElementById('modal-teacher-switch');
  const pinInp = document.getElementById('switch-teacher-pin');
  const err = document.getElementById('switch-teacher-error');
  const title = document.getElementById('teacher-orbital-title');
  const slotsWrap = document.getElementById('teacher-slots-row');
  const stage = document.getElementById('teacher-orbit-stage');
  const hub = document.getElementById('teacher-orbit-hub');
  const check = document.getElementById('teacher-orbit-check');
  const btn = document.getElementById('btn-teacher-switch-submit');

  if (err) err.style.display = 'none';
  if (title) {
    title.classList.remove('success');
    title.textContent = 'Verifikasi PIN Guru';
  }
  if (slotsWrap) slotsWrap.style.display = 'flex';
  if (stage) {
    stage.style.display = 'none';
    stage.classList.remove('active');
  }
  if (hub) hub.classList.remove('success');
  if (check) check.style.display = 'none';
  if (btn) btn.disabled = false;

  populateTeacherSwitchDropdown();

  const sel = document.getElementById('switch-teacher-select');
  const selNo = sel ? sel.value : '';
  const sk = window.SMKN10_SK_DATA;
  const t = sk?.teachers?.find(x => String(x.no) === String(selNo));
  const expectedLen = t ? getTeacherExpectedPin(t).length : 6;

  if (pinInp) pinInp.value = '';
  renderOrbitalSlots('teacher-slots-row', expectedLen, '');

  if (selNo && SecurityGuard.isLocked('teacher', selNo)) {
    SecurityGuard.startLockoutUI('teacher', selNo);
  } else {
    SecurityGuard.clearLockoutUI('teacher');
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      const card = document.getElementById('teacher-orbital-card');
      if (card) card.scrollLeft = 0;
      if (pinInp && (!selNo || !SecurityGuard.isLocked('teacher', selNo))) {
        try { pinInp.focus({ preventScroll: true }); } catch(_) { pinInp.focus(); }
      }
    }, 150);
  }
}

function closeTeacherSwitchModal() {
  const modal = document.getElementById('modal-teacher-switch');
  if (modal) modal.style.display = 'none';
}

function logoutGuru(event) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }

  if (!db || !db.guru) {
    showToast('Tidak ada akun guru yang sedang aktif.', 'info');
    openTeacherSwitchModal();
    return;
  }

  const guruNama = db.guru.nama || 'Guru Aktif';

  appConfirm(`Apakah Anda yakin ingin <b>Logout (Keluar)</b> dari akun guru <b>${escapeHtml(guruNama)}</b>?<br><br><span style="font-size:12px;color:var(--text-muted)">Seluruh data absensi & penilaian Anda tetap tersimpan dengan aman di sistem.</span>`, () => {
    // 1. Clear active teacher
    db.guru = null;

    // 2. Clear admin session if active
    try {
      sessionStorage.removeItem('smkn10_admin_session');
    } catch(_) {}
    if (typeof _cachedAdminTokenVerified !== 'undefined') {
      _cachedAdminTokenVerified = false;
    }
    updateAdminLockUI();

    // 3. Save database
    saveDB();

    // 4. Update UI to logged-out state
    refreshSidebarProfile();

    // 5. Navigate to setup/welcome page
    activePageName = 'setup';
    try {
      localStorage.setItem('smkn10_active_page', 'setup');
    } catch(_) {}
    activatePage('setup');

    showToast(`Berhasil keluar dari akun ${guruNama}. Sampai jumpa! 👋`, 'ok');

    // 6. Offer modal switch to choose next teacher after brief delay
    setTimeout(() => {
      openTeacherSwitchModal();
    }, 450);
  });
}

function focusTeacherPinInput() {
  const sel = document.getElementById('switch-teacher-select');
  const selNo = sel ? sel.value : '';
  if (selNo && SecurityGuard.isLocked('teacher', selNo)) return;

  const pinInp = document.getElementById('switch-teacher-pin');
  const card = document.getElementById('teacher-orbital-card');
  if (card) card.scrollLeft = 0;
  if (pinInp) {
    try { pinInp.focus({ preventScroll: true }); } catch(_) { pinInp.focus(); }
  }
}

function autoFillTeacherPin() {
  showToast('Fitur isi otomatis dinonaktifkan demi keamanan autentikasi PIN guru.', 'info');
}

function submitTeacherSwitch() {
  const sel = document.getElementById('switch-teacher-select');
  const pinInp = document.getElementById('switch-teacher-pin');
  const err = document.getElementById('switch-teacher-error');
  const slotsWrap = document.getElementById('teacher-slots-row');
  const stage = document.getElementById('teacher-orbit-stage');
  const hub = document.getElementById('teacher-orbit-hub');
  const check = document.getElementById('teacher-orbit-check');
  const particles = document.getElementById('teacher-orbit-particles');
  const itemsWrap = document.getElementById('teacher-orbit-items');
  const title = document.getElementById('teacher-orbital-title');
  const btn = document.getElementById('btn-teacher-switch-submit');

  const selNo = sel ? sel.value : '';
  const enteredPin = pinInp ? pinInp.value.trim() : '';

  if (!selNo) {
    showToast('Pilih nama guru terlebih dahulu!', 'err');
    if (sel) sel.focus();
    return;
  }

  if (SecurityGuard.isLocked('teacher', selNo)) {
    const remaining = SecurityGuard.getRemainingSeconds('teacher', selNo);
    showToast(`Otorisasi akun guru terkunci sementara (${remaining}s).`, 'err');
    return;
  }

  const sk = window.SMKN10_SK_DATA;
  const t = sk?.teachers?.find(x => String(x.no) === String(selNo));
  if (!t) {
    showToast('Data guru tidak ditemukan di SK!', 'err');
    return;
  }

  if (!isTeacherPinValid(t, enteredPin)) {
    const attemptResult = SecurityGuard.recordFailure('teacher', selNo);
    const defPin = getTeacherDefaultPin(t.name);
    if (attemptResult.locked) {
      runOrbitalErrorAnimation({
        slotsWrapEl: slotsWrap,
        errorEl: err,
        message: `⛔ Terlalu banyak percobaan salah! Akun terkunci selama ${attemptResult.remainingSec} detik.`,
        inputEl: pinInp
      });
    } else {
      runOrbitalErrorAnimation({
        slotsWrapEl: slotsWrap,
        errorEl: err,
        message: `⚠️ PIN otorisasi salah! Akses ditolak. Sisa percobaan: ${attemptResult.remainingAttempts} kali.`,
        inputEl: pinInp
      });
    }
    return;
  }

  // Success!
  SecurityGuard.recordSuccess('teacher', selNo);

  // Verified!
  if (err) err.style.display = 'none';
  if (btn) btn.disabled = true;

  runOrbitalVerificationAnimation({
    slotsWrapEl: slotsWrap,
    stageEl: stage,
    hubEl: hub,
    checkEl: check,
    particlesEl: particles,
    itemsWrapEl: itemsWrap,
    titleEl: title,
    value: enteredPin,
    successTitle: 'PIN Terverifikasi! ✓',
    onFinish: () => {
      db.guru = {
        nama: t.name,
        nip: maskNIP(t.nip),
        ta: db.guru?.ta || '2026/2027',
        semester: db.guru?.semester || 'Ganjil',
        code: t.code || '',
        no: t.no
      };
      saveDB();

      refreshSidebarProfile();
      refreshAbMapelOptions();
      refreshRekapMapelOptions();
      renderMapelList();

      if (activePageName === 'setup' || !activePageName) {
        showPage('dashboard');
      } else {
        showPage(activePageName);
      }

      closeTeacherSwitchModal();
      showToast(`Selamat datang, ${t.name}! 👋`, 'ok');
      if (window.SchoolBell) {
        try {
          const d = new Date();
          window.SchoolBell.updateDashboardWidget(d.toTimeString().slice(0, 5), d.getDay());
        } catch(_) {}
      }
    }
  });
}

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
let activePageName = 'dashboard';

function showPage(name) {
  if (!db.guru && name !== 'setup') {
    showToast('Silakan pilih akun guru untuk masuk terlebih dahulu. 👤', 'info');
    openTeacherSwitchModal();
    return;
  }

  // Turn off any active camera when switching views
  try {
    stopStudentQrScanner();
    stopFaceScanner();
    stopTeacherScanner();
    closeFaceEnrollModal();
    closeStudentCardModal();
    closePhotoProofModal();
    closeAdminAuthModal();
    closeTeacherSwitchModal();
  } catch(_) {}

  // Proteksi Akses Menu Pengaturan
  if (name === 'pengaturan' && !isAdminAuthenticated()) {
    openAdminAuthModal(() => {
      showPage('pengaturan');
    });
    return;
  }

  activePageName = name;
  try {
    localStorage.setItem('smkn10_active_page', name);
  } catch(_) {}

  activatePage(name);
  updateAdminLockUI();
  if (name === 'dashboard')   renderDashboard();
  if (name === 'rekap')       refreshRekapMapelOptions();
  if (name === 'mapel')       renderMapelList();
  if (name === 'roster')      renderRosterView();
  if (name === 'pengaturan')  loadPengaturan();
  if (name === 'absensi')     refreshAbMapelOptions();
  if (name === 'siswa')       initSiswaPage();
  if (name === 'kartu')       initKartuPage();
  if (name === 'absen-guru')  initAbsenGuruPage();
  if (name === 'penilaian')   initPenilaianPage();
}

function refreshCurrentPage() {
  loadDB();
  let cur = activePageName || 'dashboard';
  try {
    cur = localStorage.getItem('smkn10_active_page') || activePageName || 'dashboard';
  } catch(_) {}
  if (cur === 'pengaturan' && !isAdminAuthenticated()) {
    cur = 'dashboard';
  }
  showPage(cur);
  showToast('Data halaman berhasil disegarkan! 🔄', 'ok');
}

function activatePage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const targetPage = document.getElementById('page-' + name);
  if (targetPage) targetPage.classList.add('active');
  const nb = document.getElementById('nav-' + name);
  if (nb) nb.classList.add('active');
  const titles = {
    dashboard:'Dashboard', 
    absensi:'Input Absensi & Biometrik', 
    rekap:'Rekap Absensi Siswa',
    'absen-guru':'Presensi Harian Guru (QR Code)',
    kartu:'Kartu Digital Siswa & Guru (QR Code)',
    roster:'Jadwal Pelajaran & Roster SK', 
    mapel:'Mata Pelajaran', 
    siswa:'Data Siswa & Perekaman Wajah', 
    penilaian:'Penilaian Akademik & Rapor Siswa',
    pengaturan:'Pengaturan'
  };
  document.getElementById('page-heading').textContent = titles[name] || '';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─────────────────────────────────────────────
//  SK 2026/2027 INTEGRATION HELPERS
// ─────────────────────────────────────────────
function populateSKDropdowns() {
  const sk = window.SMKN10_SK_DATA;
  if (!sk || !sk.teachers) return;
  
  const opts = sk.teachers.map(t => {
    const code = t.code ? `[Kode ${t.code}] ` : '';
    const mapelShort = t.mapel ? ` (${t.mapel.slice(0, 32)}...)` : '';
    return `<option value="${t.no}">${code}${t.name}${mapelShort}</option>`;
  }).join('');

  const suSel = document.getElementById('su-sk-guru');
  if (suSel) suSel.innerHTML = '<option value="">-- Pilih Guru SMKN 10 Kolaka --</option>' + opts;

  const pgSel = document.getElementById('pg-sk-guru');
  if (pgSel) pgSel.innerHTML = '<option value="">-- Pilih Guru dari SK 2026/2027 --</option>' + opts;

  const rSel = document.getElementById('roster-teacher-select');
  if (rSel) rSel.innerHTML = '<option value="">-- Pilih Guru untuk Disorot --</option>' + opts;
}

function onRosterTeacherChange(noVal) {
  const sk = window.SMKN10_SK_DATA;
  const t = sk?.teachers?.find(x => String(x.no) === String(noVal));
  window._rosterPreviewTeacherNo = t ? t.no : null;
  window._rosterPreviewTeacherCode = t ? t.code : '';
  renderRosterView();
}

function toggleSetupPinVisibility() {
  const inp = document.getElementById('su-pin');
  const btn = document.getElementById('btn-toggle-su-pin');
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}

function onSelectSKGuru(noVal) {
  const sk = window.SMKN10_SK_DATA;
  const pinBox = document.getElementById('su-pin-box');
  const pinInp = document.getElementById('su-pin');
  const pinErr = document.getElementById('su-pin-error');
  if (pinErr) { pinErr.style.display = 'none'; pinErr.textContent = ''; }
  if (pinInp) { pinInp.value = ''; }

  if (!sk || !noVal) {
    if (pinBox) pinBox.style.display = 'none';
    window._selectedTeacherSK = null;
    return;
  }
  const t = sk.teachers.find(x => String(x.no) === String(noVal));
  if (!t) {
    if (pinBox) pinBox.style.display = 'none';
    window._selectedTeacherSK = null;
    return;
  }

  const nameEl = document.getElementById('su-nama');
  const nipEl  = document.getElementById('su-nip');
  const taEl   = document.getElementById('su-ta');
  const semEl  = document.getElementById('su-semester');
  if (nameEl) nameEl.value = t.name;
  if (nipEl)  nipEl.value  = maskNIP(t.nip || '-');
  if (taEl)   taEl.value   = sk.school?.tahun_ajaran || '2026/2027';
  if (semEl)  semEl.value  = sk.school?.semester || 'Ganjil';
  
  window._selectedTeacherSK = t;
  if (pinBox) {
    pinBox.style.display = 'block';
    const hintEl = document.getElementById('su-pin-hint');
    if (hintEl) {
      hintEl.textContent = '🛡️ Masukkan PIN otorisasi rahasia guru untuk verifikasi identitas.';
      hintEl.style.display = 'block';
    }
    setTimeout(() => {
      try { pinInp?.focus(); } catch(_) {}
    }, 120);
  }
}

function onSelectSKGuruSettings(noVal) {
  const sk = window.SMKN10_SK_DATA;
  if (!sk || !noVal) return;
  const t = sk.teachers.find(x => String(x.no) === String(noVal));
  if (!t) return;

  const nameEl = document.getElementById('pg-nama');
  const nipEl  = document.getElementById('pg-nip');
  const taEl   = document.getElementById('pg-ta');
  const semEl  = document.getElementById('pg-semester');
  if (nameEl) nameEl.value = t.name;
  if (nipEl)  nipEl.value  = t.nip || '-';
  if (taEl)   taEl.value   = sk.school?.tahun_ajaran || '2026/2027';
  if (semEl)  semEl.value  = sk.school?.semester || 'Ganjil';
  window._selectedTeacherSK = t;
}

function getTeacherOptionsHTML(includeAllOption = true, allOptionLabel = '-- Tampilkan Semua Mapel (Semua Guru) --', selectedVal = '') {
  const sk = window.SMKN10_SK_DATA;
  let html = '';
  
  if (includeAllOption) {
    html += `<option value="__ALL__" ${selectedVal === '__ALL__' ? 'selected' : ''}>${allOptionLabel}</option>`;
  }

  if (db.guru) {
    const activeCode = db.guru.code || '';
    const isActSel = (!selectedVal || selectedVal === 'ACTIVE');
    html += `<option value="ACTIVE" ${isActSel ? 'selected' : ''}>⭐ [Guru Aktif] ${db.guru.nama} ${activeCode ? `(Kode ${activeCode})` : ''}</option>`;
  }

  if (sk && sk.teachers) {
    html += `<optgroup label="── DAFTAR GURU SK 2026/2027 ──">`;
    sk.teachers.forEach(t => {
      const codeStr = t.code ? `[Kode ${t.code}] ` : '';
      const mapelBrief = t.mapel ? ` (${t.mapel.slice(0, 24)}...)` : '';
      const isSel = (selectedVal && String(selectedVal) === String(t.no)) ? 'selected' : '';
      html += `<option value="${t.no}" ${isSel}>${codeStr}${t.name}${mapelBrief}</option>`;
    });
    html += `</optgroup>`;
  }
  return html;
}

const OFFICIAL_SK_TEACHER_MAPEL = {
  // 1: HAMZAH L, S.Pd (Bhs. Inggris)
  1: [
    { nama: "Bahasa Inggris", classes: ["X MPLB", "XI MPLB", "XII MPLB"] }
  ],
  // 2: NURJAMIL P, S. Pdi. (Pendidikan Agama Islam & Budi Pekerti)
  2: [
    { nama: "Pendidikan Agama dan Budi Pekerti", classes: ["X MPLB", "X TKJ", "X GP", "XI GP", "XII GP"] }
  ],
  // 3: ABDUL AZIS, S. Ag. (Pendidikan Agama Islam & Budi Pekerti)
  3: [
    { nama: "Pendidikan Agama dan Budi Pekerti", classes: ["XI MPLB", "XI TKJ", "XII MPLB", "XII TKJ"] }
  ],
  // 4: NURSAKTI, S.Sos (Guru Produktif MPLB)
  4: [
    { nama: "Konsep Manajemen Perkantoran dan Layanan Bisnis", classes: ["X MPLB"] },
    { nama: "Pengelolaan Kearsipan", classes: ["XI MPLB"] },
    { nama: "Pengelolaan Sarana dan Prasarana", classes: ["XII MPLB"] },
    { nama: "Pendidikan Pancasila", classes: ["XI TKJ"] }
  ],
  // 5: ASRUN DILLA, S.Kom (Kejuruan TJKT)
  5: [
    { nama: "Keamanan Jaringan", classes: ["XI TKJ", "XII TKJ"] }
  ],
  // 6: ZAINAL ASIS, S.Pd (Bahasa Indonesia)
  6: [
    { nama: "Bahasa Indonesia", classes: ["XI MPLB", "XI TKJ", "XII MPLB", "XII TKJ"] }
  ],
  // 7: SUCIATI, S.Pd (Informatika & Matematika dipisah)
  7: [
    { nama: "Informatika", classes: ["X TKJ"] },
    { nama: "Matematika", classes: ["XI MPLB", "XI TKJ", "XI GP", "XII MPLB", "XII TKJ", "XII GP"] }
  ],
  // 8: HASRAWATI, S.Kom (Kejuruan TJKT)
  8: [
    { nama: "Komputer dan Jaringan Dasar", classes: ["X TKJ"] },
    { nama: "Sistem Operasi & Perakitan Komputer", classes: ["X TKJ"] },
    { nama: "Perencanaan dan Pengalamatan Jaringan", classes: ["XI TKJ"] },
    { nama: "Pemasangan dan Konfigurasi Perangkat Jaringan", classes: ["XI TKJ"] }
  ],
  // 9: ISNAWATI, S.Pd (Pendidikan Pancasila)
  9: [
    { nama: "Pendidikan Pancasila", classes: ["X MPLB", "X TKJ", "X GP", "XI GP", "XII MPLB", "XII TKJ", "XII GP"] }
  ],
  // 10: MUSTIKA, S.Pd (Bahasa Indonesia)
  10: [
    { nama: "Bahasa Indonesia", classes: ["X MPLB", "X TKJ", "X GP"] }
  ],
  // 11: YUSNIATI, S.Pd (Bahasa Inggris)
  11: [
    { nama: "Bahasa Inggris", classes: ["X TKJ", "XI TKJ", "XI GP", "XII TKJ", "XII GP"] }
  ],
  // 12: JUMARDIN, S.Kom (Geologi Dasar & Jaringan TJKT dipisah)
  12: [
    { nama: "Dasar-Dasar Geologi & Gambar Teknik", classes: ["X GP"] },
    { nama: "Administrasi Sistem Jaringan", classes: ["XI TKJ"] },
    { nama: "Teknologi Jaringan Nirkabel", classes: ["XII TKJ"] },
    { nama: "Projek Kreatif dan Kewirausahaan (PKK)", classes: ["XII TKJ"] }
  ],
  // 13: NURFADILLAH, S.Pd (Matematika & Informatika dipisah)
  13: [
    { nama: "Matematika", classes: ["X MPLB", "X TKJ", "X GP"] },
    { nama: "Informatika & Gambar Teknik", classes: ["X GP"] }
  ],
  // 14: RATNO KARDJONO, S.Pd (Bahasa Indonesia & Seni Budaya dipisah)
  14: [
    { nama: "Bahasa Indonesia", classes: ["XII GP"] },
    { nama: "Seni Budaya", classes: ["X MPLB", "X TKJ", "X GP", "XI GP"] }
  ],
  // 15: NUR RAHMAT. H (Muatan Lokal)
  15: [
    { nama: "Muatan Lokal", classes: ["X MPLB", "X TKJ", "XI MPLB", "XI TKJ", "XII MPLB", "XII TKJ"] }
  ],
  // 16: SAHRIANI, S.Pd (Produktif MPLB)
  16: [
    { nama: "Dasar-Dasar Manajemen Perkantoran dan Layanan Bisnis", classes: ["X MPLB"] },
    { nama: "Ekonomi Bisnis & Teknologi Perkantoran", classes: ["XI MPLB"] },
    { nama: "Komunikasi di Tempat Kerja", classes: ["XI MPLB"] },
    { nama: "Pengelolaan Humas, Keprotokolan & SDM", classes: ["XII MPLB"] },
    { nama: "Pengelolaan Rapat dan Pertemuan", classes: ["XII MPLB"] }
  ],
  // 17: HAIDIL ANWAR, S.Kom (Informatika, PKK & Jaringan dipisah)
  17: [
    { nama: "Informatika", classes: ["X MPLB"] },
    { nama: "Projek Kreatif dan Kewirausahaan (PKK)", classes: ["XI TJKT", "XI GP"] },
    { nama: "Perencanaan dan Pengalamatan Jaringan", classes: ["XII TJKT"] }
  ],
  // 18: IMNAWAN MELI MUSLAN, S.Si (IPAS, Fisika & Kimia dipisah)
  18: [
    { nama: "Projek IPAS (Ilmu Pengetahuan Alam dan Sosial)", classes: ["X MPLB", "X TKJ"] },
    { nama: "Fisika", classes: ["X GP"] },
    { nama: "Kimia", classes: ["X GP"] }
  ],
  // 19: ANDI RACHMAT RAMADHANI, S.Pd (PJOK)
  19: [
    { nama: "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)", classes: ["X MPLB", "X TKJ", "X GP", "XI MPLB", "XI TKJ", "XI GP", "XII GP"] }
  ],
  // 20: NUR FAJRIANI, S.AP (Produktif MPLB & PKK dipisah)
  20: [
    { nama: "Teknik Dasar Layanan di Bidang MPLB", classes: ["X MPLB"] },
    { nama: "Pengelolaan Administrasi Umum", classes: ["XI MPLB"] },
    { nama: "Pengelolaan Keuangan Sederhana", classes: ["XI MPLB", "XII MPLB"] },
    { nama: "Projek Kreatif dan Kewirausahaan (PKK - MPLB)", classes: ["XII MPLB"] }
  ],
  // 21: JUMAISAH, S.Pd (BK & PKK dipisah)
  21: [
    { nama: "Bimbingan dan Konseling (BK)", classes: ["X MPLB", "X TKJ", "X GP", "XI MPLB", "XI TKJ", "XI GP", "XII MPLB", "XII TKJ", "XII GP"] },
    { nama: "Projek Kreatif dan Kewirausahaan (PKK)", classes: ["XI MPLB", "XII GP"] }
  ],
  // 22: YUDHA SALEHUDDIN, S.T (Kejuruan Geologi Pertambangan)
  22: [
    { nama: "Pemetaan Topografi dan Pemetaan Geologi", classes: ["XI GP", "XII GP"] },
    { nama: "Teknik Eksplorasi dan Teknik Penambangan", classes: ["XI GP", "XII GP"] },
    { nama: "Teknik Peledakan dan Pemboran", classes: ["XI GP", "XII GP"] },
    { nama: "Preparasi Bahan Galian & Geologi Teknik", classes: ["XI GP", "XII GP"] }
  ],
  // 23: RISNA PITRA NATASYAH, S.Pd (Sejarah Indonesia & Bhs Inggris dipisah)
  23: [
    { nama: "Sejarah Indonesia", classes: ["X MPLB", "X TKJ", "X GP", "XI MPLB", "XI TKJ", "XI GP"] },
    { nama: "Bahasa Inggris", classes: ["X GP"] }
  ],
  // 24: ZULFIKAR, S.Pd (Bahasa Indonesia)
  24: [
    { nama: "Bahasa Indonesia", classes: ["X MPLB", "X TKJ", "X GP"] }
  ]
};

function syncAllSKMapel(force = false) {
  const sk = window.SMKN10_SK_DATA;
  if (!sk || !sk.teachers) return;

  const hasGenericNames = db.mapel.some(m =>
    /produktif\s+(otkp|tkj|gp|mplb)/i.test(m.nama) ||
    m.nama.includes('&') || m.nama.includes('/')
  );
  const allTeachersCovered = sk.teachers.every(t => db.mapel.some(m => m.guruNo === t.no));

  if (force || !allTeachersCovered || hasGenericNames) {
    const customMapel = db.mapel.filter(m => m.isCustom);
    const newMapelList = [];
    let nextId = 2001;

    sk.teachers.forEach(t => {
      let defs = OFFICIAL_SK_TEACHER_MAPEL[t.no];
      if (!defs) {
        defs = [{
          nama: t.mapel || "Mata Pelajaran",
          classes: Object.keys(t.classes_taught || {})
        }];
      } else if (!Array.isArray(defs)) {
        defs = [defs];
      }

      defs.forEach(def => {
        const classes = [];
        (def.classes || []).forEach(cStr => {
          const parts = cStr.trim().split(/\s+/);
          if (parts.length >= 2) {
            const tingkat = parts[0];
            let jurusan = parts.slice(1).join(' ');
            if (jurusan === 'TKJ') jurusan = 'TJKT';
            classes.push({ jurusan, tingkat });
          }
        });

        if (db.deletedMapelIds && db.deletedMapelIds.includes(String(nextId))) {
          nextId++;
          return;
        }

        newMapelList.push({
          id: nextId++,
          nama: def.nama,
          guruNo: t.no,
          guruNama: t.name,
          guruCode: t.code || '',
          guruNip: t.nip || '',
          kelas: classes,
          isCustom: false
        });
      });
    });

    db.mapel = [...newMapelList, ...customMapel];
    saveDB();
  }
}

function getFilteredMapelForTeacher(selectedTeacherVal) {
  repairAndSyncHaidilMapel();
  repairAndSyncTJKTMapel();

  if (selectedTeacherVal === '__ALL__') {
    return [...db.mapel];
  }

  const sk = window.SMKN10_SK_DATA;
  let targetTeacher = null;

  if (!selectedTeacherVal || selectedTeacherVal === 'ACTIVE') {
    if (db.guru) {
      if (db.guru.no && sk?.teachers) {
        targetTeacher = sk.teachers.find(t => t.no === db.guru.no);
      }
      if (!targetTeacher && db.guru.nama && sk?.teachers) {
        const norm = db.guru.nama.trim().toLowerCase();
        targetTeacher = sk.teachers.find(t => t.name.trim().toLowerCase() === norm);
      }
      if (!targetTeacher) {
        return db.mapel.filter(m => m.guruNama && m.guruNama.trim().toLowerCase() === db.guru.nama.trim().toLowerCase());
      }
    }
  } else {
    const noNum = parseInt(selectedTeacherVal);
    if (sk?.teachers) {
      targetTeacher = sk.teachers.find(t => t.no === noNum);
    }
  }

  if (!targetTeacher) return [];

  // Match strictly by teacher number or name
  return db.mapel.filter(m => {
    // Explicit protection: Haidil Anwar (teacher 17) ONLY teaches Informatika, PKK, and Perencanaan Jaringan (NO IPAS/Fisika/Kimia)
    if (/haidil/i.test(targetTeacher.name) || targetTeacher.no === 17) {
      if (/ipas|fisika|kimia/i.test(m.nama || '')) return false;
      if (m.guruNo != null && String(m.guruNo) === '18') return false;
      if (m.guruNo != null && String(m.guruNo) === '17') return true;
      if (m.guruNama && /haidil/i.test(m.guruNama)) return true;
      return false;
    }

    if (m.guruNo != null && String(m.guruNo) === String(targetTeacher.no)) return true;
    if (m.guruNama && m.guruNama.trim().toLowerCase() === targetTeacher.name.trim().toLowerCase()) return true;
    return false;
  });
}

function normalizeTeacherName(name) {
  if (!name) return '';
  return name.trim().toLowerCase()
    .replace(/[,.]/g, ' ')
    .replace(/\b(s pd|spd|m pd|mpd|s pdi|spdi|s kom|skom|st|se|s si|ssi|dra|dr)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTargetTeacherFromVal(val) {
  if (val === '__ALL__') return null; // Admin: Semua Guru
  const sk = window.SMKN10_SK_DATA;
  if (!val || val === 'ACTIVE') {
    if (!db.guru) return null;
    let t = null;
    if (db.guru.no && sk?.teachers) {
      t = sk.teachers.find(x => x.no === db.guru.no);
    }
    if (!t && db.guru.nama && sk?.teachers) {
      const norm = normalizeTeacherName(db.guru.nama);
      t = sk.teachers.find(x => normalizeTeacherName(x.name) === norm);
    }
    return {
      nama: db.guru.nama,
      nip: db.guru.nip || t?.nip || '',
      code: db.guru.code || t?.code || '',
      no: db.guru.no || t?.no || null
    };
  }
  const noNum = parseInt(val);
  if (sk?.teachers) {
    const t = sk.teachers.find(x => x.no === noNum);
    if (t) {
      return {
        nama: t.name,
        nip: t.nip || '',
        code: t.code || '',
        no: t.no
      };
    }
  }
  return db.guru || null;
}

function isSessionBelongingToTeacher(session, teacherObj) {
  if (!session || !teacherObj) return false;

  const tNama = (teacherObj.nama || teacherObj.name || '').trim();
  const tNip  = (teacherObj.nip || '').trim();
  const sNama = (session.namaGuru || '').trim();
  const sNip  = (session.nipGuru || '').trim();

  // 1. Direct NIP Match (if both valid and not dummy '-')
  if (tNip && tNip !== '-' && sNip && sNip !== '-' && sNip === tNip) {
    return true;
  }

  // 2. Direct Name Match
  if (sNama && tNama) {
    const normS = normalizeTeacherName(sNama);
    const normT = normalizeTeacherName(tNama);
    if (normS && normT) {
      if (normS === normT || normS.includes(normT) || normT.includes(normS)) {
        return true;
      }
      // If session explicitly has a teacher name and it DOES NOT match target teacher,
      // it was taught by a different teacher
      return false;
    }
  }

  // 3. If session does not have namaGuru, match via mapelId in db.mapel
  if (session.mapelId) {
    const mapel = (db.mapel || []).find(m => m.id === session.mapelId);
    if (mapel) {
      if (teacherObj.no != null && mapel.guruNo != null && String(mapel.guruNo) === String(teacherObj.no)) {
        return true;
      }
      if (mapel.guruNama && tNama) {
        const normM = normalizeTeacherName(mapel.guruNama);
        const normT = normalizeTeacherName(tNama);
        if (normM && normT && (normM === normT || normM.includes(normT) || normT.includes(normM))) {
          return true;
        }
      }
    }
  }

  // 4. Match via teacher's assigned subjects list (getFilteredMapelForTeacher)
  const teacherMapels = getFilteredMapelForTeacher(teacherObj.no || 'ACTIVE');
  if (session.mapelId && teacherMapels.some(m => m.id === session.mapelId)) {
    return true;
  }
  if (session.mapelNama) {
    const sMapelNorm = session.mapelNama.trim().toLowerCase();
    if (teacherMapels.some(m => m.nama && m.nama.trim().toLowerCase() === sMapelNorm)) {
      return true;
    }
  }

  return false;
}

function saveSetup() {
  try {
    const nama = v('su-nama'), nip = v('su-nip');
    let ta = (v('su-ta') || '2026/2027').trim();
    const semester = document.getElementById('su-semester')?.value || 'Ganjil';
    if (!nama) { showToast('Pilih nama guru terlebih dahulu.', 'err'); return; }

    ta = ta.replace(/ganjil/i, '').replace(/genap/i, '').replace(/[()]/g, '').trim() || '2026/2027';
    
    const selNo = document.getElementById('su-sk-guru')?.value;
    const sk = window.SMKN10_SK_DATA;
    let t = window._selectedTeacherSK;
    if (selNo && sk?.teachers) {
      t = sk.teachers.find(x => String(x.no) === String(selNo));
    }
    if (!t && nama && sk?.teachers) {
      const norm = normalizeTeacherName(nama);
      t = sk.teachers.find(x => normalizeTeacherName(x.name) === norm);
    }

    // 🛡️ PROTEKSI KEAMANAN: Wajib verifikasi PIN rahasia jika memilih Akun Guru dari SK
    if (t) {
      if (SecurityGuard.isLocked('teacher', t.no)) {
        const remaining = SecurityGuard.getRemainingSeconds('teacher', t.no);
        const errMsg = `⛔ Akun guru ini terkunci sementara (${remaining}s) karena terlalu banyak percobaan salah.`;
        const pinErr = document.getElementById('su-pin-error');
        if (pinErr) { pinErr.textContent = errMsg; pinErr.style.display = 'block'; }
        showToast(errMsg, 'err');
        return;
      }

      const pinInp = document.getElementById('su-pin');
      const pinVal = (pinInp ? pinInp.value : '').trim();
      const pinErr = document.getElementById('su-pin-error');

      if (!pinVal) {
        const errMsg = '⚠️ Masukkan PIN rahasia guru untuk memverifikasi identitas Anda!';
        if (pinErr) { pinErr.textContent = errMsg; pinErr.style.display = 'block'; }
        if (pinInp) pinInp.focus();
        showToast(errMsg, 'err');
        return;
      }

      if (!isTeacherPinValid(t, pinVal)) {
        const attemptResult = SecurityGuard.recordFailure('teacher', t.no);
        const defPin = getTeacherDefaultPin(t.name);
        let errMsg = '';
        if (attemptResult.locked) {
          errMsg = `⛔ Terlalu banyak percobaan salah! Akun terkunci selama ${attemptResult.remainingSec} detik.`;
        } else {
          errMsg = `⚠️ PIN otorisasi salah! Akses ditolak. Sisa percobaan: ${attemptResult.remainingAttempts} kali.`;
        }
        if (pinErr) { pinErr.textContent = errMsg; pinErr.style.display = 'block'; }
        if (pinInp) { pinInp.value = ''; pinInp.focus(); }
        showToast(errMsg, 'err');
        return;
      }

      // Reset lockout counter upon successful login
      SecurityGuard.recordSuccess('teacher', t.no);
      if (pinErr) { pinErr.style.display = 'none'; }
    }

    db.guru = { 
      nama, 
      nip: maskNIP(nip), 
      ta, 
      semester,
      code: t?.code || '',
      no:   t?.no   || null
    };

    saveDB();
    refreshSidebarProfile();
    try { refreshAbMapelOptions(); } catch(e) { console.warn(e); }
    try { refreshRekapMapelOptions(); } catch(e) { console.warn(e); }
    try { renderMapelList(); } catch(e) { console.warn(e); }
    if (window.SchoolBell) {
      try {
        const d = new Date();
        window.SchoolBell.updateDashboardWidget(d.toTimeString().slice(0, 5), d.getDay());
      } catch(_) {}
    }
    showToast(`Login berhasil! Selamat datang, ${nama} 🎉`, 'ok');
    setTimeout(() => showPage('dashboard'), 400);
  } catch (err) {
    console.error('saveSetup error:', err);
    showToast('Terjadi kesalahan saat masuk: ' + err.message, 'err');
  }
}

function refreshSidebarProfile() {
  const topLogout = document.getElementById('btn-topbar-logout');
  const stripLogout = document.getElementById('btn-guru-logout');
  const fabLogout = document.getElementById('fab-item-logout');
  const pillSwitch = document.getElementById('guru-switch-pill-text');
  const topBtn = document.getElementById('topbar-teacher-btn-name');
  const gStrip = document.getElementById('guru-strip');

  if (!db.guru) {
    set('g-nama', 'Belum Masuk');
    set('g-nip', 'Silakan pilih akun guru');
    set('g-initials', '👤');
    set('sidebar-ta', '');

    if (topBtn) topBtn.textContent = 'Pilih Guru ▾';
    if (topLogout) topLogout.style.display = 'none';
    if (stripLogout) stripLogout.style.display = 'none';
    if (fabLogout) fabLogout.style.display = 'none';
    if (pillSwitch) pillSwitch.textContent = 'Masuk Guru';
    if (gStrip) {
      gStrip.setAttribute('data-guru-name', 'Belum Masuk');
      gStrip.title = 'Klik untuk memilih akun guru (24 Guru)';
    }
    return;
  }

  set('g-nama', db.guru.nama);
  set('g-nip',  db.guru.nip ? (db.guru.nip.includes('••••') ? db.guru.nip : maskNIP(db.guru.nip)) : 'NIP Disamarkan 🛡️');
  set('g-initials', db.guru.nama.trim().charAt(0).toUpperCase());
  const semText = db.guru.semester ? ` · ${db.guru.semester}` : '';
  set('sidebar-ta', db.guru.ta ? 'T.A. ' + db.guru.ta + semText : '');

  if (topBtn) {
    const shortName = db.guru.nama.split(' ')[0].replace(/[,.]/g, '') || 'Guru';
    topBtn.textContent = `${shortName} ▾`;
  }
  if (topLogout) topLogout.style.display = 'inline-flex';
  if (stripLogout) stripLogout.style.display = 'inline-flex';
  if (fabLogout) fabLogout.style.display = 'flex';
  if (pillSwitch) pillSwitch.textContent = 'Ganti Akun';

  if (gStrip) {
    gStrip.setAttribute('data-guru-name', db.guru.nama);
    gStrip.title = `Akun Aktif: ${db.guru.nama} (Klik untuk berganti akun)`;
  }
}

// ─────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────
function renderDashboard() {
  if (!db.guru) return;
  set('d-nama', db.guru.nama.split(' ')[0]);

  // KPI
  set('k-mapel', db.mapel.length);
  let totalSiswa = 0;
  Object.values(db.siswa).forEach(a => totalSiswa += a.length);
  set('k-siswa', totalSiswa);

  const mySessions = (db.absensi || []).filter(a => isSessionBelongingToTeacher(a, db.guru));
  set('k-pertemuan', mySessions.length);

  const today = todayStr();
  let hadirHariIni = 0;
  mySessions.filter(a => a.tanggal === today).forEach(a => {
    hadirHariIni += a.records.filter(r => r.status === 'H').length;
  });
  set('k-hadir', hadirHariIni);

  // Today's schedule widget with teacher exclusive color
  const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  const curDay = dayNames[new Date().getDay()] || 'SENIN';
  const activeDay = curDay === 'MINGGU' ? 'SENIN' : curDay;
  const sk = window.SMKN10_SK_DATA;
  let activeTeacher = null;
  if (db.guru) {
    if (db.guru.code && sk && sk.teachers) {
      activeTeacher = sk.teachers.find(t => String(t.code) === String(db.guru.code));
    }
    if (!activeTeacher && db.guru.nama && sk && sk.teachers) {
      const firstW = db.guru.nama.trim().split(' ')[0].toUpperCase();
      activeTeacher = sk.teachers.find(t => t.name.toUpperCase().includes(firstW));
    }
  }
  if (!activeTeacher && sk && sk.teachers && sk.teachers.length > 0) activeTeacher = sk.teachers[0];

  const wEl = document.getElementById('dash-schedule-widget');
  if (wEl && activeTeacher && sk && sk.roster) {
    const tCode = activeTeacher.code;
    const theme = (sk.getTeacherTheme) ? sk.getTeacherTheme(tCode) : { primary: '#1c3d2c', gradient: 'linear-gradient(135deg, #1c3d2c 0%, #2f6142 100%)', bgLight: '#eaf3ec', border: '#2f6142', badgeBg: '#cce3d3', badgeText: '#1c3d2c' };
    const todaySlots = [];
    sk.roster.filter(s => s.day === activeDay).forEach(slot => {
      Object.entries(slot.classes).forEach(([cName, cellVal]) => {
        if (cellVal && (cellVal === tCode || cellVal.startsWith(tCode + '-'))) {
          const mCode = cellVal.includes('-') ? cellVal.split('-')[1] : '';
          const mName = sk.subjects && sk.subjects[mCode] ? sk.subjects[mCode].name : cellVal;
          todaySlots.push({
            jam: slot.jam,
            time: slot.time,
            className: cName,
            subjectName: mName,
            code: cellVal
          });
        }
      });
    });

    wEl.innerHTML = `
      <div style="background:${theme.bgLight};border:2px solid ${theme.border};border-radius:10px;padding:16px 20px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:10px;background:${theme.gradient};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;box-shadow:0 3px 6px rgba(0,0,0,0.15)">
              ${activeTeacher.code}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="background:${theme.primary};color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px">KODE GURU: ${activeTeacher.code}</span>
                <span style="font-size:12px;font-weight:700;color:${theme.primary}">Hari ${activeDay}</span>
              </div>
              <h3 style="margin:2px 0 0 0;font-size:16px;font-weight:800;color:#1c3d2c">
                Jadwal Mengajar Anda: ${activeTeacher.name}
              </h3>
            </div>
          </div>
          <button class="btn-primary" onclick="showPage('roster')" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:7px 14px;background:${theme.primary};border-color:${theme.border}">
            📅 Buka Jadwal &amp; Roster Lengkap →
          </button>
        </div>

        ${todaySlots.length === 0 ? `
          <div class="dash-schedule-marquee-wrap" style="display:flex;align-items:center;background:#ffffff;border:1.5px dashed ${theme.border};border-radius:8px;padding:9px 14px;box-shadow:0 2px 6px rgba(0,0,0,0.03);overflow:hidden">
            <div style="flex-shrink:0;margin-right:12px;display:inline-flex;align-items:center;gap:6px;background:${theme.badgeBg};color:${theme.badgeText};font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;letter-spacing:0.5px">
              <span>☕</span> INFO JADWAL
            </div>
            <div style="flex:1;overflow:hidden;min-width:0">
              <marquee behavior="scroll" direction="left" scrollamount="6" onmouseover="this.stop()" onmouseout="this.start()" style="font-size:13px;font-weight:600;color:#1e293b;vertical-align:middle;display:block">
                ☕ Anda tidak memiliki jam mengajar tatap muka di kelas pada hari <strong style="color:${theme.primary}">${activeDay}</strong>. Silakan periksa agenda mingguan di menu <strong>Jadwal &amp; Roster</strong> SMKN 10 Kolaka. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;✨ Tetap semangat dalam menjalankan tugas dan koordinasi pembelajaran!
              </marquee>
            </div>
          </div>
        ` : `
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${todaySlots.map(s => `
              <div style="background:#ffffff;border:1.5px solid ${theme.border};border-radius:8px;padding:10px 14px;min-width:200px;flex:1;box-shadow:0 2px 5px rgba(0,0,0,0.04)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="background:${theme.badgeBg};color:${theme.badgeText};font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px">
                    Jam ${s.jam} (${s.time})
                  </span>
                  <strong style="color:${theme.primary};font-size:12px">📍 ${s.className}</strong>
                </div>
                <div style="font-weight:800;font-size:12px;color:#1c3d2c;line-height:1.3">
                  ${s.subjectName}
                </div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">
                  Kode: <strong>${s.code}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // Recent
  const el = document.getElementById('dash-recent');
  const myRecentSessions = (db.absensi || []).filter(a => isSessionBelongingToTeacher(a, db.guru));
  const recent = [...myRecentSessions].reverse().slice(0, 5);
  if (!recent.length) { el.innerHTML = '<p class="empty">Belum ada data absensi.</p>'; return; }
  el.innerHTML = recent.map(a => {
    const H = a.records.filter(r => r.status === 'H').length;
    const tot = a.records.length;
    const pct = tot ? Math.round(H / tot * 100) : 0;
    const clr = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
    return `<div class="recent-item">
      <div>
        <div class="ri-title">${a.mapelNama} – ${a.jurusan} ${a.tingkat}</div>
        <div class="ri-meta">Pertemuan ke-${a.pertemuan} · ${tglPendek(a.tanggal)}</div>
      </div>
      <span class="ri-pct" style="color:${clr}">${H}/${tot} (${pct}%)</span>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
//  MATA PELAJARAN
// ─────────────────────────────────────────────
let kelasRowCount = 0;

function initKelasRow() {
  document.getElementById('mp-kelas-list').innerHTML = '';
  kelasRowCount = 0;
  addKelasRow();
}

function addKelasRow() {
  kelasRowCount++;
  const id = kelasRowCount;
  const div = document.createElement('div');
  div.className = 'kelas-row';
  div.id = 'krow-' + id;
  div.innerHTML = `
    <select id="krow-j-${id}" onchange="updateKrowTingkat(${id})">
      <option value="">-- Jurusan --</option>
      <option value="TJKT">TJKT</option>
      <option value="MPLB">MPLB</option>
      <option value="GP">GP</option>
    </select>
    <select id="krow-t-${id}">
      <option value="">-- Tingkat --</option>
    </select>
    ${id > 1 ? `<button class="kelas-row-del" onclick="removeKelasRow(${id})">×</button>` : ''}
  `;
  document.getElementById('mp-kelas-list').appendChild(div);
}

function removeKelasRow(id) {
  const el = document.getElementById('krow-' + id);
  if (el) el.remove();
}

function updateKrowTingkat(id) {
  const j = document.getElementById('krow-j-' + id).value;
  const sel = document.getElementById('krow-t-' + id);
  sel.innerHTML = '<option value="">-- Tingkat --</option>';
  if (j && JURUSAN_TINGKAT[j]) {
    JURUSAN_TINGKAT[j].forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);
  }
}

function populateMpGuruDropdowns() {
  const addSel = document.getElementById('mp-guru');
  if (addSel) {
    const curAdd = addSel.value || 'ACTIVE';
    addSel.innerHTML = getTeacherOptionsHTML(false, '', curAdd);
  }

  const filterSel = document.getElementById('mp-filter-guru');
  if (filterSel) {
    const curFilter = filterSel.value || 'ACTIVE';
    filterSel.innerHTML = getTeacherOptionsHTML(true, '-- Tampilkan Semua Guru --', curFilter);
  }
}

function simpanMapel() {
  const nama = v('mp-nama').trim();
  if (!nama) { showToast('Nama mata pelajaran wajib diisi.','err'); return; }

  const guruVal = document.getElementById('mp-guru')?.value || 'ACTIVE';
  let guruNo   = null;
  let guruNama = db.guru?.nama || '';
  let guruCode = db.guru?.code || '';
  let guruNip  = db.guru?.nip  || '';

  if (guruVal === 'ACTIVE' && db.guru) {
    guruNo   = db.guru.no || null;
    guruNama = db.guru.nama;
    guruCode = db.guru.code || '';
    guruNip  = db.guru.nip || '';
  } else if (guruVal !== 'ACTIVE') {
    const sk = window.SMKN10_SK_DATA;
    const t = sk?.teachers?.find(x => String(x.no) === String(guruVal));
    if (t) {
      guruNo   = t.no;
      guruNama = t.name;
      guruCode = t.code || '';
      guruNip  = t.nip  || '';
    }
  }

  // collect kelas rows
  const kelas = [];
  document.querySelectorAll('.kelas-row').forEach(row => {
    const jEl = row.querySelector('select:nth-child(1)');
    const tEl = row.querySelector('select:nth-child(2)');
    if (jEl && tEl && jEl.value && tEl.value) {
      kelas.push({ jurusan: jEl.value, tingkat: tEl.value });
    }
  });

  if (!kelas.length) { showToast('Tambahkan minimal 1 kelas yang diampu.','err'); return; }

  db.mapel.push({ 
    id: Date.now(), 
    nama, 
    guruNo,
    guruNama,
    guruCode,
    guruNip,
    kelas,
    isCustom: true
  });
  saveDB();
  showToast(`Mapel "${nama}" berhasil disimpan untuk ${guruNama || 'guru'}.`,'ok');
  document.getElementById('mp-nama').value = '';
  initKelasRow();
  renderMapelList();
  refreshAbMapelOptions();
}

function renderMapelList() {
  populateMpGuruDropdowns();
  const el = document.getElementById('mp-list-body');
  if (!el) return;

  const filterVal = document.getElementById('mp-filter-guru')?.value || 'ACTIVE';
  const filtered = getFilteredMapelForTeacher(filterVal);

  let teacherLabel = 'Semua Guru';
  if (filterVal === 'ACTIVE' && db.guru) {
    teacherLabel = db.guru.nama;
  } else if (filterVal !== '__ALL__') {
    const sk = window.SMKN10_SK_DATA;
    const t = sk?.teachers?.find(x => String(x.no) === String(filterVal) || x.name === filterVal);
    if (t) teacherLabel = t.name;
  }

  if (!filtered.length) { 
    el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)">
      <p class="empty" style="margin-bottom:8px">Belum ada mata pelajaran terdaftar untuk <strong>${teacherLabel}</strong>.</p>
      <small>Gunakan filter <em>"-- Tampilkan Semua Guru --"</em> atau tambahkan mapel baru di form atas.</small>
    </div>`; 
    return; 
  }

  el.innerHTML = filtered.map(mp => `
    <div class="mp-card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.03)">
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div class="mp-name" style="font-weight:800;font-size:14px;color:#1c3d2c">📖 ${mp.nama}</div>
          ${mp.guruNama ? `<span class="badge" style="background:#eaf3ec;color:#1c3d2c;font-size:11px;font-weight:700;border:1px solid #cce3d3">👤 ${mp.guruNama} ${mp.guruCode ? `[Kode ${mp.guruCode}]` : ''}</span>` : ''}
        </div>
        <div class="mp-kelas" style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
          ${mp.kelas.map(k => `<span class="kelas-tag" style="background:#f1f5f9;color:#334155;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600">${k.jurusan} – ${k.tingkat}</span>`).join('')}
        </div>
      </div>
      <button class="mp-del" onclick="hapusMapel(${mp.id})" title="Hapus" style="background:none;border:none;cursor:pointer;font-size:16px;padding:6px;color:#ef4444">🗑️</button>
    </div>
  `).join('');
}

function syncAllSKMapelPrompt() {
  if (confirm('Sinkronkan seluruh mata pelajaran & kelas dari SK Pembagian Tugas Mengajar 2026/2027 untuk SEMUA guru?')) {
    syncAllSKMapel(true);
    renderMapelList();
    refreshAbMapelOptions();
    showToast('Seluruh mata pelajaran dari SK 2026/2027 berhasil disinkronkan! 🎉', 'ok');
  }
}

function hapusMapel(id) {
  const mp = (db.mapel || []).find(m => String(m.id) === String(id));
  const nama = mp ? mp.nama : 'mata pelajaran ini';
  appConfirm(`Hapus mata pelajaran "${nama}"?`, () => {
    db.deletedMapelIds = db.deletedMapelIds || [];
    if (!db.deletedMapelIds.includes(String(id))) {
      db.deletedMapelIds.push(String(id));
    }
    db.mapel = (db.mapel || []).filter(m => String(m.id) !== String(id));
    saveDB();
    renderMapelList();
    refreshAbMapelOptions();
    showToast(`Mata pelajaran "${nama}" berhasil dihapus.`, 'ok');
  });
}

// ─────────────────────────────────────────────
//  INPUT ABSENSI
// ─────────────────────────────────────────────
function populateAbGuruDropdown() {
  const sel = document.getElementById('ab-guru');
  if (!sel) return;
  const curVal = sel.value || 'ACTIVE';
  sel.innerHTML = getTeacherOptionsHTML(true, '-- Tampilkan Semua Mapel (Semua Guru) --', curVal);
}

function onAbGuruChange() {
  refreshAbMapelOptions();
}

function refreshAbMapelOptions() {
  repairAndSyncHaidilMapel();
  repairAndSyncTJKTMapel();
  populateAbGuruDropdown();
  const guruSel = document.getElementById('ab-guru');
  const guruVal = guruSel ? guruSel.value : 'ACTIVE';
  const sel = document.getElementById('ab-mapel');
  if (!sel) return;

  const curMapel = sel.value;
  sel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';

  const filteredMapel = getFilteredMapelForTeacher(guruVal);

  if (filteredMapel.length === 0) {
    sel.innerHTML = '<option value="">-- Tidak ada mapel terdaftar untuk guru ini --</option>';
  } else {
    filteredMapel.forEach(mp => {
      const guruTag = (guruVal === '__ALL__' && mp.guruNama) ? ` [${mp.guruNama.split(',')[0]}]` : '';
      sel.innerHTML += `<option value="${mp.id}">${mp.nama}${guruTag}</option>`;
    });
  }

  const kSel = document.getElementById('ab-kelas');
  const curKelas = kSel ? kSel.value : '';

  const tglEl = document.getElementById('ab-tgl');
  if (tglEl && !tglEl.value) tglEl.value = todayStr();

  if (curMapel && filteredMapel.some(m => String(m.id) === String(curMapel))) {
    sel.value = curMapel;
    onAbMapelChange(curKelas);
  } else if (filteredMapel.length === 1) {
    sel.value = filteredMapel[0].id;
    onAbMapelChange(curKelas);
  } else {
    if (kSel) kSel.innerHTML = '<option value="">-- Pilih Kelas --</option>';
  }
}

function onAbMapelChange(preferredKelas = null) {
  const mapelEl = document.getElementById('ab-mapel');
  const id = parseInt(mapelEl?.value);
  const sel = document.getElementById('ab-kelas');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Kelas --</option>';
  if (!id) {
    const box = document.getElementById('ab-table-box');
    if (box) box.style.display = 'none';
    return;
  }

  repairAndSyncHaidilMapel();
  repairAndSyncTJKTMapel();

  const mp = db.mapel.find(m => m.id === id);
  if (!mp) return;

  // Extra safety guard: if mapel is PKK and teacher is Haidil Anwar, ensure XI TJKT and XI GP
  const isHaidil = String(mp.guruNo || '') === '17' ||
    /haidil/i.test(mp.guruNama || '') ||
    (db.guru && (/haidil/i.test(db.guru.nama || '') || String(db.guru.no || '') === '17'));
  const isPKK = /pkk|kreatif|kewirausahaan/i.test(mp.nama || '');

  if (isPKK && isHaidil) {
    if (!Array.isArray(mp.kelas)) mp.kelas = [];
    mp.kelas.forEach(k => { if (k.jurusan === 'TKJ') k.jurusan = 'TJKT'; });
    if (!mp.kelas.some(k => k.jurusan === 'TJKT' && k.tingkat === 'XI')) {
      mp.kelas.unshift({ jurusan: 'TJKT', tingkat: 'XI' });
      saveDB();
    }
    if (!mp.kelas.some(k => k.jurusan === 'GP' && k.tingkat === 'XI')) {
      mp.kelas.push({ jurusan: 'GP', tingkat: 'XI' });
      saveDB();
    }
  }

  if (!mp.kelas || !mp.kelas.length) return;

  mp.kelas.forEach(k => {
    const jur = k.jurusan === 'TKJ' ? 'TJKT' : k.jurusan;
    sel.innerHTML += `<option value="${jur}|${k.tingkat}">${jur} – Kelas ${k.tingkat}</option>`;
  });

  const targetKelas = preferredKelas || (mp.kelas.length === 1 ? `${mp.kelas[0].jurusan === 'TKJ' ? 'TJKT' : mp.kelas[0].jurusan}|${mp.kelas[0].tingkat}` : null);
  if (targetKelas && mp.kelas.some(k => `${k.jurusan === 'TKJ' ? 'TJKT' : k.jurusan}|${k.tingkat}` === targetKelas)) {
    sel.value = targetKelas;
    onAbKelasChange();
  } else {
    const box = document.getElementById('ab-table-box');
    if (box) box.style.display = 'none';
  }
}

function onAbKelasChange() {
  const mapelId = parseInt(document.getElementById('ab-mapel')?.value);
  const kelasVal = document.getElementById('ab-kelas')?.value;
  if (!kelasVal) {
    const box = document.getElementById('ab-table-box');
    if (box) box.style.display = 'none';
    return;
  }
  const [jurusan, tingkat] = kelasVal.split('|');
  // auto pertemuan
  const existing = db.absensi.filter(a => a.mapelId === mapelId && a.jurusan === jurusan && a.tingkat === tingkat);
  const nextPert = existing.length ? Math.max(...existing.map(a => a.pertemuan)) + 1 : 1;
  const pertInput = document.getElementById('ab-pert');
  if (pertInput && (!pertInput.value || pertInput.value == 1)) {
    pertInput.value = nextPert;
  }
  loadAbsensiTable();
}

function loadAbsensiTable() {
  const mapelId  = parseInt(document.getElementById('ab-mapel').value);
  const kelasVal = document.getElementById('ab-kelas').value;
  const tanggal  = document.getElementById('ab-tgl').value;
  const pert     = parseInt(document.getElementById('ab-pert').value) || 1;

  if (!mapelId) { showToast('Pilih mata pelajaran.','err'); return; }
  if (!kelasVal) { showToast('Pilih kelas.','err'); return; }
  if (!tanggal)  { showToast('Pilih tanggal.','err'); return; }

  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const siswaList = db.siswa[key] || [];
  const mapelNama = db.mapel.find(m => m.id === mapelId)?.nama || '';

  const box  = document.getElementById('ab-table-box');
  const head = document.getElementById('ab-table-head');
  const tbody = document.getElementById('ab-tbody');

  head.textContent = `Daftar Hadir – ${mapelNama} | ${jurusan} Kelas ${tingkat} | Pertemuan ${pert}`;
  box.style.display = 'block';

  if (!siswaList.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">
      Belum ada data siswa untuk kelas ${jurusan} ${tingkat}.<br>
      <button class="btn-primary" style="margin-top:10px" onclick="showPage('siswa')">Tambah Siswa</button>
    </td></tr>`;
    return;
  }

  // try load existing session
  const existing = db.absensi.find(a =>
    a.mapelId === mapelId && a.jurusan === jurusan &&
    a.tingkat === tingkat && a.tanggal === tanggal && a.pertemuan === pert
  );

  tbody.innerHTML = siswaList.map((nama, i) => {
    const rec   = existing?.records.find(r => r.nama === nama);
    const st    = rec?.status    || '';
    // Unscanned students MUST remain empty (--:--), only filled when scanned or manually entered!
    const jIn   = rec?.jamMasuk  || '';
    const jOut  = rec?.jamKeluar || '';
    const ket   = rec?.ket       || '';
    const faceKey = `${key}-${nama}`;
    const hasEnrolledFace = db.faces && (db.faces[faceKey] || db.faces[`${key}-${i}`]);
    const photoProof = rec?.foto || (window._attendancePhotos && window._attendancePhotos[nama]);

    return `<tr>
      <td>${i+1}</td>
      <td style="text-align:center">
        ${photoProof ? 
          `<button class="chip chip-green" style="padding:2px 8px;font-size:11px" onclick="viewPhotoProof('${photoProof}', '${nama}', '${jIn}')">📸 Lihat</button>` 
          : (hasEnrolledFace ? `<span title="Wajah Biometrik Terdaftar" style="cursor:help">👤 <small style="color:var(--green);font-weight:700">OK</small></span>` : `<span style="color:#aaa">-</span>`)}
      </td>
      <td style="font-weight:600">${nama}</td>
      <td>
        <select id="st-${i}" onchange="applyTimeOnHadir(${i})">
          <option value="" ${!st?'selected':''}>–</option>
          <option value="H" ${st==='H'?'selected':''}>✅ H – Hadir</option>
          <option value="I" ${st==='I'?'selected':''}>📝 I – Izin</option>
          <option value="S" ${st==='S'?'selected':''}>🏥 S – Sakit</option>
          <option value="A" ${st==='A'?'selected':''}>❌ A – Alpha</option>
        </select>
      </td>
      <td><input type="time" id="jin-${i}"  value="${jIn}"/></td>
      <td><input type="time" id="jout-${i}" value="${jOut}"/></td>
      <td><input type="text" id="ket-${i}"  value="${ket}" placeholder="Catatan..."/></td>
    </tr>`;
  }).join('');

  // Populate manual student selector in face panel
  const manSel = document.getElementById('face-manual-student');
  if (manSel) {
    manSel.innerHTML = '<option value="">-- Pilih Siswa Hadir --</option>' + 
      siswaList.map((nama, idx) => `<option value="${nama}">${idx+1}. ${nama}</option>`).join('');
  }
  updateQrStats();
  updateFaceStats();
}

function applyTimeOnHadir(i) {
  const sel = document.getElementById(`st-${i}`);
  const jinInput = document.getElementById(`jin-${i}`);
  const joutInput = document.getElementById(`jout-${i}`);
  if (!sel) return;

  if (sel.value === 'H') {
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const jinVal = document.getElementById('ab-jin')?.value;
    const joutVal = document.getElementById('ab-jout')?.value;
    if (jinInput && !jinInput.value)  jinInput.value  = nowTime || jinVal || '07:15';
    if (joutInput && !joutInput.value && joutVal) joutInput.value = joutVal;
  } else {
    // 💡 OTOMATIS: Jika siswa Sakit (S), Izin (I), Alpha (A), atau dibatalkan (–):
    // Jam Masuk dan Jam Keluar OTOMATIS dikosongkan/dihilangkan seketika!
    if (jinInput)  jinInput.value  = '';
    if (joutInput) joutInput.value = '';
  }
  updateQrStats();
  updateFaceStats();
}

function setAllStatus(st) {
  const jinVal = document.getElementById('ab-jin')?.value;
  const joutVal = document.getElementById('ab-jout')?.value;
  document.querySelectorAll('[id^="st-"]').forEach((sel, i) => {
    sel.value = st;
    const jinInput = document.getElementById(`jin-${i}`);
    const joutInput = document.getElementById(`jout-${i}`);
    if (st === 'H') {
      if (jinInput && !jinInput.value) jinInput.value = jinVal || '07:15';
      if (joutInput && !joutInput.value) joutInput.value = joutVal || '14:30';
    } else {
      if (jinInput) jinInput.value = '';
      if (joutInput) joutInput.value = '';
    }
  });
  updateQrStats();
  updateFaceStats();
}

function clearAllStatus() {
  document.querySelectorAll('[id^="st-"]').forEach((sel, i) => {
    sel.value = '';
    const jinInput = document.getElementById(`jin-${i}`);
    const joutInput = document.getElementById(`jout-${i}`);
    if (jinInput) jinInput.value = '';
    if (joutInput) joutInput.value = '';
  });
  updateQrStats();
  updateFaceStats();
}

function simpanAbsensi() {
  const mapelId  = parseInt(document.getElementById('ab-mapel').value);
  const kelasVal = document.getElementById('ab-kelas').value;
  const tanggal  = document.getElementById('ab-tgl').value;
  const jinVal   = document.getElementById('ab-jin').value;
  const joutVal  = document.getElementById('ab-jout').value;
  const pert     = parseInt(document.getElementById('ab-pert').value);

  if (!mapelId || !kelasVal || !tanggal) { showToast('Lengkapi form sesi terlebih dahulu.','err'); return; }
  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const siswaList = db.siswa[key] || [];
  if (!siswaList.length) { showToast('Tidak ada data siswa.','err'); return; }

  const mapelNama = db.mapel.find(m => m.id === mapelId)?.nama || '';
  const existing = db.absensi.find(a =>
    a.mapelId === mapelId && a.jurusan === jurusan &&
    a.tingkat === tingkat && a.tanggal === tanggal && a.pertemuan === pert
  );

  const records = siswaList.map((nama, i) => {
    const recPrev = existing?.records.find(r => r.nama === nama);
    const photo = (window._attendancePhotos && window._attendancePhotos[nama]) || recPrev?.foto || null;
    const stVal = document.getElementById(`st-${i}`)?.value || '';
    const jInInputVal = document.getElementById(`jin-${i}`)?.value || '';
    const jOutInputVal = document.getElementById(`jout-${i}`)?.value || '';
    const ketVal = document.getElementById(`ket-${i}`)?.value || '';

    // Hanya siswa HADIR ('H') yang memiliki jam masuk dan jam keluar.
    // Jika siswa Sakit ('S'), Izin ('I'), atau Alpha ('A'): jam masuk dan keluar WAJIB kosong ('').
    let finalJin = '';
    let finalJout = '';

    if (stVal === 'H') {
      finalJin = jInInputVal || (recPrev?.jamMasuk || jinVal || '07:15');
      finalJout = jOutInputVal || (recPrev?.jamKeluar || joutVal || '14:30');
    } else {
      finalJin = '';
      finalJout = '';
    }

    return {
      nama,
      status:    stVal,
      jamMasuk:  finalJin,
      jamKeluar: finalJout,
      ket:       ketVal,
      foto:      photo
    };
  });



  // Identify teacher for session
  const guruSel = document.getElementById('ab-guru');
  let sessionGuruNama = db.guru?.nama || '';
  let sessionGuruNip  = db.guru?.nip  || '';
  if (guruSel && guruSel.value && guruSel.value !== 'ACTIVE' && guruSel.value !== '__ALL__') {
    const sk = window.SMKN10_SK_DATA;
    const t = sk?.teachers?.find(x => String(x.code) === String(guruSel.value) || x.name === guruSel.value);
    if (t) {
      sessionGuruNama = t.name;
      sessionGuruNip  = t.nip || '';
    }
  }

  // remove duplicate
  db.absensi = db.absensi.filter(a =>
    !(a.mapelId===mapelId && a.jurusan===jurusan && a.tingkat===tingkat &&
      a.tanggal===tanggal && a.pertemuan===pert)
  );

  db.absensi.push({
    id: existing?.id || Date.now(),
    mapelId, mapelNama, jurusan, tingkat,
    tanggal, pertemuan: pert,
    jamMasuk: jinVal, jamKeluar: joutVal,
    namaGuru: sessionGuruNama,
    nipGuru:  sessionGuruNip,
    ta:       db.guru?.ta   || '',
    records
  });

  saveDB();
  if (window.SupabaseSync && typeof window.SupabaseSync.uploadSession === 'function') {
    const lastSession = db.absensi[db.absensi.length - 1];
    if (lastSession) window.SupabaseSync.uploadSession(lastSession);
  }
  showToast('Absensi berhasil disimpan! 💾 (Tersinkron ke Cloud ☁️)','ok');
}

function exportPertemuan() {
  const mapelId  = parseInt(document.getElementById('ab-mapel').value);
  const kelasVal = document.getElementById('ab-kelas').value;
  const tanggal  = document.getElementById('ab-tgl').value;
  const pert     = parseInt(document.getElementById('ab-pert').value);
  if (!mapelId || !kelasVal) { showToast('Simpan absensi dulu.','err'); return; }
  const [jurusan, tingkat] = kelasVal.split('|');
  const session = db.absensi.find(a =>
    a.mapelId===mapelId && a.jurusan===jurusan && a.tingkat===tingkat &&
    a.tanggal===tanggal && a.pertemuan===pert
  );
  if (!session) { showToast('Simpan absensi terlebih dahulu.','err'); return; }
  doExportSession(session);
}

// ─────────────────────────────────────────────
//  DATA SISWA
// ─────────────────────────────────────────────
function updateSwKelas() {
  const j = document.getElementById('sw-jurusan').value;
  const sel = document.getElementById('sw-tingkat');
  sel.innerHTML = '<option value="">-- Semua Tingkat --</option>';
  if (j && JURUSAN_TINGKAT[j]) {
    JURUSAN_TINGKAT[j].forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);
  }
  lihatSiswa();
}

function simpanSiswa() {
  const j = document.getElementById('sw-jurusan').value;
  const t = document.getElementById('sw-tingkat').value;
  if (!j || !t) { showToast('Pilih jurusan dan tingkat.','err'); return; }
  const raw = document.getElementById('sw-list').value;
  const names = raw.split('\n').map(n => n.trim()).filter(Boolean);
  if (!names.length) { showToast('Masukkan minimal 1 nama siswa.','err'); return; }
  db.siswa[`${j}-${t}`] = names;
  saveDB();
  showToast(`${names.length} siswa ${j} Kelas ${t} tersimpan ✅`,'ok');
  const txt = document.getElementById('sw-list');
  if (txt) txt.value = '';
  lihatSiswa();
}

function initSiswaPage() {
  updateSwKelas();
  const box = document.getElementById('sw-list-box');
  if (box) box.style.display = 'block';
  lihatSiswa();
}

function lihatSiswa() {
  const j = document.getElementById('sw-jurusan').value;
  const t = document.getElementById('sw-tingkat').value;
  const box   = document.getElementById('sw-list-box');
  const tbody = document.getElementById('sw-tbody');
  const head  = document.getElementById('sw-list-head');

  let rows = [];
  Object.entries(db.siswa || {}).forEach(([key, arr]) => {
    const [jk, tk] = key.split('-');
    if (j && jk !== j) return;
    if (t && tk !== t) return;
    if (Array.isArray(arr)) {
      arr.forEach((nama, idx) => rows.push({ nama, jurusan: jk, tingkat: tk, key, idx }));
    }
  });

  head.textContent = `Daftar Siswa – ${j || 'Semua Jurusan'} ${t ? 'Kelas ' + t : ''} (${rows.length} siswa)`;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px;color:var(--text-muted)">Belum ada data siswa untuk rombel ini.</td></tr>';
  } else {
    tbody.innerHTML = rows.map((r, i) => {
      const faceKey = `${r.key}-${r.nama}`;
      const faceData = db.faces && db.faces[faceKey];
      const hasFace = !!faceData;
      const safeNama = escapeHtml(r.nama);
      const safeKey = escapeHtml(r.key);
      const encNama = encodeURIComponent(r.nama);
      return `<tr>
        <td>${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#e2e8f0;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);flex-shrink:0">
              ${hasFace ? `<img src="${faceData.image}" style="width:100%;height:100%;object-fit:cover"/>` : `👤`}
            </div>
            ${hasFace ? 
              `<button class="chip chip-green" style="font-size:11px;padding:2px 8px;cursor:pointer" onclick="openFaceEnrollModal('${safeKey}', decodeURIComponent('${encNama}'))">✅ Ubah</button>` : 
              `<button class="chip chip-amber" style="font-size:11px;padding:2px 8px;cursor:pointer" onclick="openFaceEnrollModal('${safeKey}', decodeURIComponent('${encNama}'))">📸 Rekam</button>`
            }
          </div>
        </td>
        <td style="font-weight:700">${safeNama}</td>
        <td><span class="kelas-tag">${r.jurusan}</span></td>
        <td>${r.tingkat}</td>
        <td>
          <button class="chip chip-blue" style="font-size:11px;padding:2px 8px" onclick="showSingleStudentCardModal('${safeKey}', ${r.idx})">
            🪪 QR Siswa
          </button>
        </td>
        <td>
          <button class="chip chip-red" style="font-size:12px;padding:3px 10px;cursor:pointer" onclick="hapusSiswa('${safeKey}', decodeURIComponent('${encNama}'))">🗑️ Hapus</button>
        </td>
      </tr>`;
    }).join('');
  }
  box.style.display = 'block';
}

function hapusSiswa(key, nama) {
  appConfirm(`Hapus siswa "${nama}" dari kelas ${key}? Data foto wajah siswa ini juga akan dihapus.`, () => {
    if (!db.siswa || !db.siswa[key]) return;
    const arr = db.siswa[key];
    const idx = arr.indexOf(nama);
    if (idx !== -1) {
      arr.splice(idx, 1);
    }
    if (!arr.length) {
      delete db.siswa[key];
    }
    const faceKey = `${key}-${nama}`;
    if (db.faces && db.faces[faceKey]) {
      delete db.faces[faceKey];
    }
    db._studentsInitialized = true;
    saveDB();
    showToast(`Siswa "${nama}" berhasil dihapus.`, 'ok');
    lihatSiswa();
  });
}

function hapusSiswaKelasAktif() {
  const j = document.getElementById('sw-jurusan').value;
  const t = document.getElementById('sw-tingkat').value;
  if (!j || !t) {
    showToast('Pilih Jurusan dan Tingkat terlebih dahulu.', 'err');
    return;
  }
  const key = `${j}-${t}`;
  const count = (db.siswa && db.siswa[key] ? db.siswa[key].length : 0);
  if (!count) {
    showToast(`Tidak ada data siswa di rombel ${key}.`, 'err');
    return;
  }
  appConfirm(`Hapus SELURUH ${count} siswa di rombel ${j} Kelas ${t}? Seluruh data wajah biometrik siswa di rombel ini juga akan dihapus.`, () => {
    (db.siswa[key] || []).forEach(nama => {
      const faceKey = `${key}-${nama}`;
      if (db.faces && db.faces[faceKey]) delete db.faces[faceKey];
    });
    delete db.siswa[key];
    db._studentsInitialized = true;
    saveDB();
    showToast(`Seluruh siswa di rombel ${j} Kelas ${t} berhasil dihapus.`, 'ok');
    lihatSiswa();
  });
}

function dlTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([['No','Nama Siswa','Jurusan','Tingkat'],
    ...Array.from({length:40},(_,i)=>[i+1,'','',''])]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_siswa_smkn10.xlsx');
}

// ─────────────────────────────────────────────
//  REKAP
// ─────────────────────────────────────────────
function populateRkGuruDropdown() {
  const sel = document.getElementById('rk-guru');
  if (!sel) return;
  if (!isAdminAuthenticated()) {
    const activeName = db.guru?.nama || 'Guru Aktif';
    const activeCode = db.guru?.code ? ` (Kode ${db.guru.code})` : '';
    sel.innerHTML = `<option value="ACTIVE" selected>👤 ${escapeHtml(activeName)}${activeCode} [Guru Aktif]</option>`;
    sel.disabled = true;
    sel.style.cursor = 'default';
    sel.style.backgroundColor = 'var(--bg-subtle, #f1f5f9)';
  } else {
    sel.disabled = false;
    sel.style.cursor = '';
    sel.style.backgroundColor = '';
    const curVal = sel.value || 'ACTIVE';
    sel.innerHTML = getTeacherOptionsHTML(true, '-- Semua Guru (Admin) --', curVal);
  }
}

function onRkGuruChange() {
  refreshRekapMapelOptions();
  tampilRekap();
}

function refreshRekapMapelOptions() {
  populateRkGuruDropdown();
  const guruSel = document.getElementById('rk-guru');
  const guruVal = (!isAdminAuthenticated()) ? 'ACTIVE' : (guruSel ? guruSel.value : 'ACTIVE');
  const sel = document.getElementById('rk-mapel');
  if (!sel) return;

  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua Mapel</option>';

  const filteredMapel = getFilteredMapelForTeacher(guruVal);

  filteredMapel.forEach(mp => {
    const gTag = (guruVal === '__ALL__' && mp.guruNama) ? ` [${mp.guruNama.split(',')[0]}]` : '';
    sel.innerHTML += `<option value="${mp.id}" ${mp.id == cur ? 'selected':''}>${escapeHtml(mp.nama)}${escapeHtml(gTag)}</option>`;
  });

  tampilRekap();
}

function tampilRekap() {
  const guruSel = document.getElementById('rk-guru');
  const guruVal = (!isAdminAuthenticated()) ? 'ACTIVE' : (guruSel ? guruSel.value : 'ACTIVE');
  const targetTeacher = getTargetTeacherFromVal(guruVal);

  const mapelId = parseInt(document.getElementById('rk-mapel').value) || null;
  const jurusan = document.getElementById('rk-jurusan').value;
  const tingkat = document.getElementById('rk-tingkat').value;
  const bulan   = document.getElementById('rk-bulan').value;

  let filtered = (db.absensi || []).filter(a => {
    if (targetTeacher && !isSessionBelongingToTeacher(a, targetTeacher)) return false;
    if (mapelId && a.mapelId !== mapelId) return false;
    if (jurusan && a.jurusan !== jurusan) return false;
    if (tingkat && a.tingkat !== tingkat) return false;
    if (bulan) {
      const m = new Date(a.tanggal).getMonth() + 1;
      if (String(m) !== bulan) return false;
    }
    return true;
  });

  const el = document.getElementById('rk-result');
  if (!filtered.length) {
    const teacherMsg = targetTeacher ? ` untuk guru <b>${escapeHtml(targetTeacher.nama)}</b>` : '';
    el.innerHTML = `<div class="box"><div class="box-body"><p class="empty">Tidak ada data absensi yang cocok${teacherMsg}.</p></div></div>`;
    return;
  }

  // group
  const groups = {};
  filtered.forEach(a => {
    const gk = `${a.mapelId}|${a.jurusan}|${a.tingkat}`;
    if (!groups[gk]) groups[gk] = { mapelId:a.mapelId, mapelNama:a.mapelNama, jurusan:a.jurusan, tingkat:a.tingkat, sessions:[] };
    groups[gk].sessions.push(a);
  });

  el.innerHTML = Object.values(groups).map(g => buildRekapHtml(g)).join('');
}

function buildRekapHtml(g) {
  g.sessions.sort((a,b) => a.pertemuan - b.pertemuan);
  const key = `${g.jurusan}-${g.tingkat}`;
  let names = db.siswa[key] ? [...db.siswa[key]] : [];
  g.sessions.forEach(s => s.records.forEach(r => { if (!names.includes(r.nama)) names.push(r.nama); }));

  const summary = names.map(nama => {
    let H=0,I=0,S=0,A=0;
    g.sessions.forEach(s => {
      const rec = s.records.find(r => r.nama === nama);
      if (rec) { if(rec.status==='H')H++; else if(rec.status==='I')I++; else if(rec.status==='S')S++; else if(rec.status==='A')A++; }
    });
    const total = H+I+S+A;
    const pct = total ? Math.round(H/total*100) : 0;
    return { nama,H,I,S,A,total,pct };
  });

  const totalH = summary.reduce((s,r)=>s+r.H,0);
  const totalSel = summary.length * g.sessions.length;
  const avgPct   = totalSel ? Math.round(totalH/totalSel*100) : 0;

  const pctColor = pct => pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

  return `<div class="box rekap-card">
    <div class="box-head">
      📋 ${g.mapelNama} – ${g.jurusan} Kelas ${g.tingkat}
      <span style="float:right;font-weight:400;font-size:12px;color:var(--text-muted)">${g.sessions.length} pertemuan · ${summary.length} siswa</span>
    </div>
    <div class="box-body">
      <div class="rekap-stat-row">
        <div class="rs-item"><span class="rs-num" style="color:var(--blue)">${g.sessions.length}</span><span class="rs-lbl">Pertemuan</span></div>
        <div class="rs-item"><span class="rs-num" style="color:var(--green)">${totalH}</span><span class="rs-lbl">Total Hadir</span></div>
        <div class="rs-item"><span class="rs-num" style="color:var(--text)">${summary.length}</span><span class="rs-lbl">Siswa</span></div>
        <div class="rs-item"><span class="rs-num" style="color:${pctColor(avgPct)}">${avgPct}%</span><span class="rs-lbl">Rata-rata Hadir</span></div>
      </div>
      <div class="tbl-wrap">
        <table class="dtbl">
          <thead>
            <tr>
              <th>No</th><th>Nama Siswa</th>
              ${g.sessions.map(s=>`<th style="text-align:center"><div>P${s.pertemuan}</div><div style="font-weight:400;font-size:10px">${tglPendek(s.tanggal)}</div><button onclick="hapusSessionAbsensi(${s.id})" title="Hapus pertemuan ${s.pertemuan}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:1px 4px;margin-top:2px">🗑️</button></th>`).join('')}
              <th style="text-align:center">H</th><th style="text-align:center">I</th>
              <th style="text-align:center">S</th><th style="text-align:center">A</th>
              <th style="text-align:center">%</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map((r,i) => `<tr>
              <td>${i+1}</td>
              <td style="font-weight:600">${r.nama}</td>
              ${g.sessions.map(s => {
                const rec = s.records.find(x => x.nama === r.nama);
                const st  = rec?.status || '';
                return `<td style="text-align:center">${st ? `<span class="badge badge-${st}">${st}</span>` : '<span style="color:var(--text-muted)">–</span>'}</td>`;
              }).join('')}
              <td style="text-align:center;font-weight:700;color:var(--green)">${r.H}</td>
              <td style="text-align:center;font-weight:700;color:var(--amber)">${r.I}</td>
              <td style="text-align:center;font-weight:700;color:var(--blue)">${r.S}</td>
              <td style="text-align:center;font-weight:700;color:var(--red)">${r.A}</td>
              <td style="text-align:center;font-weight:700;color:${pctColor(r.pct)}">${r.pct}%</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function hapusSemuaAbsensi() {
  const myTeacher = db.guru;
  if (!myTeacher) {
    showToast('Profil guru aktif belum dipilih.', 'err');
    return;
  }

  const guruSel = document.getElementById('rk-guru');
  const guruVal = (!isAdminAuthenticated()) ? 'ACTIVE' : (guruSel ? guruSel.value : 'ACTIVE');
  const targetTeacher = getTargetTeacherFromVal(guruVal) || myTeacher;
  const isAllAdmin = isAdminAuthenticated() && guruVal === '__ALL__';

  const sessionsToDelete = isAllAdmin
    ? [...(db.absensi || [])]
    : (db.absensi || []).filter(a => isSessionBelongingToTeacher(a, targetTeacher));

  const delCount = sessionsToDelete.length;
  if (!delCount) {
    showToast(`Belum ada data absensi untuk ${escapeHtml(targetTeacher.nama || 'guru ini')} yang dapat dihapus.`, 'info');
    return;
  }

  const otherCount = (db.absensi || []).length - delCount;
  const otherNotice = otherCount > 0 
    ? `<br><br><span style="color:var(--green);font-size:12px;font-weight:600">🛡️ ${otherCount} data absensi milik guru lain dipastikan aman & tidak akan terhapus.</span>`
    : '';

  const confirmMsg = isAllAdmin
    ? `PERINGATAN ADMINISTRATOR: Hapus SELURUH ${delCount} data absensi SEMUA GURU di SMKN 10 Kolaka? Tindakan ini tidak dapat dibatalkan.`
    : `Hapus semua data absensi mata pelajaran yang diampu oleh <b>${escapeHtml(targetTeacher.nama)}</b> (${delCount} pertemuan)?${otherNotice}<br><br>Data rekapitulasi kehadiran Anda akan dikosongkan. Tindakan ini tidak dapat dibatalkan.`;

  appConfirm(confirmMsg, () => {
    const idsToDelete = new Set(sessionsToDelete.map(s => s.id));
    db.absensi = (db.absensi || []).filter(a => !idsToDelete.has(a.id));
    saveDB();
    tampilRekap();
    showToast(`Berhasil menghapus ${delCount} data absensi milik ${targetTeacher.nama}. Data guru lain tetap aman! 🗑️`, 'ok');
    if (typeof renderDashboard === 'function') renderDashboard();
  });
}

function hapusSessionAbsensi(id) {
  const session = (db.absensi || []).find(a => a.id === id);
  if (!session) return;

  if (!isAdminAuthenticated() && !isSessionBelongingToTeacher(session, db.guru)) {
    showToast('Akses ditolak: Anda tidak dapat menghapus absensi mata pelajaran milik guru lain.', 'err');
    return;
  }

  appConfirm(`Hapus data absensi ${escapeHtml(session.mapelNama)} Pertemuan ke-${session.pertemuan} tanggal ${tglPendek(session.tanggal)}?`, () => {
    db.absensi = db.absensi.filter(a => a.id !== id);
    saveDB();
    showToast(`Absensi Pertemuan ke-${session.pertemuan} berhasil dihapus.`, 'ok');
    tampilRekap();
    if (typeof renderDashboard === 'function') renderDashboard();
  });
}

// ─────────────────────────────────────────────
//  EXPORT EXCEL
// ─────────────────────────────────────────────
function doExportSession(session) {
  const defaultGuru = db.guru || {};
  const sessionTeacherNama = session.namaGuru || defaultGuru.nama || '-';
  const sessionTeacherNip  = session.nipGuru || defaultGuru.nip || '-';
  const sessionTeacherTa   = session.ta || defaultGuru.ta || '-';

  const rows = [
    ['SMK NEGERI 10 KOLAKA'],
    ['DAFTAR ABSENSI SISWA'],
    [],
    ['Mata Pelajaran', session.mapelNama],
    ['Jurusan / Kelas', `${session.jurusan} / ${session.tingkat}`],
    ['Tanggal', tglPanjang(session.tanggal)],
    ['Pertemuan ke-', session.pertemuan],
    ['Jam Masuk', session.jamMasuk || '-'],
    ['Jam Keluar', session.jamKeluar || '-'],
    ['Nama Guru', sessionTeacherNama],
    ['NIP', sessionTeacherNip],
    ['Tahun Ajaran', sessionTeacherTa],
    [],
    ['No','Nama Siswa','Status','Jam Masuk','Jam Keluar','Keterangan']
  ];
  session.records.forEach((r, i) => {
    const stFull = {H:'Hadir',I:'Izin',S:'Sakit',A:'Alpha'}[r.status] || r.status || '-';
    rows.push([i+1, r.nama, stFull, r.jamMasuk||'-', r.jamKeluar||'-', r.ket||'']);
  });
  const H=session.records.filter(r=>r.status==='H').length;
  const I=session.records.filter(r=>r.status==='I').length;
  const S=session.records.filter(r=>r.status==='S').length;
  const A=session.records.filter(r=>r.status==='A').length;
  rows.push([],[`Hadir: ${H}  Izin: ${I}  Sakit: ${S}  Alpha: ${A}`]);
  rows.push([],[],[`Guru Mata Pelajaran,`]);
  rows.push([],[],[],[`(${sessionTeacherNama})`]);
  rows.push([],[],[],[`NIP. ${sessionTeacherNip}`]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:4},{wch:32},{wch:12},{wch:12},{wch:12},{wch:28}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `P${session.pertemuan}`);
  XLSX.writeFile(wb, `Absensi_${session.jurusan}_${session.tingkat}_${session.mapelNama}_P${session.pertemuan}_${session.tanggal}.xlsx`);
  showToast('File Excel berhasil didownload 📥','ok');
}

function exportRekap() {
  const guruSel = document.getElementById('rk-guru');
  const guruVal = (!isAdminAuthenticated()) ? 'ACTIVE' : (guruSel ? guruSel.value : 'ACTIVE');
  const targetTeacher = getTargetTeacherFromVal(guruVal);

  const mapelId = parseInt(document.getElementById('rk-mapel').value) || null;
  const jurusan = document.getElementById('rk-jurusan').value;
  const tingkat = document.getElementById('rk-tingkat').value;
  const bulan   = document.getElementById('rk-bulan').value;

  let filtered = (db.absensi || []).filter(a => {
    if (targetTeacher && !isSessionBelongingToTeacher(a, targetTeacher)) return false;
    if (mapelId && a.mapelId !== mapelId) return false;
    if (jurusan && a.jurusan !== jurusan) return false;
    if (tingkat && a.tingkat !== tingkat) return false;
    if (bulan) { const m = new Date(a.tanggal).getMonth()+1; if(String(m)!==bulan) return false; }
    return true;
  });

  if (!filtered.length) { showToast('Tidak ada data untuk diexport.','err'); return; }

  const groups = {};
  filtered.forEach(a => {
    const gk = `${a.mapelId}|${a.jurusan}|${a.tingkat}`;
    if (!groups[gk]) groups[gk] = {mapelId:a.mapelId,mapelNama:a.mapelNama,jurusan:a.jurusan,tingkat:a.tingkat,sessions:[]};
    groups[gk].sessions.push(a);
  });

  const guru = (targetTeacher && targetTeacher.nama) ? targetTeacher : (db.guru || {});
  const wb = XLSX.utils.book_new();

  Object.values(groups).forEach(g => {
    g.sessions.sort((a,b) => a.pertemuan-b.pertemuan);
    const key = `${g.jurusan}-${g.tingkat}`;
    let names = db.siswa[key] ? [...db.siswa[key]] : [];
    g.sessions.forEach(s => s.records.forEach(r => { if(!names.includes(r.nama)) names.push(r.nama); }));

    const sTeacherNama = g.sessions[0]?.namaGuru || guru.nama || '-';
    const sTeacherNip  = g.sessions[0]?.nipGuru  || guru.nip  || '-';

    const rows = [
      ['SMK NEGERI 10 KOLAKA'],
      ['REKAP ABSENSI SISWA'],
      [],
      ['Mata Pelajaran', g.mapelNama],
      ['Jurusan / Kelas', `${g.jurusan} / ${g.tingkat}`],
      ['Nama Guru', sTeacherNama],
      ['NIP', sTeacherNip],
      ['Tahun Ajaran', guru.ta||'-'],
      bulan ? ['Bulan', BULAN[parseInt(bulan)]] : ['Periode','Semua Bulan'],
      [],
      ['No','Nama Siswa',...g.sessions.map(s=>`P-${s.pertemuan} (${tglPendek(s.tanggal)})`),'H','I','S','A','% Hadir']
    ];

    names.forEach((nama, i) => {
      let H=0,I=0,S=0,A=0;
      const perRow = g.sessions.map(s => {
        const rec = s.records.find(r => r.nama===nama);
        const st = rec?.status || '-';
        if(st==='H')H++; else if(st==='I')I++; else if(st==='S')S++; else if(st==='A')A++;
        return st;
      });
      const tot = H+I+S+A;
      const pct = tot ? `${Math.round(H/tot*100)}%` : '-';
      rows.push([i+1, nama, ...perRow, H, I, S, A, pct]);
    });

    rows.push([],[],[`Mengetahui, Kepala SMKN 10 Kolaka`,'','','','','',`Guru Mata Pelajaran,`]);
    rows.push([],[],[`TABING, S.Pd,. M.Pd`,'','','','','',`(${sTeacherNama})`]);
    rows.push([],[],[`NIP. 19660921 199412 1004`,'','','','','',`NIP. ${sTeacherNip}`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const cols = [{wch:4},{wch:32},...g.sessions.map(()=>({wch:14})),{wch:5},{wch:5},{wch:5},{wch:5},{wch:10}];
    ws['!cols'] = cols;
    const sheetName = `${g.jurusan}_${g.tingkat}`.substring(0,31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const teacherFileName = (targetTeacher?.nama || guru.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
  const fn = `Rekap_${jurusan||'Semua'}_${bulan?BULAN[parseInt(bulan)]:'Semua'}_${teacherFileName}.xlsx`;
  XLSX.writeFile(wb, fn);
  showToast('Rekap Excel berhasil didownload 📥','ok');
}

// ─────────────────────────────────────────────
//  PENGATURAN
// ─────────────────────────────────────────────
function loadPengaturan() {
  if (!db.guru) return;
  document.getElementById('pg-nama').value = db.guru.nama || '';
  document.getElementById('pg-nip').value  = db.guru.nip  || '';
  
  // Clean Tahun Ajaran and Semester
  let taVal = db.guru.ta || '2026/2027';
  let semVal = db.guru.semester || 'Ganjil';
  if (/ganjil/i.test(taVal)) {
    semVal = 'Ganjil';
    taVal = taVal.replace(/ganjil/i, '').replace(/[()]/g, '').trim();
  } else if (/genap/i.test(taVal)) {
    semVal = 'Genap';
    taVal = taVal.replace(/genap/i, '').replace(/[()]/g, '').trim();
  }
  document.getElementById('pg-ta').value = taVal || '2026/2027';
  const semSel = document.getElementById('pg-semester');
  if (semSel) semSel.value = semVal;

  // Select current teacher in pg-sk-guru dropdown
  const pgSel = document.getElementById('pg-sk-guru');
  if (pgSel) {
    const sk = window.SMKN10_SK_DATA;
    let found = null;
    if (db.guru.no) {
      found = sk?.teachers?.find(t => t.no === db.guru.no);
    }
    if (!found && db.guru.nama) {
      found = sk?.teachers?.find(t => t.name.trim().toLowerCase() === db.guru.nama.trim().toLowerCase());
    }
    if (found) {
      pgSel.value = String(found.no);
      window._selectedTeacherSK = found;
    }
  }
}

function simpanPengaturan() {
  if (!isAdminAuthenticated()) {
    showToast('Akses ditolak: Memerlukan otorisasi Administrator!', 'err');
    openAdminAuthModal(() => simpanPengaturan());
    return;
  }
  const sk = window.SMKN10_SK_DATA;
  let teacherObj = window._selectedTeacherSK;
  const selNo = document.getElementById('pg-sk-guru')?.value;
  if (selNo && sk?.teachers) {
    const found = sk.teachers.find(x => String(x.no) === String(selNo));
    if (found) teacherObj = found;
  }
  if (!teacherObj && sk?.teachers) {
    const enteredName = v('pg-nama').trim().toLowerCase();
    teacherObj = sk.teachers.find(x => x.name.trim().toLowerCase() === enteredName);
  }

  let taVal = v('pg-ta').trim();
  taVal = taVal.replace(/ganjil/i, '').replace(/genap/i, '').replace(/[()]/g, '').trim() || '2026/2027';
  const semVal = document.getElementById('pg-semester')?.value || 'Ganjil';

  db.guru = {
    nama: v('pg-nama'),
    nip:  v('pg-nip'),
    ta:   taVal,
    semester: semVal,
    code: teacherObj?.code || db.guru?.code || '',
    no:   teacherObj?.no   || db.guru?.no   || null
  };
  saveDB();
  refreshSidebarProfile();
  refreshAbMapelOptions();
  refreshRekapMapelOptions();
  renderMapelList();
  showToast(`Profil & Semester ${semVal} berhasil disimpan ✅`,'ok');
}

function backupData() {
  const blob = new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'),{href:url,download:`backup_smkn10_${todayStr()}.json`});
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup berhasil didownload 📤','ok');
}

function restoreData(evt) {
  if (!isAdminAuthenticated()) {
    showToast('Akses ditolak: Memerlukan otorisasi Administrator!', 'err');
    if (evt && evt.target) evt.target.value = '';
    openAdminAuthModal();
    return;
  }
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.guru && !parsed.siswa && !parsed.absensi) throw 0;
      db = parsed;
      db.mapel   = db.mapel   || [];
      db.siswa   = db.siswa   || {};
      db.absensi = db.absensi || [];
      saveDB();
      refreshSidebarProfile();
      showToast('Data berhasil dipulihkan ✅','ok');
    } catch(_) { showToast('File tidak valid.','err'); }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function v(id) { return (document.getElementById(id)?.value || '').trim(); }
function set(id, txt) { const el=document.getElementById(id); if(el) el.textContent=txt; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function tglPanjang(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function tglPendek(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
}

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast-wrap ${type} show`;
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────
//  ROSTER & JADWAL PELAJARAN SK
// ─────────────────────────────────────────────
let currentRosterDay = 'SENIN';
let myScheduleOnly = false;
window._rosterPreviewTeacherCode = '';

function setRosterDay(day) {
  currentRosterDay = day;
  renderRosterView();
}

function highlightMySchedule() {
  myScheduleOnly = !myScheduleOnly;
  renderRosterView();
}

function renderRosterView() {
  const container = document.getElementById('roster-table-container');
  if (!container) return;
  const sk = window.SMKN10_SK_DATA;
  if (!sk || !sk.roster) {
    container.innerHTML = '<p class="empty">Data Roster SK belum tersedia.</p>';
    return;
  }

  updateRosterHeaderSKInfo();

  // Identify active teacher
  let myTeacherObj = null;
  if (window._rosterPreviewTeacherNo && sk.teachers) {
    myTeacherObj = sk.teachers.find(t => t.no === window._rosterPreviewTeacherNo);
  } else if (window._rosterPreviewTeacherCode && sk.teachers) {
    myTeacherObj = sk.teachers.find(t => String(t.code) === String(window._rosterPreviewTeacherCode) || String(t.no) === String(window._rosterPreviewTeacherCode));
  }
  if (!myTeacherObj && db.guru) {
    if (db.guru.no && sk.teachers) {
      myTeacherObj = sk.teachers.find(t => t.no === db.guru.no);
    }
    if (!myTeacherObj && db.guru.nama && sk.teachers) {
      myTeacherObj = sk.teachers.find(t => t.name.trim().toLowerCase() === db.guru.nama.trim().toLowerCase());
    }
    if (!myTeacherObj && db.guru.code && sk.teachers) {
      myTeacherObj = sk.teachers.find(t => String(t.code) === String(db.guru.code));
    }
  }

  if (!myTeacherObj && sk.teachers && sk.teachers.length > 0) {
    myTeacherObj = sk.teachers[0];
  }

  const myCode = myTeacherObj ? myTeacherObj.code : (db.guru?.code || '');
  const theme = (sk.getTeacherTheme) ? sk.getTeacherTheme(myCode) : {
    primary: '#1c3d2c',
    gradient: 'linear-gradient(135deg, #1c3d2c 0%, #2f6142 100%)',
    bgLight: '#eaf3ec',
    border: '#2f6142',
    badgeBg: '#cce3d3',
    badgeText: '#1c3d2c',
    pillBg: '#ffffff',
    pillText: '#1c3d2c'
  };

  // Sync selector value if available
  const rSel = document.getElementById('roster-teacher-select');
  if (rSel && myTeacherObj && rSel.value !== String(myTeacherObj.no)) {
    rSel.value = String(myTeacherObj.no);
  }

  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  let allColumns = ['X MPLB', 'X TKJ', 'X GP', 'XI MPLB', 'XI TKJ', 'XI GP', 'XII MPLB', 'XII TKJ', 'XII GP'];
  if (sk.classes && Array.isArray(sk.classes) && sk.classes.length > 0) {
    allColumns = sk.classes;
  } else if (sk.roster && sk.roster.length > 0 && sk.roster[0].classes) {
    const discovered = Object.keys(sk.roster[0].classes);
    if (discovered.length > 0) allColumns = discovered;
  }

  const filterSel = document.getElementById('roster-filter-kelas');
  if (filterSel && (!filterSel.dataset.populatedWithClasses || filterSel.dataset.populatedWithClasses !== allColumns.join(','))) {
    const curVal = filterSel.value || 'ALL';
    filterSel.innerHTML = `<option value="ALL">Semua Kelas (${allColumns.length} Rombel)</option>` +
      allColumns.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (allColumns.includes(curVal)) filterSel.value = curVal;
    else filterSel.value = 'ALL';
    filterSel.dataset.populatedWithClasses = allColumns.join(',');
  }

  const filterKelas = filterSel?.value || 'ALL';
  const columnsToShow = filterKelas === 'ALL' ? allColumns : [filterKelas];

  // Calculate teacher's weekly schedule
  const myWeeklySchedule = {};
  let myTotalWeeklySlots = 0;
  days.forEach(d => myWeeklySchedule[d] = []);

  if (sk && sk.roster && myCode) {
    sk.roster.forEach(slot => {
      Object.entries(slot.classes).forEach(([className, cellVal]) => {
        if (cellVal && (cellVal === myCode || cellVal.startsWith(myCode + '-'))) {
          const mCode = cellVal.includes('-') ? cellVal.split('-')[1] : '';
          const mName = sk.subjects[mCode] ? sk.subjects[mCode].name : cellVal;
          myWeeklySchedule[slot.day].push({
            jam: slot.jam,
            time: slot.time,
            className: className,
            subjectCode: mCode,
            subjectName: mName,
            cellVal: cellVal
          });
          myTotalWeeklySlots++;
        }
      });
    });
  }

  const todayMySlots = myWeeklySchedule[currentRosterDay] || [];
  const slots = sk.roster.filter(s => s.day === currentRosterDay);

  // Update tabs with day hour counts
  document.querySelectorAll('#roster-day-tabs button').forEach(b => {
    const bDay = b.textContent.trim().split(' ')[0].toUpperCase();
    const dCount = (myWeeklySchedule[bDay] || []).length;
    if (bDay === currentRosterDay) {
      b.classList.add('active-day');
      b.style.background = theme.primary;
      b.style.borderColor = theme.border;
      b.style.color = '#fff';
      b.style.fontWeight = '700';
    } else {
      b.classList.remove('active-day');
      b.style.background = '';
      b.style.borderColor = '';
      b.style.color = '';
      b.style.fontWeight = '';
    }
    b.innerHTML = `${bDay.charAt(0) + bDay.slice(1).toLowerCase()} <span style="background:${bDay === currentRosterDay ? '#ffffff' : (dCount > 0 ? theme.primary : '#94a3b8')};color:${bDay === currentRosterDay ? theme.primary : '#ffffff'};font-size:10px;font-weight:800;padding:1px 6px;border-radius:10px;margin-left:4px">${dCount} Jam</span>`;
  });

  const btnMy = document.getElementById('btn-my-roster');
  if (btnMy) {
    if (myScheduleOnly) {
      btnMy.style.background = '#f59e0b';
      btnMy.style.borderColor = '#d97706';
      btnMy.style.color = '#fff';
      btnMy.textContent = '👁️ Semua Jadwal';
    } else {
      btnMy.style.background = '';
      btnMy.style.borderColor = '';
      btnMy.style.color = '';
      btnMy.textContent = '⭐ Hanya Jadwal Saya';
    }
  }

  const lbl = document.getElementById('roster-info-lbl');
  if (lbl) lbl.textContent = `Hari: ${currentRosterDay} (${todayMySlots.length} Jam Mengajar)`;

  // Generate table rows
  let tableRows = '';
  slots.forEach(slot => {
    const firstCell = slot.classes['X MPLB'];
    const isSpecial = firstCell && ['UP. BENDERA', 'APEL PAGI', 'ISTIRAHAT', 'SHALAT DHUHUR', 'SHALAT JUMAT'].includes(firstCell);

    if (isSpecial) {
      tableRows += `
        <tr style="background:#fef7ea;text-align:center;font-weight:700;color:var(--amber)">
          <td style="text-align:center;font-weight:800">${slot.jam}</td>
          <td style="text-align:center;font-size:11px">${slot.time}</td>
          <td colspan="${columnsToShow.length}" style="letter-spacing:1px;padding:9px">
            🔔 ${firstCell}
          </td>
        </tr>`;
    } else {
      tableRows += `<tr>
        <td style="text-align:center;font-weight:800;background:var(--sand-dark)">${slot.jam}</td>
        <td style="text-align:center;font-size:11px;color:var(--text-mid)">${slot.time}</td>`;

      columnsToShow.forEach(c => {
        const val = slot.classes[c] || '-';
        const isMyCell = myCode && (val === myCode || val.startsWith(myCode + '-'));

        let mapelName = '';
        if (val.includes('-')) {
          const parts = val.split('-');
          const mCode = parts[1];
          if (sk.subjects[mCode]) mapelName = sk.subjects[mCode].name;
        }

        if (isMyCell) {
          tableRows += `
            <td style="padding:10px 8px;text-align:center;background:${theme.gradient} !important;color:#ffffff !important;border:2.5px solid ${theme.border} !important;box-shadow:0 4px 14px rgba(0,0,0,0.25);border-radius:8px;" title="${mapelName}">
              <div style="display:inline-block;background:#ffffff;color:${theme.primary};font-weight:900;font-size:13px;padding:2px 10px;border-radius:6px;box-shadow:0 2px 5px rgba(0,0,0,0.25)">
                ${val}
              </div>
              <div style="font-size:11.5px;font-weight:800;color:#ffffff;margin-top:4px;line-height:1.3;text-shadow:0 1px 2px rgba(0,0,0,0.35)">
                ${mapelName}
              </div>
              <div style="font-size:9.5px;color:${theme.badgeBg};font-weight:700;margin-top:2px">
                ${myTeacherObj ? myTeacherObj.name.split(',')[0] : ''}
              </div>
              <div style="font-size:9px;color:#ffffff;background:rgba(0,0,0,0.25);border-radius:4px;padding:2px 5px;margin-top:4px;font-weight:700">
                📍 Kelas ${c} · ⏰ Jam ${slot.jam}
              </div>
              <div style="background:#fef08a;color:#854d0e;font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:10px;margin-top:4px;display:inline-flex;align-items:center;gap:3px">
                <span>⭐</span><span>JADWAL ANDA</span>
              </div>
            </td>`;
        } else if (myScheduleOnly) {
          tableRows += `
            <td style="padding:8px;text-align:center;border-left:1px solid var(--border-lt);color:var(--text-muted);opacity:0.25">
              -
            </td>`;
        } else {
          let cellStyle = 'padding:8px 10px;text-align:center;border-left:1px solid var(--border-lt);';
          if (val === 'LITERASI') cellStyle += 'color:var(--blue);font-weight:600;background:#f3f7fd;';
          else if (val === 'BK') cellStyle += 'color:var(--amber);font-weight:600;background:#fff8ee;';
          else cellStyle += 'color:var(--text);opacity:0.85;';

          tableRows += `
            <td style="${cellStyle}" title="${mapelName ? mapelName : val}">
              <div style="font-size:12px;font-weight:600">${val}</div>
              ${mapelName ? `<div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;margin:0 auto">${mapelName}</div>` : ''}
            </td>`;
        }
      });
      tableRows += `</tr>`;
    }
  });

  // Teacher's weekly agenda cards
  const agendaCards = days.map(d => {
    const dSlots = myWeeklySchedule[d] || [];
    const isToday = d === currentRosterDay;
    return `
      <div style="background:${isToday ? theme.bgLight : '#ffffff'};border:1.5px solid ${isToday ? theme.primary : 'var(--border)'};border-radius:10px;padding:12px;min-width:155px;flex:1;box-shadow:${isToday ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="color:${isToday ? theme.primary : 'var(--text)'};font-size:13px">${d}</strong>
          <span class="badge" style="background:${dSlots.length > 0 ? theme.primary : '#94a3b8'};color:#fff;font-size:10px;font-weight:800">${dSlots.length} Jam</span>
        </div>
        ${dSlots.length === 0 ? `
          <div style="font-size:11px;color:var(--text-muted);font-style:italic;padding:4px 0">Tidak ada jam mengajar</div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:5px">
            ${dSlots.map(s => `
              <div style="background:#ffffff;border:1px solid ${theme.border};border-radius:6px;padding:5px 8px;font-size:11px">
                <div style="display:flex;justify-content:space-between;font-weight:800;color:${theme.primary}">
                  <span>Jam ${s.jam} (${s.time})</span>
                  <span style="background:${theme.badgeBg};color:${theme.badgeText};padding:1px 5px;border-radius:4px;font-size:10px">${s.className}</span>
                </div>
                <div style="font-size:10.5px;color:var(--text);font-weight:600;margin-top:2px">
                  ${s.subjectName}
                </div>
                <div style="font-size:9.5px;color:var(--text-muted);margin-top:1px">
                  Kode: <strong>${s.cellVal}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>`;
  }).join('');

  // Assemble full HTML
  container.innerHTML = `
    <!-- Personal Schedule Banner -->
    ${myTeacherObj ? `
    <div style="background:${theme.bgLight};border:2.5px solid ${theme.border};border-radius:12px;padding:18px 20px;margin-bottom:18px;box-shadow:0 4px 15px rgba(0,0,0,0.08)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:54px;height:54px;border-radius:12px;background:${theme.gradient};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;box-shadow:0 4px 10px rgba(0,0,0,0.2)">
            ${myCode}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="background:${theme.primary};color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px">KODE GURU: ${myCode}</span>
              <span style="background:${theme.badgeBg};color:${theme.badgeText};font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px">Tema: ${theme.name}</span>
              <span style="background:#fff;border:1px solid ${theme.border};color:${theme.primary};font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px">${myTeacherObj.jabatan || 'Guru Mapel'}</span>
            </div>
            <h3 style="margin:4px 0 2px 0;font-size:18px;font-weight:900;color:#1e293b">
              ${myTeacherObj.name}
            </h3>
            <div style="font-size:12px;color:${theme.badgeText}">
              Mapel: <strong>${myTeacherObj.mapel}</strong> · NIP: ${maskNIP(myTeacherObj.nip) || '-'}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <div style="background:#fff;border:1.5px solid ${theme.border};padding:6px 14px;border-radius:8px;text-align:center">
            <div style="font-size:11px;color:${theme.primary};font-weight:600">Total Beban</div>
            <div style="font-size:16px;font-weight:900;color:${theme.primary}">${myTeacherObj.jam_ajar || myTotalWeeklySlots} Jam / Mgg</div>
          </div>
          <div style="background:#fff;border:1.5px solid ${theme.border};padding:6px 14px;border-radius:8px;text-align:center">
            <div style="font-size:11px;color:${theme.primary};font-weight:600">Hari ${currentRosterDay}</div>
            <div style="font-size:16px;font-weight:900;color:${todayMySlots.length > 0 ? theme.primary : 'var(--text-muted)'}">${todayMySlots.length} Jam</div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;padding-top:10px;border-top:1px dashed ${theme.border};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px">
        <div style="color:#1e293b">
          <strong>Rombel yang Diampu:</strong> ${myTeacherObj.classes_taught ? Object.keys(myTeacherObj.classes_taught).map(c=>`<span style="background:#fff;border:1px solid ${theme.border};color:${theme.primary};font-weight:700;padding:2px 8px;border-radius:4px;margin-left:4px">${c}</span>`).join('') : '-'}
        </div>
        <div style="color:${theme.primary};font-weight:700">
          ${todayMySlots.length > 0 ? `🔥 Mengajar hari ${currentRosterDay} di: ${[...new Set(todayMySlots.map(s => s.className))].join(', ')}` : `☕ Tidak ada jam mengajar di kelas pada hari ${currentRosterDay}.`}
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Timetable Matrix Wrapped with Dedicated Horizontal Scroll -->
    <div class="tbl-wrap" style="overflow-x:auto;width:100%;max-width:100%;margin:10px 0;border:1.5px solid var(--border);border-radius:10px;-webkit-overflow-scrolling:touch;box-shadow:var(--shadow-sm);background:#fff">
      <table class="dtbl roster-table" style="font-size:11.5px;width:100%;min-width:960px;border-collapse:collapse">
        <thead>
          <tr style="background:var(--sand-dark)">
            <th style="width:40px;text-align:center;font-weight:800">Jam</th>
            <th style="width:95px;text-align:center;font-weight:800">Waktu</th>
            ${columnsToShow.map(c => {
              const wali = sk.wali_kelas[c]?.guru || '';
              const teachesInClassToday = todayMySlots.some(s => s.className === c);
              return `<th style="text-align:center;min-width:100px;padding:6px;${teachesInClassToday ? `background:${theme.bgLight};border-bottom:3px solid ${theme.primary}` : ''}">
                <div style="font-weight:800;color:${teachesInClassToday ? theme.primary : 'inherit'}">${c}</div>
                ${teachesInClassToday ? `<div style="display:inline-block;background:${theme.primary};color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;margin-top:2px">⭐ Mengajar Hari Ini</div>` : ''}
                <div style="font-size:9.5px;font-weight:normal;color:var(--text-muted);margin-top:2px">Wali: ${wali.split(',')[0]}</div>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <!-- Weekly Agenda Cards (Kapan & Di Kelas Mana Mengajar) -->
    ${myTeacherObj ? `
    <div style="margin-top:20px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:16px;max-width:100%;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <strong style="font-size:14.5px;color:#1e293b;display:flex;align-items:center;gap:6px">
          📅 Agenda Mengajar Lengkap: ${myTeacherObj.name} (Kode: ${myCode})
        </strong>
        <span style="font-size:11.5px;color:var(--text-muted)">Total: <strong>${myTotalWeeklySlots} Jam Tatap Muka</strong> / Pekan</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;width:100%">
        ${agendaCards}
      </div>
    </div>
    ` : ''}
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SK MANAGEMENT & AUTOMATED ROSTER GENERATOR MODULE
// ─────────────────────────────────────────────────────────────────────────────

function loadCustomSKData() {
  try {
    if (!window._defaultSKData && window.SMKN10_SK_DATA) {
      window._defaultSKData = JSON.parse(JSON.stringify(window.SMKN10_SK_DATA));
    }
    const saved = localStorage.getItem('smkn10_custom_sk_data');
    if (saved) {
      const customSK = JSON.parse(saved);
      if (customSK && customSK.teachers && Array.isArray(customSK.teachers)) {
        window.SMKN10_SK_DATA = customSK;
        window._isCustomSKActive = true;
        if (!window.SMKN10_SK_DATA.getTeacherTheme && window._defaultSKData && window._defaultSKData.getTeacherTheme) {
          window.SMKN10_SK_DATA.getTeacherTheme = window._defaultSKData.getTeacherTheme;
        } else if (!window.SMKN10_SK_DATA.getTeacherTheme) {
          window.SMKN10_SK_DATA.getTeacherTheme = function(code) {
            const c = String(code || '').padStart(2, '0');
            if (this.teacherThemes && this.teacherThemes[c]) return this.teacherThemes[c];
            let hash = 0;
            for (let i = 0; i < c.length; i++) hash = c.charCodeAt(i) + ((hash << 5) - hash);
            const hue = Math.abs(hash) % 360;
            return {
              name: 'Custom',
              primary: 'hsl(' + hue + ', 70%, 45%)',
              gradient: 'linear-gradient(135deg, hsl(' + hue + ', 75%, 38%) 0%, hsl(' + hue + ', 70%, 52%) 100%)',
              bgLight: 'hsl(' + hue + ', 85%, 96%)',
              border: 'hsl(' + hue + ', 70%, 50%)',
              badgeBg: 'hsl(' + hue + ', 80%, 90%)',
              badgeText: 'hsl(' + hue + ', 90%, 25%)',
              pillBg: '#ffffff',
              pillText: 'hsl(' + hue + ', 90%, 20%)'
            };
          };
        }
      }
    }
  } catch(err) {
    console.error('Error loading custom SK data:', err);
  }
}

function updateSettingsSKCard() {
  const sk = window.SMKN10_SK_DATA;
  if (!sk) return;

  const badge = document.getElementById('settings-sk-badge');
  const nomorEl = document.getElementById('sk-stat-nomor');
  const taEl = document.getElementById('sk-stat-ta');
  const kepsekEl = document.getElementById('sk-stat-kepsek');
  const countsEl = document.getElementById('sk-stat-counts');
  const resetBtn = document.getElementById('settings-reset-sk-btn');
  const rosterResetBtn = document.getElementById('roster-reset-sk-btn');

  const isCustom = !!window._isCustomSKActive;
  if (badge) {
    if (isCustom) {
      badge.textContent = '✨ SK Kustom Aktif';
      badge.style.background = '#dbeafe';
      badge.style.color = '#1e40af';
    } else {
      badge.textContent = 'SK SMKN 10 Aktif';
      badge.style.background = '#dcfce7';
      badge.style.color = '#166534';
    }
  }

  if (nomorEl && sk.school) nomorEl.textContent = sk.school.sk_nomor || '-';
  if (taEl && sk.school) taEl.textContent = `${sk.school.tahun_ajaran || '2026/2027'} (${sk.school.semester || 'Ganjil'})`;
  if (kepsekEl && sk.school) kepsekEl.textContent = sk.school.kepala_sekolah || '-';

  if (countsEl) {
    const numTeachers = (sk.teachers || []).length;
    let numClasses = 0;
    if (sk.classes && Array.isArray(sk.classes)) numClasses = sk.classes.length;
    else if (sk.roster && sk.roster[0]?.classes) numClasses = Object.keys(sk.roster[0].classes).length;
    const numSlots = (sk.roster || []).length;
    countsEl.textContent = `${numTeachers} Guru • ${numClasses || 9} Rombel • ${numSlots} Slot`;
  }

  if (resetBtn) resetBtn.style.display = isCustom ? 'inline-flex' : 'none';
  if (rosterResetBtn) rosterResetBtn.style.display = isCustom ? 'inline-flex' : 'none';
}

function updateRosterHeaderSKInfo() {
  const sk = window.SMKN10_SK_DATA;
  if (!sk) return;
  const titleEl = document.getElementById('roster-sk-title');
  const kepsekEl = document.getElementById('roster-sk-kepsek');
  const resetBtn = document.getElementById('roster-reset-sk-btn');

  if (titleEl && sk.school) {
    const isCustom = !!window._isCustomSKActive;
    titleEl.innerHTML = `📜 ${isCustom ? 'SK Pembagian Tugas Kustom' : 'Lampiran 4 SK Beban Mengajar'} No: ${escapeHtml(sk.school.sk_nomor || '034/ /SMKN 10 KLK/VII/2026')} &bull; T.A ${escapeHtml(sk.school.tahun_ajaran || '2026/2027')} (${escapeHtml(sk.school.semester || 'Ganjil')})`;
  }
  if (kepsekEl && sk.school) {
    const maskedKepsekNip = maskNIP(sk.school.nip_kepala_sekolah);
    kepsekEl.innerHTML = `Kepala Sekolah: <strong>${escapeHtml(sk.school.kepala_sekolah || '-')}</strong> (${escapeHtml(maskedKepsekNip !== '-' ? 'NIP ' + maskedKepsekNip : 'NIP Disamarkan 🛡️')}) &bull; ${escapeHtml(sk.school.name || 'SMKN 10 Kolaka')}`;
  }
  if (resetBtn) {
    resetBtn.style.display = window._isCustomSKActive ? 'inline-flex' : 'none';
  }
}

function openSKUploadModal() {
  const modal = document.getElementById('modal-sk-upload');
  if (!modal) return;
  modal.style.display = 'flex';
  const inp = document.getElementById('sk-file-input');
  if (inp) inp.value = '';
  const prevBox = document.getElementById('sk-preview-box');
  if (prevBox) prevBox.style.display = 'none';
  const autoNotice = document.getElementById('sk-prev-auto-roster-notice');
  if (autoNotice) autoNotice.style.display = 'none';
  const btnProcess = document.getElementById('btn-process-sk');
  if (btnProcess) btnProcess.disabled = true;
  window._parsedSKDataToApply = null;
}

function closeSKUploadModal() {
  const modal = document.getElementById('modal-sk-upload');
  if (modal) modal.style.display = 'none';
  window._parsedSKDataToApply = null;
}

function initSKDragAndDrop() {
  const dropZone = document.getElementById('sk-drop-zone');
  if (!dropZone) return;
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      onSKFileSelected(dt.files);
    }
  }, false);
}

function parseClassesTaught(str) {
  if (!str) return {};
  if (typeof str === 'object') return str;
  const res = {};
  const parts = String(str).split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    let cls = part;
    let hours = 2;
    if (part.includes(':') || part.includes('=')) {
      const segs = part.split(/[:=]/);
      cls = segs[0].trim();
      const num = parseInt(segs[1].replace(/\D/g, ''), 10);
      if (!isNaN(num)) hours = num;
    } else {
      const m = part.match(/^(.*?)\s+(\d+)\s*(?:jam|jp)?$/i);
      if (m) {
        cls = m[1].trim();
        hours = parseInt(m[2], 10);
      }
    }
    if (cls) res[cls] = hours;
  }
  return res;
}

function parseClassRomBel(str) {
  if (!str) return null;
  const s = String(str).trim();
  let tingkat = '';
  let jurusan = '';
  const m1 = s.match(/^(X|XI|XII|XIII)\s*[-_ ]?\s*([A-Za-z0-9]+)$/i);
  if (m1) {
    tingkat = m1[1].toUpperCase();
    jurusan = m1[2].toUpperCase();
  } else {
    const m2 = s.match(/^([A-Za-z0-9]+)\s*[-_ ]?\s*(X|XI|XII|XIII)$/i);
    if (m2) {
      jurusan = m2[1].toUpperCase();
      tingkat = m2[2].toUpperCase();
    }
  }
  if (jurusan === 'TKJ') jurusan = 'TJKT';
  return tingkat && jurusan ? { tingkat, jurusan, key: jurusan + '-' + tingkat, display: tingkat + ' ' + jurusan } : null;
}

function downloadSKTemplateExcel() {
  const XLSX_LIB = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
  if (!XLSX_LIB) {
    showToast('Library XLSX belum tersedia.', 'err');
    return;
  }
  const sk = window.SMKN10_SK_DATA || {};
  const wb = XLSX_LIB.utils.book_new();

  // 1. Sheet Info_Sekolah
  const infoData = [
    ['PARAMETER', 'NILAI', 'PETUNJUK PENGISIAN'],
    ['Nama Sekolah', sk.school?.name || 'SMK Negeri 10 Kolaka', 'Nama lengkap sekolah'],
    ['Nomor SK', sk.school?.sk_nomor || '034/      /SMKN 10 KLK/VII/2026', 'Nomor surat keputusan pembagian tugas mengajar'],
    ['Tanggal SK', sk.school?.sk_tanggal || '13 Juli 2026', 'Tanggal penetapan SK'],
    ['Semester', sk.school?.semester || 'Ganjil', 'Isi: Ganjil atau Genap'],
    ['Tahun Ajaran', sk.school?.tahun_ajaran || '2026/2027', 'Contoh: 2026/2027'],
    ['Kepala Sekolah', sk.school?.kepala_sekolah || 'TABING, S.Pd,. M.Pd', 'Nama lengkap Kepala Sekolah beserta gelar'],
    ['NIP Kepala Sekolah', sk.school?.nip_kepala_sekolah || '19660921 199412 1004', 'NIP Kepala Sekolah'],
    ['Pangkat / Golongan Kepsek', sk.school?.gol_kepala_sekolah || 'Pembina Utama Muda Gol. IV/c', 'Pangkat / Golongan'],
    ['Tempat Ditetapkan', sk.school?.tempat || 'Tanggetada', 'Kota / Kecamatan penetapan SK']
  ];
  const wsInfo = XLSX_LIB.utils.aoa_to_sheet(infoData);
  XLSX_LIB.utils.book_append_sheet(wb, wsInfo, 'Info_Sekolah');

  // 2. Sheet SK_Guru
  const guruHeader = [
    'No', 'Kode Guru', 'Nama Guru', 'NIP', 'Golongan', 'Jabatan',
    'Mata Pelajaran', 'Jumlah Jam Ajar', 'Tugas Tambahan', 'Jumlah Jam Pokok',
    'Kelas Yang Diajar', 'PIN Login Guru'
  ];
  const guruRows = (sk.teachers || []).map((t, idx) => {
    let clsStr = '';
    if (t.classes_taught) {
      clsStr = Object.entries(t.classes_taught).map(([c, h]) => `${c}: ${h}`).join(', ');
    }
    const pin = (db && db.teacherPins && db.teacherPins[t.no]) ? db.teacherPins[t.no] : '123456';
    return [
      t.no || (idx + 1),
      t.code || String(t.no).padStart(2, '0'),
      t.name || '',
      t.nip || '',
      t.gol || '',
      t.jabatan || '',
      t.mapel || '',
      t.jam_ajar || 0,
      t.tugas_tambahan || 0,
      t.jam_pokok || (t.jam_ajar || 0) + (t.tugas_tambahan || 0),
      clsStr,
      pin
    ];
  });
  const wsGuru = XLSX_LIB.utils.aoa_to_sheet([guruHeader, ...guruRows]);
  XLSX_LIB.utils.book_append_sheet(wb, wsGuru, 'SK_Guru');

  // 3. Sheet Roster_Jadwal
  let classList = ['X MPLB', 'X TKJ', 'X GP', 'XI MPLB', 'XI TKJ', 'XI GP', 'XII MPLB', 'XII TKJ', 'XII GP'];
  if (sk.classes && Array.isArray(sk.classes) && sk.classes.length > 0) {
    classList = sk.classes;
  } else if (sk.roster && sk.roster.length && sk.roster[0].classes) {
    classList = Object.keys(sk.roster[0].classes);
  }
  const rosterHeader = ['Hari', 'Jam Ke', 'Waktu', ...classList];
  const rosterRows = (sk.roster || []).map(slot => {
    const row = [slot.day, slot.jam, slot.time];
    classList.forEach(c => {
      row.push(slot.classes ? (slot.classes[c] || '') : '');
    });
    return row;
  });
  const wsRoster = XLSX_LIB.utils.aoa_to_sheet([rosterHeader, ...rosterRows]);
  XLSX_LIB.utils.book_append_sheet(wb, wsRoster, 'Roster_Jadwal');

  // 4. Sheet Data_Siswa
  const siswaHeader = ['No', 'Kelas', 'Nama Siswa', 'NISN', 'Jenis Kelamin'];
  const siswaRows = [];
  let sNo = 1;
  Object.entries(db.siswa || {}).forEach(([key, arr]) => {
    const parts = key.split('-');
    const displayClass = parts.length >= 2 ? `${parts[1]} ${parts[0]}` : key;
    if (Array.isArray(arr)) {
      arr.forEach(nama => {
        siswaRows.push([sNo++, displayClass, nama, '', '']);
      });
    }
  });
  const wsSiswa = XLSX_LIB.utils.aoa_to_sheet([siswaHeader, ...siswaRows]);
  XLSX_LIB.utils.book_append_sheet(wb, wsSiswa, 'Data_Siswa');

  XLSX_LIB.writeFile(wb, 'Template_SK_dan_Jadwal_SMKN10_Kolaka.xlsx');
  showToast('Format Template SK berhasil diunduh 📥', 'ok');
}

function parseSKExcel(wb) {
  const XLSX_LIB = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
  const result = {
    school: {},
    teachers: [],
    roster: [],
    siswa: {},
    detectedClasses: [],
    rosterNeedsAutoGeneration: false,
    totalMapelCount: 0,
    totalSiswaCount: 0
  };

  const sheetNames = wb.SheetNames;

  // 1. Sheet Info_Sekolah
  const infoSheetName = sheetNames.find(n => /info|sekolah|identitas|sk/i.test(n));
  if (infoSheetName && XLSX_LIB) {
    const rows = XLSX_LIB.utils.sheet_to_json(wb.Sheets[infoSheetName], { header: 1 });
    rows.forEach(r => {
      if (!Array.isArray(r) || r.length < 2) return;
      const k = String(r[0] || '').trim().toLowerCase();
      const v = String(r[1] || '').trim();
      if (!v) return;
      if (/nama sekolah/i.test(k)) result.school.name = v;
      else if (/nomor sk/i.test(k)) result.school.sk_nomor = v;
      else if (/tanggal/i.test(k)) result.school.sk_tanggal = v;
      else if (/semester/i.test(k)) result.school.semester = v;
      else if (/tahun ajaran/i.test(k)) result.school.tahun_ajaran = v;
      else if (/nip kepala/i.test(k)) result.school.nip_kepala_sekolah = v;
      else if (/kepala sekolah/i.test(k)) result.school.kepala_sekolah = v;
      else if (/pangkat|golongan/i.test(k)) result.school.gol_kepala_sekolah = v;
      else if (/tempat/i.test(k)) result.school.tempat = v;
    });
  }

  // 2. Sheet SK_Guru
  const guruSheetName = sheetNames.find(n => /guru|pendidik|teacher/i.test(n));
  if (guruSheetName && XLSX_LIB) {
    const rows = XLSX_LIB.utils.sheet_to_json(wb.Sheets[guruSheetName]);
    rows.forEach((r, idx) => {
      const keys = Object.keys(r);
      const findVal = (regex) => {
        const k = keys.find(x => regex.test(x));
        return k ? r[k] : '';
      };

      const name = String(findVal(/nama/i) || '').trim();
      if (!name) return;

      const no = parseInt(findVal(/^no$|nomor|urut/i) || (idx + 1), 10);
      let code = String(findVal(/kode/i) || '').trim();
      if (!code) code = String(no).padStart(2, '0');
      else if (code.length === 1 && !isNaN(parseInt(code, 10))) code = '0' + code;

      const nip = String(findVal(/nip/i) || '').trim();
      const gol = String(findVal(/gol/i) || '').trim();
      const jabatan = String(findVal(/jabatan/i) || '').trim();
      const mapel = String(findVal(/mapel|mata pelajaran/i) || '').trim();
      const jamAjar = parseInt(findVal(/jam ajar|beban ajar|jam_ajar/i) || '0', 10);
      const tugasTambahan = parseInt(findVal(/tambahan/i) || '0', 10);
      const jamPokok = parseInt(findVal(/jam pokok|total jam/i) || (jamAjar + tugasTambahan), 10);
      const kelasRaw = findVal(/kelas/i) || '';
      const classesTaught = parseClassesTaught(kelasRaw);
      const pin = String(findVal(/pin/i) || '').trim();

      Object.keys(classesTaught).forEach(cls => {
        if (!result.detectedClasses.includes(cls)) result.detectedClasses.push(cls);
      });

      result.teachers.push({
        no,
        name,
        code,
        nip,
        gol,
        jabatan,
        mapel,
        jam_ajar: jamAjar,
        tugas_tambahan: tugasTambahan,
        jam_pokok: jamPokok,
        classes_taught: classesTaught,
        pin: pin || ''
      });
    });
  }

  // 3. Sheet Roster_Jadwal
  const rosterSheetName = sheetNames.find(n => /roster|jadwal|timetable|schedule/i.test(n));
  if (rosterSheetName && XLSX_LIB) {
    const rows = XLSX_LIB.utils.sheet_to_json(wb.Sheets[rosterSheetName]);
    rows.forEach(r => {
      const keys = Object.keys(r);
      const dayKey = keys.find(k => /hari|day/i.test(k));
      const jamKey = keys.find(k => /jam ke|jam_ke|^jam$/i.test(k));
      const timeKey = keys.find(k => /waktu|pukul|time/i.test(k));

      const day = String(dayKey ? r[dayKey] : '').trim().toUpperCase();
      const jam = parseInt(jamKey ? r[jamKey] : '0', 10);
      const time = String(timeKey ? r[timeKey] : '').trim();

      if (!day || !jam) return;

      const slotClasses = {};
      keys.forEach(k => {
        if (k === dayKey || k === jamKey || k === timeKey || /^no$/i.test(k)) return;
        slotClasses[k.trim()] = String(r[k] || '').trim();
        if (!result.detectedClasses.includes(k.trim())) result.detectedClasses.push(k.trim());
      });

      result.roster.push({
        day,
        jam,
        time,
        classes: slotClasses
      });
    });
  }

  if (result.roster.length === 0) {
    result.rosterNeedsAutoGeneration = true;
  }

  // 4. Sheet Data_Siswa
  const siswaSheetName = sheetNames.find(n => /siswa|student|peserta/i.test(n));
  if (siswaSheetName && XLSX_LIB) {
    const rows = XLSX_LIB.utils.sheet_to_json(wb.Sheets[siswaSheetName]);
    rows.forEach(r => {
      const keys = Object.keys(r);
      const kKelas = keys.find(x => /kelas|rombel/i.test(x));
      const kNama = keys.find(x => /nama/i.test(x));
      if (!kKelas || !kNama) return;

      const rawKelas = String(r[kKelas] || '').trim();
      const nama = String(r[kNama] || '').trim();
      if (!rawKelas || !nama) return;

      const parsed = parseClassRomBel(rawKelas);
      const rombelKey = parsed ? parsed.key : rawKelas;
      if (!result.siswa[rombelKey]) result.siswa[rombelKey] = [];
      if (!result.siswa[rombelKey].includes(nama)) {
        result.siswa[rombelKey].push(nama);
        result.totalSiswaCount++;
      }
    });
  }

  let mCount = 0;
  result.teachers.forEach(t => {
    const subs = String(t.mapel || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    mCount += Math.max(1, subs.length);
  });
  result.totalMapelCount = mCount;

  return result;
}

function normalizeParsedSK(json) {
  const result = {
    school: json.school || {},
    teachers: json.teachers || [],
    roster: json.roster || [],
    siswa: json.siswa || {},
    detectedClasses: json.classes || [],
    rosterNeedsAutoGeneration: !json.roster || !json.roster.length,
    totalMapelCount: 0,
    totalSiswaCount: 0
  };
  let mCount = 0;
  (result.teachers || []).forEach(t => {
    const subs = String(t.mapel || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    mCount += Math.max(1, subs.length);
    Object.keys(t.classes_taught || {}).forEach(cls => {
      if (!result.detectedClasses.includes(cls)) result.detectedClasses.push(cls);
    });
  });
  result.totalMapelCount = mCount;
  let sCount = 0;
  Object.values(result.siswa || {}).forEach(arr => {
    if (Array.isArray(arr)) sCount += arr.length;
  });
  result.totalSiswaCount = sCount;
  return result;
}

function onSKFileSelected(files) {
  if (!files || !files.length) return;
  const file = files[0];
  const name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const parsed = normalizeParsedSK(json);
        previewSKData(file, parsed);
      } catch(err) {
        showToast('Gagal membaca file JSON: ' + err.message, 'err');
      }
    };
    reader.readAsText(file);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX_LIB = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
    if (!XLSX_LIB) {
      showToast('Library Excel (SheetJS) belum termuat. Periksa koneksi atau refresh halaman.', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX_LIB.read(data, { type: 'array' });
        const parsed = parseSKExcel(wb);
        previewSKData(file, parsed);
      } catch(err) {
        showToast('Gagal memproses file Excel: ' + err.message, 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Format file tidak didukung. Harap pilih .xlsx, .xls, atau .json', 'err');
  }
}

function previewSKData(file, parsed) {
  window._parsedSKDataToApply = parsed;
  const prevBox = document.getElementById('sk-preview-box');
  if (prevBox) prevBox.style.display = 'block';

  set('sk-prev-filename', file.name);
  set('sk-prev-filesize', (file.size / 1024).toFixed(1) + ' KB');
  set('sk-prev-guru-count', (parsed.teachers || []).length);
  set('sk-prev-mapel-count', parsed.totalMapelCount || (parsed.teachers || []).length);
  set('sk-prev-roster-count', (parsed.roster || []).length);
  set('sk-prev-siswa-count', parsed.totalSiswaCount || 0);

  const infoStr = [
    parsed.school?.sk_nomor || 'No. SK -',
    parsed.school?.tahun_ajaran ? `T.A ${parsed.school.tahun_ajaran} (${parsed.school.semester || 'Ganjil'})` : '',
    parsed.school?.kepala_sekolah ? `Kepsek: ${parsed.school.kepala_sekolah}` : ''
  ].filter(Boolean).join(' • ');
  set('sk-prev-sk-info', infoStr || 'Info sekolah standar SMKN 10');

  const autoNotice = document.getElementById('sk-prev-auto-roster-notice');
  if (autoNotice) {
    autoNotice.style.display = parsed.rosterNeedsAutoGeneration ? 'block' : 'none';
  }

  const btnProcess = document.getElementById('btn-process-sk');
  if (btnProcess) btnProcess.disabled = false;
}

function generateDefaultRosterFromTeachers(teachers, detectedClasses) {
  let classes = detectedClasses && detectedClasses.length > 0
    ? [...detectedClasses]
    : ['X MPLB', 'X TKJ', 'X GP', 'XI MPLB', 'XI TKJ', 'XI GP', 'XII MPLB', 'XII TKJ', 'XII GP'];

  const daysConfig = [
    { day: 'SENIN', slots: [
      { jam: 1, time: '07.00 - 07.30', isCeremony: true, label: 'UP. BENDERA' },
      { jam: 2, time: '07.30 - 08.15' },
      { jam: 3, time: '08.15 - 09.00' },
      { jam: 4, time: '09.00 - 09.45' },
      { jam: 5, time: '10.15 - 11.00' },
      { jam: 6, time: '11.00 - 11.45' },
      { jam: 7, time: '12.30 - 13.15' },
      { jam: 8, time: '13.15 - 14.00' },
      { jam: 9, time: '14.00 - 14.45' },
      { jam: 10, time: '14.45 - 15.30' }
    ]},
    { day: 'SELASA', slots: [
      { jam: 1, time: '07.15 - 08.00' },
      { jam: 2, time: '08.00 - 08.45' },
      { jam: 3, time: '08.45 - 09.30' },
      { jam: 4, time: '09.30 - 10.15' },
      { jam: 5, time: '10.45 - 11.30' },
      { jam: 6, time: '11.30 - 12.15' },
      { jam: 7, time: '13.00 - 13.45' },
      { jam: 8, time: '13.45 - 14.30' },
      { jam: 9, time: '14.30 - 15.15' },
      { jam: 10, time: '15.15 - 16.00' }
    ]},
    { day: 'RABU', slots: [
      { jam: 1, time: '07.15 - 08.00' },
      { jam: 2, time: '08.00 - 08.45' },
      { jam: 3, time: '08.45 - 09.30' },
      { jam: 4, time: '09.30 - 10.15' },
      { jam: 5, time: '10.45 - 11.30' },
      { jam: 6, time: '11.30 - 12.15' },
      { jam: 7, time: '13.00 - 13.45' },
      { jam: 8, time: '13.45 - 14.30' },
      { jam: 9, time: '14.30 - 15.15' },
      { jam: 10, time: '15.15 - 16.00' }
    ]},
    { day: 'KAMIS', slots: [
      { jam: 1, time: '07.15 - 08.00' },
      { jam: 2, time: '08.00 - 08.45' },
      { jam: 3, time: '08.45 - 09.30' },
      { jam: 4, time: '09.30 - 10.15' },
      { jam: 5, time: '10.45 - 11.30' },
      { jam: 6, time: '11.30 - 12.15' },
      { jam: 7, time: '13.00 - 13.45' },
      { jam: 8, time: '13.45 - 14.30' },
      { jam: 9, time: '14.30 - 15.15' },
      { jam: 10, time: '15.15 - 16.00' }
    ]},
    { day: 'JUMAT', slots: [
      { jam: 1, time: '07.00 - 07.30', isCeremony: true, label: 'IMTAQ / SENAM' },
      { jam: 2, time: '07.30 - 08.15' },
      { jam: 3, time: '08.15 - 09.00' },
      { jam: 4, time: '09.00 - 09.45' },
      { jam: 5, time: '10.05 - 10.50' },
      { jam: 6, time: '10.50 - 11.35' }
    ]},
    { day: 'SABTU', slots: [
      { jam: 1, time: '07.15 - 08.00' },
      { jam: 2, time: '08.00 - 08.45' },
      { jam: 3, time: '08.45 - 09.30' },
      { jam: 4, time: '09.45 - 10.30' },
      { jam: 5, time: '10.30 - 11.15' },
      { jam: 6, time: '11.15 - 12.00' }
    ]}
  ];

  // Requirements pool per class
  const classReqs = {};
  classes.forEach(c => classReqs[c] = []);

  (teachers || []).forEach(t => {
    const code = t.code || String(t.no).padStart(2, '0');
    Object.entries(t.classes_taught || {}).forEach(([clsName, hours]) => {
      const targetClass = classes.find(c => c.toLowerCase() === clsName.toLowerCase()) || clsName;
      if (!classReqs[targetClass]) classReqs[targetClass] = [];
      const h = Math.max(1, parseInt(hours, 10) || 2);
      for (let i = 0; i < h; i++) {
        classReqs[targetClass].push({
          teacherNo: t.no,
          teacherCode: code,
          mapel: t.mapel || ''
        });
      }
    });
  });

  const roster = [];
  daysConfig.forEach(dayConf => {
    dayConf.slots.forEach(slotConf => {
      const slotObj = {
        day: dayConf.day,
        jam: slotConf.jam,
        time: slotConf.time,
        classes: {}
      };

      const scheduledTeachersInSlot = new Set();
      classes.forEach(cls => {
        if (slotConf.isCeremony) {
          slotObj.classes[cls] = (cls === classes[0] ? slotConf.label : '');
          return;
        }

        const pool = classReqs[cls] || [];
        const candIdx = pool.findIndex(item => !scheduledTeachersInSlot.has(item.teacherCode));
        if (candIdx >= 0) {
          const item = pool.splice(candIdx, 1)[0];
          scheduledTeachersInSlot.add(item.teacherCode);
          slotObj.classes[cls] = item.teacherCode;
        } else {
          slotObj.classes[cls] = '';
        }
      });

      roster.push(slotObj);
    });
  });

  return roster;
}

function syncMapelFromSKTeachers(teachers) {
  if (!Array.isArray(teachers) || teachers.length === 0) return;
  const customMapel = (db.mapel || []).filter(m => m.isCustom);
  const newMapelList = [];
  let nextId = 2001;

  teachers.forEach(t => {
    const subjectNames = String(t.mapel || 'Mata Pelajaran')
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    if (subjectNames.length === 0) subjectNames.push('Mata Pelajaran');

    const classObjs = [];
    Object.keys(t.classes_taught || {}).forEach(cStr => {
      const parsed = parseClassRomBel(cStr);
      if (parsed) {
        if (!classObjs.some(k => k.jurusan === parsed.jurusan && k.tingkat === parsed.tingkat)) {
          classObjs.push({ jurusan: parsed.jurusan, tingkat: parsed.tingkat });
        }
      } else {
        const parts = cStr.trim().split(/\s+/);
        if (parts.length >= 2) {
          const tingkat = parts[0].toUpperCase();
          let jurusan = parts.slice(1).join(' ').toUpperCase();
          if (jurusan === 'TKJ') jurusan = 'TJKT';
          classObjs.push({ jurusan, tingkat });
        }
      }
    });

    subjectNames.forEach(subName => {
      newMapelList.push({
        id: nextId++,
        nama: subName,
        guruNo: t.no,
        guruNama: t.name,
        guruCode: t.code || String(t.no).padStart(2, '0'),
        guruNip: t.nip || '',
        kelas: classObjs.length > 0 ? classObjs : [{ jurusan: 'TJKT', tingkat: 'X' }],
        isCustom: false
      });
    });
  });

  db.mapel = [...newMapelList, ...customMapel];
  saveDB();
}

function processSelectedSKFile() {
  const parsed = window._parsedSKDataToApply;
  if (!parsed) {
    showToast('Pilih file SK terlebih dahulu.', 'err');
    return;
  }

  const options = {
    importRoster: document.getElementById('sk-opt-roster')?.checked ?? true,
    importTeachers: document.getElementById('sk-opt-teachers')?.checked ?? true,
    importMapel: document.getElementById('sk-opt-mapel')?.checked ?? true,
    importSiswa: document.getElementById('sk-opt-siswa')?.checked ?? true,
    importSchool: document.getElementById('sk-opt-school')?.checked ?? true
  };

  applyImportedSKData(parsed, options);
}

function applyImportedSKData(parsed, options = {}) {
  if (!parsed) return;

  if (!window._defaultSKData && window.SMKN10_SK_DATA) {
    window._defaultSKData = JSON.parse(JSON.stringify(window.SMKN10_SK_DATA));
  }

  const newSK = JSON.parse(JSON.stringify(window.SMKN10_SK_DATA || {}));
  newSK.teacherThemes = newSK.teacherThemes || window._defaultSKData?.teacherThemes || {};

  // 1. School Info
  if (options.importSchool && parsed.school && Object.keys(parsed.school).length) {
    newSK.school = Object.assign({}, newSK.school, parsed.school);
    if (db.guru) {
      if (parsed.school.tahun_ajaran) db.guru.ta = parsed.school.tahun_ajaran;
      if (parsed.school.semester) db.guru.semester = parsed.school.semester;
    }
  }

  // 2. Teachers & Accounts
  let updatedTeachersCount = 0;
  if (options.importTeachers && parsed.teachers && parsed.teachers.length) {
    newSK.teachers = parsed.teachers;
    updatedTeachersCount = parsed.teachers.length;

    db.teacherPins = db.teacherPins || {};
    parsed.teachers.forEach(t => {
      if (t.pin) {
        db.teacherPins[t.no] = String(t.pin).trim();
      } else if (!db.teacherPins[t.no]) {
        db.teacherPins[t.no] = '123456';
      }
    });
  }

  // 3. Roster / Schedule
  let updatedRosterCount = 0;
  if (options.importRoster) {
    if (parsed.roster && parsed.roster.length) {
      newSK.roster = parsed.roster;
      updatedRosterCount = parsed.roster.length;
    } else if (parsed.teachers && parsed.teachers.length) {
      newSK.roster = generateDefaultRosterFromTeachers(parsed.teachers, parsed.detectedClasses);
      updatedRosterCount = newSK.roster.length;
    }
    if (parsed.detectedClasses && parsed.detectedClasses.length) {
      newSK.classes = parsed.detectedClasses;
    }
  }

  // Save custom SK to storage & active window
  newSK.isCustom = true;
  window.SMKN10_SK_DATA = newSK;
  window._isCustomSKActive = true;
  try {
    localStorage.setItem('smkn10_custom_sk_data', JSON.stringify(newSK));
  } catch(e) {
    console.error('Storage quota error:', e);
  }

  // 4. Mapel / Subjects
  let updatedMapelCount = 0;
  if (options.importMapel && parsed.teachers && parsed.teachers.length) {
    syncMapelFromSKTeachers(parsed.teachers);
    updatedMapelCount = db.mapel.filter(m => !m.isCustom).length;
  }

  // 5. Siswa
  let updatedSiswaCount = 0;
  if (options.importSiswa && parsed.siswa && Object.keys(parsed.siswa).length) {
    db.siswa = db.siswa || {};
    Object.entries(parsed.siswa).forEach(([rombelKey, sList]) => {
      if (Array.isArray(sList) && sList.length) {
        db.siswa[rombelKey] = sList;
        updatedSiswaCount += sList.length;
      }
    });
  }

  saveDB();

  populateSKDropdowns();
  populateTeacherSwitchDropdown();
  renderRosterView();
  renderMapelList();
  renderDashboard();
  if (typeof lihatSiswa === 'function') lihatSiswa();
  updateAdminLockUI();
  updateSettingsSKCard();
  refreshSidebarProfile();

  closeSKUploadModal();

  showToast(`🎉 Sukses Menerapkan SK Baru! (${updatedTeachersCount} Guru, ${updatedMapelCount} Mapel, ${updatedRosterCount} Slot Roster, ${updatedSiswaCount} Siswa)`, 'ok');
}

function resetSKDataToDefault() {
  appConfirm('Apakah Anda yakin ingin mengembalikan seluruh jadwal, guru, dan mapel ke SK Bawaan SMKN 10 Kolaka?', () => {
    localStorage.removeItem('smkn10_custom_sk_data');
    window._isCustomSKActive = false;
    if (window._defaultSKData) {
      window.SMKN10_SK_DATA = JSON.parse(JSON.stringify(window._defaultSKData));
    }
    syncAllSKMapel(true);
    repairAndSyncHaidilMapel();
    repairAndSyncTJKTMapel();
    saveDB();

    populateSKDropdowns();
    populateTeacherSwitchDropdown();
    renderRosterView();
    renderMapelList();
    renderDashboard();
    if (typeof lihatSiswa === 'function') lihatSiswa();
    updateAdminLockUI();
    updateSettingsSKCard();
    refreshSidebarProfile();

    showToast('SK dan Jadwal berhasil dikembalikan ke format standar SMKN 10 Kolaka 🔄', 'info');
  });
}


// ─────────────────────────────────────────────
//  AUDIO SYNTHESIZER (WEB AUDIO API)
// ─────────────────────────────────────────────
const Sound = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  beep() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch(_) {}
  },
  success() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.18, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } catch(_) {}
  },
  warning() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch(_) {}
  }
};

function toggleQrSound() {
  Sound.enabled = !Sound.enabled;
  const btn = document.getElementById('btn-qr-sound');
  if (btn) btn.textContent = Sound.enabled ? '🔊 Suara: ON' : '🔇 Suara: OFF';
  showToast(Sound.enabled ? 'Suara scanner diaktifkan 🔊' : 'Suara scanner dimatikan 🔇', 'info');
}

// ─────────────────────────────────────────────
//  ATTENDANCE MODE SWITCHER
// ─────────────────────────────────────────────
let currentAbsensiMode = 'manual';

function switchAbsensiMode(mode) {
  currentAbsensiMode = mode;
  document.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-mode-${mode}`);
  if (btn) btn.classList.add('active');

  const pManual = document.getElementById('ab-panel-manual');
  const pQr = document.getElementById('ab-panel-qr');
  const pFace = document.getElementById('ab-panel-face');

  if (pManual) pManual.style.display = mode === 'manual' ? 'block' : 'none';
  if (pQr) pQr.style.display = mode === 'qr' ? 'block' : 'none';
  if (pFace) pFace.style.display = mode === 'face' ? 'block' : 'none';

  if (mode !== 'qr') stopStudentQrScanner();
  if (mode !== 'face') stopFaceScanner();

  if (mode === 'qr') updateQrStats();
  if (mode === 'face') updateFaceStats();
}

// ─────────────────────────────────────────────
//  STUDENT QR CODE SCANNER
// ─────────────────────────────────────────────
let studentQrScannerInstance = null;
let lastScannedQrMap = {};
let isStartingQrScanner = false;

function startStudentQrScanner() {
  const ph = document.getElementById('qr-placeholder');
  const startBtn = document.getElementById('btn-start-qr');
  const stopBtn = document.getElementById('btn-stop-qr');
  const phBtn = ph ? ph.querySelector('button') : null;

  if (isStartingQrScanner || studentQrScannerInstance) {
    return; // Cegah double-click atau inisialisasi ganda
  }

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner QR sedang dimuat, mohon coba sebentar lagi...', 'err');
    return;
  }

  isStartingQrScanner = true;
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '⏳ Menyiapkan Kamera...';
  }
  if (phBtn) phBtn.disabled = true;

  studentQrScannerInstance = new Html5Qrcode("qr-student-reader");
  const config = { fps: 12, qrbox: { width: 250, height: 250 } };

  studentQrScannerInstance.start(
    { facingMode: "environment" },
    config,
    (decodedText) => onStudentQrScanned(decodedText),
    () => {}
  ).then(() => {
    isStartingQrScanner = false;
    if (ph) ph.style.display = 'none';
    if (startBtn) {
      startBtn.style.display = 'none';
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera';
    }
    if (phBtn) phBtn.disabled = false;
    if (stopBtn) stopBtn.style.display = 'inline-block';
    showToast('Kamera Scanner QR aktif 📷', 'ok');
  }).catch(err => {
    isStartingQrScanner = false;
    studentQrScannerInstance = null;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera';
    }
    if (phBtn) phBtn.disabled = false;
    console.error('Camera QR error:', err);
    showToast('Gagal mengakses kamera: ' + (err.message || 'Izin kamera ditolak'), 'err');
  });
}

function stopStudentQrScanner() {
  const ph = document.getElementById('qr-placeholder');
  const startBtn = document.getElementById('btn-start-qr');
  const stopBtn = document.getElementById('btn-stop-qr');
  const phBtn = ph ? ph.querySelector('button') : null;

  isStartingQrScanner = false;
  if (studentQrScannerInstance) {
    studentQrScannerInstance.stop().then(() => {
      studentQrScannerInstance.clear();
      studentQrScannerInstance = null;
    }).catch(_ => {
      studentQrScannerInstance = null;
    });
  }
  if (ph) ph.style.display = 'block';
  if (startBtn) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    startBtn.innerHTML = '▶️ Buka Kamera';
  }
  if (phBtn) phBtn.disabled = false;
  if (stopBtn) stopBtn.style.display = 'none';
}

function onStudentQrScanned(rawText) {
  const now = Date.now();
  if (lastScannedQrMap[rawText] && (now - lastScannedQrMap[rawText] < 3500)) {
    return; // debounce 3.5s
  }
  lastScannedQrMap[rawText] = now;

  let studentName = '';
  let studentClass = '';

  if (rawText.startsWith('SMKN10|SISWA|')) {
    const parts = rawText.split('|');
    studentName = parts[3] || '';
    studentClass = `${parts[4]} ${parts[5]}`;
  } else if (rawText.startsWith('{')) {
    try {
      const obj = JSON.parse(rawText);
      studentName = obj.nama || obj.name || '';
      studentClass = obj.kelas || '';
    } catch(_) {}
  } else {
    studentName = rawText.trim();
  }

  // Active class validation
  const kelasVal = document.getElementById('ab-kelas')?.value;
  if (!kelasVal) {
    showToast('Pilih kelas dan buka sesi daftar hadir terlebih dahulu.', 'err');
    return;
  }
  const [curJurusan, curTingkat] = kelasVal.split('|');
  const key = `${curJurusan}-${curTingkat}`;
  const siswaList = db.siswa[key] || [];

  // Match student name
  const matchIdx = siswaList.findIndex(n => 
    n.toLowerCase().trim() === studentName.toLowerCase().trim() ||
    studentName.toLowerCase().includes(n.toLowerCase()) ||
    n.toLowerCase().includes(studentName.toLowerCase())
  );

  const statusBox = document.getElementById('qr-status-box');
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (matchIdx === -1) {
    Sound.warning();
    if (statusBox) {
      statusBox.className = 'scan-status-alert warning';
      statusBox.style.display = 'flex';
      statusBox.innerHTML = `<span>⚠️ Siswa "<strong>${escapeHtml(studentName)}</strong>" tidak terdaftar di kelas ${escapeHtml(curJurusan)} ${escapeHtml(curTingkat)}!</span>`;
    }
    showToast(`QR terbaca: ${escapeHtml(studentName)} (bukan siswa kelas ini)`, 'err');
    return;
  }

  const matchedName = siswaList[matchIdx];
  const stSelect = document.getElementById(`st-${matchIdx}`);
  const jinInput = document.getElementById(`jin-${matchIdx}`);

  const alreadyHadStatus = stSelect?.value === 'H';

  if (stSelect) stSelect.value = 'H';
  const nowTimeShort = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (jinInput) {
    jinInput.value = nowTimeShort;
  }

  Sound.beep();

  if (statusBox) {
    statusBox.className = 'scan-status-alert success';
    statusBox.style.display = 'flex';
    statusBox.innerHTML = `
      <div>
        <div style="font-size:14px;font-weight:700">✅ Presensi Hadir Tercatat!</div>
        <div style="font-size:12.5px;margin-top:2px">${escapeHtml(matchedName)} (${escapeHtml(curJurusan)} ${escapeHtml(curTingkat)}) · Jam: <strong>${escapeHtml(timeStr)}</strong></div>
      </div>
      <span style="font-size:24px">🎉</span>
    `;
  }

  // Add to activity feed
  addQrScanLog(matchedName, timeStr, curJurusan, curTingkat, alreadyHadStatus);

  // Auto-save attendance silently
  saveActiveSessionSilently();
  updateQrStats();
  loadAbsensiTable();
}

function addQrScanLog(name, time, jur, tk, isRepeat) {
  const feed = document.getElementById('qr-scan-logs');
  if (!feed) return;
  const empty = feed.querySelector('.empty-feed');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `
    <div class="feed-item-left">
      <div class="feed-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div>
        <div class="feed-name">${escapeHtml(name)}</div>
        <div class="feed-meta">${escapeHtml(jur)} ${escapeHtml(tk)} ${isRepeat ? '· <em>update</em>' : ''}</div>
      </div>
    </div>
    <div class="feed-time">${escapeHtml(time)} WITA</div>
  `;
  feed.insertBefore(item, feed.firstChild);
}

function clearScanLogs() {
  const feed = document.getElementById('qr-scan-logs');
  if (feed) feed.innerHTML = '<div class="empty-feed">Log telah dibersihkan.</div>';
}

function updateQrStats() {
  const kelasVal = document.getElementById('ab-kelas')?.value;
  if (!kelasVal) return;
  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const total = (db.siswa[key] || []).length;

  let hadir = 0;
  document.querySelectorAll('[id^="st-"]').forEach(sel => {
    if (sel.value === 'H') hadir++;
  });
  const belum = Math.max(0, total - hadir);

  set('qr-stat-hadir', hadir);
  set('qr-stat-belum', belum);
  set('qr-stat-total', total);
}

// ─────────────────────────────────────────────
//  STUDENT FACE SCANNER & BIOMETRICS
// ─────────────────────────────────────────────
let faceStream = null;
let faceAnalysisTimer = null;
let lastFaceVerifiedTime = 0;
let isStartingFaceScanner = false;
window._attendancePhotos = window._attendancePhotos || {};

function startFaceScanner() {
  const video = document.getElementById('face-video');
  const ph = document.getElementById('face-placeholder');
  const startBtn = document.getElementById('btn-start-face');
  const stopBtn = document.getElementById('btn-stop-face');
  const phBtn = ph ? ph.querySelector('button') : null;

  if (isStartingFaceScanner || faceStream) {
    return; // Cegah double-click atau inisialisasi ganda
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Browser tidak mendukung akses kamera langsung.', 'err');
    return;
  }

  isStartingFaceScanner = true;
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '⏳ Menyiapkan Kamera Wajah...';
  }
  if (phBtn) phBtn.disabled = true;

  // Hentikan stream lama jika masih ada track tersisa
  if (faceStream) {
    try { faceStream.getTracks().forEach(t => t.stop()); } catch(_) {}
    faceStream = null;
  }

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
  }).then(stream => {
    isStartingFaceScanner = false;
    faceStream = stream;
    if (video) {
      video.srcObject = stream;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') console.warn('Video play notice:', err);
        });
      }
    }
    if (ph) ph.style.display = 'none';
    if (startBtn) {
      startBtn.style.display = 'none';
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera Wajah';
    }
    if (phBtn) phBtn.disabled = false;
    if (stopBtn) stopBtn.style.display = 'inline-block';

    startFaceAnalysisLoop();
    showToast('Kamera Wajah Biometrik aktif 👤', 'ok');
  }).catch(err => {
    isStartingFaceScanner = false;
    faceStream = null;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera Wajah';
    }
    if (phBtn) phBtn.disabled = false;
    console.error('Face camera error:', err);
    showToast('Gagal membuka kamera: ' + (err.message || 'Izin kamera ditolak'), 'err');
  });
}

function stopFaceScanner() {
  const video = document.getElementById('face-video');
  const ph = document.getElementById('face-placeholder');
  const startBtn = document.getElementById('btn-start-face');
  const stopBtn = document.getElementById('btn-stop-face');
  const phBtn = ph ? ph.querySelector('button') : null;

  isStartingFaceScanner = false;
  if (faceAnalysisTimer) {
    clearInterval(faceAnalysisTimer);
    faceAnalysisTimer = null;
  }
  if (faceStream) {
    faceStream.getTracks().forEach(t => t.stop());
    faceStream = null;
  }
  if (video) video.srcObject = null;
  if (ph) ph.style.display = 'block';
  if (startBtn) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    startBtn.innerHTML = '▶️ Buka Kamera Wajah';
  }
  if (phBtn) phBtn.disabled = false;
  if (stopBtn) stopBtn.style.display = 'none';

  const readout = document.getElementById('face-readout');
  if (readout) {
    readout.className = 'hud-readout';
    readout.textContent = 'Posisikan wajah di dalam oval';
  }
  const oval = document.getElementById('face-oval');
  if (oval) oval.classList.remove('locked');
}

// Compute 64-bin color & spatial luminance descriptor from canvas
function computeFaceFeatures(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const grid = 8;
  const cellW = Math.floor(width / grid);
  const cellH = Math.floor(height / grid);
  const features = [];

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let sumLuma = 0;
      let count = 0;
      for (let y = gy * cellH; y < (gy + 1) * cellH; y++) {
        for (let x = gx * cellW; x < (gx + 1) * cellW; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          sumLuma += luma;
          count++;
        }
      }
      features.push(count ? (sumLuma / count) / 255 : 0);
    }
  }
  return features;
}

// Cosine similarity
function compareFaceVectors(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function startFaceAnalysisLoop() {
  const video = document.getElementById('face-video');
  const readout = document.getElementById('face-readout');
  const oval = document.getElementById('face-oval');

  const offCanvas = document.createElement('canvas');
  offCanvas.width = 128;
  offCanvas.height = 128;
  const offCtx = offCanvas.getContext('2d');

  if (faceAnalysisTimer) clearInterval(faceAnalysisTimer);

  faceAnalysisTimer = setInterval(() => {
    if (!faceStream || !video || video.readyState < 2) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const cropSize = Math.min(vw, vh) * 0.55;
    const cropX = (vw - cropSize) / 2;
    const cropY = (vh - cropSize) / 2;

    offCtx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 128, 128);
    const liveFeatures = computeFaceFeatures(offCtx, 128, 128);

    const kelasVal = document.getElementById('ab-kelas')?.value;
    if (!kelasVal) return;
    const [jurusan, tingkat] = kelasVal.split('|');
    const key = `${jurusan}-${tingkat}`;
    const siswaList = db.siswa[key] || [];

    let bestMatchName = null;
    let bestScore = 0;

    siswaList.forEach(nama => {
      const faceKey = `${key}-${nama}`;
      const enrolled = db.faces && db.faces[faceKey];
      if (enrolled && enrolled.features) {
        const score = compareFaceVectors(liveFeatures, enrolled.features);
        if (score > bestScore) {
          bestScore = score;
          bestMatchName = nama;
        }
      }
    });

    const confidencePct = Math.round(bestScore * 100);

    if (bestMatchName && confidencePct >= 72) {
      if (oval) oval.classList.add('locked');
      if (readout) {
        readout.className = 'hud-readout success';
        readout.textContent = `Wajah Terkunci: ${bestMatchName} (${confidencePct}%)`;
      }

      const autoVerify = document.getElementById('face-auto-verify')?.checked;
      const now = Date.now();
      if (autoVerify && (now - lastFaceVerifiedTime > 3500)) {
        lastFaceVerifiedTime = now;
        const snapshotData = offCanvas.toDataURL('image/jpeg', 0.85);
        verifyStudentFaceAttendance(bestMatchName, snapshotData, confidencePct);
      }
    } else {
      if (oval) oval.classList.remove('locked');
      if (readout) {
        readout.className = 'hud-readout';
        readout.textContent = 'Mendeteksi Wajah... Posisikan di dalam oval';
      }
    }
  }, 400);
}

let isCapturingManualFace = false;

function captureManualFaceAttendance() {
  const sel = document.getElementById('face-manual-student');
  const studentName = sel?.value;
  if (!studentName) {
    showToast('Pilih nama siswa terlebih dahulu.', 'err');
    return;
  }
  const video = document.getElementById('face-video');
  if (!video || !faceStream) {
    showToast('Buka kamera wajah terlebih dahulu.', 'err');
    return;
  }

  if (isCapturingManualFace) {
    return; // Cegah double-click rekam foto
  }
  isCapturingManualFace = true;
  const captureBtn = document.querySelector('.face-manual-bar button');
  if (captureBtn) {
    captureBtn.disabled = true;
    captureBtn.innerHTML = '⏳ Merekam...';
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = 160;
  offCanvas.height = 160;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const cropSize = Math.min(vw, vh) * 0.6;
  const cropX = (vw - cropSize) / 2;
  const cropY = (vh - cropSize) / 2;
  offCtx.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, 160, 160);

  const snapshotData = offCanvas.toDataURL('image/jpeg', 0.85);
  verifyStudentFaceAttendance(studentName, snapshotData, 100);

  setTimeout(() => {
    isCapturingManualFace = false;
    if (captureBtn) {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '📸 Rekam Bukti Hadir Wajah';
    }
  }, 1200);
}

function verifyStudentFaceAttendance(studentName, photoData, score) {
  const kelasVal = document.getElementById('ab-kelas')?.value;
  if (!kelasVal) return;
  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const siswaList = db.siswa[key] || [];

  const idx = siswaList.findIndex(n => n.toLowerCase() === studentName.toLowerCase());
  if (idx === -1) return;

  const stSelect = document.getElementById(`st-${idx}`);
  const jinInput = document.getElementById(`jin-${idx}`);
  if (stSelect) stSelect.value = 'H';
  const now = new Date();
  const nowTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const timeWithSec = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (jinInput) {
    jinInput.value = nowTime;
  }

  // Store photo proof
  window._attendancePhotos[studentName] = photoData;

  Sound.success();

  // Status banner
  const statusBox = document.getElementById('face-status-box');
  if (statusBox) {
    statusBox.className = 'scan-status-alert success';
    statusBox.style.display = 'flex';
    statusBox.innerHTML = `
      <div>
        <div style="font-size:14px;font-weight:700">🎉 Verifikasi Wajah Berhasil!</div>
        <div style="font-size:12.5px;margin-top:2px">${escapeHtml(studentName)} · Jam: <strong>${escapeHtml(timeWithSec)}</strong> (Kecocokan: ${score}%)</div>
      </div>
      <img src="${photoData}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #22c55e"/>
    `;
  }

  // Add to photo gallery
  addFaceProofToGallery(studentName, photoData, timeWithSec);

  // Save session & update stats
  saveActiveSessionSilently();
  updateFaceStats();
  loadAbsensiTable();
}

function addFaceProofToGallery(name, photo, time) {
  const gal = document.getElementById('face-proof-gallery');
  if (!gal) return;
  const empty = gal.querySelector('.empty-feed');
  if (empty) empty.remove();

  // Cegah duplikasi thumbnail jika siswa yang sama direkam ulang
  const existing = Array.from(gal.querySelectorAll('.face-proof-thumb')).find(t => t.dataset.student === name);
  if (existing) {
    const img = existing.querySelector('img');
    if (img) img.src = photo;
    existing.onclick = () => viewPhotoProof(photo, name, time);
    return;
  }

  const thumb = document.createElement('div');
  thumb.className = 'face-proof-thumb';
  thumb.dataset.student = name;
  thumb.onclick = () => viewPhotoProof(photo, name, time);
  thumb.innerHTML = `
    <img src="${photo}" alt="${escapeHtml(name)}" />
    <div class="thumb-tag">${escapeHtml(name.split(' ')[0])}</div>
  `;
  gal.insertBefore(thumb, gal.firstChild);
}

function updateFaceStats() {
  const kelasVal = document.getElementById('ab-kelas')?.value;
  if (!kelasVal) return;
  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const siswaList = db.siswa[key] || [];

  let enrolled = 0;
  let hadirWajah = 0;

  siswaList.forEach(nama => {
    const faceKey = `${key}-${nama}`;
    if (db.faces && db.faces[faceKey]) enrolled++;
    if (window._attendancePhotos && window._attendancePhotos[nama]) hadirWajah++;
  });

  set('face-stat-hadir', hadirWajah);
  set('face-stat-enrolled', enrolled);
  set('face-stat-total', siswaList.length);
}

// ─────────────────────────────────────────────
//  FACE ENROLLMENT (PENDAFTARAN WAJAH SISWA)
// ─────────────────────────────────────────────
let enrollStream = null;
let currentEnrollKey = null;
let currentEnrollName = null;
let enrolledBase64 = null;

function openFaceEnrollModal(key, nama) {
  currentEnrollKey = key;
  currentEnrollName = nama;
  enrolledBase64 = null;

  set('enf-nama', nama);
  set('enf-kelas', key.replace('-', ' Kelas '));

  const faceKey = `${key}-${nama}`;
  const hasFace = !!(db.faces && db.faces[faceKey]);
  const delBtn = document.getElementById('btn-enf-delete');
  if (delBtn) delBtn.style.display = hasFace ? 'inline-block' : 'none';

  document.getElementById('modal-face-enroll').style.display = 'flex';
  document.getElementById('enf-video-box').style.display = 'block';
  document.getElementById('enf-preview-wrap').style.display = 'none';
  document.getElementById('btn-enf-capture').style.display = 'inline-block';
  document.getElementById('btn-enf-retake').style.display = 'none';
  document.getElementById('btn-enf-save').style.display = 'none';

  startEnrollCamera();
}

function hapusWajahSiswa() {
  if (!currentEnrollKey || !currentEnrollName) return;
  appConfirm(`Hapus data biometrik wajah untuk ${currentEnrollName}?`, () => {
    const faceKey = `${currentEnrollKey}-${currentEnrollName}`;
    if (db.faces && db.faces[faceKey]) {
      delete db.faces[faceKey];
      saveDB();
    }
    showToast(`Data wajah ${currentEnrollName} telah dihapus.`, 'ok');
    closeFaceEnrollModal();
    lihatSiswa();
  });
}

function closeFaceEnrollModal() {
  stopEnrollCamera();
  const modal = document.getElementById('modal-face-enroll');
  if (modal) modal.style.display = 'none';
}

function startEnrollCamera() {
  const video = document.getElementById('enf-video');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
  }).then(stream => {
    enrollStream = stream;
    if (video) {
      video.srcObject = stream;
      video.play();
    }
  }).catch(err => {
    console.error('Enroll camera error:', err);
    showToast('Kamera tidak dapat diakses: ' + (err.message || 'Izin ditolak'), 'err');
  });
}

function stopEnrollCamera() {
  if (enrollStream) {
    enrollStream.getTracks().forEach(t => t.stop());
    enrollStream = null;
  }
}

function captureFaceEnroll() {
  const video = document.getElementById('enf-video');
  if (!video || !enrollStream) {
    showToast('Kamera belum aktif.', 'err');
    return;
  }
  const canvas = document.getElementById('enf-canvas');
  canvas.width = 160;
  canvas.height = 190;
  const ctx = canvas.getContext('2d');

  const vw = video.videoWidth || 480;
  const vh = video.videoHeight || 480;
  const cropW = Math.min(vw, vh) * 0.7;
  const cropH = cropW * 1.18;
  const cropX = (vw - cropW) / 2;
  const cropY = (vh - cropH) / 2;

  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 160, 190);
  enrolledBase64 = canvas.toDataURL('image/jpeg', 0.9);

  document.getElementById('enf-img-preview').src = enrolledBase64;
  document.getElementById('enf-video-box').style.display = 'none';
  document.getElementById('enf-preview-wrap').style.display = 'flex';

  document.getElementById('btn-enf-capture').style.display = 'none';
  document.getElementById('btn-enf-retake').style.display = 'inline-block';
  document.getElementById('btn-enf-save').style.display = 'inline-block';

  stopEnrollCamera();
}

function retakeFaceEnroll() {
  enrolledBase64 = null;
  document.getElementById('enf-video-box').style.display = 'block';
  document.getElementById('enf-preview-wrap').style.display = 'none';
  document.getElementById('btn-enf-capture').style.display = 'inline-block';
  document.getElementById('btn-enf-retake').style.display = 'none';
  document.getElementById('btn-enf-save').style.display = 'none';
  startEnrollCamera();
}

function uploadFaceFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('enf-canvas');
      canvas.width = 160;
      canvas.height = 190;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 160, 190);
      enrolledBase64 = canvas.toDataURL('image/jpeg', 0.9);

      document.getElementById('enf-img-preview').src = enrolledBase64;
      document.getElementById('enf-video-box').style.display = 'none';
      document.getElementById('enf-preview-wrap').style.display = 'flex';

      document.getElementById('btn-enf-capture').style.display = 'none';
      document.getElementById('btn-enf-retake').style.display = 'inline-block';
      document.getElementById('btn-enf-save').style.display = 'inline-block';
      stopEnrollCamera();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveFaceEnroll() {
  if (!enrolledBase64 || !currentEnrollKey || !currentEnrollName) {
    showToast('Ambil foto wajah terlebih dahulu.', 'err');
    return;
  }
  const canvas = document.getElementById('enf-canvas');
  const ctx = canvas.getContext('2d');
  const features = computeFaceFeatures(ctx, 160, 190);

  const faceKey = `${currentEnrollKey}-${currentEnrollName}`;
  db.faces = db.faces || {};
  db.faces[faceKey] = {
    image: enrolledBase64,
    features: features,
    name: currentEnrollName,
    classKey: currentEnrollKey,
    updatedAt: new Date().toISOString()
  };

  saveDB();
  if (window.SupabaseSync && typeof window.SupabaseSync.uploadFaceBiometric === 'function') {
    window.SupabaseSync.uploadFaceBiometric(currentEnrollKey, currentEnrollName, features, enrolledBase64);
  }
  Sound.success();
  showToast(`Wajah ${currentEnrollName} berhasil didaftarkan 🎉`, 'ok');
  closeFaceEnrollModal();
  lihatSiswa();
}

// ─────────────────────────────────────────────
//  DIGITAL ID CARDS (KARTU PELAJAR & GURU)
// ─────────────────────────────────────────────
function initKartuPage() {
  populateTeacherCardDropdown();
  renderKartuSiswa();
  renderTeacherCard('CURRENT');
}

function switchKartuTab(tab) {
  document.getElementById('tab-btn-kartu-siswa').classList.toggle('active', tab === 'siswa');
  document.getElementById('tab-btn-kartu-guru').classList.toggle('active', tab === 'guru');
  document.getElementById('tab-kartu-siswa').style.display = tab === 'siswa' ? 'block' : 'none';
  document.getElementById('tab-kartu-guru').style.display = tab === 'guru' ? 'block' : 'none';
  if (tab === 'siswa') renderKartuSiswa();
  if (tab === 'guru') renderTeacherCard(document.getElementById('kt-guru-select')?.value || 'CURRENT');
}

function renderKartuSiswa() {
  const jur = document.getElementById('kt-jurusan')?.value || 'ALL';
  const tk  = document.getElementById('kt-tingkat')?.value || 'ALL';
  const q   = (document.getElementById('kt-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('student-cards-container');
  if (!container) return;

  let allStudents = [];
  Object.entries(db.siswa).forEach(([key, arr]) => {
    const [jk, tkPart] = key.split('-');
    if (jur !== 'ALL' && jk !== jur) return;
    if (tk !== 'ALL' && tkPart !== tk) return;
    arr.forEach((nama, idx) => {
      if (!q || nama.toLowerCase().includes(q)) {
        allStudents.push({ nama, jurusan: jk, tingkat: tkPart, key, idx });
      }
    });
  });

  if (!allStudents.length) {
    container.innerHTML = '<p class="empty" style="grid-column:1/-1;padding:40px">Tidak ada data siswa sesuai filter.</p>';
    return;
  }

  container.innerHTML = allStudents.map((s, i) => {
    const faceKey = `${s.key}-${s.nama}`;
    const faceData = db.faces && db.faces[faceKey];
    const nisn = `00${(s.idx + 1).toString().padStart(3, '0')}${s.jurusan}26`;
    const badgeClass = s.jurusan === 'TJKT' ? 'badge-tjkt' : (s.jurusan === 'MPLB' ? 'badge-mplb' : 'badge-gp');

    return `
      <div class="id-card" id="card-elem-${i}">
        <div class="id-card-header">
          <div class="card-emblem" title="SMK Negeri 10 Kolaka">
            <img src="img/logo_smkn10.png" alt="Logo SMKN 10 Kolaka" class="card-school-logo" />
          </div>
          <div class="card-header-titles">
            <div class="card-inst-prov">PEMERINTAH PROVINSI SULAWESI TENGGARA</div>
            <div class="card-inst-name">SMK NEGERI 10 KOLAKA</div>
            <div class="card-inst-sub">KARTU PELAJAR &amp; PRESENSI DIGITAL</div>
          </div>
          <div class="card-header-brand" title="SMK BISA - HEBAT">
            <img src="img/logo_smk_bisa.png" alt="Logo SMK Bisa Hebat" class="card-logo-smk" />
          </div>
        </div>
        <div class="id-card-body">
          <div class="card-photo-box">
            ${faceData ? `<img src="${faceData.image}" alt="${s.nama}"/>` : `<div class="card-photo-fallback">👤</div>`}
          </div>
          <div class="card-info-box">
            <div class="card-student-name">${s.nama}</div>
            <div class="card-id-num">NISN: ${nisn}</div>
            <span class="card-badge ${badgeClass}">${s.jurusan} · Kelas ${s.tingkat}</span>
            <div style="font-size:10px;color:#64748b;margin-top:2px">T.A. 2026/2027 Ganjil</div>
          </div>
          <div class="card-qr-wrap">
            <div class="card-qr-box" id="qr-box-${i}"></div>
            <div class="card-qr-label">QR Presensi</div>
          </div>
        </div>
        <div class="id-card-footer">
          <div class="card-footer-branding">
            <img src="img/logo_smk_bisa.png" alt="SMK Bisa Hebat" class="footer-logo-smk" />
            <span style="font-size:9.5px;font-weight:700;color:var(--text-muted)">SMK BISA · HEBAT</span>
          </div>
          <span>TANGGETADA, KOLAKA</span>
        </div>
        <div class="card-actions-bar no-print">
          <button class="btn-sm btn-outline" onclick="printSingleStudentCardTargetHtml('card-elem-${i}')">🖨️ Cetak</button>
        </div>
      </div>
    `;
  }).join('');

  // Generate QR codes using qrcodejs
  allStudents.forEach((s, i) => {
    const el = document.getElementById(`qr-box-${i}`);
    if (el && typeof QRCode !== 'undefined') {
      const qrData = `SMKN10|SISWA|${s.key}-${s.idx+1}|${s.nama}|${s.jurusan}|${s.tingkat}`;
      try {
        new QRCode(el, {
          text: qrData,
          width: 74,
          height: 74,
          colorDark: "#1c3d2c",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(_) {}
    }
  });
}

function populateTeacherCardDropdown() {
  const sel = document.getElementById('kt-guru-select');
  const abgSel = document.getElementById('abg-manual-guru');
  const sk = window.SMKN10_SK_DATA;
  if (!sel || !sk) return;

  let opts = '<option value="CURRENT">⭐ Guru Aktif: ' + (db.guru?.nama || 'Saya') + '</option>';
  sk.teachers.forEach(t => {
    opts += `<option value="${t.code}">${t.no}. ${t.name} (${t.mapel || 'Guru'})</option>`;
  });
  sel.innerHTML = opts;
  if (abgSel) {
    abgSel.innerHTML = '<option value="">-- Pilih Guru SMKN 10 Kolaka --</option>' + 
      sk.teachers.map(t => `<option value="${t.code}">${t.name} (${t.mapel || 'Guru'})</option>`).join('');
  }
}

function renderTeacherCard(code) {
  const container = document.getElementById('teacher-card-container');
  if (!container) return;
  const sk = window.SMKN10_SK_DATA;

  let teacher = null;
  if (code === 'CURRENT' || !code) {
    teacher = {
      name: db.guru?.nama || 'Guru SMKN 10 Kolaka',
      nip: db.guru?.nip || '19750101 200001 1 001',
      mapel: 'Guru Pengampu / Tenaga Pendidik',
      code: db.guru?.code || '01'
    };
  } else if (sk) {
    teacher = sk.teachers.find(t => String(t.code) === String(code)) || sk.teachers[0];
  }

  const qrData = `SMKN10|GURU|${teacher.nip || '-'}|${teacher.name}|${teacher.code || '01'}`;

  container.innerHTML = `
    <div class="id-card" id="teacher-id-card-view" style="max-width:440px">
      <div class="id-card-header guru-header">
        <div class="card-emblem" title="SMK Negeri 10 Kolaka">
          <img src="img/logo_smkn10.png" alt="Logo SMKN 10 Kolaka" class="card-school-logo" />
        </div>
        <div class="card-header-titles">
          <div class="card-inst-prov">PEMERINTAH PROVINSI SULAWESI TENGGARA</div>
          <div class="card-inst-name">SMK NEGERI 10 KOLAKA</div>
          <div class="card-inst-sub">KARTU IDENTITAS GURU &amp; PRESENSI DIGITAL</div>
        </div>
        <div class="card-header-brand" title="SMK BISA - HEBAT">
          <img src="img/logo_smk_bisa.png" alt="Logo SMK Bisa Hebat" class="card-logo-smk" />
        </div>
      </div>
      <div class="id-card-body">
        <div class="card-photo-box" style="background:#eef2ff">
          <div style="font-size:42px">👨‍🏫</div>
        </div>
        <div class="card-info-box">
          <div class="card-guru-name">${teacher.name}</div>
          <div class="card-id-num">NIP: ${maskNIP(teacher.nip)}</div>
          <span class="card-badge badge-guru">GURU / TENAGA PENDIDIK</span>
          <div style="font-size:10.5px;color:#475569;margin-top:2px">
            Mapel: <strong>${teacher.mapel || 'Pengampu'}</strong>
          </div>
          <div style="font-size:9.5px;color:#64748b">Kode SK: ${teacher.code || '–'} · T.A. 2026/2027</div>
        </div>
        <div class="card-qr-wrap">
          <div class="card-qr-box" id="teacher-qr-target" style="width:85px;height:85px"></div>
          <div class="card-qr-label">QR Presensi</div>
        </div>
      </div>
      <div class="id-card-footer" style="background:#f8fafc">
        <div class="card-footer-branding">
          <img src="img/logo_smk_bisa.png" alt="SMK Bisa Hebat" class="footer-logo-smk" />
          <span style="font-size:9.5px;font-weight:700;color:var(--text-muted)">Kepala Sekolah: <strong>TABING, S.Pd,. M.Pd</strong></span>
        </div>
        <span>KOLAKA, SULTRA</span>
      </div>
    </div>
  `;

  setTimeout(() => {
    const el = document.getElementById('teacher-qr-target');
    if (el && typeof QRCode !== 'undefined') {
      try {
        new QRCode(el, {
          text: qrData,
          width: 80,
          height: 80,
          colorDark: "#0f291e",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(_) {}
    }
  }, 50);
}

function printAllStudentCards() {
  window.print();
}

function printSingleTeacherCard() {
  window.print();
}

function printSingleStudentCardTargetHtml(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const target = document.getElementById('single-card-render-target');
  if (target) {
    target.innerHTML = card.outerHTML;
    document.getElementById('modal-student-card').style.display = 'flex';
  }
}

function showSingleStudentCardModal(key, idx) {
  const [jurusan, tingkat] = key.split('-');
  const siswaList = db.siswa[key] || [];
  const nama = siswaList[idx];
  if (!nama) return;

  const faceKey = `${key}-${nama}`;
  const faceData = db.faces && db.faces[faceKey];
  const nisn = `00${(idx + 1).toString().padStart(3, '0')}${jurusan}26`;
  const badgeClass = jurusan === 'TJKT' ? 'badge-tjkt' : (jurusan === 'MPLB' ? 'badge-mplb' : 'badge-gp');

  const target = document.getElementById('single-card-render-target');
  if (target) {
    target.innerHTML = `
      <div class="id-card" style="margin:0 auto">
        <div class="id-card-header">
          <div class="card-emblem" title="SMK Negeri 10 Kolaka">
            <img src="img/logo_smkn10.png" alt="Logo SMKN 10 Kolaka" class="card-school-logo" />
          </div>
          <div class="card-header-titles">
            <div class="card-inst-prov">PEMERINTAH PROVINSI SULAWESI TENGGARA</div>
            <div class="card-inst-name">SMK NEGERI 10 KOLAKA</div>
            <div class="card-inst-sub">KARTU PELAJAR &amp; PRESENSI DIGITAL</div>
          </div>
          <div class="card-header-brand" title="SMK BISA - HEBAT">
            <img src="img/logo_smk_bisa.png" alt="Logo SMK Bisa Hebat" class="card-logo-smk" />
          </div>
        </div>
        <div class="id-card-body">
          <div class="card-photo-box">
            ${faceData ? `<img src="${faceData.image}" alt="${nama}"/>` : `<div class="card-photo-fallback">👤</div>`}
          </div>
          <div class="card-info-box">
            <div class="card-student-name">${nama}</div>
            <div class="card-id-num">NISN: ${nisn}</div>
            <span class="card-badge ${badgeClass}">${jurusan} · Kelas ${tingkat}</span>
            <div style="font-size:10px;color:#64748b;margin-top:2px">T.A. 2026/2027 Ganjil</div>
          </div>
          <div class="card-qr-wrap">
            <div class="card-qr-box" id="single-modal-qr-target"></div>
            <div class="card-qr-label">QR Presensi</div>
          </div>
        </div>
        <div class="id-card-footer">
          <div class="card-footer-branding">
            <img src="img/logo_smk_bisa.png" alt="SMK Bisa Hebat" class="footer-logo-smk" />
            <span style="font-size:9.5px;font-weight:700;color:var(--text-muted)">SMK BISA · HEBAT</span>
          </div>
          <span>TANGGETADA, KOLAKA</span>
        </div>
      </div>
    `;

    setTimeout(() => {
      const qrel = document.getElementById('single-modal-qr-target');
      if (qrel && typeof QRCode !== 'undefined') {
        new QRCode(qrel, {
          text: `SMKN10|SISWA|${key}-${idx+1}|${nama}|${jurusan}|${tingkat}`,
          width: 74,
          height: 74,
          colorDark: "#1c3d2c",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 40);

    document.getElementById('modal-student-card').style.display = 'flex';
  }
}

function closeStudentCardModal() {
  document.getElementById('modal-student-card').style.display = 'none';
}

function printSingleStudentCardTarget() {
  window.print();
}

// ─────────────────────────────────────────────
//  TEACHER DAILY ATTENDANCE (PRESENSI GURU QR)
// ─────────────────────────────────────────────
let teacherScannerInstance = null;
let lastTeacherScanMap = {};
let abgClockTimer = null;

function initAbsenGuruPage() {
  populateTeacherCardDropdown();
  renderTeacherRekap();
  updateTeacherStats();
  renderMyTeacherQR();
  renderTeacherTodayFeed();
  updateActiveTeacherPresenceStatus();

  if (abgClockTimer) clearInterval(abgClockTimer);
  abgClockTimer = setInterval(() => {
    const el = document.getElementById('abg-clock');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) + ' WITA';
    }
  }, 1000);
}

function switchAbgTab(tab) {
  document.getElementById('tab-btn-abg-scan').classList.toggle('active', tab === 'scan');
  document.getElementById('tab-btn-abg-myqr').classList.toggle('active', tab === 'myqr');
  document.getElementById('tab-btn-abg-rekap').classList.toggle('active', tab === 'rekap');

  document.getElementById('abg-tab-scan').style.display = tab === 'scan' ? 'block' : 'none';
  document.getElementById('abg-tab-myqr').style.display = tab === 'myqr' ? 'block' : 'none';
  document.getElementById('abg-tab-rekap').style.display = tab === 'rekap' ? 'block' : 'none';

  if (tab !== 'scan') stopTeacherScanner();
  if (tab === 'rekap') renderTeacherRekap();
  if (tab === 'myqr') renderMyTeacherQR();
}

let isStartingTeacherScanner = false;

function startTeacherScanner() {
  const ph = document.getElementById('abg-placeholder');
  const startBtn = document.getElementById('btn-start-abg');
  const stopBtn = document.getElementById('btn-stop-abg');
  const phBtn = ph ? ph.querySelector('button') : null;

  if (isStartingTeacherScanner || teacherScannerInstance) {
    return; // Cegah double-click atau inisialisasi ganda
  }

  if (typeof Html5Qrcode === 'undefined') {
    showToast('Library scanner QR sedang dimuat...', 'err');
    return;
  }

  isStartingTeacherScanner = true;
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerHTML = '⏳ Menyiapkan Kamera...';
  }
  if (phBtn) phBtn.disabled = true;

  teacherScannerInstance = new Html5Qrcode("abg-qr-reader");
  const config = { fps: 12, qrbox: { width: 250, height: 250 } };

  teacherScannerInstance.start(
    { facingMode: "environment" },
    config,
    (decodedText) => onTeacherQrScanned(decodedText),
    () => {}
  ).then(() => {
    isStartingTeacherScanner = false;
    if (ph) ph.style.display = 'none';
    if (startBtn) {
      startBtn.style.display = 'none';
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera Scanner';
    }
    if (phBtn) phBtn.disabled = false;
    if (stopBtn) stopBtn.style.display = 'inline-block';
    showToast('Scanner Presensi Guru Aktif 📷', 'ok');
  }).catch(err => {
    isStartingTeacherScanner = false;
    teacherScannerInstance = null;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = '▶️ Buka Kamera Scanner';
    }
    if (phBtn) phBtn.disabled = false;
    console.error('Teacher camera error:', err);
    showToast('Gagal membuka kamera presensi: ' + (err.message || 'Izin ditolak'), 'err');
  });
}

function stopTeacherScanner() {
  const ph = document.getElementById('abg-placeholder');
  const startBtn = document.getElementById('btn-start-abg');
  const stopBtn = document.getElementById('btn-stop-abg');
  const phBtn = ph ? ph.querySelector('button') : null;

  isStartingTeacherScanner = false;
  if (teacherScannerInstance) {
    teacherScannerInstance.stop().then(() => {
      teacherScannerInstance.clear();
      teacherScannerInstance = null;
    }).catch(_ => {
      teacherScannerInstance = null;
    });
  }
  if (ph) ph.style.display = 'block';
  if (startBtn) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    startBtn.innerHTML = '▶️ Buka Kamera Scanner';
  }
  if (phBtn) phBtn.disabled = false;
  if (stopBtn) stopBtn.style.display = 'none';
}

function onTeacherQrScanned(rawText) {
  const now = Date.now();
  if (lastTeacherScanMap[rawText] && (now - lastTeacherScanMap[rawText] < 4000)) return;
  lastTeacherScanMap[rawText] = now;

  let nip = '', nama = '', code = '';

  if (rawText.startsWith('SMKN10|GURU|')) {
    const parts = rawText.split('|');
    nip = parts[2] || '';
    nama = parts[3] || '';
    code = parts[4] || '';
  } else {
    nama = rawText.trim();
  }

  processTeacherAttendanceRecord(nama, nip, code, 'Scan QR Kamera');
}

function submitManualTeacherAttendance() {
  const code = document.getElementById('abg-manual-guru')?.value;
  const sk = window.SMKN10_SK_DATA;
  if (!code || !sk) {
    showToast('Pilih guru terlebih dahulu.', 'err');
    return;
  }
  const teacher = sk.teachers.find(t => String(t.code) === String(code));
  if (!teacher) return;
  const type = document.getElementById('abg-manual-type')?.value || 'AUTO';
  processTeacherAttendanceRecord(teacher.name, teacher.nip || '-', teacher.code, 'Input Manual', type);
}

function selfTeacherAttendance(type) {
  if (!db.guru) {
    showToast('Profil guru belum diisi.', 'err');
    return;
  }
  processTeacherAttendanceRecord(db.guru.nama, db.guru.nip || '-', db.guru.code || '01', 'Presensi Mandiri QR', type);
}

function processTeacherAttendanceRecord(nama, nip, code, metode, forceType) {
  const today = todayStr();
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const timeShort = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  db.absenGuru = db.absenGuru || [];
  let existing = db.absenGuru.find(a => a.tanggal === today && a.nama.toLowerCase() === nama.toLowerCase());

  let action = 'MASUK';
  if (forceType && forceType !== 'AUTO') {
    action = forceType;
  } else if (existing && existing.jamMasuk && !existing.jamPulang) {
    action = 'PULANG';
  }

  const [h, m] = timeShort.split(':').map(Number);
  const isLate = (h > 7) || (h === 7 && m > 15);
  const statusStr = isLate ? 'Terlambat' : 'Tepat Waktu';

  if (!existing) {
    existing = {
      id: Date.now(),
      nama,
      nip,
      code,
      tanggal: today,
      jamMasuk: timeShort,
      jamPulang: '',
      status: statusStr,
      metode
    };
    db.absenGuru.push(existing);
  } else {
    if (action === 'MASUK') {
      existing.jamMasuk = timeShort;
      existing.status = statusStr;
    } else {
      existing.jamPulang = timeShort;
    }
  }

  saveDB();
  if (window.SupabaseSync && typeof window.SupabaseSync.uploadTeacherPresence === 'function') {
    window.SupabaseSync.uploadTeacherPresence(existing);
  }
  Sound.success();

  const statusBox = document.getElementById('abg-status-box');
  if (statusBox) {
    statusBox.className = 'scan-status-alert success';
    statusBox.style.display = 'flex';
    statusBox.innerHTML = `
      <div>
        <div style="font-size:14px;font-weight:700">
          ${action === 'MASUK' ? '🌅 Presensi Datang (Masuk) Berhasil!' : '🌇 Presensi Pulang Berhasil!'}
        </div>
        <div style="font-size:12.5px;margin-top:2px">
          ${escapeHtml(nama)} · Pukul ${escapeHtml(timeStr)} WITA (${action === 'MASUK' ? escapeHtml(statusStr) : 'Pulang'})
        </div>
      </div>
      <span style="font-size:26px">${action === 'MASUK' ? '👋' : '🏠'}</span>
    `;
  }

  addTeacherTodayFeed(nama, action, timeShort, statusStr);
  updateTeacherStats();
  renderTeacherRekap();
  updateActiveTeacherPresenceStatus();
}

function addTeacherTodayFeed(nama, action, time, status) {
  const feed = document.getElementById('abg-today-feed');
  if (!feed) return;
  const empty = feed.querySelector('.empty-feed');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `
    <div class="feed-item-left">
      <div class="feed-avatar" style="background:#e0f2fe;color:#0369a1">👨‍🏫</div>
      <div>
        <div class="feed-name">${escapeHtml(nama)}</div>
        <div class="feed-meta">${action === 'MASUK' ? `Datang · ${escapeHtml(statusStr)}` : 'Pulang'}</div>
      </div>
    </div>
    <div class="feed-time" style="color:${action === 'MASUK' ? 'var(--green)' : 'var(--blue)'}">${escapeHtml(time)} WITA</div>
  `;
  feed.insertBefore(item, feed.firstChild);
}

function updateTeacherStats() {
  const today = todayStr();
  const list = (db.absenGuru || []).filter(a => a.tanggal === today);
  const masuk = list.filter(a => !!a.jamMasuk).length;
  const pulang = list.filter(a => !!a.jamPulang).length;
  const total = (window.SMKN10_SK_DATA?.teachers || []).length || 20;

  set('abg-kpi-masuk', masuk);
  set('abg-kpi-pulang', pulang);
  set('abg-kpi-total', total);
}

function renderMyTeacherQR() {
  const nameEl = document.getElementById('my-teacher-name');
  const nipEl = document.getElementById('my-teacher-nip');
  const box = document.getElementById('my-teacher-qr-box');
  if (!nameEl || !db.guru) return;

  nameEl.textContent = db.guru.nama;
  nipEl.textContent = 'NIP ' + maskNIP(db.guru.nip);

  if (box && typeof QRCode !== 'undefined') {
    box.innerHTML = '';
    const qrText = `SMKN10|GURU|${db.guru.nip || '-'}|${db.guru.nama}|${db.guru.code || '01'}`;
    new QRCode(box, {
      text: qrText,
      width: 150,
      height: 150,
      colorDark: "#1c3d2c",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function renderTeacherRekap() {
  const tbody = document.getElementById('abg-rekap-tbody');
  const filterDate = document.getElementById('abg-filter-date')?.value || '';
  if (!tbody) return;

  let list = db.absenGuru || [];
  if (filterDate) {
    list = list.filter(a => a.tanggal === filterDate);
  }
  list.sort((a,b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.jamMasuk || '').localeCompare(a.jamMasuk || ''));

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada data presensi guru.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((r, i) => {
    const isMe = db.guru && (
      (r.nip && db.guru.nip && r.nip.replace(/\s+/g,'') === db.guru.nip.replace(/\s+/g,'')) ||
      (r.nama && db.guru.nama && r.nama.trim().toLowerCase() === db.guru.nama.trim().toLowerCase())
    );
    const actionBtn = isMe
      ? `<button class="chip chip-red" style="font-size:11px;padding:3px 8px;cursor:pointer" onclick="hapusAbsenGuru(${r.id})" title="Hapus catatan presensi saya">🗑️ Hapus</button>`
      : `<span class="chip chip-gray" style="font-size:11px;padding:3px 8px;opacity:0.65;cursor:not-allowed" title="Akses terkunci: Hanya guru bersangkutan yang dapat menghapus data presensinya">🔒 Terkunci</span>`;

    return `
      <tr>
        <td>${i+1}</td>
        <td><strong>${r.tanggal}</strong></td>
        <td style="font-weight:700">${escapeHtml(r.nama)}</td>
        <td>${escapeHtml(maskNIP(r.nip) || '-')}</td>
        <td style="color:var(--green);font-weight:700">${r.jamMasuk || '-'}</td>
        <td style="color:var(--blue);font-weight:700">${r.jamPulang || '-'}</td>
        <td>
          <span class="chip ${r.status === 'Tepat Waktu' ? 'chip-green' : 'chip-amber'}">
            ${r.status || 'Hadir'}
          </span>
        </td>
        <td><small style="color:var(--text-muted)">${r.metode || 'QR'}</small></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function exportTeacherAttendance() {
  const list = db.absenGuru || [];
  if (!list.length) {
    showToast('Belum ada data presensi guru untuk diexport.', 'err');
    return;
  }
  const headers = ['No', 'Tanggal', 'Nama Guru', 'NIP', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Metode Presensi'];
  const rows = list.map((r, i) => [
    i + 1,
    r.tanggal,
    r.nama,
    r.nip || '-',
    r.jamMasuk || '-',
    r.jamPulang || '-',
    r.status || 'Hadir',
    r.metode || 'QR'
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Presensi Guru');
  XLSX.writeFile(wb, `rekap_presensi_guru_smkn10_${todayStr()}.xlsx`);
  showToast('File Excel presensi guru berhasil diunduh 📥', 'ok');
}

function clearTeacherAttendance() {
  if (!db.guru) return;
  const myRecords = (db.absenGuru || []).filter(a => {
    return (a.nip && db.guru.nip && a.nip.replace(/\s+/g,'') === db.guru.nip.replace(/\s+/g,'')) ||
           (a.nama && db.guru.nama && a.nama.trim().toLowerCase() === db.guru.nama.trim().toLowerCase());
  });

  if (!myRecords.length) {
    showToast(`Belum ada riwayat presensi atas nama Anda (${db.guru.nama}) untuk dihapus.`, 'info');
    return;
  }

  appConfirm(`Hapus seluruh ${myRecords.length} catatan riwayat presensi Anda (${db.guru.nama})? Data riwayat presensi guru lain tetap aman dan TIDAK AKAN terhapus.`, () => {
    db.absenGuru = (db.absenGuru || []).filter(a => !myRecords.includes(a));
    saveDB();
    renderTeacherRekap();
    updateTeacherStats();
    renderTeacherTodayFeed();
    updateActiveTeacherPresenceStatus();
    const statusBox = document.getElementById('abg-status-box');
    if (statusBox) statusBox.style.display = 'none';
    showToast(`Seluruh riwayat presensi Anda (${db.guru.nama}) telah dibersihkan. 🗑️`, 'ok');
  });
}

function hapusAbsenGuru(id) {
  const rec = (db.absenGuru || []).find(a => String(a.id) === String(id));
  if (!rec) return;

  const isMe = db.guru && (
    (rec.nip && db.guru.nip && rec.nip.replace(/\s+/g,'') === db.guru.nip.replace(/\s+/g,'')) ||
    (rec.nama && db.guru.nama && rec.nama.trim().toLowerCase() === db.guru.nama.trim().toLowerCase())
  );

  if (!isMe) {
    showToast('Akses ditolak: Anda hanya berhak menghapus riwayat presensi Anda sendiri.', 'err');
    return;
  }

  appConfirm(`Hapus catatan presensi tanggal ${rec.tanggal} jam ${rec.jamMasuk || '-'} atas nama Anda (${rec.nama})?`, () => {
    db.absenGuru = (db.absenGuru || []).filter(a => String(a.id) !== String(id));
    saveDB();
    renderTeacherRekap();
    updateTeacherStats();
    renderTeacherTodayFeed();
    updateActiveTeacherPresenceStatus();
    showToast('Catatan presensi Anda berhasil dihapus. 🗑️', 'ok');
  });
}

function updateActiveTeacherPresenceStatus() {
  if (!db.guru) return;
  const nameEl = document.getElementById('abg-active-teacher-name');
  const nipEl = document.getElementById('abg-active-teacher-nip');
  const badgeEl = document.getElementById('abg-active-teacher-badge');
  if (nameEl) nameEl.textContent = db.guru.nama;
  if (nipEl) nipEl.textContent = 'NIP ' + (db.guru.nip || '-');

  if (badgeEl) {
    const today = todayStr();
    const myRec = (db.absenGuru || []).find(a =>
      a.tanggal === today && (
        (a.nip && db.guru.nip && a.nip.replace(/\s+/g,'') === db.guru.nip.replace(/\s+/g,'')) ||
        (a.nama && db.guru.nama && a.nama.trim().toLowerCase() === db.guru.nama.trim().toLowerCase())
      )
    );
    if (!myRec) {
      badgeEl.className = 'chip chip-amber';
      badgeEl.textContent = 'Belum Presensi Hari Ini';
    } else if (myRec.jamMasuk && myRec.jamPulang) {
      badgeEl.className = 'chip chip-green';
      badgeEl.textContent = `✅ Masuk: ${myRec.jamMasuk} · 🏠 Pulang: ${myRec.jamPulang}`;
    } else if (myRec.jamMasuk) {
      badgeEl.className = 'chip chip-teal';
      badgeEl.textContent = `✅ Masuk: ${myRec.jamMasuk} (Belum Pulang)`;
    } else if (myRec.jamPulang) {
      badgeEl.className = 'chip chip-blue';
      badgeEl.textContent = `🏠 Pulang: ${myRec.jamPulang}`;
    }
  }
}

function renderTeacherTodayFeed() {
  const feed = document.getElementById('abg-today-feed');
  if (!feed) return;
  const today = todayStr();
  const list = (db.absenGuru || []).filter(a => a.tanggal === today);
  
  if (!list.length) {
    feed.innerHTML = '<div class="empty-feed">Belum ada aktivitas presensi guru hari ini.</div>';
    return;
  }
  
  list.sort((a,b) => (b.jamMasuk || '').localeCompare(a.jamMasuk || ''));
  feed.innerHTML = list.map(r => `
    <div class="feed-item">
      <div class="feed-item-left">
        <div class="feed-avatar" style="background:#e0f2fe;color:#0369a1">👨‍🏫</div>
        <div>
          <div class="feed-name">${escapeHtml(r.nama)}</div>
          <div class="feed-meta">${r.jamPulang ? 'Datang &amp; Pulang' : 'Datang'} · ${r.status || 'Hadir'}</div>
        </div>
      </div>
      <div class="feed-time" style="color:var(--green)">${r.jamMasuk || r.jamPulang || '-'} WITA</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
//  PHOTO PROOF VIEWER
// ─────────────────────────────────────────────
function viewPhotoProof(imgSrc, name, time) {
  const modal = document.getElementById('modal-photo-proof');
  const img = document.getElementById('photo-proof-img');
  const desc = document.getElementById('photo-proof-desc');
  if (!modal || !img) return;

  img.src = imgSrc;
  desc.textContent = `Siswa: ${name} · Terverifikasi Hadir Pukul: ${time || '-'}`;
  modal.style.display = 'flex';
}

function closePhotoProofModal() {
  const modal = document.getElementById('modal-photo-proof');
  if (modal) modal.style.display = 'none';
}

function saveActiveSessionSilently() {
  const mapelId  = parseInt(document.getElementById('ab-mapel')?.value);
  const kelasVal = document.getElementById('ab-kelas')?.value;
  const tanggal  = document.getElementById('ab-tgl')?.value;
  const jinVal   = document.getElementById('ab-jin')?.value;
  const joutVal  = document.getElementById('ab-jout')?.value;
  const pert     = parseInt(document.getElementById('ab-pert')?.value);

  if (!mapelId || !kelasVal || !tanggal) return;
  const [jurusan, tingkat] = kelasVal.split('|');
  const key = `${jurusan}-${tingkat}`;
  const siswaList = db.siswa[key] || [];
  if (!siswaList.length) return;

  const mapelNama = db.mapel.find(m => m.id === mapelId)?.nama || '';
  const existing = db.absensi.find(a =>
    a.mapelId === mapelId && a.jurusan === jurusan &&
    a.tingkat === tingkat && a.tanggal === tanggal && a.pertemuan === pert
  );

  const records = siswaList.map((nama, i) => {
    const recPrev = existing?.records.find(r => r.nama === nama);
    const stVal = document.getElementById(`st-${i}`)?.value || '';
    const jInInputVal = document.getElementById(`jin-${i}`)?.value || '';
    const jOutInputVal = document.getElementById(`jout-${i}`)?.value || '';
    const ketVal = document.getElementById(`ket-${i}`)?.value || '';
    const photo = (window._attendancePhotos && window._attendancePhotos[nama]) || recPrev?.foto || null;

    // Hanya siswa HADIR ('H') yang memiliki jam masuk dan jam keluar
    let finalJin = '';
    let finalJout = '';

    if (stVal === 'H') {
      finalJin = jInInputVal || (recPrev?.jamMasuk || jinVal || '07:15');
      finalJout = jOutInputVal || (recPrev?.jamKeluar || joutVal || '14:30');
    } else {
      finalJin = '';
      finalJout = '';
    }

    return {
      nama,
      status:    stVal,
      jamMasuk:  finalJin,
      jamKeluar: finalJout,
      ket:       ketVal,
      foto:      photo
    };
  });

  db.absensi = db.absensi.filter(a =>
    !(a.mapelId===mapelId && a.jurusan===jurusan && a.tingkat===tingkat &&
      a.tanggal===tanggal && a.pertemuan===pert)
  );

  db.absensi.push({
    id: existing?.id || Date.now(),
    mapelId, mapelNama, jurusan, tingkat,
    tanggal, pertemuan: pert,
    jamMasuk: jinVal, jamKeluar: joutVal,
    namaGuru: db.guru?.nama || '',
    nipGuru:  db.guru?.nip  || '',
    ta:       db.guru?.ta   || '',
    records
  });

  saveDB();
  if (window.SupabaseSync && typeof window.SupabaseSync.uploadSession === 'function') {
    const lastSession = db.absensi[db.absensi.length - 1];
    if (lastSession) window.SupabaseSync.uploadSession(lastSession);
  }
}

// ─────────────────────────────────────────────
//  27. PENILAIAN & RAPOR AKADEMIK SISWA
// ─────────────────────────────────────────────
function initPenilaianPage() {
  if (db.guru) {
    const lbl = document.getElementById('pen-guru-name-lbl');
    if (lbl) {
      lbl.textContent = `${db.guru.nama} (NIP ${db.guru.nip || '-'})`;
    }
  }
  onPenGuruChange();
}

function onPenGuruChange() {
  // STRICT AUTHORIZATION: Only load subjects taught by the active logged-in teacher
  const filtered = getFilteredMapelForTeacher('ACTIVE');

  const mSel = document.getElementById('pen-mapel-select');
  if (mSel) {
    if (!filtered.length) {
      mSel.innerHTML = '<option value="">-- Anda belum memiliki mapel terdaftar --</option>';
    } else {
      mSel.innerHTML = filtered.map(m => `<option value="${m.id}">${escapeHtml(m.nama)}</option>`).join('');
    }
  }

  onPenMapelChange();
}

function onPenMapelChange() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const m = db.mapel.find(x => x.id === mapelId);
  const kSel = document.getElementById('pen-kelas-select');
  if (!kSel) return;

  let classes = [];
  if (m && m.kelas && m.kelas.length) {
    classes = m.kelas.map(k => `${k.jurusan}-${k.tingkat}`);
  } else {
    classes = Object.keys(db.siswa || {});
  }

  kSel.innerHTML = classes.map(cKey => {
    const [jur, tk] = cKey.split('-');
    const label = (jur && tk) ? `${tk} ${jur}` : cKey;
    return `<option value="${cKey}">${label}</option>`;
  }).join('') || '<option value="">-- Pilih Kelas --</option>';

  // Auto-detect if mapel has practical coursework
  const isPractical = m ? /produktif|kejuruan|ipas|informatika|pjok|praktek|pkk|kewirausahaan|bengkel|lab/i.test(m.nama) : true;
  const chkPraktek = document.getElementById('pen-has-praktek');
  if (chkPraktek) chkPraktek.checked = isPractical;

  togglePraktekColumn();
  renderPenilaianTable();
}

function togglePraktekColumn() {
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;
  document.querySelectorAll('.col-praktek').forEach(el => {
    el.style.display = hasPraktek ? '' : 'none';
  });
  const fDesc = document.getElementById('pen-formula-desc');
  if (fDesc) {
    fDesc.textContent = hasPraktek
      ? 'Bobot: Kehadiran (15%), Tugas (15%), Praktek (25%), Ekskul (10%), UTS (15%), UAS (20%)'
      : 'Bobot: Kehadiran (20%), Tugas (25%), Ekskul (10%), UTS (20%), UAS (25%)';
  }
  recalcAllPenilaian();
}

function normalizePenClassKey(cVal) {
  if (!cVal) return '';
  if (db.siswa[cVal]) return cVal;
  const parts = cVal.trim().split(/[\s-]+/);
  if (parts.length >= 2) {
    const k1 = `${parts[0]}-${parts[1]}`;
    const k2 = `${parts[1]}-${parts[0]}`;
    if (db.siswa[k1]) return k1;
    if (db.siswa[k2]) return k2;
  }
  return cVal;
}

function getDisplayClassName(key) {
  if (!key) return '';
  const parts = key.split('-');
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : key;
}

function gradeLetterToNum(l) {
  if (l === 'A') return 93;
  if (l === 'B') return 84;
  if (l === 'C') return 75;
  return 80;
}

function renderPenilaianTable() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const classKey = document.getElementById('pen-kelas-select')?.value;
  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;
  const tbody = document.getElementById('pen-table-body');
  if (!tbody) return;

  if (!classKey) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text-muted)">Pilih kelas terlebih dahulu.</td></tr>';
    return;
  }

  const key = normalizePenClassKey(classKey);
  const siswaList = db.siswa[key] || [];

  if (!siswaList.length) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada data siswa untuk rombel ${getDisplayClassName(key)}.</td></tr>`;
    return;
  }

  const m = db.mapel.find(x => x.id === mapelId);
  const titleEl = document.getElementById('pen-table-title');
  if (titleEl) {
    titleEl.innerHTML = `📊 Buku Nilai Rombel: <strong>${getDisplayClassName(key)}</strong> · Mapel: <strong>${m ? m.nama : '-'}</strong>`;
  }

  // Load saved grades for this mapel and class
  const storeKey = `${mapelId}_${key}`;
  db.penilaian = db.penilaian || {};
  const savedData = db.penilaian[storeKey]?.grades || {};

  // Calculate student attendance from db.absensi
  const [jur, tk] = key.split('-');
  const relevantAbsensi = (db.absensi || []).filter(a =>
    (a.jurusan === jur && a.tingkat === tk) && (!mapelId || a.mapelId === mapelId || true)
  );

  let rowsHtml = '';
  siswaList.forEach((nama, idx) => {
    // Attendance percentage
    let totalSes = 0;
    let hadirSes = 0;
    relevantAbsensi.forEach(a => {
      const rec = a.records?.find(r => r.nama === nama);
      if (rec) {
        totalSes++;
        if (rec.status === 'H') hadirSes++;
      }
    });
    const calcAtt = totalSes > 0 ? Math.round((hadirSes / totalSes) * 100) : 95;

    // Load saved or seed reasonable initial scores
    const saved = savedData[nama];
    const hadir   = saved ? saved.hadirPct : calcAtt;
    const tugas   = saved ? saved.tugas   : (80 + ((idx * 3) % 15));
    const praktek = saved ? saved.praktek : (82 + ((idx * 4) % 14));
    const pramuka = saved ? saved.pramuka : ((idx % 3 === 0) ? 'A' : 'B');
    const pmr     = saved ? saved.pmr     : ((idx % 4 === 0) ? 'A' : (idx % 2 === 0 ? 'B' : '-'));
    const uts     = saved ? saved.uts     : (78 + ((idx * 5) % 16));
    const uas     = saved ? saved.uas     : (80 + ((idx * 2) % 15));
    const us      = saved ? saved.us      : (82 + ((idx * 3) % 13));

    rowsHtml += `
      <tr id="pen-row-${idx}">
        <td>${idx + 1}</td>
        <td class="text-left font-semibold">${nama}</td>
        <td>
          <div class="attendance-badge-col">
            <input type="number" class="grade-input" id="gr-hadir-${idx}" value="${hadir}" min="0" max="100" oninput="recalcRow(${idx})" style="width:52px !important">
            <span class="att-detail">${hadirSes}/${totalSes || 16} PTM</span>
          </div>
        </td>
        <td>
          <input type="number" class="grade-input" id="gr-tugas-${idx}" value="${tugas}" min="0" max="100" oninput="recalcRow(${idx})">
        </td>
        <td class="col-praktek">
          <input type="number" class="grade-input col-praktek" id="gr-praktek-${idx}" value="${praktek}" min="0" max="100" oninput="recalcRow(${idx})">
        </td>
        <td>
          <select class="ekskul-select" id="gr-pramuka-${idx}" onchange="recalcRow(${idx})">
            <option value="A" ${pramuka === 'A' ? 'selected' : ''}>A (Sangat Baik)</option>
            <option value="B" ${pramuka === 'B' ? 'selected' : ''}>B (Baik)</option>
            <option value="C" ${pramuka === 'C' ? 'selected' : ''}>C (Cukup)</option>
          </select>
        </td>
        <td>
          <select class="ekskul-select" id="gr-pmr-${idx}" onchange="recalcRow(${idx})">
            <option value="A" ${pmr === 'A' ? 'selected' : ''}>A (Sangat Baik)</option>
            <option value="B" ${pmr === 'B' ? 'selected' : ''}>B (Baik)</option>
            <option value="C" ${pmr === 'C' ? 'selected' : ''}>C (Cukup)</option>
            <option value="-" ${pmr === '-' ? 'selected' : ''}>- (Tidak Ikut)</option>
          </select>
        </td>
        <td>
          <input type="number" class="grade-input" id="gr-uts-${idx}" value="${uts}" min="0" max="100" oninput="recalcRow(${idx})">
        </td>
        <td>
          <input type="number" class="grade-input" id="gr-uas-${idx}" value="${uas}" min="0" max="100" oninput="recalcRow(${idx})">
        </td>
        <td>
          <input type="number" class="grade-input" id="gr-us-${idx}" value="${us}" min="0" max="100" oninput="recalcRow(${idx})">
        </td>
        <td>
          <span class="score-na" id="gr-na-${idx}">0.0</span>
        </td>
        <td>
          <span class="font-bold" id="gr-predikat-${idx}">-</span>
        </td>
        <td>
          <span id="gr-status-${idx}">-</span>
        </td>
        <td class="no-print">
          <button class="btn-sm btn-outline" style="white-space:nowrap;padding:4px 8px" onclick="openRaporModal('${key}', '${encodeURIComponent(nama)}', ${idx})">
            📄 Rapor
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
  togglePraktekColumn();
  recalcAllPenilaian();
}

function recalcRow(idx) {
  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;

  const hadir   = parseFloat(document.getElementById(`gr-hadir-${idx}`)?.value || 0);
  const tugas   = parseFloat(document.getElementById(`gr-tugas-${idx}`)?.value || 0);
  const praktek = parseFloat(document.getElementById(`gr-praktek-${idx}`)?.value || 0);
  const pramukaL = document.getElementById(`gr-pramuka-${idx}`)?.value || 'B';
  const pmrL     = document.getElementById(`gr-pmr-${idx}`)?.value || '-';
  const uts     = parseFloat(document.getElementById(`gr-uts-${idx}`)?.value || 0);
  const uas     = parseFloat(document.getElementById(`gr-uas-${idx}`)?.value || 0);

  const pramukaNum = gradeLetterToNum(pramukaL);
  const pmrNum     = pmrL === '-' ? pramukaNum : gradeLetterToNum(pmrL);
  const ekskulAvg  = (pramukaNum + pmrNum) / 2;

  let na = 0;
  if (hasPraktek) {
    na = (hadir * 0.15) + (tugas * 0.15) + (praktek * 0.25) + (ekskulAvg * 0.10) + (uts * 0.15) + (uas * 0.20);
  } else {
    na = (hadir * 0.20) + (tugas * 0.25) + (ekskulAvg * 0.10) + (uts * 0.20) + (uas * 0.25);
  }

  na = Math.round(na * 10) / 10;
  const predikat = na >= 90 ? 'A' : (na >= 80 ? 'B' : (na >= kkm ? 'C' : 'D'));
  const isTuntas = na >= kkm;

  const elNa = document.getElementById(`gr-na-${idx}`);
  const elPred = document.getElementById(`gr-predikat-${idx}`);
  const elStat = document.getElementById(`gr-status-${idx}`);

  if (elNa) elNa.textContent = na.toFixed(1);
  if (elPred) elPred.textContent = predikat;
  if (elStat) {
    elStat.innerHTML = isTuntas
      ? '<span class="badge-tuntas">Tuntas</span>'
      : '<span class="badge-remedial">Remedial</span>';
  }

  return { na, isTuntas };
}

function recalcAllPenilaian() {
  const tbody = document.getElementById('pen-table-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  if (!rows.length) return;

  let totalNa = 0;
  let tuntasCount = 0;
  let remedialCount = 0;
  let count = 0;

  rows.forEach((tr, i) => {
    if (document.getElementById(`gr-tugas-${i}`)) {
      const res = recalcRow(i);
      totalNa += res.na;
      if (res.isTuntas) tuntasCount++; else remedialCount++;
      count++;
    }
  });

  const avg = count > 0 ? (totalNa / count).toFixed(1) : '0.0';
  const elAvg = document.getElementById('pen-kpi-avg');
  const elTun = document.getElementById('pen-kpi-tuntas');
  const elRem = document.getElementById('pen-kpi-remedial');

  if (elAvg) elAvg.textContent = avg;
  if (elTun) elTun.textContent = tuntasCount;
  if (elRem) elRem.textContent = remedialCount;
}

function syncKehadiranOtomatis() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const classKey = document.getElementById('pen-kelas-select')?.value;
  if (!classKey) return;
  const key = normalizePenClassKey(classKey);
  const siswaList = db.siswa[key] || [];

  const [jur, tk] = key.split('-');
  const relevantAbsensi = (db.absensi || []).filter(a =>
    (a.jurusan === jur && a.tingkat === tk) && (!mapelId || a.mapelId === mapelId || true)
  );

  siswaList.forEach((nama, idx) => {
    let totalSes = 0;
    let hadirSes = 0;
    relevantAbsensi.forEach(a => {
      const rec = a.records?.find(r => r.nama === nama);
      if (rec) {
        totalSes++;
        if (rec.status === 'H') hadirSes++;
      }
    });
    const calcAtt = totalSes > 0 ? Math.round((hadirSes / totalSes) * 100) : 95;
    const inp = document.getElementById(`gr-hadir-${idx}`);
    if (inp) inp.value = calcAtt;
  });

  recalcAllPenilaian();
  Sound.success();
  showToast('Persentase kehadiran berhasil disinkronkan otomatis dari rekaman presensi biometrik! ⚡', 'ok');
}

function simpanNilaiKelas() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const classKey = document.getElementById('pen-kelas-select')?.value;
  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;
  if (!classKey || !mapelId) {
    showToast('Pilih mapel dan kelas terlebih dahulu.', 'err');
    return;
  }

  // SECURITY VALIDATION: Confirm mapel belongs to active teacher
  const myMapel = getFilteredMapelForTeacher('ACTIVE');
  const isMine = myMapel.some(m => m.id === mapelId);
  if (!isMine) {
    showToast('Akses ditolak: Anda hanya berhak menginput & mengubah nilai mapel yang Anda ampu.', 'err');
    return;
  }

  const key = normalizePenClassKey(classKey);
  const siswaList = db.siswa[key] || [];
  const m = db.mapel.find(x => x.id === mapelId);
  const storeKey = `${mapelId}_${key}`;

  const grades = {};
  siswaList.forEach((nama, idx) => {
    grades[nama] = {
      hadirPct: parseFloat(document.getElementById(`gr-hadir-${idx}`)?.value || 0),
      tugas:    parseFloat(document.getElementById(`gr-tugas-${idx}`)?.value || 0),
      praktek:  parseFloat(document.getElementById(`gr-praktek-${idx}`)?.value || 0),
      pramuka:  document.getElementById(`gr-pramuka-${idx}`)?.value || 'B',
      pmr:      document.getElementById(`gr-pmr-${idx}`)?.value || '-',
      uts:      parseFloat(document.getElementById(`gr-uts-${idx}`)?.value || 0),
      uas:      parseFloat(document.getElementById(`gr-uas-${idx}`)?.value || 0),
      us:       parseFloat(document.getElementById(`gr-us-${idx}`)?.value || 0),
      na:       parseFloat(document.getElementById(`gr-na-${idx}`)?.textContent || 0),
      predikat: document.getElementById(`gr-predikat-${idx}`)?.textContent || 'B',
      status:   document.getElementById(`gr-status-${idx}`)?.textContent?.trim() || 'Tuntas'
    };
  });

  db.penilaian = db.penilaian || {};
  db.penilaian[storeKey] = {
    kkm,
    hasPraktek,
    mapelId,
    mapelNama: m ? m.nama : '',
    classKey: key,
    displayClass: getDisplayClassName(key),
    guruNama: m?.guruNama || db.guru?.nama || '',
    guruNip: db.guru?.nip || '',
    updatedAt: new Date().toISOString(),
    grades
  };

  saveDB();
  Sound.success();
  showToast(`Nilai kelas ${getDisplayClassName(key)} mata pelajaran ${m?.nama || ''} berhasil disimpan ke sistem! 🎉`, 'ok');
}

function exportNilaiExcel() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const classKey = document.getElementById('pen-kelas-select')?.value;
  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;
  if (!classKey || !mapelId) {
    showToast('Pilih mapel dan kelas terlebih dahulu.', 'err');
    return;
  }

  if (typeof XLSX === 'undefined') {
    showToast('Library XLSX belum dimuat.', 'err');
    return;
  }

  const key = normalizePenClassKey(classKey);
  const siswaList = db.siswa[key] || [];
  const m = db.mapel.find(x => x.id === mapelId);
  const displayClass = getDisplayClassName(key);
  const sk = window.SMKN10_SK_DATA;

  const dataAOA = [
    ['PEMERINTAH PROVINSI SULAWESI TENGGARA'],
    ['DINAS PENDIDIKAN DAN KEBUDAYAAN'],
    ['SMK NEGERI 10 KOLAKA'],
    ['DAFTAR NILAI KOMPREHENSIF AKADEMIK SISWA'],
    [''],
    ['Mata Pelajaran:', m ? m.nama : '', '', 'Kelas / Rombel:', displayClass],
    ['Guru Pengampu:', m?.guruNama || db.guru?.nama || '', '', 'Tahun Ajaran:', `${db.guru?.ta || sk?.school?.tahun_ajaran || '2026/2027'} (Semester ${db.guru?.semester || sk?.school?.semester || 'Ganjil'})`],
    ['KKM:', kkm, '', 'Praktikum:', hasPraktek ? 'Ada Praktikum Kejuruan' : 'Non-Praktikum'],
    [''],
    ['No', 'NISN', 'Nama Siswa', 'Kehadiran (%)', 'Tugas', 'Praktek', 'Pramuka', 'PMR', 'UTS', 'UAS', 'Ujian Sekolah', 'Nilai Akhir', 'Predikat', 'Status Ketuntasan']
  ];

  let totalNa = 0;
  let tuntasCount = 0;
  let remedialCount = 0;

  siswaList.forEach((nama, idx) => {
    const nisn = `00${(idx + 1).toString().padStart(3, '0')}${key.replace('-', '')}26`;
    const hadir   = parseFloat(document.getElementById(`gr-hadir-${idx}`)?.value || 0);
    const tugas   = parseFloat(document.getElementById(`gr-tugas-${idx}`)?.value || 0);
    const praktek = parseFloat(document.getElementById(`gr-praktek-${idx}`)?.value || 0);
    const pramuka = document.getElementById(`gr-pramuka-${idx}`)?.value || 'B';
    const pmr     = document.getElementById(`gr-pmr-${idx}`)?.value || '-';
    const uts     = parseFloat(document.getElementById(`gr-uts-${idx}`)?.value || 0);
    const uas     = parseFloat(document.getElementById(`gr-uas-${idx}`)?.value || 0);
    const us      = parseFloat(document.getElementById(`gr-us-${idx}`)?.value || 0);
    const na      = parseFloat(document.getElementById(`gr-na-${idx}`)?.textContent || 0);
    const predikat = document.getElementById(`gr-predikat-${idx}`)?.textContent || 'B';
    const status  = document.getElementById(`gr-status-${idx}`)?.textContent?.trim() || 'Tuntas';

    totalNa += na;
    if (na >= kkm) tuntasCount++; else remedialCount++;

    dataAOA.push([
      idx + 1,
      nisn,
      nama,
      hadir,
      tugas,
      hasPraktek ? praktek : '-',
      pramuka,
      pmr,
      uts,
      uas,
      us,
      na,
      predikat,
      status
    ]);
  });

  const avg = siswaList.length > 0 ? (totalNa / siswaList.length).toFixed(1) : 0;
  dataAOA.push(['']);
  dataAOA.push(['', '', 'RATA-RATA KELAS', '', '', '', '', '', '', '', '', avg]);
  dataAOA.push(['', '', 'JUMLAH SISWA TUNTAS', '', '', '', '', '', '', '', '', tuntasCount]);
  dataAOA.push(['', '', 'JUMLAH SISWA REMEDIAL', '', '', '', '', '', '', '', '', remedialCount]);

  const ws = XLSX.utils.aoa_to_sheet(dataAOA);
  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Nilai_${displayClass.replace(/\s+/g, '_')}`);
  const fileName = `Nilai_SMKN10_${displayClass.replace(/\s+/g, '_')}_${(m ? m.nama : 'Mapel').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
  Sound.success();
  showToast(`File Excel ${fileName} berhasil diunduh! 📊`, 'ok');
}

function printLedgerKelas() {
  const mapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const classKey = document.getElementById('pen-kelas-select')?.value;
  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const hasPraktek = document.getElementById('pen-has-praktek')?.checked;
  if (!classKey || !mapelId) {
    showToast('Pilih mapel dan kelas terlebih dahulu.', 'err');
    return;
  }

  const key = normalizePenClassKey(classKey);
  const siswaList = db.siswa[key] || [];
  const m = db.mapel.find(x => x.id === mapelId);
  const displayClass = getDisplayClassName(key);
  const sk = window.SMKN10_SK_DATA;
  const wali = sk?.wali_kelas?.[displayClass] || { guru: 'Wali Kelas', nip: '-' };

  let tableRows = '';
  siswaList.forEach((nama, idx) => {
    const nisn = `00${(idx + 1).toString().padStart(3, '0')}${key.replace('-', '')}26`;
    const hadir   = document.getElementById(`gr-hadir-${idx}`)?.value || 0;
    const tugas   = document.getElementById(`gr-tugas-${idx}`)?.value || 0;
    const praktek = document.getElementById(`gr-praktek-${idx}`)?.value || 0;
    const pramuka = document.getElementById(`gr-pramuka-${idx}`)?.value || 'B';
    const pmr     = document.getElementById(`gr-pmr-${idx}`)?.value || '-';
    const uts     = document.getElementById(`gr-uts-${idx}`)?.value || 0;
    const uas     = document.getElementById(`gr-uas-${idx}`)?.value || 0;
    const us      = document.getElementById(`gr-us-${idx}`)?.value || 0;
    const na      = document.getElementById(`gr-na-${idx}`)?.textContent || 0;
    const pred    = document.getElementById(`gr-predikat-${idx}`)?.textContent || 'B';
    const stat    = document.getElementById(`gr-status-${idx}`)?.textContent?.trim() || 'Tuntas';

    tableRows += `
      <tr>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${idx + 1}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;font-family:monospace;">${nisn}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:700;">${nama}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${hadir}%</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${tugas}</td>
        ${hasPraktek ? `<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${praktek}</td>` : ''}
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${pramuka}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${pmr}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${uts}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${uas}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${us}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;font-weight:800;">${na}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;font-weight:800;">${pred}</td>
        <td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">${stat}</td>
      </tr>
    `;
  });

  const pWin = window.open('', '_blank');
  if (pWin) {
    pWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger Nilai - ${displayClass} - ${m?.nama || ''}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #0f172a; padding: 20px; font-size: 11px; }
          .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
          .kop h2 { margin: 0; font-size: 15px; text-transform: uppercase; }
          .kop h3 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .meta-tbl { width: 100%; margin-bottom: 12px; font-size: 11px; }
          .meta-tbl td { padding: 3px 6px; }
          table.ledger { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          table.ledger th { background: #f1f5f9; padding: 7px 4px; border: 1px solid #94a3b8; font-weight: 800; text-align: center; }
          .sign-grid { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; font-size: 11px; }
          .sign-box { width: 28%; }
          .space { height: 50px; }
          @page { size: A4 landscape; margin: 10mm; }
        </style>
      </head>
      <body>
        <div class="kop">
          <h2>PEMERINTAH PROVINSI SULAWESI TENGGARA · DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
          <h2>SMK NEGERI 10 KOLAKA</h2>
          <h3>LEDGER DAFTAR NILAI HASIL BELAJAR SISWA · SEMESTER ${(db.guru?.semester || 'Ganjil').toUpperCase()} ${db.guru?.ta || '2026/2027'}</h3>
        </div>
        <table class="meta-tbl">
          <tr>
            <td style="width:130px"><strong>Mata Pelajaran:</strong></td>
            <td>${m ? m.nama : '-'}</td>
            <td style="width:130px"><strong>Kelas / Rombel:</strong></td>
            <td>${displayClass}</td>
          </tr>
          <tr>
            <td><strong>Guru Pengampu:</strong></td>
            <td>${m?.guruNama || db.guru?.nama || '-'}</td>
            <td><strong>KKM:</strong></td>
            <td>${kkm}</td>
          </tr>
        </table>
        <table class="ledger">
          <thead>
            <tr>
              <th style="width:30px">No</th>
              <th style="width:85px">NISN</th>
              <th style="text-align:left">Nama Siswa</th>
              <th>Hadir</th>
              <th>Tugas</th>
              ${hasPraktek ? '<th>Praktek</th>' : ''}
              <th>Pramuka</th>
              <th>PMR</th>
              <th>UTS</th>
              <th>UAS</th>
              <th>U. Sekolah</th>
              <th>Nilai Akhir</th>
              <th>Predikat</th>
              <th>Ketuntasan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="sign-grid">
          <div class="sign-box">
            <div>Mengetahui,</div>
            <div>Wali Kelas ${displayClass}</div>
            <div class="space"></div>
            <div style="font-weight:bold;text-decoration:underline">${wali.guru}</div>
            <div style="font-size:10px;color:#64748b">${maskNIP(wali.nip)}</div>
          </div>
          <div class="sign-box">
            <div>Kolaka, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</div>
            <div>Guru Mata Pelajaran</div>
            <div class="space"></div>
            <div style="font-weight:bold;text-decoration:underline">${m?.guruNama || db.guru?.nama || 'Guru Mapel'}</div>
            <div style="font-size:10px;color:#64748b">${maskNIP(db.guru?.nip)}</div>
          </div>
          <div class="sign-box">
            <div>Mengetahui,</div>
            <div>Kepala SMK Negeri 10 Kolaka</div>
            <div class="space"></div>
            <div style="font-weight:bold;text-decoration:underline">${sk?.school?.kepala_sekolah || 'TABING, S.Pd,. M.Pd'}</div>
            <div style="font-size:10px;color:#64748b">NIP. ${maskNIP(sk?.school?.nip_kepala_sekolah)}</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        <\/script>
      </body>
      </html>
    `);
    pWin.document.close();
  }
}

// ─────────────────────────────────────────────
//  MODAL RAPOR SISWA DIGITAL (KURIKULUM MERDEKA/2013)
// ─────────────────────────────────────────────
function openRaporModal(classKey, encodedNama, idx) {
  const nama = decodeURIComponent(encodedNama);
  const key = normalizePenClassKey(classKey);
  const displayClass = getDisplayClassName(key);
  const [jur, tk] = key.split('-');
  const sk = window.SMKN10_SK_DATA;

  const deptNames = {
    TJKT: 'Teknik Jaringan Komputer dan Telekomunikasi',
    MPLB: 'Manajemen Perkantoran dan Layanan Bisnis',
    GP:   'Geologi Pertambangan (Program Unggulan)'
  };
  const jurFullName = deptNames[jur] || jur;
  const nisn = `00${(idx + 1).toString().padStart(3, '0')}${jur}26`;

  // Get current active subject grade for the logged-in teacher
  const curMapelId = parseInt(document.getElementById('pen-mapel-select')?.value);
  const mySubjects = getFilteredMapelForTeacher('ACTIVE');
  const curMapel = mySubjects.find(x => x.id === curMapelId) || mySubjects[0] || db.mapel.find(x => x.id === curMapelId);

  const kkm = parseFloat(document.getElementById('pen-kkm')?.value) || 75;
  const naScore = parseFloat(document.getElementById(`gr-na-${idx}`)?.textContent || 85.0);
  const predikat = document.getElementById(`gr-predikat-${idx}`)?.textContent || 'B';
  const statusStr = document.getElementById(`gr-status-${idx}`)?.textContent?.trim() || (naScore >= kkm ? 'TUNTAS' : 'BELUM TUNTAS');

  const tugasScore   = parseFloat(document.getElementById(`gr-tugas-${idx}`)?.value || 80);
  const praktekScore = parseFloat(document.getElementById(`gr-praktek-${idx}`)?.value || 82);
  const utsScore     = parseFloat(document.getElementById(`gr-uts-${idx}`)?.value || 78);
  const uasScore     = parseFloat(document.getElementById(`gr-uas-${idx}`)?.value || 80);
  const usScore      = parseFloat(document.getElementById(`gr-us-${idx}`)?.value || 82);
  const hadirPct     = parseFloat(document.getElementById(`gr-hadir-${idx}`)?.value || 95);

  const pramukaL = document.getElementById(`gr-pramuka-${idx}`)?.value || 'A';
  const pmrL     = document.getElementById(`gr-pmr-${idx}`)?.value || 'B';

  // Calculate student attendance from db.absensi
  let sHadir = 0;
  let sSakit = 0;
  let sIzin = 0;
  let sAlpa = 0;
  (db.absensi || []).filter(a => a.jurusan === jur && a.tingkat === tk).forEach(a => {
    const r = a.records?.find(x => x.nama === nama);
    if (r) {
      if (r.status === 'H') sHadir++;
      else if (r.status === 'S') sSakit++;
      else if (r.status === 'I') sIzin++;
      else if (r.status === 'A') sAlpa++;
    }
  });

  const mapelNama = curMapel ? curMapel.nama : 'Mata Pelajaran Kejuruan';
  const guruNama = db.guru?.nama || curMapel?.guruNama || 'Guru Pengampu';
  const guruNip  = db.guru?.nip || curMapel?.guruNip || '-';

  let capaianDesc = '';
  if (predikat === 'A') {
    capaianDesc = `Menunjukkan penguasaan kompetensi yang sangat istimewa dalam capaian pembelajaran ${mapelNama}. Sangat aktif, disiplin, dan terampil dalam praktikum mandiri maupun kelompok.`;
  } else if (predikat === 'B') {
    capaianDesc = `Menunjukkan pemahaman yang baik dan tuntas dalam menguasai capaian pembelajaran ${mapelNama}. Rajin menyelesaikan penugasan dan berpartisipasi aktif dalam kegiatan pembelajaran.`;
  } else if (predikat === 'C') {
    capaianDesc = `Cukup menguasai capaian pembelajaran pokok dalam ${mapelNama}. Memerlukan bimbingan mandiri dan latihan lanjutan untuk penguatan kompetensi praktikum kejuruan.`;
  } else {
    capaianDesc = `Belum mencapai kriteria ketercapaian tujuan pembelajaran minimal (KKM) dalam ${mapelNama}. Perlu pendampingan remedial intensif.`;
  }

  const raporHtml = `
    <div class="rapor-paper" id="rapor-paper-content">
      <!-- Kop Surat Resmi -->
      <div class="rapor-kop">
        <div class="rapor-logo" title="SMK Negeri 10 Kolaka">
          <img src="img/logo_smkn10.png" alt="Logo SMKN 10 Kolaka" class="rapor-logo-img" />
        </div>
        <div class="rapor-kop-text">
          <div class="rapor-kop-prov">PEMERINTAH PROVINSI SULAWESI TENGGARA</div>
          <div class="rapor-kop-dept">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
          <div class="rapor-kop-school">SMK NEGERI 10 KOLAKA</div>
          <div class="rapor-kop-addr">
            Jl. Pendidikan No. 10 Tanggetada, Kabupaten Kolaka, Sulawesi Tenggara · NPSN: 699XXXXX
          </div>
        </div>
        <div class="rapor-logo-right" title="SMK Bisa - Hebat">
          <img src="img/logo_smk_bisa.png" alt="SMK Bisa Hebat" class="rapor-smk-logo" />
        </div>
      </div>

      <!-- Title Bar -->
      <div class="rapor-title-bar">
        <div class="rapor-title">LEMBAR HASIL PENILAIAN &amp; RAPOR CAPAIAN KOMPETENSI SISWA</div>
        <div style="font-size:12.5px;font-weight:700;color:#1e3a8a;margin-top:3px">
          Mata Pelajaran: ${escapeHtml(mapelNama)}
        </div>
        <div style="font-size:11.5px;font-weight:600;color:#475569;margin-top:2px">
          Tahun Ajaran ${db.guru?.ta || '2026/2027'} – Semester ${db.guru?.semester || 'Ganjil'}
        </div>
      </div>

      <!-- Identitas Siswa -->
      <div class="rapor-meta-grid">
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">Nama Siswa</span>
          <span class="rapor-meta-val">: <strong>${escapeHtml(nama)}</strong></span>
        </div>
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">Kelas / Rombel</span>
          <span class="rapor-meta-val">: ${displayClass}</span>
        </div>
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">NISN</span>
          <span class="rapor-meta-val">: ${nisn}</span>
        </div>
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">Program Keahlian</span>
          <span class="rapor-meta-val">: ${jurFullName}</span>
        </div>
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">Guru Pengampu</span>
          <span class="rapor-meta-val">: <strong>${escapeHtml(guruNama)}</strong></span>
        </div>
        <div class="rapor-meta-item">
          <span class="rapor-meta-lbl">NIP Guru</span>
          <span class="rapor-meta-val">: ${escapeHtml(guruNip)}</span>
        </div>
      </div>

      <!-- Tabel Capaian Nilai Akademik (HANYA MAPEL GURU LOGIN) -->
      <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#0f172a">A. CAPAIAN KOMPETENSI MATA PELAJARAN</div>
      <table class="rapor-table">
        <thead>
          <tr>
            <th style="width:35px">No</th>
            <th style="text-align:left;min-width:180px">Mata Pelajaran &amp; Guru Pengampu</th>
            <th style="width:50px">KKM</th>
            <th style="width:65px">Nilai Akhir</th>
            <th style="width:65px">Predikat</th>
            <th style="width:75px">Status</th>
            <th style="text-align:left">Capaian Kompetensi &amp; Deskripsi Kemajuan Belajar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center">1</td>
            <td>
              <div style="font-weight:800;color:#0f172a">${escapeHtml(mapelNama)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px">Guru: ${escapeHtml(guruNama)}</div>
            </td>
            <td style="text-align:center;font-weight:700">${kkm}</td>
            <td style="text-align:center;font-weight:800;font-size:14px;color:#1e3a8a">${naScore.toFixed(1)}</td>
            <td style="text-align:center;font-weight:800;font-size:13px">${predikat}</td>
            <td style="text-align:center">
              <span class="chip ${naScore >= kkm ? 'chip-green' : 'chip-red'}" style="font-size:10px;padding:2px 6px">
                ${statusStr}
              </span>
            </td>
            <td style="font-size:11.5px;line-height:1.45">${capaianDesc}</td>
          </tr>
        </tbody>
      </table>

      <!-- Rincian Komponen Penilaian -->
      <div style="font-weight:800;font-size:12.5px;margin-top:10px;margin-bottom:6px;color:#0f172a">RINCIAN KOMPONEN PENILAIAN GURU</div>
      <table class="rapor-table" style="margin-bottom:14px">
        <thead>
          <tr>
            <th style="text-align:center">Kehadiran (${hadirPct}%)</th>
            <th style="text-align:center">Tugas Mandiri</th>
            <th style="text-align:center">Praktek / Bengkel</th>
            <th style="text-align:center">UTS</th>
            <th style="text-align:center">UAS</th>
            <th style="text-align:center">Ujian Sekolah</th>
            <th style="text-align:center">Nilai Akhir (NA)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;font-weight:700">${hadirPct}%</td>
            <td style="text-align:center;font-weight:700">${tugasScore}</td>
            <td style="text-align:center;font-weight:700">${praktekScore}</td>
            <td style="text-align:center;font-weight:700">${utsScore}</td>
            <td style="text-align:center;font-weight:700">${uasScore}</td>
            <td style="text-align:center;font-weight:700">${usScore}</td>
            <td style="text-align:center;font-weight:800;font-size:14px;color:#1e3a8a">${naScore.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Ekstrakurikuler & Presensi -->
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;margin-bottom:16px">
        <div>
          <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#0f172a">B. EKSTRAKURIKULER</div>
          <table class="rapor-table" style="margin-bottom:0">
            <thead>
              <tr>
                <th style="text-align:left">Kegiatan Ekstrakurikuler</th>
                <th style="width:65px">Predikat</th>
                <th style="text-align:left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700">Pendidikan Kepramukaan (Wajib)</td>
                <td style="text-align:center;font-weight:800">${pramukaL}</td>
                <td style="font-size:11px">Sangat disiplin, aktif dalam kepemimpinan dan pembentukan karakter.</td>
              </tr>
              <tr>
                <td style="font-weight:700">Palang Merah Remaja (PMR)</td>
                <td style="text-align:center;font-weight:800">${pmrL}</td>
                <td style="font-size:11px">${pmrL !== '-' ? 'Aktif dalam pertolongan pertama & kemanusiaan.' : 'Tidak mengikuti kegiatan PMR.'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#0f172a">C. REKAPITULASI KEHADIRAN KELAS</div>
          <table class="rapor-table" style="margin-bottom:0">
            <tbody>
              <tr>
                <td style="font-weight:700">1. Kehadiran Presensi Digital</td>
                <td style="text-align:center;font-weight:800;color:#15803d">${sHadir || 16} Pertemuan</td>
              </tr>
              <tr>
                <td style="font-weight:700">2. Sakit (S)</td>
                <td style="text-align:center;font-weight:700">${sSakit} Hari</td>
              </tr>
              <tr>
                <td style="font-weight:700">3. Izin (I)</td>
                <td style="text-align:center;font-weight:700">${sIzin} Hari</td>
              </tr>
              <tr>
                <td style="font-weight:700">4. Tanpa Keterangan (A)</td>
                <td style="text-align:center;font-weight:700;color:${sAlpa > 0 ? '#b91c1c' : '#475569'}">${sAlpa} Hari</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Catatan Guru Pengampu -->
      <div class="rapor-notes">
        <strong>Catatan Guru Pengampu (${escapeHtml(guruNama)}):</strong><br>
        Ananda <strong>${escapeHtml(nama)}</strong> menunjukkan dedikasi yang baik dalam mata pelajaran <strong>${escapeHtml(mapelNama)}</strong>. Tingkatkan terus kedisiplinan dan penguasaan kompetensi kejuruan untuk kesiapan dunia kerja.
      </div>

      <!-- Tanda Tangan Resmi: Orang Tua, Guru Pengampu, Kepala Sekolah -->
      <div class="rapor-sign-grid">
        <div>
          <div class="sign-title">Orang Tua / Wali Siswa,</div>
          <div class="sign-space"></div>
          <div class="sign-name">( ............................................ )</div>
        </div>
        <div>
          <div class="sign-title">Guru Mata Pelajaran Pengampu,</div>
          <div class="sign-space"></div>
          <div class="sign-name">${escapeHtml(guruNama)}</div>
          <div class="sign-nip">NIP. ${escapeHtml(guruNip)}</div>
        </div>
        <div>
          <div class="sign-title">Tanggetada, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}<br>Kepala SMK Negeri 10 Kolaka,</div>
          <div class="sign-space" style="height:44px"></div>
          <div class="sign-name">${sk?.school?.kepala_sekolah || 'TABING, S.Pd,. M.Pd'}</div>
          <div class="sign-nip">NIP. ${maskNIP(sk?.school?.nip_kepala_sekolah)}</div>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('rapor-print-area');
  if (container) container.innerHTML = raporHtml;

  const modal = document.getElementById('modal-rapor-siswa');
  if (modal) modal.style.display = 'flex';
}

function closeRaporModal() {
  const modal = document.getElementById('modal-rapor-siswa');
  if (modal) modal.style.display = 'none';
}

function printRaporContent() {
  const area = document.getElementById('rapor-print-area');
  if (!area) return;

  const pWin = window.open('', '_blank');
  if (pWin) {
    pWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapor Akademik Siswa - SMKN 10 Kolaka</title>
        <link rel="stylesheet" href="style.css">
        <style>
          body { background: #ffffff !important; padding: 20px !important; color: #0f172a; margin: 0; }
          .rapor-paper { box-shadow: none !important; border: none !important; padding: 0 !important; }
          @page { size: A4 portrait; margin: 10mm 14mm; }
        </style>
      </head>
      <body>
        ${area.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        <\/script>
      </body>
      </html>
    `);
    pWin.document.close();
  } else {
    // Fallback if popup blocked
    document.body.classList.add('printing-rapor');
    window.print();
    document.body.classList.remove('printing-rapor');
  }
}



function resetDatabaseSemua() {
  if (!isAdminAuthenticated()) {
    showToast('Akses ditolak: Memerlukan otorisasi Administrator!', 'err');
    openAdminAuthModal(() => resetDatabaseSemua());
    return;
  }
  appConfirm('PERINGATAN: Seluruh data (profil guru, mata pelajaran, siswa, presensi guru, riwayat absensi, dan nilai) akan dihapus secara permanen dari perangkat ini. Lanjutkan reset?', () => {
    localStorage.removeItem('smkn10_v2');
    try {
      sessionStorage.removeItem('smkn10_admin_auth');
    } catch(_) {}
    showToast('Database berhasil dibersihkan! Memuat ulang sistem...', 'ok');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  });
}
