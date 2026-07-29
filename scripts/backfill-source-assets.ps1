param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\static-mirror\dotcomcanvas.de'),
  [string]$Origin = 'https://dotcomcanvas.de'
)

$indexPath = Join-Path $SourceRoot 'index.html'
$html = [System.IO.File]::ReadAllText($indexPath)
$pattern = '(?i)(?:https?:)?//dotcomcanvas\.de(?<path>/cdn/shop/(?:files|collections|products)/[^"''\s<>()]+)|(?:src|href|poster|data-src|data-original)=["''](?<path>/cdn/shop/(?:files|collections|products)/[^"''?#]+)'
$paths = [regex]::Matches($html, $pattern) |
  ForEach-Object { ($_.Groups['path'].Value -split '[?#]')[0] } |
  Where-Object { $_ } |
  Sort-Object -Unique

$results = $paths | ForEach-Object -Parallel {
  $path = $_
  $destination = Join-Path $using:SourceRoot ($path.TrimStart('/') -replace '/', '\\')
  if (Test-Path -LiteralPath $destination) {
    return [pscustomobject]@{ Path = $path; Status = 'existing' }
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  try {
    Invoke-WebRequest -Uri ($using:Origin + $path) -OutFile $destination -MaximumRedirection 5 -TimeoutSec 30 -ErrorAction Stop
    [pscustomobject]@{ Path = $path; Status = 'downloaded' }
  } catch {
    [pscustomobject]@{ Path = $path; Status = 'failed' }
  }
} -ThrottleLimit 12

$downloaded = @($results | Where-Object Status -eq 'downloaded').Count
$skipped = @($results | Where-Object Status -eq 'existing').Count
$failed = @($results | Where-Object Status -eq 'failed' | Select-Object -ExpandProperty Path)

[pscustomobject]@{
  Requested = $paths.Count
  Downloaded = $downloaded
  Existing = $skipped
  Failed = @($failed).Count
  FailedPaths = $failed
} | ConvertTo-Json -Depth 3
