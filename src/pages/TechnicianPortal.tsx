import React, { useState } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { 
  Monitor, AlertCircle, Clock, 
  CheckCircle2, LayoutDashboard,
  CheckSquare, User, Search, Wrench, History,
  FileText, Shield, Terminal, ArrowRight,
  TrendingUp, Activity, MessageSquare, PauseCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const safeFormatAndParse = (date: any, formatStr: string, fallback: string = 'N/A'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

export default function TechnicianPortal() {
  const navigate = useNavigate();
  const { 
    currentUser, issues, assets, tasks, 
    toDos, users, notes, procedures, logs,
    updateIssue, updateTask, addNotification
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tasks' | 'Issues' | 'MyNotes' | 'Activity'>('Overview');
  
  const [logSearchQuery, setLogSearchQuery] = useState('');
  
  if (!currentUser) return null;

  // Filter data for the technician
  const myAssignedIssues = (issues || []).filter(i => i.assignedToUserId === currentUser.id);
  const myAssignedTasks = (tasks || []).filter(t => t.assignedToUserId === currentUser.id);
  const myToDos = (toDos || []).filter(t => t.userId === currentUser.id);
  const myNotes = (notes || []).filter(n => n.userId === currentUser.id);
  
  // Filter unassigned works
  const unassignedIssues = (issues || []).filter(i => (!i.assignedToUserId || i.assignedToUserId === "") && i.status !== 'Resolved');
  const unassignedTasks = (tasks || []).filter(t => (!t.assignedToUserId || t.assignedToUserId === "") && t.status !== 'Resolved' && t.status !== 'Done');

  const myLogs = (logs || []).filter(l => {
    const isMine = l.userId === currentUser.id;
    if (!isMine) return false;
    if (logSearchQuery) {
      const q = logSearchQuery.toLowerCase();
      return l.action.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
    }
    return true;
  }).slice(0, 20);
  const openIssues = (issues || []).filter(i => i.status !== 'Resolved');

  const stats = {
    myIssues: myAssignedIssues.length,
    myTasks: myAssignedTasks.length,
    myToDos: myToDos.filter(t => !t.completed).length,
    myNotes: myNotes.length,
    totalOpenIssues: openIssues.length
  };

  const handleTakeIssue = async (id: string) => {
    try {
      await updateIssue(id, { assignedToUserId: currentUser.id, status: 'In Progress' });
      addNotification('Support ticket claimed successfully!', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error taking ticket', 'error');
    }
  };

  const handleStartWorkIssue = async (id: string) => {
    try {
      await updateIssue(id, { assignedToUserId: currentUser.id, status: 'In Progress' });
      addNotification('Started work on the ticket successfully!', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error starting work on ticket', 'error');
    }
  };

  const handleResolveIssueDirectly = async (id: string) => {
    try {
      const note = prompt("Please enter resolution details before closing:") || "";
      await updateIssue(id, { assignedToUserId: currentUser.id, status: 'Resolved', resolutionNote: note });
      addNotification('Ticket marked as Resolved and closed!', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error resolving ticket', 'error');
    }
  };

  const handleTakeTask = async (id: string) => {
    try {
      await updateTask(id, { assignedToUserId: currentUser.id, status: 'In Progress' });
      addNotification('Maintenance job claimed successfully!', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error taking maintenance task', 'error');
    }
  };

  const handleCompleteTaskDirectly = async (id: string) => {
    try {
      await updateTask(id, { assignedToUserId: currentUser.id, status: 'Done' });
      addNotification('Maintenance task completed successfully!', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error completing task', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 p-4 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <Terminal className="w-8 h-8 text-indigo-600 animate-pulse" />
            Technician Command Center
          </h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">
            Logged in as {currentUser.name} • {currentUser.role} Control Panel
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl transition-all font-bold hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm text-xs uppercase tracking-widest"
          >
            <Activity className="w-4 h-4" />
            Active Tickets
          </button>
          <button 
            onClick={() => navigate('/todos')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none text-xs uppercase tracking-widest"
          >
            <CheckSquare className="w-4 h-4" />
            My To-Dos
          </button>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Assigned Issues', val: stats.myIssues, color: 'red', icon: AlertCircle, action: () => setActiveTab('Issues') },
          { label: 'Assigned Maintenance', val: stats.myTasks, color: 'blue', icon: Wrench, action: () => setActiveTab('Tasks') },
          { label: 'Pending To-Dos', val: stats.myToDos, color: 'amber', icon: CheckSquare, path: '/todos' },
          { label: 'My Private Notes', val: stats.myNotes, color: 'indigo', icon: FileText, action: () => setActiveTab('MyNotes') },
          { label: 'Network Alert Status', val: 'Healthy', color: 'green', icon: Activity, action: () => setActiveTab('Activity') },
        ].map((item) => (
          <button 
            key={item.label}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (item.path) {
                navigate(item.path, { state: (item as any).state });
              }
            }}
            className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-left group hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-[1.02] active:scale-[0.98] duration-200 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3 text-gray-400 w-full">
               <item.icon className={clsx(
                 "w-5 h-5",
                 item.color === 'red' && "text-red-500",
                 item.color === 'blue' && "text-blue-500",
                 item.color === 'amber' && "text-amber-500",
                 item.color === 'indigo' && "text-indigo-500",
                 item.color === 'green' && "text-green-500"
               )} />
               <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">{item.val}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {(['Overview', 'Tasks', 'Issues', 'MyNotes', 'Activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2",
              activeTab === tab 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === 'MyNotes' ? 'My Notes' : tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            
            {/* Available Work Pool (Unassigned Jobs) */}
            {(unassignedIssues.length > 0 || unassignedTasks.length > 0) && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-1.5">
                      Available Jobs Pool ({unassignedIssues.length + unassignedTasks.length} Unassigned Works)
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200/40 dark:border-amber-900/30">
                    Claim Ownership
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unassigned Support Tickets */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800/80 pb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        Support Tickets ({unassignedIssues.length})
                      </span>
                    </div>
                    {unassignedIssues.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400 italic">No unassigned tickets.</div>
                    ) : (
                      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {unassignedIssues.map(issue => (
                          <div key={issue.id} className="p-3 bg-white dark:bg-slate-900/80 border border-gray-100 dark:border-slate-800 rounded-2xl hover:border-amber-400 hover:scale-[1.01] transition-all duration-200 flex items-start justify-between gap-3 shadow-xs">
                            <div 
                              onClick={() => navigate('/issues', { state: { scrollToId: issue.id } })}
                              className="min-w-0 flex-1 cursor-pointer group/item hover:opacity-80 transition-all"
                              title="Click to view ticket details"
                            >
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className={clsx(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight",
                                  issue.priority === 'High' ? 'bg-red-500 text-white' : issue.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                                )}>
                                  {issue.priority}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 font-mono">{issue.date}</span>
                              </div>
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{issue.category || 'General'}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{issue.description}</p>
                            </div>
                            <div className="flex flex-col gap-1 sm:flex-row flex-shrink-0">
                              <button
                                onClick={() => handleStartWorkIssue(issue.id)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                Start Work
                              </button>
                              <button
                                onClick={() => handleResolveIssueDirectly(issue.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleTakeIssue(issue.id)}
                                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                Claim
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Unassigned Maintenance Tasks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800/80 pb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-blue-500" />
                        Maintenance Tasks ({unassignedTasks.length})
                      </span>
                    </div>
                    {unassignedTasks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400 italic">No unassigned tasks.</div>
                    ) : (
                      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                        {unassignedTasks.map(task => (
                          <div key={task.id} className="p-3 bg-white dark:bg-slate-900/80 border border-gray-100 dark:border-slate-800 rounded-2xl hover:border-amber-400 hover:scale-[1.01] transition-all duration-200 flex items-start justify-between gap-3 shadow-xs">
                            <div 
                              onClick={() => navigate('/tasks', { state: { scrollToId: task.id } })}
                              className="min-w-0 flex-1 cursor-pointer group/item hover:opacity-80 transition-all"
                              title="Click to view task details"
                            >
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  {task.category || 'Maint'}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400">Due: {task.dueDate}</span>
                              </div>
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{task.title}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{task.description}</p>
                            </div>
                            <div className="flex flex-col gap-1 sm:flex-row flex-shrink-0">
                              <button
                                onClick={() => handleCompleteTaskDirectly(task.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleTakeTask(task.id)}
                                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                              >
                                Claim
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Left: My Work Queue */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Assigned Issues</h3>
                  <button onClick={() => setActiveTab('Issues')} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">Manage Here</button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myAssignedIssues.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs italic">No issues currently assigned to you.</div>
                  ) : (
                    myAssignedIssues.slice(0, 5).map(issue => (
                      <div 
                        key={issue.id} 
                        onClick={() => navigate('/issues', { state: { scrollToId: issue.id } })}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer group"
                        title="Click to view ticket details"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                            issue.priority === 'High' ? 'bg-red-600 text-white' : issue.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                          )}>
                            {issue.priority} Priority
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 font-mono">{issue.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{issue.category || 'General Support'}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{issue.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Maintenance Schedule</h3>
                  <button onClick={() => setActiveTab('Tasks')} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">Manage Here</button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myAssignedTasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs italic">No maintenance tasks assigned.</div>
                  ) : (
                    myAssignedTasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => navigate('/tasks', { state: { scrollToId: task.id } })}
                        className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors cursor-pointer group"
                        title="Click to view task details"
                      >
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">Due: {task.dueDate}</p>
                        </div>
                        <div className={clsx(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                          task.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        )}>
                          {task.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Personal Efficiency */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6" />
                  Efficiency Checklist
                </h3>
                <div className="space-y-3">
                  {myToDos.slice(0, 5).map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                      <div className={clsx(
                        "w-4 h-4 rounded-full border-2",
                        todo.completed ? "bg-green-400 border-green-400" : "border-white/40"
                      )} />
                      <span className={clsx("text-sm font-medium", todo.completed && "line-through opacity-50")}>{todo.title}</span>
                    </div>
                  ))}
                  {myToDos.length === 0 && <p className="text-indigo-200 text-sm italic">Clear to-do list!</p>}
                </div>
                <button 
                  onClick={() => navigate('/todos')}
                  className="w-full mt-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                  Manage To-Dos
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Recent Private Notes
                </h3>
                <div className="space-y-4">
                  {myNotes.slice(0, 3).map(note => (
                    <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">{note.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{note.content}</p>
                    </div>
                  ))}
                  {myNotes.length === 0 && <p className="text-center py-4 text-xs text-gray-400 italic">No private notes.</p>}
                  <button 
                    onClick={() => setActiveTab('MyNotes')}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 text-center"
                  >
                    View Notes Tab
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'Tasks' && (
           <motion.div
            key="tasks_tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
           >
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Assigned tasks */}
               <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                     <Wrench className="w-4 h-4 text-blue-500" />
                     Your Assigned Maintenance ({myAssignedTasks.length})
                   </h3>
                 </div>
                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                   {myAssignedTasks.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 text-xs italic">No safety audits or maintenance checklists assigned to you. Raise one from the master calendar!</div>
                   ) : (
                     myAssignedTasks.map(task => (
                       <div key={task.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="space-y-1">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due {task.dueDate}</span>
                             <span className={clsx(
                               "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                               task.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                             )}>
                               {task.status}
                             </span>
                           </div>
                           <h4 className="text-sm font-bold text-gray-900 dark:text-white">{task.title}</h4>
                           <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">{task.description}</p>
                         </div>
                         <div className="flex items-center gap-2">
                           {task.status !== 'Done' ? (
                             <button
                               onClick={async () => {
                                 await updateTask(task.id, { status: 'Done' });
                                 addNotification('Maintenance task finished successfully!', 'success');
                               }}
                               className="px-3 py-1.5 bg-green-600 hover:bg-green-750 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                             >
                               <Check className="w-3.5 h-3.5" />
                               Complete
                             </button>
                           ) : (
                             <button
                               onClick={async () => {
                                 await updateTask(task.id, { status: 'Open' });
                               }}
                               className="px-3 py-1.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                             >
                               Reopen
                             </button>
                           )}
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>

               {/* Available/Unassigned Tasks */}
               <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                     <Monitor className="w-4 h-4 text-amber-500" />
                     Available Maintenance Orders Pool ({unassignedTasks.length})
                   </h3>
                 </div>
                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                   {unassignedTasks.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 text-xs italic">No unassigned maintenance schedules available. Any technician can claim newly raised ones!</div>
                   ) : (
                     unassignedTasks.map(task => (
                       <div key={task.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all flex items-start justify-between gap-4">
                         <div className="space-y-1">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-gray-400">Due: {task.dueDate}</span>
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                               {task.category || 'Maintenance'}
                             </span>
                           </div>
                           <h4 className="text-sm font-bold text-gray-900 dark:text-white">{task.title}</h4>
                           <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{task.description}</p>
                         </div>
                          <div className="flex flex-col gap-1 sm:flex-row flex-shrink-0">
                            <button
                              onClick={() => handleCompleteTaskDirectly(task.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleTakeTask(task.id)}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-750 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Claim
                            </button>
                          </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             </div>

             <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                 <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Need a comprehensive planning tool?</h4>
                 <p className="text-xs text-gray-500">Go to the master Maintenance module for visual calendar, bulk exports, search, logging diagnostics and creating a schedule.</p>
               </div>
               <button 
                 onClick={() => navigate('/tasks')}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] tracking-widest shadow-md transition-all flex-shrink-0 cursor-pointer"
               >
                 Open Master Module
               </button>
             </div>
           </motion.div>
        )}

        {activeTab === 'Issues' && (
           <motion.div
            key="issues_tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
           >
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Assigned Issues */}
               <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-red-500" />
                     Your Assigned Support Tickets ({myAssignedIssues.length})
                   </h3>
                 </div>
                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                   {myAssignedIssues.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 text-xs italic">No support tickets are currently assigned to your desk. Select available ones on the right!</div>
                   ) : (
                     myAssignedIssues.map(issue => (
                       <div key={issue.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all">
                         <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                           <span className={clsx(
                             "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                             issue.priority === 'High' ? 'bg-red-500 text-white' : issue.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                           )}>
                             {issue.priority} Priority
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 font-mono">{issue.date}</span>
                         </div>
                         <div onClick={() => navigate('/issues', { state: { scrollToId: issue.id } })} className="cursor-pointer group/item hover:opacity-80 transition-all inline-block" title="Click to view ticket details">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{issue.category || 'General Issue'}</h4>
                          </div>
                         <p className="text-xs text-gray-500 dark:text-gray-450 mt-1 mb-4">{issue.description}</p>
                         
                         <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3 flex-wrap gap-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-400 uppercase font-bold">Status:</span>
                             <span className={clsx(
                               "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                               issue.status === 'Open' ? 'bg-red-100 text-red-600' :
                               issue.status === 'In Progress' ? 'bg-blue-105 text-blue-600' : 'bg-green-100 text-green-700'
                             )}>
                               {issue.status}
                             </span>
                           </div>
                           
                           <div className="flex gap-2">
                             {issue.status !== 'In Progress' && issue.status !== 'Resolved' && (
                               <button
                                 onClick={async () => {
                                   await updateIssue(issue.id, { status: 'In Progress' });
                                   addNotification("Ticket shifted to 'In Progress'", 'success');
                                 }}
                                 className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                               >
                                 Start Work
                               </button>
                             )}
                             {issue.status !== 'Resolved' && (
                               <button
                                 onClick={async () => {
                                   const note = prompt("Please enter resolution details before closing:") || "";
                                   await updateIssue(issue.id, { status: 'Resolved', resolutionNote: note });
                                   addNotification("Ticket marked as Resolved and closed!", 'success');
                                 }}
                                 className="px-2.5 py-1.5 bg-green-600 hover:bg-green-750 text-white font-bold rounded-xl text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                               >
                                 Resolve Ticket
                               </button>
                             )}
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>

               {/* Available/Unassigned support tickets */}
               <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-orange-500" />
                     Available Support Tickets Pool ({unassignedIssues.length})
                   </h3>
                 </div>
                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                   {unassignedIssues.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 text-xs italic">No unassigned support tickets are in queue. Well done, workforce is fully optimized!</div>
                   ) : (
                     unassignedIssues.map(issue => (
                       <div key={issue.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all flex items-start justify-between gap-4">
                         <div className="space-y-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-[10px] font-bold text-gray-400 font-mono">{issue.date}</span>
                             <span className={clsx(
                               "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight",
                               issue.priority === 'High' ? 'bg-red-500 text-white' : issue.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                             )}>
                               {issue.priority}
                             </span>
                           </div>
                           <div onClick={() => navigate('/issues', { state: { scrollToId: issue.id } })} className="cursor-pointer group/item hover:opacity-80 transition-all inline-block" title="Click to view ticket details">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{issue.category || 'General Support'}</h4>
                          </div>
                           <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{issue.description}</p>
                         </div>
                          <div className="flex flex-col gap-1 sm:flex-row flex-shrink-0">
                            <button
                              onClick={() => handleStartWorkIssue(issue.id)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Start Work
                            </button>
                            <button
                              onClick={() => handleResolveIssueDirectly(issue.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleTakeIssue(issue.id)}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-750 text-white font-black rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Claim
                            </button>
                          </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             </div>

             <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                 <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Need granular ticket tracking controls?</h4>
                 <p className="text-xs text-gray-500">Go to the master Helpdesk Support Ticket Center to access detailed filters, asset histories, communications threads, and generate service reports.</p>
               </div>
               <button 
                 onClick={() => navigate('/issues')}
                 className="bg-red-650 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] tracking-widest shadow-md transition-all flex-shrink-0 cursor-pointer"
               >
                 Open Master Helpdesk
               </button>
             </div>
           </motion.div>
        )}

        {activeTab === 'MyNotes' && (
           <motion.div
            key="notes_tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
           >
             <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 text-center space-y-4">
                <FileText className="w-16 h-16 text-indigo-100 dark:text-indigo-900 mx-auto" />
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Private Technician Notes</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">Your notes are strictly private and can only be seen by you.</p>
                <button 
                  onClick={() => navigate('/notes')}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Go to Notes
                </button>
             </div>
           </motion.div>
        )}

        {activeTab === 'Activity' && (
           <motion.div
            key="activity_tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
           >
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search your activity..." 
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

             <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Your Recent Activity</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myLogs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-xs italic">No activity recorded yet for your account.</div>
                  ) : (
                    myLogs.map(log => (
                      <div key={log.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                        <div className="mt-1">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{log.action}</h4>
                            <span className="text-[10px] text-gray-400 font-mono">{safeFormatAndParse(log.timestamp, 'MMM dd, HH:mm')}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{log.details}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
