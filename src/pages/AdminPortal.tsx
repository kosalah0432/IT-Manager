import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { 
  Users, Shield, Lock, Settings, 
  UserPlus, ShieldCheck, AlertTriangle, 
  CheckCircle2, Trash2, Edit2, X, Key,
  Save, Eye, EyeOff, Globe, User as UserIcon,
  ChevronRight, Check, Minus, Search, RotateCcw
} from 'lucide-react';
import { clsx } from 'clsx';
import { Role, User, Permission } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';

export default function AdminPortal() {
  const { 
    users, addUser, updateUser, deleteUser, currentUser,
    permissions, savePermission, deletePermission, settings, updateSettings
  } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'settings'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const initialUserFormData = {
    name: '', email: '', password: '', role: 'User' as Role, status: 'Active' as 'Active' | 'Inactive'
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('admin_users', initialUserFormData, showUserForm && !editingUser);

  // Permissions search state
  const [permSearchQuery, setPermSearchQuery] = useState('');

  // Permissions state
  const [selectedResourceType, setSelectedResourceType] = useState<'role' | 'user'>('role');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('Technician');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You do not have the necessary privileges to access the Admin Portal. 
          Please contact a system administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser({...formData, username: formData.email.split('@')[0]}); // Add username fallback
      clearPersistence();
    }
    setShowUserForm(false);
    resetForm();
    setEditingUser(null);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'User',
      status: user.status || 'Active'
    });
    setShowUserForm(true);
  };

  const roles: { role: Role, description: string, color: string }[] = [
    { role: 'Admin', description: 'Full system access, user management, and configuration.', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
    { role: 'Technician', description: 'Manage assets, issues, tasks, and to-do lists.', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
    { role: 'User', description: 'View-only access to assets and report issues.', color: 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400' }
  ];

  const resources = [
    { id: 'assets', name: 'Assets', description: 'Equipment and devices' },
    { id: 'tasks', name: 'Tasks', description: 'General maintenance tasks' },
    { id: 'issues', name: 'Issues', description: 'User reported problems' },
    { id: 'users', name: 'Users', description: 'System user accounts' },
    { id: 'notes', name: 'Notes', description: 'Shared documents' },
    { id: 'procedures', name: 'Procedures', description: 'Step-by-step guides' },
    { id: 'daily_tasks', name: 'Daily Tasks', description: 'Staff daily agenda' },
    { id: 'logs', name: 'Audit Logs', description: 'System activity history' },
    { id: 'settings', name: 'Settings', description: 'Global configuration' },
  ];

  const getTargetPermission = (resource: string) => {
    return permissions.find(p => p.type === selectedResourceType && p.targetId === selectedTargetId && p.resource === resource) || {
      canView: false, canCreate: false, canEdit: false, canDelete: false
    };
  };

  const handleTogglePermission = async (resource: string, action: keyof Omit<Permission, 'id' | 'type' | 'targetId' | 'resource'>) => {
    const current = getTargetPermission(resource);
    const updated = {
      ...current,
      type: selectedResourceType,
      targetId: selectedTargetId,
      resource,
      [action]: !current[action]
    };
    await savePermission(updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Configure system access and manage your team.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2",
              activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2",
              activeTab === 'permissions' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Permissions
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2",
              activeTab === 'settings' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setFormData({ name: '', email: '', password: '', role: 'User' });
                  setShowUserForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold uppercase tracking-wider text-xs whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</th>
                          <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                          <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {users.slice()
                          .filter(u => 
                            u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                          )
                          .sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                          <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={clsx(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                roles.find(r => r.role === user.role)?.color
                              )}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={clsx(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                user.status === 'Inactive' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-green-100 text-green-700 dark:bg-green-900/30'
                              )}>
                                {user.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setActiveTab('permissions');
                                    setSelectedResourceType('user');
                                    setSelectedTargetId(user.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                  title="Individual Permissions"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEdit(user)}
                                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  disabled={user.id === currentUser?.id || user.id === 'admin'}
                                  onClick={() => deleteUser(user.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm p-6 space-y-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" /> Default Roles
                  </h3>
                  <div className="space-y-6">
                    {roles.map(role => (
                      <div key={role.role} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", role.color)}>
                            {role.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'permissions' ? (
          <motion.div
            key="permissions-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* ... permissions content ... */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar: Target Selection */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Target</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="px-2 pt-2 pb-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global Group Config</div>
                    {roles.filter(r => r.role !== 'Admin').map(r => (
                      <button
                        key={r.role}
                        onClick={() => {
                          setSelectedResourceType('role');
                          setSelectedTargetId(r.role);
                        }}
                        className={clsx(
                          "w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all text-left",
                          selectedResourceType === 'role' && selectedTargetId === r.role
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4" />
                          {r.role === 'Technician' ? 'Technician Group' : 'User Group'}
                        </div>
                        {selectedResourceType === 'role' && selectedTargetId === r.role && <ChevronRight className="w-4 h-4" />}
                      </button>
                    ))}

                    <div className="px-2 pt-6 pb-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Individual Overrides</div>
                    <div className="px-2 pb-3 pt-1">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input 
                          type="text"
                          placeholder="Search users..."
                          value={userSearchQuery}
                          onChange={e => setUserSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto px-1 space-y-1">
                      {users.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.role.toLowerCase().includes(userSearchQuery.toLowerCase())).map(user => (
                        <button
                          key={user.id}
                          disabled={user.role === 'Admin'}
                          onClick={() => {
                            setSelectedResourceType('user');
                            setSelectedTargetId(user.id);
                          }}
                          className={clsx(
                            "w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all text-left",
                            selectedResourceType === 'user' && selectedTargetId === user.id
                              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
                            user.role === 'Admin' && "opacity-50 grayscale cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <UserIcon className="w-4 h-4" />
                            <div className="truncate">
                              <div className="truncate">{user.name}</div>
                              <div className="text-[10px] font-normal opacity-60 truncate">{user.role}</div>
                            </div>
                          </div>
                          {selectedResourceType === 'user' && selectedTargetId === user.id && <ChevronRight className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/30 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                      Individual overrides take precedence over global role permissions. Use them for specific requirements without changing the whole role.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main: Permissions Grid */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {selectedResourceType === 'role' ? (
                          <>Global Permission: <span className="text-indigo-600">{selectedTargetId === 'Technician' ? 'Technician Group' : 'User Group'}</span></>
                        ) : (
                          <>Individual Override: <span className="text-amber-600">{users.find(u => u.id === selectedTargetId)?.name}</span></>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">Configure access for each system module.</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/30 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                          <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">Resource</th>
                          <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">View</th>
                          <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Add</th>
                          <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Edit</th>
                          <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {resources.map(res => {
                          const p = getTargetPermission(res.id);
                          const isManagementLocked = ['users', 'logs', 'permissions', 'settings'].includes(res.id) && selectedResourceType === 'role' && selectedTargetId === 'User';
                          
                          return (
                            <tr key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                              <td className="p-6">
                                <div className="font-bold text-gray-900 dark:text-white capitalize text-sm">{res.name}</div>
                                <div className="text-[10px] text-gray-400">{res.description}</div>
                              </td>
                              {['canView', 'canCreate', 'canEdit', 'canDelete'].map(action => (
                                <td key={action} className="p-6 text-center">
                                  <button
                                    disabled={isManagementLocked}
                                    onClick={() => handleTogglePermission(res.id, action as any)}
                                    className={clsx(
                                      "w-10 h-10 rounded-2xl flex items-center justify-center mx-auto transition-all",
                                      (p as any)[action] 
                                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 scale-100 shadow-sm" 
                                        : "bg-gray-50 dark:bg-gray-900/50 text-gray-300 hover:text-gray-400",
                                      isManagementLocked && "opacity-20 cursor-not-allowed"
                                    )}
                                  >
                                    {(p as any)[action] ? <Check className="w-5 h-5" /> : <Minus className="w-4 h-4" />}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                    <Settings className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">System Settings</h3>
                    <p className="text-xs text-gray-500">Configure global application behavior.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Company Name</label>
                      <input 
                        type="text"
                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={settings.company_name || ''}
                        onChange={(e) => updateSettings({ ...settings, company_name: e.target.value })}
                        placeholder="Company Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Service Provider Name</label>
                      <input 
                        type="text"
                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={settings.service_provider_name || ''}
                        onChange={(e) => updateSettings({ ...settings, service_provider_name: e.target.value })}
                        placeholder="Service Provider Name"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-3 h-3 text-indigo-500" /> Ticket ID Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">ID Prefix</label>
                        <input 
                          type="text"
                          className="w-full rounded-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={settings.ticket_id_prefix || ''}
                          onChange={(e) => updateSettings({ ...settings, ticket_id_prefix: e.target.value })}
                          placeholder="e.g. TKT-"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Starting Number</label>
                        <input 
                          type="number"
                          className="w-full rounded-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={settings.ticket_id_start || ''}
                          onChange={(e) => updateSettings({ ...settings, ticket_id_start: e.target.value, ticket_id_current: e.target.value })}
                          placeholder="1000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Current Counter</label>
                        <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-950 px-3 py-2 text-xs text-gray-500 font-mono flex items-center">
                          {settings.ticket_id_current || settings.ticket_id_start || '1000'}
                        </div>
                        <p className="text-[9px] text-gray-400 italic mt-1">Updates automatically after each ticket.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Support Admin Email</label>
                    <input 
                      type="email"
                      className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={settings.admin_email || ''}
                      onChange={(e) => updateSettings({ ...settings, admin_email: e.target.value })}
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminForms 
        showUserForm={showUserForm} 
        setShowUserForm={setShowUserForm} 
        editingUser={editingUser} 
        formData={formData} 
        setFormData={setFormData} 
        handleSubmit={handleSubmit}
        isDirty={isDirty}
        resetForm={resetForm}
      />

    </div>
  );
}

function AdminForms({ showUserForm, setShowUserForm, editingUser, formData, setFormData, handleSubmit, isDirty, resetForm }: any) {
  return (
    <Modal
      isOpen={showUserForm}
      onClose={() => setShowUserForm(false)}
      title={editingUser ? 'Edit User' : 'Add New User'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-medium">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
          <input 
            required
            type="text" 
            className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
          <input 
            required
            type="email" 
            className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.email || ''}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
          <input 
            required={!editingUser}
            type="password" 
            placeholder={editingUser ? '(Leave blank to stay unchanged)' : 'Enter password'}
            className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.password || ''}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Role</label>
          <select 
            className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
          >
            <option value="Admin">Admin</option>
            <option value="Technician">Technician</option>
            <option value="User">User</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
          <select 
            className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="pt-4 flex gap-3 items-center">
          {isDirty && !editingUser && (
            <button 
              type="button" 
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <RotateCcw className="w-4 h-4" /> Clear
            </button>
          )}
          <div className="flex gap-3 ml-auto flex-1">
            <button 
              type="button"
              onClick={() => setShowUserForm(false)}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest text-xs transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
            >
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
