# Script para agregar standalone: false a Directivas, Componentes y Pipes de Angular
# Ejecutar desde la raiz del proyecto Angular

param(
    [string]$SourcePath = "src",
    [switch]$DryRun = $false
)

Write-Host "Buscando archivos TypeScript en: $SourcePath" -ForegroundColor Cyan
Write-Host "Modo: $(if($DryRun) { 'DRY RUN (solo mostrar cambios)' } else { 'APLICAR CAMBIOS' })" -ForegroundColor Yellow

# Contadores
$totalFiles = 0
$modifiedFiles = 0
$errors = 0

# Funcion para verificar si el archivo ya tiene standalone definido
function Has-Standalone($content) {
    return $content -match "standalone\s*:"
}

# Funcion para agregar standalone: false
function Add-Standalone($content, $decoratorType) {
    # Buscar el patron del decorador especifico
    $pattern = "@$decoratorType\s*\(\s*\{"
    
    if ($content -match $pattern) {
        # Si encuentra el decorador con {, agregar standalone despues de {
        $replacement = "@$decoratorType({`n    standalone: false,"
        $newContent = $content -replace "@$decoratorType\s*\(\s*\{", $replacement
        return $newContent
    } else {
        # Si el decorador esta en una linea simple como @Component()
        $simplePattern = "@$decoratorType\s*\(\s*\)"
        if ($content -match $simplePattern) {
            $replacement = "@$decoratorType({`n    standalone: false`n})"
            $newContent = $content -replace "@$decoratorType\s*\(\s*\)", $replacement
            return $newContent
        }
    }
    
    return $content
}

# Funcion para procesar un archivo
function Process-File($filePath) {
    try {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $originalContent = $content
        $modified = $false
        
        # Verificar si ya tiene standalone definido
        if (Has-Standalone $content) {
            Write-Host "  -> Ya tiene standalone definido" -ForegroundColor Gray
            return $false
        }
        
        # Lista de decoradores de Angular a buscar
        $decorators = @('Component', 'Directive', 'Pipe')
        
        foreach ($decorator in $decorators) {
            if ($content -match "@$decorator\s*\(") {
                Write-Host "  -> Encontrado @$decorator" -ForegroundColor Green
                $content = Add-Standalone $content $decorator
                $modified = $true
                break
            }
        }
        
        # Si se modifico el contenido y no es dry run, guardar el archivo
        if ($modified -and -not $DryRun) {
            Set-Content $filePath -Value $content -Encoding UTF8
            Write-Host "  -> Modificado y guardado" -ForegroundColor Green
        } elseif ($modified -and $DryRun) {
            Write-Host "  -> SERIA MODIFICADO (DRY RUN)" -ForegroundColor Yellow
        }
        
        return $modified
        
    } catch {
        Write-Host "  -> Error procesando archivo: $($_.Exception.Message)" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Verificar que existe el directorio source
if (-not (Test-Path $SourcePath)) {
    Write-Host "No se encontro el directorio: $SourcePath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Iniciando procesamiento..." -ForegroundColor Green
Write-Host ""

# Buscar todos los archivos .ts recursivamente
$tsFiles = Get-ChildItem -Path $SourcePath -Filter "*.ts" -Recurse | 
           Where-Object { $_.Name -notlike "*.spec.ts" -and $_.Name -notlike "*.d.ts" }

Write-Host "Encontrados $($tsFiles.Count) archivos TypeScript" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $tsFiles) {
    $totalFiles++
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\')
    
    Write-Host "[$totalFiles/$($tsFiles.Count)] $relativePath" -ForegroundColor White
    
    # Verificar si el archivo contiene decoradores de Angular
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match "@(Component|Directive|Pipe)\s*\(") {
        if (Process-File $file.FullName) {
            $modifiedFiles++
        }
    } else {
        Write-Host "  -> No contiene decoradores de Angular" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Resumen final
Write-Host "RESUMEN DE EJECUCION" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Archivos analizados: $totalFiles" -ForegroundColor White
Write-Host "Archivos modificados: $modifiedFiles" -ForegroundColor Green
Write-Host "Errores: $errors" -ForegroundColor Red

if ($DryRun) {
    Write-Host ""
    Write-Host "Para aplicar los cambios, ejecuta sin el parametro -DryRun:" -ForegroundColor Yellow
    Write-Host "   .\fix-angular-standalone.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green