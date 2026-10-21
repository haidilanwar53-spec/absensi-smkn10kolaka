<?php
/**
 * tts.php – Dynamic On-Demand Microsoft Edge Neural TTS Endpoint
 * SMK Negeri 10 Kolaka
 * 
 * Melayani audio Text-to-Speech berkualitas tinggi (id-ID-GadisNeural / id-ID-ArdiNeural)
 * dengan sistem smart local caching untuk kecepatan instan tanpa jeda.
 */

// Keamanan: Security response headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$text = isset($_GET['text']) ? trim($_GET['text']) : '';
$voice = isset($_GET['voice']) ? trim($_GET['voice']) : 'id-ID-GadisNeural';
$slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';

// Validasi suara yang diizinkan (Microsoft Edge Neural Voices Bahasa Indonesia)
$allowedVoices = [
    'id-ID-GadisNeural',
    'id-ID-ArdiNeural'
];
if (!in_array($voice, $allowedVoices)) {
    $voice = 'id-ID-GadisNeural';
}

$cacheDir = __DIR__ . '/audio/tts/cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}

// 1. Cek apakah ada file pra-render langsung berdasarkan slug
$cleanSlug = preg_replace('/[^a-z0-9_]/', '', strtolower($slug));
if (!empty($cleanSlug)) {
    $coreFile = __DIR__ . '/audio/tts/core/' . $cleanSlug . '.mp3';
    if (file_exists($coreFile) && filesize($coreFile) > 1000) {
        header('Content-Type: audio/mpeg');
        header('Content-Length: ' . filesize($coreFile));
        header('Cache-Control: public, max-age=31536000');
        readfile($coreFile);
        exit;
    }
    $guruFile = __DIR__ . '/audio/tts/guru/' . $cleanSlug . '.mp3';
    if (file_exists($guruFile) && filesize($guruFile) > 1000) {
        header('Content-Type: audio/mpeg');
        header('Content-Length: ' . filesize($guruFile));
        header('Cache-Control: public, max-age=31536000');
        readfile($guruFile);
        exit;
    }
}

// 2. Jika tidak ada slug, pastikan ada teks untuk disintesis
if (empty($text)) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Parameter text atau slug wajib disertakan']);
    exit;
}

// 2b. Keamanan Ketat: Batasi panjang dan karakter teks (Cegah Command Injection & Penolakan Layanan)
// Hanya izinkan huruf, angka, spasi, dan tanda baca umum bahasa Indonesia
$cleanText = preg_replace('/[^\p{L}\p{N}\s\.,\?!_\-\(\)\'\"]/u', ' ', $text);
$cleanText = preg_replace('/\s+/', ' ', trim($cleanText));
$cleanText = mb_substr($cleanText, 0, 250);

if (empty($cleanText)) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Karakter teks tidak valid']);
    exit;
}

// 3. Cek Cache Berdasarkan Hash Teks Bersih + Suara
$hash = md5($voice . '_' . $cleanText);
$cacheFile = $cacheDir . '/' . $hash . '.mp3';

if (file_exists($cacheFile) && filesize($cacheFile) > 1000) {
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($cacheFile));
    header('Cache-Control: public, max-age=31536000');
    readfile($cacheFile);
    exit;
}

// 4. Rate Limiting: Batasi dynamic synthesis per IP (Mencegah serangan DoS & CPU Exhaustion)
function checkTtsRateLimit($cacheDir) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
    $ipHash = md5($ip);
    $limitDir = $cacheDir . '/.limits';
    if (!is_dir($limitDir)) {
        @mkdir($limitDir, 0777, true);
    }
    
    $limitFile = $limitDir . '/' . $ipHash . '.json';
    $now = time();
    $window = 60; // Periode jendela 60 detik
    $maxRequests = 20; // Maksimal 20 dynamic generation per menit per IP
    
    $data = ['count' => 0, 'start' => $now];
    if (file_exists($limitFile)) {
        $content = @file_get_contents($limitFile);
        if ($content) {
            $parsed = @json_decode($content, true);
            if (is_array($parsed) && isset($parsed['start']) && isset($parsed['count'])) {
                if ($now - $parsed['start'] < $window) {
                    $data = $parsed;
                }
            }
        }
    }
    
    if ($data['count'] >= $maxRequests) {
        return false;
    }
    
    $data['count']++;
    @file_put_contents($limitFile, json_encode($data), LOCK_EX);
    
    // Pembersihan berkala file limit usang (peluang 2%)
    if (mt_rand(1, 50) === 1) {
        $files = @glob($limitDir . '/*.json');
        if ($files) {
            foreach ($files as $f) {
                if ($now - @filemtime($f) > 300) {
                    @unlink($f);
                }
            }
        }
    }
    
    return true;
}

if (!checkTtsRateLimit($cacheDir)) {
    header('Content-Type: application/json');
    http_response_code(429);
    echo json_encode([
        'error' => 'Batas permintaan sintesis audio terlampaui (Rate limit exceeded). Harap tunggu beberapa saat.'
    ]);
    exit;
}

// 5. Sintesis On-Demand Menggunakan Python edge-tts dengan Escaping Shell Aman
$cmd = sprintf('python -m edge_tts --voice %s --rate="-2%%" --text %s --write-media %s',
    escapeshellarg($voice),
    escapeshellarg($cleanText),
    escapeshellarg($cacheFile)
);

@exec($cmd, $output, $returnVar);

if (file_exists($cacheFile) && filesize($cacheFile) > 1000) {
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($cacheFile));
    header('Cache-Control: public, max-age=31536000');
    readfile($cacheFile);
    exit;
} else {
    header('Content-Type: application/json');
    http_response_code(500);
    // Aman: Jangan bocorkan path sistem atau raw command ke klien
    echo json_encode([
        'error' => 'Gagal memproduksi audio Edge-TTS'
    ]);
}
