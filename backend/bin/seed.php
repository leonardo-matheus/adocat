<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';
require __DIR__ . '/migrate.php';

// Dados exclusivamente demonstrativos. INSERT IGNORE/OR IGNORE preserva registros existentes.
$pets = [
    ['faisca', 'Faísca', 'cat', 'male', 'kitten', '8 meses', 'small', 'Araraquara', '/images/faisca.jpg', 'Curioso, brincalhão e sempre pronto para explorar um cantinho novo.', ['Brincalhão', 'Curioso', 'Carinhoso'], 1, 1, 'available'],
    ['romeu', 'Romeu', 'cat', 'male', 'adult', '3 anos', 'medium', 'Matão', '/images/romeu.jpg', 'Um companheiro tranquilo que gosta de colo e de observar a casa pela janela.', ['Tranquilo', 'Sociável', 'Dócil'], 1, 1, 'available'],
    ['luna', 'Luna', 'cat', 'female', 'adult', '2 anos', 'small', 'Araraquara', '/images/luna.jpg', 'Delicada e afetuosa, se aproxima devagar e logo vira companhia inseparável.', ['Carinhosa', 'Calma', 'Gentil'], 1, 1, 'available'],
    ['castiel', 'Castiel', 'cat', 'male', 'senior', '8 anos', 'medium', 'Matão', '/images/castiel.jpg', 'Sereno e observador, procura uma casa calma para aproveitar longas sonecas.', ['Sereno', 'Independente', 'Dócil'], 1, 1, 'available'],
    ['amora', 'Amora', 'dog', 'female', 'adult', '4 anos', 'medium', 'Araraquara', '/images/amora.jpg', 'Alegre e leal, ama passeios e recebe todo mundo com entusiasmo.', ['Alegre', 'Leal', 'Ativa'], 1, 1, 'available'],
    ['ragna', 'Ragna', 'cat', 'female', 'adult', '3 anos', 'medium', 'Matão', '/images/ragna.jpg', 'Esperta e comunicativa, adora brincar e acompanhar a rotina da família.', ['Esperta', 'Comunicativa', 'Brincalhona'], 1, 0, 'treatment'],
    ['fabricia', 'Fabrícia', 'cat', 'female', 'adult', '5 anos', 'small', 'Araraquara', '/images/fabricia.jpg', 'Doce e resiliente, está se recuperando e gosta de carinho com calma.', ['Doce', 'Resiliente', 'Calma'], 0, 1, 'treatment'],
    ['mel', 'Mel', 'cat', 'female', 'kitten', '6 meses', 'small', 'Matão', '/images/hero-cat.jpg', 'Pequena e curiosa, transforma qualquer caixa em brinquedo.', ['Curiosa', 'Divertida', 'Sociável'], 1, 0, 'available'],
];

$petSql = str_starts_with($dsn, 'mysql:')
    ? 'INSERT IGNORE INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    : 'INSERT OR IGNORE INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
$petStatement = $pdo->prepare($petSql);
foreach ($pets as $pet) {
    $pet[10] = json_encode($pet[10], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $petStatement->execute($pet);
}

$campaigns = [
    ['tratamento-fabricia', 'Tratamento da Fabrícia', 'Ajude a cobrir consultas, exames e medicamentos durante sua recuperação.', '/images/fabricia.jpg', 700, 420, 'active', 'Tratamento veterinário', null],
    ['mutirao-vacinacao', 'Mutirão de vacinação', 'Uma campanha demonstrativa para proteger animais acolhidos antes da adoção.', '/images/community.jpg', 2400, 1560, 'active', 'Saúde preventiva', null],
    ['lar-temporario', 'Rede de lares temporários', 'Campanha demonstrativa para apoiar alimentação e cuidados em lares parceiros.', '/images/hero-cat.jpg', 1800, 1800, 'completed', 'Acolhimento', null],
];

$campaignSql = str_starts_with($dsn, 'mysql:')
    ? 'INSERT IGNORE INTO campaigns (id,title,description,image,target,raised,status,category,external_url) VALUES (?,?,?,?,?,?,?,?,?)'
    : 'INSERT OR IGNORE INTO campaigns (id,title,description,image,target,raised,status,category,external_url) VALUES (?,?,?,?,?,?,?,?,?)';
$campaignStatement = $pdo->prepare($campaignSql);
foreach ($campaigns as $campaign) {
    $campaignStatement->execute($campaign);
}

echo "Dados demonstrativos inseridos sem alterar registros existentes.\n";
