import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { 
  Database, RefreshCw, Activity, Server, Shield, 
  CheckCircle2, XCircle, AlertCircle, Clock, Plus, ChevronRight,
  Search, Filter, Calendar as CalendarIcon, Info, X, Settings, History, LayoutGrid,
  FileText, Download, RotateCcw, LayoutList
} from 'lucide-react';
import { Checkup, CheckupCategory, Frequency } from '../types';
import { clsx } from 'clsx';
import { format, isSameDay, isSameWeek, isSameMonth, startOfWeek, startOfMonth, startOfDay, subDays, subWeeks, subMonths, isBefore } from 'date-fns';
import Modal from '../components/Modal';

// Safe date manipulation helpers
const safeStartOfDay = (date: Date | string | undefined | null): Date => {
  if (!date) return new Date(NaN);
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return new Date(NaN);
    return startOfDay(d);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeIsSameDay = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameDay(date1, date2);
  } catch (e) {
    return false;
  }
};

const safeIsSameWeek = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameWeek(date1, date2, { weekStartsOn: 1 });
  } catch (e) {
    return false;
  }
};

const safeIsSameMonth = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameMonth(date1, date2);
  } catch (e) {
    return false;
  }
};

const safeIsBefore = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isBefore(date1, date2);
  } catch (e) {
    return false;
  }
};

const safeSubDays = (date: Date | string | undefined | null, amount: number): Date => {
  if (!date) return new Date(NaN);
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return new Date(NaN);
    return subDays(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeSubWeeks = (date: Date | string | undefined | null, amount: number): Date => {
  if (!date) return new Date(NaN);
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return new Date(NaN);
    return subWeeks(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeSubMonths = (date: Date | string | undefined | null, amount: number): Date => {
  if (!date) return new Date(NaN);
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return new Date(NaN);
    return subMonths(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeFormat = (date: Date | string | undefined | null, formatStr: string, fallback: string = 'N/A'): string => {
  if (!date) return fallback;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

export default function Checkups() {
  const { 
    checkups, addCheckup, 
    backups, updates, systemChecks, servers, securityItems 
  } = useStore();

  const today = safeStartOfDay(new Date());

  const isCurrent = (date: string, frequency: Frequency) => {
    if (!date) return false;
    const checkDate = safeStartOfDay(date);
    const now = safeStartOfDay(new Date());
    if (isNaN(checkDate.getTime()) || isNaN(now.getTime())) return false;

    switch (frequency) {
      case 'Daily':
        return safeIsSameDay(checkDate, now);
      case 'Weekly':
        return safeIsSameWeek(checkDate, now);
      case 'Monthly':
        return safeIsSameMonth(checkDate, now);
      case 'Quarterly':
        return Math.floor(checkDate.getMonth() / 3) === Math.floor(now.getMonth() / 3) && checkDate.getFullYear() === now.getFullYear();
      case 'Yearly':
        return checkDate.getFullYear() === now.getFullYear();
      default:
        return false;
    }
  };

  const getCheckupStatusInfo = (categoryId: string, frequency: Frequency) => {
    const itemCheckups = (checkups || [])
      .filter(c => c.categoryId === categoryId)
      .sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        if (isNaN(ad) && isNaN(bd)) return 0;
        if (isNaN(ad)) return 1;
        if (isNaN(bd)) return -1;
        return bd - ad;
      });
    
    const latest = itemCheckups[0];
    
    if (!latest) {
      return { status: 'Pending', label: 'Never Done', isMissed: true, isDue: true, date: null };
    }

    const current = isCurrent(latest.date, frequency);
    if (current) {
      return { status: latest.status, label: latest.status, isMissed: false, isDue: false, date: latest.date };
    }

    // Check if it was missed in the PREVIOUS period
    let wasMissed = false;
    let isDue = true;
    let label = 'Due Today';
    const lastDate = new Date(latest.date);
    if (isNaN(lastDate.getTime())) {
      return { status: 'Pending', label: 'Never Done', isMissed: true, isDue: true, date: null };
    }

    if (frequency === 'Daily') {
      const yesterday = safeSubDays(today, 1);
      if (safeIsBefore(lastDate, yesterday) && !safeIsSameDay(lastDate, yesterday)) wasMissed = true;
    } else if (frequency === 'Weekly') {
      const lastWeek = safeSubWeeks(today, 1);
      if (safeIsBefore(lastDate, lastWeek) && !safeIsSameWeek(lastDate, lastWeek)) wasMissed = true;
    } else if (frequency === 'Monthly') {
      const lastMonth = safeSubMonths(today, 1);
      if (safeIsBefore(lastDate, lastMonth) && !safeIsSameMonth(lastDate, lastMonth)) wasMissed = true;
    }

    if (wasMissed) label = 'Missed Checkup';

    return { 
      status: 'Pending', 
      label, 
      isMissed: wasMissed, 
      isDue,
      date: latest.date 
    };
  };

  const [selectedCategory, setSelectedCategory] = useState<CheckupCategory | 'All'>('All');
  const [viewMode, setViewMode] = useState<'checklist' | 'list' | 'history'>('checklist');
  const [showUpdateModal, setShowUpdateModal] = useState<{ category: CheckupCategory, itemId: string, name: string, customFields?: any[] } | null>(null);
  
  const initialUpdateFormData = {
    status: '',
    notes: '',
    details: {} as any
  };

  const {
    formData: updateForm,
    setFormData: setUpdateForm,
    resetForm: resetUpdateForm,
    clearPersistence: clearUpdatePersistence,
    isDirty: isUpdateDirty
  } = useFormPersistence('checkups_update_form', initialUpdateFormData, !!showUpdateModal);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Overdue'>('All');
  const [newPartName, setNewPartName] = useState('');

  const allItems = useMemo(() => [
    ...(backups || []).map(item => ({ item, category: 'Backup' as CheckupCategory })),
    ...(updates || []).map(item => ({ item, category: 'Update' as CheckupCategory })),
    ...(systemChecks || []).map(item => ({ item, category: 'System Check' as CheckupCategory })),
    ...(servers || []).map(item => ({ item, category: 'Server Check' as CheckupCategory })),
    ...(securityItems || []).filter(i => i.type === 'Firewall').map(item => ({ item, category: 'Firewall' as CheckupCategory })),
    ...(securityItems || []).filter(i => i.type === 'Virus Guard').map(item => ({ item, category: 'Virus Guard' as CheckupCategory }))
  ], [backups, updates, systemChecks, servers, securityItems]);

  useEffect(() => {
    const locState = (location as any).state;
    if (locState?.scrollToId) {
      const targetId = locState.scrollToId;
      const target = allItems.find(i => i.item.id === targetId);
      if (target) {
        setSelectedCategory(target.category);
        const statusInfo = getCheckupStatusInfo(target.item.id, target.item.frequency);
        setShowUpdateModal({ 
          category: target.category as CheckupCategory, 
          itemId: target.item.id, 
          name: target.item.name, 
          customFields: target.item.customFields 
        });
        setUpdateForm({ 
          status: statusInfo.status !== 'Pending' ? statusInfo.status : '', 
          notes: '', 
          details: (target.category === 'Server Check' ? { parts: { RAM: 'Good', Fan: 'Good', 'Hard Disk': 'Good', 'CPU': 'Good', 'Power Supply': 'Good' } } : {}) 
        });
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(({ item, category }) => {
      const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
      const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusInfo = getCheckupStatusInfo(item.id, item.frequency);
      const matchesDate = dateFilter === 'All' || 
                         (dateFilter === 'Today' && statusInfo.isDue) || 
                         (dateFilter === 'Overdue' && statusInfo.isMissed);
                         
      return matchesCategory && matchesSearch && matchesDate;
    });
  }, [allItems, selectedCategory, searchTerm, dateFilter]);

  const frequencyGroups = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Daily': [],
      'Weekly': [],
      'Monthly': [],
      'Quarterly': [],
      'Yearly': [],
      'Manual': []
    };

    filteredItems.forEach(groupItem => {
      const freq = (groupItem.item.frequency || 'Manual') as string;
      if (!groups[freq]) groups[freq] = [];
      groups[freq].push(groupItem);
    });

    return groups;
  }, [filteredItems]);

  const historyCheckups = useMemo(() => {
    return (checkups || [])
      .filter(c => {
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        
        let itemName = 'Unknown';
        if (c.category === 'Backup') itemName = backups.find(b => b.id === c.categoryId)?.name || 'Deleted Item';
        if (c.category === 'Update') itemName = updates.find(u => u.id === c.categoryId)?.name || 'Deleted Item';
        if (c.category === 'System Check') itemName = systemChecks.find(s => s.id === c.categoryId)?.name || 'Deleted Item';
        if (c.category === 'Server Check') itemName = servers.find(s => s.id === c.categoryId)?.name || 'Deleted Item';
        if (c.category === 'Firewall' || c.category === 'Virus Guard') itemName = securityItems.find(s => s.id === c.categoryId)?.name || 'Deleted Item';

        const matchesSearch = !searchTerm || 
                             itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [checkups, selectedCategory, searchTerm, backups, updates, systemChecks, servers, securityItems]);

  const downloadCSV = () => {
    if ((checkups || []).length === 0) return;
    
    const filteredForExport = (checkups || []).filter(c => {
      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesSearch = !searchTerm || c.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    if (filteredForExport.length === 0) return;

    const headers = ['Date', 'Item', 'Category', 'Status', 'Notes', 'Details'];
    const csvRows = filteredForExport.map(c => {
      let itemName = 'Unknown';
      if (c.category === 'Backup') itemName = (backups || []).find(b => b.id === c.categoryId)?.name || 'Deleted Item';
      if (c.category === 'Update') itemName = (updates || []).find(u => u.id === c.categoryId)?.name || 'Deleted Item';
      if (c.category === 'System Check') itemName = (systemChecks || []).find(s => s.id === c.categoryId)?.name || 'Deleted Item';
      if (c.category === 'Server Check') itemName = (servers || []).find(s => s.id === c.categoryId)?.name || 'Deleted Item';
      if (c.category === 'Firewall' || c.category === 'Virus Guard') itemName = (securityItems || []).find(s => s.id === c.categoryId)?.name || 'Deleted Item';

      return [
        c.date,
        itemName,
        c.category,
        c.status,
        c.notes || '',
        JSON.stringify(c.details || {}).replace(/,/g, ';')
      ].map(val => `"${val || ''}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories: { id: CheckupCategory; label: string; icon: any; color: string; bgColor: string; barColor: string }[] = [
    { id: 'Backup', label: 'Backups', icon: Database, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', barColor: 'bg-blue-600 dark:bg-blue-500' },
    { id: 'Update', label: 'Updates', icon: RefreshCw, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20', barColor: 'bg-purple-600 dark:bg-purple-500' },
    { id: 'System Check', label: 'System Check', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', barColor: 'bg-emerald-600 dark:bg-emerald-500' },
    { id: 'Server Check', label: 'Server Check', icon: Server, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', barColor: 'bg-orange-600 dark:bg-orange-500' },
    { id: 'Firewall', label: 'Firewall', icon: Shield, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', barColor: 'bg-red-600 dark:bg-red-500' },
    { id: 'Virus Guard', label: 'Virus Guard', icon: Shield, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', barColor: 'bg-indigo-600 dark:bg-indigo-500' },
  ];

  const getLatestStatus = (categoryId: string, frequency?: Frequency) => {
    const itemCheckups = (checkups || [])
      .filter(c => c.categoryId === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const latest = itemCheckups[0];
    if (!latest) return null;

    if (frequency && !isCurrent(latest.date, frequency)) {
      return null;
    }

    return latest;
  };

  const getItemHistory = (categoryId: string) => {
    return (checkups || [])
      .filter(c => c.categoryId === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleUpdateStatus = async () => {
    if (!showUpdateModal || !updateForm.status) return;

    try {
      await addCheckup({
        date: new Date().toISOString().split('T')[0],
        categoryId: showUpdateModal.itemId,
        category: showUpdateModal.category,
        status: updateForm.status,
        notes: updateForm.notes,
        details: updateForm.details
      });

      clearUpdatePersistence();
      setShowUpdateModal(null);
      resetUpdateForm();
    } catch (error) {
      console.error('Error updating checkup status:', error);
    }
  };

  const renderStatusIcon = (status: string) => {
    if (!status) return <Clock className="w-4 h-4 text-gray-400" />;
    const s = status.toLowerCase();
    if (['done', 'good', 'updated', 'active', 'checked'].includes(s)) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (['error', 'not working', 'expired'].includes(s)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (['issue', 'pending', 'issues'].includes(s)) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const renderItemCard = (item: any, category: CheckupCategory) => {
    const statusInfo = getCheckupStatusInfo(item.id, item.frequency);
    const catInfo = categories.find(c => c.id === category);

    return (
      <div 
        key={item.id}
        id={`checkup-${item.id}`}
        onClick={() => {
          setShowUpdateModal({ category, itemId: item.id, name: item.name, customFields: item.customFields });
          setUpdateForm({ 
            status: statusInfo.status !== 'Pending' ? statusInfo.status : '', 
            notes: '', 
            details: (category === 'Server Check' ? { parts: { RAM: 'Good', Fan: 'Good', 'Hard Disk': 'Good', 'CPU': 'Good', 'Power Supply': 'Good' } } : {}) 
          });
        }}
        className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-fit min-h-[90px]"
      >
        <div className={clsx("absolute top-0 left-0 w-1 h-full", catInfo?.barColor)} />
        
        <div className="flex justify-between items-start mb-1.5">
          <div className={clsx("p-1.5 rounded-lg opacity-80", catInfo?.bgColor, catInfo?.color)}>
            {catInfo && <catInfo.icon className="w-3.5 h-3.5" />}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={clsx(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] leading-tight",
              statusInfo.isMissed 
                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400" 
                : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            )}>
              {statusInfo.isMissed ? <XCircle className="w-2.5 h-2.5" /> : renderStatusIcon(statusInfo.status)}
              <span className="font-bold uppercase tracking-wider">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-gray-900 dark:text-white text-[11px] mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate tracking-tight">{item.name}</h3>
        
        <div className="space-y-0.5">
          {category === 'Backup' && item.method && (
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium truncate uppercase tracking-tighter">{item.method}</p>
          )}
          {category === 'Server Check' && item.ipAddress && (
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium truncate tracking-tight">{item.ipAddress}</p>
          )}
          {statusInfo.date && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-50 dark:border-gray-700">
              <p className="text-[8px] text-gray-400 dark:text-gray-500 flex items-center gap-1 opacity-70">
                <CalendarIcon className="w-2 h-2" />
                {safeFormat(statusInfo.date, 'MMM d, yy')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Checklist</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Monitor and update the status of your pre-defined IT infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-10 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
          >
            <option value="All">All Status</option>
            <option value="Today">Due Today</option>
            <option value="Overdue">Overdue</option>
          </select>
          <button 
            onClick={downloadCSV}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-transparent dark:border-gray-700"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2">
            <button 
              onClick={() => setViewMode('checklist')}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === 'checklist' ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === 'list' ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('history')}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === 'history' ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              title="History View"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Filter:</span>
          <select 
            className="rounded-lg border-gray-300 dark:border-gray-700 shadow-sm border p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
          >
            <option value="All">All Categories</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'checklist' && (
        <div className="flex gap-8">
          <div className="flex-1 space-y-16">
            {(Object.entries(frequencyGroups) as [string, any[]][]).map(([frequency, items]) => {
              if (items.length === 0) return null;
              
              const pendingItems = items.filter(({ item }) => getCheckupStatusInfo(item.id, item.frequency).isDue);
              const completedItems = items.filter(({ item }) => !getCheckupStatusInfo(item.id, item.frequency).isDue);

              return (
                <div key={frequency} id={`group-${frequency}`} className="scroll-mt-20 flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Frequency Title */}
                  <div className="lg:w-48 shrink-0">
                    <div className="sticky top-24">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">
                          {frequency}<br/>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maintenance</span>
                        </h2>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-1 leading-relaxed">
                        Regular scheduled {frequency.toLowerCase()} checks for infrastructure reliability.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Content Grids */}
                  <div className="flex-1 space-y-8">
                    {pendingItems.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[9px] font-black text-red-500 uppercase tracking-[0.25em] ml-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Overdue / Required
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {pendingItems.map(({ item, category }) => renderItemCard(item, category))}
                        </div>
                      </div>
                    )}

                    {completedItems.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.25em] ml-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Recently Completed
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-80 hover:opacity-100 transition-opacity">
                          {completedItems.map(({ item, category }) => renderItemCard(item, category))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {allItems.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Settings className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Checkup Items Defined</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">Go to the "Manage" menu to add items you want to track in your checklist.</p>
              </div>
            )}
          </div>

          {/* Right Navigation Sidebar */}
          <div className="w-48 shrink-0 hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">Jump to Group</h4>
              <nav className="space-y-1">
                {(Object.entries(frequencyGroups) as [string, any[]][]).map(([frequency, items]) => {
                   if (items.length === 0) return null;
                   const pendingCount = items.filter(({ item }) => getCheckupStatusInfo(item.id, item.frequency).isDue).length;
                   return (
                     <button
                       key={frequency}
                       onClick={() => document.getElementById(`group-${frequency}`)?.scrollIntoView({ behavior: 'smooth' })}
                       className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                     >
                       <span>{frequency}</span>
                       <div className="flex gap-1">
                         {pendingCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[8px]">{pendingCount}</span>}
                         <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[8px]">{items.length}</span>
                       </div>
                     </button>
                   );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-10">
          {(Object.entries(frequencyGroups) as [string, any[]][]).map(([frequency, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={frequency} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                   <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{frequency} Maintenance</h3>
                   <span className="text-[10px] font-bold text-gray-400 ml-auto">{items.length} Items</span>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Last Check</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                      {items.map(({ item, category }) => {
                        const statusInfo = getCheckupStatusInfo(item.id, item.frequency);
                        const catInfo = categories.find(cat => cat.id === category);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors group">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <div className={clsx("p-1 rounded", catInfo?.bgColor, catInfo?.color, "dark:bg-opacity-20")}>
                                  {catInfo && <catInfo.icon className="w-3 h-3" />}
                                </div>
                                {category}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className={clsx(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter",
                                statusInfo.isMissed 
                                  ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 shadow-sm shadow-red-500/10" 
                                  : "bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-300"
                              )}>
                                {statusInfo.isMissed ? <XCircle className="w-2.5 h-2.5" /> : renderStatusIcon(statusInfo.status)}
                                {statusInfo.label}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {statusInfo.date ? safeFormat(statusInfo.date, 'yyyy-MM-dd') : 'Never'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <button 
                                 onClick={() => {
                                  setShowUpdateModal({ category, itemId: item.id, name: item.name, customFields: item.customFields });
                                  setUpdateForm({ 
                                    status: statusInfo.status !== 'Pending' ? statusInfo.status : '', 
                                    notes: '', 
                                    details: (category === 'Server Check' ? { parts: { RAM: 'Good', Fan: 'Good', 'Hard Disk': 'Good', 'CPU': 'Good', 'Power Supply': 'Good' } } : {}) 
                                  });
                                }}
                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-md font-black text-[9px] uppercase tracking-widest transition-all shadow-sm"
                              >
                                Log Entry
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {historyCheckups.map(checkup => {
                const catInfo = categories.find(cat => cat.id === checkup.category);
                  let itemName = 'Unknown';
                  if (checkup.category === 'Backup') itemName = backups.find(b => b.id === checkup.categoryId)?.name || 'Deleted Item';
                  if (checkup.category === 'Update') itemName = updates.find(u => u.id === checkup.categoryId)?.name || 'Deleted Item';
                  if (checkup.category === 'System Check') itemName = systemChecks.find(s => s.id === checkup.categoryId)?.name || 'Deleted Item';
                  if (checkup.category === 'Server Check') itemName = servers.find(s => s.id === checkup.categoryId)?.name || 'Deleted Item';
                  if (checkup.category === 'Firewall' || checkup.category === 'Virus Guard') itemName = securityItems.find(s => s.id === checkup.categoryId)?.name || 'Deleted Item';

                  return (
                    <tr key={checkup.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {safeFormat(checkup.date, 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">
                        {itemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <div className={clsx("p-1 rounded", catInfo?.bgColor, catInfo?.color, "dark:bg-opacity-20")}>
                            {catInfo && <catInfo.icon className="w-3 h-3" />}
                          </div>
                          {checkup.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderStatusIcon(checkup.status)}
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{checkup.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate italic">
                        {checkup.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              {checkups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">No checkup history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Modal */}
      <Modal
        isOpen={!!showUpdateModal}
        onClose={() => setShowUpdateModal(null)}
        title="Update Maintenance Status"
        maxWidth="max-w-lg"
      >
        {showUpdateModal && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
               <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{showUpdateModal.name}</p>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{showUpdateModal.category}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Status</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={updateForm.status}
                onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
              >
                <option value="">-- Select Status --</option>
                {showUpdateModal.category === 'Backup' && (
                  <>
                    <option value="Done">Done</option>
                    <option value="Not Done">Not Done</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Error">Error</option>
                  </>
                )}
                {showUpdateModal.category === 'Update' && (
                  <>
                    <option value="Updated">Updated</option>
                    <option value="Pending">Pending</option>
                  </>
                )}
                {(showUpdateModal.category === 'System Check' || showUpdateModal.category === 'Server Check') && (
                  <>
                    <option value="Good">Good</option>
                    <option value="Issue">Issue</option>
                    <option value="Not Working">Not Working</option>
                  </>
                )}
                {(showUpdateModal.category === 'Firewall' || showUpdateModal.category === 'Virus Guard') && (
                  <>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Issues">Issues</option>
                  </>
                )}
              </select>
            </div>

            {showUpdateModal.customFields && showUpdateModal.customFields.length > 0 && (
              <div className="space-y-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                  <Plus className="w-3 h-3" /> Additional Fields
                </h4>
                {(showUpdateModal.customFields || []).map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{field.name}</label>
                    <input 
                      type={field.type === 'number' ? 'number' : 'text'}
                      className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      value={updateForm.details?.[field.name] || ''}
                      onChange={e => setUpdateForm({
                        ...updateForm,
                        details: { ...updateForm.details, [field.name]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>
            )}

            {showUpdateModal.category === 'Server Check' && (
              <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-[10px] font-black text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                  <Server className="w-3 h-3 text-orange-600" /> Hardware Health
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {Object.keys(updateForm.details?.parts || {}).map(part => (
                    <div key={part} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                        {part}
                        {!['RAM', 'Fan', 'Hard Disk', 'CPU', 'Power Supply'].includes(part) && (
                          <button 
                            onClick={() => {
                              const newParts = { ...updateForm.details.parts };
                              delete newParts[part];
                              setUpdateForm({
                                ...updateForm,
                                details: { ...updateForm.details, parts: newParts }
                              });
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <select 
                        className="text-[10px] font-black rounded-lg border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white p-1.5 focus:ring-1 focus:ring-orange-500 outline-none uppercase"
                        value={updateForm.details?.parts?.[part] || 'Good'}
                        onChange={e => setUpdateForm({
                          ...updateForm,
                          details: {
                            ...updateForm.details,
                            parts: { ...updateForm.details?.parts, [part]: e.target.value }
                          }
                        })}
                      >
                        <option value="Good">Good</option>
                        <option value="Issue">Issue</option>
                        <option value="Not Working">Not Working</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New part..." 
                    className="flex-1 text-[10px] rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white p-2.5 outline-none focus:ring-1 focus:ring-orange-500"
                    value={newPartName}
                    onChange={e => setNewPartName(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newPartName.trim()) {
                        setUpdateForm({
                          ...updateForm,
                          details: {
                            ...updateForm.details,
                            parts: { ...updateForm.details?.parts, [newPartName.trim()]: 'Good' }
                          }
                        });
                        setNewPartName('');
                      }
                    }}
                    className="p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes / Details</label>
              <textarea 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm border p-4 h-28 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Details of maintenance..."
                value={updateForm.notes}
                onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              {isUpdateDirty && (
                <button 
                  type="button"
                  onClick={resetUpdateForm}
                  className="mr-auto flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <RotateCcw className="w-3 h-3" /> Clear Draft
                </button>
              )}
              <button 
                onClick={() => setShowUpdateModal(null)}
                className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-400 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateStatus}
                className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
              >
                Save Log Entry
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
