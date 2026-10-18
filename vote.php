<?php
require __DIR__ . '/bootstrap.php';
$me = require_login();
$in = require_post();

$pollId   = (int) ($in['poll_id'] ?? 0);
$optionId = (int) ($in['option_id'] ?? 0);

if ($pollId < 1 || $optionId < 1) {
    fail('Please select an option first.');
}

$pdo = db();

// The option must belong to the poll being voted on
$stmt = $pdo->prepare('SELECT id FROM poll_options WHERE id = ? AND poll_id = ?');
$stmt->execute([$optionId, $pollId]);
if (!$stmt->fetch()) {
    fail('That option does not exist in this poll.', 404);
}

try {
    $stmt = $pdo->prepare('INSERT INTO votes (poll_id, option_id, user_id) VALUES (?, ?, ?)');
    $stmt->execute([$pollId, $optionId, $me['id']]);
} catch (PDOException $e) {
    // UNIQUE (poll_id, user_id) violated -> already voted
    if ($e->getCode() === '23000') {
        fail('You have already voted in this poll!', 409);
    }
    fail('Could not record your vote. Please try again.', 500);
}

json_out(['ok' => true], 201);
