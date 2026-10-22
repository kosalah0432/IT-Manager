import React, { useState } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { 
  Star, MessageSquare, Monitor, AlertCircle, Clock, 
  CheckCircle2, Plus, Image as ImageIcon, X, LayoutDashboard,
  ShieldAlert, HardDrive, Smartphone, HelpCircle, ArrowRight,
  CheckSquare, Info, User, Search, Database, Shield, Wrench, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '../utils/image';

import Modal from '../components/Modal';

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

const CATEGORIES = [
  'General IT Support',
  'Hardware Issue',
  'Software/App Issue',
  'Network/Internet',
  'Email/Office 365',
  'Printer/Scanner',
  'Password/Access',
  'Mobile Device',
  'New Software Request'
];

export default function UserPortal() {
  const navigate = useNavigate();
  const { currentUser, issues, assets, tasks, assetTypes, procedures, toDos, users, locations, addIssue, updateIssueFeedback } = useStore();
  const [feedbackIssueId, setFeedbackIssueId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const initialIssueData = {
    description: '',
    assetId: '',
    category: CATEGORIES[0],
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    image: ''
  };

  const {
    formData: issueForm,
    updateForm: updateIssueForm,
    resetForm: resetIssueForm,
    clearPersistence: clearIssuePersistence,
    isDirty: isIssueDirty
  } = useFormPersistence('user_report_issue', initialIssueData, isReporting);

  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<any>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Tickets' | 'Knowledge'>('Dashboard');
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
  
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  
  const today = format(new Date(), 'yyyy-MM-dd');

  if (!currentUser) return null;

  // Include issues reported by user OR related to their assets (even if reported by technician/maintenance)
  const myIssues = (issues || []).filter(i => 
    i.reportedByUserId === currentUser.id || 
    (i.assetId && assets.some(a => a.id === i.assetId && a.userId === currentUser.id))
  );
  
  const myAssets = (assets || []).filter(a => a.userId === currentUser.id);
  const filteredAssets = myAssets.filter(a => 
    a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    (a.tag || '').toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    (a.modelName || '').toLowerCase().includes(assetSearchQuery.toLowerCase())
  );
  const myToDos = (toDos || []).filter(t => t.userId === currentUser.id || (t.assetId && myAssets.some(a => a.id === t.assetId)));
  const myTasks = (tasks || []).filter(t => t.assignedToUserId === currentUser.id || t.userId === currentUser.id);
  const publicProcedures = (procedures || []).filter(p => p.isPublic);

  const filteredProcedures = publicProcedures.filter(p => 
    p.title.toLowerCase().includes(kbSearchQuery.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(kbSearchQuery.toLowerCase())
  );

  const unfilteredMyTickets = [
    ...myIssues.map(i => ({ ...i, type: 'Issue' })),
    ...myTasks.map(t => ({ ...t, type: 'Maintenance' }))
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const myTickets = unfilteredMyTickets.filter(item => {
    if (ticketFilter === 'All') return true;
    if (ticketFilter === 'Resolved') return item.status === 'Resolved' || item.status === 'Done';
    return item.status === ticketFilter;
  });

  const stats = {
    total: myIssues.length + myTasks.length,
    open: myIssues.filter(i => i.status === 'Open').length + myTasks.filter(t => t.status === 'Open').length,
    inProgress: myIssues.filter(i => i.status === 'In Progress').length + myTasks.filter(t => t.status === 'In Progress').length,
    resolved: myIssues.filter(i => i.status === 'Resolved').length + myTasks.filter(t => t.status === 'Done').length,
    assets: myAssets.length,
    kb: publicProcedures.length,
    pendingFeedback: myIssues.filter(i => i.status === 'Resolved' && (!i.feedback || Object.keys(i.feedback).length === 0)).length
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let result = reader.result as string;
        try {
          result = await compressImage(result);
          updateIssueForm({ image: result });
        } catch (err) {
          console.error('Compression failed:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.description.trim()) return;
    
    await addIssue({
      date: today,
      type: 'User',
      reportedByUserId: currentUser.id,
      assetId: issueForm.assetId || undefined,
      description: issueForm.description.trim(),
      status: 'Open',
      category: issueForm.category,
      priority: issueForm.priority,
      image: issueForm.image || undefined
    });
    
    clearIssuePersistence();
    resetIssueForm();
    setIsReporting(false);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackIssueId) return;
    updateIssueFeedback(feedbackIssueId, { rating, comment });
    setFeedbackIssueId(null);
    setRating(5);
    setComment('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 p-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            My IT Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {currentUser.name}. Manage your devices and support tickets here.
          </p>
        </div>
        <button 
          onClick={() => setIsReporting(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Report New Issue
        </button>
      </header>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('Dashboard')}
          className={clsx(
            "px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2",
            activeTab === 'Dashboard' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('Tickets')}
          className={clsx(
            "px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2",
            activeTab === 'Tickets' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Tickets (Issues)
        </button>
        <button
          onClick={() => setActiveTab('Knowledge')}
          className={clsx(
            "px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2",
            activeTab === 'Knowledge' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Knowledge Base (Procedures)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-8"
          >
            {/* Pending Feedback Banner */}
            {stats.pendingFeedback > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white/20 rounded-2xl">
                     <Star className="w-8 h-8 fill-current text-white animate-pulse" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">Help us improve IT!</h3>
                     <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mt-1">You have {stats.pendingFeedback} resolved tickets awaiting your feedback.</p>
                   </div>
                </div>
                <button 
                  onClick={() => setActiveTab('Tickets')}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all shadow-lg"
                >
                  Rate Services Now
                </button>
              </motion.div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: 'Assigned Assets', val: stats.assets, color: 'indigo', icon: Monitor, status: 'Assets' },
                { label: 'Total Tickets', val: stats.total, color: 'indigo', icon: MessageSquare, status: 'All' },
                { label: 'Open', val: stats.open, color: 'red', icon: AlertCircle, status: 'Open' },
                { label: 'In Progress', val: stats.inProgress, color: 'blue', icon: Clock, status: 'In Progress' },
                { label: 'Resolved', val: stats.resolved, color: 'green', icon: CheckCircle2, status: 'Resolved' },
                { label: 'Guides', val: stats.kb, color: 'purple', icon: HelpCircle, status: 'Knowledge' },
              ].map((item) => (
                <button 
                  key={item.label} 
                  onClick={() => {
                    if (item.status === 'Assets') {
                      setActiveTab('Dashboard');
                      setTimeout(() => {
                        document.getElementById('my-assets')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else if (item.status === 'Knowledge') {
                      setActiveTab('Knowledge');
                    } else {
                      setTicketFilter(item.status as any);
                      setActiveTab('Tickets');
                    }
                  }}
                  className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-400 transition-all text-left group cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={clsx(
                      "p-2 rounded-lg",
                      item.color === 'indigo' && "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                      item.color === 'red' && "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                      item.color === 'blue' && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                      item.color === 'green' && "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                      item.color === 'purple' && "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.val}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content: Tickets Summary */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Tickets</h2>
                    <button 
                      onClick={() => setActiveTab('Tickets')}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      View All Tickets
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(myIssues || []).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).map(issue => (
                      <div key={issue.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors flex items-start gap-4">
                        <div className={clsx(
                          "p-2 rounded-xl flex-shrink-0",
                          issue.status === 'Resolved' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                          issue.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                          'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        )}>
                          {issue.status === 'Resolved' ? <CheckCircle2 className="w-5 h-5" /> : 
                           issue.status === 'In Progress' ? <Clock className="w-5 h-5" /> : 
                           <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{issue.date}</span>
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              issue.priority === 'High' ? 'text-red-600' : issue.priority === 'Medium' ? 'text-amber-600' : 'text-blue-600'
                            )}>
                              {issue.priority} Priority
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{issue.category || 'General IT'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                    {(myIssues || []).length === 0 && (
                      <div className="p-12 text-center text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No tickets reported yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Dashboard widgets could go here */}
              </div>

              {/* Sidebar: Profile & Assets */}
              <div className="space-y-6" id="my-assets">
                {/* My Profile summary */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      My Profile
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                        {currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{currentUser.name}</h3>
                        <p className="text-xs text-gray-500">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 font-medium font-bold uppercase tracking-widest text-[9px]">Account Role</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser.role}</span>
                      </div>
                      {myAssets[0]?.locationId && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400 font-medium font-bold uppercase tracking-widest text-[9px]">Assigned Office</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300">
                            {locations.find(l => l.id === myAssets[0].locationId)?.name || 'Main Office'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-indigo-600" />
                      My Devices
                    </h2>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        className="pl-7 pr-2 py-1 text-[10px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                        value={assetSearchQuery}
                        onChange={e => setAssetSearchQuery(e.target.value)}
                      />
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {filteredAssets.map(asset => (
                      <div key={asset.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            {(asset.image && asset.image !== "") ? (
                              <img src={asset.image} className="w-5 h-5 object-cover rounded" referrerPolicy="no-referrer" />
                            ) : asset.name.toLowerCase().includes('phone') ? <Smartphone className="w-5 h-5" /> : 
                             asset.name.toLowerCase().includes('laptop') || asset.name.toLowerCase().includes('pc') ? <Monitor className="w-5 h-5" /> :
                             <HardDrive className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{asset.name}</h4>
                            <p className="text-[10px] text-gray-500 font-mono">{asset.tag || 'NO TAG'}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-medium">{asset.modelName}</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedAssetForDetails(asset)}
                              className="text-indigo-600 hover:underline font-bold uppercase tracking-widest text-[9px]"
                            >
                              Details
                            </button>
                            <span className={clsx(
                              "px-2 py-0.5 rounded font-bold uppercase tracking-widest",
                              asset.status === 'In Use' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                            )}>{asset.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(myAssets || []).length === 0 && (
                      <p className="text-center py-8 text-xs text-gray-500 italic">No devices assigned to you.</p>
                    )}
                  </div>
                </div>

                {/* To-Dos & Tasks widget */}
                {(myToDos.length > 0 || myTasks.length > 0) && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                        My Tasks & Maintenance
                      </h2>
                    </div>
                    <div className="p-4 space-y-2">
                      {/* Combine and sort tasks/todos */}
                      {[
                        ...myToDos.map(t => ({ ...t, type: 'to-do' })),
                        ...myTasks.map(t => ({ ...t, type: 'maintenance' }))
                      ].sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 8).map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 text-xs group">
                          <div className={clsx(
                            "w-2 h-2 rounded-full",
                            item.completed || item.status === 'Done' ? "bg-green-500" : "bg-amber-400"
                          )} />
                          <div className="flex-1">
                            <span className={clsx("font-semibold block", (item.completed || item.status === 'Done') && "line-through text-gray-400")}>{item.title}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.type}</span>
                          </div>
                          {item.dueDate && <span className="text-[10px] text-gray-400 font-mono">{item.dueDate}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Help */}
                <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-lg shadow-indigo-200 dark:shadow-none">
                  <HelpCircle className="w-8 h-8 mb-4 opacity-50" />
                  <h3 className="text-lg font-bold mb-2">Need Help?</h3>
                  <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                    If you have urgent issues, please call extension 102 or report a high-priority ticket.
                  </p>
                  <button 
                     onClick={() => setIsReporting(true)}
                     className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-md"
                  >
                    Contact IT Support
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'Tickets' ? (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-950/20">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">Support & Maintenance</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">History of your service requests</p>
                </div>
                <button 
                  onClick={() => setIsReporting(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  New Request
                </button>
              </div>
              
              {/* Ticket Sub-Filters Category Selector */}
              <div className="px-8 py-3 bg-gray-50/20 dark:bg-slate-950/10 border-b border-gray-100 dark:border-slate-800 flex flex-wrap gap-2">
                {(['All', 'Open', 'In Progress', 'Resolved'] as const).map(filter => {
                  const count = filter === 'All' ? unfilteredMyTickets.length :
                                filter === 'Open' ? unfilteredMyTickets.filter(t => t.status === 'Open').length :
                                filter === 'In Progress' ? unfilteredMyTickets.filter(t => t.status === 'In Progress').length :
                                unfilteredMyTickets.filter(t => t.status === 'Resolved' || t.status === 'Done').length;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTicketFilter(filter)}
                      className={clsx(
                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                        ticketFilter === filter
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-705"
                      )}
                    >
                      {filter} ({count})
                    </button>
                  );
                })}
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {myTickets.length === 0 ? (
                  <div className="p-20 text-center text-gray-400">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-tight text-gray-300 dark:text-slate-700">All Systems Normal</p>
                    <p className="text-sm mt-1 font-medium">No support or maintenance tickets found.</p>
                  </div>
                ) : (
                  myTickets.map((item: any) => (
                    <div key={`${item.type}-${item.id}`} className="p-8 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all flex items-start gap-8 group">
                      <div className={clsx(
                        "p-4 rounded-2xl flex-shrink-0 shadow-sm border",
                        item.status === 'Resolved' || item.status === 'Done' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30' :
                        item.status === 'In Progress' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' :
                        'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                      )}>
                        {item.status === 'Resolved' || item.status === 'Done' ? <CheckCircle2 className="w-7 h-7" /> : 
                         item.status === 'In Progress' ? <Clock className="w-7 h-7" /> : 
                         <AlertCircle className="w-7 h-7" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{item.date || item.dueDate || safeFormatAndParse(item.createdAt || Date.now(), 'yyyy-MM-dd')}</span>
                            <span className={clsx(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                              item.priority === 'High' ? 'bg-red-600 text-white shadow-sm shadow-red-200' : 
                              item.priority === 'Medium' ? 'bg-amber-500 text-white' : 
                              'bg-indigo-100 text-indigo-700'
                            )}>
                              {item.priority || 'Normal'}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                              {item.type}
                            </span>
                          </div>
                          <div className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            item.status === 'Resolved' || item.status === 'Done' ? 'bg-green-100 border-green-200 text-green-800' :
                            item.status === 'In Progress' ? 'bg-indigo-100 border-indigo-200 text-indigo-800' : 'bg-red-100 border-red-200 text-red-800'
                          )}>
                            {item.status}
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {item.title || item.category || 'General Maintenance'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-4">{item.description}</p>
                        
                        {(item.resolutionNote || item.notes) && (
                          <div className="p-5 bg-gray-50 dark:bg-slate-950/40 rounded-2xl border border-gray-100 dark:border-slate-800 mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <MessageSquare className="w-3 h-3" /> IT Staff Comments
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic font-medium">"{item.resolutionNote || item.notes}"</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800/50">
                          <div className="flex items-center gap-6">
                            {item.assetId && (
                              <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-gray-300" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  {assets.find(a => a.id === item.assetId)?.name || 'Linked Asset'}
                                </span>
                              </div>
                            )}
                            {item.assignedToUserId && (
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-gray-300" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  Done by: <span className="text-indigo-600 dark:text-indigo-400">{users.find(u => u.id === item.assignedToUserId)?.name || 'Technician'}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            {(item.status === 'Resolved' || item.status === 'Done') && !item.feedback && item.type === 'Issue' && (
                              <button 
                                onClick={() => setFeedbackIssueId(item.id)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2"
                              >
                                <Star className="w-4 h-4 fill-current text-yellow-500" />
                                Rate Service
                              </button>
                            )}
                            
                            {item.feedback && (
                              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-950/20 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-800">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Your Feedback:</span>
                                <div className="flex items-center gap-0.5 text-yellow-400">
                                   {[...Array(5)].map((_, idx) => (
                                     <Star key={idx} className={clsx("w-3.5 h-3.5", idx < (item.feedback?.rating || 0) ? "fill-current shadow-sm" : "text-gray-200 dark:text-slate-800")} />
                                   ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Base</h2>
              <div className="relative w-full md:w-64">
                <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search guides..." 
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={kbSearchQuery}
                  onChange={e => setKbSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProcedures.map(proc => (
                <div 
                  key={proc.id} 
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-indigo-300 transition-all group flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase rounded">
                        {proc.category || 'General'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
                      {proc.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">
                      {proc.description || 'Step-by-step guide and troubleshooting instructions.'}
                    </p>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => setSelectedProcedure(proc)}
                      className="w-full py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      Read Full Guide <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredProcedures.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-lg font-medium">No guides found match your search.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Issue Modal */}
      <Modal
        isOpen={isReporting}
        onClose={() => setIsReporting(false)}
        title="New Support Ticket"
        maxWidth="max-w-2xl"
      >
        <p className="text-gray-500 text-sm mb-6">Please provide details about the issue.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
              <select 
                required
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 bg-white" 
                value={issueForm.category} 
                onChange={e => updateIssueForm({ category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 bg-white" 
                value={issueForm.priority} 
                onChange={e => updateIssueForm({ priority: e.target.value as any })}
              >
                <option value="Low">Low - Not Urgent</option>
                <option value="Medium">Medium - Normal</option>
                <option value="High">High - Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Affected Device (Optional)</label>
            <select 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 bg-white" 
              value={issueForm.assetId} 
              onChange={e => updateIssueForm({ assetId: e.target.value })}
            >
              <option value="">No specific device</option>
              {(myAssets || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea 
              required 
              rows={4} 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={issueForm.description} 
              onChange={e => updateIssueForm({ description: e.target.value })} 
              placeholder="Provide details about the issue..."
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Attach Screenshot (Optional)</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                 <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                 <span className="text-xs text-gray-500 font-medium">{issueForm.image ? 'Image Selected' : 'Click to upload screenshot'}</span>
                 <input 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   onChange={handleImageUpload}
                 />
              </label>
              {issueForm.image && (
                <div className="relative">
                  {issueForm.image && (
                    <img src={issueForm.image} className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                  )}
                  <button 
                    onClick={() => updateIssueForm({ image: '' })}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {isIssueDirty && (
              <button 
                type="button"
                onClick={resetIssueForm}
                className="text-[10px] font-black text-red-500 uppercase flex items-center justify-center gap-1 hover:text-red-700"
              >
                <Clock className="w-3 h-3" /> Clear Draft
              </button>
            )}
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setIsReporting(false)}
                className="flex-1 py-4 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none">
                Submit Support Ticket
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        isOpen={!!feedbackIssueId}
        onClose={() => setFeedbackIssueId(null)}
        title="Rate our service"
        maxWidth="max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <Star className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-gray-500 text-sm mt-1">Your feedback helps us improve IT support.</p>
        </div>

        <form onSubmit={handleFeedbackSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                type="button" 
                onClick={() => setRating(star)}
                className={clsx(
                  "transition-transform hover:scale-125 focus:outline-none",
                  star <= rating ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"
                )}
              >
                <Star className={clsx("w-10 h-10", star <= rating && "fill-current")} />
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Comment (Optional)</label>
            <textarea 
              rows={3} 
              className="w-full rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              placeholder="How can we do better?"
            />
          </div>
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={() => setFeedbackIssueId(null)}
              className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-widest"
            >
              Skip
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-transform active:scale-95"
            >
              Send Feedback
            </button>
          </div>
        </form>
      </Modal>

      {/* Asset Details Modal */}
      <Modal
        isOpen={!!selectedAssetForDetails}
        onClose={() => setSelectedAssetForDetails(null)}
        title={selectedAssetForDetails?.name || 'Asset Details'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-6 font-sans">
          {selectedAssetForDetails && (
            <>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  {(selectedAssetForDetails.image && selectedAssetForDetails.image !== "") ? (
                    <img src={selectedAssetForDetails.image} className="w-5 h-5 object-cover rounded" referrerPolicy="no-referrer" />
                  ) : selectedAssetForDetails.name.toLowerCase().includes('phone') ? <Smartphone className="w-5 h-5 text-indigo-600" /> : 
                   selectedAssetForDetails.name.toLowerCase().includes('laptop') || selectedAssetForDetails.name.toLowerCase().includes('pc') ? <Monitor className="w-5 h-5 text-indigo-600" /> :
                   <HardDrive className="w-5 h-5 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedAssetForDetails.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedAssetForDetails.tag}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={clsx(
                    "px-2 py-1 rounded-full font-bold",
                    selectedAssetForDetails.status === 'In Use' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>{selectedAssetForDetails.status}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Model</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedAssetForDetails.modelName}</p>
                </div>
                {selectedAssetForDetails.ipAddress && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">IP Address</p>
                    <p className="font-mono text-indigo-600 dark:text-indigo-400">{selectedAssetForDetails.ipAddress}</p>
                  </div>
                )}
                {selectedAssetForDetails.serialNumber && (
                   <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Serial S/N</p>
                    <p className="font-mono">{selectedAssetForDetails.serialNumber}</p>
                  </div>
                )}
              </div>

              {(() => {
                const type = assetTypes.find(t => t.id === selectedAssetForDetails.typeId);
                const visibleCustomFields = (type?.customFields || []).filter(f => f.visibleToUser);
                
                if (visibleCustomFields.length === 0) return null;

                return (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Technical Specifications</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {visibleCustomFields.map(field => (
                        <div key={field.id}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{field.name}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {selectedAssetForDetails.specs?.[field.id] || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setSelectedAssetForDetails(null)}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Procedure Details Modal */}
      <Modal
        isOpen={!!selectedProcedure}
        onClose={() => setSelectedProcedure(null)}
        title={selectedProcedure?.title || 'Procedure'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          {selectedProcedure && (
            <>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed">
                  {selectedProcedure.description}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Steps to Follow</h4>
                <div className="space-y-3">
                  {(selectedProcedure.steps || []).map((step: any, index: number) => (
                    <div key={step.id} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="space-y-3 flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{step.text}</p>
                        {step.image && (
                          <img src={step.image} className="w-full max-h-64 object-contain rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProcedure.troubleshooting && selectedProcedure.troubleshooting.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Troubleshooting
                  </h4>
                  <div className="space-y-4">
                     {selectedProcedure.troubleshooting.map((t: any, i: number) => (
                       <div key={i} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                          <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-2">Issue: {t.error}</p>
                          <div className="space-y-2 ml-4">
                            {(t.fixes || []).map((fix: any, fi: number) => (
                              <div key={fi} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                <p className="text-xs text-red-800 dark:text-red-200">{fix.text}</p>
                              </div>
                            ))}
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {selectedProcedure.additionalNotes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <h5 className="text-[10px] font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Note
                  </h5>
                  <p className="text-xs text-amber-800 dark:text-amber-200 italic">{selectedProcedure.additionalNotes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setSelectedProcedure(null)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
