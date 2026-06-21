import React, { useState, useEffect } from "react";
import { 
  Database, 
  RefreshCw, 
  CloudCheck, 
  Trash2, 
  AlertTriangle, 
  Play, 
  Clock, 
  CloudLightning, 
  Server, 
  Cpu, 
  Download, 
  CheckCircle,
  HelpCircle,
  Terminal,
  Compass,
  FileJson
} from "lucide-react";
import { BackupItem, Settings } from "../types";

interface SystemManagerProps {
  backups: BackupItem[];
  settings: Settings;
  onRefreshState: () => void;
  language: "hu" | "en";
}

export default function SystemManager({ backups, settings, onRefreshState, language }: SystemManagerProps) {
  const [activeTab, setActiveTab2] = useState<"backup" | "os-update">("backup");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string>("");
  const [reason, setReason] = useState("");
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({
    backupSchedule: settings.backupSchedule || "daily",
    backupLocalPath: settings.backupLocalPath || "./backups",
    backupGDriveEnabled: settings.backupGDriveEnabled !== false,
    backupGDriveFolderId: settings.backupGDriveFolderId || "NovaSwarm_Backups",
    autoUpdateOSAndPkgs: settings.autoUpdateOSAndPkgs !== false
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const trans = {
    hu: {
      title: "Rendszerkezelő & Biztonsági mentések",
      subtitle: "Óvja meg NovaSwarm adatait, ütemezzen biztonsági mentéseket és frissítse az operációs rendszert.",
      backupTab: "🛡️ Mentés & Visszaállítás",
      osTab: "📡 OS & Csomagok frissítése",
      newBackup: "Kézi biztonsági mentés indítása",
      reasonPlaceholder: "Mentés leírása (pl. Frissítés előtti mentés)",
      localPathLabel: "Helyi mentési mappa útvonala:",
      scheduleLabel: "Automatikus mentések ütemezése:",
      daily: "Napi rendszeres mentés",
      weekly: "Heti rendszeres mentés",
      monthly: "Havi rendszeres mentés",
      manual: "Csak kézi mentések",
      gdriveLabel: "Google Drive felhő szinkronizáció aktív",
      gdriveFolderLabel: "Google Drive mappa neve vagy ID-ja:",
      autoUpdateLabel: "Rendszer szintű frissítések automatikus futtatása",
      saveConfig: "Mentési beállítások frissítése",
      historyTitle: "📂 Korábbi biztonsági mentések és felhőszinkron lista",
      filename: "Fájlnév / Időpont",
      size: "Méret",
      type: "Típus",
      status: "Állapot",
      actions: "Műveletek",
      restoreBtn: "Visszaállítás",
      deleteBtn: "Törlés",
      restoreConfirm: "Biztosan vissza szeretné állítani a rendszert ebből a mentési pontból? A meglévő adatok felülírásra kerülnek a mentés tartalmával!",
      updateTitle: "🖥️ Linux Mint / Ubuntu & Node.js Csomagfrissítő",
      updateDesc: "A NovaSwarm autonóm módon képes lekérdezni és telepíteni a legfrissebb operációs rendszer-beli javításokat (APT update/upgrade) és lokális npm kódcsomagokat.",
      runUpdateBtn: "Teljes rendszerfrissítés futtatása",
      terminalTitle: "Aptitude & NPM Terminal Real-Time Console",
      restoreSuccess: "A visszaállítás sikeresen befejeződött! Az összes csapatmemória és beállítás helyreállítva.",
      backupSuccess: "Biztonsági mentés sikeresen elkészítve!"
    },
    en: {
      title: "System Manager & Backups",
      subtitle: "Protect your NovaSwarm data, schedule backups, and update the host operating system.",
      backupTab: "🛡️ Backup & Restore",
      osTab: "📡 OS & Package Updates",
      newBackup: "Start Manual Backup",
      reasonPlaceholder: "Backup description (e.g., Pre-upgrade backup)",
      localPathLabel: "Local Backup Directory Path:",
      scheduleLabel: "Auto Backup Schedule:",
      daily: "Daily Auto Backup",
      weekly: "Weekly Auto Backup",
      monthly: "Monthly Auto Backup",
      manual: "Manual Backups Only",
      gdriveLabel: "Google Drive Cloud Sync Active",
      gdriveFolderLabel: "Google Drive Folder Name or ID:",
      autoUpdateLabel: "Auto-run OS and package upgrades in background",
      saveConfig: "Update Backup Configuration",
      historyTitle: "📂 Past Backups & Cloud Sync Registry",
      filename: "Filename / Time",
      size: "Size",
      type: "Type",
      status: "Status",
      actions: "Actions",
      restoreBtn: "Restore",
      deleteBtn: "Delete",
      restoreConfirm: "Are you sure you want to restore the system from this backup point? Existing database will be overwritten with the backup state!",
      updateTitle: "🖥️ Linux Mint / Ubuntu & Node.js Package Upgrader",
      updateDesc: "NovaSwarm can autonomously query and install the latest patches from host package repositories (APT update/upgrade) and local npm modules.",
      runUpdateBtn: "Run Full System Patching",
      terminalTitle: "Aptitude & NPM Terminal Real-Time Console",
      restoreSuccess: "System restore completed successfully! All team memories and settings have been recovered.",
      backupSuccess: "System backup created successfully!"
    }
  }[language];

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings)
      });
      if (response.ok) {
        setSuccessMsg(language === "hu" ? "Beállítások sikeresen mentve!" : "Settings saved successfully!");
        onRefreshState();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg("Failed to save settings.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Manuális mentés" })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(trans.backupSuccess);
        setReason("");
        onRefreshState();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Backup failed.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm(language === "hu" ? "Biztosan törli ezt a mentési állományt?" : "Are you sure you want to delete this backup file?")) return;
    try {
      const response = await fetch(`/api/backups/${id}`, { method: "DELETE" });
      if (response.ok) {
        onRefreshState();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRestoreBackup = async (id: string, fileName: string) => {
    if (!window.confirm(`${trans.restoreConfirm} (${fileName})`)) return;
    setIsRestoring(id);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(trans.restoreSuccess);
        onRefreshState();
        setTimeout(() => {
          setSuccessMsg("");
          // Teljes oldalújratöltés, hogy minden in-memory állapot frissüljön a kliensben is
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Restore failed.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleRunSystemUpdate = async () => {
    setIsUpdating(true);
    setTerminalLog("");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/system-update", { method: "POST" });
      const data = await response.json();
      if (data.terminalLog) {
        setTerminalLog(data.terminalLog);
      }
      if (data.success) {
        setSuccessMsg(language === "hu" ? "A rendszerfrissítés sikeresen lefutott!" : "System updates completed successfully!");
        onRefreshState();
      } else {
        setErrorMsg(data.error || "System update failed.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6" id="sys-manager-root">
      {/* Upper header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-400" />
              {trans.title}
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">{trans.subtitle}</p>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab2("backup")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                activeTab === "backup" 
                  ? "bg-slate-850 text-white border border-slate-700/50 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {trans.backupTab}
            </button>
            <button
              onClick={() => setActiveTab2("os-update")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                activeTab === "os-update" 
                  ? "bg-slate-850 text-white border border-slate-700/50 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {trans.osTab}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/40 border border-red-800/80 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Backup tab content */}
      {activeTab === "backup" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Backup & Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick backup */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider font-mono">
                <Database className="w-4 h-4 text-indigo-400" />
                {language === "hu" ? "Kézi Mentés" : "Manual Backup"}
              </h3>
              <p className="text-xs text-slate-400">
                {language === "hu" ? "Hozzon létre azonnali, másodpercre pontos, biztonságos restorepontot." : "Create an instant, highly secure snapshot restore point."}
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={trans.reasonPlaceholder}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-805 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleManualBackup}
                  disabled={isBackingUp}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isBackingUp ? "animate-spin" : ""}`} />
                  {isBackingUp ? (language === "hu" ? "Mentés folyamatban..." : "Backing up...") : trans.newBackup}
                </button>
              </div>
            </div>

            {/* Setttings Form */}
            <form onSubmit={handleSaveConfig} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
              <h3 className="text-sm font-bold text-slate-205 flex items-center gap-2 uppercase tracking-wider font-mono">
                <Clock className="w-4 h-4 text-pink-400" />
                {language === "hu" ? "Mentés Ütemezés" : "Scheduler setup"}
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">{trans.scheduleLabel}</label>
                <select
                  value={localSettings.backupSchedule}
                  onChange={(e) => setLocalSettings({ ...localSettings, backupSchedule: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-805 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="daily">{trans.daily}</option>
                  <option value="weekly">{trans.weekly}</option>
                  <option value="monthly">{trans.monthly}</option>
                  <option value="manual">{trans.manual}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">{trans.localPathLabel}</label>
                <input
                  type="text"
                  value={localSettings.backupLocalPath}
                  onChange={(e) => setLocalSettings({ ...localSettings, backupLocalPath: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* GDrive setup */}
              <div className="space-y-4 pt-1 border-t border-slate-850">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localSettings.backupGDriveEnabled}
                    onChange={(e) => setLocalSettings({ ...localSettings, backupGDriveEnabled: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">{trans.gdriveLabel}</span>
                  </div>
                </label>

                {localSettings.backupGDriveEnabled && (
                  <div className="space-y-1.5 pl-6.5">
                    <label className="text-[10px] text-slate-400 font-semibold">{trans.gdriveFolderLabel}</label>
                    <input
                      type="text"
                      value={localSettings.backupGDriveFolderId}
                      onChange={(e) => setLocalSettings({ ...localSettings, backupGDriveFolderId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-805 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-200/90 font-semibold py-2.5 rounded-xl text-xs transition"
              >
                {trans.saveConfig}
              </button>
            </form>

          </div>

          {/* Backup History registry table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-indigo-400" />
                  {trans.historyTitle}
                </h3>
                <span className="bg-indigo-950 text-indigo-400 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded border border-indigo-800/40">
                  {backups.length} {language === "hu" ? "mentés pont" : "recovery states"}
                </span>
              </div>

              <div className="overflow-x-auto">
                {backups.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    {language === "hu" ? "Még nem készült biztonsági mentés a rendszerben." : "No backup files registered in the system database yet."}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 font-mono tracking-wider text-[11px] uppercase">
                        <th className="py-3 px-2">{trans.filename}</th>
                        <th className="py-3 px-2">{trans.size}</th>
                        <th className="py-3 px-2">{trans.type}</th>
                        <th className="py-3 px-2">{trans.status}</th>
                        <th className="py-3 px-2 text-right">{trans.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {backups.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-900/30 transition group">
                          <td className="py-3.5 px-2">
                            <div className="font-semibold text-slate-200 max-w-[200px] sm:max-w-xs truncate font-mono" title={b.fileName}>
                              {b.fileName}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <span>{new Date(b.timestamp).toLocaleString()}</span>
                              {b.reason && <span className="text-slate-400">• "{b.reason}"</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 font-mono text-slate-300">
                            {b.size}
                          </td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              b.type === "auto" 
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/35" 
                                : "bg-blue-950/20 text-blue-400 border-blue-900/35"
                            }`}>
                              {b.type === "auto" ? "AUTO" : "MANUAL"}
                            </span>
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="flex flex-col gap-1.5">
                              {/* success/failed locally */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${b.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${b.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                                {b.status === "success" ? "OK" : "ERROR"}
                              </span>
                              
                              {/* feltöltési státusz */}
                              {b.isGDriveSynced ? (
                                <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1 font-mono">
                                  ☁️ Drive Synced
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  offline-only
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRestoreBackup(b.id, b.fileName)}
                                disabled={isRestoring !== null || b.status !== "success"}
                                className="bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/40 text-indigo-300 font-semibold px-2.5 py-1 rounded text-[11px] transition inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <Download className="w-3.5 h-3.5" />
                                {isRestoring === b.id ? "..." : trans.restoreBtn}
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(b.id)}
                                className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-md transition"
                                title={trans.deleteBtn}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* OS Update tab content */}
      {activeTab === "os-update" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-950/50 rounded-2xl border border-red-900/40 text-red-400">
                <Server className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white">{trans.updateTitle}</h3>
                <p className="text-xs text-slate-400 max-w-xl">{trans.updateDesc}</p>
              </div>
            </div>

            {/* Checkbox active background updater */}
            <label className="flex items-center gap-3 bg-slate-900/45 p-4 rounded-xl border border-slate-850 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localSettings.autoUpdateOSAndPkgs}
                onChange={(e) => {
                  const check = e.target.checked;
                  setLocalSettings({ ...localSettings, autoUpdateOSAndPkgs: check });
                  // API save request instantly:
                  fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ autoUpdateOSAndPkgs: check })
                  });
                }}
                className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 bg-slate-950"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-200">{trans.autoUpdateLabel}</div>
                <div className="text-slate-500 mt-0.5">
                  {language === "hu" ? "Letölti és telepíti a kritikus Ubuntu / Linux Mint OS biztonsági javításokat naponta az ütemező szerint." : "Downloads and runs critical Debian/Ubuntu OS security patches on a daily background timer."}
                </div>
              </div>
            </label>

            <div className="flex justify-start">
              <button
                onClick={handleRunSystemUpdate}
                disabled={isUpdating}
                className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg disabled:bg-indigo-900/30 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-4.5 h-4.5 ${isUpdating ? "animate-spin" : ""}`} />
                {isUpdating ? (language === "hu" ? "Letöltés és csomagok telepítése folyamatban..." : "Upgrading packages...") : trans.runUpdateBtn}
              </button>
            </div>
          </div>

          {/* Virtual monospaced terminal logs output */}
          {(terminalLog || isUpdating) && (
            <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-fade-in">
              {/* Terminal window bar */}
              <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs font-mono text-slate-450 ml-2 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    {trans.terminalTitle}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  bash /bin/sh
                </span>
              </div>
              
              {/* Output log */}
              <div className="bg-slate-950 p-5 font-mono text-xs text-slate-300 min-h-[300px] max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                {isUpdating && !terminalLog && (
                  <div className="flex flex-col items-center justify-center space-y-3 py-16">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 font-mono text-xs">
                      {language === "hu" ? "[TASK ACTIVE] Apt-get indexek letöltése és npm update futás alatt..." : "[TASK ACTIVE] Spawning child_process and fetching remote apt repos..."}
                    </p>
                  </div>
                )}
                {terminalLog}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
