<?php
require __DIR__ . '/bootstrap.php';
$me = require_login();
$in = require_post();

$pollId = (int) ($in['poll_id'] ?? 0);

// Only the creator may delete (options and votes go with it via ON DELETE CASCADE)
$stmt = db()->prepare('DELETE FROM polls WHERE id = ? AND user_id = ?');
$stmt->execute([$pollId, $me['id']]);

if ($stmt->rowCount() === 0) {
    fail('Poll not found, or you are not its creator.', 403);
}

json_out(['ok' => true]);
