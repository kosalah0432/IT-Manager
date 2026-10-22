import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Plus, Edit2, Trash2, Search, RotateCcw, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { format, isBefore, parseISO } from 'date-fns';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';

const isLicenseExpired = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) return false;
    return isBefore(parsed, new Date());
  } catch (e) {
    return false;
  }
};

export default function SoftwareWarranties() {
  const { softwareWarranties, assets, addSoftwareWarranty, updateSoftwareWarranty, deleteSoftwareWarranty } = useStore();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const [renewingWarranty, setRenewingWarranty] = useState<any | null>(null);
  const [renewalPeriod, setRenewalPeriod] = useState<'1year' | '2year' | '3year' | 'custom'>('1year');
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalExpireDate, setRenewalExpireDate] = useState('');

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`warranty-${targetId}`);
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

  const filteredWarranties = useMemo(() => {
    return (softwareWarranties || []).filter(sw => {
      const asset = (assets || []).find(a => a.id === sw.assetId);
      const q = searchTerm.toLowerCase();
      const matchesSearch = sw.name.toLowerCase().includes(q) ||
                           (asset?.name || '').toLowerCase().includes(q) ||
                           (asset?.tag || '').toLowerCase().includes(q);
      const matchesType = filterType === 'All' || sw.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a,b) => a.expireDate.localeCompare(b.expireDate));
  }, [softwareWarranties, assets, searchTerm, filterType]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const initialFormData = {
    name: '', type: 'Software' as any, assetId: '', purchaseDate: today, expireDate: today
  };

  const {
    formData,
    setFormData,
    resetForm,
    clearPersistence,
    isDirty
  } = useFormPersistence('software_warranties_form', initialFormData, showForm && !editingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateSoftwareWarranty(editingId, formData);
        setEditingId(null);
      } else {
        await addSoftwareWarranty(formData);
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting software warranty:', error);
    }
  };

  const handleEdit = (sw: any) => {
    setFormData({
      name: sw.name,
      type: sw.type,
      assetId: sw.assetId || '',
      purchaseDate: sw.purchaseDate,
      expireDate: sw.expireDate
    });
    setEditingId(sw.id);
    setShowForm(true);
  };

  const handleRenewClick = (sw: any) => {
    setRenewingWarranty(sw);
    setRenewalPeriod('1year');
    
    const isExpired = isLicenseExpired(sw.expireDate);
    const start = isExpired ? today : (sw.expireDate || today);
    setRenewalStartDate(start);
    
    const startD = new Date(start);
    if (!isNaN(startD.getTime())) {
      startD.setFullYear(startD.getFullYear() + 1);
      setRenewalExpireDate(format(startD, 'yyyy-MM-dd'));
    } else {
      setRenewalExpireDate(today);
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setRenewalStartDate(newStart);
    if (renewalPeriod !== 'custom') {
      const years = renewalPeriod === '1year' ? 1 : renewalPeriod === '2year' ? 2 : 3;
      const startD = new Date(newStart);
      if (!isNaN(startD.getTime())) {
        startD.setFullYear(startD.getFullYear() + years);
        setRenewalExpireDate(format(startD, 'yyyy-MM-dd'));
      }
    }
  };

  const handlePeriodChange = (period: '1year' | '2year' | '3year' | 'custom') => {
    setRenewalPeriod(period);
    if (period !== 'custom') {
      const years = period === '1year' ? 1 : period === '2year' ? 2 : 3;
      const startD = new Date(renewalStartDate);
      if (!isNaN(startD.getTime())) {
        startD.setFullYear(startD.getFullYear() + years);
        setRenewalExpireDate(format(startD, 'yyyy-MM-dd'));
      }
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingWarranty) return;
    try {
      await updateSoftwareWarranty(renewingWarranty.id, {
        purchaseDate: renewalStartDate,
        expireDate: renewalExpireDate
      });
      setRenewingWarranty(null);
    } catch (error) {
      console.error('Error renewing software warranty:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Software & Warranties</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Track license expirations and hardware warranties.</p>
        </div>
        <button onClick={() => {
          setFormData({ name: '', type: 'Software', assetId: '', purchaseDate: today, expireDate: today });
          setEditingId(null);
          setShowForm(!showForm);
        }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Edit Warranty / License' : 'Add Software / Warranty'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Name / Title</label>
              <input 
                required 
                type="text" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Windows 11 Pro, Dell ProSupport" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
              <select 
                required 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="Software">Software License</option>
                <option value="Warranty">Hardware Warranty</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Related Asset</label>
              <select 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.assetId} 
                onChange={e => setFormData({...formData, assetId: e.target.value})}
              >
                <option value="">None</option>
                {(assets || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purchase Date</label>
              <input 
                required 
                type="date" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.purchaseDate} 
                onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expire Date</label>
              <input 
                required 
                type="date" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.expireDate} 
                onChange={e => setFormData({...formData, expireDate: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="flex gap-4 pt-4">
            {isDirty && !editingId && (
              <button 
                type="button"
                onClick={resetForm}
                className="mr-auto flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-3 h-3" /> Clear Draft
              </button>
            )}
            <button 
              type="button" 
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }} 
              className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-400 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 font-black uppercase tracking-widest text-[10px] transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              {editingId ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!renewingWarranty}
        onClose={() => setRenewingWarranty(null)}
        title={`Renew: ${renewingWarranty?.name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRenewalSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Current Period</span>
                <span className="text-gray-600 dark:text-gray-300 font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-700">
                  {renewingWarranty?.purchaseDate} to {renewingWarranty?.expireDate}
                </span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Status</span>
                {renewingWarranty && isLicenseExpired(renewingWarranty.expireDate) ? (
                  <span className="text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-950 text-[10px] font-black uppercase tracking-wider">Expired</span>
                ) : (
                  <span className="text-green-500 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded border border-green-100 dark:border-green-950 text-[10px] font-black uppercase tracking-wider">Active</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Extension duration</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '1year', label: '+1 Year' },
                  { id: '2year', label: '+2 Years' },
                  { id: '3year', label: '+3 Years' },
                  { id: 'custom', label: 'Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePeriodChange(item.id as any)}
                    className={clsx(
                      "py-2.5 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all border text-center",
                      renewalPeriod === item.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Start Date</label>
                <input
                  required
                  type="date"
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={renewalStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Expire Date</label>
                <input
                  required
                  type="date"
                  disabled={renewalPeriod !== 'custom'}
                  className={clsx(
                    "w-full rounded-xl border p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
                    renewalPeriod === 'custom' 
                      ? "border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white" 
                      : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 text-gray-400 cursor-not-allowed"
                  )}
                  value={renewalExpireDate}
                  onChange={(e) => setRenewalExpireDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRenewingWarranty(null)}
              className="flex-1 px-5 py-3 border-2 border-gray-100 dark:border-gray-800 text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-bold uppercase tracking-widest text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98]"
            >
              Renew License
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search software or warranties..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="w-full md:w-48 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Software">Software Licenses</option>
          <option value="Warranty">Hardware Warranties</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchase</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expire</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredWarranties.map(sw => {
              const asset = (assets || []).find(a => a.id === sw.assetId);
              const isExpired = isLicenseExpired(sw.expireDate);
              return (
                <tr key={sw.id} id={`warranty-${sw.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">{sw.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sw.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset ? asset.name : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sw.purchaseDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sw.expireDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isExpired ? (
                      <span className="px-2 py-1 inline-flex text-[10px] font-bold rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider">Expired</span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-[10px] font-bold rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wider">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleRenewClick(sw)} 
                        title="Renew License / Warranty"
                        className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(sw)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteSoftwareWarranty(sw.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(softwareWarranties || []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic text-sm">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
