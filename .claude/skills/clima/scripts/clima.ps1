#Requires -Version 5.1
<#
.SYNOPSIS
  Muestra el clima actual usando wttr.in (sin API key).

.PARAMETER Ciudad
  Ciudad a consultar. Por defecto: Capital Federal, Buenos Aires, Argentina.

.PARAMETER Json
  Imprime el JSON crudo de wttr.in y termina.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File clima.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File clima.ps1 -Ciudad "Cordoba, Argentina"
  powershell -NoProfile -ExecutionPolicy Bypass -File clima.ps1 -Json
#>
[CmdletBinding()]
param(
    [string]$Ciudad = "Capital Federal, Buenos Aires, Argentina",
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$encoded = [uri]::EscapeDataString($Ciudad)
$url = "https://wttr.in/$encoded`?format=j1&lang=es"

try {
    # wttr.in devuelve JSON solo si el User-Agent no parece un navegador.
    $data = Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = "curl/8" } -TimeoutSec 15
}
catch {
    Write-Error "No se pudo consultar wttr.in: $($_.Exception.Message)"
    exit 1
}

if ($Json) {
    $data | ConvertTo-Json -Depth 20
    exit 0
}

$cur = $data.current_condition[0]
if (-not $cur) {
    Write-Error "wttr.in no devolvio datos de clima actual para '$Ciudad'."
    exit 1
}

$area = $data.nearest_area[0]
$partes = @(
    $area.areaName[0].value
    $area.region[0].value
    $area.country[0].value
) | Where-Object { $_ -and $_.Trim() -ne "" }
$lugar = if ($partes) { $partes -join ", " } else { $Ciudad }

$cond = if ($cur.lang_es -and $cur.lang_es[0].value) { $cur.lang_es[0].value } else { $cur.weatherDesc[0].value }

"Clima actual - {0} (obs. {1} UTC)" -f $lugar, $cur.observation_time
"  Condicion:      {0}" -f $cond
"  Temperatura:    {0} C  (sensacion {1} C)" -f $cur.temp_C, $cur.FeelsLikeC
"  Humedad:        {0} %" -f $cur.humidity
"  Viento:         {0} km/h del {1}" -f $cur.windspeedKmph, $cur.winddir16Point
"  Presion:        {0} hPa" -f $cur.pressure
"  Visibilidad:    {0} km" -f $cur.visibility
"  Nubosidad:      {0} %" -f $cur.cloudcover
