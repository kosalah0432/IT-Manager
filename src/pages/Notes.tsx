import React, { useState } from 'react';
import { useStore } from '../store';
import { Note } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  StickyNote, 
  Calendar,
  Tag,
  MoreVertical,
  X,
  Save,
  RotateCcw
} from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

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

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote, currentUser } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'All' | 'My'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; noteId: string | null }>({ isOpen: false, noteId: null });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const isAdmin = currentUser?.role === 'Admin';
  const isTech = currentUser?.role === 'Technician';

  const initialFormData = {
    title: '',
    content: '',
    category: '',
    isPublic: false
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('notes', initialFormData, isModalOpen && !editingNote);

  const filteredNotes = React.useMemo(() => (notes || []).filter(note => {
    const isVisible = isAdmin || isTech || note.isPublic || note.userId === currentUser?.id;
    if (!isVisible) return false;

    if (activeView === 'My' && note.userId !== currentUser?.id) return false;

    return (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes, searchQuery, isAdmin, isTech, currentUser?.id, activeView]);

  const canEdit = (note: Note) => {
    if (isAdmin || isTech) return true;
    return note.userId === currentUser?.id;
  };

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content,
        category: note.category || '',
        isPublic: note.isPublic || false
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        category: '',
        isPublic: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNote) {
      await updateNote(editingNote.id, formData);
    } else {
      await addNote(formData);
      clearPersistence();
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ isOpen: true, noteId: id });
  };

  const confirmDeleteNote = async () => {
    if (confirmDelete.noteId) {
      await deleteNote(confirmDelete.noteId);
      setConfirmDelete({ isOpen: false, noteId: null });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <StickyNote className="w-8 h-8 text-indigo-600" />
            My Notes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your private thoughts and snippets</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Note
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {(filteredNotes || []).map((note) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{note.title}</h3>
                  {note.category && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mt-1">
                      <Tag className="w-3 h-3" />
                      {note.category}
                    </span>
                  )}
                  {note.isPublic && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 mt-1 ml-1">
                      Public
                    </span>
                  )}
                </div>
                {canEdit(note) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(note)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-4 mb-4 whitespace-pre-wrap">
                {note.content}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {safeFormatAndParse(note.updatedAt, 'MMM d, yyyy')}
                </div>
                {note.userId && (
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    By {currentUser?.id === note.userId ? 'You' : 'Team Member'}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-20">
          <StickyNote className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notes found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or add a new note</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edit Note' : 'Add New Note'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
              <input 
                required 
                type="text" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Note title..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
              <input 
                type="text" 
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                placeholder="e.g. Server, Network, Personal..." 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Content</label>
            <textarea 
              required 
              rows={8} 
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              placeholder="Write your note here..." 
            />
          </div>
          
          <div className="flex gap-4 pt-4 items-center">
            {isDirty && !editingNote && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" /> Clear Draft
              </button>
            )}
            <div className="flex gap-3 ml-auto flex-1">
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingNote(null);
                }} 
                className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-400 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingNote ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, noteId: null })}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
      />
    </div>
  );
}
