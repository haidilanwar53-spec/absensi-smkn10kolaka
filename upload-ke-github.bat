@echo off
title Upload Absensi SMKN 10 Kolaka ke GitHub
color 0a
cd /d "C:\Users\Ahmad Adam Alfath\.gemini\antigravity-ide\scratch\absensi-smkn10kolaka"
echo ========================================================
echo   UPLOAD APLIKASI ABSENSI SMKN 10 KOLAKA KE GITHUB
echo ========================================================
echo.
echo Memeriksa status repositori...
git remote set-url origin https://github.com/haidilanwar53-spec/absensi-smkn10kolaka.git
git add .
git commit -m "feat: pembaruan sistem absensi SMKN 10 Kolaka multi-device dan keamanan" 2>nul
echo.
echo Mengunggah commit ke GitHub (origin main)...
echo.
echo CATATAN PENTING:
echo Jika muncul pop-up Windows atau jendela browser GitHub:
echo Silakan klik "Sign in with your browser" untuk verifikasi 1-klik!
echo.
git push origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   BERHASIL! Seluruh berkas berhasil diunggah ke GitHub!
    echo   Situs GitHub Pages akan otomatis aktif di:
    echo   https://haidilanwar53-spec.github.io/absensi-smkn10kolaka/
    echo ========================================================
) else (
    echo ========================================================
    echo   Gagal mengunggah atau otentikasi login belum selesai.
    echo ========================================================
)
echo.
pause
