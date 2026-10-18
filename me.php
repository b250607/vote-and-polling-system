<?php
require __DIR__ . '/bootstrap.php';

if (empty($_SESSION['user_id'])) {
    json_out(['user' => null]);
}

// Make sure the account still exists (e.g. wasn't deleted in phpMyAdmin)
$stmt = db()->prepare('SELECT username FROM users WHERE id = ?');
$stmt->execute([(int) $_SESSION['user_id']]);
$row = $stmt->fetch();

if (!$row) {
    $_SESSION = [];
    session_destroy();
    json_out(['user' => null]);
}

json_out(['user' => ['username' => $row['username']]]);
