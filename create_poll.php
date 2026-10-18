<?php
require __DIR__ . '/bootstrap.php';
$me = require_login();
$in = require_post();

$question = trim((string) ($in['question'] ?? ''));
$rawOpts  = is_array($in['options'] ?? null) ? $in['options'] : [];

if (mb_strlen($question) < 3 || mb_strlen($question) > 140) {
    fail('Question must be 3 to 140 characters.');
}

$options = [];
$seen    = [];
foreach ($rawOpts as $opt) {
    $text = trim((string) $opt);
    if ($text === '') {
        continue;
    }
    if (mb_strlen($text) > 80) {
        fail('Each option must be 80 characters or fewer.');
    }
    $key = mb_strtolower($text);
    if (isset($seen[$key])) {
        fail('Options must be different from each other.');
    }
    $seen[$key] = true;
    $options[]  = $text;
}

if (count($options) < 2) {
    fail('Please provide at least 2 options.');
}
if (count($options) > 10) {
    fail('A poll can have at most 10 options.');
}

$pdo = db();
try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO polls (user_id, question) VALUES (?, ?)');
    $stmt->execute([$me['id'], $question]);
    $pollId = (int) $pdo->lastInsertId();

    $ins = $pdo->prepare('INSERT INTO poll_options (poll_id, text, position) VALUES (?, ?, ?)');
    foreach ($options as $i => $text) {
        $ins->execute([$pollId, $text, $i + 1]);
    }

    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fail('Could not create the poll. Please try again.', 500);
}

json_out(['ok' => true, 'id' => $pollId], 201);
