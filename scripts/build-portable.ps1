param(
    [string]$OutputDir = "",
    [string]$ZipPath = "",
    [string]$NodeVersion = "24.19.0",
    [switch]$UseLocalNodeModules
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $RepoRoot "dist\WzornikOffline"
}

Write-Host "==> Budowanie paczki Portable w: $OutputDir"

if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# 1. Kopiowanie plikow aplikacji
$ItemsToCopy = @(
    "server.js",
    "package.json",
    "package-lock.json",
    "INSTRUKCJA.txt",
    "Uruchom.vbs",
    "Uruchom.bat",
    "public",
    "models"
)

foreach ($item in $ItemsToCopy) {
    $src = Join-Path $RepoRoot $item
    $dst = Join-Path $OutputDir $item
    if (-not (Test-Path $src)) {
        throw "Brak wymaganego pliku lub folderu: $src"
    }
    Copy-Item -Path $src -Destination $dst -Recurse -Force
}

# 2. Instalacja lub skopiowanie zaleznosci Node.js
$LocalNodeModules = Join-Path $RepoRoot "node_modules"
$DstNodeModules = Join-Path $OutputDir "node_modules"

if ($UseLocalNodeModules -and (Test-Path $LocalNodeModules)) {
    Write-Host "==> Kopiowanie lokalnego node_modules..."
    Copy-Item -Path $LocalNodeModules -Destination $DstNodeModules -Recurse -Force
} else {
    Write-Host "==> Instalacja zaleznosci produkcyjnych (npm ci --omit=dev)..."
    Push-Location $OutputDir
    try {
        npm ci --omit=dev --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci zakonczylo sie bledem ($LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }
}

# 3. Odchudzenie node_modules (tylko Windows x64, bez nieuzywanego onnxruntime-web)
Write-Host "==> Odchudzanie node_modules pod Windows x64..."
$PathsToRemove = @(
    (Join-Path $DstNodeModules "onnxruntime-web"),
    (Join-Path $DstNodeModules "@types")
)

$OrtBinDir = Join-Path $DstNodeModules "onnxruntime-node\bin"
if (Test-Path $OrtBinDir) {
    Get-ChildItem -Path $OrtBinDir -Directory | ForEach-Object {
        $PathsToRemove += (Join-Path $_.FullName "darwin")
        $PathsToRemove += (Join-Path $_.FullName "linux")
        $PathsToRemove += (Join-Path $_.FullName "win32\arm64")
    }
}

foreach ($p in $PathsToRemove) {
    if (Test-Path $p) {
        Remove-Item -Recurse -Force $p
    }
}

# 4. Dolaczenie przenosnego runtime\node.exe (Windows x64)
$RuntimeDir = Join-Path $OutputDir "runtime"
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
$TargetNodeExe = Join-Path $RuntimeDir "node.exe"

$CopiedSystemNode = $false
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $Arch = (& node -p "process.arch" 2>$null).Trim()
    if ($Arch -eq "x64" -and (Test-Path $NodeCmd.Source)) {
        Write-Host "==> Kopiowanie node.exe ($($NodeCmd.Source))..."
        Copy-Item -Path $NodeCmd.Source -Destination $TargetNodeExe -Force
        $CopiedSystemNode = $true
    }
}

if (-not $CopiedSystemNode) {
    $CacheDir = Join-Path $RepoRoot "build-cache"
    New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
    $NodeZipName = "node-v$NodeVersion-win-x64.zip"
    $NodeZipPath = Join-Path $CacheDir $NodeZipName
    if (-not (Test-Path $NodeZipPath)) {
        $NodeUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeZipName"
        Write-Host "==> Pobieranie $NodeUrl..."
        Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZipPath
    }
    $ExtractTmp = Join-Path $CacheDir "node-extract"
    if (Test-Path $ExtractTmp) { Remove-Item -Recurse -Force $ExtractTmp }
    Expand-Archive -Path $NodeZipPath -DestinationPath $ExtractTmp -Force
    $ExtractedExe = Join-Path $ExtractTmp "node-v$NodeVersion-win-x64\node.exe"
    if (-not (Test-Path $ExtractedExe)) {
        throw "Nie znaleziono node.exe w archiwum $NodeZipName"
    }
    Copy-Item -Path $ExtractedExe -Destination $TargetNodeExe -Force
    Remove-Item -Recurse -Force $ExtractTmp
}

# 5. Kompilacja launchera WzornikOffline.exe
$CscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $CscPath)) {
    $CscPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $CscPath)) {
    throw "Nie znaleziono kompilatora C# (csc.exe)."
}

$LauncherCs = Join-Path $RepoRoot "launcher\Launcher.cs"
$LauncherExe = Join-Path $OutputDir "WzornikOffline.exe"
Write-Host "==> Kompilacja launchera WzornikOffline.exe..."
& $CscPath /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll /out:"$LauncherExe" "$LauncherCs"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $LauncherExe)) {
    throw "Nie udalo sie skompilowac WzornikOffline.exe"
}

$TotalMB = [math]::Round(((Get-ChildItem -Recurse -File $OutputDir | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
Write-Host "==> Gotowe! Rozmiar paczki Portable: $TotalMB MB"

# 6. Opcjonalne pakowanie do archiwum ZIP
if (-not [string]::IsNullOrWhiteSpace($ZipPath)) {
    $ZipParent = Split-Path -Parent $ZipPath
    if (-not [string]::IsNullOrWhiteSpace($ZipParent)) {
        New-Item -ItemType Directory -Path $ZipParent -Force | Out-Null
    }
    if (Test-Path $ZipPath) {
        Remove-Item -Force $ZipPath
    }
    Write-Host "==> Tworzenie archiwum ZIP: $ZipPath"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $OutputDir,
        $ZipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $true
    )
    $ZipMB = [math]::Round(((Get-Item $ZipPath).Length / 1MB), 2)
    Write-Host "==> Archiwum utworzone ($ZipMB MB): $ZipPath"
}
