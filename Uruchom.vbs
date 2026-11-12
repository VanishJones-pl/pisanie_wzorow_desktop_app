Option Explicit

Dim fso, shell, appDir, nodePath, urlFile, ts, url, i, edgePath, localAppData

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir
urlFile = appDir & "\.runtime-url"

If fso.FileExists(urlFile) Then
  fso.DeleteFile urlFile, True
End If

Function FindNode()
  Dim candidate, winGetRoot, subFolder, exePath
  candidate = appDir & "\runtime\node.exe"
  If fso.FileExists(candidate) Then FindNode = candidate : Exit Function

  candidate = "C:\Program Files\nodejs\node.exe"
  If fso.FileExists(candidate) Then FindNode = candidate : Exit Function

  localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
  winGetRoot = localAppData & "\Microsoft\WinGet\Packages"
  If fso.FolderExists(winGetRoot) Then
    For Each subFolder In fso.GetFolder(winGetRoot).SubFolders
      If InStr(1, subFolder.Name, "OpenJS.NodeJS", vbTextCompare) > 0 Then
        Dim innerFolder
        For Each innerFolder In subFolder.SubFolders
          exePath = innerFolder.Path & "\node.exe"
          If fso.FileExists(exePath) Then FindNode = exePath : Exit Function
        Next
      End If
    Next
  End If

  If shell.Run("cmd /c where node >nul 2>&1", 0, True) = 0 Then
    FindNode = "node"
    Exit Function
  End If

  FindNode = ""
End Function

nodePath = FindNode()
If nodePath = "" Then
  MsgBox "Nie znaleziono srodowiska Node.js (node.exe).", vbCritical, "Wzornik Offline"
  WScript.Quit 1
End If

shell.Run """" & nodePath & """ """ & appDir & "\server.js"" --standalone", 0, False

url = ""
For i = 1 To 80
  WScript.Sleep 100
  If fso.FileExists(urlFile) Then
    On Error Resume Next
    Set ts = fso.OpenTextFile(urlFile, 1)
    url = Trim(ts.ReadAll)
    ts.Close
    On Error GoTo 0
    If url <> "" Then Exit For
  End If
Next

If url = "" Then
  MsgBox "Nie udalo sie uruchomic lokalnego serwera aplikacji.", vbCritical, "Wzornik Offline"
  WScript.Quit 1
End If

edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
  edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

If fso.FileExists(edgePath) Then
  shell.Run """" & edgePath & """ --app=""" & url & """ --window-size=1280,820", 1, False
Else
  shell.Run """" & url & """", 1, False
End If

