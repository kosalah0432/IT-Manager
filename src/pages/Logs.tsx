import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format, parseISO } from 'date-fns';
import { Search, Filter } from 'lucide-react';

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

export default function Logs() {
  const { logs, users } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  const actions = useMemo(() => {
    const set = new Set<string>();
    (logs || []).forEach(l => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return (logs || []).filter(log => {
      const user = (users || []).find(u => u.id === log.userId);
      const userName = user?.name || 'System';
      const q = searchTerm.toLowerCase();
      
      const matchesSearch = log.details.toLowerCase().includes(q) || 
                           log.action.toLowerCase().includes(q) ||
                           userName.toLowerCase().includes(q);
      const matchesUser = userFilter === 'All' || log.userId === userFilter || (userFilter === 'system' && !log.userId);
      const matchesAction = actionFilter === 'All' || log.action === actionFilter;

      return matchesSearch && matchesUser && matchesAction;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [logs, users, searchTerm, userFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Logs</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="w-full pl-10 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Users</option>
            <option value="system">System</option>
            {(users || []).sort((a,b) => a.name.localeCompare(b.name)).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select 
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Details</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">User</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredLogs.map(log => {
              const user = (users || []).find(u => u.id === log.userId);
              return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {safeFormat(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 inline-flex text-[10px] font-bold uppercase rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md">{log.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user?.name || 'System'}</td>
                </tr>
              );
            })}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">No logs recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
