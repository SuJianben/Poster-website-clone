param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\static-mirror\dotcomcanvas.de'),
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\source-migration-manifest.json')
)

$html = [System.IO.File]::ReadAllText((Join-Path $SourceRoot 'index.html'))
$pattern = '(?i)(?:https?:)?//dotcomcanvas\.de(?<path>/cdn/shop/(?:files|collections|products)/[^"''\s<>()]+)|(?:src|href|poster|data-src|data-original)=["''](?<path>/cdn/shop/(?:files|collections|products)/[^"''?#]+)'
$paths = [regex]::Matches($html, $pattern) |
  ForEach-Object { ($_.Groups['path'].Value -split '[?#]')[0] } |
  Where-Object { $_ } |
  Sort-Object -Unique

$manifest = foreach ($path in $paths) {
  $localPath = Join-Path $SourceRoot ($path.TrimStart('/') -replace '/', '\\')
  if (-not (Test-Path -LiteralPath $localPath)) {
    throw "Missing source media: $path"
  }

  $hash = (Get-FileHash -Algorithm SHA1 -LiteralPath $localPath).Hash.Substring(0, 12).ToLowerInvariant()
  $fileName = Split-Path -Leaf $localPath
  [pscustomobject]@{
    sourcePath = $path
    localPath = $localPath
    uploadName = "dcc-$hash-$fileName"
    mimeType = switch ([IO.Path]::GetExtension($fileName).ToLowerInvariant()) {
      '.jpg' { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.png' { 'image/png' }
      '.webp' { 'image/webp' }
      '.avif' { 'image/avif' }
      default { 'application/octet-stream' }
    }
    size = (Get-Item -LiteralPath $localPath).Length
  }
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "manifest=$OutputPath count=$($manifest.Count)"
