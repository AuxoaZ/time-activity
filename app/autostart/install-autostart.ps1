param([switch]$Remove)

# Adds (or removes with -Remove) a shortcut in the current user's Startup folder.
$startup = [Environment]::GetFolderPath("Startup")
$link = Join-Path $startup "Time Activity.lnk"

if ($Remove) {
  if (Test-Path $link) { Remove-Item $link; "Auto-start removed." } else { "Not installed." }
  return
}

$vbs = Join-Path $PSScriptRoot "start-dashboard.vbs"
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($link)
$s.TargetPath = "wscript.exe"
$s.Arguments = "`"$vbs`""
$s.WorkingDirectory = $PSScriptRoot
$s.Save()
"Auto-start installed: $link"
