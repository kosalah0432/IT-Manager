import React, { useState } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { 
  Plus, Search, BookOpen, ChevronRight, ChevronDown, 
  Trash2, Edit2, AlertTriangle, CheckCircle2, Info,
  X, Save, ArrowRight, ArrowLeft, Image as ImageIcon,
  ListTodo, FileText, Upload, Download, Paperclip, Check, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import Modal from '../components/Modal';
import ImageModal from '../components/ImageModal';
import { generateId } from '../utils/id';
import * as T from '../types';

export default function Procedures() {
  const { procedures, addProcedure, updateProcedure, deleteProcedure, currentUser, users } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'All' | 'My'>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleExportSopPdf = (p: T.Procedure) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      const topMargin = 25;
      const bottomMargin = 25;
      let yPos = topMargin;

      // 1. Title Block
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, yPos, 4, 16, 'F');

      // Category
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text((p.category || 'General').toUpperCase(), margin + 7, yPos + 4, { align: 'left' });

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      const sanitizedTitle = (p.title || '').replace(/\s+/g, ' ').trim();
      const titleLines = doc.splitTextToSize(sanitizedTitle, contentWidth - 10);
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 7, yPos + 11 + (i * 6.5), { align: 'left' });
      });
      
      yPos += (titleLines.length * 6.5) + 10;

      // Metadata
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const author = users.find(u => u.id === p.userId)?.name || p.userId || 'System';
      doc.text(`Created By: ${author}  |  Last Updated: ${new Date(p.updatedAt).toLocaleDateString()}`, margin, yPos, { align: 'left' });
      
      yPos += 6;

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 10;

      // 2. Overview / Description
      if (p.description) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const sanitizedDesc = p.description.replace(/\s+/g, ' ').trim();
        const descLines = doc.splitTextToSize(sanitizedDesc, contentWidth - 10);
        
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPos, contentWidth, descLines.length * 5 + 6, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.rect(margin, yPos, contentWidth, descLines.length * 5 + 6, 'S');
        
        descLines.forEach((line: string, i: number) => {
          doc.text(line, margin + 5, yPos + 5.5 + (i * 5), { align: 'left' });
        });
        
        yPos += descLines.length * 5 + 14;
      }

      // 3. Steps Block
      if (p.steps && p.steps.length > 0) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229);
        doc.text("INSTRUCTIONS & STEPS", margin, yPos, { align: 'left' });
        yPos += 4;

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, margin + 35, yPos);
        yPos += 8;

        const imgWidth = 140;
        const imgHeight = 78;

        p.steps.forEach((step, index) => {
          // Explicitly set the font and size beforehand so splitTextToSize has perfect context
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.5);
          
          const sanitizedStepText = (step.text || '').replace(/\s+/g, ' ').trim();
          const stepTextLines = doc.splitTextToSize(sanitizedStepText, contentWidth - 25);
          
          let neededHeight = (stepTextLines.length * 5.5) + 6;
          if (step.image) {
            neededHeight += imgHeight + 10;
          }

          if (yPos + neededHeight > pageHeight - bottomMargin) {
            doc.addPage();
            yPos = topMargin;
          }

          // Badge
          doc.setFillColor(79, 70, 229);
          doc.rect(margin, yPos, 16, 5.5, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`STEP ${index + 1}`, margin + 2, yPos + 4, { align: 'left' });

          // Text
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          stepTextLines.forEach((line: string, idx: number) => {
            doc.text(line, margin + 20, yPos + 4 + (idx * 5.5), { align: 'left' });
          });

          yPos += (stepTextLines.length * 5.5) + 6;

          // Image if any
          if (step.image) {
            if (yPos + imgHeight + 6 > pageHeight - bottomMargin) {
              doc.addPage();
              yPos = topMargin;
            }

            try {
              const xCenter = margin + (contentWidth - imgWidth) / 2;
              
              doc.addImage(step.image, 'JPEG', xCenter, yPos, imgWidth, imgHeight);
              
              doc.setDrawColor(203, 213, 225);
              doc.setLineWidth(0.2);
              doc.rect(xCenter, yPos, imgWidth, imgHeight, 'S');
              
              yPos += imgHeight + 8;
            } catch (err) {
              console.error('PDF image fail:', err);
              yPos += 4;
            }
          } else {
            yPos += 2;
          }
        });
      }

      // 4. Troubleshooting
      if (p.troubleshooting && p.troubleshooting.length > 0) {
        if (yPos + 25 > pageHeight - bottomMargin) {
          doc.addPage();
          yPos = topMargin;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(217, 119, 6);
        doc.text("TROUBLESHOOTING & SOLUTIONS", margin, yPos, { align: 'left' });
        yPos += 4;

        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, margin + 50, yPos);
        yPos += 8;

         p.troubleshooting.forEach((t) => {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(10);
          const sanitizedErrorInput = (t.error || '').replace(/\s+/g, ' ').trim();
          const errorLines = doc.splitTextToSize(sanitizedErrorInput, contentWidth - 10);
          
          let fixesHeight = 0;
          if (t.fixes && t.fixes.length > 0) {
            t.fixes.forEach((f) => {
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9.5);
              const sanitizedFixTextTemp = `✓ Solution: ${f.text}`.replace(/\s+/g, ' ').trim();
              const lines = doc.splitTextToSize(sanitizedFixTextTemp, contentWidth - 15);
              fixesHeight += (lines.length * 5) + 2;
            });
          }
          
          const needed = (errorLines.length * 5) + fixesHeight + 10;
          if (yPos + needed > pageHeight - bottomMargin) {
            doc.addPage();
            yPos = topMargin;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(180, 83, 9);
          errorLines.forEach((line: string, idx: number) => {
            doc.text(line, margin, yPos + (idx * 5), { align: 'left' });
          });
          yPos += (errorLines.length * 5) + 3;

          if (t.fixes && t.fixes.length > 0) {
            t.fixes.forEach((f) => {
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9.5);
              const sanitizedFixText = `✓ Solution: ${f.text}`.replace(/\s+/g, ' ').trim();
              const solLines = doc.splitTextToSize(sanitizedFixText, contentWidth - 15);
              if (yPos + (solLines.length * 5) > pageHeight - bottomMargin) {
                doc.addPage();
                yPos = topMargin;
              }
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9.5);
              doc.setTextColor(71, 85, 105);
              solLines.forEach((line: string, idx: number) => {
                doc.text(line, margin + 4, yPos + (idx * 5), { align: 'left' });
              });
              yPos += (solLines.length * 5) + 2;
            });
          }
          yPos += 4;
        });
      }

      // 5. Notes
      if (p.additionalNotes) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        const sanitizedNotes = p.additionalNotes.replace(/\s+/g, ' ').trim();
        const noteLines = doc.splitTextToSize(sanitizedNotes, contentWidth - 10);
        const needed = (noteLines.length * 5) + 16;
        if (yPos + needed > pageHeight - bottomMargin) {
          doc.addPage();
          yPos = topMargin;
        }

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("ADDITIONAL TECHNICAL NOTES", margin, yPos, { align: 'left' });
        yPos += 4;

        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, margin + 40, yPos);
        yPos += 8;

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, yPos, contentWidth, (noteLines.length * 5) + 8, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.rect(margin, yPos, contentWidth, (noteLines.length * 5) + 8, 'S');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        noteLines.forEach((line: string, idx: number) => {
          doc.text(line, margin + 5, yPos + 6 + (idx * 5), { align: 'left' });
        });

        yPos += (noteLines.length * 5) + 14;
      }

      // 6. Footer post-process
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        if (i > 1) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(p.title.toUpperCase(), margin, 12, { align: 'left' });
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(margin, 14, pageWidth - margin, 14);
        }

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.text("IT Department SOP", margin, pageHeight - 8, { align: 'left' });
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      const filename = `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_sop.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error('Failed to generate PDF SOP:', e);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const isAdmin = currentUser?.role === 'Admin';
  const isTech = currentUser?.role === 'Technician';
  const canEdit = (p?: T.Procedure) => {
    if (isAdmin || isTech) return true;
    if (p && p.userId === currentUser?.id) return true;
    return false;
  };

  const categories = React.useMemo(() => ['All', ...new Set((procedures || []).map(p => p.category).filter(Boolean) as string[])], [procedures]);

  const filteredProcedures = React.useMemo(() => (procedures || []).filter(p => {
    // Show if user is admin/tech OR if it's public OR if it's user's own OR explicitly allowed
    const isExplicitlyAllowed = (p.allowedUserIds?.includes(currentUser?.id || '')) ||
                                 (p.allowedRoles?.includes(currentUser?.role as any));
    
    const isVisible = isAdmin || isTech || p.isPublic || p.userId === currentUser?.id || isExplicitlyAllowed;
    if (!isVisible) return false;

    if (activeView === 'My' && p.userId !== currentUser?.id) return false;

    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [procedures, searchTerm, selectedCategory, isAdmin, isTech, currentUser?.id, activeView]);

  const initialFormData = {
    title: '',
    description: '',
    category: '',
    steps: [] as { id: string; text: string; image: string }[],
    troubleshooting: [] as { error: string; fixes: { text: string; image: string }[] }[],
    additionalNotes: '',
    pdfUrl: '',
    isPublic: false,
    allowedUserIds: [] as string[],
    allowedRoles: [] as T.Role[]
  };

  const {
    formData,
    setFormData,
    updateForm,
    resetForm,
    clearPersistence,
    isDirty
  } = useFormPersistence('procedures_form', initialFormData, isAdding && !editingId);

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...(prev.steps || []), { id: generateId(), text: '', image: '' }]
    }));
  };

  const handleStepImage = async (id: string, file: File) => {
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({
        ...prev,
        steps: (prev.steps || []).map(s => s.id === id ? { ...s, image: compressed } : s)
      }));
    } catch (e) {
      console.error('Image compression failed:', e);
    }
  };

  const handlePdfUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setFormData(prev => ({ ...prev, pdfUrl: base64 }));
    } catch (e) {
      console.error('PDF upload failed:', e);
    }
  };

  const handleRemoveStep = (id: string) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).filter(s => s.id !== id)
    }));
  };

  const handleStepChange = (id: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      steps: (prev.steps || []).map(s => s.id === id ? { ...s, text } : s)
    }));
  };

  const handleAddTrouble = () => {
    setFormData(prev => ({
      ...prev,
      troubleshooting: [...(prev.troubleshooting || []), { error: '', fixes: [] }]
    }));
  };

  const handleTroubleChange = (index: number, field: 'error', value: string) => {
    setFormData(prev => {
      const updated = [...(prev.troubleshooting || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, troubleshooting: updated };
    });
  };

  const handleAddFix = (troubleIndex: number) => {
    setFormData(prev => {
      const updated = [...(prev.troubleshooting || [])];
      if (updated[troubleIndex]) {
        updated[troubleIndex].fixes = [...(updated[troubleIndex].fixes || []), { text: '', image: '' }];
      }
      return { ...prev, troubleshooting: updated };
    });
  };

  const handleFixChange = (troubleIndex: number, fixIndex: number, text: string) => {
    setFormData(prev => {
      const updated = [...(prev.troubleshooting || [])];
      if (updated[troubleIndex] && updated[troubleIndex].fixes && updated[troubleIndex].fixes[fixIndex]) {
        updated[troubleIndex].fixes[fixIndex] = { ...updated[troubleIndex].fixes[fixIndex], text };
      }
      return { ...prev, troubleshooting: updated };
    });
  };

  const handleRemoveTrouble = (index: number) => {
    setFormData(prev => ({
      ...prev,
      troubleshooting: (prev.troubleshooting || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.title) return;
    
    try {
      if (editingId) {
        await updateProcedure(editingId, formData);
        setEditingId(null);
      } else {
        await addProcedure(formData);
        clearPersistence();
      }
      setIsAdding(false);
      resetForm();
    } catch (error) {
      console.error('Error saving procedure:', error);
    }
  };

  const startEdit = (p: T.Procedure) => {
    setFormData({
      title: p.title,
      description: p.description || '',
      category: p.category || '',
      steps: p.steps || [],
      troubleshooting: p.troubleshooting || [],
      additionalNotes: p.additionalNotes || '',
      pdfUrl: p.pdfUrl || '',
      isPublic: !!p.isPublic,
      allowedUserIds: p.allowedUserIds || [],
      allowedRoles: p.allowedRoles || []
    });
    setEditingId(p.id);
    setIsAdding(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Knowledge Base
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Standard operating procedures and troubleshooting guides.</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              title: '',
              description: '',
              category: '',
              steps: [],
              troubleshooting: [],
              additionalNotes: '',
              pdfUrl: '',
              isPublic: false,
              allowedUserIds: [],
              allowedRoles: []
            });
            setEditingId(null);
            setIsAdding(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Procedure
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveView('All')}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeView === 'All' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            All Guides
          </button>
          <button
            onClick={() => setActiveView('My')}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeView === 'My' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            My Guides
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search procedures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(categories || []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {(filteredProcedures || []).map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                    {p.category || 'General'}
                  </span>
                  {p.isPublic && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md ml-2">
                       Public
                    </span>
                  )}
                  {canEdit(p) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProcedure(p.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{p.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 h-10">
                  {p.description || 'No description provided.'}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      {p.steps.length} Steps
                    </span>
                    {p.troubleshooting && p.troubleshooting.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="w-3 h-3" />
                        {p.troubleshooting.length} Fixes
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExportSopPdf(p)}
                      title="Export SOP as PDF"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-450 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewingId(p.id)}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View Guide
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAdding}
        onClose={() => { setIsAdding(false); setEditingId(null); }}
        title={editingId ? 'Edit Procedure' : 'New Procedure'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g., Printer Setup Guide"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g., Hardware, Software"
              />
            </div>

            {(isAdmin || isTech) && (
              <>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 md:col-span-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="isPublic" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    Make Public (Visible to everyone)
                  </label>
                </div>

                {!formData.isPublic && (
                  <div className="md:col-span-2 space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Restrict to Specific Roles</label>
                      <div className="flex flex-wrap gap-2">
                        {['Admin', 'Technician', 'User'].map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              const roles = formData.allowedRoles || [];
                              setFormData(prev => ({
                                ...prev,
                                allowedRoles: roles.includes(role as any) 
                                  ? roles.filter(r => r !== role)
                                  : [...roles, role as any]
                              }));
                            }}
                            className={clsx(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                              formData.allowedRoles?.includes(role as any)
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                            )}
                          >
                            {role}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Restrict to Specific Users</label>
                      <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
                        {users.map((u) => (
                          <div 
                            key={u.id}
                            onClick={() => {
                              const userIds = formData.allowedUserIds || [];
                              setFormData(prev => ({
                                ...prev,
                                allowedUserIds: userIds.includes(u.id)
                                  ? userIds.filter(id => id !== u.id)
                                  : [...userIds, u.id]
                              }));
                            }}
                            className={clsx(
                              "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border",
                              formData.allowedUserIds?.includes(u.id)
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                          >
                            <div className={clsx(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                              formData.allowedUserIds?.includes(u.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"
                            )}>
                              {formData.allowedUserIds?.includes(u.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{u.name}</span>
                            <span className="text-[8px] text-gray-400 uppercase font-black ml-auto">{u.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FileText className="w-3 h-3 text-red-500" />
              PDF Document (Optional)
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-500 transition-all cursor-pointer group">
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                <span className="text-sm font-bold text-gray-500 group-hover:text-blue-500">{formData.pdfUrl ? 'Change PDF' : 'Upload PDF Document'}</span>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])} 
                />
              </label>
              {formData.pdfUrl && (
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, pdfUrl: '' }))}
                  className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px] resize-none"
              placeholder="Briefly describe what this procedure covers..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ListTodo className="w-3 h-3 text-blue-500" />
                Step-by-Step Instructions
              </label>
              <button 
                onClick={handleAddStep}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add New Step
              </button>
            </div>
            <div className="space-y-4">
              {(formData.steps || []).map((step, index) => (
                <div key={step.id} className="p-5 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-200 dark:shadow-none">
                      {index + 1}
                    </span>
                    <textarea
                      value={step.text}
                      onChange={(e) => handleStepChange(step.id, e.target.value)}
                      className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px] resize-none shadow-sm"
                      placeholder={`Describe step ${index + 1}...`}
                    />
                    <button 
                      onClick={() => handleRemoveStep(step.id)}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 pl-12">
                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 cursor-pointer transition-colors bg-white dark:bg-gray-900 px-3 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                      <ImageIcon className="w-4 h-4" />
                      {step.image ? 'Change Reference Image' : 'Add Reference Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleStepImage(step.id, e.target.files[0])} 
                      />
                    </label>
                    {step.image && (
                      <div className="relative group">
                        {step.image && (
                          <img src={step.image} className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-md transition-transform group-hover:scale-105" />
                        )}
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, steps: (prev.steps || []).map(s => s.id === step.id ? { ...s, image: '' } : s) }))}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Troubleshooting Guide
              </label>
              <button 
                onClick={handleAddTrouble}
                className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New Common Issue
              </button>
            </div>
            <div className="space-y-4">
              {(formData.troubleshooting || []).map((t, tIndex) => (
                <div key={tIndex} className="p-5 border border-amber-100 dark:border-amber-900/30 rounded-2xl bg-amber-50/20 dark:bg-amber-900/5 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-bold text-amber-600 uppercase ml-1">Reported Issue / Error</label>
                      <input
                        type="text"
                        value={t.error}
                        onChange={(e) => handleTroubleChange(tIndex, 'error', e.target.value)}
                        className="w-full rounded-xl border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 border p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        placeholder="e.g., Device not responding, 404 Error..."
                      />
                    </div>
                    <button onClick={() => handleRemoveTrouble(tIndex)} className="p-4 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all self-end">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="pl-6 space-y-3 border-l-2 border-amber-200 dark:border-amber-900/40 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended Solutions</span>
                      <button onClick={() => handleAddFix(tIndex)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Fix
                      </button>
                    </div>
                    {(t.fixes || []).map((fix, fIndex) => (
                      <div key={fIndex} className="flex gap-3 items-center group">
                        <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                        <input
                          type="text"
                          value={fix.text}
                          onChange={(e) => handleFixChange(tIndex, fIndex, e.target.value)}
                          className="flex-1 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 border p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                          placeholder="Provide the fix description..."
                        />
                        <button 
                          onClick={() => {
                            const updated = [...(formData.troubleshooting || [])];
                            updated[tIndex].fixes = updated[tIndex].fixes.filter((_, i) => i !== fIndex);
                            setFormData(prev => ({ ...prev, troubleshooting: updated }));
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Technical Notes</label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
              className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px] resize-none shadow-sm"
              placeholder="Any extra info, security warnings, or technical tips..."
            />
          </div>

          <div className="flex gap-4 pt-6">
            {isDirty && !editingId && (
              <button 
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <RotateCcw className="w-3 h-3" /> Clear Draft
              </button>
            )}
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-400 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 font-black uppercase tracking-widest text-[10px] transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Save className="w-5 h-5" />
              {editingId ? 'Update KB Article' : 'Create KB Article'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingId}
        onClose={() => setViewingId(null)}
        title={procedures.find(p => p.id === viewingId)?.title || 'View Guide'}
        maxWidth="max-w-4xl"
      >
        {(() => {
          const p = procedures.find(proc => proc.id === viewingId);
          if (!p) return null;
          return (
            <div className="space-y-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed font-medium">{p.description}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {p.pdfUrl && (
                    <a 
                      href={p.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white dark:bg-gray-700 px-5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-850 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-gray-600 transition-all shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      View Uploaded PDF
                      <Download className="w-4 h-4 ml-1" />
                    </a>
                  )}
                  <button 
                    onClick={() => handleExportSopPdf(p)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer border border-transparent"
                  >
                    <Download className="w-4 h-4" />
                    Export Guide PDF
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Step-by-Step Instructions
                </h3>
                <div className="space-y-8 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-1 before:bg-gray-100 dark:before:bg-gray-800">
                  {(p.steps || []).map((step, index) => (
                    <div key={step.id} className="relative pl-14">
                      <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black z-10 shadow-lg shadow-indigo-200 dark:shadow-none">
                        {index + 1}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{step.text}</p>
                        {step.image && (
                          <div className="mt-5 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-black/5 flex items-center justify-center max-h-[500px]">
                            {step.image && (
                              <img 
                                src={step.image} 
                                alt={`Step ${index + 1}`} 
                                className="max-w-full max-h-full object-contain cursor-zoom-in hover:scale-[1.02] transition-transform" 
                                loading="lazy"
                                onClick={() => setSelectedImage(step.image!)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {p.troubleshooting && p.troubleshooting.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Troubleshooting Guide
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {(p.troubleshooting || []).map((t, i) => (
                      <div key={i} className="border-2 border-amber-100 dark:border-amber-900/20 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-4 font-bold text-amber-900 dark:text-amber-300 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          {t.error}
                        </div>
                        <div className="p-5 space-y-4 bg-white dark:bg-gray-900">
                          {(t.fixes || []).map((fix, fi) => (
                            <div key={fi} className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 font-medium bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl">
                              <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              {fix.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {p.additionalNotes && (
                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Technical Notes</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap font-medium leading-relaxed">
                    {p.additionalNotes}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                  Last updated: {new Date(p.updatedAt).toLocaleDateString()}
                </div>
                <button 
                  onClick={() => setViewingId(null)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  Close Guide
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ImageModal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        imageUrl={selectedImage || ''} 
      />
    </div>
  );
}
