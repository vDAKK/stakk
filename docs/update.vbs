' STAKK — universal auto-updater (Windows)
' Hosted at https://vdakk.github.io/stakk/update.vbs
'
' Le client STAKK télécharge ce fichier puis le lance via wscript.exe.
' Comme ça, les bugs d'updater peuvent être corrigés SANS rebuild/redeploy du
' client — il suffit de mettre à jour ce fichier sur GitHub Pages.
'
' Contrat :
'   - update.vbs est placé dans le dossier de STAKK
'   - update.zip aussi (déjà téléchargé par le client)
'   - Aucun argument — le script se repère seul via son propre path
'
' Ce qu'il fait :
'   0. Sleep 3s pour laisser STAKK s'auto-exit (wscript tourne comme
'      son enfant — un taskkill /T ici nous tuerait nous-mêmes)
'   1. Kill STAKK (sans /T pour épargner les Dofus en cours)
'   2. Backup STAKK → stakk.old.exe (rename, fiable même si handle resté)
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

' Détection que stakk est up = il a fini son boot ET écoute sur :3000
' (le web server est l'ultime étape du boot). Beaucoup plus fiable que
' tasklist qui peut ne pas voir le process pour des raisons de session/UAC,
' et surtout ne dit pas si stakk a bien démarré vs s'il crashe juste après.
Function StakkRunning()
  Set exec = WshShell.Exec("cmd /c ""netstat -ano | findstr :3000 | findstr LISTENING""")
  If Len(Trim(exec.StdOut.ReadAll)) > 0 Then
    StakkRunning = True
    Exit Function
  End If
  ' Fallback tasklist au cas où netstat ne marche pas (rare, sandbox corp…)
  Set exec2 = WshShell.Exec("tasklist /FI ""IMAGENAME eq stakk.exe"" /FO CSV /NH")
  StakkRunning = (InStr(exec2.StdOut.ReadAll, "stakk.exe") > 0)
End Function

' Lance stakk.exe détaché. Essaie 3 méthodes en séquence : explorer.exe,
' puis WshShell.Run, puis powershell Start-Process. Log chaque tentative.
' explorer.exe en premier car c'est la méthode qui marche à tous les coups
' d'après les logs terrain — WshShell.Run direct échoue silencieusement dans
' certains contextes (session 0 / wscript élevé), alors qu'explorer lance le
' fichier comme si l'user avait double-cliqué (shell user = parent).
Sub LaunchStakk()
  LogMsg "Launch attempt 1 (explorer.exe)..."
  WshShell.CurrentDirectory = appDir
  WshShell.Run "explorer.exe " & Chr(34) & oldExe & Chr(34), 1, False
End Sub
Sub LaunchStakkFallback()
  LogMsg "Launch attempt 2 (WshShell.Run)..."
  WshShell.CurrentDirectory = appDir
  WshShell.Run Chr(34) & oldExe & Chr(34), 1, False
End Sub
Sub LaunchStakkPS()
  LogMsg "Launch attempt 3 (powershell Start-Process)..."
  RunWait "powershell -NoProfile -Command ""Start-Process -FilePath '" & oldExe & "' -WorkingDirectory '" & appDir & "'"""
End Sub

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
LogMsg "=== Update start (external v5) ==="
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

' 7) Relaunch — essai de 3 méthodes successives si les précédentes ne donnent rien.
'    Détection via port 3000 LISTENING (cf StakkRunning). On attend jusqu'à 30s
'    entre chaque tentative — cold boot + Defender scan d'un 62 MB peut prendre
'    ce temps-là.
LogMsg "Relaunch: " & oldExe
LaunchStakk
If Not WaitForStakk(30) Then
  LogMsg "!! stakk pas up après 30s, essai méthode 2..."
  LaunchStakkFallback
  If Not WaitForStakk(20) Then
    LogMsg "!! méthode 2 échoue, essai méthode 3..."
    LaunchStakkPS
    If Not WaitForStakk(20) Then
      LogMsg "!! 3 méthodes échouent, rollback"
      RollbackAndRelaunch "nouvelle version ne démarre pas (3 méthodes essayées)"
      MsgBox "La mise à jour a échoué (nouvelle version ne démarre pas). Version précédente restaurée." & vbCrLf & vbCrLf & "Logs : " & logPath, 48, "STAKK"
      WScript.Quit
    End If
  End If
End If
LogMsg "stakk.exe est up (port 3000 listening)"

' 10) Cleanup backup (le nouvel exe tourne, on peut supprimer)
If fso.FileExists(backupExe) Then
  Err.Clear
  fso.DeleteFile backupExe, True
  If Err.Number <> 0 Then LogMsg "Backup cleanup deferred (locked)"
End If

LogMsg "Done (success)"
