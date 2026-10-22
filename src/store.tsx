import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as T from './types';
import { generateId } from './utils/id';
import { safeStorage } from './utils/storage';

interface StoreContextType {
  currentUser: T.User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  
  assetTypes: T.AssetType[];
  addAssetType: (name: string) => Promise<void>;
  updateAssetType: (id: string, type: Partial<T.AssetType>) => Promise<void>;
  deleteAssetType: (id: string) => Promise<void>;
  
  locations: T.Location[];
  addLocation: (location: Omit<T.Location, 'id'>) => Promise<void>;
  updateLocation: (id: string, location: Partial<T.Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  
  users: T.User[];
  addUser: (user: Omit<T.User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<T.User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  assets: T.Asset[];
  addAsset: (asset: Omit<T.Asset, 'id'>) => Promise<void>;
  updateAsset: (id: string, asset: Partial<T.Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  bulkDeleteAssets: (ids: string[]) => Promise<void>;
  bulkUpdateAssetStatus: (ids: string[], status: T.AssetStatus) => Promise<void>;
  
  checkups: T.Checkup[];
  addCheckup: (checkup: Omit<T.Checkup, 'id'>) => Promise<void>;
  updateCheckup: (id: string, checkup: Partial<T.Checkup>) => Promise<void>;
  deleteCheckup: (id: string) => Promise<void>;
  
  issues: T.Issue[];
  addIssue: (issue: Omit<T.Issue, 'id'>) => Promise<void>;
  updateIssue: (id: string, issue: Partial<T.Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  updateIssueFeedback: (id: string, feedback: { rating: number; comment?: string }) => Promise<void>;
  
  tasks: T.Task[];
  addTask: (task: Omit<T.Task, 'id'>) => Promise<void>;
  updateTask: (id: string, task: Partial<T.Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskNote: (taskId: string, note: string) => Promise<void>;
  deleteTaskNote: (taskId: string, noteId: string) => Promise<void>;
  
  softwareWarranties: T.SoftwareWarranty[];
  addSoftwareWarranty: (sw: Omit<T.SoftwareWarranty, 'id'>) => Promise<void>;
  updateSoftwareWarranty: (id: string, sw: Partial<T.SoftwareWarranty>) => Promise<void>;
  deleteSoftwareWarranty: (id: string) => Promise<void>;
  
  holidays: T.Holiday[];
  addHoliday: (holiday: Omit<T.Holiday, 'id'>) => Promise<void>;
  updateHoliday: (id: string, holiday: Partial<T.Holiday>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  
  workDays: string[];
  updateWorkDays: (days: string[]) => Promise<void>;

  officeHours: T.OfficeHours;
  updateOfficeHours: (hours: T.OfficeHours) => Promise<void>;

  logs: T.Log[];
  logAction: (action: string, details: string) => Promise<void>;
  
  backups: T.BackupDefinition[];
  addBackup: (b: Omit<T.BackupDefinition, 'id'>) => Promise<void>;
  updateBackup: (id: string, b: Partial<T.BackupDefinition>) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;

  updates: T.UpdateDefinition[];
  addUpdateDef: (u: Omit<T.UpdateDefinition, 'id'>) => Promise<void>;
  updateUpdateDef: (id: string, u: Partial<T.UpdateDefinition>) => Promise<void>;
  deleteUpdateDef: (id: string) => Promise<void>;

  systemChecks: T.SystemCheckDefinition[];
  addSystemCheckDef: (s: Omit<T.SystemCheckDefinition, 'id'>) => Promise<void>;
  updateSystemCheckDef: (id: string, s: Partial<T.SystemCheckDefinition>) => Promise<void>;
  deleteSystemCheckDef: (id: string) => Promise<void>;

  servers: T.ServerDefinition[];
  addServerDef: (s: Omit<T.ServerDefinition, 'id'>) => Promise<void>;
  updateServerDef: (id: string, s: Partial<T.ServerDefinition>) => Promise<void>;
  deleteServerDef: (id: string) => Promise<void>;

  securityItems: T.SecurityDefinition[];
  addSecurityDef: (s: Omit<T.SecurityDefinition, 'id'>) => Promise<void>;
  updateSecurityDef: (id: string, s: Partial<T.SecurityDefinition>) => Promise<void>;
  deleteSecurityDef: (id: string) => Promise<void>;

  toDos: T.ToDo[];
  addToDo: (todo: Omit<T.ToDo, 'id' | 'createdAt'>) => Promise<void>;
  updateToDo: (id: string, todo: Partial<T.ToDo>) => Promise<void>;
  deleteToDo: (id: string) => Promise<void>;

  assetHistory: T.AssetHistory[];
  addAssetHistory: (history: Omit<T.AssetHistory, 'id'>) => Promise<void>;
  
  notes: T.Note[];
  addNote: (note: Omit<T.Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (id: string, note: Partial<T.Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  procedures: T.Procedure[];
  addProcedure: (procedure: Omit<T.Procedure, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProcedure: (id: string, procedure: Partial<T.Procedure>) => Promise<void>;
  deleteProcedure: (id: string) => Promise<void>;

  dailyTasks: T.DailyTask[];
  addDailyTask: (task: Omit<T.DailyTask, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateDailyTask: (id: string, task: Partial<T.DailyTask>) => Promise<void>;
  deleteDailyTask: (id: string) => Promise<void>;

  staff: T.Staff[];
  addStaff: (name: string) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  contacts: T.Contact[];
  addContact: (contact: Omit<T.Contact, 'id' | 'createdAt'>) => Promise<void>;
  updateContact: (id: string, contact: Partial<T.Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  permissions: T.Permission[];
  savePermission: (perm: Omit<T.Permission, 'id'>) => Promise<void>;
  deletePermission: (id: string) => Promise<void>;

  tonerLogs: T.TonerLog[];
  addTonerLog: (log: Omit<T.TonerLog, 'id'>) => Promise<void>;
  deleteTonerLog: (id: string) => Promise<void>;

  notifications: T.Notification[];
  addNotification: (message: string | { message: string; type: 'success' | 'error' | 'info' }, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;

  alerts: any[];
  settings: Record<string, string>;
  deleteAlert: (id: string) => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  updateSettings: (settings: Record<string, string>) => Promise<void>;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  dismissAlert: (id: string, alertType: string) => Promise<void>;

  hasPermission: (resource: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => boolean;

  fetchData: () => Promise<void>;
  exportData: () => void;
  importData: (jsonData: string) => Promise<void>;
  downloadDatabase: () => void;
  restoreDatabase: (file: File) => Promise<void>;
  resetDatabase: (username: string, password: string) => Promise<boolean>;
  
  // Server-side backups
  serverBackups: any[];
  fetchServerBackups: () => Promise<void>;
  triggerManualBackup: () => Promise<void>;
  downloadBackup: (filename: string) => Promise<void>;
  deleteBackupFile: (filename: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<T.User | null>(() => {
    try {
      const saved = safeStorage.getItem('currentUser');
      const lastActive = safeStorage.getItem('lastActive');
      
      // Check if session has expired (1 hour)
      if (saved && lastActive) {
        if (Date.now() - parseInt(lastActive) < 3600000) {
          return JSON.parse(saved);
        } else {
          safeStorage.removeItem('currentUser');
          safeStorage.removeItem('lastActive');
        }
      }
    } catch (e) {
      console.error('Failed to parse currentUser from storage', e);
    }
    return null;
  });
  const [assetTypes, setAssetTypes] = useState<T.AssetType[]>([]);
  const [locations, setLocations] = useState<T.Location[]>([]);
  const [users, setUsers] = useState<T.User[]>([]);
  const [assets, setAssets] = useState<T.Asset[]>([]);
  const [checkups, setCheckups] = useState<T.Checkup[]>([]);
  const [issues, setIssues] = useState<T.Issue[]>([]);
  const [tasks, setTasks] = useState<T.Task[]>([]);
  const [softwareWarranties, setSoftwareWarranties] = useState<T.SoftwareWarranty[]>([]);
  const [holidays, setHolidays] = useState<T.Holiday[]>([]);
  const [logs, setLogs] = useState<T.Log[]>([]);
  const [backups, setBackups] = useState<T.BackupDefinition[]>([]);
  const [updates, setUpdates] = useState<T.UpdateDefinition[]>([]);
  const [systemChecks, setSystemChecks] = useState<T.SystemCheckDefinition[]>([]);
  const [servers, setServers] = useState<T.ServerDefinition[]>([]);
  const [securityItems, setSecurityItems] = useState<T.SecurityDefinition[]>([]);
  const [toDos, setToDos] = useState<T.ToDo[]>([]);
  const [assetHistory, setAssetHistory] = useState<T.AssetHistory[]>([]);
  const [tonerLogs, setTonerLogs] = useState<T.TonerLog[]>([]);
  const [notes, setNotes] = useState<T.Note[]>([]);
  const [procedures, setProcedures] = useState<T.Procedure[]>([]);
  const [dailyTasks, setDailyTasks] = useState<T.DailyTask[]>([]);
  const [staff, setStaff] = useState<T.Staff[]>([]);
  const [contacts, setContacts] = useState<T.Contact[]>([]);
  const [permissions, setPermissions] = useState<T.Permission[]>([]);
  const [notifications, setNotifications] = useState<T.Notification[]>([]);
  const [serverBackups, setServerBackups] = useState<any[]>([]);

  const addNotification = (messageOrObj: string | { message: string; type: 'success' | 'error' | 'info' }, type?: 'success' | 'error' | 'info') => {
    const id = generateId();
    let message: string;
    let notificationType: 'success' | 'error' | 'info';

    if (typeof messageOrObj === 'object' && messageOrObj !== null) {
      message = messageOrObj.message;
      notificationType = messageOrObj.type;
    } else {
      message = messageOrObj as string;
      notificationType = type || 'info';
    }

    setNotifications(prev => [...prev, { id, message, type: notificationType }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const [alerts, setAlerts] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [workDays, setWorkDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [officeHours, setOfficeHours] = useState<T.OfficeHours>({ open: '08:00', close: '17:00', enabled: true });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = safeStorage.getItem('theme');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return (saved === 'dark' || saved === 'light') ? saved : 'light';
        }
      }
    } catch (e) {
      console.error('Failed to parse theme from storage', e);
    }
    return 'light';
  });

  const fetchWithAuth = async (url: string, options: RequestInit = {}, retries = 15) => {
    const headers = {
      ...options.headers,
      'x-user-id': currentUser?.id || '',
      'x-user-role': currentUser?.role || ''
    } as any;

    try {
      const response = await fetch(url, { ...options, headers });
      
      const contentType = response.headers.get('content-type') || '';
      const isHtmlForApi = url.startsWith('/api') && contentType.includes('text/html');

      if ((!response.ok || isHtmlForApi) && retries > 0) {
        console.warn(`Fetch to ${url} returned response status ${response.status} (HTML: ${isHtmlForApi}), retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return fetchWithAuth(url, options, retries - 1);
      }
      if (isHtmlForApi) {
        throw new Error(`API returned HTML instead of JSON: ${url}`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(`Fetch to ${url} failed, retrying... (${retries} left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return fetchWithAuth(url, options, retries - 1);
      }
      throw error;
    }
  };

  const refreshAlerts = async () => {
    try {
      const res = await fetchWithAuth('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error('Failed to refresh alerts:', e);
    }
  };

  const fetchData = async () => {
    try {
      // Chunking requests to prevent overwhelming the server
      const resources = [
        ['/api/asset-types', setAssetTypes, (d: any) => d.map((t: any) => ({ ...t, customFields: t.customFields || [] }))],
        ['/api/locations', setLocations],
        ['/api/users', setUsers],
        ['/api/assets', setAssets, (d: any) => d.map((as: any) => ({ ...as, specs: as.specs || {}, attachments: as.attachments || [] }))],
        ['/api/checkups', setCheckups, (d: any) => d.map((ck: any) => ({ ...ck, details: ck.details || {} }))],
        ['/api/issues', setIssues, (d: any) => d.map((iss: any) => ({ ...iss, feedback: iss.feedback || {} }))],
        ['/api/tasks', setTasks, (d: any) => d.map((tk: any) => ({ ...tk, notes: tk.notes || [] }))],
        ['/api/software-warranties', setSoftwareWarranties, (d: any) => d.map((s: any) => ({ ...s, dismissedAlerts: s.dismissedAlerts || [] }))],
        ['/api/holidays', setHolidays],
        ['/api/logs', setLogs],
        ['/api/backups', setBackups, (d: any) => d.map((bk: any) => ({ ...bk, customFields: bk.customFields || [] }))],
        ['/api/updates', setUpdates, (d: any) => d.map((up: any) => ({ ...up, customFields: up.customFields || [] }))],
        ['/api/system-checks', setSystemChecks, (d: any) => d.map((scc: any) => ({ ...scc, customFields: scc.customFields || [] }))],
        ['/api/servers', setServers, (d: any) => d.map((sv: any) => ({ ...sv, customFields: sv.customFields || [] }))],
        ['/api/security-items', setSecurityItems, (d: any) => d.map((si: any) => ({ ...si, customFields: si.customFields || [] }))],
        ['/api/to-dos', setToDos, (d: any) => d.map((todo: any) => ({ ...todo, completed: !!todo.completed }))],
        ['/api/asset-history', setAssetHistory],
        ['/api/toner-logs', setTonerLogs],
        ['/api/alerts', setAlerts],
        ['/api/sys-config', setSettings],
        ['/api/sys-config/workDays', (val: any) => val && setWorkDays(val)],
        ['/api/notes', setNotes, (d: any) => d.map((n: any) => ({ ...n, isPublic: !!n.isPublic }))],
        ['/api/procedures', setProcedures, (d: any) => d.map((p: any) => ({ ...p, steps: p.steps || [], troubleshooting: p.troubleshooting || [] }))],
        ['/api/daily-tasks', setDailyTasks],
        ['/api/staff', setStaff],
        ['/api/contacts', setContacts],
        ['/api/auth-rules', setPermissions, (d: any) => d.map((p: any) => ({
          ...p,
          canView: !!p.canView,
          canCreate: !!p.canCreate,
          canEdit: !!p.canEdit,
          canDelete: !!p.canDelete
        }))],
      ];

      // Execute in small batches of 5 to be gentle on the server
      const batchSize = 5;
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        await Promise.all(batch.map(async ([url, setter, transformer]: any) => {
          try {
            const res = await fetchWithAuth(url);
            if (res.ok) {
              const text = await res.text();
              try {
                let data = JSON.parse(text);
                if (transformer) data = transformer(data);
                setter(data);
              } catch (parseError) {
                console.error(`Failed to parse JSON from ${url}. Payload:`, text.substring(0, 200));
                throw parseError;
              }
            } else {
              const errorText = await res.text();
              console.error(`Fetch failed for ${url} with status ${res.status}:`, errorText.substring(0, 200));
            }
          } catch (e) {
            console.error(`Failed to fetch ${url}:`, e);
          }
        }));
      }

      // Special handling for office hours as it requires the settings response
      const ohRes = await fetchWithAuth('/api/sys-config/office_hours');
      if (ohRes.ok) {
        const oh = await ohRes.json();
        if (oh && oh.value) {
          try {
            let parsed = JSON.parse(oh.value);
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch (e) {}
            }
            if (parsed && typeof parsed === 'object' && parsed.open && parsed.close) {
              setOfficeHours(parsed);
            }
          } catch (e) {
            console.error('Failed to parse office hours:', e);
          }
        }
      }
    } catch (error) {
      console.error('Critical failure in fetchData:', error);
      addNotification('Network connection issue. Trying to reconnect...', 'error');
    }
  };

  const fetchServerBackups = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data);
      }
    } catch (e) {
      console.error('Failed to fetch backups:', e);
    }
  };

  const triggerManualBackup = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/backups/trigger', { method: 'POST' });
      if (res.ok) {
        addNotification('Manual backup triggered', 'success');
        await fetchServerBackups();
      }
    } catch (e) {
      addNotification('Failed to trigger backup', 'error');
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/backups/download/${filename}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      addNotification('Failed to download backup', 'error');
    }
  };

  const deleteBackupFile = async (filename: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/backups/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        addNotification('Backup deleted', 'success');
        await fetchServerBackups();
      }
    } catch (e) {
      addNotification('Failed to delete backup', 'error');
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      // Clear state on logout
      setAssetTypes([]);
      setLocations([]);
      setUsers([]);
      setAssets([]);
      setCheckups([]);
      setIssues([]);
      setTasks([]);
      setSoftwareWarranties([]);
      setHolidays([]);
      setLogs([]);
      setBackups([]);
      setUpdates([]);
      setSystemChecks([]);
      setServers([]);
      setSecurityItems([]);
      setToDos([]);
      setAssetHistory([]);
      setTonerLogs([]);
      setNotes([]);
      setProcedures([]);
      setDailyTasks([]);
      setStaff([]);
      setContacts([]);
      setAlerts([]);
      setSettings({});
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem('currentUser', JSON.stringify(currentUser));
      safeStorage.setItem('lastActive', Date.now().toString());
    } else {
      safeStorage.removeItem('currentUser');
      safeStorage.removeItem('lastActive');
    }
  }, [currentUser]);

  // Inactivity tracking
  useEffect(() => {
    if (!currentUser) return;

    let lastLoggedAt = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastLoggedAt > 10000) { // Throttle to 10 seconds
        safeStorage.setItem('lastActive', now.toString());
        lastLoggedAt = now;
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const lastActive = safeStorage.getItem('lastActive');
      // Increased timeout to 8 hours for better dashboard usage
      if (lastActive && Date.now() - parseInt(lastActive) > 8 * 60 * 60 * 1000) {
        logout();
      }
      
      // Auto-refresh data every 30 seconds for "connectivity"
      if (currentUser) {
        fetchData();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser]);

  useEffect(() => {
    safeStorage.setItem('theme', JSON.stringify(theme));
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const logAction = async (action: string, details: string) => {
    const newLog: T.Log = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      details,
      userId: currentUser?.id
    };
    const res = await fetchWithAuth('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    });
    if (res.ok) {
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const dismissAlert = async (id: string, alertType: string) => {
    const sw = softwareWarranties.find(s => s.id === id);
    if (!sw) return;
    const updated = { ...sw, dismissedAlerts: [...(sw.dismissedAlerts || []), alertType] };
    const res = await fetchWithAuth(`/api/software-warranties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      setSoftwareWarranties(prev => (prev || []).map(s => s.id === id ? updated : s));
      await logAction('Dismiss Alert', `Dismissed ${alertType} alert for record ID: ${id}`);
    }
  };

  const hasPermission = (resource: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;

    // Check user override first
    const userPerm = permissions.find(p => p.type === 'user' && p.targetId === currentUser.id && p.resource === resource);
    if (userPerm) return userPerm[action];

    // Check role default override
    const rolePerm = permissions.find(p => p.type === 'role' && p.targetId === currentUser.role && p.resource === resource);
    if (rolePerm) return rolePerm[action];

    // Default Fallbacks if no override exists
    if (currentUser.role === 'Technician') {
      const techPermissions: Record<string, string[]> = {
        assets: ['canView', 'canCreate', 'canEdit'],
        locations: ['canView', 'canCreate', 'canEdit'],
        checkups: ['canView', 'canCreate', 'canEdit'],
        issues: ['canView', 'canCreate', 'canEdit'],
        tasks: ['canView', 'canCreate', 'canEdit'],
        software_warranties: ['canView', 'canCreate', 'canEdit'],
        holidays: ['canView', 'canCreate', 'canEdit'],
        reports: ['canView'],
        notes: ['canView', 'canCreate', 'canEdit'],
        procedures: ['canView', 'canCreate', 'canEdit'],
        todos: ['canView', 'canCreate', 'canEdit', 'canDelete'],
        dashboard: ['canView'],
        tech_portal: ['canView'],
        contacts: ['canView', 'canCreate', 'canEdit', 'canDelete'],
        settings: ['canView', 'canCreate', 'canEdit', 'canDelete']
      };
      return techPermissions[resource]?.includes(action) || false;
    }

    if (currentUser.role === 'User') {
      const userPermissions: Record<string, string[]> = {
        portal: ['canView'],
        issues: ['canView', 'canCreate'],
        todos: ['canView', 'canCreate', 'canEdit', 'canDelete'],
        notes: ['canView'],
        procedures: ['canView'],
        contacts: ['canView', 'canCreate', 'canEdit', 'canDelete']
      };
      return userPermissions[resource]?.includes(action) || false;
    }

    return false;
  };

  const login = async (username: string, pass: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const user = await response.json();
          setCurrentUser(user);
          // fetchData will be triggered by useEffect [currentUser?.id]
          await logAction('Login', `User ${user.name} logged in.`);
          return true;
        } else {
          const text = await response.text();
          console.error('Expected JSON but got:', text.substring(0, 100));
          throw new Error(`Server returned invalid content type: ${contentType} (Status: ${response.status})`);
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'Invalid username or password';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) errorMessage = errorJson.error;
        } catch (e) {}
        addNotification(errorMessage, 'error');
        console.error('Login failed with status:', response.status, errorText.substring(0, 100));
      }
    } catch (e: any) {
      console.error('Login failed:', e);
      addNotification(`Connection Error: ${e.message || 'Check your internet'}`, 'error');
    }
    return false;
  };

  const logout = () => {
    logAction('Logout', `User ${currentUser?.name} logged out.`);
    setCurrentUser(null);
    setAssets([]);
    setAssetTypes([]);
    setLocations([]);
    setIssues([]);
    setTasks([]);
    setBackups([]);
    setUpdates([]);
    setSystemChecks([]);
    setServers([]);
    setSecurityItems([]);
    setAssetHistory([]);
    setTonerLogs([]);
    setSoftwareWarranties([]);
    setHolidays([]);
    setToDos([]);
    setDailyTasks([]);
    setStaff([]);
    setContacts([]);
    setNotes([]);
    setProcedures([]);
    setLogs([]);
    setPermissions([]);
  };

  const addAssetType = async (name: string) => {
    try {
      const newItem = { id: generateId(), name, customFields: [] };
      const res = await fetchWithAuth('/api/asset-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setAssetTypes(prev => [...prev, newItem]);
        await logAction('Add Asset Type', `Added asset type: ${name}`);
        addNotification(`Asset type "${name}" added successfully`, 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add asset type');
      }
    } catch (error: any) {
      console.error('Add asset type failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateAssetType = async (id: string, type: Partial<T.AssetType>) => {
    try {
      const res = await fetchWithAuth(`/api/asset-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type)
      });
      if (res.ok) {
        setAssetTypes(prev => (prev || []).map(t => t.id === id ? { ...t, ...type } : t));
        await logAction('Update Asset Type', `Updated asset type ID: ${id}`);
        addNotification('Asset type updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update asset type');
      }
    } catch (error: any) {
      console.error('Update asset type failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteAssetType = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/asset-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssetTypes(prev => prev.filter(t => t.id !== id));
        await logAction('Delete Asset Type', `Deleted asset type ID: ${id}`);
        addNotification('Asset type deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete asset type');
      }
    } catch (error: any) {
      console.error('Delete asset type failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addLocation = async (loc: Omit<T.Location, 'id'>) => {
    try {
      const newItem = { ...loc, id: generateId() };
      const res = await fetchWithAuth('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setLocations(prev => [...prev, newItem]);
        await logAction('Add Location', `Added location: ${loc.name}`);
        addNotification(`Location "${loc.name}" added successfully`, 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add location');
      }
    } catch (error: any) {
      console.error('Add location failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateLocation = async (id: string, loc: Partial<T.Location>) => {
    try {
      const res = await fetchWithAuth(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loc)
      });
      if (res.ok) {
        setLocations(prev => (prev || []).map(l => l.id === id ? { ...l, ...loc } : l));
        await logAction('Update Location', `Updated location ID: ${id}`);
        addNotification('Location updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update location');
      }
    } catch (error: any) {
      console.error('Update location failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteLocation = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocations(prev => prev.filter(l => l.id !== id));
        await logAction('Delete Location', `Deleted location ID: ${id}`);
        addNotification('Location deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete location');
      }
    } catch (error: any) {
      console.error('Delete location failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addUser = async (user: Omit<T.User, 'id'>) => {
    const newItem = { ...user, id: generateId() };
    const res = await fetchWithAuth('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setUsers(prev => [...prev, newItem]);
      await logAction('Add User', `Added user: ${user.name}`);
    } else {
      const err = await res.json();
      console.error('Failed to add user:', err);
      addNotification(`Failed to add user: ${err.error || 'Unknown error'}`, 'error');
    }
  };
  const updateUser = async (id: string, user: Partial<T.User>) => {
    try {
      const res = await fetchWithAuth(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        setUsers(prev => (prev || []).map(u => u.id === id ? { ...u, ...user } : u));
        await logAction('Update User', `Updated user ID: ${id}`);
        addNotification('User updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Update user failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteUser = async (id: string) => {
    if (id === 'admin') return;
    try {
      const res = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        await logAction('Delete User', `Deleted user ID: ${id}`);
        addNotification('User deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Delete user failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addAsset = async (asset: Omit<T.Asset, 'id'>) => {
    const assetToSave = {
      ...asset,
      tag: asset.tag === '' ? null : asset.tag,
      purchaseDate: asset.purchaseDate === '' ? null : asset.purchaseDate
    };
    const newItem = { ...assetToSave, id: generateId() } as T.Asset;
    const res = await fetchWithAuth('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setAssets(prev => [...prev, newItem]);
      await logAction('Add Asset', `Added asset: ${asset.name} (${asset.tag || 'No Tag'})`);
      await addAssetHistory({
        assetId: newItem.id,
        date: new Date().toISOString(),
        action: 'Created',
        details: `Asset created with status ${asset.status}`,
        userId: currentUser?.id
      });
    } else {
      const err = await res.json();
      console.error('Failed to add asset:', err);
      addNotification(`Failed to add asset: ${err.error || 'Unknown error'}`, 'error');
      throw new Error(err.error || 'Failed to add asset');
    }
  };
  const updateAsset = async (id: string, asset: Partial<T.Asset>) => {
    try {
      const oldAsset = assets.find(a => a.id === id);
      const assetToSave = { ...asset };
      if (assetToSave.tag === '') assetToSave.tag = null as any;
      if (assetToSave.purchaseDate === '') assetToSave.purchaseDate = null as any;

      const res = await fetchWithAuth(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetToSave)
      });
      if (res.ok) {
        setAssets(prev => (prev || []).map(a => a.id === id ? { ...a, ...assetToSave } : a));
        await logAction('Update Asset', `Updated asset ID: ${id}`);
        addNotification('Asset updated successfully', 'success');

        // Record history if key fields changed
        if (oldAsset) {
          let historyDetails = [];
          if (asset.status && asset.status !== oldAsset.status) {
            historyDetails.push(`Status changed from ${oldAsset.status} to ${asset.status}`);
          }
          if (asset.userId !== undefined && asset.userId !== oldAsset.userId) {
            const oldUser = users.find(u => u.id === oldAsset.userId)?.name || 'None';
            const newUser = users.find(u => u.id === asset.userId)?.name || 'None';
            historyDetails.push(`Assigned user changed from ${oldUser} to ${newUser}`);
          }
          if (asset.locationId !== undefined && asset.locationId !== oldAsset.locationId) {
            const oldLoc = locations.find(l => l.id === oldAsset.locationId)?.name || 'None';
            const newLoc = locations.find(l => l.id === asset.locationId)?.name || 'None';
            historyDetails.push(`Location changed from ${oldLoc} to ${newLoc}`);
          }

          if (historyDetails.length > 0) {
            await addAssetHistory({
              assetId: id,
              date: new Date().toISOString(),
              action: 'Update',
              details: historyDetails.join(', '),
              userId: currentUser?.id
            });
          }
        }
      } else {
        const err = await res.json();
        addNotification(`Failed to update asset: ${err.error || 'Unknown error'}`, 'error');
        throw new Error(err.error || 'Failed to update asset');
      }
    } catch (error: any) {
      console.error('Update asset failed:', error);
      throw error;
    }
  };
  const deleteAsset = async (id: string) => {
    try {
      const asset = assets.find(a => a.id === id);
      const res = await fetchWithAuth(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== id));
        await logAction('Delete Asset', `Deleted asset: ${asset?.name} (${asset?.tag})`);
        addNotification('Asset deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete asset');
      }
    } catch (error: any) {
      console.error('Delete asset failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const bulkDeleteAssets = async (ids: string[]) => {
    try {
      const res = await fetchWithAuth('/api/assets/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        setAssets(prev => prev.filter(a => !ids.includes(a.id)));
        await logAction('Bulk Delete Assets', `Deleted ${ids.length} assets`);
        addNotification(`Successfully deleted ${ids.length} assets`, 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete assets');
      }
    } catch (error: any) {
      console.error('Bulk delete assets failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const bulkUpdateAssetStatus = async (ids: string[], status: T.AssetStatus) => {
    try {
      const res = await fetchWithAuth('/api/assets/bulk-update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      if (res.ok) {
        setAssets(prev => (prev || []).map(a => ids.includes(a.id) ? { ...a, status } : a));
        await logAction('Bulk Update Asset Status', `Updated ${ids.length} assets to ${status}`);
        addNotification(`Successfully updated ${ids.length} assets to ${status}`, 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update assets');
      }
    } catch (error: any) {
      console.error('Bulk update assets failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addCheckup = async (checkup: Omit<T.Checkup, 'id'>) => {
    try {
      const newItem = { ...checkup, id: generateId() };
      const res = await fetchWithAuth('/api/checkups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setCheckups(prev => [...prev, newItem]);
        await logAction('Add Checkup', `Added checkup: ${checkup.category} on ${checkup.date}`);
        addNotification('Checkup added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add checkup');
      }
    } catch (error: any) {
      console.error('Add checkup failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateCheckup = async (id: string, checkup: Partial<T.Checkup>) => {
    try {
      const res = await fetchWithAuth(`/api/checkups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkup)
      });
      if (res.ok) {
        setCheckups(prev => (prev || []).map(c => c.id === id ? { ...c, ...checkup } : c));
        await logAction('Update Checkup', `Updated checkup ID: ${id}`);
        addNotification('Checkup updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update checkup');
      }
    } catch (error: any) {
      console.error('Update checkup failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteCheckup = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/checkups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCheckups(prev => prev.filter(c => c.id !== id));
        await logAction('Delete Checkup', `Deleted checkup record ID: ${id}`);
        addNotification('Checkup deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete checkup');
      }
    } catch (error: any) {
      console.error('Delete checkup failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addIssue = async (issue: Omit<T.Issue, 'id'>) => {
    try {
      const res = await fetchWithAuth('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
      });
      if (res.ok) {
        const savedIssue = await res.json();
        setIssues(prev => [...prev, savedIssue]);
        await logAction('Add Issue', `Reported issue: ${issue.description}`);
        addNotification('Issue reported successfully', 'success');
        await refreshAlerts();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to report issue');
      }
    } catch (error: any) {
      console.error('Add issue failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateIssue = async (id: string, issue: Partial<T.Issue>) => {
    try {
      const oldIssue = issues.find(i => i.id === id);
      const res = await fetchWithAuth(`/api/issues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
      });
      if (res.ok) {
        setIssues(prev => (prev || []).map(i => i.id === id ? { ...i, ...issue } : i));
        await logAction('Update Issue', `Updated issue ID: ${id}`);
        addNotification('Issue updated successfully', 'success');
        await refreshAlerts();

        // Automatic Daily Task Logging
        if (oldIssue && (issue.progress !== undefined || issue.status !== undefined || issue.resolutionNote !== undefined)) {
          const user = currentUser?.name || 'Technician';
          const details = [];
          if (issue.status && issue.status !== oldIssue.status) details.push(`Status: ${issue.status}`);
          if (issue.progress !== undefined && issue.progress !== oldIssue.progress) details.push(`Progress: ${issue.progress}%`);
          if (issue.resolutionNote) details.push(`Note: ${issue.resolutionNote}`);

          if (details.length > 0) {
            await addDailyTask({
              date: new Date().toISOString().split('T')[0],
              task: `Ticket Update: ${oldIssue.description.substring(0, 50)}${oldIssue.description.length > 50 ? '...' : ''}`,
              category: 'IT Support',
              status: 'Done',
              remarks: `${user} updated ticket. ${details.join(' | ')}`,
              assetId: oldIssue.assetId,
              targetUserId: oldIssue.reportedByUserId
            });
          }
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update issue');
      }
    } catch (error: any) {
      console.error('Update issue failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteIssue = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/issues/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIssues(prev => (prev || []).filter(i => i.id !== id));
        await logAction('Delete Issue', `Deleted issue ID: ${id}`);
        addNotification('Issue deleted successfully', 'success');
        await refreshAlerts();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete issue');
      }
    } catch (error: any) {
      console.error('Delete issue failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const updateIssueFeedback = async (id: string, feedback: { rating: number; comment?: string }) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    const updated = { ...issue, feedback };
    const res = await fetchWithAuth(`/api/issues/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      setIssues(prev => (prev || []).map(i => i.id === id ? updated : i));
      await logAction('Issue Feedback', `User provided feedback for issue ID: ${id}`);
    }
  };
  
  const addTask = async (task: Omit<T.Task, 'id'>) => {
    try {
      const newItem = { ...task, id: generateId(), notes: [] };
      const res = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setTasks(prev => [...prev, newItem]);
        await logAction('Add Task', `Added task: ${task.title}`);
        addNotification('Task added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add task');
      }
    } catch (error: any) {
      console.error('Add task failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateTask = async (id: string, task: Partial<T.Task>) => {
    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        setTasks(prev => (prev || []).map(t => t.id === id ? { ...t, ...task } : t));
        await logAction('Update Task', `Updated task ID: ${id}`);
        addNotification('Task updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update task');
      }
    } catch (error: any) {
      console.error('Update task failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteTask = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(prev => (prev || []).filter(t => t.id !== id));
        await logAction('Delete Task', `Deleted task ID: ${id}`);
        addNotification('Task deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete task');
      }
    } catch (error: any) {
      console.error('Delete task failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const addTaskNote = async (taskId: string, text: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const updated = { 
        ...task, 
        notes: [...(task.notes || []), { id: generateId(), date: new Date().toISOString(), note: text }] 
      };
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setTasks(prev => (prev || []).map(t => t.id === taskId ? updated : t));
        await logAction('Add Task Note', `Added note to task ID: ${taskId}`);
        addNotification('Note added to task', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add task note');
      }
    } catch (error: any) {
      console.error('Add task note failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteTaskNote = async (taskId: string, noteId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const updated = { 
        ...task, 
        notes: (task.notes || []).filter(n => n.id !== noteId) 
      };
      const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setTasks(prev => (prev || []).map(t => t.id === taskId ? updated : t));
        await logAction('Delete Task Note', `Deleted note from task ID: ${taskId}`);
        addNotification('Note deleted from task', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete task note');
      }
    } catch (error: any) {
      console.error('Delete task note failed:', error);
      addNotification(error.message, 'error');
    }
  };
  
  const addSoftwareWarranty = async (sw: Omit<T.SoftwareWarranty, 'id'>) => {
    try {
      const newItem = { ...sw, id: generateId() };
      const res = await fetchWithAuth('/api/software-warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setSoftwareWarranties(prev => [...prev, newItem]);
        await logAction('Add Software/Warranty', `Added record: ${sw.name}`);
        addNotification('Software/Warranty added successfully', 'success');
        await refreshAlerts();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add software/warranty');
      }
    } catch (error: any) {
      console.error('Add software/warranty failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateSoftwareWarranty = async (id: string, sw: Partial<T.SoftwareWarranty>) => {
    try {
      const res = await fetchWithAuth(`/api/software-warranties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sw)
      });
      if (res.ok) {
        setSoftwareWarranties(prev => (prev || []).map(s => s.id === id ? { ...s, ...sw } : s));
        await logAction('Update Software/Warranty', `Updated record ID: ${id}`);
        addNotification('Software/Warranty updated successfully', 'success');
        await refreshAlerts();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update software/warranty');
      }
    } catch (error: any) {
      console.error('Update software/warranty failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteSoftwareWarranty = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/software-warranties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSoftwareWarranties(prev => (prev || []).filter(s => s.id !== id));
        await logAction('Delete Software/Warranty', `Deleted record ID: ${id}`);
        addNotification('Software/Warranty deleted successfully', 'success');
        await refreshAlerts();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete software/warranty');
      }
    } catch (error: any) {
      console.error('Delete software/warranty failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addHoliday = async (holiday: Omit<T.Holiday, 'id'>) => {
    try {
      const newItem = { ...holiday, id: generateId() };
      const res = await fetchWithAuth('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setHolidays(prev => [...prev, newItem]);
        await logAction('Add Holiday', `Added holiday: ${holiday.reason} on ${holiday.date}`);
        addNotification('Holiday added successfully', 'success');
      } else {
        let errorMessage = 'Failed to add holiday';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch (e) {
          const text = await res.text();
          console.error('Non-JSON error response:', text);
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Add holiday failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateHoliday = async (id: string, holiday: Partial<T.Holiday>) => {
    try {
      const res = await fetchWithAuth(`/api/holidays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holiday)
      });
      if (res.ok) {
        setHolidays(prev => (prev || []).map(h => h.id === id ? { ...h, ...holiday } : h));
        await logAction('Update Holiday', `Updated holiday ID: ${id}`);
        addNotification('Holiday updated successfully', 'success');
      } else {
        let errorMessage = 'Failed to update holiday';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch (e) {
          const text = await res.text();
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Update holiday failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteHoliday = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHolidays(prev => (prev || []).filter(h => h.id !== id));
        await logAction('Delete Holiday', `Deleted holiday ID: ${id}`);
        addNotification('Holiday deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete holiday');
      }
    } catch (error: any) {
      console.error('Delete holiday failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const updateWorkDays = async (days: string[]) => {
    try {
      const res = await fetchWithAuth('/api/sys-config/workDays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: days })
      });
      if (res.ok) {
        setWorkDays(days);
        await logAction('Update Work Days', `Updated work days to: ${days.join(', ')}`);
        addNotification('Work days updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update work days');
      }
    } catch (error: any) {
      console.error('Update work days failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const updateOfficeHours = async (hours: T.OfficeHours) => {
    try {
      const res = await fetchWithAuth('/api/sys-config/office_hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: hours })
      });
      if (res.ok) {
        setOfficeHours(hours);
        await logAction('Update Office Hours', `Updated office hours to: ${hours.open} - ${hours.close}`);
        addNotification('Office hours updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update office hours');
      }
    } catch (error: any) {
      console.error('Update office hours failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addBackup = async (b: Omit<T.BackupDefinition, 'id'>) => {
    try {
      const newItem = { ...b, id: generateId() };
      const res = await fetchWithAuth('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setBackups(prev => [...prev, newItem]);
        addNotification('Backup added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add backup');
      }
    } catch (error: any) {
      console.error('Add backup failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateBackup = async (id: string, b: Partial<T.BackupDefinition>) => {
    try {
      const res = await fetchWithAuth(`/api/backups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });
      if (res.ok) {
        setBackups(prev => (prev || []).map(x => x.id === id ? { ...x, ...b } : x));
        addNotification('Backup updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update backup');
      }
    } catch (error: any) {
      console.error('Update backup failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteBackup = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/backups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBackups(prev => (prev || []).filter(x => x.id !== id));
        addNotification('Backup deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete backup');
      }
    } catch (error: any) {
      console.error('Delete backup failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addUpdateDef = async (u: Omit<T.UpdateDefinition, 'id'>) => {
    try {
      const newItem = { ...u, id: generateId() };
      const res = await fetchWithAuth('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setUpdates(prev => [...prev, newItem]);
        addNotification('Update definition added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add update definition');
      }
    } catch (error: any) {
      console.error('Add update definition failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateUpdateDef = async (id: string, u: Partial<T.UpdateDefinition>) => {
    try {
      const res = await fetchWithAuth(`/api/updates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      });
      if (res.ok) {
        setUpdates(prev => (prev || []).map(x => x.id === id ? { ...x, ...u } : x));
        addNotification('Update definition updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update update definition');
      }
    } catch (error: any) {
      console.error('Update update definition failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteUpdateDef = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/updates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUpdates(prev => (prev || []).filter(x => x.id !== id));
        addNotification('Update definition deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete update definition');
      }
    } catch (error: any) {
      console.error('Delete update definition failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addSystemCheckDef = async (s: Omit<T.SystemCheckDefinition, 'id'>) => {
    try {
      const newItem = { ...s, id: generateId() };
      const res = await fetchWithAuth('/api/system-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setSystemChecks(prev => [...prev, newItem]);
        addNotification('System check added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add system check');
      }
    } catch (error: any) {
      console.error('Add system check failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateSystemCheckDef = async (id: string, s: Partial<T.SystemCheckDefinition>) => {
    try {
      const res = await fetchWithAuth(`/api/system-checks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (res.ok) {
        setSystemChecks(prev => (prev || []).map(x => x.id === id ? { ...x, ...s } : x));
        addNotification('System check updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update system check');
      }
    } catch (error: any) {
      console.error('Update system check failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteSystemCheckDef = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/system-checks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSystemChecks(prev => (prev || []).filter(x => x.id !== id));
        addNotification('System check deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete system check');
      }
    } catch (error: any) {
      console.error('Delete system check failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addServerDef = async (s: Omit<T.ServerDefinition, 'id'>) => {
    try {
      const newItem = { ...s, id: generateId() };
      const res = await fetchWithAuth('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setServers(prev => [...prev, newItem]);
        addNotification('Server added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add server');
      }
    } catch (error: any) {
      console.error('Add server failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateServerDef = async (id: string, s: Partial<T.ServerDefinition>) => {
    try {
      const res = await fetchWithAuth(`/api/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (res.ok) {
        setServers(prev => (prev || []).map(x => x.id === id ? { ...x, ...s } : x));
        addNotification('Server updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update server');
      }
    } catch (error: any) {
      console.error('Update server failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteServerDef = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setServers(prev => (prev || []).filter(x => x.id !== id));
        addNotification('Server deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete server');
      }
    } catch (error: any) {
      console.error('Delete server failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addSecurityDef = async (s: Omit<T.SecurityDefinition, 'id'>) => {
    try {
      const newItem = { ...s, id: generateId() };
      const res = await fetchWithAuth('/api/security-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setSecurityItems(prev => [...prev, newItem]);
        addNotification('Security item added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add security item');
      }
    } catch (error: any) {
      console.error('Add security item failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateSecurityDef = async (id: string, s: Partial<T.SecurityDefinition>) => {
    try {
      const res = await fetchWithAuth(`/api/security-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (res.ok) {
        setSecurityItems(prev => (prev || []).map(x => x.id === id ? { ...x, ...s } : x));
        addNotification('Security item updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update security item');
      }
    } catch (error: any) {
      console.error('Update security item failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteSecurityDef = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/security-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSecurityItems(prev => (prev || []).filter(x => x.id !== id));
        addNotification('Security item deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete security item');
      }
    } catch (error: any) {
      console.error('Delete security item failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addToDo = async (todo: Omit<T.ToDo, 'id' | 'createdAt'>) => {
    try {
      const newItem = { 
        ...todo, 
        id: generateId(), 
        createdAt: new Date().toISOString(),
        // Ensure no undefined values
        assetId: todo.assetId || null,
        userId: todo.userId || null,
        dueDate: todo.dueDate || null
      };
      const res = await fetchWithAuth('/api/to-dos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setToDos(prev => [...prev, newItem as unknown as T.ToDo]);
        await logAction('Add To-Do', `Added to-do: ${todo.title}`);
        addNotification('To-do added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add to-do');
      }
    } catch (error: any) {
      console.error('Add to-do failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const updateToDo = async (id: string, todo: Partial<T.ToDo>) => {
    try {
      // Ensure no undefined values are sent
      const sanitizedTodo: any = { ...todo };
      Object.keys(sanitizedTodo).forEach(key => {
        if (sanitizedTodo[key] === undefined) {
          sanitizedTodo[key] = null;
        }
      });

      const res = await fetchWithAuth(`/api/to-dos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedTodo)
      });
      if (res.ok) {
        setToDos(prev => (prev || []).map(t => t.id === id ? { ...t, ...todo } : t));
        await logAction('Update To-Do', `Updated to-do ID: ${id}`);
        addNotification('To-do updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update to-do');
      }
    } catch (error: any) {
      console.error('Update to-do failed:', error);
      addNotification(error.message, 'error');
    }
  };
  const deleteToDo = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/to-dos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToDos(prev => (prev || []).filter(t => t.id !== id));
        await logAction('Delete To-Do', `Deleted to-do ID: ${id}`);
        addNotification('To-do deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete to-do');
      }
    } catch (error: any) {
      console.error('Delete to-do failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addAssetHistory = async (history: Omit<T.AssetHistory, 'id'>) => {
    try {
      const newItem = { ...history, id: generateId() };
      const res = await fetchWithAuth('/api/asset-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setAssetHistory(prev => [newItem, ...prev]);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add asset history');
      }
    } catch (error: any) {
      console.error('Add asset history failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const addTonerLog = async (log: Omit<T.TonerLog, 'id'>) => {
    try {
      const newItem = { ...log, id: generateId() };
      const res = await fetchWithAuth('/api/toner-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setTonerLogs(prev => [newItem, ...prev]);
        await logAction('Add Toner Log', `Added toner log for asset ID: ${log.assetId}`);
        await addAssetHistory({
          assetId: log.assetId,
          date: log.date,
          action: 'Toner Change',
          details: `Toner changed: ${log.tonerModel}. Notes: ${log.notes || 'None'}`,
          userId: currentUser?.id
        });
        addNotification('Toner log added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add toner log');
      }
    } catch (error: any) {
      console.error('Add toner log failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const deleteTonerLog = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/toner-logs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTonerLogs(prev => (prev || []).filter(l => l.id !== id));
        await logAction('Delete Toner Log', `Deleted toner log ID: ${id}`);
        addNotification('Toner log deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete toner log');
      }
    } catch (error: any) {
      console.error('Delete toner log failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/alerts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts(prev => (prev || []).filter(a => a.id !== id));
        addNotification('Alert deleted', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete alert');
      }
    } catch (error: any) {
      console.error('Delete alert failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const markAlertAsRead = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: 1 })
      });
      if (res.ok) {
        setAlerts(prev => (prev || []).map(a => a.id === id ? { ...a, isRead: 1 } : a));
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to mark alert as read');
      }
    } catch (error: any) {
      console.error('Mark alert as read failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const updateSettings = async (updates: Record<string, string>) => {
    try {
      const res = await fetchWithAuth('/api/sys-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, ...updates }));
        addNotification('Settings updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('Update settings failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const exportData = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/export-json');
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `it-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logAction('Export Data', 'Exported full database backup including user hashes.');
      addNotification('Backup downloaded successfully', 'success');
    } catch (error: any) {
      console.error('Export failed:', error);
      addNotification('Failed to export data', 'error');
    }
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      const response = await fetchWithAuth('/api/admin/restore-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        await fetchData();
        addNotification('Data restored successfully!', 'success');
        logAction('Import Data', 'Restored full database from JSON backup.');
      } else {
        const err = await response.json();
        addNotification(`Restore failed: ${err.error}`, 'error');
      }
    } catch (e) {
      addNotification('Failed to parse JSON backup or server error.', 'error');
      console.error(e);
    }
  };

  const downloadDatabase = () => {
    const a = document.createElement('a');
    // For direct downloads, we can't easily add headers via <a> tag.
    // We could use fetch and create a blob, but let's try to pass it in query if needed.
    // Or just rely on the fact that it's a GET request and we might need a token.
    // Since we are using x-user-id header, we should use fetch.
    
    fetchWithAuth('/api/admin/download-db')
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'it-manager-database.sqlite';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      });
    logAction('Download Database', 'Downloaded the SQLite database file.');
  };

  const restoreDatabase = async (file: File) => {
    const formData = new FormData();
    formData.append('database', file);
    
    try {
      const response = await fetchWithAuth('/api/admin/restore-db', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        addNotification('Database restored successfully! The server is restarting. Please refresh the page in a few seconds.', 'success');
        logAction('Restore Database', 'Restored SQLite database file.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const err = await response.json();
        addNotification(`Restore failed: ${err.error}`, 'error');
      }
    } catch (e) {
      addNotification('Failed to upload database file.', 'error');
      console.error(e);
    }
  };

  const resetDatabase = async (username: string, password: string) => {
    try {
      const response = await fetchWithAuth('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        addNotification('Database reset successfully! The server has been cleared.', 'success');
        await fetchData();
        return true;
      } else {
        const err = await response.json();
        addNotification(`Reset failed: ${err.error}`, 'error');
        return false;
      }
    } catch (e) {
      addNotification('Failed to reset database.', 'error');
      console.error(e);
      return false;
    }
  };

  const addNote = async (note: Omit<T.Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: T.Note = {
      ...note,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser?.id
    };
    const res = await fetchWithAuth('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setNotes(prev => [...prev, newItem]);
      await logAction('Add Note', `Added note: ${note.title}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to add note: ${err.error}`, 'error');
    }
  };

  const updateNote = async (id: string, note: Partial<T.Note>) => {
    const updatedNote = { ...note, updatedAt: new Date().toISOString() };
    const res = await fetchWithAuth(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNote)
    });
    if (res.ok) {
      setNotes(prev => (prev || []).map(n => n.id === id ? { ...n, ...updatedNote } : n));
      await logAction('Update Note', `Updated note ID: ${id}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to update note: ${err.error}`, 'error');
    }
  };

  const deleteNote = async (id: string) => {
    const res = await fetchWithAuth(`/api/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== id));
      await logAction('Delete Note', `Deleted note ID: ${id}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to delete note: ${err.error}`, 'error');
    }
  };

  const addProcedure = async (procedure: Omit<T.Procedure, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: T.Procedure = {
      ...procedure,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser?.id
    };
    const res = await fetchWithAuth('/api/procedures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setProcedures(prev => [...prev, newItem]);
      await logAction('Add Procedure', `Added procedure: ${procedure.title}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to add procedure: ${err.error}`, 'error');
    }
  };

  const updateProcedure = async (id: string, procedure: Partial<T.Procedure>) => {
    const updatedProcedure = { ...procedure, updatedAt: new Date().toISOString() };
    const res = await fetchWithAuth(`/api/procedures/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProcedure)
    });
    if (res.ok) {
      setProcedures(prev => (prev || []).map(p => p.id === id ? { ...p, ...updatedProcedure } : p));
      await logAction('Update Procedure', `Updated procedure ID: ${id}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to update procedure: ${err.error}`, 'error');
    }
  };

  const deleteProcedure = async (id: string) => {
    const res = await fetchWithAuth(`/api/procedures/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProcedures(prev => prev.filter(p => p.id !== id));
      await logAction('Delete Procedure', `Deleted procedure ID: ${id}`);
    } else {
      const err = await res.json();
      addNotification(`Failed to delete procedure: ${err.error}`, 'error');
    }
  };

  const addDailyTask = async (task: Omit<T.DailyTask, 'id' | 'createdAt' | 'userId'>) => {
    const res = await fetchWithAuth('/api/daily-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (res.ok) {
      const newItem = await res.json();
      setDailyTasks(prev => [...prev, newItem]);
      await logAction('Add Daily Task', `Added task: ${task.task}`);
    }
  };

  const updateDailyTask = async (id: string, task: Partial<T.DailyTask>) => {
    const res = await fetchWithAuth(`/api/daily-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (res.ok) {
      const updated = await res.json();
      setDailyTasks(prev => prev.map(t => t.id === id ? updated : t));
      await logAction('Update Daily Task', `Updated task ID: ${id}`);
    }
  };

  const deleteDailyTask = async (id: string) => {
    const res = await fetchWithAuth(`/api/daily-tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDailyTasks(prev => prev.filter(t => t.id !== id));
      await logAction('Delete Daily Task', `Deleted task ID: ${id}`);
    }
  };

  const addStaff = async (name: string) => {
    const res = await fetchWithAuth('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      const newItem = await res.json();
      setStaff(prev => [...prev, newItem]);
      await logAction('Add Staff', `Added staff: ${name}`);
      addNotification(`Staff "${name}" added successfully`, 'success');
    }
  };

  const deleteStaff = async (id: string) => {
    const res = await fetchWithAuth(`/api/staff/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStaff(prev => prev.filter(s => s.id !== id));
      await logAction('Delete Staff', `Deleted staff ID: ${id}`);
    }
  };

  const addContact = async (contact: Omit<T.Contact, 'id' | 'createdAt'>) => {
    try {
      const newItem = {
        ...contact,
        id: generateId(),
        createdAt: new Date().toISOString(),
        userId: currentUser?.id
      };
      const res = await fetchWithAuth('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setContacts(prev => [...prev, newItem]);
        await logAction('Add Contact', `Added POC: ${contact.name}`);
        addNotification('Contact added successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add contact');
      }
    } catch (error: any) {
      console.error('Add contact failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const updateContact = async (id: string, contact: Partial<T.Contact>) => {
    try {
      const res = await fetchWithAuth(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      if (res.ok) {
        setContacts(prev => (prev || []).map(c => c.id === id ? { ...c, ...contact } : c));
        await logAction('Update Contact', `Updated POC ID: ${id}`);
        addNotification('Contact updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update contact');
      }
    } catch (error: any) {
      console.error('Update contact failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts(prev => (prev || []).filter(c => c.id !== id));
        await logAction('Delete Contact', `Deleted POC ID: ${id}`);
        addNotification('Contact deleted successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete contact');
      }
    } catch (error: any) {
      console.error('Delete contact failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const savePermission = async (perm: Omit<T.Permission, 'id'>) => {
    try {
      const res = await fetchWithAuth('/api/auth-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perm)
      });
      if (res.ok) {
        await fetchData(); // Refresh all permissions
        addNotification('Permission updated successfully', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save permission');
      }
    } catch (error: any) {
      console.error('Save permission failed:', error);
      addNotification(error.message, 'error');
    }
  };

  const deletePermission = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/auth-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPermissions(prev => prev.filter(p => p.id !== id));
        addNotification('Permission override removed', 'success');
      }
    } catch (error: any) {
      console.error('Delete permission failed:', error);
    }
  };

  return (
    <StoreContext.Provider value={{
      currentUser, login, logout,
      assetTypes, addAssetType, updateAssetType, deleteAssetType,
      locations, addLocation, updateLocation, deleteLocation,
      users, addUser, updateUser, deleteUser,
      assets, addAsset, updateAsset, deleteAsset, bulkDeleteAssets, bulkUpdateAssetStatus,
      checkups, addCheckup, updateCheckup, deleteCheckup,
      issues, addIssue, updateIssue, deleteIssue, updateIssueFeedback,
      tasks, addTask, updateTask, deleteTask, addTaskNote, deleteTaskNote,
      softwareWarranties, addSoftwareWarranty, updateSoftwareWarranty, deleteSoftwareWarranty,
      holidays, addHoliday, updateHoliday, deleteHoliday,
      logs, logAction,
      backups, addBackup, updateBackup, deleteBackup,
      updates, addUpdateDef, updateUpdateDef, deleteUpdateDef,
      systemChecks, addSystemCheckDef, updateSystemCheckDef, deleteSystemCheckDef,
      servers, addServerDef, updateServerDef, deleteServerDef,
      securityItems, addSecurityDef, updateSecurityDef, deleteSecurityDef,
      toDos, addToDo, updateToDo, deleteToDo,
      assetHistory, addAssetHistory,
      notes, addNote, updateNote, deleteNote,
      procedures, addProcedure, updateProcedure, deleteProcedure,
      dailyTasks, addDailyTask, updateDailyTask, deleteDailyTask,
      staff, addStaff, deleteStaff,
      contacts, addContact, updateContact, deleteContact,
      permissions, savePermission, deletePermission,
      tonerLogs, addTonerLog, deleteTonerLog,
      notifications, addNotification, removeNotification,
      alerts, deleteAlert, markAlertAsRead, refreshAlerts,
      settings, updateSettings,
      workDays, updateWorkDays,
      officeHours, updateOfficeHours,
      theme, toggleTheme, dismissAlert,
      hasPermission,
      fetchData,
      exportData, importData, downloadDatabase, restoreDatabase, resetDatabase,
      serverBackups, fetchServerBackups, triggerManualBackup, downloadBackup, deleteBackupFile
    }}>
      {children}
    </StoreContext.Provider>
  );
};
