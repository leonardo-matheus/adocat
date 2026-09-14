<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class MigrationTest extends TestCase
{
    public function testFreeCityMigrationPreservesRelatedAdoptionAndForeignKeys(): void
    {
        $db = new PDO('sqlite::memory:');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec('PRAGMA foreign_keys = ON');

        $migrationDirectory = dirname(__DIR__) . '/migrations';
        $db->exec((string) file_get_contents($migrationDirectory . '/001_initial.sqlite.sql'));
        $db->exec((string) file_get_contents($migrationDirectory . '/002_contract.sqlite.sql'));

        $db->exec("INSERT INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES ('pet-linked','Faísca','cat','male','kitten','8 meses','small','Araraquara','/images/faisca.jpg','Demonstração','[\"Curioso\"]',1,1,'available')");
        $db->exec("INSERT INTO adoptions (id,pet_id,name,email,phone,city,home_type,screened,other_pets,routine,consent,status) VALUES ('adoption-linked','pet-linked','Pessoa Teste','pessoa@example.test','16999999999','Araraquara','house',1,'Não','Trabalho em casa',1,'pending')");

        $db->exec((string) file_get_contents($migrationDirectory . '/003_free_city.sqlite.sql'));

        $db->exec("INSERT INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES ('pet-free-city','Novo Pet','cat','female','adult','2 anos','small','São Carlos','/images/luna.jpg','Demonstração','[\"Calma\"]',1,1,'available')");

        self::assertSame(
            'pet-linked',
            $db->query("SELECT pet_id FROM adoptions WHERE id = 'adoption-linked'")->fetchColumn()
        );
        self::assertSame(
            'São Carlos',
            $db->query("SELECT city FROM pets WHERE id = 'pet-free-city'")->fetchColumn()
        );
        self::assertSame([], $db->query('PRAGMA foreign_key_check')->fetchAll(PDO::FETCH_ASSOC));
        self::assertSame(1, (int) $db->query('PRAGMA foreign_keys')->fetchColumn());
    }
}
