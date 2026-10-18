<?php
require __DIR__ . '/bootstrap.php';
require_post();

$_SESSION = [];
session_destroy();

json_out(['ok' => true]);
