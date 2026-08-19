try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Output ("STATUS: " + $resp.StatusCode)
} catch {
    Write-Output ("ERROR: " + $_.Exception.Message)
}
