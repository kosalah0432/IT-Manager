import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { 
  Plus, Edit2, Trash2, Shield, Key, 
  X, Save, Lock, Eye, EyeOff, Globe, 
  User as UserIcon, AlertCircle, Search, MessageSquare, RotateCcw
} from 'lucide-react';
import { Role, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';
import { Download, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Users() {
  const { 
    users, addUser, updateUser, deleteUser, 
    currentUser 
  } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`user-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({ ...location.state, scrollToId: undefined }, document.title);
    }
  }, [location.state]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedUserForVault, setSelectedUserForVault] = useState<User | null>(null);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  
  const initialFormData = { 
    name: '', 
    username: '', 
    email: '', 
    role: 'User' as Role, 
    password: '', 
    status: 'Active' as 'Active' | 'Inactive',
    privateNote: '',
    mobile: '',
    extension: ''
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('users', initialFormData, showForm && !editingId);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUser(editingId, formData);
        setEditingId(null);
      } else {
        await addUser(formData);
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('User submission failed:', error);
    }
  };

  const handleExportTemplate = () => {
    const templateRows = [
      {
        'Name': 'John Smith',
        'Username': 'jsmith',
        'Email': 'smith@example.com',
        'Role': 'User', // Admin, Technician, User
        'Status': 'Active', // Active, Inactive
        'Password': 'password123',
        'Mobile': '0771234567',
        'Extension': '101',
        'PrivateNote': 'Notes here'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Template");
    XLSX.writeFile(wb, "users_import_template.csv");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const row of data) {
          const rawRole = String(row['Role'] || 'User').trim();
          const role = (['Admin', 'Technician', 'User'].find(r => r.toLowerCase() === rawRole.toLowerCase()) || 'User') as any;
          const rawStatus = String(row['Status'] || 'Active').trim();
          const status = (['Active', 'Inactive'].find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active') as any;

          const newUser = {
            name: String(row['Name'] || ''),
            username: String(row['Username'] || ''),
            email: String(row['Email'] || ''),
            role,
            status,
            password: String(row['Password'] || 'password123'),
            mobile: String(row['Mobile'] || ''),
            extension: String(row['Extension'] || ''),
            privateNote: String(row['PrivateNote'] || '')
          };

          if (newUser.name && newUser.username) {
            await addUser(newUser);
            importedCount++;
          }
        }
        alert(`Successfully imported ${importedCount} users.`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import users. Check file format.');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
    } catch (error) {
      console.error('User deletion failed:', error);
    }
  };

  const handleEdit = (user: any) => {
    setFormData({ 
      name: user.name || '', 
      username: user.username || '', 
      email: user.email || '', 
      role: user.role || 'User',
      password: '',
      status: user.status || 'Active',
      privateNote: user.privateNote || '',
      mobile: user.mobile || '',
      extension: user.extension || ''
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage system users and their access levels.</p>
        </div>
        <div className="flex gap-2">
          {(currentUser?.role === 'Admin' || currentUser?.role === 'Technician') && (
            <>
              <button 
                onClick={handleExportTemplate}
                className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all font-bold uppercase tracking-wider text-[8px] border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
              >
                <Download className="w-2.5 h-2.5" /> Template
              </button>
              <label className="bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all font-bold uppercase tracking-wider text-[8px] border border-amber-200 dark:border-amber-800/50 shadow-sm cursor-pointer">
                <Upload className="w-2.5 h-2.5" /> 
                {isImporting ? 'Importing...' : 'Import CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={isImporting} />
              </label>
            </>
          )}
          <button onClick={() => {
          setFormData({ name: '', username: '', email: '', role: 'User', password: '', status: 'Active', privateNote: '', mobile: '', extension: '' });
          setEditingId(null);
          setShowForm(!showForm);
        }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>
    </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="w-full pl-10 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-w-[150px]"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as any)}
        >
          <option value="All">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Technician">Technician</option>
          <option value="User">User</option>
        </select>
        <select 
          className="px-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-w-[150px]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-medium">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
            <input required type="text" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
            <input required type="text" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="username" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
            <input type="email" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email (Optional)" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
              <option value="Admin">Admin</option>
              <option value="Technician">Technician</option>
              <option value="User">User</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <input 
              required={!editingId} 
              type="password" 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder={editingId ? "Leave blank to keep current password" : "Enter password"} 
            />
          </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile Number</label>
              <input 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" 
                value={formData.mobile} 
                onChange={e => setFormData({...formData, mobile: e.target.value})} 
                placeholder="07x xxxxxxx" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Intercom Ext.</label>
              <input 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" 
                value={formData.extension} 
                onChange={e => setFormData({...formData, extension: e.target.value})} 
                placeholder="101" 
              />
            </div>

          {(currentUser?.role === 'Admin' || currentUser?.role === 'Technician') && (
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Private Note (Admin/Tech Only)</label>
              <textarea 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 min-h-[100px]" 
                value={formData.privateNote} 
                onChange={e => setFormData({...formData, privateNote: e.target.value})} 
                placeholder="Internal notes about this user..." 
              />
            </div>
          )}
          
          <div className="md:col-span-2 flex justify-between items-center mt-4 gap-4">
            {isDirty && !editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" /> Clear Draft
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }} className="px-6 py-3 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest text-xs transition-colors">Cancel</button>
              <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all">{editingId ? 'Update User' : 'Save User'}</button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Extension</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUsers.map(user => (
              <tr key={user.id} id={`user-${user.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.privateNote && (
                        <div className="group relative ml-2 inline-block">
                          <button 
                            onClick={() => setViewingNote(user.privateNote || null)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                          >
                            <MessageSquare 
                              className="w-4 h-4 text-indigo-500 cursor-pointer" 
                              title="Click to view full private note"
                            />
                          </button>
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 min-w-[150px]">
                            <div className="bg-gray-900 dark:bg-gray-700 text-white text-[9px] p-2 rounded-lg shadow-2xl whitespace-nowrap border border-gray-800 dark:border-gray-600">
                                Click to open full note
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{user.mobile || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{user.extension || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                    user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                    user.role === 'Technician' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                    user.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {user.status || 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(user)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic text-sm">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        title="Private Note"
      >
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 min-h-[150px]">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {viewingNote}
          </p>
        </div>
        <div className="flex justify-end pt-4">
          <button 
            onClick={() => setViewingNote(null)}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
