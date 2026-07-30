param(
  [string]$RepositoryRoot = (Join-Path $PSScriptRoot '..')
)

$sourcePath = Join-Path $RepositoryRoot 'assets\source-homepage.html'
$html = [IO.File]::ReadAllText($sourcePath)
$matches = [regex]::Matches($html, '<(?:div|section) id="shopify-section-[^"]+"')
if ($matches.Count -ne 22) { throw "Expected 22 source sections, found $($matches.Count)." }

$utf8 = [Text.UTF8Encoding]::new($false)
New-Item -ItemType Directory -Force -Path (Join-Path $RepositoryRoot 'snippets'), (Join-Path $RepositoryRoot 'sections'), (Join-Path $RepositoryRoot 'layout') | Out-Null

function Write-RawChunks([string]$name, [string]$content) {
  $chunkSize = 210000
  $position = 0
  $part = 1
  $snippets = @()
  while ($position -lt $content.Length) {
    $length = [Math]::Min($chunkSize, $content.Length - $position)
    if ($position + $length -lt $content.Length) {
      # Liquid wrappers add whitespace between chunks. Split only after complete
      # HTML nodes so a minified script or stylesheet is never corrupted.
      $window = $content.Substring($position, $length)
      $safeBreaks = [regex]::Matches($window, '</(?:script|style|template|section|div)>', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
      if ($safeBreaks.Count -eq 0) {
        throw "Unable to find a safe HTML boundary while splitting $name."
      }
      $lastBreak = $safeBreaks[$safeBreaks.Count - 1]
      $length = $lastBreak.Index + $lastBreak.Length
    }
    $snippet = "$name-$part"
    $value = "{% raw %}`r`n$($content.Substring($position, $length))`r`n{% endraw %}`r`n"
    [IO.File]::WriteAllText((Join-Path $RepositoryRoot "snippets\$snippet.liquid"), $value, $utf8)
    $snippets += $snippet
    $position += $length
    $part++
  }
  return $snippets
}

function Remove-SourceRuntime([string]$content) {
  # This is a static migration. Source theme scripts mutate the copied DOM and
  # require the original store's runtime, so retain the source HTML/CSS only.
  return [regex]::Replace($content, '(?is)<script\b[^>]*>.*?</script>', '')
}

function Write-Section([string]$name, [string]$content, [string]$label) {
  $chunks = Write-RawChunks "source-$name" $content
  $renders = ($chunks | ForEach-Object { "{% render '$_' %}" }) -join "`r`n"
  $section = @"
{% if section.settings.enabled %}
$renders
{% endif %}
{% schema %}
{
  "name": "$label",
  "settings": [
    { "type": "checkbox", "id": "enabled", "label": "Show section", "default": true }
  ],
  "presets": [{ "name": "$label" }]
}
{% endschema %}
"@
  [IO.File]::WriteAllText((Join-Path $RepositoryRoot "sections\source-$name.liquid"), $section, $utf8)
}

$segments = for ($index = 0; $index -lt $matches.Count; $index++) {
  $end = if ($index -lt $matches.Count - 1) { $matches[$index + 1].Index } else { $html.LastIndexOf('</body>') }
  Remove-SourceRuntime $html.Substring($matches[$index].Index, $end - $matches[$index].Index)
}

$names = @(
  'topbar', 'header', 'header-promotion', 'hero', 'promotion', 'bestsellers', 'canvas-deals',
  'gallery', 'personal', 'artists', 'collection-list', 'grid-banner', 'favorite-products',
  'announcement', 'collection-list-secondary', 'newsletter', 'footer-icons', 'footer',
  'footer-custom', 'cart-drawer', 'product-compare', 'spotlight-picks'
)
$labels = @(
  'Top bar', 'Header', 'Header promotion', 'Hero with product', 'Promotion', 'Best sellers', 'Canvas deals',
  'Customer gallery', 'Personal masterpiece', 'Meet the artists', 'Collection list', 'Grid banner', 'Favorite products',
  'Announcement', 'Secondary collection list', 'Newsletter', 'Footer icons', 'Footer',
  'Footer custom content', 'Cart drawer', 'Product compare', 'Spotlight picks'
)
for ($index = 0; $index -lt $segments.Count; $index++) {
  Write-Section $names[$index] $segments[$index] $labels[$index]
}

$headStart = $html.IndexOf('<head>') + 6
$headEnd = $html.IndexOf('</head>')
$htmlOpen = $html.Substring(0, $html.IndexOf('>', $html.IndexOf('<html')) + 1)
$sourceHead = $html.Substring($headStart, $headEnd - $headStart)

# The downloaded source already contains the original store's rendered
# content_for_header. Shopify injects an equivalent block for this store, so
# keeping both executes platform scripts twice and breaks the source runtime.
$legacyHeaderStart = $sourceHead.IndexOf("<script>window.performance && window.performance.mark && window.performance.mark('shopify.content_for_header.start');</script>")
if ($legacyHeaderStart -lt 0) {
  throw 'Could not find the source store content_for_header block.'
}
# Everything after this marker is Shopify platform/runtime code from the source
# store. The copied CSS is already above it, and this store supplies its own
# content_for_header below.
$sourceHead = $sourceHead.Substring(0, $legacyHeaderStart)
$sourceHead = Remove-SourceRuntime $sourceHead
$headChunks = Write-RawChunks 'source-document-head' $sourceHead
Get-ChildItem -Path (Join-Path $RepositoryRoot 'snippets') -Filter 'source-document-head-*.liquid' |
  Where-Object { $_.BaseName -notin $headChunks } |
  Remove-Item -Force
$headRenders = ($headChunks | ForEach-Object { "{% render '$_' %}" }) -join "`r`n"
$layout = @"
$htmlOpen
<head>
{{ content_for_header }}
$headRenders
</head>
<body>
{% sections 'header-group' %}
{{ content_for_layout }}
{% sections 'footer-group' %}
</body>
</html>
"@
[IO.File]::WriteAllText((Join-Path $RepositoryRoot 'layout\theme.liquid'), $layout, $utf8)

$headerGroup = @{
  name = 'Header group'
  type = 'header'
  sections = @{
    topbar = @{ type = 'source-topbar'; settings = @{ enabled = $true } }
    header = @{ type = 'source-header'; settings = @{ enabled = $true } }
    promotion = @{ type = 'source-header-promotion'; settings = @{ enabled = $true } }
  }
  order = @('topbar', 'header', 'promotion')
} | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText((Join-Path $RepositoryRoot 'sections\header-group.json'), $headerGroup, $utf8)

$footerGroup = @{
  name = 'Footer group'
  type = 'footer'
  sections = @{
    newsletter = @{ type = 'source-newsletter'; settings = @{ enabled = $true } }
    icons = @{ type = 'source-footer-icons'; settings = @{ enabled = $true } }
    footer = @{ type = 'source-footer'; settings = @{ enabled = $true } }
    custom = @{ type = 'source-footer-custom'; settings = @{ enabled = $true } }
    cart = @{ type = 'source-cart-drawer'; settings = @{ enabled = $true } }
    compare = @{ type = 'source-product-compare'; settings = @{ enabled = $true } }
    spotlight = @{ type = 'source-spotlight-picks'; settings = @{ enabled = $true } }
  }
  order = @('newsletter', 'icons', 'footer', 'custom', 'cart', 'compare', 'spotlight')
} | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText((Join-Path $RepositoryRoot 'sections\footer-group.json'), $footerGroup, $utf8)

$homeIndexes = 3..14
$homeSections = [ordered]@{}
$homeOrder = @()
foreach ($index in $homeIndexes) {
  $key = $names[$index]
  $homeSections[$key] = @{ type = "source-$key"; settings = @{ enabled = $true } }
  $homeOrder += $key
}
@{ sections = $homeSections; order = $homeOrder } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $RepositoryRoot 'templates\index.json') -Encoding utf8
Remove-Item -LiteralPath (Join-Path $RepositoryRoot 'sections\source-home.liquid') -Force -ErrorAction SilentlyContinue
Write-Output "Generated $($names.Count) source sections."
