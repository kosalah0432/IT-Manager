import React from 'react';
import { useStore } from '../store';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Box, Users, Activity, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899', '#F97316', '#14B8A6'];

interface AssetsDashboardProps {
  onFilter?: (type: 'status' | 'user' | 'category' | 'location', value: string) => void;
}

export default function AssetsDashboard({ onFilter }: AssetsDashboardProps) {
  const { assets, assetTypes, locations, users, softwareWarranties } = useStore();

  // Stats
  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.userId).length;
  const primaryStatus = assets.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonStatus = Object.entries(primaryStatus).sort((a, b) => (b[1] as number) - (a[1] as number))[0] || ['None', 0];

  const expiringWarranties = softwareWarranties.filter(sw => {
    const expireDate = new Date(sw.expireDate);
    const now = new Date();
    const diffTime = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  // Data for Category Chart
  const categoryData = (assetTypes || []).map(type => ({
    name: type.name,
    value: (assets || []).filter(a => a.typeId === type.id).length
  })).filter(d => d.value > 0);

  // Data for Location Chart
  const locationData = (locations || []).map(loc => ({
    name: loc.name,
    value: (assets || []).filter(a => a.locationId === loc.id).length
  })).filter(d => d.value > 0);

  // Data for Status Chart
  const statusData = Object.entries(primaryStatus || {}).map(([name, value]) => ({ name, value }));

  // Top Personnel
  const personnelStats = (users || []).map(user => ({
    id: user.id,
    name: user.name,
    username: user.username,
    count: (assets || []).filter(a => a.userId === user.id).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Box className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssets}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Currently Assigned</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignedAssets} <span className="text-sm font-normal text-gray-400">/ {totalAssets}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Primary Status</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mostCommonStatus[0]}</p>
            <p className="text-xs text-gray-400">{mostCommonStatus[1]} assets</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Warranties</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {expiringWarranties > 0 ? expiringWarranties : 'All Good'}
            </p>
            <p className="text-xs text-gray-400">
              {expiringWarranties > 0 ? 'Expiring soon' : 'No immediate expirations'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 text-center uppercase tracking-wider">By Category</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => {
                    const type = assetTypes.find(t => t.name === data.name);
                    if (type && onFilter) onFilter('category', type.id);
                  }}
                  className="cursor-pointer outline-none"
                >
                {(categoryData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 text-center uppercase tracking-wider">By Location</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  onClick={(data) => {
                    const loc = locations.find(l => l.name === data.name);
                    if (loc && onFilter) onFilter('location', loc.id);
                  }}
                  className="cursor-pointer outline-none"
                >
                {(locationData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 text-center uppercase tracking-wider">By Status</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]} 
                  onClick={(data) => {
                    if (onFilter) onFilter('status', data.name);
                  }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {(['In Use', 'In Stock', 'Repairing', 'Retired'] as const).map(status => (
              <div 
                key={status} 
                className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                onClick={() => onFilter?.('status', status)}
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{primaryStatus[status] || 0}</span>
                  <span className="text-gray-400 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Personnel Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Full Name</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Assets Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(personnelStats || []).map(user => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                    onClick={() => onFilter?.('user', user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">({user.username})</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                          {user.count}
                        </span>
                        <span className="text-gray-400 group-hover:translate-x-1 transition-transform">›</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
