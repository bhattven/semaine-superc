// Installateur de « FreshMeal » pour Windows.
//
// Ne contient pas de moteur web : il installe une icône, un raccourci au menu
// Démarrer et sur le Bureau qui lancent l'app en mode application dans Edge
// (fenêtre propre, sans barre d'adresse), plus une entrée de désinstallation.
// Le hors-ligne et les mises à jour de contenu restent gérés par le service
// worker du site, exactement comme pour l'installation via le bouton d'Edge.
//
// Compilation : voir tools\build-installer.ps1
//
// Arguments : /uninstall   retire raccourcis, fichiers et entrée de désinstallation
//             /dry-run     n'écrit rien, journalise seulement ce qui serait fait
//             /quiet       aucune boîte de dialogue (le journal reste écrit)

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

static class Setup
{
    const string AppName = "FreshMeal";
    const string AppKey = "FreshMeal";
    const string Url = "https://bhattven.github.io/semaine-superc/";
    const string Version = "1.0.0";
    const string Publisher = "Usage personnel";

    static readonly StringBuilder Log = new StringBuilder();
    static bool dryRun, quiet;

    static string InstallDir
    {
        get
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                Path.Combine("Programs", AppKey));
        }
    }

    static string StartMenuLink
    {
        get
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                AppName + ".lnk");
        }
    }

    static string DesktopLink
    {
        get
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
                AppName + ".lnk");
        }
    }

    static string UninstallKeyPath
    {
        get { return @"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + AppKey; }
    }

    static string LogPath
    {
        get { return Path.Combine(Path.GetTempPath(), AppKey + "-setup.log"); }
    }

    [STAThread]
    static int Main(string[] args)
    {
        bool uninstall = false;
        foreach (string a in args)
        {
            string f = a.TrimStart('-', '/').ToLowerInvariant();
            if (f == "uninstall" || f == "u") uninstall = true;
            else if (f == "dry-run" || f == "dryrun" || f == "n") dryRun = true;
            else if (f == "quiet" || f == "q" || f == "s" || f == "silent") quiet = true;
        }

        Say(AppName + " " + Version + (dryRun ? "  [SIMULATION]" : ""));
        Say(uninstall ? "Mode : desinstallation" : "Mode : installation");

        int code;
        try
        {
            code = uninstall ? Uninstall() : Install();
        }
        catch (Exception ex)
        {
            Say("ECHEC : " + ex.Message);
            Finish("L'installation a échoué :\n\n" + ex.Message, MessageBoxIcon.Error);
            return 1;
        }

        if (code == 0)
        {
            Finish(uninstall
                ? AppName + " a été retiré.\n\nTes listes cochées restent dans Edge."
                : AppName + " est installé.\n\nTu le trouveras au menu Démarrer et sur le Bureau.",
                MessageBoxIcon.Information);
        }
        return code;
    }

    // ---------------------------------------------------------------- install

    static int Install()
    {
        string browser = FindBrowser();
        if (browser == null)
        {
            Say("ECHEC : ni Edge ni Chrome n'ont ete trouves.");
            Finish("Microsoft Edge est introuvable sur ce PC.\n\n" +
                   "L'app s'ouvre dans Edge ou Chrome ; installe l'un des deux, puis relance ce fichier.",
                   MessageBoxIcon.Error);
            return 2;
        }
        Say("Navigateur : " + browser);

        Mkdir(InstallDir);

        string icoPath = Path.Combine(InstallDir, "app.ico");
        WriteResource("app.ico", icoPath);

        // On garde une copie de l'installateur pour que la desinstallation fonctionne.
        string selfSource = Assembly.GetExecutingAssembly().Location;
        string selfTarget = Path.Combine(InstallDir, "Setup.exe");
        if (!string.Equals(selfSource, selfTarget, StringComparison.OrdinalIgnoreCase))
            Copy(selfSource, selfTarget);

        MakeShortcut(StartMenuLink, browser, "--app=" + Url, icoPath);
        MakeShortcut(DesktopLink, browser, "--app=" + Url, icoPath);
        RegisterUninstall(selfTarget, icoPath);

        Say("Termine.");
        return 0;
    }

    static int Uninstall()
    {
        Delete(StartMenuLink);
        Delete(DesktopLink);

        if (dryRun) Say("[simule] suppression de HKCU\\" + UninstallKeyPath);
        else
        {
            try { Registry.CurrentUser.DeleteSubKeyTree(UninstallKeyPath, false); Say("Cle de desinstallation retiree."); }
            catch (Exception ex) { Say("Cle de desinstallation : " + ex.Message); }
        }

        Delete(Path.Combine(InstallDir, "app.ico"));

        // On ne peut pas s'effacer soi-meme pendant l'execution : on delegue a cmd.
        string self = Assembly.GetExecutingAssembly().Location;
        if (self.StartsWith(InstallDir, StringComparison.OrdinalIgnoreCase))
        {
            if (dryRun) Say("[simule] suppression differee de " + InstallDir);
            else
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe",
                    "/c ping 127.0.0.1 -n 3 >nul & del /q \"" + self + "\" & rmdir \"" + InstallDir + "\"");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process.Start(psi);
                Say("Suppression differee du dossier d'installation.");
            }
        }
        else Rmdir(InstallDir);

        Say("Termine.");
        return 0;
    }

    // ------------------------------------------------------------------ outils

    static string FindBrowser()
    {
        string[] regPaths =
        {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
        };
        foreach (string rp in regPaths)
        {
            foreach (RegistryKey root in new[] { Registry.LocalMachine, Registry.CurrentUser })
            {
                using (RegistryKey k = root.OpenSubKey(rp))
                {
                    if (k == null) continue;
                    string v = k.GetValue(null) as string;
                    if (!string.IsNullOrEmpty(v) && File.Exists(v)) return v;
                }
            }
        }

        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string[] guesses =
        {
            Path.Combine(pfx86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf,    @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pfx86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf,    @"Google\Chrome\Application\chrome.exe")
        };
        foreach (string g in guesses) if (File.Exists(g)) return g;
        return null;
    }

    static void MakeShortcut(string lnkPath, string target, string args, string icon)
    {
        if (dryRun) { Say("[simule] raccourci " + lnkPath); return; }

        Type shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null) throw new Exception("WScript.Shell est indisponible.");
        object shell = Activator.CreateInstance(shellType);

        object sc = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod,
                                           null, shell, new object[] { lnkPath });
        Type t = sc.GetType();
        t.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
        t.InvokeMember("Arguments", BindingFlags.SetProperty, null, sc, new object[] { args });
        t.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { icon + ",0" });
        t.InvokeMember("Description", BindingFlags.SetProperty, null, sc,
                       new object[] { "Menu de la semaine, liste d'épicerie, conservation et recettes" });
        t.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc,
                       new object[] { Path.GetDirectoryName(target) });
        t.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, new object[0]);

        Say("Raccourci cree : " + lnkPath);
    }

    static void RegisterUninstall(string selfTarget, string icoPath)
    {
        if (dryRun) { Say("[simule] entree Ajout/Suppression de programmes"); return; }

        using (RegistryKey k = Registry.CurrentUser.CreateSubKey(UninstallKeyPath))
        {
            k.SetValue("DisplayName", AppName);
            k.SetValue("DisplayVersion", Version);
            k.SetValue("Publisher", Publisher);
            k.SetValue("DisplayIcon", icoPath);
            k.SetValue("InstallLocation", InstallDir);
            k.SetValue("UninstallString", "\"" + selfTarget + "\" /uninstall");
            k.SetValue("QuietUninstallString", "\"" + selfTarget + "\" /uninstall /quiet");
            k.SetValue("URLInfoAbout", Url);
            k.SetValue("NoModify", 1, RegistryValueKind.DWord);
            k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            k.SetValue("EstimatedSize", 64, RegistryValueKind.DWord);
        }
        Say("Entree de desinstallation enregistree.");
    }

    static void WriteResource(string name, string dest)
    {
        if (dryRun) { Say("[simule] ecriture de " + dest); return; }
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        {
            if (s == null) throw new Exception("Ressource absente de l'exe : " + name);
            using (FileStream f = File.Create(dest)) s.CopyTo(f);
        }
        Say("Icone ecrite : " + dest);
    }

    static void Mkdir(string d)
    {
        if (dryRun) { Say("[simule] dossier " + d); return; }
        Directory.CreateDirectory(d);
        Say("Dossier : " + d);
    }

    static void Copy(string from, string to)
    {
        if (dryRun) { Say("[simule] copie vers " + to); return; }
        File.Copy(from, to, true);
        Say("Copie : " + to);
    }

    static void Delete(string p)
    {
        if (dryRun) { Say("[simule] suppression de " + p); return; }
        try { if (File.Exists(p)) { File.Delete(p); Say("Supprime : " + p); } }
        catch (Exception ex) { Say("Suppression impossible (" + p + ") : " + ex.Message); }
    }

    static void Rmdir(string d)
    {
        if (dryRun) { Say("[simule] suppression du dossier " + d); return; }
        try { if (Directory.Exists(d)) { Directory.Delete(d, true); Say("Dossier supprime : " + d); } }
        catch (Exception ex) { Say("Dossier non supprime : " + ex.Message); }
    }

    static void Say(string line)
    {
        Log.AppendLine(DateTime.Now.ToString("HH:mm:ss") + "  " + line);
    }

    static void Finish(string message, MessageBoxIcon icon)
    {
        try { File.WriteAllText(LogPath, Log.ToString(), Encoding.UTF8); }
        catch { /* le journal est un confort, pas une condition de succes */ }
        if (!quiet) MessageBox.Show(message, AppName, MessageBoxButtons.OK, icon);
    }
}
