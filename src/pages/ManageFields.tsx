import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { generateId } from '../utils/id';
import { Plus, Trash2, Database, RefreshCw, Activity, Server, Shield, Settings, CheckSquare, Edit2, Check, X, Download, Search, RotateCcw } from 'lucide-react';
import { CustomField, BackupDefinition, UpdateDefinition, SystemCheckDefinition, ServerDefinition, SecurityDefinition, ToDo, Frequency } from '../types';
import { clsx } from 'clsx';

type Tab = 'assets' | 'backups' | 'updates' | 'system' | 'servers' | 'security' | 'todos' | 'settings';

export default function ManageFields() {
  const { 
    assetTypes, addAssetType, updateAssetType, deleteAssetType,
    backups, addBackup, updateBackup, deleteBackup,
    updates, addUpdateDef, updateUpdateDef, deleteUpdateDef,
    systemChecks, addSystemCheckDef, updateSystemCheckDef, deleteSystemCheckDef,
    servers, addServerDef, updateServerDef, deleteServerDef,
    securityItems, addSecurityDef, updateSecurityDef, deleteSecurityDef,
    toDos, addToDo, updateToDo, deleteToDo,
    downloadDatabase, currentUser,
    settings, updateSettings, addNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState((assetTypes || [])[0]?.id || '');
  const [selectedBackup, setSelectedBackup] = useState((backups || [])[0]?.id || '');
  const [selectedUpdate, setSelectedUpdate] = useState((updates || [])[0]?.id || '');
  const [selectedSystemCheck, setSelectedSystemCheck] = useState((systemChecks || [])[0]?.id || '');
  const [selectedServer, setSelectedServer] = useState((servers || [])[0]?.id || '');
  const [selectedSecurity, setSelectedSecurity] = useState((securityItems || [])[0]?.id || '');

  const [newField, setNewField] = useState<Partial<CustomField>>({ name: '', type: 'text' });
  
  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Persistence hooks for various forms
  const { formData: newAssetTypeName, setFormData: setNewAssetTypeName, resetForm: resetAssetTypeForm, clearPersistence: clearAssetTypePersistence, isDirty: isAssetTypeDirty } = useFormPersistence('manage_asset_type', { name: '' }, activeTab === 'assets');
  
  const { formData: newBackup, setFormData: setNewBackup, resetForm: resetBackupForm, clearPersistence: clearBackupPersistence, isDirty: isBackupDirty } = useFormPersistence('manage_backup_def', { name: '', frequency: 'Daily' as Frequency, method: 'Automatic' as const, customFields: [] as CustomField[] }, activeTab === 'backups');
  
  const { formData: newUpdate, setFormData: setNewUpdate, resetForm: resetUpdateForm, clearPersistence: clearUpdatePersistence, isDirty: isUpdateDirty } = useFormPersistence('manage_update_def', { name: '', category: 'Windows' as const, frequency: 'Weekly' as Frequency, customFields: [] as CustomField[] }, activeTab === 'updates');
  
  const { formData: newSystemCheck, setFormData: setNewSystemCheck, resetForm: resetSystemCheckForm, clearPersistence: clearSystemCheckPersistence, isDirty: isSystemCheckDirty } = useFormPersistence('manage_system_check_def', { name: '', type: 'System Health' as const, frequency: 'Weekly' as Frequency, customFields: [] as CustomField[] }, activeTab === 'system');
  
  const { formData: newServer, setFormData: setNewServer, resetForm: resetServerForm, clearPersistence: clearServerPersistence, isDirty: isServerDirty } = useFormPersistence('manage_server_def', { name: '', os: '', ipAddress: '', hardwareParts: ['RAM', 'Fan', 'Hard Disk'] as string[], frequency: 'Monthly' as Frequency, customFields: [] as CustomField[] }, activeTab === 'servers');
  
  const { formData: newSecurity, setFormData: setNewSecurity, resetForm: resetSecurityForm, clearPersistence: clearSecurityPersistence, isDirty: isSecurityDirty } = useFormPersistence('manage_security_def', { name: '', type: 'Firewall' as const, frequency: 'Weekly' as Frequency, customFields: [] as CustomField[] }, activeTab === 'security');
  
  const { formData: newToDo, setFormData: setNewToDo, resetForm: resetToDoForm, clearPersistence: clearToDoPersistence, isDirty: isToDoDirty } = useFormPersistence('manage_todo_def', { title: '', priority: 'Medium' as const, dueDate: '' }, activeTab === 'todos');

  const currentAssetType = (assetTypes || []).find(t => t.id === selectedAssetType);
  const currentBackup = (backups || []).find(b => b.id === selectedBackup);
  const currentUpdate = (updates || []).find(u => u.id === selectedUpdate);
  const currentSystemCheck = (systemChecks || []).find(s => s.id === selectedSystemCheck);
  const currentServer = (servers || []).find(s => s.id === selectedServer);
  const currentSecurity = (securityItems || []).find(s => s.id === selectedSecurity);

  const handleAddField = async (category: Tab, id: string) => {
    if (!newField.name) return;
    const field: CustomField = { id: generateId(), name: newField.name, type: newField.type as any };
    
    try {
      switch(category) {
        case 'assets':
          await updateAssetType(id, { customFields: [...(currentAssetType?.customFields || []), field] });
          break;
        case 'backups':
          await updateBackup(id, { customFields: [...(currentBackup?.customFields || []), field] });
          break;
        case 'updates':
          await updateUpdateDef(id, { customFields: [...(currentUpdate?.customFields || []), field] });
          break;
        case 'system':
          await updateSystemCheckDef(id, { customFields: [...(currentSystemCheck?.customFields || []), field] });
          break;
        case 'servers':
          await updateServerDef(id, { customFields: [...(currentServer?.customFields || []), field] });
          break;
        case 'security':
          await updateSecurityDef(id, { customFields: [...(currentSecurity?.customFields || []), field] });
          break;
      }
      addNotification('Field added successfully', 'success');
      setNewField({ name: '', type: 'text' });
    } catch (error) {
      addNotification('Failed to add field', 'error');
      console.error('Error adding field:', error);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...(data || []).map(row => (headers || []).map(header => {
        const value = row[header];
        return typeof value === 'object' ? JSON.stringify(value).replace(/,/g, ';') : `"${value}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'assets', label: 'Asset Types', icon: Settings },
    { id: 'backups', label: 'Backups', icon: Database },
    { id: 'updates', label: 'Updates', icon: RefreshCw },
    { id: 'system', label: 'System Checks', icon: Activity },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Management & Configuration</h1>
        <button 
          onClick={() => {
            const dataMap: Record<Tab, any[]> = {
              assets: assetTypes,
              backups: backups,
              updates: updates,
              system: systemChecks,
              servers: servers,
              security: securityItems,
              todos: toDos,
              settings: [settings]
            };
            downloadCSV(dataMap[activeTab], `manage_${activeTab}`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {(tabs || []).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id 
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {activeTab !== 'settings' && (
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            />
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Asset Type</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Printer, Scanner" 
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 text-sm" 
                      value={newAssetTypeName.name}
                      onChange={e => setNewAssetTypeName({ name: e.target.value })}
                    />
                    <button 
                      onClick={async () => {
                        if (newAssetTypeName.name.trim()) {
                          try {
                            await addAssetType(newAssetTypeName.name.trim());
                            addNotification('Asset type added successfully', 'success');
                            clearAssetTypePersistence();
                            resetAssetTypeForm();
                          } catch (error) {
                            addNotification('Failed to add asset type', 'error');
                            console.error('Error adding asset type:', error);
                          }
                        }
                      }} 
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {isAssetTypeDirty && (
                    <button onClick={resetAssetTypeForm} className="mt-2 text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Asset Type to Manage</label>
                  <div className="flex gap-2 mt-1">
                    {editingId === selectedAssetType ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" 
                          value={editForm?.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <button 
                          onClick={async () => {
                            try {
                              await updateAssetType(selectedAssetType, { name: editForm.name });
                              addNotification('Asset type updated successfully', 'success');
                              setEditingId(null);
                            } catch (error) {
                              addNotification('Failed to update asset type', 'error');
                              console.error('Error updating asset type:', error);
                            }
                          }}
                          className="text-green-500 hover:text-green-700 p-2 border border-gray-300 dark:border-gray-700 rounded-md"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 p-2 border border-gray-300 dark:border-gray-700 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" 
                            value={selectedAssetType} 
                            onChange={e => setSelectedAssetType(e.target.value)}
                          >
                            {(assetTypes || [])
                              .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        <button 
                          onClick={() => {
                            setEditingId(selectedAssetType);
                            setEditForm({ name: currentAssetType?.name });
                          }}
                          className="text-indigo-500 hover:text-indigo-700 p-2 border border-gray-300 dark:border-gray-700 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (selectedAssetType) {
                              try {
                                await deleteAssetType(selectedAssetType);
                                addNotification('Asset type deleted successfully', 'success');
                                setSelectedAssetType(assetTypes[0]?.id || '');
                              } catch (error) {
                                addNotification('Failed to delete asset type', 'error');
                                console.error('Error deleting asset type:', error);
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-2 border border-gray-300 dark:border-gray-700 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {currentAssetType && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings for {currentAssetType.name}</h3>
                  
                  <div className="mb-6 space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">User Portal Visibility</h4>
                    <p className="text-xs text-gray-500 mb-3">Select which standard fields users can see for this asset type.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {['modelName', 'serialNumber', 'tag', 'status', 'purchaseDate', 'warrantyExpiry', 'ipAddress', 'macAddress'].map(field => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer transition-colors hover:text-indigo-600">
                          <input 
                            type="checkbox"
                            checked={(currentAssetType.userVisibleStandardFields || []).includes(field)}
                            onChange={async (e) => {
                              const current = currentAssetType.userVisibleStandardFields || [];
                              const updated = e.target.checked 
                                ? [...current, field]
                                : current.filter(f => f !== field);
                              await updateAssetType(currentAssetType.id, { userVisibleStandardFields: updated });
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Custom Fields</h3>
                  <div className="space-y-3 mb-6">
                    {(currentAssetType.customFields || []).length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No custom fields defined.</p>
                    ) : (
                      (currentAssetType.customFields || []).map(field => (
                        <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{field.name}</span>
                              <span className="ml-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{field.type}</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer" title="Visible to User in Portal">
                              <input 
                                type="checkbox"
                                checked={field.visibleToUser}
                                onChange={async (e) => {
                                  const updatedFields = currentAssetType.customFields.map(f => 
                                    f.id === field.id ? { ...f, visibleToUser: e.target.checked } : f
                                  );
                                  await updateAssetType(currentAssetType.id, { customFields: updatedFields });
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-gray-500 font-medium">User Visible</span>
                            </label>
                          </div>
                          <button onClick={async () => {
                            try {
                              await updateAssetType(currentAssetType.id, { customFields: currentAssetType.customFields.filter(f => f.id !== field.id) });
                              addNotification('Field removed successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to remove field', 'error');
                              console.error('Error removing field:', error);
                            }
                          }} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Field</h4>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <input type="text" placeholder="Field Name" className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <label className="flex items-center gap-2 cursor-pointer pl-1">
                          <input 
                            type="checkbox"
                            checked={newField.visibleToUser}
                            onChange={e => setNewField({...newField, visibleToUser: e.target.checked})}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Visible to User</span>
                        </label>
                      </div>
                      <select className="w-32 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 h-[42px]" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                      <button onClick={() => handleAddField('assets', selectedAssetType)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 h-[42px]"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'backups' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Backup Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Backup Name" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newBackup.name} onChange={e => setNewBackup({...newBackup, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newBackup.frequency} onChange={e => setNewBackup({...newBackup, frequency: e.target.value as any})}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newBackup.method} onChange={e => setNewBackup({...newBackup, method: e.target.value as any})}>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                  <button onClick={async () => { 
                    try {
                      await addBackup(newBackup); 
                      addNotification('Backup definition added successfully', 'success');
                      clearBackupPersistence();
                      resetBackupForm(); 
                    } catch (error) {
                      addNotification('Failed to add backup definition', 'error');
                      console.error('Error adding backup definition:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Backup Definition
                  </button>
                  {isBackupDirty && (
                    <button onClick={resetBackupForm} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Backup to Manage Fields</label>
                  <select 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 mb-4" 
                    value={selectedBackup} 
                    onChange={e => setSelectedBackup(e.target.value)}
                  >
                    <option value="">Select a backup...</option>
                    {(backups || [])
                      .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>

                  {currentBackup && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {(currentBackup.customFields || []).map(field => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name} ({field.type})</span>
                            <button onClick={async () => {
                              try {
                                await updateBackup(currentBackup.id, { customFields: currentBackup.customFields.filter(f => f.id !== field.id) });
                                addNotification('Field removed successfully', 'success');
                              } catch (error) {
                                addNotification('Failed to remove field', 'error');
                                console.error('Error removing field:', error);
                              }
                            }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="New Field Name" className="flex-1 text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => handleAddField('backups', currentBackup.id)} className="bg-indigo-600 text-white p-1 rounded-md hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(backups || [])
                  .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(b => (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    {editingId === b.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input 
                          type="text" 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                          value={editForm?.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.frequency || 'Daily'} 
                            onChange={e => setEditForm({...editForm, frequency: e.target.value as any})}
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.method || 'Automatic'} 
                            onChange={e => setEditForm({...editForm, method: e.target.value as any})}
                          >
                            <option value="Automatic">Automatic</option>
                            <option value="Manual">Manual</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{b.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{b.frequency} • {b.method} • {(b.customFields || []).length} fields</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {editingId === b.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateBackup(b.id, editForm); 
                              addNotification('Backup definition updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update backup definition', 'error');
                              console.error('Error updating backup definition:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(b.id); setEditForm({...b}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteBackup(b.id);
                              addNotification('Backup definition deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete backup definition', 'error');
                              console.error('Error deleting backup definition:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Update Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Update Name" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newUpdate.name} onChange={e => setNewUpdate({...newUpdate, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newUpdate.category} onChange={e => setNewUpdate({...newUpdate, category: e.target.value as any})}>
                      <option value="Windows">Windows</option>
                      <option value="Software">Software</option>
                      <option value="Office">Office</option>
                      <option value="Drivers">Drivers</option>
                      <option value="Other">Other</option>
                    </select>
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newUpdate.frequency} onChange={e => setNewUpdate({...newUpdate, frequency: e.target.value as any})}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <button onClick={async () => { 
                    try {
                      await addUpdateDef(newUpdate); 
                      addNotification('Update definition added successfully', 'success');
                      clearUpdatePersistence();
                      resetUpdateForm(); 
                    } catch (error) {
                      addNotification('Failed to add update definition', 'error');
                      console.error('Error adding update definition:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Update Definition
                  </button>
                  {isUpdateDirty && (
                    <button onClick={resetUpdateForm} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Update to Manage Fields</label>
                  <select 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 mb-4" 
                    value={selectedUpdate} 
                    onChange={e => setSelectedUpdate(e.target.value)}
                  >
                    <option value="">Select an update...</option>
                    {(updates || [])
                      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>

                  {currentUpdate && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {(currentUpdate.customFields || []).map(field => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name} ({field.type})</span>
                            <button onClick={async () => {
                              try {
                                await updateUpdateDef(currentUpdate.id, { customFields: currentUpdate.customFields.filter(f => f.id !== field.id) });
                                addNotification('Field removed successfully', 'success');
                              } catch (error) {
                                addNotification('Failed to remove field', 'error');
                                console.error('Error removing field:', error);
                              }
                            }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="New Field Name" className="flex-1 text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => handleAddField('updates', currentUpdate.id)} className="bg-indigo-600 text-white p-1 rounded-md hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(updates || [])
                  .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    {editingId === u.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input 
                          type="text" 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                          value={editForm?.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.category || 'Windows'} 
                            onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                          >
                            <option value="Windows">Windows</option>
                            <option value="Software">Software</option>
                            <option value="Office">Office</option>
                            <option value="Drivers">Drivers</option>
                            <option value="Other">Other</option>
                          </select>
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.frequency || 'Weekly'} 
                            onChange={e => setEditForm({...editForm, frequency: e.target.value as any})}
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{u.category} • {u.frequency} • {(u.customFields || []).length} fields</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {editingId === u.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateUpdateDef(u.id, editForm); 
                              addNotification('Update definition updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update update definition', 'error');
                              console.error('Error updating update definition:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(u.id); setEditForm({...u}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteUpdateDef(u.id);
                              addNotification('Update definition deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete update definition', 'error');
                              console.error('Error deleting update definition:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage System Check Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Check Name" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSystemCheck.name} onChange={e => setNewSystemCheck({...newSystemCheck, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSystemCheck.type} onChange={e => setNewSystemCheck({...newSystemCheck, type: e.target.value as any})}>
                      <option value="System Health">System Health</option>
                      <option value="Issues">Issues</option>
                      <option value="Other">Other</option>
                    </select>
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSystemCheck.frequency} onChange={e => setNewSystemCheck({...newSystemCheck, frequency: e.target.value as any})}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <button onClick={async () => { 
                    try {
                      await addSystemCheckDef(newSystemCheck); 
                      addNotification('System check definition added successfully', 'success');
                      clearSystemCheckPersistence();
                      resetSystemCheckForm(); 
                    } catch (error) {
                      addNotification('Failed to add system check definition', 'error');
                      console.error('Error adding system check definition:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add System Check Definition
                  </button>
                  {isSystemCheckDirty && (
                    <button onClick={resetSystemCheckForm} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Check to Manage Fields</label>
                  <select 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 mb-4" 
                    value={selectedSystemCheck} 
                    onChange={e => setSelectedSystemCheck(e.target.value)}
                  >
                    <option value="">Select a check...</option>
                    {(systemChecks || [])
                      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {currentSystemCheck && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {(currentSystemCheck.customFields || []).map(field => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name} ({field.type})</span>
                            <button onClick={async () => {
                              try {
                                await updateSystemCheckDef(currentSystemCheck.id, { customFields: currentSystemCheck.customFields.filter(f => f.id !== field.id) });
                                addNotification('Field removed successfully', 'success');
                              } catch (error) {
                                addNotification('Failed to remove field', 'error');
                                console.error('Error removing field:', error);
                              }
                            }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="New Field Name" className="flex-1 text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => handleAddField('system', currentSystemCheck.id)} className="bg-indigo-600 text-white p-1 rounded-md hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(systemChecks || [])
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    {editingId === s.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input 
                          type="text" 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                          value={editForm?.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.type || 'System Health'} 
                            onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                          >
                            <option value="System Health">System Health</option>
                            <option value="Issues">Issues</option>
                            <option value="Other">Other</option>
                          </select>
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.frequency || 'Weekly'} 
                            onChange={e => setEditForm({...editForm, frequency: e.target.value as any})}
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{s.type} • {s.frequency} • {(s.customFields || []).length} fields</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {editingId === s.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateSystemCheckDef(s.id, editForm); 
                              addNotification('System check definition updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update system check definition', 'error');
                              console.error('Error updating system check definition:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(s.id); setEditForm({...s}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteSystemCheckDef(s.id);
                              addNotification('System check definition deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete system check definition', 'error');
                              console.error('Error deleting system check definition:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Server Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Server Name" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newServer.name} onChange={e => setNewServer({...newServer, name: e.target.value})} />
                  <input type="text" placeholder="OS" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newServer.os} onChange={e => setNewServer({...newServer, os: e.target.value})} />
                  <input type="text" placeholder="IP Address" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newServer.ipAddress} onChange={e => setNewServer({...newServer, ipAddress: e.target.value})} />
                  <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newServer.frequency} onChange={e => setNewServer({...newServer, frequency: e.target.value as any})}>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  <button onClick={async () => { 
                    try {
                      await addServerDef(newServer); 
                      addNotification('Server definition added successfully', 'success');
                      clearServerPersistence();
                      resetServerForm(); 
                    } catch (error) {
                      addNotification('Failed to add server definition', 'error');
                      console.error('Error adding server definition:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Server Definition
                  </button>
                  {isServerDirty && (
                    <button onClick={resetServerForm} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Server to Manage Fields</label>
                  <select 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 mb-4" 
                    value={selectedServer} 
                    onChange={e => setSelectedServer(e.target.value)}
                  >
                    <option value="">Select a server...</option>
                    {(servers || [])
                      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {currentServer && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {(currentServer.customFields || []).map(field => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name} ({field.type})</span>
                            <button onClick={async () => {
                              try {
                                await updateServerDef(currentServer.id, { customFields: currentServer.customFields.filter(f => f.id !== field.id) });
                                addNotification('Field removed successfully', 'success');
                              } catch (error) {
                                addNotification('Failed to remove field', 'error');
                                console.error('Error removing field:', error);
                              }
                            }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="New Field Name" className="flex-1 text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => handleAddField('servers', currentServer.id)} className="bg-indigo-600 text-white p-1 rounded-md hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(servers || [])
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    {editingId === s.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input 
                          type="text" 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                          value={editForm?.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.os || ''} 
                            onChange={e => setEditForm({...editForm, os: e.target.value})}
                          />
                          <input 
                            type="text" 
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm?.ipAddress || ''} 
                            onChange={e => setEditForm({...editForm, ipAddress: e.target.value})}
                          />
                        </div>
                        <select 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                          value={editForm?.frequency || 'Monthly'} 
                          onChange={e => setEditForm({...editForm, frequency: e.target.value as any})}
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{s.os} • {s.ipAddress} • {s.frequency} • {(s.customFields || []).length} fields</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {editingId === s.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateServerDef(s.id, editForm); 
                              addNotification('Server definition updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update server definition', 'error');
                              console.error('Error updating server definition:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(s.id); setEditForm({...s}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteServerDef(s.id);
                              addNotification('Server definition deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete server definition', 'error');
                              console.error('Error deleting server definition:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage Security Definitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Security Item Name" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSecurity.name} onChange={e => setNewSecurity({...newSecurity, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSecurity.type} onChange={e => setNewSecurity({...newSecurity, type: e.target.value as any})}>
                      <option value="Firewall">Firewall</option>
                      <option value="Virus Guard">Virus Guard</option>
                    </select>
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newSecurity.frequency} onChange={e => setNewSecurity({...newSecurity, frequency: e.target.value as any})}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <button onClick={async () => { 
                    try {
                      await addSecurityDef(newSecurity); 
                      addNotification('Security definition added successfully', 'success');
                      clearSecurityPersistence();
                      resetSecurityForm(); 
                    } catch (error) {
                      addNotification('Failed to add security definition', 'error');
                      console.error('Error adding security definition:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Security Definition
                  </button>
                  {isSecurityDirty && (
                    <button onClick={resetSecurityForm} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Item to Manage Fields</label>
                  <select 
                    className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2 mb-4" 
                    value={selectedSecurity} 
                    onChange={e => setSelectedSecurity(e.target.value)}
                  >
                    <option value="">Select a security item...</option>
                    {(securityItems || [])
                      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {currentSecurity && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {(currentSecurity.customFields || []).map(field => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name} ({field.type})</span>
                            <button onClick={async () => {
                              try {
                                await updateSecurityDef(currentSecurity.id, { customFields: currentSecurity.customFields.filter(f => f.id !== field.id) });
                                addNotification('Field removed successfully', 'success');
                              } catch (error) {
                                addNotification('Failed to remove field', 'error');
                                console.error('Error removing field:', error);
                              }
                            }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="New Field Name" className="flex-1 text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.name} onChange={e => setNewField({...newField, name: e.target.value})} />
                        <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <button onClick={() => handleAddField('security', currentSecurity.id)} className="bg-indigo-600 text-white p-1 rounded-md hover:bg-indigo-700"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(securityItems || [])
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    {editingId === s.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input 
                          type="text" 
                          className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                          value={editForm.name} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm.type} 
                            onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                          >
                            <option value="Firewall">Firewall</option>
                            <option value="Virus Guard">Virus Guard</option>
                          </select>
                          <select 
                            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                            value={editForm.frequency} 
                            onChange={e => setEditForm({...editForm, frequency: e.target.value as any})}
                          >
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{s.type} • {s.frequency} • {(s.customFields || []).length} fields</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {editingId === s.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateSecurityDef(s.id, editForm); 
                              addNotification('Security definition updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update security definition', 'error');
                              console.error('Error updating security definition:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(s.id); setEditForm({...s}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteSecurityDef(s.id);
                              addNotification('Security definition deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete security definition', 'error');
                              console.error('Error deleting security definition:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'todos' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Manage To-Do List</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <input type="text" placeholder="Task Title" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newToDo.title} onChange={e => setNewToDo({...newToDo, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newToDo.priority} onChange={e => setNewToDo({...newToDo, priority: e.target.value as any})}>
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                    <input type="date" className="rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={newToDo.dueDate} onChange={e => setNewToDo({...newToDo, dueDate: e.target.value})} />
                  </div>
                  <button onClick={async () => { 
                    try {
                      await addToDo(newToDo as any); 
                      addNotification('Task added successfully', 'success');
                      clearToDoPersistence();
                      resetToDoForm(); 
                    } catch (error) {
                      addNotification('Failed to add task', 'error');
                      console.error('Error adding task:', error);
                    }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                  {isToDoDirty && (
                    <button onClick={resetToDoForm} className="mt-2 text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Clear Draft
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {(toDos || [])
                  .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(t => (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 gap-3">
                    <div className="flex-1 flex items-center gap-3">
                      <input type="checkbox" checked={t.completed} onChange={async (e) => {
                        try {
                          await updateToDo(t.id, { completed: e.target.checked });
                          addNotification(`Task marked as ${e.target.checked ? 'completed' : 'incomplete'}`, 'success');
                        } catch (error) {
                          addNotification('Failed to update task status', 'error');
                          console.error('Error updating task status:', error);
                        }
                      }} className="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                      {editingId === t.id ? (
                        <div className="flex-1 space-y-2 mr-4">
                          <input 
                            type="text" 
                            className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-sm" 
                            value={editForm?.title || ''} 
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                          />
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                              value={editForm?.priority || 'Medium'} 
                              onChange={e => setEditForm({...editForm, priority: e.target.value as any})}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                            <input 
                              type="date" 
                              className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-1 text-xs" 
                              value={editForm?.dueDate || ''} 
                              onChange={e => setEditForm({...editForm, dueDate: e.target.value})}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className={clsx("font-medium", t.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-white")}>{t.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {t.priority} • {t.dueDate ? `Due: ${t.dueDate}` : 'No due date'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingId === t.id ? (
                        <>
                          <button onClick={async () => { 
                            try {
                              await updateToDo(t.id, editForm); 
                              addNotification('Task updated successfully', 'success');
                              setEditingId(null); 
                            } catch (error) {
                              addNotification('Failed to update task', 'error');
                              console.error('Error updating task:', error);
                            }
                          }} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(t.id); setEditForm({...t}); }} className="text-indigo-500 hover:text-indigo-700"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => {
                            try {
                              await deleteToDo(t.id);
                              addNotification('Task deleted successfully', 'success');
                            } catch (error) {
                              addNotification('Failed to delete task', 'error');
                              console.error('Error deleting task:', error);
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Alert & Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enable Email Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email for critical events.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await updateSettings({ emailAlertsEnabled: !settings.emailAlertsEnabled });
                        addNotification(`Email alerts ${!settings.emailAlertsEnabled ? 'enabled' : 'disabled'}`, 'success');
                      } catch (error) {
                        addNotification('Failed to update email alert settings', 'error');
                        console.error('Error updating email alerts:', error);
                      }
                    }}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                      settings.emailAlertsEnabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <span className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.emailAlertsEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email Address</label>
                  <input 
                    type="email" 
                    className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" 
                    value={settings.adminEmail}
                    onChange={async (e) => {
                      try {
                        await updateSettings({ adminEmail: e.target.value });
                      } catch (error) {
                        addNotification('Failed to update admin email', 'error');
                        console.error('Error updating admin email:', error);
                      }
                    }}
                    placeholder="it-admin@example.com"
                  />
                  <p className="text-xs text-gray-500">This email will receive all automated system alerts.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Warranty Alert Threshold (Days)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" 
                    value={settings.warrantyAlertDays}
                    onChange={async (e) => {
                      try {
                        await updateSettings({ warrantyAlertDays: parseInt(e.target.value) || 30 });
                      } catch (error) {
                        addNotification('Failed to update warranty alert threshold', 'error');
                        console.error('Error updating warranty alert threshold:', error);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Number of days before expiration to trigger an alert.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Information</h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">App Version</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">v2.1.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Database Check</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
