import { useStore } from '../store';
import { useEffect, useState } from 'react';
import { 
  isBefore, isAfter, addDays, parseISO, startOfMonth, endOfMonth, isWithinInterval, 
  isSameDay, isSameWeek, isSameMonth, differenceInDays, startOfDay, format,
  parse, subHours, subMonths, eachMonthOfInterval, subDays, subWeeks
} from 'date-fns';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { 
  CheckCircle2, AlertCircle, Clock, XCircle, CheckSquare,
  Calendar, Database, ListTodo, Activity, Shield, Settings,
  ArrowRight, Bell, Info, ExternalLink, TrendingUp, DollarSign,
  Plus, UserPlus, FileText, Wrench, ShieldAlert, PieChart as PieIcon, Star,
  Search, X
} from 'lucide-react';
import { Frequency, OfficeHours, Asset, User, Issue } from '../types';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import AlertsCenter from '../components/AlertsCenter';

// Robust, exception-safe date helper utilities
const safeStartOfDay = (date: any): Date => {
  if (!date) return new Date(NaN);
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return startOfDay(d);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeFormat = (date: any, formatStr: string, fallback = ''): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

const safeIsSameDay = (d1: any, d2: any): boolean => {
  try {
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return isSameDay(a, b);
  } catch (e) {
    return false;
  }
};

const safeIsSameWeek = (d1: any, d2: any): boolean => {
  try {
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return isSameWeek(a, b, { weekStartsOn: 1 });
  } catch (e) {
    return false;
  }
};

const safeIsSameMonth = (d1: any, d2: any): boolean => {
  try {
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return isSameMonth(a, b);
  } catch (e) {
    return false;
  }
};

const safeIsBefore = (d1: any, d2: any): boolean => {
  try {
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return isBefore(a, b);
  } catch (e) {
    return false;
  }
};

const safeIsAfter = (d1: any, d2: any): boolean => {
  try {
    const a = new Date(d1);
    const b = new Date(d2);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return isAfter(a, b);
  } catch (e) {
    return false;
  }
};

const safeSubDays = (date: any, amount: number): Date => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return subDays(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeSubWeeks = (date: any, amount: number): Date => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return subWeeks(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeSubMonths = (date: any, amount: number): Date => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return subMonths(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeSubHours = (date: any, amount: number): Date => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return subHours(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeAddDays = (date: any, amount: number): Date => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    return addDays(d, amount);
  } catch (e) {
    return new Date(NaN);
  }
};

const safeParseISO = (str: any): Date => {
  if (!str) return new Date(NaN);
  try {
    const d = parseISO(str);
    return isNaN(d.getTime()) ? new Date(NaN) : d;
  } catch (e) {
    return new Date(NaN);
  }
};

const safeParseTime = (timeStr: string | null | undefined, referenceDate: Date): Date => {
  if (!timeStr) return new Date(NaN);
  try {
    const d = parse(timeStr, 'HH:mm', referenceDate);
    return isNaN(d.getTime()) ? new Date(NaN) : d;
  } catch (e) {
    return new Date(NaN);
  }
};

const safeIsWithinInterval = (date: any, interval: { start: any; end: any }): boolean => {
  try {
    const d = new Date(date);
    const start = new Date(interval.start);
    const end = new Date(interval.end);
    if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    return isWithinInterval(d, { start, end });
  } catch (e) {
    return false;
  }
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    currentUser,
    assets, checkups, tasks, softwareWarranties, issues, toDos, holidays, users,
    backups, updates, systemChecks, servers, securityItems, dismissAlert,
    officeHours, settings, fetchData, locations, assetTypes
  } = useStore();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'assets' | 'users' | 'issues'>('all');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const handleManualRefresh = async () => {
    await fetchData();
    setLastRefreshedAt(new Date());
  };
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (currentUser?.role === 'User') {
      navigate('/portal');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Keep the entire dashboard synchronized with automatic background updates
    const interval = setInterval(() => {
      fetchData().then(() => {
        setLastRefreshedAt(new Date());
      }).catch(err => console.error("Periodic sync failed", err));
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Helper to check if a checkup is current based on user's specific reset rules
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
      return { status: 'Pending', label: 'Never Done', isMissed: true, isDue: true };
    }

    const current = isCurrent(latest.date, frequency);
    if (current) {
      return { status: latest.status, label: latest.status, isMissed: false, isDue: false };
    }

    // Check if it was missed in the PREVIOUS period
    let wasMissed = false;
    let isDue = true; // If not current, it's due
    const lastDate = new Date(latest.date);

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

    return { 
      status: 'Pending', 
      label: wasMissed ? 'Missed Checkup' : 'Due Today', 
      isMissed: wasMissed, 
      isDue: isDue 
    };
  };

  // Office Hours Alert
  const closingTime = officeHours?.enabled && officeHours?.close ? safeParseTime(officeHours.close, today) : null;
  const isNearClosing = closingTime && !isNaN(closingTime.getTime()) && safeIsBefore(safeSubHours(closingTime, 1), today) && safeIsBefore(today, closingTime);
  const pendingCount = (issues || []).filter(i => i.status !== 'Resolved').length + 
                       (tasks || []).filter(t => t.status !== 'Done').length +
                       (toDos || []).filter(t => !t.completed).length;

  // Calculate urgent work
  const allDefinitions = [
    ...(backups || []).map(b => ({ ...b, category: 'Backup' })),
    ...(updates || []).map(u => ({ ...u, category: 'Update' })),
    ...(systemChecks || []).map(s => ({ ...s, category: 'System Check' })),
    ...(servers || []).map(s => ({ ...s, category: 'Server Check' })),
    ...(securityItems || []).map(s => ({ ...s, category: 'Security' }))
  ];

  const urgentCheckups = (allDefinitions || []).filter(def => {
    const info = getCheckupStatusInfo(def.id, def.frequency as Frequency);
    return info.isDue || info.isMissed;
  });

  const urgentWorkCount = urgentCheckups.length;

  // Today's Works - Including overdue items as they still need attention today
  const overdueTasks = (tasks || []).filter(t => !['Done', 'Resolved'].includes(t.status) && t.dueDate && safeIsBefore(safeParseISO(t.dueDate), safeStartOfDay(today)));
  const todayTasks = (tasks || []).filter(t => !['Done', 'Resolved'].includes(t.status) && t.dueDate === todayStr);

  const overdueToDos = (toDos || []).filter(t => !t.completed && t.dueDate && safeIsBefore(safeParseISO(t.dueDate), safeStartOfDay(today)));
  const todayToDos = (toDos || []).filter(t => !t.completed && t.dueDate === todayStr);
  
  // Recurring checkups due today
  const todayRecurring = (allDefinitions || []).filter(def => {
    const itemCheckups = (checkups || [])
      .filter(c => c.categoryId === def.id)
      .sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        if (isNaN(ad) && isNaN(bd)) return 0;
        if (isNaN(ad)) return 1;
        if (isNaN(bd)) return -1;
        return bd - ad;
      });
    const latest = itemCheckups[0];
    if (!latest) return true; // Never done, due today
    
    const lastDate = new Date(latest.date);
    let nextDate: Date;
    switch (def.frequency) {
      case 'Daily': nextDate = safeAddDays(lastDate, 1); break;
      case 'Weekly': nextDate = safeAddDays(lastDate, 7); break;
      case 'Monthly': nextDate = safeAddDays(lastDate, 30); break;
      case 'Quarterly': nextDate = safeAddDays(lastDate, 90); break;
      case 'Yearly': nextDate = safeAddDays(lastDate, 365); break;
      default: nextDate = safeAddDays(lastDate, 30);
    }
    return safeIsSameDay(nextDate, today) || safeIsBefore(nextDate, today);
  });

  const todayWorks = [
    ...(overdueToDos || []).map(t => ({ ...t, type: 'To-Do', isOverdue: true })),
    ...(todayToDos || []).map(t => ({ ...t, type: 'To-Do', isOverdue: false })),
    ...(overdueTasks || []).map(t => ({ ...t, type: 'Maintenance', isOverdue: true })),
    ...(todayTasks || []).map(t => ({ ...t, type: 'Maintenance', isOverdue: false })),
    ...(issues || []).filter(i => i.status !== 'Resolved' && i.date && safeIsBefore(safeParseISO(i.date), safeStartOfDay(today))).map(i => ({ ...i, title: i.description, type: 'Issue', isOverdue: true })),
    ...(issues || []).filter(i => i.status !== 'Resolved' && i.date === todayStr).map(i => ({ ...i, title: i.description, type: 'Issue', isOverdue: false })),
    ...(todayRecurring || []).map(r => ({ ...r, title: r.name, type: 'Checkup', isOverdue: safeIsBefore(safeAddDays(new Date((checkups.filter(c => c.categoryId === r.id).sort((a,b) => b.date.localeCompare(a.date))[0]?.date || '1970-01-01')), (r.frequency === 'Daily' ? 1 : r.frequency === 'Weekly' ? 7 : 30)), today) }))
  ].sort((a, b) => {
    // Sort logic: Overdue first, then by priority/type
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return 0;
  });

  const myResolvedIssuesWithoutFeedback = (issues || []).filter(i => 
    i.status === 'Resolved' && 
    i.reportedByUserId === currentUser?.id && 
    (!i.feedback || Object.keys(i.feedback).length === 0)
  );

  const upcomingToDos = (toDos || []).filter(t => !t.completed && t.dueDate && safeIsAfter(safeStartOfDay(safeParseISO(t.dueDate)), safeStartOfDay(today)));
  const upcomingMaintenance = (tasks || []).filter(t => !['Done', 'Resolved'].includes(t.status) && t.dueDate && safeIsAfter(safeStartOfDay(safeParseISO(t.dueDate)), safeStartOfDay(today)));
  const upcomingHolidays = (holidays || []).filter(h => {
    const hDate = safeParseISO(h.date);
    return safeIsBefore(today, hDate) || safeIsSameDay(today, hDate);
  }).map(h => ({ ...h, title: h.reason, dueDate: h.date, type: 'Holiday' }));

  // Calculate next due dates for recurring items
  const upcomingRecurring = (allDefinitions || []).map(def => {
    const itemCheckups = checkups
      .filter(c => c.categoryId === def.id)
      .sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        if (isNaN(ad) && isNaN(bd)) return 0;
        if (isNaN(ad)) return 1;
        if (isNaN(bd)) return -1;
        return bd - ad;
      });
    const latest = itemCheckups[0];
    
    let nextDate: Date;
    if (!latest) {
      nextDate = today;
    } else {
      const lastDate = new Date(latest.date);
      switch (def.frequency) {
        case 'Daily': nextDate = safeAddDays(lastDate, 1); break;
        case 'Weekly': nextDate = safeAddDays(lastDate, 7); break;
        case 'Monthly': nextDate = safeAddDays(lastDate, 30); break;
        case 'Quarterly': nextDate = safeAddDays(lastDate, 90); break;
        case 'Yearly': nextDate = safeAddDays(lastDate, 365); break;
        default: nextDate = safeAddDays(lastDate, 30);
      }
    }
    
    return {
      ...def,
      title: def.name,
      dueDate: safeFormat(nextDate, 'yyyy-MM-dd'),
      type: 'Recurring Maintenance'
    };
  }).filter(item => {
    const dDate = safeParseISO(item.dueDate);
    // Show if due in the next 7 days and not today
    return safeIsBefore(today, dDate) && differenceInDays(dDate, today) <= 7 && !safeIsSameDay(dDate, today);
  });
  
  const allUpcoming = [
    ...(upcomingToDos || []).map(t => ({ ...t, type: 'To-Do' })),
    ...(upcomingMaintenance || []).map(t => ({ ...t, type: 'Maintenance' })),
    ...upcomingRecurring,
    ...upcomingHolidays
  ].sort((a, b) => {
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    if (isNaN(ad) && isNaN(bd)) return 0;
    if (isNaN(ad)) return 1;
    if (isNaN(bd)) return -1;
    return ad - bd;
  });

  const groupedUpcoming = allUpcoming.reduce((acc, item) => {
    const type = item.type as string;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const pendingIssues = (issues || []).filter(i => !['Resolved', 'Done'].includes(i.status));
  const pendingTasks = (tasks || []).filter(t => !['Done', 'Resolved'].includes(t.status));
  const pendingToDos = (toDos || []).filter(t => !t.completed);
  
  const pendingWorksCount = pendingIssues.length + pendingTasks.length + pendingToDos.length;
  
  const upcomingWarranties = (softwareWarranties || []).filter(sw => {
    const expDate = safeParseISO(sw.expireDate);
    if (isNaN(expDate.getTime())) return false;
    const daysLeft = differenceInDays(expDate, today);
    const isDismissed1M = sw.dismissedAlerts?.includes('1M');
    const isDismissed1W = sw.dismissedAlerts?.includes('1W');
    if (daysLeft <= 7 && daysLeft >= 0 && !isDismissed1W) return true;
    if (daysLeft <= 30 && daysLeft > 7 && !isDismissed1M) return true;
    return false;
  });

  const expiredWarranties = (softwareWarranties || []).filter(sw => safeIsBefore(safeParseISO(sw.expireDate), today));
  const repairingAssets = (assets || []).filter(a => a.status === 'Repairing');

  // Technician Performance Data
  const technicianPerformance = (users || [])
    .filter(u => ['Admin', 'Technician'].includes(u.role))
    .map(tech => {
      const resolvedIssues = (issues || []).filter(i => i.status === 'Resolved' && i.resolvedByUserId === tech.id);
      const completedTasks = (tasks || []).filter(t => t.status === 'Done'); // Global tasks
      const completedToDos = (toDos || []).filter(t => t.completed && t.userId === tech.id);
      
      return {
        name: tech.name,
        id: tech.id,
        role: tech.role,
        completed: resolvedIssues.length + completedToDos.length,
        pending: (issues || []).filter(i => i.status !== 'Resolved' && i.reportedByUserId === tech.id).length
      };
    }).sort((a, b) => b.completed - a.completed);

  const displayPerformance = ['Admin', 'Technician'].includes(currentUser?.role || '')
    ? technicianPerformance 
    : technicianPerformance.filter(p => p.id === currentUser?.id);

  // Chart Data: Problematic Equipment
  const assetIssueCounts = (assets || []).map(asset => ({
    name: asset.name,
    count: (issues || []).filter(i => i.assetId === asset.id).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Chart Data: Monthly Expenses
  const last6Months = eachMonthOfInterval({
    start: subMonths(today, 5),
    end: today
  });

  const monthlyExpenseData = (last6Months || []).map(month => {
    const monthStr = format(month, 'MMM yyyy');
    const monthIssues = (issues || []).filter(i => safeIsSameMonth(safeParseISO(i.date), month));
    const totalCost = monthIssues.reduce((sum, i) => sum + (i.cost || 0), 0);
    return { name: monthStr, cost: totalCost };
  });

  // Calculate common issues for pie chart
  const issueCategories = (issues || []).reduce((acc, issue) => {
    const category = issue.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(issueCategories).map(([name, value]) => ({
    name,
    value
  }));

  const consolidatedPending = [
    ...pendingIssues.map(i => ({ ...i, type: 'Issue', title: i.description, priority: i.priority, dueDate: i.date })),
    ...pendingTasks.map(t => ({ ...t, type: 'Maintenance', title: t.title, priority: 'Medium', dueDate: t.dueDate })),
    ...pendingToDos.map(t => ({ ...t, type: 'To-Do', title: t.title, priority: t.priority, dueDate: t.dueDate }))
  ].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const getItemStatusStyle = (dueDate?: string, isDone?: boolean) => {
    if (isDone) return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
    if (!dueDate) return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/10 dark:text-yellow-400 dark:border-yellow-900/20';
    
    const dDate = safeStartOfDay(safeParseISO(dueDate));
    const tDate = safeStartOfDay(new Date());
    if (isNaN(dDate.getTime()) || isNaN(tDate.getTime())) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/10 dark:text-yellow-400 dark:border-yellow-900/20';
    }
    const diff = differenceInDays(dDate, tDate);

    // Red: Overdue or Due Today
    if (diff <= 0) {
      return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
    }
    
    // Orange: Due within 3 days
    if (diff <= 3) {
      return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30';
    }

    // Yellow: To be done (Upcoming)
    return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/10 dark:text-yellow-400 dark:border-yellow-900/20';
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredAssets = normalizedQuery ? (assets || []).filter(asset => 
    asset.id.toLowerCase().includes(normalizedQuery) ||
    asset.name.toLowerCase().includes(normalizedQuery) ||
    (asset.serialNumber && asset.serialNumber.toLowerCase().includes(normalizedQuery)) ||
    (asset.modelName && asset.modelName.toLowerCase().includes(normalizedQuery)) ||
    (asset.tag && asset.tag.toLowerCase().includes(normalizedQuery))
  ) : [];

  const filteredUsers = normalizedQuery ? (users || []).filter(user => 
    user.id.toLowerCase().includes(normalizedQuery) ||
    user.name.toLowerCase().includes(normalizedQuery) ||
    user.username.toLowerCase().includes(normalizedQuery) ||
    (user.email && user.email.toLowerCase().includes(normalizedQuery))
  ) : [];

  const filteredIssues = normalizedQuery ? (issues || []).filter(issue => 
    issue.id.toString().toLowerCase().includes(normalizedQuery) ||
    issue.description.toLowerCase().includes(normalizedQuery) ||
    (issue.category && issue.category.toLowerCase().includes(normalizedQuery)) ||
    issue.priority.toLowerCase().includes(normalizedQuery)
  ) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm gap-6 transition-all">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Command Center</h1>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{settings.company_name || 'IT Tech Manager'} — Tactical Overview</p>
             <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live Sync: {format(lastRefreshedAt, 'HH:mm:ss')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleManualRefresh}
            className="p-4 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100 dark:border-slate-700"
            title="Refresh Data"
          >
            <Activity className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-6">
          {officeHours.enabled && (
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift Status</span>
                <div className="flex items-center gap-2 mt-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 transition-colors">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-black uppercase tracking-tight">{officeHours.open} - {officeHours.close}</span>
                </div>
             </div>
          )}
          <button 
            onClick={() => navigate('/reports')}
            className="flex items-center gap-3 px-6 py-4 bg-gray-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xl shadow-gray-200 dark:shadow-none border border-transparent dark:border-indigo-500"
          >
            <PieIcon className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>
    </div>

      {/* GLOBAL SEARCH SYSTEM */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-all">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-500" />
            Global Tactical Search
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            Instantly query inventory, personnel profiles, or support tickets
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-10 py-4 border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-950/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base font-semibold transition-all"
            placeholder="Type ID, Name, Model, Serial, Email or Category to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchCategory('all');
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Category Tabs */}
        {searchQuery && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-50 dark:border-slate-800/40">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-2">Results Category:</span>
            {[
              { id: 'all', label: `All Matches (${filteredAssets.length + filteredUsers.length + filteredIssues.length})` },
              { id: 'assets', label: `Assets (${filteredAssets.length})` },
              { id: 'users', label: `Users (${filteredUsers.length})` },
              { id: 'issues', label: `Tickets (${filteredIssues.length})` },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setSearchCategory(pill.id as any)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  searchCategory === pill.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:shadow-none"
                    : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-705"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}

        {/* RESULTS DESCRIPTOR GRID */}
        {searchQuery && (
          <div className="space-y-6 pt-2">
            {/* Assets section */}
            {(searchCategory === 'all' || searchCategory === 'assets') && filteredAssets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-1.5">
                  <Database className="w-4 h-4" /> Assets & Devices ({filteredAssets.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="group p-5 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className="text-base font-black uppercase text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {asset.name}
                          </h4>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                            asset.status === 'In Use' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                            asset.status === 'Repairing' ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                            asset.status === 'In Stock' ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                            "bg-gray-100 text-gray-650 dark:bg-slate-850 dark:text-gray-400"
                          )}>
                            {asset.status}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 font-mono text-gray-400">
                          <p><span className="text-gray-500 font-bold">ASSET-ID:</span> {asset.id}</p>
                          {asset.serialNumber && <p><span className="text-gray-500 font-bold">SERIAL:</span> {asset.serialNumber}</p>}
                          {asset.modelName && <p><span className="text-gray-500 font-bold">MODEL:</span> {asset.modelName}</p>}
                          {asset.ipAddress && <p><span className="text-gray-500 font-bold">IP-ADDR:</span> {asset.ipAddress}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/40">
                        <button
                          onClick={() => setSelectedResult({ type: 'asset', data: asset })}
                          className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <Info className="w-4 h-4" /> Quick View
                        </button>
                        <button
                          onClick={() => navigate('/assets', { state: { scrollToId: asset.id } })}
                          className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 transition-all"
                        >
                          Go To Asset <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users section */}
            {(searchCategory === 'all' || searchCategory === 'users') && filteredUsers.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] px-2 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Users & Personnel ({filteredUsers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="group p-5 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-805/40 rounded-2xl flex flex-col justify-between hover:border-orange-500/50 dark:hover:border-orange-400/50 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className="text-base font-black uppercase text-gray-900 dark:text-gray-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {user.name}
                          </h4>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                            user.role === 'Admin' ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
                            user.role === 'Technician' ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" :
                            "bg-gray-100 text-gray-600 dark:bg-slate-850 dark:text-gray-400"
                          )}>
                            {user.role}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 font-mono text-gray-400">
                          <p><span className="text-gray-500 font-bold">USER-ID:</span> {user.id}</p>
                          <p className="truncate"><span className="text-gray-500 font-bold">EMAIL:</span> {user.email || 'No email registered'}</p>
                          <p><span className="text-gray-500 font-bold">STATUS:</span> {user.status || 'Active'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/40">
                        <button
                          onClick={() => setSelectedResult({ type: 'user', data: user })}
                          className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <Info className="w-4 h-4" /> Quick View
                        </button>
                        {isAdmin ? (
                          <button
                            onClick={() => navigate('/users', { state: { scrollToId: user.id } })}
                            className="text-[10px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest flex items-center gap-1 transition-all"
                          >
                            Go To Member <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic opacity-60">Admin Only Block</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues section */}
            {(searchCategory === 'all' || searchCategory === 'issues') && filteredIssues.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Maintenance Tickets ({filteredIssues.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIssues.map(issue => {
                    const reporter = users.find(u => u.id === issue.reportedByUserId);
                    const device = assets.find(a => a.id === issue.assetId);

                    return (
                      <div
                        key={issue.id}
                        className="group p-5 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800/85 rounded-2xl flex flex-col justify-between hover:border-red-500/50 dark:hover:border-red-400/50 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className="text-base font-black uppercase text-gray-900 dark:text-gray-100 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                              {issue.description}
                            </h4>
                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                              issue.priority === 'High' ? "bg-red-600 text-white" :
                              issue.priority === 'Medium' ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" :
                              "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                            )}>
                              {issue.priority}
                            </span>
                          </div>
                          <div className="text-xs space-y-1 font-mono text-gray-400">
                            <p><span className="text-gray-500 font-bold">TKT-ID:</span> {issue.id}</p>
                            {issue.category && <p><span className="text-gray-500 font-bold">CAT:</span> {issue.category}</p>}
                            <p className="truncate"><span className="text-gray-500 font-bold">DEV:</span> {device ? device.name : 'No device linked'}</p>
                            {reporter && <p><span className="text-gray-500 font-bold">FROM:</span> {reporter.name}</p>}
                            <p><span className="text-gray-500 font-bold">STATUS:</span> {issue.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800/40">
                          <button
                            onClick={() => setSelectedResult({ type: 'issue', data: issue })}
                            className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <Info className="w-4 h-4" /> Quick View
                        </button>
                        <button
                          onClick={() => navigate('/issues', { state: { scrollToId: issue.id } })}
                          className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-all"
                        >
                          Go To Ticket <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Matches Warning */}
            {((searchCategory === 'all' && filteredAssets.length === 0 && filteredUsers.length === 0 && filteredIssues.length === 0) ||
              (searchCategory === 'assets' && filteredAssets.length === 0) ||
              (searchCategory === 'users' && filteredUsers.length === 0) ||
              (searchCategory === 'issues' && filteredIssues.length === 0)) && (
              <div className="py-12 text-center bg-gray-50/50 dark:bg-slate-950/20 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                <Info className="w-10 h-10 text-gray-400 mx-auto mb-3 opacity-30 animate-pulse" />
                <h4 className="text-sm font-black text-gray-500 uppercase tracking-wider">No matching profiles or cards</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest opacity-65 mt-1">There are no records for query "{searchQuery}" matching category "{searchCategory}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, icon: Database, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', link: '/assets' },
          { label: 'Open Issues', value: pendingIssues.length, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', link: '/issues' },
          { label: 'Active Tasks', value: pendingTasks.length, icon: Settings, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', link: '/tasks' },
          { label: 'To-Dos', value: pendingToDos.length, icon: ListTodo, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', link: '/todos' },
          { label: 'Holidays', value: holidays.length, icon: Calendar, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', link: '/holidays' },
          { label: 'Users', value: users.length, icon: UserPlus, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', link: '/users' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.link)}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm group hover:border-indigo-500 cursor-pointer transition-all hover:scale-105"
          >
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <AlertsCenter />

      {/* COMPACT UPCOMING TASKS (PODIYATA) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming Tasks (Next 7 Days)
          </h2>
          <button 
            onClick={() => navigate('/tasks')}
            className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allUpcoming.filter(i => i.type !== 'Holiday').slice(0, 4).map((item: any) => (
            <div 
              key={item.id} 
              onClick={() => navigate(item.type === 'To-Do' ? '/todos' : '/tasks', { state: { scrollToId: item.id } })}
              className="group flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-slate-950/30 rounded-2xl border border-gray-100 dark:border-slate-800/50 hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <div className={clsx(
                "p-2 rounded-xl transition-transform group-hover:scale-110",
                item.type === 'To-Do' ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" : "bg-blue-100 dark:bg-blue-900/20 text-blue-600"
              )}>
                {item.type === 'To-Do' ? <ListTodo className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate uppercase tracking-tight">{item.title}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.dueDate}</p>
              </div>
            </div>
          ))}
          {allUpcoming.filter(i => i.type !== 'Holiday').length === 0 && (
            <div className="col-span-full py-2 text-center text-gray-400 text-[10px] uppercase font-bold tracking-widest opacity-50">
              No tasks scheduled for the next 7 days
            </div>
          )}
        </div>
      </div>

      {/* Pending Feedback Alert for Admins/Techs - To monitor service quality */}
      {['Admin', 'Technician'].includes(currentUser?.role || '') && (issues || []).filter(i => i.feedback && i.feedback.rating <= 2).length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Star className="w-6 h-6 fill-current animate-pulse" />
             <p className="text-sm font-bold uppercase tracking-wider">Alert: Multiple low ratings detected in support tickets!</p>
          </div>
          <button onClick={() => navigate('/issues')} className="bg-white text-red-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">Review Feedback</button>
        </div>
      )}

      {/* Critical Alerts - Urgent & Important */}
      {(urgentWorkCount > 0 || repairingAssets.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Immediate Attention Required
            </h2>
            <div className="h-px flex-1 bg-red-100 dark:bg-red-900/20"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgentWorkCount > 0 && (
              <div 
                onClick={() => navigate('/checkups')}
                className="group relative flex items-center gap-4 p-6 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-900/30 cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/10"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-16 h-16" />
                </div>
                <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 dark:shadow-none">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-900 dark:text-red-100 leading-tight">Critical Checkups</h3>
                  <p className="text-sm font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-widest">{urgentWorkCount} Items Missed or Due</p>
                </div>
              </div>
            )}
            
            {repairingAssets.length > 0 && (
              <div 
                onClick={() => navigate('/assets')}
                className="group relative flex items-center gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30 cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wrench className="w-16 h-16" />
                </div>
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-blue-900 dark:text-blue-100 leading-tight">In Repair</h3>
                  <p className="text-sm font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">{repairingAssets.length} Assets Unavailable</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isNearClosing && pendingCount > 0 && (
        <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Workday Ending Soon!</p>
              <p className="text-sm opacity-90">You have {pendingCount} pending tasks. Please complete them before {officeHours.close}.</p>
            </div>
          </div>
          <button onClick={() => navigate('/tasks')} className="bg-white text-amber-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider">View Tasks</button>
        </div>
      )}
      
      {/* Work Sections - Today's Schedule and Pending Work Queue Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Today's Works - Main Section */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 ring-4 ring-indigo-500/5 shadow-indigo-100/20">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">
                <Calendar className="w-8 h-8 text-indigo-500" />
                Today's Schedule
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Actions for {format(today, 'PPPP')}</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-indigo-600 block leading-none">{todayWorks.length}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned</span>
            </div>
          </div>
          
          {todayWorks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-slate-950/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest italic">All clear for today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(todayWorks || []).map((work: any) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={work.id} 
                  className={clsx(
                    "group flex items-center justify-between p-5 rounded-2xl border-2 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer",
                    getItemStatusStyle(work.dueDate || work.date, work.status === 'Done' || work.status === 'Resolved' || work.completed)
                  )} 
                  onClick={() => navigate(work.type === 'To-Do' ? '/todos' : work.type === 'Issue' ? '/issues' : work.type === 'Checkup' ? '/checkups' : '/tasks', { state: { scrollToId: work.id } })}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/80 dark:bg-slate-950/40 rounded-xl shadow-sm border border-inherit transition-transform group-hover:scale-110">
                      {work.type === 'To-Do' ? <ListTodo className="w-6 h-6" /> : 
                       work.type === 'Issue' ? <AlertCircle className="w-6 h-6" /> :
                       work.type === 'Checkup' ? <Activity className="w-6 h-6" /> :
                       <Settings className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-base font-black truncate max-w-[200px] uppercase tracking-tight text-gray-900 dark:text-gray-100">{work.title || work.description || 'Untitled Work'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{work.type}</span>
                        {work.isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-600 text-white uppercase tracking-widest animate-pulse shadow-sm shadow-red-500/50">Urgent</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-inherit shadow-inner opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Work Queue - Main Section */}
        <div id="pending-queue" className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 ring-4 ring-orange-500/5 shadow-orange-100/20">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">
                <div className="p-2 bg-orange-500 text-white rounded-xl">
                  <Clock className="w-8 h-8" />
                </div>
                Pending Queue
              </h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Backlog awaiting resolution</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-orange-600 block leading-none">{consolidatedPending.length}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active</span>
            </div>
          </div>
          
          {consolidatedPending.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-slate-950/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest italic">Queue is empty!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {consolidatedPending.slice(0, 10).map((item: any) => (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`${item.type}-${item.id}`} 
                  className={clsx(
                    "group p-5 rounded-2xl border-2 flex items-center justify-between transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-orange-500/10 cursor-pointer",
                    getItemStatusStyle(item.dueDate, item.status === 'Resolved' || item.status === 'Done' || item.completed)
                  )}
                  onClick={() => navigate(item.type === 'To-Do' ? '/todos' : item.type === 'Issue' ? '/issues' : '/tasks', { state: { scrollToId: item.id } })}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/80 dark:bg-slate-950/40 rounded-xl shadow-sm border border-inherit transition-transform group-hover:scale-110">
                      {item.type === 'Issue' ? <AlertCircle className="w-5 h-5" /> : 
                       item.type === 'Maintenance' ? <Settings className="w-5 h-5" /> :
                       <ListTodo className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-base font-black truncate max-w-[200px] uppercase tracking-tight text-gray-900 dark:text-gray-100">{item.title || item.description || 'Untitled Item'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{item.type}</span>
                        {item.dueDate && (
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due: {item.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
              {consolidatedPending.length > 10 && (
                <button onClick={() => navigate('/tasks')} className="w-full py-4 text-[10px] font-black text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-[0.3em]">
                  + {consolidatedPending.length - 10} More Items in Queue
                </button>
              )}
            </div>
          )}
        </div>
      </div>


          {/* Upcoming Works Grouped by Category */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-6 uppercase tracking-tight">
              <Clock className="w-5 h-5 text-indigo-500" /> Upcoming Works
            </h2>
            {allUpcoming.length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                <p className="text-sm italic font-bold uppercase tracking-widest opacity-30">No upcoming tasks scheduled.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedUpcoming || {}).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-3">{category}</h3>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(items as any[]).slice(0, 4).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-950/40 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-500/50 transition-all hover:bg-white dark:hover:bg-slate-800 group">
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "p-2 rounded-lg transition-transform group-hover:scale-110",
                              category === 'To-Do' ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" : 
                              category === 'Maintenance' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" :
                              "bg-purple-100 dark:bg-purple-900/40 text-purple-600"
                            )}>
                              {category === 'To-Do' ? <ListTodo className="w-4 h-4" /> : 
                               category === 'Maintenance' ? <Settings className="w-4 h-4" /> :
                               <Calendar className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{item.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium font-mono">Due: {item.dueDate}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => navigate(category === 'To-Do' ? '/todos' : category === 'Maintenance' ? '/tasks' : '/holidays', { state: { scrollToId: item.id } })} 
                            className="p-2 text-gray-300 group-hover:text-indigo-500 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Problematic Equipment Chart */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-all hover:border-red-400/20">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 uppercase tracking-tight">
                    <TrendingUp className="w-5 h-5 text-red-500" /> Problematic Equipment
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Asset ticket breakdown</p>
                </div>
                <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/20">Click bar to filter</span>
              </div>
              <p className="text-[9.5px] text-gray-400 italic mb-4">Click any bar below to view and resolve issues for that specific equipment.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={assetIssueCounts}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const asset = assets.find(a => a.name === data.activePayload[0].payload.name);
                        if (asset) {
                          navigate('/issues', { state: { filterAssetId: asset.id } });
                        }
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [`${value} issues`, 'Tickets']}
                    />
                    <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]}>
                      {assetIssueCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} className="cursor-pointer hover:opacity-80 transition-opacity" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Expenses Chart */}
            <div 
              onClick={() => navigate('/reports')}
              className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-all hover:border-emerald-400/20 hover:scale-[1.005] duration-300 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 uppercase tracking-tight">
                    <DollarSign className="w-5 h-5 text-emerald-500" /> Monthly Expenses
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Rolling 6-Month Expenditure</p>
                </div>
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/20">Analyze reports</span>
              </div>
              <p className="text-[9.5px] text-gray-400 italic mb-4">Click anywhere inside the expense window to load full finance visualizations and tables.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlyExpenseData}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" fontSize={10} tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                      itemStyle={{ color: '#10B981', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [`$${value}`, 'Expense']}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <UserPlus className="w-5 h-5 text-indigo-500" /> Technician Performance
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Individual Resolutions & Backlog</p>
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/20">Filter issues by Tech</span>
              </div>
              <p className="text-[9.5px] text-gray-400 italic mb-6">Click any technician profile below to isolate, view, and inspect their issues backlog.</p>
              <div className="space-y-4">
                {displayPerformance.map((perf) => (
                  <div 
                    key={perf.id} 
                    onClick={() => navigate('/issues', { state: { searchQuery: perf.name } })}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/55 dark:hover:bg-slate-800/40 hover:border-indigo-400 hover:scale-[1.015] duration-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "p-2 rounded-lg transition-transform group-hover:scale-110",
                        perf.role === 'Admin' ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600" : "bg-blue-100 dark:bg-blue-900/20 text-blue-600"
                      )}>
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{perf.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{perf.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{perf.completed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pending</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{perf.pending}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <Activity className="w-5 h-5 text-indigo-500" /> System Activity
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Real-time Counter Summary</p>
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/20">Live sync active</span>
              </div>
              <p className="text-[9.5px] text-gray-400 italic mb-6">Click any activity counter category to launch and browse filtered workspace registries.</p>
              <div className="space-y-4">
                <div 
                  onClick={() => navigate('/assets', { state: { filterStatus: 'In Use' } })}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800/40 hover:border-sky-400 hover:scale-[1.015] duration-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg transition-transform group-hover:scale-115">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors uppercase tracking-tight">Active Assets</p>
                      <p className="text-xs text-gray-500 font-medium">Currently in use on-site</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900 dark:text-white">{(assets || []).filter(a => a.status === 'In Use').length}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/issues', { state: { activeTab: 'Done Works' } })}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800/40 hover:border-emerald-400 hover:scale-[1.015] duration-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-lg transition-transform group-hover:scale-115">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight">Resolved Issues</p>
                      <p className="text-xs text-gray-500 font-medium">Finished in last 30 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900 dark:text-white">{(issues || []).filter(i => i.status === 'Resolved' && safeIsWithinInterval(i.date, { start: subMonths(today, 1), end: today })).length}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* QUICK VIEW DETAIL MODAL */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/40">
              <div>
                <span className={clsx(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  selectedResult.type === 'asset' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                  selectedResult.type === 'user' ? "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                  "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                )}>
                  Tactical Quick View: {selectedResult.type}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-950 dark:text-gray-100 mt-1">
                  {selectedResult.type === 'asset' && (selectedResult.data as Asset).name}
                  {selectedResult.type === 'user' && (selectedResult.data as User).name}
                  {selectedResult.type === 'issue' && (selectedResult.data as Issue).description}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Asset Layout */}
              {selectedResult.type === 'asset' && (() => {
                const asset = selectedResult.data as Asset;
                const location = locations.find(l => l.id === asset.locationId);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Device Name</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{asset.name}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Asset ID</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{asset.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Tag Indicator</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{asset.tag || 'None'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Device Category</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{assetTypes.find(t => t.id === asset.typeId)?.name || 'Device'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Serial Number</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{asset.serialNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Model Variant</span>
                      <p className="text-sm font-bold text-gray-905 dark:text-white uppercase">{asset.modelName || 'Standard'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Tactical Site Location</span>
                      <p className="text-sm font-bold text-gray-905 dark:text-white uppercase">{location?.name || 'Main Office HQ'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">IP Address Route</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{asset.ipAddress || 'Not Assigned'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">MAC Reference</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{asset.macAddress || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider font-mono">Operating System / Version</span>
                      <p className="text-sm font-bold text-gray-905 dark:text-white uppercase">{asset.specs?.os || asset.specs?.OperatingSystem || asset.specs?.operatingSystem || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Purchase Cost</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{asset.specs?.cost || asset.specs?.purchaseCost || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Status Vector</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{asset.status}</p>
                    </div>
                  </div>
                );
              })()}

              {/* User Layout */}
              {selectedResult.type === 'user' && (() => {
                const user = selectedResult.data as User;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Full Username Card</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{user.name}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Login Username</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{user.username}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">User Account ID</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{user.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Security Access Level</span>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{user.role}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Registered Email Gateway</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{user.email || 'No Email Registered'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider font-mono">Phone Reference</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user.mobile ? `${user.mobile}${user.extension ? ` (Ext. ${user.extension})` : ''}` : 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Account Status</span>
                      <p className="text-sm font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-wide">{user.status || 'Active'}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Maintenance Ticket Layout */}
              {selectedResult.type === 'issue' && (() => {
                const issue = selectedResult.data as Issue;
                const reporter = users.find(u => u.id === issue.reportedByUserId);
                const tech = users.find(u => u.id === issue.assignedToUserId);
                const device = assets.find(a => a.id === issue.assetId);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Description of Issue</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase leading-relaxed">{issue.description}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Ticket Reference ID</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">#{issue.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Classification Category</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{issue.category || 'General Helpdesk'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Assigned Urgency</span>
                      <p className="text-sm font-bold text-red-650 dark:text-red-400 uppercase tracking-wide font-black">{issue.priority}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Ticket State</span>
                      <p className="text-sm font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">{issue.status}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Associated Hardware Device</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{device ? `${device.name} [${device.id}]` : 'None linked'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Date Logged</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{issue.date ? safeFormat(safeParseISO(issue.date), 'PPPP') : 'Unknown'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Reported By personnel</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{reporter?.name || 'System Auto-Monitor'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Handling Technician</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{tech?.name || 'Awaiting assignment'}</p>
                    </div>
                    {issue.resolutionNote && (
                      <div className="space-y-1 md:col-span-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Support Resolution Summary</span>
                        <p className="text-sm text-emerald-900 dark:text-emerald-300 font-bold leading-relaxed">{issue.resolutionNote}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-gray-50 dark:bg-slate-950/40 border-t border-gray-100 dark:border-slate-800/80 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                Close View
              </button>
              <button
                onClick={() => {
                  const viewUrl = selectedResult.type === 'asset' ? '/assets' : selectedResult.type === 'user' ? '/users' : '/issues';
                  const idValue = selectedResult.data.id;
                  setSelectedResult(null);
                  navigate(viewUrl, { state: { scrollToId: idValue } });
                }}
                className={clsx(
                  "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md",
                  selectedResult.type === 'asset' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10" :
                  selectedResult.type === 'user' ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/10" :
                  "bg-red-650 hover:bg-red-750 shadow-red-500/10"
                )}
              >
                Go to registry workspace
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
}
