@echo off
title Upload Absensi SMKN 10 Kolaka ke GitHub
color 0a
echo ========================================================
echo   UPLOAD APLIKASI ABSENSI SMKN 10 KOLAKA KE GITHUB
echo ========================================================
echo.
echo Menyimpan seluruh pembaruan sistem...
git add .
git commit -m "Fitur Bel Sekolah Otomatis, Suara Khusus Guru Login, dan Lagu Kebangsaan Indonesia Raya Pukul 10.00"
echo.
echo Menghubungkan ke GitHub...
git remote set-url origin https://github.com/haidilanwar53-spec/absensi-smkn10kolaka.git
echo.
echo Mengunggah berkas ke GitHub...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   BERHASIL! Seluruh berkas berhasil diunggah ke GitHub!
    echo ========================================================
) else (
    echo Terjadi kesalahan atau butuh otentikasi login GitHub.
)
echo.
pause
