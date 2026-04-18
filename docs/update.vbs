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
'   0. Sleep 3s pour laisser stakk.exe s'auto-exit (wscript tourne comme
'      son enfant — un taskkill /T ici nous tuerait nous-mêmes)
'   1. Kill stakk.exe (sans /T pour épargner les Dofus en cours)
'   2. Backup stakk.exe → stakk.old.exe (rename, fiable même si handle resté)
'   3. Extract update.zip → update-tmp/
'   4. Robocopy update-tmp → appDir (retries auto sur locks, idéal OneDrive)
'   5. Validation taille du nouvel exe (rollback+relaunch sur échec)
'   6. Cleanup tmp + zip
'   7. Relaunch via WshShell.Run direct (Wait=False → détaché)
'   8. Attendre jusqu'à 12s que le nouveau process apparaisse ; retry 1x
'   9. Si tout échoue : rollback complet + relaunch backup + msgbox

On Error Resume Next
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
logPath = appDir & "\update.log"
oldExe = appDir & "\stakk.exe"
backupExe = appDir & "\stakk.old.exe"
zipPath = appDir & "\update.zip"
' CRITIQUE : tmpDir DOIT être hors OneDrive. Si appDir est dans OneDrive (ex:
' C:\Users\...\OneDrive\Bureau\stakk), écrire update-tmp/ à côté = OneDrive
' intercepte l'extract, marque les fichiers comme cloud-only placeholders,
' et robocopy les skip silencieusement (exit 2, rien copié). Utiliser %TEMP%
' garantit que l'extract se passe sur un disque local normal.
tmpDir = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\stakk-update-tmp"

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

' Helper : attend jusqu'à waitSec secondes que stakk.exe apparaisse dans tasklist.
'          Poll toutes les 2s. Retourne True si trouvé.
Function WaitForStakk(waitSec)
  Dim waited
  waited = 0
  Do While waited < waitSec
    If StakkRunning() Then
      WaitForStakk = True
      Exit Function
    End If
    WScript.Sleep 2000
    waited = waited + 2
  Loop
  WaitForStakk = False
End Function

' Helper : restaure le backup et relance stakk. Utilisé dans tous les paths
'          d'erreur pour éviter de laisser l'user sans stakk fonctionnel.
Sub RollbackAndRelaunch(reason)
  LogMsg "Rollback: " & reason
  If fso.FileExists(backupExe) Then
    If fso.FileExists(oldExe) Then fso.DeleteFile oldExe, True
    fso.MoveFile backupExe, oldExe
    WshShell.CurrentDirectory = appDir
    WshShell.Run Chr(34) & oldExe & Chr(34), 1, False
    LogMsg "Backup restauré et relancé"
  Else
    LogMsg "!! Pas de backup à restaurer"
  End If
End Sub

fso.CreateTextFile(logPath, True).Close
LogMsg "=== Update start (external v4) ==="
LogMsg "appDir: " & appDir
LogMsg "tmpDir: " & tmpDir

' 0) Laisser stakk.exe s'auto-exit (setTimeout 500ms côté updater.js).
'    CRITIQUE : wscript.exe tourne comme ENFANT de stakk.exe ; si on faisait
'    taskkill /T à ce stade, Windows walk le tree depuis stakk.exe et tue
'    wscript (nous) avec. Symptôme : log stoppe pile à "Killing...", aucune
'    étape suivante ne s'exécute. D'où le sleep + pas de /T.
LogMsg "Waiting for stakk.exe to self-exit (3s)..."
WScript.Sleep 3000

' 1) Kill stakk.exe si toujours là (normalement plus présent après self-exit).
'    PAS de /T : on ne veut pas tuer wscript ni les Dofus lancés par l'user.
LogMsg "Killing stakk.exe (if still running)..."
RunWait "taskkill /IM stakk.exe /F"
WScript.Sleep 2000

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

' Sanity check : vérifier que l'extraction a produit stakk.exe dans tmpDir
tmpNewExe = tmpDir & "\stakk.exe"
If Not fso.FileExists(tmpNewExe) Then
  LogMsg "!! stakk.exe absent de tmpDir après extract"
  RollbackAndRelaunch "extraction a échoué — stakk.exe introuvable dans tmpDir"
  MsgBox "Mise à jour échouée (extraction). Version précédente relancée.", 48, "STAKK"
  WScript.Quit
End If
Set fTmpExe = fso.GetFile(tmpNewExe)
LogMsg "Extracted stakk.exe size: " & fTmpExe.Size

' 3b) Strip Mark-of-the-Web des fichiers extraits. Sinon : le zip vient de GitHub
'     (flag Internet dans le stream Zone.Identifier), l'extract propage le flag
'     à chaque fichier, le nouvel exe déclenche SmartScreen + un scan Defender
'     complet de 62 MB au premier launch → boot peut prendre 30-60s → notre
'     wait 22s rate → rollback abusif d'une update qui aurait marché.
LogMsg "Unblock-File (strip MotW)..."
RunWait "powershell -NoProfile -Command ""Get-ChildItem -Path '" & tmpDir & "' -File -Recurse | Unblock-File"""

' 4) Copy via robocopy (résilient aux locks OneDrive/AV).
'    /NJS retiré pour voir les stats (nb fichiers copiés/skippés).
LogMsg "Copying new files..."
rc = RunWait("cmd /c robocopy """ & tmpDir & """ """ & appDir & """ /E /R:5 /W:2 /NP /NDL /NFL /NJH")
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
  If fso.FileExists(oldExe) Then fso.DeleteFile oldExe, True
  RollbackAndRelaunch "nouvel exe invalide ou absent"
  MsgBox "Mise à jour impossible (exe invalide). Version précédente restaurée et relancée.", 48, "STAKK"
  WScript.Quit
End If

' 6) Cleanup
RunWait "cmd /c rmdir /S /Q """ & tmpDir & """"
RunWait "cmd /c del /Q """ & zipPath & """"

' 7) Relaunch direct (sans cmd /c start pour éviter les soucis de quoting).
'    WshShell.Run avec Wait=False détache proprement le process enfant.
WshShell.CurrentDirectory = appDir
LogMsg "Relaunch: " & oldExe
WshShell.Run Chr(34) & oldExe & Chr(34), 1, False

' 8) Attendre jusqu'à 30s que stakk apparaisse dans tasklist. On est généreux
'    parce que : (a) cold boot d'un exe pkg-ed de 62 MB, (b) Defender premier-
'    scan (même avec MotW strippé, le premier exec d'un fichier récemment
'    modifié déclenche un scan), (c) pkg extrait ses assets dans %TEMP% au
'    premier run. 30s couvre les cas lents sans frustrer sur machine rapide.
If Not WaitForStakk(30) Then
  LogMsg "!! pas dans tasklist après 30s, retry relaunch..."
  WshShell.Run Chr(34) & oldExe & Chr(34), 1, False
  If Not WaitForStakk(20) Then
    LogMsg "!! 2e tentative échoue, rollback"
    RollbackAndRelaunch "nouvelle version ne démarre pas après 50s"
    MsgBox "La mise à jour a échoué (nouvelle version ne démarre pas). Version précédente restaurée." & vbCrLf & vbCrLf & "Logs : " & logPath, 48, "STAKK"
    WScript.Quit
  End If
End If
LogMsg "stakk.exe est up"

' 10) Cleanup backup (le nouvel exe tourne, on peut supprimer)
If fso.FileExists(backupExe) Then
  Err.Clear
  fso.DeleteFile backupExe, True
  If Err.Number <> 0 Then LogMsg "Backup cleanup deferred (locked)"
End If

LogMsg "Done (success)"
