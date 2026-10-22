import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useLocation } from 'react-router-dom';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { safeStorage } from '../utils/storage';
import { Plus, QrCode, Upload, X, Edit2, Trash2, Download, LayoutDashboard, List, History, Droplets, Info, Clock, ChevronDown, RotateCcw } from 'lucide-react';
import { AssetStatus } from '../types';
import { clsx } from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import { compressImage } from '../utils/image';
import AssetsDashboard from '../components/AssetsDashboard';
import ConfirmModal from '../components/ConfirmModal';
import ImageModal from '../components/ImageModal';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

export default function Assets() {
  const { 
    currentUser, assets, assetTypes, locations, users, softwareWarranties,
    addAsset, updateAsset, deleteAsset, bulkDeleteAssets, bulkUpdateAssetStatus,
    assetHistory, tonerLogs, addTonerLog, deleteTonerLog,
    addNotification, hasPermission
  } = useStore();
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard' | 'printers'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewAsset, setViewAsset] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'details' | 'timeline' | 'toner'>('details');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  const initialFormData = {
    typeId: '', 
    tag: '', 
    serialNumber: '', 
    purchaseDate: '', 
    name: '', 
    ipAddress: '', 
    macAddress: '', 
    modelName: '', 
    status: 'In Stock' as AssetStatus, 
    userId: '', 
    locationId: '', 
    specs: {} as Record<string, any>, 
    attachments: [] as string[], 
    image: ''
  };

  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
      setShowFilters(true);
      setActiveTab('list');
      window.history.replaceState({ ...location.state, filterStatus: undefined }, document.title);
    }
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
      setActiveTab('list');
      window.history.replaceState({ ...location.state, searchQuery: undefined }, document.title);
    }
    if (location.state?.openAdd) {
      const saved = safeStorage.getItem('form_draft_assets');
      if (saved) {
        try {
          setFormData(JSON.parse(saved));
        } catch {
          setFormData(initialFormData);
        }
      } else {
        setFormData(initialFormData);
      }
      setEditingId(null);
      setShowForm(true);
      setActiveTab('list');
      window.history.replaceState({}, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setActiveTab('list');
      setTimeout(() => {
        const element = document.getElementById(`asset-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  // Modal states
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; assetId?: string; count?: number }>({ isOpen: false });
  const [confirmTonerDelete, setConfirmTonerDelete] = useState<{ isOpen: boolean; logId?: string }>({ isOpen: false });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Toner Log Form State
  const [tonerModel, setTonerModel] = useState('');
  const [tonerNotes, setTonerNotes] = useState('');
  const [isLoggingToner, setIsLoggingToner] = useState(false);
  const [isSavingToner, setIsSavingToner] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWarranty, setFilterWarranty] = useState('');
  
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  const isAdmin = currentUser?.role === 'Admin';
  const isTech = currentUser?.role === 'Technician';
  const isUser = currentUser?.role === 'User';

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('assets', initialFormData, showForm && !editingId);

  const printerType = assetTypes.find(t => (t.name || '').toLowerCase().includes('printer'));
  const printers = (assets || [])
    .filter(a => a.typeId === printerType?.id)
    .sort((a, b) => (a.tag || '').localeCompare(b.tag || '') || a.name.localeCompare(b.name));

  // Filter assets based on role and filters
  const filteredAssets = (assets || []).filter(a => {
    // Role based filtering
    if (isUser && a.userId !== currentUser?.id) return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const user = users.find(u => u.id === a.userId);
      const location = locations.find(l => l.id === a.locationId);
      const matches = 
        a.name.toLowerCase().includes(query) || 
        (a.tag || '').toLowerCase().includes(query) || 
        (a.serialNumber || '').toLowerCase().includes(query) ||
        (a.modelName || '').toLowerCase().includes(query) ||
        (user?.name || '').toLowerCase().includes(query) ||
        (location?.name || '').toLowerCase().includes(query);
      if (!matches) return false;
    }

    // Category filter
    if (filterCategory && a.typeId !== filterCategory) return false;

    // Location filter
    if (filterLocation && a.locationId !== filterLocation) return false;

    // Status filter
    if (filterStatus && a.status !== filterStatus) return false;

    // Warranty filter
    if (filterWarranty) {
      const assetWarranties = (softwareWarranties || []).filter(sw => sw.assetId === a.id);
      const hasExpiring = assetWarranties.some(sw => {
        const expireDate = new Date(sw.expireDate);
        const now = new Date();
        const diffTime = expireDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
      });
      
      if (filterWarranty === 'expiring' && !hasExpiring) return false;
      if (filterWarranty === 'none' && assetWarranties.length > 0) return false;
      if (filterWarranty === 'active' && assetWarranties.length === 0) return false;
    }

    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleDashboardFilter = (type: 'status' | 'user' | 'category' | 'location', value: string) => {
    setActiveTab('list');
    setShowFilters(true);
    if (type === 'status') setFilterStatus(value);
    if (type === 'user') {
      // For user we don't have a direct user filter in the UI yet, but we can search by name
      const user = users.find(u => u.id === value);
      if (user) setSearchQuery(user.name);
    }
    if (type === 'category') setFilterCategory(value);
    if (type === 'location') setFilterLocation(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterLocation('');
    setFilterStatus('');
    setFilterWarranty('');
  };

  const toggleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets((filteredAssets || []).map(a => a.id));
    }
  };

  const toggleSelectAsset = (id: string) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteAssets(selectedAssets);
      addNotification(`Successfully deleted ${selectedAssets.length} assets`, 'success');
      setSelectedAssets([]);
    } catch (error) {
      addNotification('Failed to delete assets', 'error');
    }
  };

  const handleBulkStatusUpdate = async (status: AssetStatus) => {
    try {
      await bulkUpdateAssetStatus(selectedAssets, status);
      addNotification(`Successfully updated ${selectedAssets.length} assets to ${status}`, 'success');
      setSelectedAssets([]);
    } catch (error) {
      addNotification('Failed to update asset status', 'error');
    }
  };

  const [newType, setNewType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = assetTypes.find(t => t.id === formData.typeId);

  const downloadCSV = () => {
    if (filteredAssets.length === 0) return;

    // Get all unique custom field names across all asset types
    const customFieldMap = new Map<string, string>(); // id -> name
    assetTypes.forEach(type => {
      (type.customFields || []).forEach(field => {
        customFieldMap.set(field.id, field.name);
      });
    });

    const customFieldIds = Array.from(customFieldMap.keys());
    const customFieldNames = Array.from(customFieldMap.values());

    const baseHeaders = ['Name', 'Tag', 'Type', 'Model', 'Serial Number', 'IP Address', 'MAC Address', 'Status', 'User', 'Location', 'Purchase Date'];
    const headers = [...baseHeaders, ...customFieldNames];

    const csvRows = (filteredAssets || []).map(asset => {
      const type = (assetTypes || []).find(t => t.id === asset.typeId);
      const user = (users || []).find(u => u.id === asset.userId);
      const location = (locations || []).find(l => l.id === asset.locationId);

      const baseData = [
        asset.name,
        asset.tag,
        type?.name || '',
        asset.modelName,
        asset.serialNumber,
        asset.ipAddress || '',
        asset.macAddress || '',
        asset.status,
        user?.name || '',
        location?.name || '',
        asset.purchaseDate
      ];

      const customData = (customFieldIds || []).map(id => asset.specs[id] || '');
      return [...baseData, ...customData].map(val => `"${val || ''}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    // Basic validation
    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = 'Asset name is required';
    if (!formData.typeId) errors.typeId = 'Asset type is required';
    if (!formData.serialNumber) errors.serialNumber = 'Serial number is required';
    if (!formData.modelName) errors.modelName = 'Model name is required';
    
    // Check if tag is already used (excluding current asset if editing)
    if (formData.tag) {
      const duplicate = assets.find(a => a.tag === formData.tag && a.id !== editingId);
      if (duplicate) {
        errors.tag = 'This asset tag is already in use';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        await updateAsset(editingId, formData);
        setEditingId(null);
        addNotification('Asset updated successfully', 'success');
      } else {
        await addAsset(formData);
        addNotification('Asset added successfully', 'success');
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      // Error is already logged in store and notification added
      setFormErrors({ submit: error.message || 'Failed to save asset' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTemplate = () => {
    // Collect all unique custom fields
    const customFields = new Set<string>();
    assetTypes.forEach(type => {
      (type.customFields || []).forEach(f => customFields.add(f.name));
    });

    const templateRows = [
      {
        'Name': 'Example Laptop',
        'Tag': 'EQ-001',
        'Type': assetTypes[0]?.name || 'Laptop',
        'Model': 'Dell XPS 15',
        'Serial Number': 'SN12345678',
        'IP Address': '192.168.1.10',
        'MAC Address': '00:00:00:00:00:00',
        'Status': 'In Use', // In Stock, In Use, Repairing, Retired
        'Assigned User': users[0]?.username || 'admin',
        'Location': locations[0]?.name || 'Office',
        'Purchase Date': '2023-01-01',
        ...Array.from(customFields).reduce((acc, field) => ({ ...acc, [field]: 'Value' }), {})
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets Template");
    XLSX.writeFile(wb, "assets_import_template.csv");
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
          const type = assetTypes.find(t => t.name.toLowerCase() === String(row['Type'] || '').toLowerCase());
          const user = users.find(u => u.username.toLowerCase() === String(row['Assigned User'] || '').toLowerCase());
          const location = locations.find(l => l.name.toLowerCase() === String(row['Location'] || '').toLowerCase());

          if (!type) continue; // Skip if type not found

          // Build specs from custom fields
          const specs: Record<string, any> = {};
          if (type.customFields) {
            type.customFields.forEach(f => {
              if (row[f.name] !== undefined) {
                specs[f.id] = String(row[f.name]);
              }
            });
          }

          const newAsset = {
            name: String(row['Name'] || ''),
            tag: String(row['Tag'] || ''),
            typeId: type.id,
            modelName: String(row['Model'] || ''),
            serialNumber: String(row['Serial Number'] || ''),
            ipAddress: String(row['IP Address'] || ''),
            macAddress: String(row['MAC Address'] || ''),
            status: (row['Status'] || 'In Stock') as AssetStatus,
            userId: user?.id || '',
            locationId: location?.id || '',
            purchaseDate: String(row['Purchase Date'] || ''),
            specs,
            attachments: [],
            image: ''
          };

          if (newAsset.name && newAsset.typeId) {
            await addAsset(newAsset as any);
            importedCount++;
          }
        }
        addNotification(`Successfully imported ${importedCount} assets`, 'success');
      } catch (err) {
        console.error('Import failed:', err);
        addNotification('Failed to import assets. Check format.', 'error');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleEdit = (asset: any) => {
    setFormData({
      typeId: asset.typeId || '',
      tag: asset.tag || '',
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate || '',
      name: asset.name || '',
      ipAddress: asset.ipAddress || '',
      macAddress: asset.macAddress || '',
      modelName: asset.modelName || '',
      status: asset.status || 'In Stock',
      userId: asset.userId || '',
      locationId: asset.locationId || '',
      specs: asset.specs || {},
      attachments: asset.attachments || [],
      image: asset.image || ''
    });
    setEditingId(asset.id);
    setShowForm(true);
  };

  const handleSpecChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      specs: { ...prev.specs, [fieldId]: value }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let result = reader.result as string;
        if (file.type.startsWith('image/')) {
          try {
            result = await compressImage(result);
          } catch (err) {
            console.error('Compression failed:', err);
          }
        }
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let result = reader.result as string;
      try {
        result = await compressImage(result);
      } catch (err) {
        console.error('Compression failed:', err);
      }
      setFormData(prev => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets</h1>
          <div className="flex mt-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('list')}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'list' ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <List className="w-4 h-4" /> Asset List
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'dashboard' ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('printers')}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'printers' ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <Droplets className="w-4 h-4" /> Printers & Toner
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'list' && (
            <>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "px-4 py-2 rounded-md flex items-center gap-2 transition-colors border",
                  showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
              >
                <List className="w-4 h-4" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button 
                onClick={downloadCSV}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent"
              >
                <Download className="w-4 h-4" /> Export
              </button>
              {(isAdmin || isTech) && (
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
              {hasPermission('assets', 'canCreate') && (
                <button onClick={() => {
                  const saved = safeStorage.getItem('form_draft_assets');
                  if (saved) {
                    try {
                      setFormData(JSON.parse(saved));
                    } catch {
                      setFormData(initialFormData);
                    }
                  } else {
                    setFormData(initialFormData);
                  }
                  setEditingId(null);
                  setShowForm(!showForm);
                }} className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                  <Plus className="w-4 h-4" /> Add Asset
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Quick search assets (Name, Tag, SN, Model)..." 
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>
             <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    showFilters ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Advanced Filters
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && showFilters && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Search by User</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={users.some(u => u.name === searchQuery) ? (users.find(u => u.name === searchQuery)?.id || '') : ''}
                onChange={e => {
                  const user = users.find(u => u.id === e.target.value);
                  setSearchQuery(user ? user.name : '');
                }}
              >
                <option value="">Select User</option>
                {users.slice().sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {(assetTypes || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                {(locations || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="In Use">In Use</option>
                <option value="Repairing">Repairing</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Warranty</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={filterWarranty}
                onChange={e => setFilterWarranty(e.target.value)}
              >
                <option value="">All</option>
                <option value="expiring">Expiring Soon (30d)</option>
                <option value="active">Has Warranty</option>
                <option value="none">No Warranty</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={clearFilters}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider"
            >
              Clear All
            </button>
            <button 
              onClick={() => setShowFilters(false)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {activeTab === 'list' && selectedAssets.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold">
              {selectedAssets.length}
            </div>
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">Assets Selected</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedAssets([])}
              className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-lg transition-colors"
            >
              Deselect All
            </button>
            {(isAdmin || isTech) && (
              <div className="relative group">
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                >
                  Change Status <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 hidden group-hover:block z-50">
                  {(['In Stock', 'In Use', 'Repairing', 'Retired'] as AssetStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusUpdate(status)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={() => setConfirmDelete({ isOpen: true, count: selectedAssets.length })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        <AssetsDashboard onFilter={handleDashboardFilter} />
      ) : activeTab === 'printers' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Total Printers</h3>
              <p className="text-3xl font-bold dark:text-white">{printers.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Toner Changes (30d)</h3>
              <p className="text-3xl font-bold dark:text-white">
                {tonerLogs.filter(l => {
                  const date = new Date(l.date);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return date >= thirtyDaysAgo;
                }).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Active Printers</h3>
              <p className="text-3xl font-bold text-emerald-500">{printers.filter(p => p.status === 'In Use').length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h2 className="font-bold dark:text-white">Printer Inventory & Toner Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Printer Name</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Last Toner Change</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(printers || []).map(printer => {
                    const lastLog = tonerLogs
                      .filter(l => l.assetId === printer.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    
                    return (
                      <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-white">{printer.name}</div>
                          <div className="text-xs text-gray-500">{printer.modelName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {locations.find(l => l.id === printer.locationId)?.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {lastLog ? (
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{new Date(lastLog.date).toLocaleDateString()}</div>
                              <div className="text-[10px]">{lastLog.tonerModel}</div>
                            </div>
                          ) : 'No logs'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "px-2 py-1 text-[10px] font-bold uppercase rounded",
                            printer.status === 'In Use' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                          )}>
                            {printer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setViewAsset(printer.id);
                              setViewTab('toner');
                              setIsLoggingToner(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-bold uppercase flex items-center gap-1 ml-auto"
                          >
                            <Droplets className="w-3 h-3" /> Log Toner
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {printers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No printers found in inventory.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
      {activeTab === 'list' && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingId ? 'Edit Asset' : 'Add New Asset'}
          maxWidth="max-w-4xl"
        >
          {formErrors.submit && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
              {formErrors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Photo</label>
              <div className="mt-1 flex items-center gap-4">
                {formData.image && (
                  <img 
                    id="asset-form-image"
                    src={formData.image} 
                    alt="Asset" 
                    className="w-16 h-16 object-cover rounded-md border dark:border-gray-700" 
                    referrerPolicy="no-referrer"
                  />
                )}
                <input type="file" accept="image/*" className="hidden" id="main-image" onChange={handleMainImageUpload} />
                <label htmlFor="main-image" className="cursor-pointer px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {formData.image ? 'Change Photo' : 'Upload Photo'}
                </label>
                {formData.image && (
                  <button type="button" onClick={() => setFormData({...formData, image: ''})} className="text-red-500 text-sm">Remove</button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</label>
              <select required className={clsx(
                "mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 dark:bg-gray-800 dark:text-white",
                formErrors.typeId ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              )} value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value, specs: {}})}>
                <option value="">Select Type</option>
                {assetTypes.slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {formErrors.typeId && <p className="mt-1 text-xs text-red-500">{formErrors.typeId}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Name</label>
              <input required type="text" className={clsx(
                "mt-1 block w-full rounded-md shadow-sm border p-2 dark:bg-gray-800 dark:text-white",
                formErrors.name ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              )} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Tag</label>
              <input type="text" className={clsx(
                "mt-1 block w-full rounded-md shadow-sm border p-2 dark:bg-gray-800 dark:text-white",
                formErrors.tag ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              )} value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} />
              {formErrors.tag && <p className="mt-1 text-xs text-red-500">{formErrors.tag}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
              <input required type="text" className={clsx(
                "mt-1 block w-full rounded-md shadow-sm border p-2 dark:bg-gray-800 dark:text-white",
                formErrors.serialNumber ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              )} value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} />
              {formErrors.serialNumber && <p className="mt-1 text-xs text-red-500">{formErrors.serialNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model Name</label>
              <input required type="text" className={clsx(
                "mt-1 block w-full rounded-md shadow-sm border p-2 dark:bg-gray-800 dark:text-white",
                formErrors.modelName ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              )} value={formData.modelName} onChange={e => setFormData({...formData, modelName: e.target.value})} />
              {formErrors.modelName && <p className="mt-1 text-xs text-red-500">{formErrors.modelName}</p>}
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</label><input type="text" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MAC Address</label><input type="text" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.macAddress} onChange={e => setFormData({...formData, macAddress: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</label><input type="date" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} /></div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as AssetStatus})}>
                <option value="In Stock">In Stock</option>
                <option value="In Use">In Use</option>
                <option value="Repairing">Repairing</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned User</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
                <option value="">Unassigned</option>
                {(users || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                <option value="">None</option>
                {locations.slice().sort((a, b) => a.name.localeCompare(b.name)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {selectedType && (selectedType.customFields || []).length > 0 && (
              <div className="md:col-span-2 border-t dark:border-gray-700 pt-4 mt-2">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Custom Specs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedType.customFields || []).map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.name}</label>
                      <input 
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} 
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-2" 
                        value={formData.specs[field.id] || ''} 
                        onChange={e => handleSpecChange(field.id, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2 border-t dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Attachments (Invoices, Warranty Cards)</h3>
              <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Upload className="w-4 h-4" /> Upload Files
              </button>
              
              {(formData.attachments || []).length > 0 && (
                <div className="mt-4 flex gap-4 flex-wrap">
                  {(formData.attachments || []).map((att, i) => (
                    <div key={i} className="relative w-24 h-24 border dark:border-gray-700 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900">
                      {att.startsWith('data:image') && att ? (
                        <img 
                          id={`attachment-preview-${i}`}
                          src={att} 
                          alt="Attachment" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-500 dark:text-gray-400">Document</div>
                      )}
                      <button type="button" onClick={() => removeAttachment(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                }} className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold uppercase tracking-widest text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Asset' : 'Save Asset'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={filteredAssets.length > 0 && selectedAssets.length === filteredAssets.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {(filteredAssets || []).map((asset, i) => {
              const type = assetTypes.find(t => t.id === asset.typeId);
              const user = users.find(u => u.id === asset.userId);
              const isSelected = selectedAssets.includes(asset.id);
              return (
                <tr key={asset.id} id={`asset-${asset.id}`} className={clsx(isSelected && "bg-indigo-50/50 dark:bg-indigo-900/10")}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={isSelected}
                      onChange={() => toggleSelectAsset(asset.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {asset.image ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(asset.image);
                          }}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                        >
                          <img 
                          id={`attachment-view-${i}`}
                          src={asset.image} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{asset.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{asset.tag}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{type?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                      asset.status === 'In Use' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      asset.status === 'In Stock' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      asset.status === 'Repairing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    )}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button onClick={() => setViewAsset(asset.id)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 inline-flex items-center gap-1">
                      <QrCode className="w-4 h-4" /> View
                    </button>
                    {hasPermission('assets', 'canEdit') && (
                      <button onClick={() => handleEdit(asset)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center gap-1">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {hasPermission('assets', 'canDelete') && (
                      <button onClick={() => setConfirmDelete({ isOpen: true, assetId: asset.id })} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 inline-flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      <Modal
        isOpen={!!viewAsset}
        onClose={() => { 
          setViewAsset(null); 
          setViewTab('details'); 
          setIsLoggingToner(false);
          setTonerModel('');
          setTonerNotes('');
        }}
        title={assets.find(a => a.id === viewAsset)?.name || 'Asset Details'}
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col max-h-[80vh]">
          {(() => {
            const asset = assets.find(a => a.id === viewAsset);
            if (!asset) return null;
            const type = assetTypes.find(t => t.id === asset.typeId);
            const isPrinter = type?.name?.toLowerCase().includes('printer');
            
            return (
              <>
                <div className="mb-6">
                  <div className="flex gap-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{asset.tag}</span>
                    <span className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded-full",
                      asset.status === 'In Use' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      asset.status === 'In Stock' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      asset.status === 'Repairing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    )}>{asset.status}</span>
                  </div>
                </div>

                <div className="flex bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 -mx-6 mb-6">
                  <button 
                    onClick={() => setViewTab('details')}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                      viewTab === 'details' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Info className="w-4 h-4" /> Details
                  </button>
                  <button 
                    onClick={() => setViewTab('timeline')}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                      viewTab === 'timeline' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <History className="w-4 h-4" /> Timeline
                  </button>
                  {isPrinter && (
                    <button 
                      onClick={() => {
                        setViewTab('toner');
                        setIsLoggingToner(false);
                      }}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                        viewTab === 'toner' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      )}
                    >
                      <Droplets className="w-4 h-4" /> Toner Logs
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {viewTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-semibold mb-3 border-b dark:border-gray-700 pb-2 dark:text-white font-sans">General Info</h3>
                        <dl className="space-y-3 text-sm font-sans">
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type:</dt><dd className="font-medium text-gray-900 dark:text-white">{type?.name}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Model:</dt><dd className="font-medium text-gray-900 dark:text-white">{asset.modelName}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Serial:</dt><dd className="font-medium text-gray-900 dark:text-white">{asset.serialNumber}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">IP Address:</dt><dd className="font-medium text-gray-900 dark:text-white">{asset.ipAddress || '-'}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">MAC Address:</dt><dd className="font-medium text-gray-900 dark:text-white">{asset.macAddress || '-'}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Purchase Date:</dt><dd className="font-medium text-gray-900 dark:text-white">{asset.purchaseDate}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Location:</dt><dd className="font-medium text-gray-900 dark:text-white">{locations.find(l => l.id === asset.locationId)?.name || 'None'}</dd></div>
                          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">User:</dt><dd className="font-medium text-gray-900 dark:text-white">{users.find(u => u.id === asset.userId)?.name || 'None'}</dd></div>
                        </dl>
                        
                        {type && (type.customFields || []).length > 0 && (
                          <>
                            <h3 className="text-lg font-semibold mt-8 mb-3 border-b dark:border-gray-700 pb-2 dark:text-white font-sans">Specs</h3>
                            <dl className="space-y-3 text-sm font-sans">
                              {(type.customFields || []).map(field => (
                                <div key={field.id} className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">{field.name}:</dt>
                                  <dd className="font-medium text-gray-900 dark:text-white">{asset.specs[field.id] || '-'}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}
                      </div>

                      <div className="space-y-8">
                        <div className="flex flex-col items-center justify-start p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border dark:border-gray-700">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider font-sans">Asset QR Code</h3>
                          <div className="bg-white p-4 border dark:border-gray-700 rounded-lg shadow-sm">
                            <QRCodeSVG value={`${window.location.origin}/asset/${asset.id}`} size={140} />
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 text-center font-sans">Scan to view asset details</p>
                        </div>

                        {asset.attachments && (asset.attachments || []).length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3 border-b dark:border-gray-700 pb-2 dark:text-white font-sans">Attachments</h3>
                            <div className="flex gap-3 flex-wrap">
                              {(asset.attachments || []).map((att, i) => (
                                <div key={i} className="w-20 h-20 border dark:border-gray-700 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900">
                                  {att.startsWith('data:image') ? (
                                    <button 
                                      id={`view-attachment-btn-${i}`}
                                      onClick={() => setSelectedImage(att)} 
                                      className="w-full h-full"
                                    >
                                    {att && (
                                      <img 
                                        id={`attachment-view-${i}`}
                                        src={att} 
                                        alt="Attachment" 
                                        className="w-full h-full object-cover hover:opacity-80 transition-opacity" 
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    </button>
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-[10px] text-gray-500 dark:text-gray-400 font-sans">DOC</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {viewTab === 'timeline' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold border-b dark:border-gray-700 pb-2 dark:text-white font-sans">Asset Lifecycle History</h3>
                      <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                        {(assetHistory || []).filter(h => h.assetId === asset.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                          <div key={item.id} className="relative">
                            <div className="absolute -left-8 top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-gray-800 shadow-sm" />
                            <div className="flex flex-col font-sans">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.action}</span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(item.date).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{item.details}</p>
                              {item.userId && (
                                <span className="text-xs text-indigo-500 mt-1">By: {users.find(u => u.id === item.userId)?.name || 'Unknown'}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {assetHistory.filter(h => h.assetId === asset.id).length === 0 && (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-8 font-sans">No history recorded for this asset yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {viewTab === 'toner' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                        <h3 className="text-lg font-semibold dark:text-white font-sans">Toner Change Logs</h3>
                        {!isLoggingToner && !isUser && (
                          <button 
                            onClick={() => setIsLoggingToner(true)}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 flex items-center gap-1 font-bold uppercase tracking-widest"
                          >
                            <Plus className="w-3 h-3" /> Log Change
                          </button>
                        )}
                      </div>

                      {isLoggingToner && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Toner Model</label>
                              <input 
                                type="text" 
                                placeholder="e.g. HP 85A, Canon CRG-325"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-sans"
                                value={tonerModel}
                                onChange={e => setTonerModel(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Notes (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="Any additional details..."
                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-sans"
                                value={tonerNotes}
                                onChange={e => setTonerNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setIsLoggingToner(false);
                                setTonerModel('');
                                setTonerNotes('');
                              }}
                              className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                if (!tonerModel) {
                                  addNotification('Please enter toner model', 'error');
                                  return;
                                }
                                setIsSavingToner(true);
                                try {
                                  await addTonerLog({
                                    assetId: asset.id,
                                    date: new Date().toISOString(),
                                    tonerModel: tonerModel,
                                    performedBy: currentUser?.name || 'Unknown',
                                    notes: tonerNotes
                                  });
                                  setIsLoggingToner(false);
                                  setTonerModel('');
                                  setTonerNotes('');
                                  addNotification('Toner log added successfully', 'success');
                                } catch (error) {
                                  addNotification('Failed to add toner log', 'error');
                                } finally {
                                  setIsSavingToner(false);
                                }
                              }}
                              disabled={isSavingToner}
                              className={clsx(
                                "bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none",
                                isSavingToner && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {isSavingToner ? 'Saving...' : 'Save Log'}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {(tonerLogs || []).filter(l => l.assetId === asset.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                          <div key={log.id} className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border dark:border-gray-700 flex justify-between items-start font-sans">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{log.tonerModel}</span>
                                <span className="text-xs text-gray-400">{new Date(log.date).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Performed by: {log.performedBy || 'Unknown'}</p>
                              {log.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">"{log.notes}"</p>}
                            </div>
                              {isAdmin && (
                                <button 
                                  id={`delete-toner-log-${log.id}`}
                                  onClick={() => setConfirmTonerDelete({ isOpen: true, logId: log.id })} 
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        ))}
                        {tonerLogs.filter(l => l.assetId === asset.id).length === 0 && (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-8 font-sans">No toner changes recorded yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false })}
        onConfirm={async () => {
          try {
            if (confirmDelete.assetId) {
              await deleteAsset(confirmDelete.assetId);
              addNotification('Asset deleted successfully', 'success');
            } else if (confirmDelete.count) {
              await handleBulkDelete();
            }
            setConfirmDelete({ isOpen: false });
          } catch (error) {
            addNotification('Operation failed', 'error');
            console.error('Delete operation failed:', error);
          }
        }}
        title="Confirm Deletion"
        message={confirmDelete.assetId ? "Are you sure you want to delete this asset? This action cannot be undone." : `Are you sure you want to delete ${confirmDelete.count} assets? This action cannot be undone.`}
      />

      <ConfirmModal
        isOpen={confirmTonerDelete.isOpen}
        onClose={() => setConfirmTonerDelete({ isOpen: false })}
        onConfirm={async () => {
          if (confirmTonerDelete.logId) {
            try {
              await deleteTonerLog(confirmTonerDelete.logId);
              addNotification('Toner log deleted successfully', 'success');
            } catch (error) {
              addNotification('Failed to delete toner log', 'error');
            }
          }
          setConfirmTonerDelete({ isOpen: false });
        }}
        title="Delete Toner Log"
        message="Are you sure you want to delete this toner log? This action cannot be undone."
      />

      <ImageModal
        id="asset-image-modal"
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}

