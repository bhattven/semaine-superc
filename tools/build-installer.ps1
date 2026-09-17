# Compile l'installateur Windows. Aucun SDK requis : on utilise le compilateur C#
# livré avec le .NET Framework, présent sur toute installation de Windows.
#
#   powershell -ExecutionPolicy Bypass -File tools\build-installer.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path $csc)) { throw "csc.exe introuvable — .NET Framework 4.x absent ?" }

# L'icône est générée depuis la même source que celles de la PWA.
python tools\make_icons.py icons
if ($LASTEXITCODE -ne 0) { throw "generation des icones echouee" }

New-Item -ItemType Directory -Force -Path dist | Out-Null
$out = 'dist\FreshMeal-Setup.exe'

& $csc /nologo /target:winexe /platform:anycpu /optimize+ `
    "/out:$out" `
    /win32icon:icons\app.ico `
    /resource:icons\app.ico,app.ico `
    /r:System.dll /r:System.Windows.Forms.dll `
    installer\Setup.cs
if ($LASTEXITCODE -ne 0) { throw "compilation echouee" }

$size = (Get-Item $out).Length
Write-Output ("{0} — {1:N0} octets" -f $out, $size)
