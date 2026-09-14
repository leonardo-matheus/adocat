<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

$root = dirname(__DIR__);
$env = getenv() + $_ENV + $_SERVER;
if (is_file($root . '/.env')) {
    foreach (file($root . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $env[trim($key)] = trim(trim($value), "\"'");
    }
}
$dsn = $env['DB_DSN'] ?? "sqlite:$root/var/adocat.sqlite";
if (str_starts_with($dsn, 'sqlite:')) {
    $path = substr($dsn, 7);
    if ($path !== ':memory:' && !str_starts_with($path, '/') && !preg_match('/^[A-Za-z]:[\\\\\/]/', $path)) $dsn = "sqlite:$root/$path";
}
$pdo = AdoCat\Database::connect(['dsn' => $dsn, 'user' => $env['DB_USER'] ?? null, 'password' => $env['DB_PASSWORD'] ?? null]);
$dialect = str_starts_with($dsn, 'mysql:') ? 'mysql' : 'sqlite';
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$files = glob("$root/migrations/*.$dialect.sql") ?: [];
sort($files);
foreach ($files as $file) {
    $version = basename($file);
    $check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version=?');
    $check->execute([$version]);
    if ($check->fetchColumn()) continue;
    $pdo->exec(file_get_contents($file));
    $pdo->prepare('INSERT INTO schema_migrations (version) VALUES (?)')->execute([$version]);
}
echo "Migração aplicada ($dialect).\n";
