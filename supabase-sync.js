/**
 * ─────────────────────────────────────────────────────────────
 *  SUPABASE CLOUD SYNC ENGINE – SMK NEGERI 10 KOLAKA
 *  Cloud Database Sync, Offline-first Resilience & Realtime
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  const SUPABASE_CONFIG = {
    url: 'https://jnfppypxrjisbkalafnu.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZnBweXB4cmppc2JrYWxhZm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNDM5OTUsImV4cCI6MjEwNzgxOTk5NX0.PJv7Zb_ZWjOd2I7WQvKtlrQumhhL0BALPat6Tos1dvQ'
  };

  let client = null;
  let isOnline = false;
  let isSyncing = false;
  let realtimeChannel = null;

  // Security Checklist: Debug mode off & Error detail jangan bocor
  const IS_DEBUG_MODE = false;
  function safeLog(...args) {
    if (IS_DEBUG_MODE) console.log(...args);
  }
  function safeWarn(...args) {
    if (IS_DEBUG_MODE) console.warn(...args);
  }

  function initClient() {
    try {
      if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
          auth: { persistSession: false }
        });
      } else {
        safeWarn('[Supabase] Library supabase-js belum siap.');
      }
    } catch (_) {
      safeWarn('[Supabase] Init failed.');
    }
  }

  // Update badge UI
  function updateBadgeUI(status, text) {
    let badge = document.getElementById('cloud-sync-badge');
    const textEl = document.getElementById('cloud-sync-text');
    const dotEl = document.getElementById('cloud-sync-dot');

    if (badge && textEl && dotEl) {
      if (status === 'syncing') {
        textEl.textContent = 'Menyinkronkan...';
        dotEl.className = 'cloud-pulse-dot syncing';
        badge.title = 'Sedang menyinkronkan data dengan Cloud Supabase...';
      } else if (status === 'connected') {
        textEl.textContent = text || 'Cloud: Terhubung';
        dotEl.className = 'cloud-pulse-dot';
        badge.title = 'Terhubung ke Cloud Supabase (Klik untuk sync manual)';
      } else if (status === 'offline') {
        textEl.textContent = 'Cloud: Offline';
        dotEl.className = 'cloud-pulse-dot offline';
        badge.title = 'Cloud Offline (Bekerja secara lokal)';
      } else if (status === 'error') {
        textEl.textContent = 'Cloud: Gagal';
        dotEl.className = 'cloud-pulse-dot offline';
        badge.title = 'Gagal terhubung ke Cloud Supabase';
      }
      return;
    }

    if (!badge) {
      const topbarActions = document.querySelector('.topbar-actions') || document.querySelector('.topbar-date-box');
      if (topbarActions) {
        badge = document.createElement('button');
        badge.id = 'cloud-sync-badge';
        badge.className = 'btn-liquid-topbar btn-liquid-cloud';
        badge.onclick = () => window.SupabaseSync.manualSync();
        badge.title = 'Klik untuk sinkronisasi cloud manual';
        topbarActions.insertBefore(badge, topbarActions.firstChild);
      }
    }

    if (badge) {
      if (status === 'syncing') {
        badge.innerHTML = `<span class="btn-liquid-icon">🔄</span> <span>Menyinkronkan...</span> <span class="cloud-pulse-dot syncing"></span>`;
      } else if (status === 'connected') {
        badge.innerHTML = `<span class="btn-liquid-icon">☁️</span> <span>${text || 'Cloud: Terhubung'}</span> <span class="cloud-pulse-dot"></span>`;
      } else if (status === 'offline') {
        badge.innerHTML = `<span class="btn-liquid-icon">☁️</span> <span>Cloud: Offline</span> <span class="cloud-pulse-dot offline"></span>`;
      } else if (status === 'error') {
        badge.innerHTML = `<span class="btn-liquid-icon">⚠️</span> <span>Cloud: Gagal</span> <span class="cloud-pulse-dot offline"></span>`;
      }
    }
  }

  // 1. Upload Student Attendance Session to Supabase
  async function uploadSession(session) {
    if (!client || !session) return;
    try {
      const recordId = `${session.jurusan}-${session.tingkat}-${session.tanggal}-${session.pertemuan}`;
      const payload = {
        id: recordId,
        kelas: `${session.jurusan} ${session.tingkat}`,
        tanggal: session.tanggal,
        pertemuan: parseInt(session.pertemuan, 10) || 1,
        jam_masuk: session.jamMasuk || '',
        jam_keluar: session.jamKeluar || '',
        guru_nama: session.namaGuru || (window.db?.guru?.nama || ''),
        guru_nip: session.nipGuru || (window.db?.guru?.nip || ''),
        records: session.records || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('absensi_siswa').upsert(payload);
      if (error) {
        safeWarn('[Supabase] Gagal upload sesi absensi:', error.message);
      } else {
        safeLog(`[Supabase] ✅ Sesi ${recordId} tersinkron ke cloud.`);
      }
    } catch (err) {
      safeWarn('[Supabase] Upload session error:', err);
    }
  }

  // 2. Download & Merge Student Attendance Sessions
  async function downloadAndMergeSessions() {
    if (!client || !window.db) return 0;
    try {
      const { data, error } = await client
        .from('absensi_siswa')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      if (!data || !Array.isArray(data)) return 0;

      let mergedCount = 0;
      window.db.absensi = window.db.absensi || [];

      data.forEach(cloudRow => {
        const [jurusan, tingkat] = (cloudRow.kelas || '').split(' ');
        const existingIdx = window.db.absensi.findIndex(a =>
          a.jurusan === jurusan &&
          a.tingkat === tingkat &&
          a.tanggal === cloudRow.tanggal &&
          parseInt(a.pertemuan, 10) === parseInt(cloudRow.pertemuan, 10)
        );

        const sessionObj = {
          id: cloudRow.id,
          mapelId: 1,
          mapelNama: 'Produktif Kejuruan',
          jurusan: jurusan || 'TJKT',
          tingkat: tingkat || 'X',
          tanggal: cloudRow.tanggal,
          pertemuan: cloudRow.pertemuan,
          jamMasuk: cloudRow.jam_masuk || '',
          jamKeluar: cloudRow.jam_keluar || '',
          namaGuru: cloudRow.guru_nama || '',
          nipGuru: cloudRow.guru_nip || '',
          ta: window.db.guru?.ta || '2026/2027 Ganjil',
          records: cloudRow.records || []
        };

        if (existingIdx === -1) {
          window.db.absensi.push(sessionObj);
          mergedCount++;
        } else {
          // Merge record photos if local is missing
          const localSess = window.db.absensi[existingIdx];
          if (!localSess.records || localSess.records.length === 0 || (cloudRow.records && cloudRow.records.length > localSess.records.length)) {
            window.db.absensi[existingIdx] = sessionObj;
            mergedCount++;
          }
        }
      });

      // Also upload any local sessions that cloud doesn't have yet
      for (const loc of window.db.absensi) {
        const locId = `${loc.jurusan}-${loc.tingkat}-${loc.tanggal}-${loc.pertemuan}`;
        const hasOnCloud = data.some(c => c.id === locId);
        if (!hasOnCloud) {
          await uploadSession(loc);
        }
      }

      if (mergedCount > 0 && typeof window.saveDB === 'function') {
        window.saveDB();
        if (typeof window.renderRekapTable === 'function') {
          try { window.renderRekapTable(); } catch(_) {}
        }
      }

      return data.length;
    } catch (err) {
      safeWarn('[Supabase] Gagal download sesi absensi:', err.message);
      return 0;
    }
  }

  // 3. Upload Teacher Attendance
  async function uploadTeacherPresence(record) {
    if (!client || !record) return;
    try {
      const recId = `${record.code || record.nip || record.nama.replace(/\s+/g, '_')}-${record.tanggal}`;
      const payload = {
        id: recId,
        nama: record.nama,
        nip: record.nip || '-',
        code: record.code || '',
        tanggal: record.tanggal,
        jam: record.jamMasuk || record.jam || '',
        status: record.status || 'Hadir',
        metode: record.metode || 'Scan QR',
        created_at: new Date().toISOString()
      };

      const { error } = await client.from('presensi_guru').upsert(payload);
      if (error) safeWarn('[Supabase] Gagal upload presensi guru:', error.message);
      else safeLog(`[Supabase] ✅ Presensi guru ${record.nama} tersinkron.`);
    } catch (err) {
      safeWarn('[Supabase] Upload teacher error:', err);
    }
  }

  // 4. Download & Merge Teacher Attendance
  async function downloadAndMergeTeacherPresence() {
    if (!client || !window.db) return 0;
    try {
      const { data, error } = await client.from('presensi_guru').select('*');
      if (error) throw error;
      if (!data || !Array.isArray(data)) return 0;

      window.db.absenGuru = window.db.absenGuru || [];
      let added = 0;

      data.forEach(c => {
        const existing = window.db.absenGuru.find(a =>
          a.tanggal === c.tanggal &&
          a.nama.toLowerCase().trim() === c.nama.toLowerCase().trim()
        );
        if (!existing) {
          window.db.absenGuru.push({
            id: c.id,
            nama: c.nama,
            nip: c.nip,
            code: c.code,
            tanggal: c.tanggal,
            jamMasuk: c.jam,
            jamPulang: '',
            status: c.status,
            metode: c.metode
          });
          added++;
        }
      });

      // Upload local teacher attendance to cloud if missing
      for (const loc of window.db.absenGuru) {
        const locId = `${loc.code || loc.nip || loc.nama.replace(/\s+/g, '_')}-${loc.tanggal}`;
        const hasOnCloud = data.some(c => c.id === locId);
        if (!hasOnCloud) {
          await uploadTeacherPresence(loc);
        }
      }

      if (added > 0 && typeof window.saveDB === 'function') {
        window.saveDB();
        if (typeof window.renderTeacherRekap === 'function') {
          try { window.renderTeacherRekap(); } catch(_) {}
        }
        if (typeof window.updateTeacherStats === 'function') {
          try { window.updateTeacherStats(); } catch(_) {}
        }
      }

      return data.length;
    } catch (err) {
      safeWarn('[Supabase] Gagal download presensi guru:', err.message);
      return 0;
    }
  }

  // 5. Upload Face Biometric Data
  async function uploadFaceBiometric(key, nama, features, photo) {
    if (!client || !nama) return;
    try {
      const studentKey = `${key}-${nama}`;
      const payload = {
        student_key: studentKey,
        nama: nama,
        kelas: key.replace('-', ' '),
        features: features || [],
        photo: photo || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await client.from('biometrik_wajah').upsert(payload);
      if (error) safeWarn('[Supabase] Gagal upload wajah biometrik:', error.message);
      else safeLog(`[Supabase] ✅ Data wajah ${nama} tersinkron ke cloud.`);
    } catch (err) {
      safeWarn('[Supabase] Upload face error:', err);
    }
  }

  // 6. Download Face Biometrics
  async function downloadFaceBiometrics() {
    if (!client || !window.db) return 0;
    try {
      const { data, error } = await client.from('biometrik_wajah').select('*');
      if (error) throw error;
      if (!data || !Array.isArray(data)) return 0;

      window.db.faces = window.db.faces || {};
      let added = 0;

      data.forEach(c => {
        if (!window.db.faces[c.student_key]) {
          window.db.faces[c.student_key] = {
            features: c.features,
            photo: c.photo
          };
          added++;
        }
      });

      if (added > 0 && typeof window.saveDB === 'function') {
        window.saveDB();
        if (typeof window.updateFaceStats === 'function') {
          try { window.updateFaceStats(); } catch(_) {}
        }
      }

      return data.length;
    } catch (err) {
      safeWarn('[Supabase] Gagal download biometrik wajah:', err.message);
      return 0;
    }
  }

  // 7. Full Bidirectional Sync
  async function syncAll() {
    if (isSyncing) return;
    isSyncing = true;
    updateBadgeUI('syncing');

    try {
      const sessionCount = await downloadAndMergeSessions();
      const teacherCount = await downloadAndMergeTeacherPresence();
      await downloadFaceBiometrics();

      isOnline = true;
      updateBadgeUI('connected', `Cloud: ${sessionCount} Sesi Sync`);
      safeLog(`[Supabase] ✅ Sinkronisasi selesai: ${sessionCount} sesi siswa, ${teacherCount} presensi guru.`);
    } catch (err) {
      isOnline = false;
      updateBadgeUI('error');
      safeWarn('[Supabase] Sync error:', err);
    } finally {
      isSyncing = false;
    }
  }

  // 8. Setup Realtime Listener
  function setupRealtime() {
    if (!client) return;
    try {
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
      }

      realtimeChannel = client
        .channel('school-attendance-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_siswa' }, payload => {
          safeLog('[Supabase Realtime] Perubahan absensi siswa diterima:', payload);
          downloadAndMergeSessions();
          if (typeof window.showToast === 'function') {
            window.showToast('☁️ Data absensi kelas baru saja diperbarui di Cloud.', 'ok');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, payload => {
          safeLog('[Supabase Realtime] Perubahan presensi guru diterima:', payload);
          downloadAndMergeTeacherPresence();
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            safeLog('[Supabase Realtime] 🟢 Realtime sync aktif.');
          }
        });
    } catch (err) {
      safeWarn('[Supabase Realtime] Error setup:', err);
    }
  }

  // Manual Trigger
  async function manualSync() {
    if (typeof window.showToast === 'function') {
      window.showToast('🔄 Menghubungkan ke Cloud Supabase...', 'ok');
    }
    await syncAll();
    if (typeof window.showToast === 'function') {
      window.showToast('✅ Sinkronisasi Cloud Supabase Selesai!', 'ok');
    }
  }

  // Bootstrap
  async function bootstrap() {
    initClient();
    if (client) {
      await syncAll();
      setupRealtime();
    }
  }

  // Expose API to window
  window.SupabaseSync = {
    init: bootstrap,
    manualSync: manualSync,
    uploadSession: uploadSession,
    uploadTeacherPresence: uploadTeacherPresence,
    uploadFaceBiometric: uploadFaceBiometric,
    syncAll: syncAll
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    setTimeout(bootstrap, 100);
  }
})();
