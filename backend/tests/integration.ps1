param([int]$Port = 8080)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$php = (Get-Command php).Source
$database = Join-Path $root 'var/integration.sqlite'
$base = "http://127.0.0.1:$Port/api"
$oldDsn = $env:DB_DSN
$oldEmail = $env:ADMIN_EMAIL
$oldPassword = $env:ADMIN_PASSWORD
$oldOrigin = $env:APP_ORIGIN
$server = $null

function Assert-True([bool]$condition, [string]$message) {
    if (-not $condition) { throw "Falha: $message" }
}

function Start-Api {
    return Start-Process -FilePath $php -ArgumentList @('-S', "127.0.0.1:$Port", '-t', 'public') -WorkingDirectory $root -WindowStyle Hidden -PassThru
}

try {
    if (Test-Path -LiteralPath $database) { Remove-Item -LiteralPath $database -Force }
    $env:DB_DSN = "sqlite:$database"
    $env:ADMIN_EMAIL = 'admin@integration.local'
    $env:ADMIN_PASSWORD = 'integration-secret'
    $env:APP_ORIGIN = 'http://localhost:5173'
    & $php -f (Join-Path $root 'bin/migrate.php')
    & $php -f (Join-Path $root 'bin/seed.php')
    $server = Start-Api

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try { Invoke-RestMethod "$base/config" -TimeoutSec 2 | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 100 }
    }
    Assert-True $ready 'servidor PHP não iniciou'

    $session = Invoke-RestMethod -Uri "$base/auth/session" -SessionVariable web
    Assert-True (-not $session.data.authenticated) 'sessão deve começar anônima'
    Assert-True ($session.data.csrfToken.Length -eq 64) 'sessão anônima deve receber CSRF'
    $csrf = $session.data.csrfToken

    $loginBody = @{ email='admin@integration.local'; password='integration-secret' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -WebSession $web -Headers @{'X-CSRF-Token'=$csrf} -ContentType 'application/json' -Body $loginBody
    Assert-True $login.data.authenticated 'login deve autenticar'
    $csrf = $login.data.csrfToken

    $petBody = @{name='Teste';species='cat';sex='female';ageGroup='adult';ageLabel='2 anos';size='small';city='São Carlos';image='https://example.test/pet.jpg';description='Pet de integração';temperament=@();vaccinated=$true;neutered=$false;status='available'} | ConvertTo-Json
    $pet = Invoke-RestMethod -Uri "$base/admin/pets" -Method Post -WebSession $web -Headers @{'X-CSRF-Token'=$csrf} -ContentType 'application/json' -Body $petBody
    Assert-True ($pet.data.name -eq 'Teste') 'CRUD deve criar pet'
    Assert-True ($pet.data.city -eq 'São Carlos' -and $pet.data.temperament.Count -eq 0) 'cadastro deve aceitar outras cidades e temperamento opcional'
    $petId = $pet.data.id
    $patched = Invoke-RestMethod -Uri "$base/admin/pets/$petId" -Method Patch -WebSession $web -Headers @{'X-CSRF-Token'=$csrf} -ContentType 'application/json' -Body '{"status":"treatment"}'
    Assert-True ($patched.data.status -eq 'treatment') 'PATCH parcial deve atualizar pet'

    $publicTreatment = Invoke-RestMethod -Uri "$base/pets/$petId"
    Assert-True ($publicTreatment.data.status -eq 'treatment') 'perfil público deve incluir pet em tratamento'
    $adoptionBody = @{petId='faisca';name='Pessoa Teste';email='pessoa@example.test';phone='16999999999';city='Campinas';homeType='house';screened=$true;otherPets='Não';routine='Trabalho em casa todos os dias';consent=$true} | ConvertTo-Json
    $adoption = Invoke-RestMethod -Uri "$base/adoptions" -Method Post -ContentType 'application/json' -Body $adoptionBody
    Assert-True ($adoption.data.status -eq 'pending') 'adoção deve ser persistida'
    Assert-True ($adoption.data.city -eq 'Campinas') 'cidade do candidato deve ser livre'
    $volunteerBody = @{name='Voluntária Teste';email='voluntaria@example.test';phone='16988888888';city='Ribeirão Preto';interests=@('feiras');availability='Sábados';consent=$true} | ConvertTo-Json
    $volunteer = Invoke-RestMethod -Uri "$base/volunteers" -Method Post -ContentType 'application/json' -Body $volunteerBody
    Assert-True ($volunteer.data.status -eq 'pending') 'voluntariado deve ser persistido'
    Assert-True ($volunteer.data.message -eq '') 'mensagem voluntária deve ser opcional'
    $updatedAdoption = Invoke-RestMethod -Uri "$base/admin/adoptions/$($adoption.data.id)" -Method Patch -WebSession $web -Headers @{'X-CSRF-Token'=$csrf} -ContentType 'application/json' -Body '{"status":"contacted"}'
    Assert-True ($updatedAdoption.data.name -eq 'Pessoa Teste' -and $updatedAdoption.data.status -eq 'contacted') 'update deve retornar candidatura completa'

    $campaignBody = @{title='Concluída';description='Campanha concluída de integração';image='/assets/campaign.jpg';target=100.0;raised=100.0;status='completed';category='tratamento'} | ConvertTo-Json
    $campaign = Invoke-RestMethod -Uri "$base/admin/campaigns" -Method Post -WebSession $web -Headers @{'X-CSRF-Token'=$csrf} -ContentType 'application/json' -Body $campaignBody
    $publicCampaigns = Invoke-RestMethod -Uri "$base/campaigns"
    Assert-True (($publicCampaigns.data | Where-Object id -eq $campaign.data.id).status -eq 'completed') 'campanhas concluídas devem permanecer públicas'

    try {
        Invoke-RestMethod -Uri "$base/volunteers" -Method Post -ContentType 'application/json' -Body '{}' | Out-Null
        throw 'Falha: payload inválido deveria retornar erro'
    } catch {
        $errorJson = $_.ErrorDetails.Message
        if (-not $errorJson -and $_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorJson = $reader.ReadToEnd()
        }
        if (-not $errorJson) { throw }
        $errorBody = $errorJson | ConvertFrom-Json
        Assert-True ($errorBody.error.fields.name -ne $null) 'erro deve usar envelope e fields'
    }

    Stop-Process -Id $server.Id -Force
    $server.WaitForExit()
    $server = Start-Api
    Start-Sleep -Milliseconds 400
    $persisted = Invoke-RestMethod -Uri "$base/pets/faisca"
    Assert-True ($persisted.data.id -eq 'faisca') 'SQLite deve persistir após reinício'

    $session = Invoke-RestMethod -Uri "$base/auth/session" -SessionVariable web2
    $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -WebSession $web2 -Headers @{'X-CSRF-Token'=$session.data.csrfToken} -ContentType 'application/json' -Body $loginBody
    try {
        Invoke-RestMethod -Uri "$base/admin/pets/faisca" -Method Delete -WebSession $web2 -Headers @{'X-CSRF-Token'=$login.data.csrfToken} | Out-Null
        throw 'Falha: exclusão com histórico deveria ser bloqueada'
    } catch {
        Assert-True ($_.Exception.Response.StatusCode.value__ -eq 409) 'pet com candidatura deve retornar 409'
    }
    $deleted = Invoke-RestMethod -Uri "$base/admin/pets/$petId" -Method Delete -WebSession $web2 -Headers @{'X-CSRF-Token'=$login.data.csrfToken}
    Assert-True ($null -eq $deleted.data) 'DELETE deve retornar data null'
    Write-Output 'Integração HTTP OK: sessão/login/CSRF/CRUD/formulários/erros/persistência.'
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
    if (Test-Path -LiteralPath $database) { Remove-Item -LiteralPath $database -Force }
    $env:DB_DSN = $oldDsn
    $env:ADMIN_EMAIL = $oldEmail
    $env:ADMIN_PASSWORD = $oldPassword
    $env:APP_ORIGIN = $oldOrigin
}
