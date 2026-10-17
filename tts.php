<?php
/**
 * tts.php – Dynamic On-Demand Microsoft Edge Neural TTS Endpoint
 * SMK Negeri 10 Kolaka
 * 
 * Melayani audio Text-to-Speech berkualitas tinggi (id-ID-GadisNeural / id-ID-ArdiNeural)
 * dengan sistem smart local caching untuk kecepatan instan tanpa jeda.
 */

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

// 3. Cek Cache Berdasarkan Hash Teks + Suara
$hash = md5($voice . '_' . $text);
$cacheFile = $cacheDir . '/' . $hash . '.mp3';

if (file_exists($cacheFile) && filesize($cacheFile) > 1000) {
    header('Content-Type: audio/mpeg');
    header('Content-Length: ' . filesize($cacheFile));
    header('Cache-Control: public, max-age=31536000');
    readfile($cacheFile);
    exit;
}

// 4. Sintesis On-Demand Menggunakan Python edge-tts
$safeText = str_replace(['"', "\r", "\n", "`", "$"], [' ', ' ', ' ', '', ''], $text);
$cmd = sprintf('python -m edge_tts --voice %s --rate="-2%%" --text "%s" --write-media "%s"',
    escapeshellarg($voice),
    addslashes($safeText),
    addslashes($cacheFile)
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
    echo json_encode([
        'error' => 'Gagal memproduksi audio Edge-TTS',
        'cmd' => $cmd
    ]);
}
