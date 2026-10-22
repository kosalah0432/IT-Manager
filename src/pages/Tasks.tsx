import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { safeStorage } from '../utils/storage';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, 
  Clock, X, CheckCircle2, AlertCircle, Upload, Search, RotateCcw
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { downloadCSV } from '../utils/csv';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

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

export default function Tasks() {
  const { currentUser, tasks, users, addTask, updateTask, deleteTask, addTaskNote, deleteTaskNote, addNotification, hasPermission } = useStore();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.filterUser) {
      setFilterUser(location.state.filterUser === 'me' && currentUser ? currentUser.id : location.state.filterUser);
      window.history.replaceState({ ...location.state, filterUser: undefined }, document.title);
    }
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
      window.history.replaceState({ ...location.state, filterStatus: undefined }, document.title);
    }
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
      window.history.replaceState({ ...location.state, searchQuery: undefined }, document.title);
    }
    if (location.state?.openAdd) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setExpandedTask(targetId);
      setTimeout(() => {
        const element = document.getElementById(`task-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, currentUser]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const initialFormData = {
    title: '', 
    description: '', 
    status: 'To Do' as any, 
    dueDate: today, 
    type: 'Maintenance' as any, 
    assignedToUserId: ''
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('tasks', initialFormData, showForm && !editingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        assignedToUserId: formData.assignedToUserId || null,
        userId: editingId ? undefined : currentUser?.id
      };

      if (editingId) {
        await updateTask(editingId, dataToSubmit);
        addNotification('Task updated successfully', 'success');
        setEditingId(null);
      } else {
        await addTask({
          ...dataToSubmit,
          notes: []
        });
        addNotification('Task added successfully', 'success');
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting task:', error);
      addNotification(`Failed to ${editingId ? 'update' : 'add'} task`, 'error');
    }
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      dueDate: task.dueDate,
      type: task.type || 'Maintenance',
      assignedToUserId: task.assignedToUserId || ''
    });
    setIsDirty(false);
    setShowForm(true);
  };

  const handleAddNote = async (taskId: string) => {
    if (!newNote.trim()) return;
    try {
      await addTaskNote(taskId, newNote);
      addNotification('Note added successfully', 'success');
      setNewNote('');
    } catch (error) {
      console.error('Error adding task note:', error);
      addNotification('Failed to add note', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!isDeleting) return;
    try {
      await deleteTask(isDeleting);
      addNotification('Task deleted successfully', 'success');
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      addNotification('Failed to delete task', 'error');
    }
  };

  const handleUpdateTaskStatus = async (id: string, status: any) => {
    try {
      await updateTask(id, { status });
      addNotification('Task status updated', 'success');
    } catch (error) {
      console.error('Error updating task status:', error);
      addNotification('Failed to update task status', 'error');
    }
  };

  const handleUpdateTaskDueDate = async (id: string, dueDate: string) => {
    try {
      await updateTask(id, { dueDate });
      addNotification('Task due date updated', 'success');
    } catch (error) {
      console.error('Error updating task due date:', error);
      addNotification('Failed to update task due date', 'error');
    }
  };

  const handleDeleteTaskNote = async (taskId: string, noteId: string) => {
    try {
      await deleteTaskNote(taskId, noteId);
      addNotification('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting task note:', error);
      addNotification('Failed to delete note', 'error');
    }
  };

  const groupTasksByDate = (tasksList: any[]) => {
    const groups: Record<string, any[]> = {};
    (tasksList || []).forEach(task => {
      const date = task.dueDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const filteredTasksList = (tasks || []).filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q);
    
    const matchesStatus = !filterStatus || t.status === filterStatus;
    const matchesUser = !filterUser || t.assignedToUserId === filterUser || (filterUser === 'me' && t.assignedToUserId === currentUser?.id);
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  const groupedTasks = groupTasksByDate(filteredTasksList);

  const handleDownloadReport = () => {
    const headers = [
      { key: 'dueDate', label: 'Due Date' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'type', label: 'Type' },
      { key: 'notesCount', label: 'Notes' }
    ];

    const data = filteredTasksList.map(task => ({
      ...task,
      notesCount: task.notes?.length || 0
    }));

    downloadCSV(data, 'maintenance_tasks_report', headers);
  };

  const isAdmin = hasPermission('tasks', 'canDelete');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Scheduled system maintenance and recurring tasks.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold uppercase tracking-wider text-xs"
          >
            <Upload className="w-4 h-4 rotate-180" /> Download Report
          </button>
          {hasPermission('tasks', 'canCreate') && (
            <button 
              onClick={() => {
                const saved = safeStorage.getItem('form_draft_tasks');
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
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold uppercase tracking-wider text-xs"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
        <select 
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
        >
          <option value="">All Users</option>
          <option value="me">Assigned to Me</option>
          {users.filter(u => u.role !== 'User').map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Task' : 'Add New Task'}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-medium">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title</label>
            <input required type="text" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</label>
            <input required type="date" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select required className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.assignedToUserId} onChange={e => setFormData({...formData, assignedToUserId: e.target.value})}>
              <option value="">Unassigned</option>
              {users.filter(u => u.role !== 'User').map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea rows={3} className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Task details..."></textarea>
          </div>
          
          <div className="md:col-span-2 flex justify-between items-center mt-6 gap-4">
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
              <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all">{editingId ? 'Update Task' : 'Save Task'}</button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="space-y-8">
        {(groupedTasks || []).length > 0 ? (
          (groupedTasks || []).map(([date, tasksInDate]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-950 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                  {safeFormat(date, 'EEEE, MMMM d, yyyy')}
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {(tasksInDate || []).map(task => {
                  const isExpanded = expandedTask === task.id;
                  return (
                    <div 
                      key={task.id}
                      id={`task-${task.id}`}
                      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md"
                    >
                      <div className="p-3 md:p-5 flex flex-col md:flex-row md:items-center gap-4 lg:gap-8">
                        {/* Status Column */}
                        <div className="md:w-32 shrink-0 order-1">
                          <span className={clsx(
                            "text-[10px] font-black uppercase px-3 py-1.5 rounded-xl tracking-widest text-center block w-fit md:w-full",
                            task.status === 'Done' ? 'bg-emerald-500 text-white' :
                            task.status === 'In Progress' ? 'bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-300 dark:shadow-none' :
                            'bg-gray-500 text-white shadow-md'
                          )}>
                            {task.status}
                          </span>
                        </div>

                        {/* Title & Info Column */}
                        <div className="flex-1 min-w-0 order-2">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                              {task.type || 'Maintenance'}
                            </span>
                            {task.assignedToUserId && (
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                Tech: {users.find(u => u.id === task.assignedToUserId)?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-gray-900 dark:text-white truncate">{task.title}</h3>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-1 truncate">{task.description}</p>
                        </div>
                        
                        {/* Actions Column */}
                        <div className="flex items-center gap-1 order-3 shrink-0 ml-auto max-md:absolute max-md:top-3 max-md:right-3">
                          <button 
                            onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {hasPermission('tasks', 'canEdit') && (
                            <button 
                              onClick={() => handleEdit(task)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('tasks', 'canDelete') && (
                            <button 
                              onClick={() => setIsDeleting(task.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                              <select 
                                value={task.status}
                                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</label>
                              <input 
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => handleUpdateTaskDueDate(task.id, e.target.value)}
                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progress Notes</h4>
                              <span className="text-[10px] text-gray-400">{task.notes?.length || 0} notes</span>
                            </div>
                            
                            <div className="space-y-3">
                              {(task.notes || []).map(note => (
                               <div key={note.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-start group">
                                  <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
                                    <span className="text-[10px] text-gray-400 mt-1 block">
                                      {safeFormat(note.date, 'MMM d, yyyy HH:mm')}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteTaskNote(task.id, note.id)}
                                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Add a progress note..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddNote(task.id)}
                                className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              />
                              <button 
                                onClick={() => handleAddNote(task.id)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Tasks Scheduled</h3>
            <p className="text-gray-500 dark:text-gray-400">Scheduled maintenance tasks will appear here.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
