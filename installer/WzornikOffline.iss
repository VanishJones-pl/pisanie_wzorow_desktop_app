#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\dist\WzornikOffline"
#endif
#ifndef OutputDir
  #define OutputDir "..\dist"
#endif

[Setup]
AppId={{D4B3B9D2-7E5E-4F3A-8C12-9A6A1A2D7C01}
AppName=Wzornik Offline
AppVersion={#AppVersion}
AppPublisher=VanishJones-pl
AppPublisherURL=https://github.com/VanishJones-pl/pisanie_wzorow_desktop_app
DefaultDirName={localappdata}\Programs\Wzornik Offline
DefaultGroupName=Wzornik Offline
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=WzornikOffline-Setup
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\WzornikOffline.exe

[Languages]
Name: "polish"; MessagesFile: "compiler:Languages\Polish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Wzornik Offline"; Filename: "{app}\WzornikOffline.exe"
Name: "{autodesktop}\Wzornik Offline"; Filename: "{app}\WzornikOffline.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\WzornikOffline.exe"; Description: "{cm:LaunchProgram,Wzornik Offline}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: files; Name: "{app}\.runtime-url"
