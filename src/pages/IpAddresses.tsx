import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Edit2, Check, X, ArrowUpDown, Download, FileText, Table, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { default as autoTable } from 'jspdf-autotable';
import { clsx } from 'clsx';
import Modal from '../components/Modal';
import { useLocation } from 'react-router-dom';

export default function IpAddresses() {
  const { assets, assetTypes, updateAsset } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`ip-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [sortField, setSortField] = useState<'ipAddress' | 'deviceType'>('ipAddress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: 'ipAddress' | 'deviceType') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const filteredAssets = (assets || []).filter(a => {
    const hasIp = a.ipAddress && a.ipAddress.trim() !== '';
    const matchesType = selectedType === '' || a.typeId === selectedType;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         a.ipAddress.toLowerCase().includes(q) || 
                         a.name.toLowerCase().includes(q) || 
                         (a.tag || '').toLowerCase().includes(q);
    return hasIp && matchesType && matchesSearch;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'ipAddress') {
      comparison = ipToNumber(a.ipAddress) - ipToNumber(b.ipAddress);
    } else if (sortField === 'deviceType') {
      const typeA = (assetTypes || []).find(t => t.id === a.typeId)?.name || '';
      const typeB = (assetTypes || []).find(t => t.id === b.typeId)?.name || '';
      comparison = typeA.localeCompare(typeB);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getDeviceTypeColor = (typeName: string = '') => {
    const name = typeName.toLowerCase();
    if (name.includes('server')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (name.includes('laptop')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (name.includes('desktop')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    if (name.includes('iot') || name.includes('smart') || name.includes('phone')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (name.includes('printer') || name.includes('scanner')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (name.includes('firewall') || name.includes('router') || name.includes('switch')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const exportToCSV = () => {
    const headers = ['IP Address', 'Device Name', 'Model Name', 'Device Type', 'Asset Tag'];
    const rows = (sortedAssets || []).map(asset => {
      const type = (assetTypes || []).find(t => t.id === asset.typeId);
      return [
        asset.ipAddress,
        asset.name,
        asset.modelName || '',
        type?.name || '',
        asset.tag || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ip_addresses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('IP Address Report', 14, 15);
    
    const tableData = (sortedAssets || []).map(asset => {
      const type = (assetTypes || []).find(t => t.id === asset.typeId);
      return [
        asset.ipAddress,
        asset.name,
        asset.modelName || '',
        type?.name || '',
        asset.tag || ''
      ];
    });

    autoTable(doc, {
      head: [['IP Address', 'Device Name', 'Model Name', 'Device Type', 'Asset Tag']],
      body: tableData,
      startY: 20,
    });

    doc.save(`ip_addresses_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleEdit = (asset: any) => {
    setEditingId(asset.id);
    setEditValue(asset.ipAddress);
    setEditingAsset(asset);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateAsset(editingId, { ipAddress: editValue });
      setEditingId(null);
      setEditingAsset(null);
    } catch (error) {
      console.error('IP address update failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IP Addresses</h1>
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <input 
              type="text" 
              placeholder="Search IP, device name or tag..." 
              className="w-full pl-4 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
          >
            <option value="">All Device Types</option>
            {(assetTypes || []).map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Table className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('ipAddress')}
              >
                <div className="flex items-center gap-2">
                  IP Address
                  <ArrowUpDown className={clsx("w-3 h-3", sortField === 'ipAddress' ? "text-indigo-600" : "text-gray-400")} />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Model Name</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleSort('deviceType')}
              >
                <div className="flex items-center gap-2">
                  Device Type
                  <ArrowUpDown className={clsx("w-3 h-3", sortField === 'deviceType' ? "text-indigo-600" : "text-gray-400")} />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Tag</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {(sortedAssets || []).map(asset => {
              const type = (assetTypes || []).find(t => t.id === asset.typeId);

              return (
                <tr key={asset.id} id={`ip-${asset.id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600 dark:text-indigo-400">
                    {asset.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.modelName || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={clsx(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      getDeviceTypeColor(type?.name)
                    )}>
                      {type?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.tag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEdit(asset)} 
                      className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {sortedAssets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No IP addresses assigned to assets.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!editingId}
        onClose={() => { setEditingId(null); setEditingAsset(null); }}
        title="Update IP Address"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl space-y-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{editingAsset?.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{editingAsset?.modelName} | Tag: {editingAsset?.tag}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">IP Address</label>
            <input
              type="text"
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="e.g. 192.168.1.1"
              autoFocus
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => { setEditingId(null); setEditingAsset(null); }}
              className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Update IP
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
