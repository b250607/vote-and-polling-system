<?php
require __DIR__ . '/bootstrap.php';
$in = require_post();

$username = trim((string) ($in['username'] ?? ''));
$password = (string) ($in['password'] ?? '');

if (mb_strlen($username) < 3 || mb_strlen($username) > 30) {
    fail('Username must be 3 to 30 characters.');
}
if (strlen($password) < 6) {
    fail('Password must be at least 6 characters.');
}
if (strlen($password) > 72) {
    fail('Password must be at most 72 characters.');
}

try {
    $stmt = db()->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        fail('That username is already taken.', 409);
    }
    fail('Could not register. Please try again.', 500);
}

json_out(['ok' => true, 'username' => $username], 201);
