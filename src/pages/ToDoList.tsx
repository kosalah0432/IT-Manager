import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  CheckSquare, Plus, Trash2, Calendar, 
  AlertCircle, CheckCircle2, Clock, Filter, Search, X, Edit2,
  Users, Monitor, RefreshCw, Upload, RotateCcw
} from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { safeStorage } from '../utils/storage';
import { ToDo } from '../types';
import { useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { format, isBefore, isAfter, parseISO, addDays, addWeeks, addMonths, setDate, setDay, startOfDay, isSameDay } from 'date-fns';
import { downloadCSV } from '../utils/csv';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

// Safe date manipulation helpers
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

const safeIsSameDay = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? safeParseISO(d1) : d1;
    const date2 = typeof d2 === 'string' ? safeParseISO(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameDay(date1, date2);
  } catch (e) {
    return false;
  }
};

export default function ToDoList() {
  const { currentUser, toDos, addToDo, updateToDo, deleteToDo, users, assets, addNotification, hasPermission } = useStore();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<ToDo | null>(null);

  useEffect(() => {
    if (location.state?.openAdd) {
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`todo-${targetId}`);
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
  }, [location.state]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [todoToComplete, setTodoToComplete] = useState<ToDo | null>(null);
  const [completeRemarks, setCompleteRemarks] = useState('');

  const initialFormData = {
    title: '',
    completed: false,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    dueDate: '',
    assetId: '',
    userId: '',
    frequency: 'None' as 'None' | 'Daily' | 'Weekly' | 'Monthly',
    dayOfWeek: 1,
    dayOfMonth: 5
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('todos', initialFormData, showAddModal && !editingTodo);

  const isTaskInReadyWindow = (todo: ToDo) => {
    // If no recurrence or no due date, it's always ready
    if (!todo.dueDate || !todo.frequency || todo.frequency === 'None') return true;
    
    try {
      const dueDate = parseISO(todo.dueDate);
      const now = startOfDay(new Date());
      
      let windowDays = 7; // Default for Monthly
      if (todo.frequency === 'Daily') windowDays = 0;
      if (todo.frequency === 'Weekly') windowDays = 2;
      
      const windowStart = addDays(dueDate, -windowDays);
      
      // CRITICAL: A task is "Done" until its next cycle's window opens.
      // So it is "In Ready Window" if today is on or after the window start.
      return !isBefore(now, windowStart);
    } catch (e) {
      return true;
    }
  };

  const canDelete = hasPermission('to_dos', 'canDelete');

  const handleDownloadReport = () => {
    const headers = [
      { key: 'dueDate', label: 'Due Date' },
      { key: 'title', label: 'Task' },
      { key: 'priority', label: 'Priority' },
      { key: 'completed', label: 'Status' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'assetName', label: 'Related Asset' },
      { key: 'frequency', label: 'Recurrence' },
      { key: 'completedAt', label: 'Completed At' },
      { key: 'remarks', label: 'Remarks' }
    ];

    const data = toDos.map(t => {
      const u = users.find(user => user.id === t.userId);
      const a = assets.find(asset => asset.id === t.assetId);
      return {
        ...t,
        completed: t.completed ? 'Completed' : 'Pending',
        assignedTo: u?.name || 'Unassigned',
        assetName: a ? `${a.name} (${a.tag})` : 'N/A'
      };
    });

    downloadCSV(data, 'todo_list_report', headers);
  };


  const calculateNextDueDate = (frequency: 'Daily' | 'Weekly' | 'Monthly', dayOfWeek?: number, dayOfMonth?: number, baseDate?: Date) => {
    const start = baseDate || new Date();
    let nextDate = startOfDay(start);

    if (frequency === 'Daily') {
      nextDate = addDays(nextDate, 1);
    } else if (frequency === 'Weekly' && dayOfWeek !== undefined) {
      nextDate = setDay(nextDate, dayOfWeek);
      // Ensure it's in the future relative to baseDate
      if (!isAfter(nextDate, start)) {
        nextDate = addWeeks(nextDate, 1);
      }
    } else if (frequency === 'Monthly' && dayOfMonth !== undefined) {
      nextDate = setDate(nextDate, dayOfMonth);
      // Ensure it's in the future relative to baseDate
      if (!isAfter(nextDate, start)) {
        nextDate = addMonths(nextDate, 1);
      }
    }

    return format(nextDate, 'yyyy-MM-dd');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...formData };
      if (dataToSubmit.frequency !== 'None') {
        dataToSubmit.dueDate = calculateNextDueDate(
          dataToSubmit.frequency as any, 
          dataToSubmit.dayOfWeek, 
          dataToSubmit.dayOfMonth
        );
      }

      if (editingTodo) {
        await updateToDo(editingTodo.id, dataToSubmit);
        addNotification('Task updated successfully', 'success');
        setEditingTodo(null);
      } else {
        await addToDo(dataToSubmit);
        addNotification('Task added successfully', 'success');
        clearPersistence();
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting todo:', error);
      addNotification(`Failed to ${editingTodo ? 'update' : 'add'} task`, 'error');
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    const todo = toDos.find(t => t.id === id);
    if (completed && todo) {
      setTodoToComplete(todo);
      setCompleteRemarks('');
      return;
    }

    try {
      const now = new Date().toISOString();
      await updateToDo(id, { completed, completedAt: completed ? now : undefined });
      addNotification(`Task marked as pending`, 'success');
    } catch (error) {
      console.error('Error toggling todo completion:', error);
      addNotification('Failed to update task status', 'error');
    }
  };

  const confirmComplete = async () => {
    if (!todoToComplete) return;
    
    try {
      const id = todoToComplete.id;
      const now = new Date().toISOString();
      
      if (todoToComplete.frequency && todoToComplete.frequency !== 'None') {
        const nextDueDate = calculateNextDueDate(
          todoToComplete.frequency as any, 
          todoToComplete.dayOfWeek, 
          todoToComplete.dayOfMonth,
          todoToComplete.dueDate ? safeParseISO(todoToComplete.dueDate) : new Date()
        );
        
        await addToDo({
          title: todoToComplete.title,
          completed: false,
          priority: todoToComplete.priority,
          dueDate: nextDueDate,
          assetId: todoToComplete.assetId,
          userId: todoToComplete.userId,
          frequency: todoToComplete.frequency,
          dayOfWeek: todoToComplete.dayOfWeek,
          dayOfMonth: todoToComplete.dayOfMonth
        });
        
        await updateToDo(id, { 
          completed: true, 
          completedAt: now, 
          frequency: 'None',
          remarks: completeRemarks
        });
        addNotification(`Task completed. Next occurrence scheduled for ${nextDueDate}`, 'success');
      } else {
        await updateToDo(id, { 
          completed: true, 
          completedAt: now,
          remarks: completeRemarks
        });
        addNotification(`Task marked as completed`, 'success');
      }
      setTodoToComplete(null);
      setCompleteRemarks('');
    } catch (error) {
      console.error('Error completing todo:', error);
      addNotification('Failed to complete task', 'error');
    }
  };

  const handleDeleteTodo = async () => {
    if (!isDeleting) return;
    try {
      await deleteToDo(isDeleting);
      addNotification('Task deleted successfully', 'success');
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting todo:', error);
      addNotification('Failed to delete task', 'error');
    }
  };

  const [pendingToDos, setPendingToDos] = useState<ToDo[]>([]);
  // Use setPendingToDos in a useEffect to keep UI consistent if needed, but for now let's just use useMemo to avoid state sync issues
  const filteredPending = React.useMemo(() => toDos.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const isReady = isTaskInReadyWindow(t);
    return !t.completed && isReady && matchesSearch && matchesPriority;
  }), [toDos, searchQuery, filterPriority, isTaskInReadyWindow]);

  const pendingScheduled = filteredPending.filter(t => t.dueDate || (t.frequency && t.frequency !== 'None')).sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const pendingGeneral = filteredPending.filter(t => !t.dueDate && (!t.frequency || t.frequency === 'None')).sort((a, b) => {
    const priorityMap = { High: 0, Medium: 1, Low: 2 };
    if (priorityMap[a.priority] !== priorityMap[b.priority]) {
      return priorityMap[a.priority] - priorityMap[b.priority];
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const completedToDos = toDos.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const isReady = isTaskInReadyWindow(t);
    // Include actually completed tasks OR tasks that are not yet in their ready window
    return (t.completed || (!t.completed && !isReady)) && matchesSearch && matchesPriority;
  }).sort((a, b) => {
    // Priority sort: actually completed tasks first, then by date
    if (a.completed !== b.completed) {
      return a.completed ? -1 : 1;
    }
    const dateA = a.completedAt || a.dueDate || a.createdAt;
    const dateB = b.completedAt || b.dueDate || b.createdAt;
    return dateB.localeCompare(dateA);
  });

  const groupToDosByDate = (todos: ToDo[]) => {
    const groups: Record<string, ToDo[]> = {};
    todos.forEach(todo => {
      const date = todo.dueDate || 'No Date';
      if (!groups[date]) groups[date] = [];
      groups[date].push(todo);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'No Date') return 1;
      if (b[0] === 'No Date') return -1;
      return a[0].localeCompare(b[0]);
    });
  };

  const groupCompletedByDoneDate = (todos: ToDo[]) => {
    const groups: Record<string, ToDo[]> = {};
    todos.forEach(todo => {
      const date = todo.completedAt ? todo.completedAt.split('T')[0] : todo.createdAt.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(todo);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // Recent dates first
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'Medium': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'Low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const groupedPendingScheduled = groupToDosByDate(pendingScheduled);
  const groupedCompleted = groupCompletedByDoneDate(completedToDos);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">To-Do List</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your daily IT tasks and priorities.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold uppercase tracking-wider text-xs"
          >
            <Upload className="w-4 h-4 rotate-180" /> Download Report
          </button>
          <button 
            onClick={() => {
              setEditingTodo(null);
              const saved = safeStorage.getItem('form_draft_todos');
              if (saved) {
                try {
                  setFormData(JSON.parse(saved));
                } catch {
                  setFormData(initialFormData);
                }
              } else {
                setFormData(initialFormData);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold uppercase tracking-wider text-xs"
          >
            <Plus className="w-4 h-4" /> Add New Task
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border focus:ring-2 focus:ring-indigo-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
          <select 
            className="rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="space-y-12">
        {/* Pending Tasks Section - Split View */}
        {(filterStatus === 'All' || filterStatus === 'Pending') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scheduled Tasks (Left) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Scheduled & Recurring</h2>
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs font-bold">{pendingScheduled.length}</span>
              </div>
              
              <div className="space-y-8">
                {groupedPendingScheduled.length > 0 ? (
                  groupedPendingScheduled.map(([date, todosInDate]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                          {date === 'No Date' ? 'Scheduled' : safeFormat(date, 'EEEE, MMM d, yyyy')}
                        </span>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {todosInDate.map(todo => (
                          <TaskItem 
                            key={todo.id} 
                            todo={todo} 
                            users={users} 
                            assets={assets} 
                            handleToggleTodo={handleToggleTodo} 
                            handleEdit={(t) => {
                              setEditingTodo(t);
                              setFormData({
                                title: t.title,
                                completed: t.completed,
                                priority: t.priority,
                                dueDate: t.dueDate || '',
                                assetId: t.assetId || '',
                                userId: t.userId || '',
                                frequency: t.frequency || 'None',
                                dayOfWeek: t.dayOfWeek || 1,
                                dayOfMonth: t.dayOfMonth || 5
                              });
                              setShowAddModal(true);
                            }}
                            canDelete={canDelete}
                            setIsDeleting={setIsDeleting}
                            getPriorityColor={getPriorityColor}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-400 text-sm">No scheduled tasks.</p>
                  </div>
                )}
              </div>
            </div>

            {/* General Tasks (Right) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">General Tasks</h2>
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">{pendingGeneral.length}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {pendingGeneral.length > 0 ? (
                  pendingGeneral.map(todo => (
                    <TaskItem 
                      key={todo.id} 
                      todo={todo} 
                      users={users} 
                      assets={assets} 
                      handleToggleTodo={handleToggleTodo} 
                      handleEdit={(t) => {
                        setEditingTodo(t);
                        setFormData({
                          title: t.title,
                          completed: t.completed,
                          priority: t.priority,
                          dueDate: t.dueDate || '',
                          assetId: t.assetId || '',
                          userId: t.userId || '',
                          frequency: t.frequency || 'None',
                          dayOfWeek: t.dayOfWeek || 1,
                          dayOfMonth: t.dayOfMonth || 5
                        });
                        setShowAddModal(true);
                      }}
                      canDelete={canDelete}
                      setIsDeleting={setIsDeleting}
                      getPriorityColor={getPriorityColor}
                    />
                  ))
                ) : (
                  <div className="py-12 text-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-400 text-sm">No general tasks. Try adding some!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completed Tasks Section */}
        {(filterStatus === 'All' || filterStatus === 'Completed') && (
          <div className="space-y-6 border-t border-gray-100 dark:border-gray-800 pt-12">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Recently Completed</h2>
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs font-bold">{completedToDos.length}</span>
            </div>
            
            {groupedCompleted.length > 0 ? (
              <div className="space-y-8">
                {groupedCompleted.map(([date, todosInDate]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800 opacity-50"></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                        {safeIsSameDay(date, new Date()) ? 'Today' : safeFormat(date, 'EEEE, MMM d, yyyy')}
                      </span>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800 opacity-50"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {todosInDate.map(todo => (
                        <TaskItem 
                          key={todo.id} 
                          todo={todo} 
                          users={users} 
                          assets={assets} 
                          handleToggleTodo={handleToggleTodo} 
                          handleEdit={() => {}}
                          canDelete={canDelete}
                          setIsDeleting={setIsDeleting}
                          getPriorityColor={getPriorityColor}
                          compact
                          forceCompleted={!todo.completed}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 text-sm">No completed tasks yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingTodo ? 'Edit To-Do Task' : 'Add New To-Do Task'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 font-medium">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title</label>
            <input 
              required
              type="text" 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recurrence</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
              >
                <option value="None">None</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          {formData.frequency === 'None' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</label>
              <input 
                type="date" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          ) : formData.frequency === 'Weekly' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Day of Week</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.dayOfWeek}
                onChange={e => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Day of Month</label>
              <input 
                type="number" 
                min={1}
                max={31}
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.dayOfMonth}
                onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign to User</label>
            <select 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
              value={formData.userId}
              onChange={e => setFormData({ ...formData, userId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {(users || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Related Asset</label>
            <select 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500"
              value={formData.assetId}
              onChange={e => setFormData({ ...formData, assetId: e.target.value })}
            >
              <option value="">No Asset</option>
              {(assets || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
            </select>
          </div>

          <div className="pt-4 flex items-center gap-3">
            {isDirty && !editingTodo && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" /> Clear Draft
              </button>
            )}
            <div className="flex gap-3 ml-auto flex-1">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
              >
                {editingTodo ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDeleteTodo}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />

      <ConfirmModal
        isOpen={!!todoToComplete}
        onClose={() => { setTodoToComplete(null); setCompleteRemarks(''); }}
        onConfirm={confirmComplete}
        title="Complete Task"
        message={
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Would you like to add any remarks before completing <span className="font-bold">"{todoToComplete?.title}"</span>?
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</label>
              <textarea
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                placeholder="Enter completion remarks (optional)..."
                value={completeRemarks}
                onChange={e => setCompleteRemarks(e.target.value)}
              />
            </div>
          </div>
        }
        confirmText="Complete Task"
        cancelText="Cancel"
      />
    </div>
  );
}

interface TaskItemProps {
  key?: string | number;
  todo: ToDo;
  users: any[];
  assets: any[];
  handleToggleTodo: (id: string, completed: boolean) => void;
  handleEdit: (todo: ToDo) => void;
  canDelete: boolean;
  setIsDeleting: (id: string) => void;
  getPriorityColor: (p: string) => string;
  compact?: boolean;
  forceCompleted?: boolean;
}

function TaskItem({ 
  todo, users, assets, handleToggleTodo, handleEdit, canDelete, setIsDeleting, getPriorityColor, compact, forceCompleted 
}: TaskItemProps) {
  const user = users.find(u => u.id === todo.userId);
  const asset = assets.find(a => a.id === todo.assetId);
  const isChecked = todo.completed || forceCompleted;

  return (
    <div 
      id={`todo-${todo.id}`}
      className={clsx(
        "group bg-white dark:bg-gray-800 rounded-2xl border transition-all flex items-center justify-between",
        isChecked 
          ? "p-4 border-gray-100 dark:border-gray-800 shadow-sm" 
          : "p-5 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => handleToggleTodo(todo.id, !todo.completed)}
          className={clsx(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isChecked 
              ? "bg-emerald-500 border-emerald-500 text-white" 
              : "border-gray-300 dark:border-gray-600 hover:border-indigo-500"
          )}
        >
          {isChecked && <CheckCircle2 className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={clsx(
            "font-bold truncate",
            isChecked ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"
          )}>
            {todo.title}
            {!todo.completed && forceCompleted && (
              <span className="ml-2 text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded tracking-widest no-underline inline-block translate-y-[-1px]">
                Active Cycle (Marked Done until {todo.dueDate ? safeFormat(addDays(safeParseISO(todo.dueDate), -7), 'MMM d') : 'next week'})
              </span>
            )}
          </h3>
          {todo.remarks && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 italic">
              Remarks: {todo.remarks}
            </p>
          )}
          {!compact && (
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", getPriorityColor(todo.priority))}>
                {todo.priority}
              </span>
              {todo.frequency && todo.frequency !== 'None' && (
                <span className="text-[10px] font-medium text-indigo-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> {todo.frequency}
                </span>
              )}
              {user && (
                <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {user.name}
                </span>
              )}
              {asset && (
                <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> {asset.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!todo.completed && (
          <button 
            onClick={() => handleEdit(todo)}
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {canDelete && (
          <button 
            onClick={() => setIsDeleting(todo.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
