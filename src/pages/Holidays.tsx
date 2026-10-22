import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useLocation } from 'react-router-dom';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Holidays() {
  const { holidays, addHoliday, updateHoliday, deleteHoliday, workDays, updateWorkDays, officeHours, updateOfficeHours, addNotification } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`holiday-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({ ...location.state, scrollToId: undefined }, document.title);
    }
  }, [location.state]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const initialFormData = { date: today, reason: '' };
  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('holidays', initialFormData, showForm && !editingId);

  const [hoursData, setHoursData] = useState(officeHours);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHolidays = (holidays || [])
    .filter(h => h.reason.toLowerCase().includes(searchTerm.toLowerCase()) || h.date.includes(searchTerm))
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateHoliday(editingId, formData);
        addNotification('Holiday updated successfully', 'success');
        setEditingId(null);
      } else {
        await addHoliday(formData);
        addNotification('Holiday added successfully', 'success');
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting holiday:', error);
      addNotification(`Failed to ${editingId ? 'update' : 'add'} holiday`, 'error');
    }
  };

  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOfficeHours(hoursData);
      addNotification('Office hours updated successfully', 'success');
    } catch (error) {
      console.error('Error updating office hours:', error);
      addNotification('Failed to update office hours', 'error');
    }
  };

  const handleEdit = (holiday: any) => {
    setFormData({ date: holiday.date, reason: holiday.reason });
    setEditingId(holiday.id);
    setShowForm(true);
  };

  const toggleWorkDay = async (day: string) => {
    try {
      if (workDays.includes(day)) {
        await updateWorkDays(workDays.filter(d => d !== day));
      } else {
        await updateWorkDays([...workDays, day]);
      }
      addNotification('Work days updated successfully', 'success');
    } catch (error) {
      console.error('Error updating work days:', error);
      addNotification('Failed to update work days', 'error');
    }
  };

  const handleDeleteHoliday = async () => {
    if (!isDeleting) return;
    try {
      await deleteHoliday(isDeleting);
      addNotification('Holiday deleted successfully', 'success');
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      addNotification('Failed to delete holiday', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holidays & Work Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage company holidays, weekly work days, and office hours.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Work Days Setup */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" /> Weekly Work Days
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select the days your company operates.</p>
          <div className="flex flex-wrap gap-2">
            {(DAYS || []).map(day => {
              const isActive = (workDays || []).includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleWorkDay(day)}
                  className={clsx(
                    "px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all border",
                    isActive 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none" 
                      : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Office Hours Setup */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-emerald-500" /> Office Hours
          </h2>
          <form onSubmit={handleHoursSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Opening Time</label>
                <input 
                  type="time" 
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={hoursData.open} 
                  onChange={e => setHoursData({...hoursData, open: e.target.value})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Closing Time</label>
                <input 
                  type="time" 
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500" 
                  value={hoursData.close} 
                  onChange={e => setHoursData({...hoursData, close: e.target.value})} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                  checked={hoursData.enabled} 
                  onChange={e => setHoursData({...hoursData, enabled: e.target.checked})} 
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Schedule Alerts</span>
              </label>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-bold uppercase tracking-wider text-[10px] shadow-md shadow-emerald-200 dark:shadow-none">
                Update Hours
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-500" /> Special Holidays
        </h2>
        <button onClick={() => {
          setFormData({ date: today, reason: '' });
          setEditingId(null);
          setShowForm(!showForm);
        }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none">
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Search holidays..." 
            className="w-full pl-4 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        title={editingId ? 'Edit Holiday' : 'Add New Holiday'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
              <input 
                required 
                type="date" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason / Description</label>
              <input 
                required 
                type="text" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.reason} 
                onChange={e => setFormData({...formData, reason: e.target.value})} 
                placeholder="e.g. Poya Day, New Year" 
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4 items-center">
            {isDirty && !editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <div className="flex gap-3 ml-auto flex-1">
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
                {editingId ? 'Update Holiday' : 'Create Holiday'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredHolidays.map(holiday => (
              <tr key={holiday.id} id={`holiday-${holiday.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{holiday.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{holiday.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(holiday)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsDeleting(holiday.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredHolidays.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic text-sm">No special holidays recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDeleteHoliday}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This action cannot be undone."
      />
    </div>
  );
}
