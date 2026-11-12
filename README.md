# Wzornik Offline

Aplikacja desktopowa dla systemu Windows do odręcznego pisania i rozpoznawania wzorów matematycznych, fizycznych oraz metrologicznych — całkowicie **offline** (lokalny model AI ONNX).

## Pobieranie (bez instalowania Node.js i bez `npm install`)

Wejdź w zakładkę **[Releases](https://github.com/VanishJones-pl/pisanie_wzorow_desktop_app/releases)** po prawej stronie i pobierz jeden z plików:

- **`WzornikOffline-Setup.exe`** *(zalecane)* — klasyczny instalator Windows (bez uprawnień administratora, tworzy skrót na Pulpicie i w Menu Start).
- **`WzornikOffline-Portable-win-x64.zip`** — wersja przenośna: rozpakuj i kliknij `WzornikOffline.exe`.

> **Uwaga (SmartScreen):** Jeśli Windows przy pierwszym uruchomieniu wyświetli komunikat *„System Windows ochronił ten komputer”*, kliknij **Więcej informacji → Uruchom mimo to**.

## Uruchamianie ze źródeł (dla programistów)

```powershell
npm install
npm start
```

Budowanie paczki Portable lokalnie:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-portable.ps1 -ZipPath dist/WzornikOffline-Portable-win-x64.zip
```
