' STAKK — universal auto-updater (Windows)
' Hosted at https://vdakk.github.io/stakk/update.vbs
'
' Le client stakk.exe télécharge ce fichier puis le lance via wscript.exe.
' Comme ça, les bugs d'updater peuvent être corrigés SANS rebuild/redeploy du
' client — il suffit de mettre à jour ce fichier sur GitHub Pages.
'
' Contrat :
'   - update.vbs est placé dans le dossier de stakk.exe
'   - update.zip aussi (déjà téléchargé par le client)
'   - Aucun argument — le script se repère seul via son propre path
'
' Ce qu'il fait :
'   1. Kill stakk.exe + tree
'   2. Backup stakk.exe → stakk.old.exe (rename, fiable même si handle resté)
'   3. Extract update.zip → update-tmp/
'   4. Robocopy update-tmp → appDir (retries auto sur locks, idéal OneDrive)
'   5. Validation taille du nouvel exe
'   6. Relaunch stakk.exe
'   7. Si relaunch échoue : rollback + msgbox
'   8. Cleanup backup + zip

On Error Resume Next
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
logPath = appDir & "\update.log"
oldExe = appDir & "\stakk.exe"
backupExe = appDir & "\stakk.old.exe"
zipPath = appDir & "\update.zip"
tmpDir = appDir & "\update-tmp"

Sub LogMsg(msg)
  Set f = fso.OpenTextFile(logPath, 8, True)
  f.WriteLine Now & " " & msg
  f.Close
End Sub

Function RunWait(cmd)
  LogMsg "  $ " & cmd
  RunWait = WshShell.Run(cmd, 0, True)
  LogMsg "    -> exit " & RunWait
End Function

Function StakkRunning()
  Set exec = WshShell.Exec("tasklist /FI ""IMAGENAME eq stakk.exe"" /FO CSV /NH")
  StakkRunning = (InStr(exec.StdOut.ReadAll, "stakk.exe") > 0)
End Function

fso.CreateTextFile(logPath, True).Close
LogMsg "=== Update start (external v1) ==="
LogMsg "appDir: " & appDir

' 1) Kill stakk.exe + descendants
LogMsg "Killing stakk.exe..."
RunWait "taskkill /IM stakk.exe /F /T"
WScript.Sleep 3000

' 2) Rename old stakk.exe → backup
If fso.FileExists(backupExe) Then
  LogMsg "Removing stale backup..."
  fso.DeleteFile backupExe, True
End If
If fso.FileExists(oldExe) Then
  LogMsg "Renaming current exe to backup..."
  For renameTry = 1 To 5
    Err.Clear
    fso.MoveFile oldExe, backupExe
    If Err.Number = 0 Then
      LogMsg "  renamed OK"
      Exit For
    End If
    LogMsg "  rename attempt " & renameTry & " failed: " & Err.Description
    WScript.Sleep 2000
  Next
End If

' 3) Extract update.zip
If Not fso.FileExists(zipPath) Then
  LogMsg "!! update.zip absent à " & zipPath
  MsgBox "Mise à jour: update.zip introuvable.", 48, "STAKK"
  WScript.Quit
End If
If fso.FolderExists(tmpDir) Then
  RunWait "cmd /c rmdir /S /Q """ & tmpDir & """"
End If
LogMsg "Extracting zip..."
RunWait "powershell -NoProfile -ExecutionPolicy Bypass -Command ""Expand-Archive -LiteralPath '" & zipPath & "' -DestinationPath '" & tmpDir & "' -Force"""

' 4) Copy via robocopy (résilient aux locks OneDrive/AV)
LogMsg "Copying new files..."
rc = RunWait("cmd /c robocopy """ & tmpDir & """ """ & appDir & """ /E /R:5 /W:2 /NP /NDL /NFL /NJH /NJS")
If rc >= 8 Then
  LogMsg "!! Robocopy failed (code " & rc & "). Fallback xcopy..."
  RunWait "cmd /c xcopy /E /Y /I /Q /R """ & tmpDir & "\*"" """ & appDir & """"
End If

' 5) Validation du nouvel exe
validOK = False
If fso.FileExists(oldExe) Then
  Set fNewExe = fso.GetFile(oldExe)
  LogMsg "New stakk.exe size: " & fNewExe.Size
  If fNewExe.Size > 10000000 Then validOK = True
End If
If Not validOK Then
  LogMsg "!! New exe invalide, rollback"
  If fso.FileExists(oldExe) Then fso.DeleteFile oldExe, True
  If fso.FileExists(backupExe) Then fso.MoveFile backupExe, oldExe
  MsgBox "Mise à jour impossible (exe invalide). Version précédente restaurée.", 48, "STAKK"
  WScript.Quit
End If

' 6) Cleanup
RunWait "cmd /c rmdir /S /Q """ & tmpDir & """"
RunWait "cmd /c del /Q """ & zipPath & """"

' 7) Relaunch
WshShell.CurrentDirectory = appDir
relaunchCmd = "cmd /c start """" /D """ & appDir & """ """ & oldExe & """"
LogMsg "Relaunch: " & relaunchCmd
WshShell.Run relaunchCmd, 0, False
WScript.Sleep 4000

' 8) Si ça n'a pas démarré, retry
If Not StakkRunning() Then
  LogMsg "!! not running after first attempt, retrying..."
  WshShell.Run relaunchCmd, 0, False
  WScript.Sleep 3000
End If

' 9) Si TOUJOURS pas démarré → rollback + relaunch backup
If Not StakkRunning() Then
  LogMsg "!! RELAUNCH FAILED after 2 attempts, rolling back"
  If fso.FileExists(backupExe) Then
    If fso.FileExists(oldExe) Then fso.DeleteFile oldExe, True
    fso.MoveFile backupExe, oldExe
    WshShell.Run relaunchCmd, 0, False
    WScript.Sleep 2500
    MsgBox "La mise à jour a échoué (nouvelle version ne démarre pas). Version précédente restaurée.", 48, "STAKK"
  Else
    MsgBox "La mise à jour a échoué et aucun backup disponible. Retélécharge STAKK depuis github.com/vDAKK/stakk/releases.", 16, "STAKK"
  End If
  LogMsg "Done (rollback)"
  WScript.Quit
End If

' 10) Cleanup backup (le nouvel exe tourne, on peut supprimer)
If fso.FileExists(backupExe) Then
  Err.Clear
  fso.DeleteFile backupExe, True
  If Err.Number <> 0 Then LogMsg "Backup cleanup deferred (locked)"
End If

LogMsg "Done (success)"
