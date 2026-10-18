<?php
// Shared setup: JSON headers, session, database connection, helpers.
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function json_out($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail($message, $status = 400) {
    json_out(['error' => $message], $status);
}

function db() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        } catch (PDOException $e) {
            fail('Database connection failed. Check api/config.php and that MySQL is running.', 500);
        }
    }
    return $pdo;
}

// Requires a POST with a JSON body; returns the decoded body.
// (Requiring application/json also blocks cross-site form posts.)
function require_post() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST required.', 405);
    }
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== 0) {
        fail('Invalid content type.', 415);
    }
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function require_login() {
    if (empty($_SESSION['user_id'])) {
        fail('Please login first.', 401);
    }
    return [
        'id'       => (int) $_SESSION['user_id'],
        'username' => (string) $_SESSION['username'],
    ];
}
