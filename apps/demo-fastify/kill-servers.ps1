# Script pour tuer les serveurs de benchmark qui restent en écoute

Write-Host "Recherche des processus sur les ports de benchmark..." -ForegroundColor Yellow

$ports = @(9100, 9101, 9200, 9201, 3000)

foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    
    if ($null -ne $connections) {
        Write-Host "Port $port en ecoute:" -ForegroundColor Cyan
        
        foreach ($conn in $connections) {
            $parts = $conn -split '\s+'
            $processId = $parts[-1]
            
            if ($processId -match '^\d+$') {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($null -ne $process) {
                    Write-Host "  Arret du processus: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Write-Host "  Processus tue" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host "Nettoyage termine" -ForegroundColor Green
