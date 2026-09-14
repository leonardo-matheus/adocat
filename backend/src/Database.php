<?php

declare(strict_types=1);

namespace AdoCat;

use PDO;

final class Database
{
    public static function connect(array $config): PDO
    {
        $pdo = new PDO(
            $config['dsn'],
            $config['user'] ?? null,
            $config['password'] ?? null,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        if (str_starts_with($config['dsn'], 'sqlite:')) {
            $pdo->exec('PRAGMA foreign_keys = ON');
        }
        return $pdo;
    }
}
