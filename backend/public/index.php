<?php

declare(strict_types=1);

use AdoCat\App;

require dirname(__DIR__) . '/vendor/autoload.php';

$app = App::fromEnvironment(dirname(__DIR__));
$app->run();
