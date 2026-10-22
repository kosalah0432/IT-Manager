import React, { useState } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';

export default function Locations() {
  const { locations, addLocation, updateLocation, deleteLocation } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormData = { name: '' };
  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('locations', initialFormData, showForm && !editingId);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = (locations || [])
    .filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateLocation(editingId, formData);
        setEditingId(null);
      } else {
        await addLocation(formData);
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Location submission failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id);
    } catch (error) {
      console.error('Location deletion failed:', error);
    }
  };

  const handleEdit = (loc: any) => {
    setFormData({ name: loc.name || '' });
    setEditingId(loc.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage physical locations for your assets.</p>
        </div>
        <button onClick={() => {
          setFormData({ name: '' });
          setEditingId(null);
          setShowForm(!showForm);
        }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-200 dark:shadow-none">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Search locations..." 
            className="w-full pl-4 pr-4 py-2 border rounded-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
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
        title={editingId ? 'Edit Location' : 'Add New Location'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location Name</label>
            <input 
              required 
              type="text" 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Main Office, Server Room" 
            />
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
                {editingId ? 'Update Location' : 'Create Location'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredLocations.map(loc => (
              <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">{loc.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(loc)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(loc.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredLocations.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-gray-400 italic text-sm">No locations defined yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
