/**
 * bell.js – Sistem Bel Sekolah & Pengumuman Suara Otomatis
 * SMK NEGERI 10 KOLAKA
 * 
 * Didukung oleh Microsoft Edge Neural Text-to-Speech (edge-tts):
 * - Suara Alami Berstandar Studio: id-ID-GadisNeural & id-ID-ArdiNeural
 * - Audio Pre-rendered untuk Seluruh 24 Guru dan Agenda Sekolah
 * - Dynamic On-Demand Synthesis melalui endpoint tts.php
 * - Fallback Otomatis ke Web Speech API jika offline/tanpa server
 * 
 * Fitur:
 * 1. Bel Tanda Masuk Kelas (Umum & Khusus Guru yang Sedang Login)
 * 2. Bel Selesai Jam Mengajar (Ucapan terima kasih & pergantian kelas)
 * 3. Suara Khusus Jam Pertama, Kedua/Lanjutan, Istirahat, Sholat Dhuhur/Jumat, Jam Pulang
 * 4. Pukul 10.00 WITA: Lagu Kebangsaan Indonesia Raya Otomatis & Himbauan Sikap Sempurna
 * 5. Sintesis Bel Westminster (Web Audio API)
 * 6. Pemutar Audio Lagu Kebangsaan dengan Visualizer & Banner Khidmat
 */

(function(window) {
  'use strict';

  // Daftar guru perempuan untuk penentuan sapaan "Ibu" (sisanya "Bapak")
  const FEMALE_TEACHERS = [
    'NURSAKTI', 'SUCIATI', 'HASRAWATI', 'ISNAWATI', 'MUSTIKA',
    'YUSNIATI', 'NURFADILLAH', 'SAHRIANI', 'NUR FAJRIANI',
    'JUMAISAH', 'RISNA PITRA NATASYAH'
  ];

  // Inisialisasi AudioContext aman (Web Audio API)
  let _audioCtx = null;
  function getAudioContext() {
    if (!_audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        _audioCtx = new AudioCtx();
      }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  }

  // Objek Inti SchoolBell
  const SchoolBell = {
    enabled: true,
    volume: 0.9,
    speechRate: 0.94,
    lastTriggeredKey: '',
    isPlayingAudio: false,
    timerId: null,
    audioElement: null,
    currentTtsAudio: null,
    ttsProvider: 'edge-tts', // 'edge-tts' atau 'webspeech'
    edgeVoice: 'id-ID-GadisNeural', // 'id-ID-GadisNeural' atau 'id-ID-ArdiNeural'

    // Inisialisasi Sistem Bel
    init: function() {
      // Muat preferensi dari localStorage
      try {
        const savedEnabled = localStorage.getItem('smkn10_bell_enabled');
        if (savedEnabled !== null) {
          this.enabled = savedEnabled === 'true';
        }
        const savedVol = localStorage.getItem('smkn10_bell_volume');
        if (savedVol !== null) {
          this.volume = parseFloat(savedVol) || 0.9;
        }
        const savedProvider = localStorage.getItem('smkn10_tts_provider');
        if (savedProvider) {
          this.ttsProvider = savedProvider;
        }
        const savedVoice = localStorage.getItem('smkn10_edge_voice');
        if (savedVoice) {
          this.edgeVoice = savedVoice;
        }
      } catch (_) {}

      // Siapkan audio element untuk Indonesia Raya
      this.initAnthemAudio();

      // Buka kunci AudioContext pada interaksi pertama pengguna
      const unlockAudio = () => {
        getAudioContext();
        if (window.speechSynthesis) {
          try {
            window.speechSynthesis.getVoices();
          } catch (_) {}
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      };
      document.addEventListener('click', unlockAudio, { passive: true });
      document.addEventListener('keydown', unlockAudio, { passive: true });
      document.addEventListener('touchstart', unlockAudio, { passive: true });

      // Mulai ticker per detik
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        this.tick();
      }, 1000);

      // Perbarui UI bel
      this.updateUI();

      console.log('🔔 Sistem Bel & Edge-TTS SMKN 10 Kolaka aktif (Suara:', this.edgeVoice, ').');
    },

    // Inisialisasi elemen audio Indonesia Raya
    initAnthemAudio: function() {
      if (!this.audioElement) {
        let el = document.getElementById('audio-indonesia-raya');
        if (!el) {
          el = document.createElement('audio');
          el.id = 'audio-indonesia-raya';
          el.preload = 'auto';
          el.src = 'audio/indonesia_raya.ogg';
          document.body.appendChild(el);
        }
        this.audioElement = el;

        el.addEventListener('ended', () => {
          this.onAnthemFinished();
        });
        el.addEventListener('error', (e) => {
          console.warn('Audio Indonesia Raya gagal dimuat, menggunakan mode sintesis cadangan:', e);
          this.onAnthemFallback();
        });
        el.addEventListener('timeupdate', () => {
          this.updateAnthemProgress();
        });
      }
    },

    // Mengambil sapaan yang santun (Bapak/Ibu)
    getHonorific: function(teacherName) {
      if (!teacherName) return 'Bapak/Ibu Guru';
      const upper = teacherName.toUpperCase();
      for (let i = 0; i < FEMALE_TEACHERS.length; i++) {
        if (upper.includes(FEMALE_TEACHERS[i])) {
          return 'Ibu ' + teacherName;
        }
      }
      return 'Bapak ' + teacherName;
    },

    // Format teks agar diucapkan dengan sangat jelas oleh TTS Bahasa Indonesia
    cleanSpokenText: function(text) {
      if (!text) return '';
      return text
        .replace(/S\.Pd\.?/gi, 'Sarjana Pendidikan')
        .replace(/S\.Pdi\.?/gi, 'Sarjana Pendidikan Islam')
        .replace(/S\.Kom\.?/gi, 'Sarjana Komputer')
        .replace(/S\.Ag\.?/gi, 'Sarjana Agama')
        .replace(/S\.Sos\.?/gi, 'Sarjana Sosial')
        .replace(/S\.Si\.?/gi, 'Sarjana Sains')
        .replace(/S\.AP\.?/gi, 'Sarjana Administrasi Publik')
        .replace(/S\.T\.?/gi, 'Sarjana Teknik')
        .replace(/M\.Pd\.?/gi, 'Magister Pendidikan')
        .replace(/\bX\b/g, 'Sepuluh')
        .replace(/\bXI\b/g, 'Sebelas')
        .replace(/\bXII\b/g, 'Dua Belas')
        .replace(/\bMPLB\b/g, 'M P L B')
        .replace(/\bTKJ\b/g, 'T K J')
        .replace(/\bGP\b/g, 'Geologi Pertambangan')
        .replace(/\bKBM\b/gi, 'kegiatan belajar mengajar')
        .replace(/\bWITA\b/gi, 'Wita')
        .replace(/\bSMKN\b/gi, 'SMK Negeri')
        .replace(/\bSMK\b/gi, 'S M K');
    },

    // ─────────────────────────────────────────────────────────
    // SINTESIS BEL SEKOLAH (Web Audio API - Westminster Melodious Chime)
    // ─────────────────────────────────────────────────────────
    playChime: function(onComplete) {
      const ctx = getAudioContext();
      if (!ctx) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      // Frekuensi 4 Nada Westminster Chime
      const notes = [
        { freq: 415.30, duration: 0.65 }, // G#4
        { freq: 369.99, duration: 0.65 }, // F#4
        { freq: 329.63, duration: 0.65 }, // E4
        { freq: 246.94, duration: 1.10 }  // B3 (panjang di akhir)
      ];

      const now = ctx.currentTime;
      let timeOffset = 0.05;
      const masterVol = Math.max(0.1, Math.min(1.0, this.volume));

      notes.forEach((n) => {
        const noteStart = now + timeOffset;
        
        // 1. Nada Fundamental
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(n.freq, noteStart);

        // 2. Harmonik 1 (Oktaf)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(n.freq * 2, noteStart);

        // 3. Harmonik 2 (Metalic Bell Overtone 3.01x)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(n.freq * 3.01, noteStart);

        // Envelope Gain (Attack cepat, Decay hangat alami)
        gain1.gain.setValueAtTime(0.0001, noteStart);
        gain1.gain.linearRampToValueAtTime(0.65 * masterVol, noteStart + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.0001, noteStart + n.duration);

        gain2.gain.setValueAtTime(0.0001, noteStart);
        gain2.gain.linearRampToValueAtTime(0.28 * masterVol, noteStart + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.0001, noteStart + n.duration * 0.75);

        gain3.gain.setValueAtTime(0.0001, noteStart);
        gain3.gain.linearRampToValueAtTime(0.15 * masterVol, noteStart + 0.015);
        gain3.gain.exponentialRampToValueAtTime(0.0001, noteStart + n.duration * 0.5);

        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);

        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);
        gain3.connect(ctx.destination);

        osc1.start(noteStart);
        osc2.start(noteStart);
        osc3.start(noteStart);

        osc1.stop(noteStart + n.duration);
        osc2.stop(noteStart + n.duration);
        osc3.stop(noteStart + n.duration);

        timeOffset += 0.52;
      });

      const totalTimeMs = (timeOffset + 0.8) * 1000;
      setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, totalTimeMs);
    },

    // ─────────────────────────────────────────────────────────
    // PENGUMUMAN SUARA (Edge-TTS Neural Voice + Web Speech Fallback)
    // ─────────────────────────────────────────────────────────
    speak: function(text, onComplete, slug) {
      if (!this.enabled) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      this.showAnnouncementBanner(text);

      if (this.ttsProvider === 'edge-tts') {
        this.speakWithEdgeTTS(text, onComplete, slug);
      } else {
        this.speakWithWebSpeech(text, onComplete);
      }
    },

    // Pemutaran Suara Microsoft Edge Neural TTS
    speakWithEdgeTTS: function(text, onComplete, slug) {
      // Hentikan audio TTS sebelumnya jika sedang bermain
      if (this.currentTtsAudio) {
        try {
          this.currentTtsAudio.pause();
          this.currentTtsAudio.currentTime = 0;
        } catch (_) {}
        this.currentTtsAudio = null;
      }

      let audioUrl = null;

      // 1. Cek berkas pra-render langsung
      if (slug) {
        if (slug.startsWith('guru_')) {
          const fn = slug.replace('guru_', '');
          audioUrl = `audio/tts/guru/${fn}.mp3`;
        } else {
          audioUrl = `audio/tts/core/${slug}.mp3`;
        }
      }

      // 2. Jika tidak ada file statis, gunakan endpoint dynamic tts.php
      if (!audioUrl) {
        const cleanText = encodeURIComponent(this.cleanSpokenText(text));
        audioUrl = `tts.php?text=${cleanText}&voice=${this.edgeVoice || 'id-ID-GadisNeural'}`;
      }

      try {
        const audio = new Audio();
        audio.src = audioUrl;
        audio.volume = Math.max(0.1, Math.min(1.0, this.volume));
        this.currentTtsAudio = audio;

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          this.currentTtsAudio = null;
          if (typeof onComplete === 'function') onComplete();
        };

        audio.addEventListener('ended', finish);

        audio.addEventListener('error', (err) => {
          console.warn('Edge-TTS gagal memuat (' + audioUrl + '), beralih ke Web Speech API cadangan:', err);
          this.speakWithWebSpeech(text, onComplete);
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Autoplay Edge-TTS terblokir browser, beralih ke Web Speech API:', err);
            this.speakWithWebSpeech(text, onComplete);
          });
        }
      } catch (err) {
        console.warn('Inisialisasi Edge-TTS gagal, beralih ke Web Speech API:', err);
        this.speakWithWebSpeech(text, onComplete);
      }
    },

    // Fallback Web Speech API (Suara Browser Lokal)
    speakWithWebSpeech: function(text, onComplete) {
      if (!('speechSynthesis' in window)) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      window.speechSynthesis.cancel();

      const spokenClean = this.cleanSpokenText(text);
      const utterance = new SpeechSynthesisUtterance(spokenClean);
      utterance.lang = 'id-ID';
      utterance.rate = this.speechRate || 0.94;
      utterance.pitch = 1.05;
      utterance.volume = Math.max(0.1, Math.min(1.0, this.volume));

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().includes('indonesia'))) ||
        (v.name && (v.name.toLowerCase().includes('indonesia') || v.name.toLowerCase().includes('gadis') || v.name.toLowerCase().includes('ardi')))
      );
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onend = () => {
        if (typeof onComplete === 'function') onComplete();
      };
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (typeof onComplete === 'function') onComplete();
      };

      window.speechSynthesis.speak(utterance);
    },

    // Putar Bel Nada + Pengumuman Suara
    playBellAnnouncement: function(text, onComplete, slug) {
      if (!this.enabled) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      this.playChime(() => {
        this.speak(text, onComplete, slug);
      });
    },

    // Banner visual running announcement di atas layar
    showAnnouncementBanner: function(text) {
      let banner = document.getElementById('bell-announcement-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'bell-announcement-banner';
        banner.className = 'bell-announcement-banner';
        document.body.appendChild(banner);
      }
      const providerBadge = this.ttsProvider === 'edge-tts' ? '⚡ Edge Neural TTS' : 'Web Speech';
      banner.innerHTML = `
        <div class="announcement-content">
          <span class="announcement-bell-icon">🔔</span>
          <div class="announcement-text-wrap">
            <span class="announcement-badge">PENGUMUMAN BEL SEKOLAH • ${providerBadge}</span>
            <p class="announcement-body">${text}</p>
          </div>
          <button class="announcement-close-btn" onclick="SchoolBell.stopSound()" title="Tutup">✕</button>
        </div>
      `;
      banner.classList.add('show');

      // Hilangkan otomatis setelah 12 detik
      clearTimeout(banner._hideTimer);
      banner._hideTimer = setTimeout(() => {
        banner.classList.remove('show');
      }, 12000);
    },

    // ─────────────────────────────────────────────────────────
    // LAGU KEBANGSAAN INDONESIA RAYA (PUKUL 10.00 WITA)
    // ─────────────────────────────────────────────────────────
    playIndonesiaRaya: function(isManualTest) {
      if (!this.enabled && !isManualTest) return;

      this.initAnthemAudio();
      this.isPlayingAudio = true;

      // 1. Buka Modal Khidmat Indonesia Raya
      const modal = document.getElementById('modal-indonesia-raya');
      if (modal) {
        modal.style.display = 'flex';
      }

      // 2. Narasi Pembuka Sikap Sempurna
      const introText = "Mohon perhatian kepada seluruh warga SMK Negeri 10 Kolaka. Pukul 10.00 telah tiba. Marilah kita menghentikan sejenak seluruh kegiatan belajar mengajar untuk bersama-sama mendengarkan dan menghormati Lagu Kebangsaan Indonesia Raya. Sikap sempurna.";

      this.playChime(() => {
        this.speak(introText, () => {
          // 3. Putar Musik Lagu Kebangsaan Indonesia Raya
          if (this.audioElement) {
            this.audioElement.currentTime = 0;
            this.audioElement.volume = Math.max(0.1, Math.min(1.0, this.volume));
            const playPromise = this.audioElement.play();
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                console.warn('Autoplay audio dicegah, menggunakan sintesis suara:', err);
                this.onAnthemFallback();
              });
            }
          } else {
            this.onAnthemFallback();
          }
        }, 'indonesia_raya_intro');
      });
    },

    // Fallback jika file audio lagu kebangsaan tidak dapat diputar
    onAnthemFallback: function() {
      const ctx = getAudioContext();
      if (ctx) {
        const anthemNotes = [
          { f: 392.00, d: 0.5 }, { f: 440.00, d: 0.5 }, { f: 392.00, d: 0.7 },
          { f: 329.63, d: 0.5 }, { f: 392.00, d: 1.0 }
        ];
        let off = 0.1;
        anthemNotes.forEach(n => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, ctx.currentTime + off);
          g.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime + off);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + off + n.d);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime + off);
          osc.stop(ctx.currentTime + off + n.d);
          off += n.d * 0.9;
        });
      }

      setTimeout(() => {
        this.onAnthemFinished();
      }, 5000);
    },

    // Dipanggil saat Lagu Kebangsaan Selesai
    onAnthemFinished: function() {
      this.isPlayingAudio = false;

      // Suara Penutup Lagu Kebangsaan
      const outroText = "Terima kasih. Lagu Kebangsaan Indonesia Raya telah selesai. Seluruh kegiatan belajar mengajar dapat dilanjutkan kembali. Tetap semangat!";
      this.speak(outroText, () => {
        setTimeout(() => {
          const modal = document.getElementById('modal-indonesia-raya');
          if (modal) modal.style.display = 'none';
        }, 1500);
      }, 'indonesia_raya_outro');
    },

    // Update progress bar modal Indonesia Raya
    updateAnthemProgress: function() {
      if (!this.audioElement) return;
      const cur = this.audioElement.currentTime || 0;
      const dur = this.audioElement.duration || 105; // ~1:45
      const pct = Math.min(100, (cur / dur) * 100);

      const bar = document.getElementById('anthem-progress-bar');
      const timeLbl = document.getElementById('anthem-time-lbl');
      if (bar) bar.style.width = pct + '%';
      if (timeLbl) {
        const curM = Math.floor(cur / 60);
        const curS = Math.floor(cur % 60).toString().padStart(2, '0');
        const durM = Math.floor(dur / 60);
        const durS = Math.floor(dur % 60).toString().padStart(2, '0');
        timeLbl.textContent = `${curM}:${curS} / ${durM}:${durS}`;
      }
    },

    // ─────────────────────────────────────────────────────────
    // JADWAL & DETEKSI GURU YANG SEDANG LOGIN
    // ─────────────────────────────────────────────────────────
    getActiveTeacherTeaching: function(dayName, jamNumber) {
      const guru = window.db?.guru;
      if (!guru || !guru.code) return null;

      const sk = window.SMKN10_SK_DATA;
      if (!sk || !sk.roster) return null;

      const teacherCode = String(guru.code).trim().padStart(2, '0');
      const slot = sk.roster.find(r => r.day === dayName && Number(r.jam) === Number(jamNumber));
      if (!slot || !slot.classes) return null;

      const matched = [];
      for (const [className, val] of Object.entries(slot.classes)) {
        if (!val) continue;
        const codePart = String(val).split('-')[0].trim().padStart(2, '0');
        if (codePart === teacherCode) {
          const subjCode = String(val).split('-')[1]?.trim() || '';
          const subjName = sk.subjects?.[subjCode]?.name || guru.mapel || 'Mata Pelajaran';
          matched.push({
            className: className,
            subjectCode: subjCode,
            subjectName: subjName,
            raw: val
          });
        }
      }

      if (matched.length > 0) {
        return {
          teacher: guru,
          code: teacherCode,
          jam: jamNumber,
          time: slot.time,
          classes: matched
        };
      }
      return null;
    },

    // Cek jadwal hari ini untuk guru yang login
    getTeacherTodaySchedule: function() {
      const guru = window.db?.guru;
      if (!guru || !guru.code) return [];

      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const todayDay = days[new Date().getDay()];
      const sk = window.SMKN10_SK_DATA;
      if (!sk || !sk.roster) return [];

      const teacherCode = String(guru.code).trim().padStart(2, '0');
      const todaySlots = sk.roster.filter(r => r.day === todayDay);
      const results = [];

      todaySlots.forEach(s => {
        if (!s.classes) return;
        for (const [cls, val] of Object.entries(s.classes)) {
          if (!val) continue;
          const codePart = String(val).split('-')[0].trim().padStart(2, '0');
          if (codePart === teacherCode) {
            const subjCode = String(val).split('-')[1]?.trim() || '';
            const subjName = sk.subjects?.[subjCode]?.name || guru.mapel || 'Mata Pelajaran';
            results.push({
              jam: s.jam,
              time: s.time,
              className: cls,
              subjectName: subjName
            });
          }
        }
      });
      return results;
    },

    // ─────────────────────────────────────────────────────────
    // TICKER PENGECEKAN JADWAL REAL-TIME (SETIAP DETIK)
    // ─────────────────────────────────────────────────────────
    tick: function() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const dayIdx = now.getDay();

      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // Update badge jadwal di dashboard jika ada
      this.updateDashboardWidget(timeStr, dayIdx);

      // Hanya trigger bel pada detik ke-00 (tepat menit berganti)
      if (s !== 0) return;

      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const dayName = days[dayIdx];

      // Sekolah libur pada hari Minggu
      if (dayIdx === 0) return;

      const triggerKey = `${dayName}_${timeStr}`;
      if (this.lastTriggeredKey === triggerKey) return;
      this.lastTriggeredKey = triggerKey;

      // 1. PUKUL 10.00: LAGU KEBANGSAAN INDONESIA RAYA
      if (timeStr === '10:00') {
        this.playIndonesiaRaya(false);
        return;
      }

      // 2. CEK JADWAL BERDASARKAN HARI & WAKTU ROSTER SMKN 10 KOLAKA
      this.handleScheduleTrigger(dayName, timeStr);
    },

    // Penanganan Event Jadwal Tertentu
    handleScheduleTrigger: function(dayName, timeStr) {
      const loggedTeacher = window.db?.guru;
      const honorific = loggedTeacher ? this.getHonorific(loggedTeacher.nama) : null;
      const teacherCode = loggedTeacher?.code ? String(loggedTeacher.code).trim().padStart(2, '0') : null;

      // A. WAKTU 07.00: Upacara Bendera (Senin) / Apel Pagi
      if (timeStr === '07:00') {
        if (dayName === 'SENIN') {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda persiapan upacara bendera hari Senin telah berbunyi. Kepada seluruh siswa-siswi dan Bapak Ibu Guru, dipersilakan menuju lapangan upacara dengan tertib. Terima kasih.",
            null,
            'upacara_senin'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda kegiatan apel pagi dan literasi telah berbunyi. Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat memulai aktivitas pagi ini dengan penuh semangat.",
            null,
            'apel_pagi'
          );
        }
        return;
      }

      // B. WAKTU 07.30: Masuk Jam Pelajaran Pertama KBM
      if (timeStr === '07:30') {
        const teaching = this.getActiveTeacherTeaching(dayName, 2);
        if (teaching) {
          const clsNames = teaching.classes.map(c => c.className).join(' dan ');
          const subjNames = teaching.classes.map(c => c.subjectName).join(', ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda masuk jam pelajaran pertama telah berbunyi. Kepada ${honorific}, selamat memasuki kelas ${clsNames} untuk mata pelajaran ${subjNames}. Selamat memulai kegiatan belajar mengajar dengan penuh semangat. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'jam_pertama'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk jam pelajaran pertama telah berbunyi. Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar hari ini dengan penuh semangat. Terima kasih.",
            null,
            'jam_pertama'
          );
        }
        return;
      }

      // C. WAKTU 08.15: Masuk Jam Pelajaran Ke-3 (Jam ke-2 KBM)
      if (timeStr === '08:15') {
        const prevTeaching = this.getActiveTeacherTeaching(dayName, 2);
        const nextTeaching = this.getActiveTeacherTeaching(dayName, 3);

        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          const subjNames = nextTeaching.classes.map(c => c.subjectName).join(', ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel pergantian jam pelajaran telah berbunyi. Kepada ${honorific}, jadwal mengajar Anda selanjutnya adalah di kelas ${clsNames} mata pelajaran ${subjNames}. Selamat mengajar. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'pergantian_jam'
          );
        } else if (prevTeaching && !nextTeaching) {
          const clsNames = prevTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, jam pelajaran telah selesai. Kepada ${honorific}, terima kasih atas dedikasi dan bimbingannya di kelas ${clsNames}. Selamat beristirahat sejenak.`,
            null,
            teacherCode ? `guru_selesai_${teacherCode}` : 'pergantian_jam'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel pergantian jam pelajaran telah berbunyi. Kepada Bapak dan Ibu Guru pengajar jam berikutnya, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
            null,
            'pergantian_jam'
          );
        }
        return;
      }

      // D. WAKTU 09.00: Masuk Jam Pelajaran Ke-4
      if (timeStr === '09:00') {
        const prevTeaching = this.getActiveTeacherTeaching(dayName, 3);
        const nextTeaching = this.getActiveTeacherTeaching(dayName, 4);

        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          const subjNames = nextTeaching.classes.map(c => c.subjectName).join(', ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda masuk jam pelajaran berikutnya telah berbunyi. Kepada ${honorific}, selamat melanjutkan mengajar di kelas ${clsNames} untuk mata pelajaran ${subjNames}. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'pergantian_jam'
          );
        } else if (prevTeaching && !nextTeaching) {
          const clsNames = prevTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, jam pelajaran telah berakhir. Kepada ${honorific}, terima kasih atas dedikasi dan bimbingan Anda di kelas ${clsNames}.`,
            null,
            teacherCode ? `guru_selesai_${teacherCode}` : 'pergantian_jam'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk jam pelajaran berikutnya telah berbunyi. Kepada Bapak dan Ibu Guru, selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
            null,
            'pergantian_jam'
          );
        }
        return;
      }

      // E. WAKTU 09.45: ISTIRAHAT PERTAMA (Istirahat 1)
      if (timeStr === '09:45') {
        const prevTeaching = this.getActiveTeacherTeaching(dayName, 4);
        if (prevTeaching) {
          const clsNames = prevTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda waktu istirahat pertama telah berbunyi. Kepada ${honorific}, terima kasih atas pengajaran di kelas ${clsNames}. Selamat menikmati waktu istirahat bersama seluruh dewan guru.`,
            null,
            teacherCode ? `guru_selesai_${teacherCode}` : 'istirahat_1'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda waktu istirahat pertama telah berbunyi. Selamat beristirahat kepada seluruh siswa-siswi dan Bapak Ibu Guru. Tetap jaga kebersihan lingkungan sekolah dan buanglah sampah pada tempatnya. Terima kasih.",
            null,
            'istirahat_1'
          );
        }
        return;
      }

      // F. WAKTU 10.45: Masuk Jam Pelajaran Ke-7
      if (timeStr === '10:45') {
        const nextTeaching = this.getActiveTeacherTeaching(dayName, 7);
        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          const subjNames = nextTeaching.classes.map(c => c.subjectName).join(', ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada ${honorific}, jadwal Anda saat ini di kelas ${clsNames} mata pelajaran ${subjNames}. Selamat mengajar. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'masuk_umum'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
            null,
            'masuk_umum'
          );
        }
        return;
      }

      // G. WAKTU 11.30: 
      // Hari Jumat -> Persiapan Sholat Jumat (11.30 - 13.00)
      // Hari Lain -> Jam Pelajaran Ke-8 (11.30 - 12.15)
      if (timeStr === '11:30') {
        if (dayName === 'JUMAT') {
          this.playBellAnnouncement(
            "Mohon perhatian, waktu persiapan ibadah sholat Jumat telah tiba. Kepada seluruh dewan guru dan siswa muslim SMK Negeri 10 Kolaka, dipersilakan bersiap menuju masjid untuk menunaikan sholat Jumat berjamaah. Selamat beristirahat.",
            null,
            'sholat_jumat'
          );
        } else {
          const nextTeaching = this.getActiveTeacherTeaching(dayName, 8);
          if (nextTeaching) {
            const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
            this.playBellAnnouncement(
              `Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada ${honorific}, selamat mengajar di kelas ${clsNames}. Terima kasih.`,
              null,
              teacherCode ? `guru_masuk_${teacherCode}` : 'masuk_umum'
            );
          } else {
            this.playBellAnnouncement(
              "Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
              null,
              'masuk_umum'
            );
          }
        }
        return;
      }

      // H. WAKTU 12.15: SHALAT DHUHUR & ISTIRAHAT KEDUA (Senin - Kamis, Sabtu)
      if (timeStr === '12:15' && dayName !== 'JUMAT') {
        const prevTeaching = this.getActiveTeacherTeaching(dayName, 8);
        if (prevTeaching) {
          const clsNames = prevTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, waktu istirahat kedua dan sholat Dhuhur telah tiba. Kepada ${honorific}, terima kasih atas pengajaran di kelas ${clsNames}. Selamat menunaikan ibadah sholat dan menikmati waktu istirahat.`,
            null,
            teacherCode ? `guru_selesai_${teacherCode}` : 'sholat_dhuhur'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda waktu istirahat kedua dan sholat Dhuhur telah berbunyi. Kepada seluruh warga SMK Negeri 10 Kolaka, selamat menunaikan ibadah sholat Dhuhur dan selamat menikmati waktu istirahat. Terima kasih.",
            null,
            'sholat_dhuhur'
          );
        }
        return;
      }

      // I. WAKTU 12.45 (Senin-Kamis/Sabtu) atau 13.00 (Jumat): Masuk Sesi Siang
      if ((timeStr === '12:45' && dayName !== 'JUMAT') || (timeStr === '13:00' && dayName === 'JUMAT')) {
        const jamTarget = dayName === 'JUMAT' ? 9 : 10;
        const nextTeaching = this.getActiveTeacherTeaching(dayName, jamTarget);

        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          const subjNames = nextTeaching.classes.map(c => c.subjectName).join(', ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda masuk kelas sesi siang telah berbunyi. Kepada ${honorific}, selamat memasuki kelas ${clsNames} mata pelajaran ${subjNames}. Selamat melanjutkan kegiatan belajar mengajar. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'masuk_umum'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk kelas sesi siang telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
            null,
            'masuk_umum'
          );
        }
        return;
      }

      // J. WAKTU 13.30: Masuk Jam Pelajaran Ke-11 (Senin-Kamis, Sabtu)
      if (timeStr === '13:30' && dayName !== 'JUMAT') {
        const nextTeaching = this.getActiveTeacherTeaching(dayName, 11);
        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda pergantian jam telah berbunyi. Kepada ${honorific}, jadwal mengajar Anda di kelas ${clsNames}. Selamat mengajar.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'pergantian_jam'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih.",
            null,
            'pergantian_jam'
          );
        }
        return;
      }

      // K. WAKTU 14.15: Masuk Jam Pelajaran Terakhir (Jam ke-12)
      if (timeStr === '14:15' && dayName !== 'JUMAT') {
        const nextTeaching = this.getActiveTeacherTeaching(dayName, 12);
        if (nextTeaching) {
          const clsNames = nextTeaching.classes.map(c => c.className).join(' dan ');
          this.playBellAnnouncement(
            `Mohon perhatian, bel tanda masuk jam pelajaran terakhir telah berbunyi. Kepada ${honorific}, selamat mengajar di kelas ${clsNames}. Terima kasih.`,
            null,
            teacherCode ? `guru_masuk_${teacherCode}` : 'pergantian_jam'
          );
        } else {
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk jam pelajaran terakhir telah berbunyi. Kepada Bapak dan Ibu Guru, selamat menyelesaikan kegiatan belajar mengajar hari ini. Terima kasih.",
            null,
            'pergantian_jam'
          );
        }
        return;
      }

      // L. WAKTU 15.00 (atau 14.45 Jumat): JAM PULANG SEKOLAH (SELESAI KBM)
      if (timeStr === '15:00' || (timeStr === '14:45' && dayName === 'JUMAT')) {
        this.playBellAnnouncement(
          "Mohon perhatian, bel tanda berakhirnya seluruh kegiatan belajar mengajar hari ini telah berbunyi. Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat kembali ke rumah masing-masing. Hati-hati di jalan dan sampai jumpa esok hari. Terima kasih.",
          null,
          'pulang'
        );
        return;
      }
    },

    // ─────────────────────────────────────────────────────────
    // FUNGSI UJI COBA SUARA & PENGUMUMAN MANUAL
    // ─────────────────────────────────────────────────────────
    testBell: function(type) {
      getAudioContext();
      const guru = window.db?.guru;
      const honorific = guru ? this.getHonorific(guru.nama) : 'Bapak dan Ibu Guru';
      const teacherCode = guru?.code ? String(guru.code).trim().padStart(2, '0') : null;

      switch (type) {
        case 'masuk':
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar. Terima kasih.",
            null,
            'masuk_umum'
          );
          break;

        case 'guru':
          if (guru && guru.nama) {
            const todaySch = this.getTeacherTodaySchedule();
            const firstSlot = todaySch[0];
            const cls = firstSlot ? firstSlot.className : 'X TKJ';
            const mapel = firstSlot ? firstSlot.subjectName : (guru.mapel || 'Informatika');
            this.playBellAnnouncement(
              `Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada ${honorific}, saat ini adalah jadwal mengajar Anda di kelas ${cls} untuk mata pelajaran ${mapel}. Selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar. Terima kasih.`,
              null,
              teacherCode ? `guru_masuk_${teacherCode}` : 'masuk_umum'
            );
          } else {
            this.playBellAnnouncement(
              "Mohon perhatian, bel tanda masuk kelas telah berbunyi. Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar. Terima kasih.",
              null,
              'masuk_umum'
            );
          }
          break;

        case 'selesai_guru':
          if (guru && guru.nama) {
            const todaySch = this.getTeacherTodaySchedule();
            const firstSlot = todaySch[0];
            const cls = firstSlot ? firstSlot.className : 'X TKJ';
            this.playBellAnnouncement(
              `Mohon perhatian, jam pelajaran telah berakhir. Kepada ${honorific}, terima kasih atas dedikasi dan bimbingan Anda di kelas ${cls}. Selamat beristirahat sejenak atau melanjutkan kegiatan berikutnya. Terima kasih.`,
              null,
              teacherCode ? `guru_selesai_${teacherCode}` : 'pergantian_jam'
            );
          } else {
            this.playBellAnnouncement(
              "Mohon perhatian, jam pelajaran telah berakhir. Kepada Bapak dan Ibu Guru pada jam berikutnya, dipersilakan mempersiapkan diri untuk memasuki ruang kelas. Terima kasih.",
              null,
              'pergantian_jam'
            );
          }
          break;

        case 'indonesia_raya':
          this.playIndonesiaRaya(true);
          break;

        case 'istirahat':
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda waktu istirahat pertama telah berbunyi. Selamat beristirahat kepada seluruh siswa-siswi dan Bapak Ibu Guru. Tetap jaga kebersihan lingkungan sekolah dan buanglah sampah pada tempatnya. Terima kasih.",
            null,
            'istirahat_1'
          );
          break;

        case 'sholat':
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda waktu istirahat kedua dan sholat Dhuhur telah berbunyi. Kepada seluruh warga SMK Negeri 10 Kolaka, selamat menunaikan ibadah sholat Dhuhur dan selamat menikmati waktu istirahat. Terima kasih.",
            null,
            'sholat_dhuhur'
          );
          break;

        case 'pulang':
          this.playBellAnnouncement(
            "Mohon perhatian, bel tanda berakhirnya seluruh kegiatan belajar mengajar hari ini telah berbunyi. Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat kembali ke rumah masing-masing. Hati-hati di jalan dan sampai jumpa esok hari. Terima kasih.",
            null,
            'pulang'
          );
          break;

        default:
          this.playChime();
          break;
      }
    },

    // Hentikan suara apa pun yang sedang berlangsung
    stopSound: function() {
      if (this.currentTtsAudio) {
        try {
          this.currentTtsAudio.pause();
          this.currentTtsAudio.currentTime = 0;
        } catch (_) {}
        this.currentTtsAudio = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      this.isPlayingAudio = false;

      const modal = document.getElementById('modal-indonesia-raya');
      if (modal) modal.style.display = 'none';

      const banner = document.getElementById('bell-announcement-banner');
      if (banner) banner.classList.remove('show');

      if (typeof window.showToast === 'function') {
        window.showToast('Suara bel / lagu telah dihentikan.', 'info');
      }
    },

    // Toggle Aktif / Nonaktifkan Bel
    toggleBell: function() {
      this.enabled = !this.enabled;
      try {
        localStorage.setItem('smkn10_bell_enabled', this.enabled ? 'true' : 'false');
      } catch (_) {}
      this.updateUI();

      if (typeof window.showToast === 'function') {
        window.showToast(
          this.enabled ? '🔔 Bel Sekolah Otomatis DIAKTIFKAN.' : '🔕 Bel Sekolah Otomatis DINONAKTIFKAN.',
          this.enabled ? 'ok' : 'info'
        );
      }
    },

    // Atur Volume Suara
    setVolume: function(val) {
      this.volume = Math.max(0.1, Math.min(1.0, parseFloat(val) || 0.9));
      try {
        localStorage.setItem('smkn10_bell_volume', this.volume);
      } catch (_) {}
      if (this.audioElement) {
        this.audioElement.volume = this.volume;
      }
      if (this.currentTtsAudio) {
        this.currentTtsAudio.volume = this.volume;
      }
      this.updateUI();
    },

    // Atur Provider Suara (edge-tts vs webspeech)
    setProvider: function(prov) {
      this.ttsProvider = prov;
      try {
        localStorage.setItem('smkn10_tts_provider', prov);
      } catch (_) {}
      if (typeof window.showToast === 'function') {
        window.showToast(`Penyedia Suara Bel diubah ke: ${prov === 'edge-tts' ? 'Microsoft Edge Neural TTS' : 'Web Speech Browser'}`, 'ok');
      }
      this.updateUI();
    },

    // Atur Karakter Suara Edge-TTS
    setVoice: function(voiceName) {
      this.edgeVoice = voiceName;
      try {
        localStorage.setItem('smkn10_edge_voice', voiceName);
      } catch (_) {}
      if (typeof window.showToast === 'function') {
        window.showToast(`Karakter Suara diubah: ${voiceName === 'id-ID-ArdiNeural' ? 'Ardi (Laki-laki)' : 'Gadis (Perempuan)'}`, 'ok');
      }
      this.updateUI();
    },

    // Buka Modal Kontrol Bel
    toggleModal: function() {
      const modal = document.getElementById('modal-bell-settings');
      if (!modal) return;
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
      } else {
        modal.style.display = 'flex';
        this.renderSchedulePreview();
      }
    },

    closeModal: function() {
      const modal = document.getElementById('modal-bell-settings');
      if (modal) modal.style.display = 'none';
    },

    // Update Status Tombol Topbar & Indikator
    updateUI: function() {
      const topbarText = document.getElementById('topbar-bell-text');
      const topbarIcon = document.getElementById('topbar-bell-icon');
      const topbarDot = document.getElementById('topbar-bell-dot');
      const topbarBtn = document.getElementById('btn-topbar-bell');

      if (topbarText) {
        topbarText.textContent = this.enabled ? 'Bel Aktif' : 'Bel Mati';
      }
      if (topbarIcon) {
        topbarIcon.textContent = this.enabled ? '🔔' : '🔕';
      }
      if (topbarDot) {
        topbarDot.className = this.enabled ? 'bell-pulse-dot active' : 'bell-pulse-dot inactive';
      }
      if (topbarBtn) {
        topbarBtn.setAttribute('title', this.enabled ? 'Bel Sekolah Aktif – Klik untuk Pengaturan' : 'Bel Sekolah Dinonaktifkan – Klik untuk Mengaktifkan');
      }

      // Slider volume di modal
      const volSlider = document.getElementById('bell-vol-slider');
      const volLbl = document.getElementById('bell-vol-lbl');
      if (volSlider) volSlider.value = Math.round(this.volume * 100);
      if (volLbl) volLbl.textContent = Math.round(this.volume * 100) + '%';

      // Toggle checkbox di modal
      const chk = document.getElementById('bell-enabled-toggle');
      if (chk) chk.checked = this.enabled;

      // Select provider & voice
      const selProv = document.getElementById('bell-provider-select');
      if (selProv) selProv.value = this.ttsProvider;
      const selVoice = document.getElementById('bell-voice-select');
      if (selVoice) selVoice.value = this.edgeVoice;
    },

    // Perbarui Widget di Dashboard
    updateDashboardWidget: function(timeStr, dayIdx) {
      const timeEl = document.getElementById('bell-widget-clock');
      const slotEl = document.getElementById('bell-widget-slot');
      const teacherSlotEl = document.getElementById('bell-widget-teacher-slot');
      if (!timeEl && !slotEl) return;

      if (timeEl) {
        timeEl.textContent = `${timeStr} WITA`;
      }

      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const dayName = days[dayIdx];

      // Tentukan sesi saat ini
      let currentSession = 'Di luar jam KBM';
      if (timeStr >= '07:00' && timeStr < '07:30') currentSession = dayName === 'SENIN' ? 'Upacara Bendera' : 'Apel Pagi & Literasi';
      else if (timeStr >= '07:30' && timeStr < '08:15') currentSession = 'Jam Pelajaran 2 (KBM Mulai)';
      else if (timeStr >= '08:15' && timeStr < '09:00') currentSession = 'Jam Pelajaran 3';
      else if (timeStr >= '09:00' && timeStr < '09:45') currentSession = 'Jam Pelajaran 4';
      else if (timeStr >= '09:45' && timeStr < '10:00') currentSession = '☕ Istirahat Pertama';
      else if (timeStr >= '10:00' && timeStr < '10:45') currentSession = '🇮🇩 Indonesia Raya & Jam 6';
      else if (timeStr >= '10:45' && timeStr < '11:30') currentSession = 'Jam Pelajaran 7';
      else if (timeStr >= '11:30' && timeStr < (dayName === 'JUMAT' ? '13:00' : '12:15')) currentSession = dayName === 'JUMAT' ? '🕌 Sholat Jumat & Istirahat' : 'Jam Pelajaran 8';
      else if (timeStr >= '12:15' && timeStr < '12:45' && dayName !== 'JUMAT') currentSession = '🕌 Sholat Dhuhur & Istirahat 2';
      else if (timeStr >= (dayName === 'JUMAT' ? '13:00' : '12:45') && timeStr < (dayName === 'JUMAT' ? '14:45' : '13:30')) currentSession = dayName === 'JUMAT' ? 'Jam Pelajaran 9' : 'Jam Pelajaran 10';
      else if (timeStr >= '13:30' && timeStr < '14:15' && dayName !== 'JUMAT') currentSession = 'Jam Pelajaran 11';
      else if (timeStr >= '14:15' && timeStr < '15:00' && dayName !== 'JUMAT') currentSession = 'Jam Pelajaran 12 (Terakhir)';
      else if (timeStr >= '15:00' || (dayName === 'JUMAT' && timeStr >= '14:45')) currentSession = '🏠 KBM Selesai (Jam Pulang)';

      if (slotEl) {
        slotEl.textContent = currentSession;
      }

      // Khusus Guru yang Login
      if (teacherSlotEl) {
        const guru = window.db?.guru;
        if (!guru || !guru.code) {
          teacherSlotEl.innerHTML = `<em>Pilih akun guru untuk melihat jadwal mengajar aktif Anda.</em>`;
        } else {
          const todaySch = this.getTeacherTodaySchedule();
          if (todaySch.length === 0) {
            teacherSlotEl.innerHTML = `🏖️ <b>${guru.nama}</b>: Tidak ada jadwal tatap muka hari ${dayName}.`;
          } else {
            const activeNow = todaySch.find(s => {
              const parts = s.time.split('-').map(x => x.trim().replace('.', ':'));
              return timeStr >= parts[0] && timeStr < parts[1];
            });
            if (activeNow) {
              teacherSlotEl.innerHTML = `🟢 <b>Jadwal Anda Sekarang:</b> Kelas <span class="badge-cls">${activeNow.className}</span> – ${activeNow.subjectName} (${activeNow.time})`;
            } else {
              teacherSlotEl.innerHTML = `📋 <b>Jadwal Anda Hari Ini (${todaySch.length} Jam):</b> ` + todaySch.map(s => `${s.className} (${s.time})`).join(', ');
            }
          }
        }
      }
    },

    // Render Jadwal Roster di Modal Pengaturan Bel
    renderSchedulePreview: function() {
      const container = document.getElementById('bell-schedule-table-wrap');
      if (!container) return;

      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const todayDay = days[new Date().getDay()];
      const activeDay = todayDay === 'MINGGU' ? 'SENIN' : todayDay;

      const sk = window.SMKN10_SK_DATA;
      const roster = sk?.roster ? sk.roster.filter(r => r.day === activeDay) : [];

      let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:12px;font-weight:700;color:var(--text-muted)">Jadwal Bel Aktif: <b>${activeDay}</b></span>
          <span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:12px;font-weight:700">⚡ Edge-TTS Neural Audio</span>
        </div>
        <table class="bell-sched-mini-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Agenda Bel & Pengumuman</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      const staticEvents = [
        { time: '07.00 - 07.30', desc: activeDay === 'SENIN' ? 'Upacara Bendera Hari Senin' : 'Apel Pagi & Literasi' },
        { time: '07.30 - 08.15', desc: 'Masuk Jam Pertama KBM (Suara Khusus Guru Login)' },
        { time: '08.15 - 09.00', desc: 'Pergantian Jam Ke-3' },
        { time: '09.00 - 09.45', desc: 'Pergantian Jam Ke-4' },
        { time: '09.45 - 10.00', desc: '☕ Istirahat Pertama' },
        { time: '10.00 - 10.45', desc: '🇮🇩 PUKUL 10.00: LAGU KEBANGSAAN INDONESIA RAYA & Jam 6' },
        { time: '10.45 - 11.30', desc: 'Pergantian Jam Ke-7' },
        { time: activeDay === 'JUMAT' ? '11.30 - 13.00' : '11.30 - 12.15', desc: activeDay === 'JUMAT' ? '🕌 Sholat Jumat & Istirahat' : 'Pergantian Jam Ke-8' },
        { time: activeDay === 'JUMAT' ? '13.00 - 14.45' : '12.15 - 12.45', desc: activeDay === 'JUMAT' ? 'Jam Pelajaran Sesi Siang' : '🕌 Sholat Dhuhur & Istirahat 2' },
        { time: activeDay === 'JUMAT' ? '14.45 - 15.00' : '15.00', desc: '🏠 Bel Jam Pulang Sekolah' }
      ];

      staticEvents.forEach(ev => {
        const isAnthem = ev.desc.includes('INDONESIA RAYA');
        html += `
          <tr class="${isAnthem ? 'row-anthem' : ''}">
            <td style="font-family:monospace;font-weight:700">${ev.time}</td>
            <td>${ev.desc}</td>
            <td><span class="bell-status-active">Aktif</span></td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }
  };

  // Expose ke global window
  window.SchoolBell = SchoolBell;

  // Auto init saat dokumen selesai dimuat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SchoolBell.init());
  } else {
    SchoolBell.init();
  }

})(window);
