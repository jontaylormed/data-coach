# Builds the hosted Data Coach: one self-contained HTML file (no outside requests),
# plus a test page that runs the engine tests in a browser.
# Run:  powershell -ExecutionPolicy Bypass -File build.ps1

$root = $PSScriptRoot
$src = Join-Path $root 'src'
$outDir = $root
$utf8 = New-Object Text.UTF8Encoding $false
. (Join-Path $root 'tools\contrast.ps1')
function Read-Src([string]$name) { [IO.File]::ReadAllText((Join-Path $src $name), $utf8) }

# The engine, in load order: random data and scenarios, the measures and checking, the levels.
$engine = (@('data.js', 'pics.js', 'stats.js', 'tasks.js', 'tasks-displays.js', 'tasks-spread.js', 'tasks-shape.js', 'mistakes.js') | ForEach-Object { Read-Src $_ }) -join "`n"
$style = Read-Src 'style.css'; $template = Read-Src 'template.html'; $ui = (@('charts.js', 'ui.js') | ForEach-Object { Read-Src $_ }) -join "`n"
$app = $template.Replace('/*STYLE*/', $style).Replace('/*ENGINE*/', $engine).Replace('/*UI*/', $ui)

$tests = @"
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Data Coach tests</title></head>
<body style="font-family:system-ui,sans-serif;max-width:900px;margin:16px auto;padding:0 16px;">
<h1 style="font-size:1.3rem;">Data Coach engine tests</h1>
<div id="results">Running...</div>
<script>$engine</script>
<script>$(Read-Src 'tests.js')</script>
</body></html>
"@

[void](New-Item -ItemType Directory -Force $outDir)
[IO.File]::WriteAllText((Join-Path $outDir 'index.html'), $app, $utf8)
[IO.File]::WriteAllText((Join-Path $outDir 'tests.html'), $tests, $utf8)
"Wrote index.html ($([math]::Round($app.Length / 1KB)) KB) and tests.html"

# The tool must not reach the network or store anything.
$bad = [regex]::Matches($app, 'https?://|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.sendBeacon|<link |src="') | ForEach-Object { $_.Value } | Sort-Object -Unique
if ($bad) { "PRIVACY CHECK FAILED: $($bad -join ', ')" } else { 'Privacy check passed: no network, storage, cookies or outside files.' }

# Contrast: text 4.5:1 on every background it sits on; borders and focus rings 3:1.
$vars = @{}
foreach ($m in [regex]::Matches($style, '--([\w-]+):\s*(#[0-9a-fA-F]{6})')) { $vars[$m.Groups[1].Value] = $m.Groups[2].Value }
$pairs = @(
  @('text', 'cream', 4.5), @('text', 'card', 4.5), @('muted', 'card', 4.5), @('muted', 'cream', 4.5), @('accent', 'card', 4.5), @('accent', 'accent-bg', 4.5)
  @('title', 'cream', 4.5), @('heading', 'cream', 4.5), @('paper', 'primary', 4.5), @('paper', 'primary-hover', 4.5)
  @('ok', 'ok-bg', 4.5), @('bad', 'bad-bg', 4.5), @('warn', 'warn-bg', 4.5), @('bad', 'card', 4.5)
  @('border', 'card', 3), @('accent', 'cream', 3), @('text', 'panel', 4.5), @('muted', 'panel', 4.5), @('text', 'accent-bg', 4.5), @('ok', 'card', 4.5)
  @('mark', 'card', 3), @('title', 'card', 4.5)
)
$contrastFail = @()
foreach ($c in $pairs) {
  $r = Get-Contrast $vars[$c[0]] $vars[$c[1]]
  if ($r -lt $c[2]) { $contrastFail += "--$($c[0]) on --$($c[1]) is $([math]::Round($r, 2)), needs $($c[2])" }
}
if ($contrastFail) { $contrastFail | ForEach-Object { "CONTRAST FAILED: $_" } } else { "Contrast check passed: $($pairs.Count) pairs." }

# Button, label and heading text: Title Case, and no arrows.
# Built from code points so this file stays ASCII (PowerShell 5.1 misreads other characters).
$arrows = '[' + [char]0x2190 + '-' + [char]0x21ff + [char]0xbb + [char]0x203a + ']'
$small = 'a|an|and|as|at|but|by|for|in|of|on|or|the|to|is'
$caseFail = @()
foreach ($m in [regex]::Matches(($template + $ui), '<(button|summary|h2)[^>]*>([A-Za-z][^<$]*)</')) {
  $text = $m.Groups[2].Value.Trim()
  $words = $text -split '\s+'
  for ($i = 0; $i -lt $words.Count; $i++) {
    $w = $words[$i] -replace '[^A-Za-z]', ''
    if (-not $w) { continue }
    if ($i -gt 0 -and $w -cmatch "^($small)$") { continue }
    if ($w -cnotmatch '^[A-Z0-9]') { $caseFail += "'$text'"; break }
  }
  if ($text -match $arrows) { $caseFail += "'$text' has an arrow" }
}
if ($caseFail) { $caseFail | Sort-Object -Unique | ForEach-Object { "TITLE CASE FAILED: $_" } } else { 'Title Case check passed.' }

# JavaScript syntax: every source file must parse (Windows' chakra.dll, through tools/jscheck.ps1). A missing bracket
# or a comment that swallows code would otherwise pass this build and only show up as a test page stuck on "Running...".
. (Join-Path $root 'tools\jscheck.ps1')
$jsFail = @(Get-ChildItem $src -Filter *.js | ForEach-Object { Test-JsSyntax (Read-Src $_.Name) $_.Name } | Where-Object { $_ })
if ($jsFail) { $jsFail | ForEach-Object { "SYNTAX CHECK FAILED: $_" } } else { "Syntax check passed: $(@(Get-ChildItem $src -Filter *.js).Count) JavaScript files parse." }

# PowerShell 5.1 reads scripts saved without a byte-order mark as ANSI, so any character outside
# ASCII in a .ps1 file is silently garbled. Every build script must stay ASCII.
$nonAscii = Get-ChildItem $root, (Join-Path $root 'tools') -Filter *.ps1 |
  Where-Object { [IO.File]::ReadAllBytes($_.FullName) | Where-Object { $_ -gt 127 } | Select-Object -First 1 } | ForEach-Object { $_.Name }
if ($nonAscii) { "ASCII CHECK FAILED: $($nonAscii -join ', ') (use HTML entities or [char] codes)" } else { 'ASCII check passed: every .ps1 file is plain ASCII.' }

if ($bad -or $contrastFail -or $caseFail -or $jsFail -or $nonAscii) { exit 1 }
