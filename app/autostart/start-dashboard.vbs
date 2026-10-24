' Starts the Time Activity dev server with no console window.
' Works from any location: the app folder is the parent of this script's folder.
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = appDir
sh.Run "cmd /c npm run dev", 0, False
