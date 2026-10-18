<?php
require __DIR__ . '/bootstrap.php';
$me  = require_login();
$pdo = db();

$polls = $pdo->query(
    'SELECT p.id, p.question, p.icon, p.user_id, u.username AS created_by
       FROM polls p
       LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC, p.id DESC'
)->fetchAll();

$options = $pdo->query(
    'SELECT o.id, o.poll_id, o.text, o.description, COUNT(v.id) AS votes
       FROM poll_options o
       LEFT JOIN votes v ON v.option_id = o.id
      GROUP BY o.id, o.poll_id, o.text, o.description, o.position
      ORDER BY o.poll_id, o.position, o.id'
)->fetchAll();

$stmt = $pdo->prepare('SELECT poll_id, option_id FROM votes WHERE user_id = ?');
$stmt->execute([$me['id']]);
$myVotes = [];
foreach ($stmt->fetchAll() as $row) {
    $myVotes[(int) $row['poll_id']] = (int) $row['option_id'];
}

$byPoll = [];
foreach ($options as $o) {
    $byPoll[(int) $o['poll_id']][] = [
        'id'    => (int) $o['id'],
        'text'  => $o['text'],
        'desc'  => $o['description'],
        'votes' => (int) $o['votes'],
    ];
}

$out = [];
foreach ($polls as $p) {
    $id   = (int) $p['id'];
    $opts = $byPoll[$id] ?? [];
    $out[] = [
        'id'         => $id,
        'question'   => $p['question'],
        'icon'       => $p['icon'],
        'created_by' => $p['created_by'],
        'is_owner'   => $p['user_id'] !== null && (int) $p['user_id'] === $me['id'],
        'my_vote'    => $myVotes[$id] ?? null,
        'total'      => array_sum(array_column($opts, 'votes')),
        'options'    => $opts,
    ];
}

json_out(['polls' => $out]);
