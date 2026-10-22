import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Plus, Search, Calendar, Trash2, Edit2, 
  CheckCircle2, Clock, Filter, Download,
  ChevronDown, ChevronRight, MoreVertical,
  LayoutList, User as UserIcon, Building2,
  Tag, AlertCircle, Save, X, Ticket, RotateCcw
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { safeStorage } from '../utils/storage';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { downloadCSV } from '../utils/csv';
import Modal from '../components/Modal';
import ImageModal from '../components/ImageModal';
import * as T from '../types';

const safeParseISO = (dateStr: string | undefined | null): Date => {
  if (!dateStr) return new Date(NaN);
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? new Date(dateStr) : d;
  } catch (e) {
    return new Date(NaN);
  }
};

const safeFormat = (date: Date | string | undefined | null, formatStr: string, fallback: string = 'N/A'): string => {
  if (!date) return fallback;
  try {
    const d = typeof date === 'string' ? safeParseISO(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

export default function DailyTasks() {
  const { dailyTasks, addDailyTask, updateDailyTask, deleteDailyTask, currentUser, issues, users, assets, staff, addStaff } = useStore();
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Done' | 'Pending'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const initialFormData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    task: '',
    category: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    assignedTo: currentUser?.name || '',
    status: 'Pending' as 'Pending' | 'Done',
    remarks: '',
    assetId: '',
    targetUserId: ''
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('daily_tasks', initialFormData, isAdding && !editingId);

  const staffList = useMemo(() => {
    const names = new Set<string>();
    users.forEach(u => names.add(u.name));
    (staff || []).forEach(s => names.add(s.name));
    (dailyTasks || []).forEach(t => {
      if (t.assignedTo) names.add(t.assignedTo);
    });
    return Array.from(names).sort();
  }, [users, dailyTasks, staff]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (dailyTasks || []).forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [dailyTasks]);

  const filteredTasks = useMemo(() => {
    // Combine DailyTasks and Tickets
    const combined = [
      ...(dailyTasks || []).map(t => ({ ...t, _type: 'task' as const })),
      ...(issues || []).map(issue => ({
        id: issue.id,
        date: issue.date,
        task: `[Ticket] ${issue.category}: ${issue.description}`,
        category: 'Ticket Update',
        startDate: issue.date,
        endDate: issue.resolvedDate || issue.date,
        assignedTo: users.find(u => u.id === (issue.assignedToUserId || issue.reportedByUserId))?.name || 'Unassigned',
        status: issue.status === 'Resolved' ? 'Done' : 'Pending' as const,
        remarks: issue.resolutionNote || '',
        assetId: issue.assetId,
        targetUserId: issue.reportedByUserId,
        createdAt: issue.date,
        _type: 'ticket' as const,
        priority: issue.priority,
        progress: issue.progress,
        image: issue.image
      }))
    ];

    return combined.filter(t => {
      const targetUser = users.find(u => u.id === t.targetUserId)?.name || '';
      const targetAsset = assets.find(a => a.id === t.assetId)?.name || '';
      
      const matchesSearch = t.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           targetUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           targetAsset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyTasks, issues, searchTerm, statusFilter, categoryFilter, users, assets]);

  useEffect(() => {
    if (location.state?.openAdd) {
      const saved = safeStorage.getItem('form_draft_daily_tasks');
      if (saved) {
        try {
          setFormData(JSON.parse(saved));
        } catch {
          resetForm();
        }
      } else {
        resetForm();
      }
      setIsAdding(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      // Also expand the date if needed
      const task = filteredTasks.find(t => t.id === targetId);
      if (task) {
        setExpandedDates(prev => ({ ...prev, [task.date]: true }));
      }
      setTimeout(() => {
        const element = document.getElementById(`task-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({ ...location.state, scrollToId: undefined }, document.title);
    }
  }, [location.state, filteredTasks]);

  const handleDownloadReport = () => {
    const headers = [
      { key: 'date', label: 'Date' },
      { key: 'task', label: 'Task Description' },
      { key: 'category', label: 'Category' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'status', label: 'Status' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'targetInfo', label: 'Target (User/Asset)' }
    ];

    const data = filteredTasks.map(t => {
      const targetUser = users.find(u => u.id === t.targetUserId)?.name || '';
      const targetAsset = assets.find(a => a.id === t.assetId);
      const targetInfo = [targetUser, targetAsset ? `${targetAsset.name} (${targetAsset.tag})` : ''].filter(Boolean).join(' / ');
      return { ...t, targetInfo };
    });

    downloadCSV(data, 'daily_work_report', headers);
  };

  const groupedTasks = useMemo(() => {
    const groups: Record<string, T.DailyTask[]> = {};
    filteredTasks.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleSave = async () => {
    if (!formData.task || !formData.date) return;
    if (editingId) {
      await updateDailyTask(editingId, formData);
      setEditingId(null);
    } else {
      await addDailyTask(formData);
      clearPersistence();
    }
    setIsAdding(false);
    resetForm();
  };

  const startEdit = (task: T.DailyTask) => {
    setFormData({
      date: task.date,
      task: task.task,
      category: task.category || '',
      startDate: task.startDate || task.date,
      endDate: task.endDate || task.date,
      assignedTo: task.assignedTo || '',
      status: task.status,
      remarks: task.remarks || '',
      assetId: task.assetId || '',
      targetUserId: task.targetUserId || ''
    });
    setEditingId(task.id);
    setIsAdding(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <LayoutList className="w-8 h-8 text-blue-600" />
            Day to Day Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Daily activity log and task management.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
          <button
            onClick={() => {
              const saved = safeStorage.getItem('form_draft_daily_tasks');
              if (saved) {
                try {
                  setFormData(JSON.parse(saved));
                } catch {
                  resetForm();
                }
              } else {
                resetForm();
              }
              setIsAdding(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Daily Log
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, departments, or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Done">Done</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedTasks).map(([date, tasks]: [string, T.DailyTask[]]) => (
          <div key={date} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleDate(date)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-900 dark:text-white">
                  {safeFormat(date, 'EEEE, MMMM do, yyyy')}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              {expandedDates[date] === false ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            <AnimatePresence initial={false}>
              {expandedDates[date] !== false && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/30 text-xs uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                          <th className="px-6 py-3 w-16">No.</th>
                          <th className="px-6 py-3">Target (User/Asset)</th>
                          <th className="px-6 py-3">Task Description</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">Assigned To</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tasks.map((task: any, index: number) => {
                          const targetUser = users.find(u => u.id === task.targetUserId);
                          const targetAsset = assets.find(a => a.id === task.assetId);
                          
                          return (
                            <tr key={task.id} id={`task-${task.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                              <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {targetUser && (
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">{targetUser.name}</span>
                                    </div>
                                  )}
                                  {targetAsset && (
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{targetAsset.name} {targetAsset.tag ? `[${targetAsset.tag}]` : ''}</span>
                                    </div>
                                  )}
                                  {!targetUser && !targetAsset && (
                                    <span className="text-xs text-gray-400 italic">No target specified</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">{task.task}</p>
                                    {task._type === 'ticket' && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                                        <Ticket className="w-2 h-2" />
                                        Ticket
                                      </span>
                                    )}
                                    {task.category === 'Ticket Update' && task._type !== 'ticket' && (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                                        <Tag className="w-2 h-2" />
                                        Auto
                                      </span>
                                    )}
                                  </div>
                                  {task.remarks && (
                                    <p className="text-xs text-gray-500 italic">{task.remarks}</p>
                                  )}
                                  {task._type === 'ticket' && task.progress !== undefined && (
                                    <div className="flex items-center gap-3 mt-1">
                                      <div className="w-full max-w-[100px] bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                                        <div 
                                          className="bg-indigo-500 h-full transition-all" 
                                          style={{ width: `${task.progress}%` }}
                                        />
                                      </div>
                                      {task.image && (
                                        <button 
                                          onClick={() => setSelectedImage(task.image)}
                                          className="shrink-0"
                                        >
                                          {task.image && (
                                            <img 
                                              src={task.image} 
                                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform" 
                                              alt="Ref" 
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                                {task.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{task.assignedTo}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => updateDailyTask(task.id, { status: task.status === 'Done' ? 'Pending' : 'Done' })}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors ${
                                  task.status === 'Done' 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                }`}
                              >
                                {task.status === 'Done' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {task.status}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {task._type === 'task' && (
                                    <>
                                      <button
                                        onClick={() => startEdit(task)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteDailyTask(task.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAdding}
        onClose={() => { setIsAdding(false); setEditingId(null); }}
        title={editingId ? 'Edit Daily Log' : 'New Daily Log'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target User</label>
              <select
                value={formData.targetUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUserId: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select User (Optional)</option>
                {users.slice().sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Asset</label>
              <select
                value={formData.assetId}
                onChange={(e) => setFormData(prev => ({ ...prev, assetId: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Asset (Optional)</option>
                {assets.slice().sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                  <option key={a.id} value={a.id}>{a.name} {a.tag ? `[${a.tag}]` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Description</label>
            <textarea
              value={formData.task}
              onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="What was done?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category / System (Device)</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category / Device</option>
                <optgroup label="Systems">
                  <option value="Backups">Backups</option>
                  <option value="Office 365">Office 365</option>
                  <option value="Network">Network</option>
                  <option value="Security">Security</option>
                  <option value="Software">Software</option>
                </optgroup>
                <optgroup label="Devices / Assets">
                  {assets.slice().sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                    <option key={a.id} value={`${a.name} (${a.tag || a.serialNumber})`}>
                      {a.name} {a.tag ? `[${a.tag}]` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    list="staff-list"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Select or type name"
                  />
                  <datalist id="staff-list">
                    {staffList.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.assignedTo && !staffList.includes(formData.assignedTo)) {
                      addStaff(formData.assignedTo);
                    }
                  }}
                  disabled={!formData.assignedTo || staffList.includes(formData.assignedTo)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add to staff list"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Remarks</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any notes or codes..."
              />
            </div>
          </div>

          <div className="pt-6 flex justify-between items-center gap-3">
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
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-bold uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-colors flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <Save className="w-4 h-4" />
                Save Log
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ImageModal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        imageUrl={selectedImage || ''} 
      />
    </div>
  );
}
