using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Wzornik Offline")]
[assembly: AssemblyDescription("Offline narzędzie do odręcznego zapisywania i rozpoznawania wzorów")]
[assembly: AssemblyProduct("Wzornik Offline")]
[assembly: AssemblyVersion("1.0.2.0")]

namespace WzornikLauncher
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string serverScript = Path.Combine(appDir, "server.js");
            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "Nie znaleziono pliku server.js w katalogu aplikacji.",
                    "Wzornik Offline",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            string nodePath = FindNode(appDir);
            if (string.IsNullOrEmpty(nodePath))
            {
                MessageBox.Show(
                    "Nie znaleziono środowiska Node.js (runtime\\node.exe).",
                    "Wzornik Offline",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            string urlFile = Path.Combine(appDir, ".runtime-url");
            try
            {
                if (File.Exists(urlFile)) File.Delete(urlFile);
            }
            catch { }

            Process nodeProc;
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = "\"" + serverScript + "\" --standalone",
                    WorkingDirectory = appDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                nodeProc = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Nie udało się uruchomić serwera aplikacji:\n" + ex.Message,
                    "Wzornik Offline",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            string url = null;
            for (int i = 0; i < 100; i++)
            {
                Thread.Sleep(100);
                if (nodeProc != null && nodeProc.HasExited)
                {
                    break;
                }
                if (File.Exists(urlFile))
                {
                    try
                    {
                        string content = File.ReadAllText(urlFile).Trim();
                        if (!string.IsNullOrEmpty(content))
                        {
                            url = content;
                            break;
                        }
                    }
                    catch { }
                }
            }

            if (string.IsNullOrEmpty(url))
            {
                MessageBox.Show(
                    "Nie udało się uruchomić lokalnego serwera aplikacji.",
                    "Wzornik Offline",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            LaunchBrowser(url);
        }

        private static string FindNode(string appDir)
        {
            string bundled = Path.Combine(appDir, "runtime", "node.exe");
            if (File.Exists(bundled)) return bundled;

            string programFilesNode = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(programFilesNode)) return programFilesNode;

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string winGetPkgs = Path.Combine(localAppData, "Microsoft", "WinGet", "Packages");
            if (Directory.Exists(winGetPkgs))
            {
                try
                {
                    foreach (string pkgDir in Directory.GetDirectories(winGetPkgs, "OpenJS.NodeJS*"))
                    {
                        foreach (string innerDir in Directory.GetDirectories(pkgDir))
                        {
                            string candidate = Path.Combine(innerDir, "node.exe");
                            if (File.Exists(candidate)) return candidate;
                        }
                    }
                }
                catch { }
            }

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in pathEnv.Split(';'))
            {
                if (string.IsNullOrWhiteSpace(dir)) continue;
                try
                {
                    string candidate = Path.Combine(dir.Trim(), "node.exe");
                    if (File.Exists(candidate)) return candidate;
                }
                catch { }
            }

            return null;
        }

        private static void LaunchBrowser(string url)
        {
            string[] edgeCandidates =
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            };

            foreach (string edge in edgeCandidates)
            {
                if (File.Exists(edge))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = edge,
                        Arguments = "--app=\"" + url + "\" --window-size=1280,820",
                        UseShellExecute = false
                    });
                    return;
                }
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
    }
}

