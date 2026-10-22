import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Download, FileText, Table as TableIcon, PieChart as PieIcon, BarChart3, 
  TrendingUp, AlertCircle, Filter, CheckSquare, Calendar, CheckCircle2,
  X, ExternalLink, ArrowRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import { default as autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
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

const safeIsWithinInterval = (date: any, interval: { start: any; end: any }): boolean => {
  if (!date || !interval || !interval.start || !interval.end) return false;
  try {
    const d = typeof date === 'string' ? safeParseISO(date) : new Date(date);
    const start = typeof interval.start === 'string' ? safeParseISO(interval.start) : new Date(interval.start);
    const end = typeof interval.end === 'string' ? safeParseISO(interval.end) : new Date(interval.end);
    if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    return isWithinInterval(d, { start, end });
  } catch (e) {
    return false;
  }
};

const safeFormat = (date: any, formatStr: string, fallback = ''): string => {
  if (!date) return fallback;
  try {
    const d = typeof date === 'string' ? safeParseISO(date) : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

type ReportSection = 'Assets' | 'Issues' | 'Tasks' | 'Checkups';

export default function Reports() {
  const { assets, issues, tasks, checkups, assetTypes, locations, users } = useStore();
  const [reportPeriod, setReportPeriod] = useState<'Month' | 'Week'>('Month');
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(['Assets', 'Issues', 'Tasks']);
  const [detailsModal, setDetailsModal] = useState<{ title: string; type: 'issues' | 'assets'; items: any[] } | null>(null);

  const periodRange = useMemo(() => {
    const today = new Date();
    if (reportPeriod === 'Month') {
      return { start: startOfMonth(today), end: endOfMonth(today), label: format(today, 'MMMM yyyy') };
    } else {
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }), label: `Week of ${format(startOfWeek(today, { weekStartsOn: 1 }), 'PP')}` };
    }
  }, [reportPeriod]);

  // 1. Issues by Category Data
  const issuesByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    (issues || []).forEach(issue => {
      const cat = issue.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [issues]);

  const handleCategoryClick = (data: any) => {
    const categoryIssues = (issues || []).filter(i => (i.category || 'Uncategorized') === data.name);
    setDetailsModal({
      title: `Issues: ${data.name}`,
      type: 'issues',
      items: categoryIssues
    });
  };

  // 2. Repair Costs per Month (Last 6 Months)
  const repairCostsByMonth = useMemo(() => {
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return (last6Months || []).map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthIssues = (issues || []).filter(issue => {
        return safeIsWithinInterval(issue.date, { start: monthStart, end: monthEnd });
      });

      const totalCost = (monthIssues || []).reduce((sum, issue) => sum + (issue.cost || 0), 0);
      return {
        month: format(month, 'MMM yyyy'),
        cost: totalCost,
        count: monthIssues.length,
        rawDate: month,
        issues: monthIssues
      };
    });
  }, [issues]);

  const handleMonthClick = (data: any) => {
    if (!data.activePayload) return;
    const payload = data.activePayload[0].payload;
    setDetailsModal({
      title: `Issues & Costs: ${payload.month}`,
      type: 'issues',
      items: payload.issues
    });
  };

  // 3. Assets by Status
  const assetsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    (assets || []).forEach(asset => {
      counts[asset.status] = (counts[asset.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const handleStatusClick = (data: any) => {
    const filteredAssets = (assets || []).filter(a => a.status === data.name);
    setDetailsModal({
      title: `Assets: ${data.name}`,
      type: 'assets',
      items: filteredAssets
    });
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('IT INFRASTRUCTURE REPORT', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${periodRange.label} | Generated: ${format(new Date(), 'PPP p')}`, 14, 34);

    let currentY = 50;

    // Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Overview Summary', 14, currentY);
    currentY += 10;

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Assets', (assets || []).length.toString()],
      ['New Issues This Period', (issues || []).filter(i => safeIsWithinInterval(i.date, periodRange)).length.toString()],
      ['Resolved Issues This Period', (issues || []).filter(i => i.status === 'Resolved' && i.resolvedDate && safeIsWithinInterval(i.resolvedDate, periodRange)).length.toString()],
      ['Maintenance Cost', `$${(issues || []).filter(i => safeIsWithinInterval(i.date, periodRange)).reduce((sum, i) => sum + (i.cost || 0), 0).toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: currentY,
      body: summaryData.slice(1),
      head: [summaryData[0]],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    if (selectedSections.includes('Assets')) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Asset Portfolio', 14, currentY);
      currentY += 8;

      const assetRows = (assets || []).map(a => [
        a.tag, 
        a.name, 
        assetTypes.find(t => t.id === a.typeId)?.name || 'Unknown', 
        a.status,
        locations.find(l => l.id === a.locationId)?.name || '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Tag', 'Name', 'Type', 'Status', 'Location']],
        body: assetRows.slice(0, 50),
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (selectedSections.includes('Issues')) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Issue Logs & Repairs', 14, currentY);
      currentY += 8;

      const filteredIssues = (issues || []).filter(i => safeIsWithinInterval(i.date, periodRange));
      const issueRows = filteredIssues.map(i => [
        i.date, 
        i.description, 
        i.status, 
        users.find(u => u.id === i.reportedByUserId)?.name || '-',
        `$${(i.cost || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Description', 'Status', 'Technician', 'Cost']],
        body: issueRows,
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (selectedSections.includes('Tasks')) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Completed Maintenance Tasks', 14, currentY);
      currentY += 8;

      const filteredTasks = (tasks || []).filter(t => t.status === 'Done' && t.dueDate && safeIsWithinInterval(t.dueDate, periodRange));
      const taskRows = filteredTasks.map(t => [t.dueDate, t.title, t.status]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Task', 'Status']],
        body: taskRows,
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (selectedSections.includes('Checkups')) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Infrastructure Checkups', 14, currentY);
      currentY += 8;

      const filteredCheckups = (checkups || []).filter(c => safeIsWithinInterval(c.date, periodRange));
      const checkupRows = filteredCheckups.map(c => [
        c.date, 
        c.category, 
        c.status,
        c.notes || '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Category', 'Status', 'Notes']],
        body: checkupRows,
        theme: 'striped',
        styles: { fontSize: 8 }
      });
    }

    doc.save(`IT_Report_${reportPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (selectedSections.includes('Assets')) {
      const assetsWS = XLSX.utils.json_to_sheet((assets || []).map(a => ({
        Tag: a.tag,
        Name: a.name,
        Model: a.modelName,
        Status: a.status,
        Location: locations.find(l => l.id === a.locationId)?.name || 'Unknown'
      })));
      XLSX.utils.book_append_sheet(wb, assetsWS, "Assets");
    }

    if (selectedSections.includes('Issues')) {
      const issuesWS = XLSX.utils.json_to_sheet((issues || []).filter(i => safeIsWithinInterval(i.date, periodRange)).map(i => ({
        Date: i.date,
        Description: i.description,
        Status: i.status,
        Cost: i.cost || 0,
        Reporter: users.find(u => u.id === i.reportedByUserId)?.name || '-'
      })));
      XLSX.utils.book_append_sheet(wb, issuesWS, "Issues");
    }

    if (selectedSections.includes('Tasks')) {
      const tasksWS = XLSX.utils.json_to_sheet((tasks || []).filter(t => t.status === 'Done' && t.dueDate && safeIsWithinInterval(t.dueDate, periodRange)).map(t => ({
        Date: t.dueDate,
        Task: t.title,
        Status: t.status
      })));
      XLSX.utils.book_append_sheet(wb, tasksWS, "Tasks");
    }

    if (selectedSections.includes('Checkups')) {
      const checkupsWS = XLSX.utils.json_to_sheet((checkups || []).filter(c => safeIsWithinInterval(c.date, periodRange)).map(c => ({
        Date: c.date,
        Category: c.category,
        Status: c.status,
        Notes: c.notes || ''
      })));
      XLSX.utils.book_append_sheet(wb, checkupsWS, "Checkups");
    }

    if (wb.SheetNames.length === 0) {
      const emptyWS = XLSX.utils.json_to_sheet([{ Message: 'No data selected for export' }]);
      XLSX.utils.book_append_sheet(wb, emptyWS, "Empty");
    }

    XLSX.writeFile(wb, `IT_Export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const toggleSection = (section: ReportSection) => {
    setSelectedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Customizable infrastructure reporting and health metrics.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-xs uppercase tracking-wider"
          >
            <TableIcon className="w-4 h-4" /> Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Report Configuration Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> 1. Select Report Period
            </h3>
            <div className="flex gap-2">
              {(['Month', 'Week'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={clsx(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all border",
                    reportPeriod === p 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                      : "bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                  )}
                >
                  {p}ly Report
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-indigo-500 font-medium flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Reporting for: {periodRange.label}
            </p>
          </div>

          <div className="flex-[2]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> 2. Select Details to Include
            </h3>
            <div className="flex flex-wrap gap-3">
              {(['Assets', 'Issues', 'Tasks', 'Checkups'] as ReportSection[]).map(section => (
                <button
                  key={section}
                  onClick={() => toggleSection(section)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                    selectedSections.includes(section)
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-inner"
                      : "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800"
                  )}
                >
                  <div className={clsx(
                    "w-4 h-4 rounded flex items-center justify-center border",
                    selectedSections.includes(section) ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600"
                  )}>
                    {selectedSections.includes(section) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  {section}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Assets', value: assets.length, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Issues', value: issues.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Asset Types', value: assetTypes.length, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active Issues', value: issues.filter(i => i.status !== 'Resolved').length, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bg} dark:bg-gray-900 p-2 rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Monthly Repair Costs
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairCostsByMonth} onClick={handleMonthClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                  formatter={(value: any) => [`$${value}`, 'Repair Cost']}
                />
                <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-[10px] text-gray-400 font-medium italic">
            * Click bars to view repairs for that month
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieIcon className="w-4 h-4" /> Issues by Category
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={issuesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={handleCategoryClick}
                  stroke="none"
                  cursor="pointer"
                >
                  {issuesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-[10px] text-gray-400 font-medium italic">
            * Click segments to view specific tickets
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Assets by Status
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={assetsByStatus} 
                layout="vertical" 
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    handleStatusClick(data.activePayload[0].payload);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} width={100} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {assetsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-[10px] text-gray-400 font-medium italic">
            * Click bars to view assets in that status
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!detailsModal}
        onClose={() => setDetailsModal(null)}
        title={detailsModal?.title || ''}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {detailsModal?.type === 'issues' ? (
            <div className="space-y-4">
              {(detailsModal.items || []).length > 0 ? (
                detailsModal.items.map((issue: any) => (
                  <div key={issue.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-indigo-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                        {issue.category || 'General'}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">{issue.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-3">{issue.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          issue.status === 'Resolved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {issue.status}
                        </span>
                        {issue.cost > 0 && (
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Cost: ${issue.cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 italic">No historical data available for this selection.</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(detailsModal?.items || []).map((asset: any) => (
                <div key={asset.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-none">{asset.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{asset.tag}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">{assetTypes.find(t => t.id === asset.typeId)?.name || 'Device'}</span>
                    <span className="font-bold text-gray-300">{asset.serialNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setDetailsModal(null)}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Close Details
          </button>
        </div>
      </Modal>
    </div>
  );
}
