param(
  [string]$RepositoryRoot = (Join-Path $PSScriptRoot '..'),
  [string]$FilesCdnBase = 'https://cdn.shopify.com/s/files/1/1004/8690/5937/files'
)

$media = Get-Content -Raw (Join-Path $RepositoryRoot 'source-migration-manifest.json') | ConvertFrom-Json
$runtime = Get-Content -Raw (Join-Path $RepositoryRoot 'source-runtime-manifest.json') | ConvertFrom-Json
$map = @{}
foreach ($item in @($media) + @($runtime)) {
  $map[$item.sourcePath] = "$FilesCdnBase/$($item.uploadName)"
}

$sourcePath = Join-Path $RepositoryRoot 'static-mirror\dotcomcanvas.de\index.html'
$html = [System.IO.File]::ReadAllText($sourcePath)
# The source serializes some image URLs inside JSON as `\/`; ordinary slash is valid in those strings.
$html = $html -replace '\\/', '/'
$pattern = '(?i)(?:https?:)?//dotcomcanvas\.de(?<path>/cdn/shop/(?:files|collections|products|t/132/assets)/[^"''\s<>()]+)|(?<quote>["''])(?<path>/cdn/shop/(?:files|collections|products|t/132/assets)/[^"''\s<>()]+)'
$html = [regex]::Replace($html, $pattern, {
  param($match)
  $rawPath = $match.Groups['path'].Value
  $parts = $rawPath -split '[?#]', 2
  $mapped = $map[$parts[0]]
  if (-not $mapped) { return $match.Value }
  $suffix = if ($rawPath.Length -gt $parts[0].Length) { $rawPath.Substring($parts[0].Length) } else { '' }
  if ($match.Groups['quote'].Success) { return $match.Groups['quote'].Value + $mapped + $suffix }
  return $mapped + $suffix
})

# Remaining site URLs are navigation or telemetry endpoints. Keep navigation local and block origin-only telemetry.
$html = $html -replace '(?i)https?://dotcomcanvas\.de', ''
$html = $html -replace '(?i)//dotcomcanvas\.de', ''
$html = $html -replace 'Shopify\.cdnHost\s*=\s*"dotcomcanvas\.de/cdn"', 'Shopify.cdnHost = "cdn.shopify.com"'
$headPosition = $html.IndexOf('<head>')
$bodyClose = $html.LastIndexOf('</body>')
if ($headPosition -lt 0 -or $bodyClose -lt 0) { throw 'Original document structure could not be located.' }
$html = $html.Insert($headPosition + 6, "`r`n<base href='https://test-app-english.myshopify.com/'>")
$bodyClose = $html.LastIndexOf('</body>')
$reporter = @'
<script>
(function () {
  function reportHeight() {
    var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'source-homepage-height', height: height }, '*');
  }
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.documentElement);
  window.setInterval(reportHeight, 1000);
  reportHeight();
})();
</script>
'@
$html = $html.Insert($bodyClose, $reporter)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $RepositoryRoot 'assets\source-homepage.html'), $html, $utf8NoBom)
$map.GetEnumerator() | Sort-Object Name | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $RepositoryRoot 'source-asset-map.json') -Encoding utf8
Write-Output "mapped=$($map.Count) remainingOriginReferences=$(([regex]::Matches($html, '(?i)dotcomcanvas\.de')).Count)"
