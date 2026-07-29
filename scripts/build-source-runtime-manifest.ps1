param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\static-mirror\dotcomcanvas.de'),
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\source-runtime-manifest.json')
)

$assetsRoot = Join-Path $SourceRoot 'cdn\shop\t\132\assets'
$manifest = Get-ChildItem -LiteralPath $assetsRoot -File -Include *.css, *.js | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA1 -LiteralPath $_.FullName).Hash.Substring(0, 12).ToLowerInvariant()
  [pscustomobject]@{
    sourcePath = "/cdn/shop/t/132/assets/$($_.Name)"
    localPath = $_.FullName
    uploadName = "dcc-$hash-$($_.Name)"
    mimeType = if ($_.Extension -eq '.css') { 'text/css' } else { 'application/javascript' }
    size = $_.Length
  }
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "manifest=$OutputPath count=$($manifest.Count)"
