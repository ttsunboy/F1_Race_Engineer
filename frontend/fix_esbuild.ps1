$ErrorActionPreference = 'Stop'
# Locate node_modules relative to this script (script lives in frontend/)
$frontend = Split-Path -Parent $MyInvocation.MyCommand.Path
$p = Join-Path $frontend 'node_modules\@esbuild\win32-x64\esbuild.exe'
if (-not (Test-Path $p)) {
    Write-Host 'esbuild binary missing - downloading from official registry...'
    $tgz = Join-Path $env:TEMP 'esb.tgz'
    Invoke-WebRequest -Uri 'https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.21.5.tgz' -OutFile $tgz -UseBasicParsing
    $dst = Join-Path $env:TEMP 'esb_x'
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    New-Item -ItemType Directory -Path $dst | Out-Null
    tar -xzf $tgz -C $dst
    Copy-Item (Join-Path $dst 'package\esbuild.exe') $p -Force
    Write-Host 'esbuild binary restored.'
} else {
    Write-Host 'esbuild binary OK.'
}
