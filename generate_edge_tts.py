#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_edge_tts.py
Skrip Pembuat Audio Microsoft Edge Neural TTS (id-ID-GadisNeural)
untuk Sistem Bel Sekolah Otomatis SMK Negeri 10 Kolaka
"""

import os
import sys
import asyncio
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VOICE = "id-ID-GadisNeural"
RATE = "-2%"
PITCH = "+0Hz"

CORE_ANNOUNCEMENTS = {
    "masuk_umum": (
        "Mohon perhatian, bel tanda masuk kelas telah berbunyi. "
        "Kepada Bapak dan Ibu Guru, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar. Terima kasih."
    ),
    "jam_pertama": (
        "Mohon perhatian, bel tanda masuk jam pelajaran pertama telah berbunyi. "
        "Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar hari ini dengan penuh semangat. Terima kasih."
    ),
    "pergantian_jam": (
        "Mohon perhatian, bel pergantian jam pelajaran telah berbunyi. "
        "Kepada Bapak dan Ibu Guru pengajar jam berikutnya, selamat memasuki kelas dan selamat melanjutkan kegiatan belajar mengajar. Terima kasih."
    ),
    "istirahat_1": (
        "Mohon perhatian, bel tanda waktu istirahat pertama telah berbunyi. "
        "Selamat beristirahat kepada seluruh siswa-siswi dan Bapak Ibu Guru. "
        "Tetap jaga kebersihan lingkungan sekolah dan buanglah sampah pada tempatnya. Terima kasih."
    ),
    "indonesia_raya_intro": (
        "Mohon perhatian kepada seluruh warga SMK Negeri 10 Kolaka. "
        "Pukul 10.00 telah tiba. Marilah kita menghentikan sejenak seluruh kegiatan belajar mengajar "
        "untuk bersama-sama mendengarkan dan menghormati Lagu Kebangsaan Indonesia Raya. Sikap sempurna."
    ),
    "indonesia_raya_outro": (
        "Terima kasih. Lagu Kebangsaan Indonesia Raya telah selesai. "
        "Seluruh kegiatan belajar mengajar dapat dilanjutkan kembali. Tetap semangat!"
    ),
    "sholat_dhuhur": (
        "Mohon perhatian, bel tanda waktu istirahat kedua dan sholat Dhuhur telah berbunyi. "
        "Kepada seluruh warga SMK Negeri 10 Kolaka, selamat menunaikan ibadah sholat Dhuhur dan selamat menikmati waktu istirahat. Terima kasih."
    ),
    "sholat_jumat": (
        "Mohon perhatian, waktu persiapan ibadah sholat Jumat telah tiba. "
        "Kepada seluruh dewan guru dan siswa muslim SMK Negeri 10 Kolaka, "
        "dipersilakan bersiap menuju masjid untuk menunaikan sholat Jumat berjamaah. Selamat beristirahat."
    ),
    "pulang": (
        "Mohon perhatian, bel tanda berakhirnya seluruh kegiatan belajar mengajar hari ini telah berbunyi. "
        "Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat kembali ke rumah masing-masing. "
        "Hati-hati di jalan dan sampai jumpa esok hari. Terima kasih."
    ),
    "pulang_sabtu": (
        "Mohon perhatian, bel tanda berakhirnya seluruh kegiatan belajar mengajar hari ini telah berbunyi. "
        "Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat kembali ke rumah masing-masing. "
        "Hati-hati di jalan, selamat berlibur akhir pekan, dan sampai jumpa hari Senin. Terima kasih."
    ),
    "upacara_senin": (
        "Mohon perhatian, bel tanda persiapan upacara bendera hari Senin telah berbunyi. "
        "Kepada seluruh siswa-siswi dan Bapak Ibu Guru, dipersilakan menuju lapangan upacara dengan tertib. Terima kasih."
    ),
    "apel_pagi": (
        "Mohon perhatian, bel tanda kegiatan apel pagi dan literasi telah berbunyi. "
        "Kepada seluruh siswa-siswi dan Bapak Ibu Guru, selamat memulai aktivitas pagi ini dengan penuh semangat."
    )
}

TEACHERS = [
    {"no": 1, "code": "08", "name": "Hamzah L, Sarjana Pendidikan", "honorific": "Bapak"},
    {"no": 2, "code": "03", "name": "Nurjamil P, Sarjana Pendidikan Islam", "honorific": "Bapak"},
    {"no": 3, "code": "02", "name": "Abdul Azis, Sarjana Agama", "honorific": "Bapak"},
    {"no": 4, "code": "04", "name": "Nursakti, Sarjana Sosial", "honorific": "Ibu"},
    {"no": 5, "code": "07", "name": "Asrun Dilla, Sarjana Komputer", "honorific": "Bapak"},
    {"no": 6, "code": "05", "name": "Zainal Asis, Sarjana Pendidikan", "honorific": "Bapak"},
    {"no": 7, "code": "10", "name": "Suciati, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 8, "code": "14", "name": "Hasrawati, Sarjana Komputer", "honorific": "Ibu"},
    {"no": 9, "code": "17", "name": "Isnawati, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 10, "code": "06", "name": "Mustika, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 11, "code": "09", "name": "Yusniati, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 12, "code": "11", "name": "Jumardin, Sarjana Komputer", "honorific": "Bapak"},
    {"no": 13, "code": "12", "name": "Nurfadillah, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 14, "code": "13", "name": "Ratno Kardjono, Sarjana Pendidikan", "honorific": "Bapak"},
    {"no": 15, "code": "15", "name": "Nur Rahmat H", "honorific": "Bapak"},
    {"no": 16, "code": "16", "name": "Sahriani, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 17, "code": "18", "name": "Haidil Anwar, Sarjana Komputer", "honorific": "Bapak"},
    {"no": 18, "code": "21", "name": "Imnawan Meli Muslan, Sarjana Sains", "honorific": "Bapak"},
    {"no": 19, "code": "19", "name": "Andi Rachmat Ramadhani, Sarjana Pendidikan", "honorific": "Bapak"},
    {"no": 20, "code": "20", "name": "Nur Fajriani, Sarjana Administrasi Publik", "honorific": "Ibu"},
    {"no": 21, "code": "22", "name": "Jumaisah, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 22, "code": "23", "name": "Yudha Salehuddin, Sarjana Teknik", "honorific": "Bapak"},
    {"no": 23, "code": "24", "name": "Risna Pitra Natasyah, Sarjana Pendidikan", "honorific": "Ibu"},
    {"no": 24, "code": "25", "name": "Zulfikar, Sarjana Pendidikan", "honorific": "Bapak"}
]

sem = asyncio.Semaphore(5)

async def generate_single(text, filename, voice=VOICE):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    if os.path.exists(filename) and os.path.getsize(filename) > 1000:
        print(f"  [OK / Cached] {os.path.basename(filename)}")
        return
    async with sem:
        print(f"  [Generating] {os.path.basename(filename)} ...")
        try:
            communicate = edge_tts.Communicate(text, voice, rate=RATE, pitch=PITCH)
            await communicate.save(filename)
            print(f"  [OK] Tersimpan: {os.path.basename(filename)} ({os.path.getsize(filename)} bytes)")
        except Exception as e:
            print(f"  [Error] {os.path.basename(filename)}: {e}")

async def main():
    print("=" * 60)
    print("  MEMBUAT BERKAS AUDIO RESMI MICROSOFT EDGE NEURAL TTS")
    print("  SMK NEGERI 10 KOLAKA - SUARA: id-ID-GadisNeural")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    core_dir = os.path.join(base_dir, "audio", "tts", "core")
    guru_dir = os.path.join(base_dir, "audio", "tts", "guru")
    cache_dir = os.path.join(base_dir, "audio", "tts", "cache")

    os.makedirs(core_dir, exist_ok=True)
    os.makedirs(guru_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)

    tasks = []
    print("\n1. Menjadwalkan Pengumuman Inti Sekolah (Core Announcements)...")
    for key, text in CORE_ANNOUNCEMENTS.items():
        filepath = os.path.join(core_dir, f"{key}.mp3")
        tasks.append(generate_single(text, filepath))

    print("\n2. Menjadwalkan Suara Khusus 24 Guru yang Sedang Login...")
    for t in TEACHERS:
        name_with_hon = f"{t['honorific']} {t['name']}"
        code = t['code']

        # Masuk Mengajar
        masuk_text = (
            f"Mohon perhatian, bel tanda masuk kelas telah berbunyi. "
            f"Kepada {name_with_hon}, selamat memasuki kelas dan selamat memulai kegiatan belajar mengajar. Terima kasih."
        )
        masuk_file = os.path.join(guru_dir, f"masuk_{code}.mp3")
        tasks.append(generate_single(masuk_text, masuk_file))

        # Selesai Mengajar
        selesai_text = (
            f"Mohon perhatian, jam pelajaran telah berakhir. "
            f"Kepada {name_with_hon}, terima kasih atas dedikasi dan bimbingan Anda. "
            f"Selamat beristirahat sejenak atau melanjutkan kegiatan berikutnya. Terima kasih."
        )
        selesai_file = os.path.join(guru_dir, f"selesai_{code}.mp3")
        tasks.append(generate_single(selesai_text, selesai_file))

    print(f"\nMenjalankan {len(tasks)} tugas produksi Edge-TTS secara paralel...")
    await asyncio.gather(*tasks)

    print("\n" + "=" * 60)
    print("  SELESAI! Seluruh berkas audio Edge-TTS berhasil diproduksi.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
