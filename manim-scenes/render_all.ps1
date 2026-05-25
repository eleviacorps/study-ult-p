$CACHE_ROOT = "D:\Programming\Web\StudyUlt2\public\simulations\cache"
$SCENES_DIR = "D:\Programming\Web\StudyUlt2\manim-scenes"
$Quality = "low"
$qualityFlag = "-ql"

$sceneTypes = [ordered]@{
    "conic-sections" = @{ conic="circle" }
    "coulombs-law" = @{ q1=5; q2=-3; distance=4 }
    "derivative" = @{ a=2; b=-2; c=1; x0=1 }
    "doppler" = @{ "v-source"=0.8; frequency=1 }
    "electric-dipole" = @{ separation=3; "e-strength"=1 }
    "electric-field" = @{ charge=1; separation=3 }
    "gauss-law" = @{ charge=1; surface="sphere"; radius=2.5 }
    "graph" = @{ a=1; b=-2; c=1; xMin=-5; xMax=5 }
    "integration" = @{ "func-a"=2; "n-start"=4; "x-start"=0; "x-end"=4 }
    "kinematics" = @{ "v-initial"=10; acceleration=2 }
    "limits" = @{ point=2 }
    "molecular-structure" = @{ molecule="H2O" }
    "pendulum" = @{ length=2; gravity=9.8; damping=0.1 }
    "periodic-trends" = @{}
    "projectile" = @{ velocity=40; angle=45; gravity=9.8 }
    "pythagorean" = @{ "side-a"=3; "side-b"=4 }
    "reaction-kinetics" = @{ ea=50; "delta-h"=-30; catalyst=0 }
    "refraction" = @{ n1=1.0; n2=1.5; angle=45 }
    "shm" = @{ mass=1; "spring-k"=10; amplitude=1 }
    "unit-circle" = @{}
    "vectors-3d" = @{ ax=3; ay=1; az=2; bx=-1; by=2; bz=3 }
    "wave" = @{ amplitude=1; frequency=1; phase=0 }
}

function Get-CacheKey {
    param($type, $params)
    $sorted = $params.GetEnumerator() | Sort-Object Name
    $parts = @()
    foreach ($entry in $sorted) {
        $parts += "$($entry.Name)_$($entry.Value)"
    }
    return "$type__" + ($parts -join "__")
}

$total = $sceneTypes.Count
$success = 0
$failed = @()
$idx = 0

foreach ($kv in $sceneTypes.GetEnumerator()) {
    $type = $kv.Key
    $params = $kv.Value
    $idx++
    $cacheKey = Get-CacheKey -type $type -params $params
    $cacheDir = Join-Path $CACHE_ROOT $cacheKey
    $cachedMp4 = Join-Path $cacheDir "output.mp4"

    Write-Host "[$idx/$total] Rendering $type..."

    if (Test-Path $cachedMp4) {
        Write-Host "  Already cached, skipping."
        $success++
        continue
    }

    if (Test-Path $cacheDir) {
        Remove-Item -Path $cacheDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null

    # Step 1: Generate scene.py via render.py
    $renderArgs = @("$SCENES_DIR\render.py", "--type", $type, "--output", $cacheDir, "--quality", $Quality)
    foreach ($entry in $params.GetEnumerator()) {
        $renderArgs += "--$($entry.Name)"
        $renderArgs += [string]$entry.Value
    }

    Write-Host "  Generating script..."
    $result = & python $renderArgs 2>&1
    $jsonOut = $result -join "`n"
    try {
        $parsed = $jsonOut | ConvertFrom-Json
        if ($parsed.status -ne "script_written") {
            Write-Host "  FAILED: $jsonOut"
            $failed += $type; continue
        }
        $sceneClass = $parsed.scene_class
    } catch {
        Write-Host "  FAILED: render.py output not JSON: $jsonOut"
        $failed += $type; continue
    }

    $scenePath = Join-Path $cacheDir "scene.py"
    if (!(Test-Path $scenePath)) {
        Write-Host "  FAILED: scene.py not generated"
        $failed += $type; continue
    }

    # Step 2: Run manim render
    Write-Host "  Running manim for $sceneClass ..."
    $manimOutput = & python -m manim render $qualityFlag --format=mp4 --media_dir $cacheDir $scenePath $sceneClass 2>&1
    $manimText = $manimOutput -join "`n"

    if ($manimText -match "Traceback") {
        Write-Host "  FAILED: Manim error"
        $manimText -split "`n" | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" }
        $failed += $type; continue
    }

    # Step 3: Find MP4
    $mp4Files = Get-ChildItem -Path $cacheDir -Recurse -Filter "*.mp4" | Sort-Object Length -Descending
    if ($mp4Files.Count -eq 0) {
        Write-Host "  FAILED: no MP4 produced"
        $failed += $type; continue
    }

    $largest = $mp4Files[0]
    Copy-Item -Path $largest.FullName -Destination $cachedMp4 -Force
    Write-Host "  OK ($([math]::Round($largest.Length / 1KB, 0)) KB)"

    # Clean up
    $mediaDir = Join-Path $cacheDir "videos"
    if (Test-Path $mediaDir) { Remove-Item $mediaDir -Recurse -Force }
    $texDir = Join-Path $cacheDir "Tex"
    if (Test-Path $texDir) { Remove-Item $texDir -Recurse -Force }

    $success++
}

Write-Host "`n=== Render Complete ==="
Write-Host "Total: $total | Success: $success | Failed: $($failed.Count)"
if ($failed.Count -gt 0) {
    Write-Host "Failed: $($failed -join ', ')"
}
