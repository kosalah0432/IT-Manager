import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { 
  Plus, Edit2, Trash2, X, Save, Search, 
  Phone, Mail, Building2, User as UserIcon, 
  Tag, Star, MoreVertical, ExternalLink,
  Users as UsersIcon, Globe, Lock, FileText,
  Download, Upload, FileSpreadsheet, Info,
  ChevronUp, ChevronDown, RotateCcw
} from 'lucide-react';
import { Contact, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

export default function Contacts() {
  const { 
    contacts, addContact, updateContact, deleteContact, 
    users, currentUser, hasPermission,
    updateUser, deleteUser 
  } = useStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Personal' | 'Directory' | 'Public'>('Directory');
  const [isEditingUser, setIsEditingUser] = useState(false);
  
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; isUser: boolean; name: string } | null>(null);
  
  const initialFormData = { 
    name: '', 
    organization: '', 
    role: '', 
    category: 'Vendor', 
    phone: '', 
    email: '', 
    priority: 'Secondary' as const,
    notes: '',
    userId: currentUser?.id,
    isStaffManual: 0,
    extension: '',
    isPublic: 0
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm: resetPersistentForm,
    clearPersistence,
    isDirty
  } = useFormPersistence('contacts_form', initialFormData, showForm && !editingId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'extension'; direction: 'asc' | 'desc' } | null>(null);

  const categories = ['All', 'Vendor', 'Client', 'ISP', 'Maintenance', 'Partner', 'Internal', 'Other'];

  const handleSort = (key: 'name' | 'extension') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

const filteredContacts = useMemo(() => {
    // 1. Get manually added staff contacts
    const manualStaff = (contacts || []).filter(c => (c as any).isStaffManual === 1);

    let result = [];

    if (activeTab === 'Directory') {
      const realUsers = (users || []).filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.extension?.includes(searchTerm) ||
        u.mobile?.includes(searchTerm)
      ).map(u => ({
        id: u.id,
        userId: u.id, // Setting userId to identify the "owner" as itself for synced records
        name: u.name,
        organization: '',
        role: u.role,
        category: 'Staff',
        phone: u.mobile, // Show mobile number from user profile
        email: u.email,
        priority: 'Secondary' as const,
        notes: u.extension ? `Ext: ${u.extension}` : '',
        createdAt: '',
        isUser: true,
        extension: u.extension
      }));

      const staffManualEntries = manualStaff.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.role?.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(c => ({
        ...c,
        category: 'Staff'
      }));

      result = [...realUsers, ...staffManualEntries];
    } else {
      result = (contacts || []).filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             c.phone?.includes(searchTerm) ||
                             c.role?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const isOwner = c.userId === currentUser?.id;
        const isShared = !!c.isPublic;
        const isStaffManual = !!c.isStaffManual;
        
        // EXCLUDE manual staff from Personal and Public tabs
        if (isStaffManual) return false;

        const matchesTab = activeTab === 'Personal' ? isOwner : (activeTab === 'Public' ? isShared : false);
        const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
        
        return matchesSearch && matchesCategory && matchesTab;
      });
    }

    return result.sort((a, b) => {
      // 1. Explicit sorting if config exists takes precedence
      if (sortConfig) {
        const { key, direction } = sortConfig;
        let valA = '';
        let valB = '';

        if (key === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (key === 'extension') {
          // Normalizing extension for sorting
          valA = String((a as any).extension || '').padStart(10, '0');
          valB = String((b as any).extension || '').padStart(10, '0');
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      }

      // 2. Default bucket sorting by priority for non-Directory tabs if no explicit sort
      if (activeTab !== 'Directory') {
        if (a.priority === 'Primary' && b.priority !== 'Primary') return -1;
        if (a.priority !== 'Primary' && b.priority === 'Primary') return 1;
      }

      // 3. Fallback: Sort by name, but put those without phone/extension at the bottom if in Directory
      if (activeTab === 'Directory' && !sortConfig) {
        const hasContactA = !!(a.phone || (a as any).extension);
        const hasContactB = !!(b.phone || (b as any).extension);
        if (hasContactA && !hasContactB) return -1;
        if (!hasContactA && hasContactB) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [contacts, users, searchTerm, categoryFilter, activeTab, currentUser, sortConfig]);

  const groupedContacts = useMemo(() => {
    if (activeTab === 'Directory') return null;
    
    const groups: Record<string, (Contact & { isUser?: boolean })[]> = {};
    filteredContacts.forEach(contact => {
      const org = contact.organization || 'Individual Contacts';
      if (!groups[org]) groups[org] = [];
      groups[org].push(contact);
    });
    
    // Sort groups so "Individual Contacts" is last, others alphabetical
    return Object.keys(groups).sort((a, b) => {
      if (a === 'Individual Contacts') return 1;
      if (b === 'Individual Contacts') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, (Contact & { isUser?: boolean })[]>);
  }, [filteredContacts, activeTab, sortConfig, searchTerm]);

  const isRegularUser = currentUser?.role === 'User';

  const renderContactRow = (contact: Contact & { isUser?: boolean }) => (
    <motion.tr
      layout
      key={contact.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors group"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm",
            contact.priority === 'Primary' ? "bg-indigo-600" : "bg-gray-400 dark:bg-gray-600"
          )}>
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm">{contact.name}</span>
              {contact.priority === 'Primary' && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Priority</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {!groupedContacts && contact.organization && (
          <div className="text-sm text-gray-900 dark:text-white font-medium">{contact.organization}</div>
        )}
        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-tighter">
          {contact.role || (contact.organization && !groupedContacts ? 'Contact' : '')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          {contact.phone ? String(contact.phone).split(', ').map((p, i) => (
            <a key={i} href={`tel:${p}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 hover:text-indigo-600 font-mono transition-colors">
              <Phone className="w-3 h-3 text-gray-400" /> {p}
            </a>
          )) : (
            <span className="text-gray-400 text-xs italic">N/A</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-indigo-500 dark:text-indigo-400 hover:underline">
            <Mail className="w-3 h-3" /> {contact.email}
          </a>
        ) : (
          <span className="text-gray-400 text-xs italic">N/A</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
        {activeTab === 'Directory' ? (contact.isUser ? (contact.notes?.replace('Ext: ', '') || '-') : (contact as any).extension || '-') : (contact as any).extension || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
          {contact.category}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(canEdit && (currentUser?.role === 'Admin' || currentUser?.role === 'Technician' || contact.userId === currentUser?.id)) && (
            <button onClick={() => handleEdit(contact as any)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl shadow-sm border border-transparent hover:border-gray-200">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {(canDelete && (currentUser?.role === 'Admin' || currentUser?.role === 'Technician' || contact.userId === currentUser?.id)) && (
            <button 
              onClick={() => {
                console.log('Delete button clicked for:', contact.name, 'isUser:', !!contact.isUser);
                setDeleteConfirmation({ 
                  id: contact.id, 
                  isUser: !!contact.isUser,
                  name: contact.name
                });
              }} 
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl shadow-sm border border-transparent hover:border-gray-200"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean and join phones
      const cleanedPhones = phoneList.filter(p => p.trim()).join(', ');
      
      if (isEditingUser && editingId) {
        await updateUser(editingId, {
          name: formData.name,
          email: formData.email,
          mobile: cleanedPhones,
          role: formData.role as any,
          extension: (formData as any).extension,
          department: formData.organization
        });
        setEditingId(null);
        setIsEditingUser(false);
      } else {
        const submissionData = { ...formData, phone: cleanedPhones };
        if (editingId) {
          await updateContact(editingId, submissionData);
          setEditingId(null);
        } else {
          await addContact(submissionData);
          clearPersistence();
        }
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Contact submission failed:', error);
    }
  };

  const [phoneList, setPhoneList] = useState<string[]>(['']);

  const resetForm = () => {
    resetPersistentForm();
    setPhoneList(['']);
    setEditingId(null);
    setIsEditingUser(false);
  };

  const handleEdit = (contact: any) => {
    setIsEditingUser(!!contact.isUser);
    setFormData({ 
      name: contact.name, 
      organization: contact.organization || '', 
      role: contact.role || '', 
      category: contact.category, 
      phone: contact.phone || '', 
      email: contact.email || '', 
      priority: contact.priority || 'Secondary',
      notes: contact.notes || '',
      isStaffManual: contact.isStaffManual || 0,
      extension: contact.extension || '',
      userId: contact.userId,
      isPublic: contact.isPublic || 0
    } as any);
    
    // Split combined phones
    const phones = contact.phone ? String(contact.phone).split(', ') : [''];
    setPhoneList(phones);
    
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleAddPhoneField = () => setPhoneList([...phoneList, '']);
  const handlePhoneChange = (index: number, value: string) => {
    const newList = [...phoneList];
    newList[index] = value;
    setPhoneList(newList);
  };
  const handleRemovePhoneField = (index: number) => {
    if (phoneList.length > 1) {
      setPhoneList(phoneList.filter((_, i) => i !== index));
    } else {
      setPhoneList(['']);
    }
  };

  const canCreate = hasPermission('contacts', 'canCreate');
  const canEdit = hasPermission('contacts', 'canEdit');
  const canDelete = hasPermission('contacts', 'canDelete');

  const handleExportTemplate = () => {
    const template = [{
      'Name': 'John Doe',
      'Organization': 'ACME Corp',
      'Role': 'Manager',
      'Category': 'Vendor', // Vendor, Client, ISP, Maintenance, Partner, Internal, Other
      'Phone': '0771234567, 0112345678', // Comma separated for multiple
      'Email': 'john@example.com',
      'Extension': '123',
      'Priority': 'Secondary', // Primary, Secondary
      'Notes': 'Test notes here',
      'IsPublic': '0', // 1 for shared, 0 for private
      'IsStaffManual': '0' // 1 for staff directory, 0 for regular contact
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    // Add validation help as a separate sheet or just text? 
    // Let's just create a clear template.
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "contacts_import_template.csv");
  };

  const handleExportCSV = () => {
    const dataToExport = filteredContacts.map(c => ({
      'Name': c.name,
      'Organization': c.organization || '',
      'Role': c.role || '',
      'Category': c.category,
      'Phone': c.phone || '',
      'Email': c.email || '',
      'Extension': (c as any).extension || '',
      'Priority': c.priority,
      'Notes': c.notes || '',
      'IsPublic': (c as any).isPublic ? 'Yes' : 'No',
      'IsStaff': (c as any).isStaffManual ? 'Yes' : (c.isUser ? 'Yes (Sync)' : 'No')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, `contacts_export_${activeTab.toLowerCase()}.csv`);
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
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const row of data) {
          const priority = String(row['Priority'] || 'Secondary').trim().toLowerCase() === 'primary' ? 'Primary' : 'Secondary';
          const isPublic = String(row['IsPublic'] || '').toLowerCase() === 'yes' || row['IsPublic'] === 1 || String(row['IsPublic'] || '').toLowerCase() === 'true' ? 1 : 0;
          const isStaff = String(row['IsStaffManual'] || '').toLowerCase() === 'yes' || row['IsStaffManual'] === 1 || String(row['IsStaffManual'] || '').toLowerCase() === 'true' ? 1 : 0;

          const newContact = {
            name: String(row['Name'] || ''),
            organization: String(row['Organization'] || ''),
            role: String(row['Role'] || ''),
            category: String(row['Category'] || 'Other'),
            phone: String(row['Phone'] || ''),
            email: String(row['Email'] || ''),
            extension: String(row['Extension'] || ''),
            priority,
            notes: String(row['Notes'] || ''),
            isPublic,
            isStaffManual: isStaff,
            userId: currentUser?.id
          };

          if (newContact.name) {
            await addContact(newContact as any);
            importedCount++;
          }
        }
        alert(`Successfully imported ${importedCount} contacts.`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import contacts. Please check file format.');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Directory & Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Employee directory and points of contact.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('Personal')}
            className={clsx(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'Personal' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
            )}
          >
            <Lock className="w-3 h-3" /> My Contacts
          </button>
          <button 
            onClick={() => setActiveTab('Directory')}
            className={clsx(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'Directory' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
            )}
          >
            <UsersIcon className="w-3 h-3" /> Staff Directory
          </button>
          <button 
            onClick={() => setActiveTab('Public')}
            className={clsx(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'Public' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
            )}
          >
            <Globe className="w-3 h-3" /> Master List
          </button>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all font-bold uppercase tracking-wider text-[7px] border border-indigo-200 dark:border-indigo-800/50 shadow-sm"
              title="Export to CSV"
            >
              <FileSpreadsheet className="w-2 h-2" /> Export
            </button>
            {!isRegularUser && (
              <>
                <button 
                  onClick={handleExportTemplate}
                  className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-lg flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all font-bold uppercase tracking-wider text-[7px] border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
                  title="Download CSV Template"
                >
                  <Download className="w-2 h-2" /> Template
                </button>
                <label className="bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-lg flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all font-bold uppercase tracking-wider text-[7px] border border-amber-200 dark:border-amber-800/50 shadow-sm cursor-pointer">
                  <Upload className="w-2 h-2" /> 
                  {isImporting ? 'Importing...' : 'Import CSV'}
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleImportCSV}
                    disabled={isImporting}
                  />
                </label>
              </>
            )}
            <button onClick={() => {
              resetForm();
              if (activeTab === 'Directory' && (currentUser?.role === 'Admin' || currentUser?.role === 'Technician')) {
                setFormData(prev => ({ ...prev, category: 'Internal', isStaffManual: 1 } as any));
              }
              setShowForm(true);
            }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none">
              <Plus className="w-4 h-4" /> {activeTab === 'Directory' && (currentUser?.role === 'Admin' || currentUser?.role === 'Technician') ? 'Add Staff Member' : 'Add Contact'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 max-w-fit">
        <div className="bg-indigo-500 rounded-full p-1">
          <Info className="w-3 h-3 text-white" />
        </div>
        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
          <span className="font-bold uppercase">Master List:</span> Shows all shared public contacts, company partners, and your personal private contacts in one unified list.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search contacts by name, company, email, phone..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab !== 'Directory' && !isRegularUser && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  categoryFilter === cat 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50">
            <tr>
              <th 
                className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  <span className="flex flex-col">
                    <ChevronUp className={clsx("w-2 h-2", sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? "text-indigo-600" : "text-gray-300")} />
                    <ChevronDown className={clsx("w-2 h-2", sortConfig?.key === 'name' && sortConfig.direction === 'desc' ? "text-indigo-600" : "text-gray-300")} />
                  </span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Company / Role</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
              <th 
                className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('extension')}
              >
                <div className="flex items-center gap-1">
                  Ext.
                  <span className="flex flex-col">
                    <ChevronUp className={clsx("w-2 h-2", sortConfig?.key === 'extension' && sortConfig.direction === 'asc' ? "text-indigo-600" : "text-gray-300")} />
                    <ChevronDown className={clsx("w-2 h-2", sortConfig?.key === 'extension' && sortConfig.direction === 'desc' ? "text-indigo-600" : "text-gray-300")} />
                  </span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            <AnimatePresence mode="popLayout">
              {groupedContacts ? (
                (Object.entries(groupedContacts) as [string, (Contact & { isUser?: boolean })[]][]).map(([org, orgContacts]) => (
                  <React.Fragment key={org}>
                    <tr className="bg-gray-50/30 dark:bg-gray-900/20">
                      <td colSpan={7} className="px-6 py-2 border-y border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-indigo-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {org === 'Individual Contacts' ? 'Individual / No Company' : org}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[8px] font-bold text-gray-400">
                            {orgContacts.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {orgContacts.map(contact => renderContactRow(contact))}
                  </React.Fragment>
                ))
              ) : (
                filteredContacts.map(contact => renderContactRow(contact))
              )}
              {filteredContacts.length === 0 && (
                <motion.tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    No results found in {activeTab}.
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex gap-3">
            <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-200 font-bold">Are you sure you want to delete {deleteConfirmation?.name}?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {deleteConfirmation?.isUser 
                  ? "This will delete their entire system account. They will no longer be able to log in."
                  : "This will remove this contact from the directory. This action cannot be undone."}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setDeleteConfirmation(null)}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                if (!deleteConfirmation) return;
                try {
                  if (deleteConfirmation.isUser) {
                    await deleteUser(deleteConfirmation.id);
                  } else {
                    await deleteContact(deleteConfirmation.id);
                  }
                } catch (err) {
                  console.error('Deletion failed:', err);
                }
                setDeleteConfirmation(null);
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-100 dark:shadow-none hover:bg-red-700"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        title="Contact Notes"
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

      <Modal 
        isOpen={showForm} 
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingId ? 'Edit Contact' : 'Add New Contact'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name *</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  required
                  className="w-full pl-10 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organization</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  className="w-full pl-10 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.organization} 
                  onChange={e => setFormData({...formData, organization: e.target.value})} 
                  placeholder="ACME Corp"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role / Title</label>
              <input 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                placeholder="Account Manager"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email"
                  className="w-full pl-10 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Extension</label>
              <input 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono" 
                value={(formData as any).extension} 
                onChange={e => setFormData({...formData, extension: e.target.value} as any)} 
                placeholder="123"
              />
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                Phone Numbers
                <button 
                  type="button"
                  onClick={handleAddPhoneField}
                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add More
                </button>
              </label>
              <div className="space-y-2">
                {phoneList.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        className="w-full pl-10 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono" 
                        value={phone} 
                        onChange={e => handlePhoneChange(index, e.target.value)} 
                        placeholder="+94 77 123 4567"
                      />
                    </div>
                    {phoneList.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemovePhoneField(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority & Visibility</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="priority" 
                    className="hidden" 
                    checked={formData.priority === 'Primary'}
                    onChange={() => setFormData({...formData, priority: 'Primary'})}
                  />
                  <div className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    formData.priority === 'Primary' 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 group-hover:border-indigo-300"
                  )}>
                    Primary POC
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="priority" 
                    className="hidden" 
                    checked={formData.priority === 'Secondary'}
                    onChange={() => setFormData({...formData, priority: 'Secondary'})}
                  />
                  <div className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    formData.priority === 'Secondary' 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 group-hover:border-indigo-300"
                  )}>
                    Secondary
                  </div>
                </label>

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Technician') && (
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={(formData as any).isStaffManual === 1}
                      onChange={e => setFormData({...formData, isStaffManual: e.target.checked ? 1 : 0} as any)}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">List in Staff Directory</span>
                  </label>
                )}

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Technician') && (activeTab === 'Public' || activeTab === 'Personal') && (
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={(formData as any).isPublic === 1}
                      onChange={e => setFormData({...formData, isPublic: e.target.checked ? 1 : 0} as any)}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Share with Team (Public)</span>
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
              <textarea 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Any special instructions or account details..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            {isDirty && !editingId && (
              <button 
                type="button"
                onClick={resetPersistentForm}
                className="mr-auto flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-3 h-3" /> Clear Draft
              </button>
            )}
            <button 
              type="button" 
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-6 py-2 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-8 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none uppercase tracking-widest text-xs"
            >
              <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'} Contact
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
