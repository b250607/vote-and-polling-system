<?php
require __DIR__ . '/bootstrap.php';
$in = require_post();

$username = trim((string) ($in['username'] ?? ''));
$password = (string) ($in['password'] ?? '');

$stmt = db()->prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    fail('Invalid username or password!', 401);
}

session_regenerate_id(true);
$_SESSION['user_id']  = (int) $user['id'];
$_SESSION['username'] = $user['username'];

json_out(['ok' => true, 'username' => $user['username']]);
