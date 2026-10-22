import { useState, ChangeEvent, useEffect } from 'react';
import { useStore } from '../store';
import { Download, Upload, FileSpreadsheet, Database, Trash2, ShieldAlert, X, Settings2, Clock, MapPin, Save } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

export default function BackupRestore() {
  const { 
    exportData, importData, downloadDatabase, restoreDatabase, resetDatabase, 
    assets, assetTypes, users, locations, addNotification, settings, updateSettings,
    serverBackups, fetchServerBackups, triggerManualBackup, downloadBackup, deleteBackupFile
  } = useStore();
  
  const [importText, setImportText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(settings?.autoBackupEnabled === 'true');
  const [backupPath, setBackupPath] = useState(settings?.backupPath || 'C:/Backups/Simulated');
  const [backupTime, setBackupTime] = useState(settings?.backupTime || '02:00');
  const [backupFormat, setBackupFormat] = useState(settings?.backupFormat || 'JSON');
  const [backupFrequency, setBackupFrequency] = useState(settings?.backupFrequency || 'Daily');
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingBackups(true);
      await fetchServerBackups();
      setIsLoadingBackups(false);
    };
    load();
  }, []);

  const handleSaveAutoBackup = async () => {
    await updateSettings({
      autoBackupEnabled: autoBackupEnabled.toString(),
      backupPath,
      backupTime,
      backupFormat,
      backupFrequency
    });
    addNotification('Auto-backup settings saved', 'success');
  };

  const handleTriggerBackup = async () => {
    await triggerManualBackup();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            importData(content);
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.sqlite')) {
        setPendingFile(file);
        setShowConfirm(true);
      }
    }
  };

  const handleSqliteUpload = async (file: File) => {
    await restoreDatabase(file);
  };

  const handleReset = async () => {
    if (!resetUsername || !resetPassword) {
      addNotification('Please enter admin credentials', 'error');
      return;
    }
    setIsResetting(true);
    const success = await resetDatabase(resetUsername, resetPassword);
    setIsResetting(false);
    if (success) {
      setShowResetModal(false);
      setResetUsername('');
      setResetPassword('');
    }
  };

  const exportCSV = () => {
    // Basic CSV export for assets
    const headers = ['ID', 'Name', 'Tag', 'Serial Number', 'Type', 'Status', 'User', 'Location', 'Purchase Date', 'IP Address', 'Model Name'];
    
    const rows = (assets || []).map(asset => {
      const type = (assetTypes || []).find(t => t.id === asset.typeId)?.name || '';
      const user = (users || []).find(u => u.id === asset.userId)?.name || '';
      const location = (locations || []).find(l => l.id === asset.locationId)?.name || '';
      
      return [
        asset.id,
        `"${asset.name}"`,
        `"${asset.tag}"`,
        `"${asset.serialNumber}"`,
        `"${type}"`,
        `"${asset.status}"`,
        `"${user}"`,
        `"${location}"`,
        `"${asset.purchaseDate}"`,
        `"${asset.ipAddress || ''}"`,
        `"${asset.modelName}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Auto-Backup Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white block">Enable Auto-Backup</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Generate backups automatically</span>
              </div>
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded-lg border-gray-300 focus:ring-indigo-500 transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Backup Path (Local System Folder)
              </label>
              <input
                type="text"
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                placeholder="e.g., C:/Backups/MyAssets"
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Preferred Time
                </label>
                <input
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Frequency</label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Format</label>
                <select
                  value={backupFormat}
                  onChange={(e) => setBackupFormat(e.target.value)}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Both">JSON + SQLite (Both)</option>
                  <option value="JSON">JSON (Full Data Only)</option>
                  <option value="SQLite">SQLite File Only</option>
                  <option value="CSV">CSV (Assets Only)</option>
                </select>
              </div>
            </div>

            {settings?.lastBackupStatus && (() => {
              let info: { status?: string; time?: string; location?: string; message?: string } | null = null;
              if (settings.lastBackupStatus.includes('{')) {
                try {
                  info = JSON.parse(settings.lastBackupStatus);
                } catch (e) {}
              }
              const isSuccess = settings.lastBackupStatus.includes('Success') || (info && info.status?.includes('Success'));
              const displayStatusText = info 
                ? (info.status + ': ' + (info.time ? new Date(info.time).toLocaleString() : ''))
                : settings.lastBackupStatus;

              return (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Last Backup Activity</p>
                   <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <div className="flex-1 min-w-0">
                         <p className={`text-xs font-bold ${isSuccess ? 'text-emerald-600' : 'text-red-500'}`}>
                            {displayStatusText}
                         </p>
                         {info && info.location && (
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5 truncate">
                               Path: {info.location}
                            </p>
                         )}
                         {info && info.message && (
                            <p className="text-[9px] text-red-400 font-bold mt-1">
                               {info.message}
                            </p>
                         )}
                      </div>
                   </div>
                </div>
              );
            })()}

            <button 
              onClick={handleSaveAutoBackup}
              className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Save className="w-4 h-4" /> Save Settings
            </button>
            <p className="text-[10px] text-gray-400 italic text-center px-4">
              * Note: Auto-backups are processed on the server at the scheduled time. Ensure the server is running.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Recent Server Backups
            </div>
            <button 
              onClick={handleTriggerBackup}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Backup Now
            </button>
          </h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoadingBackups ? (
              <div className="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest">Loading...</div>
            ) : serverBackups.length > 0 ? (
              serverBackups.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 transition-all group">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{b.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                      {new Date(b.createdAt).toLocaleString()} • {formatSize(b.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadBackup(b.name)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-all"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => deleteBackupFile(b.name)}
                      className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No server backups yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Export Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Download a complete backup of all your data including assets, users, logs, and settings in JSON format.
          </p>
          <button 
            onClick={exportData}
            className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-all mb-4 w-full flex justify-center items-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Download className="w-4 h-4" /> Download JSON Backup
          </button>

          <button 
            onClick={downloadDatabase}
            className="bg-amber-600 text-white px-4 py-3 rounded-xl hover:bg-amber-700 transition-all mb-4 w-full flex justify-center items-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-amber-200 dark:shadow-none"
          >
            <Database className="w-4 h-4" /> Download SQLite File (.sqlite)
          </button>

          <hr className="my-6 border-gray-100 dark:border-gray-700" />
          
          <h3 className="text-md font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export to CSV
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Download your assets list as a CSV file for use in Excel or other spreadsheet software.
          </p>
          <button 
            onClick={exportCSV}
            className="bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 transition-all w-full flex justify-center items-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Assets CSV
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Import Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Choose a previously exported JSON backup file or a .sqlite database file to restore your data. 
            <strong className="text-red-600 dark:text-red-400"> Warning: This will overwrite existing data.</strong>
          </p>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-gray-900/50">
            <input
              type="file"
              accept=".json,.sqlite"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 mb-2">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-xs">Click to upload backup (.json or .sqlite)</span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">JSON and SQLite files are supported</span>
            </label>
          </div>

          <hr className="my-6 border-gray-100 dark:border-gray-700" />

          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Reset the entire database to its initial state. This will delete all assets, users, logs, and settings.
          </p>
          <button 
            onClick={() => setShowResetModal(true)}
            className="bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-all w-full flex justify-center items-center gap-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-red-200 dark:shadow-none"
          >
            <Trash2 className="w-4 h-4" /> Reset Database
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setPendingFile(null);
        }}
        onConfirm={() => {
          if (pendingFile) {
            handleSqliteUpload(pendingFile);
          }
        }}
        title="Replace Database?"
        message="Warning: This will replace the entire database and restart the server. This action cannot be undone. Continue?"
      />

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Database Reset"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Warning: This action will permanently delete all data in the system and restore default settings.
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please enter administrator credentials to confirm this action.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Admin Username</label>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter admin username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Admin Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter admin password"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowResetModal(false)}
              className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </>
              ) : (
                'Confirm Reset'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
