import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useFormPersistence } from '../hooks/useFormPersistence';
import { safeStorage } from '../utils/storage';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, MessageSquare, Calendar, Edit2, ChevronDown, ChevronUp, ChevronRight, Upload, X, ImageIcon, Star, Search, PauseCircle, FileText, Printer, Save, Download, DollarSign, Eye, PenLine, RotateCcw } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { clsx } from 'clsx';
import { format, parseISO, isBefore, isAfter, isSameDay, addDays, startOfDay } from 'date-fns';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { compressImage } from '../utils/image';
import { downloadCSV } from '../utils/csv';
import ConfirmModal from '../components/ConfirmModal';
import ImageModal from '../components/ImageModal';
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

const safeFormat = (dateStr: string | undefined, formatStr: string, fallback: string = 'N/A') => {
  if (!dateStr) return fallback;
  try {
    const date = safeParseISO(dateStr);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr);
  } catch (e) {
    return fallback;
  }
};

const safeIsBefore = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? safeParseISO(d1) : d1;
    const date2 = typeof d2 === 'string' ? safeParseISO(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isBefore(date1, date2);
  } catch (e) {
    return false;
  }
};

const safeIsAfter = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? safeParseISO(d1) : d1;
    const date2 = typeof d2 === 'string' ? safeParseISO(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isAfter(date1, date2);
  } catch (e) {
    return false;
  }
};

const safeIsSameDay = (d1: Date | string | undefined | null, d2: Date | string | undefined | null): boolean => {
  if (!d1 || !d2) return false;
  try {
    const date1 = typeof d1 === 'string' ? safeParseISO(d1) : d1;
    const date2 = typeof d2 === 'string' ? safeParseISO(d2) : d2;
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameDay(date1, date2);
  } catch (e) {
    return false;
  }
};

const FSRModal = ({ isOpen, onClose, issue, users, updateIssue, isReadOnly = false }: any) => {
  const { settings, assets } = useStore();
  const techSigRef = useRef<any>(null);
  const custSigRef = useRef<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [activeDoc, setActiveDoc] = useState<'FSR' | 'Invoice'>('FSR');
  const [formData, setFormData] = useState<any>({
    workPerformed: '',
    hardwareUsed: '',
    softwareUsed: '',
    additionalComments: '',
    timeStarted: '',
    timeFinished: '',
    totalTimeSpent: '',
    customerSatisfied: false,
    technicianSignature: '',
    customerSignature: '',
    createdAt: new Date().toISOString()
  });
  const [isDirty, setIsDirty] = useState(false);
  const prevIssueIdRef = useRef<string | null>(null);

  useEffect(() => {
    const defaults = {
      workPerformed: '',
      partsUsed: '',
      hardwareUsed: '',
      softwareUsed: '',
      timeStarted: '',
      timeFinished: '',
      totalTimeSpent: '',
      statusAfterService: 'Fully Operational',
      additionalComments: '',
      customerSignature: '',
      technicianSignature: '',
      customerSatisfied: false,
      isBillable: false,
      price: 0,
      ticketDescription: issue?.description || '',
      userFeedback: issue?.feedback?.comment || '',
      serviceProviderName: settings.service_provider_name || 'ECOM SOLUTION',
      companyName: settings.company_name || 'MULTIFORMCHEMICALS',
      createdAt: new Date().toISOString()
    };

    const shouldReset = prevIssueIdRef.current !== issue?.id || !isDirty;

    if (shouldReset) {
      setActiveDoc('FSR');
      const draftKey = `fsr_draft_${issue?.id}`;
      const savedDraft = safeStorage.getItem(draftKey);
      
      if (issue?.fsr) {
        setFormData({ ...defaults, ...issue.fsr });
      } else if (savedDraft) {
        try {
          setFormData({ ...defaults, ...JSON.parse(savedDraft) });
          setIsDirty(true);
        } catch (e) {
          setFormData(defaults);
        }
      } else {
        setFormData(defaults);
      }
      setIsDirty(false);
      prevIssueIdRef.current = issue?.id || null;
    }
  }, [issue?.id, issue?.fsr?.updatedAt]);

  useEffect(() => {
    if (isDirty && issue?.id) {
      safeStorage.setItem(`fsr_draft_${issue.id}`, JSON.stringify(formData));
    }
  }, [formData, isDirty, issue?.id]);

  const updateFormData = (updates: any) => {
    setFormData((prev: any) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  useEffect(() => {
    if (formData.timeStarted && formData.timeFinished) {
      try {
        const [h1, m1] = formData.timeStarted.split(':').map(Number);
        const [h2, m2] = formData.timeFinished.split(':').map(Number);
        
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight
        
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        
        const calculatedResult = `${hours}h ${mins}m`.toUpperCase();
        if (formData.totalTimeSpent !== calculatedResult) {
          updateFormData({ totalTimeSpent: calculatedResult });
        }
      } catch (e) {
        // Silently fail if time format is invalid
      }
    }
  }, [formData.timeStarted, formData.timeFinished]);

  const reporter = users.find((u: any) => u.id === issue?.reportedByUserId);
  const tech = users.find((u: any) => u.id === issue?.assignedToUserId);
  const asset = assets.find((a: any) => a.id === issue?.assetId);

  const handleSave = async () => {
    const updatedFSR = { ...formData };
    if (techSigRef.current && !techSigRef.current.isEmpty()) {
      updatedFSR.technicianSignature = techSigRef.current.toDataURL();
    }
    if (custSigRef.current && !custSigRef.current.isEmpty()) {
      updatedFSR.customerSignature = custSigRef.current.toDataURL();
    }
    await updateIssue(issue.id, { fsr: updatedFSR });
    safeStorage.removeItem(`fsr_draft_${issue.id}`);
    setIsDirty(false);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('fsr-content');
    if (!element) return;
    
    const originalPreviewState = isPreview;
    setIsGeneratingPDF(true);
    
    // Always switch to preview mode for the best quality PDF capture
    // Preview mode uses divs/imgs instead of inputs/canvases which html2canvas handles poorly
    setIsPreview(true);
    
    // Capture signatures if they are in the canvas but not fixed in formData
    const tempFSR = { ...formData };
    let hasNewSigs = false;
    if (techSigRef.current && !techSigRef.current.isEmpty()) {
      tempFSR.technicianSignature = techSigRef.current.toDataURL();
      hasNewSigs = true;
    }
    if (custSigRef.current && !custSigRef.current.isEmpty()) {
      tempFSR.customerSignature = custSigRef.current.toDataURL();
      hasNewSigs = true;
    }
    
    if (hasNewSigs) {
      setFormData(tempFSR);
    }

    // Wait for React to re-render in preview mode
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Create a clean capture
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('fsr-content');
          if (el) {
            // Force styles for clean capture
            el.style.width = '210mm';
            el.style.backgroundColor = '#ffffff';
            el.style.color = '#000000';
            el.style.boxShadow = 'none';
            el.style.border = 'none';
            el.style.padding = '10mm';
            
            // Fix black boxes by forcing all backgrounds to white/transparent
            const allElements = el.querySelectorAll('*');
            allElements.forEach((node: any) => {
              const htmlNode = node as HTMLElement;
              if (htmlNode.style) {
                // EXTREME RESET to avoid black boxes
                htmlNode.style.backgroundColor = 'transparent';
                
                // If it's a structural container or specific high-level div, force white
                if (htmlNode.tagName === 'DIV' && (htmlNode.className.includes('border') || htmlNode.className.includes('p-') || htmlNode.className.includes('bg-white'))) {
                   htmlNode.style.backgroundColor = '#ffffff';
                }

                // Specifically for signatures and images
                if (htmlNode.tagName === 'IMG') {
                   htmlNode.style.backgroundColor = 'transparent';
                }

                htmlNode.style.color = '#000000';
                htmlNode.style.borderColor = '#000000';
                htmlNode.style.boxShadow = 'none';
                htmlNode.style.textShadow = 'none';
                htmlNode.style.filter = 'none';
                htmlNode.style.backgroundImage = 'none';
                htmlNode.style.outline = 'none';
              }
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 16
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate ratio to fit perfectly without distortion
      const canvasRatio = canvas.height / canvas.width;
      const a4Ratio = 297 / 210;
      
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      
      if (canvasRatio > a4Ratio) {
        finalWidth = pdfHeight / canvasRatio;
      } else {
        finalHeight = pdfWidth * canvasRatio;
      }

      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'SLOW');
      pdf.save(`${activeDoc === 'Invoice' ? 'INVOICE' : 'FSR'}_${issue.id}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      setIsPreview(originalPreviewState);
    }
  };

  if (!isOpen || !issue) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="FIELD SERVICE REPORT (FSR)"
      maxWidth={isPreview ? "max-w-6xl" : "max-w-5xl"}
    >
      <div className={clsx(
        "pdf-safe transition-all duration-500 relative flex flex-col",
        isPreview 
          ? "bg-gray-200 p-4 transition-all duration-300" 
          : "bg-white dark:bg-gray-900 p-4 overflow-y-auto max-h-[85vh]"
      )}>
        {/* Document Selection Tabs (Only shown if FSR is billable) */}
        {formData.isBillable && (
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit select-none mx-auto print:hidden">
            <button
              type="button"
              onClick={() => setActiveDoc('FSR')}
              className={clsx(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeDoc === 'FSR' 
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              Field Service Report (FSR)
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('Invoice')}
              className={clsx(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                activeDoc === 'Invoice' 
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              Client Invoice
            </button>
          </div>
        )}

        {/* Billing Information Card (Only shown during Edit Mode) */}
        {!isPreview && !isReadOnly && (
          <div className="w-full mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="grid gap-1">
              <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Billing & Invoice Configuration
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Marking items as billable automatically generates a matching payment invoice for the client.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {/* Billable Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={formData.isBillable || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateFormData({ isBillable: checked });
                    if (!checked) setActiveDoc('FSR');
                  }}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Billable Item</span>
              </label>

              {/* Price input field */}
              {formData.isBillable && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-505 uppercase tracking-wider">Service Price:</span>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-xs font-black">$</span>
                    </div>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="pl-6 pr-2 py-1 w-24 text-xs font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={clsx(
          "flex flex-col items-center",
          isPreview ? "overflow-y-auto h-[80vh] w-full" : "w-full"
        )}>
          <div 
            id="fsr-content"
            style={isPreview ? { 
              transform: 'scale(0.72)', 
              transformOrigin: 'top center',
            } : {}}
            className={clsx(
              "transition-all duration-500 bg-white text-black shrink-0",
              isPreview 
                ? "w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl relative border border-gray-400 mb-[-83mm]" 
                : "w-full p-4 md:p-8 rounded-sm border border-gray-200"
            )}
          >
            {/* Professional Header - Centered Style */}
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                {formData.serviceProviderName} (PVT) LTD
              </h1>
              <p className="text-[10px] font-black text-gray-700 tracking-[0.2em] uppercase">
                ENGINEERING & CUSTOMER SUPPORT SERVICES
              </p>
              <div className="text-[9px] font-medium text-gray-600 uppercase tracking-wider space-y-0.5">
                <p>No: 449/1/B Kaduwela Rd, Battaramulla.</p>
                <p>Tel: 071-054-6755 , 071-054-6422 | Fax: 0115-511719</p>
                <p>E-mail: info@ecomlk.com | Web Site: www.ecomlk.com</p>
              </div>
            </div>

            {/* Sub-Header with ID and Date */}
            <div className="flex justify-between items-end mb-1">
              <div className="border-b-2 border-black">
                <h2 className="text-[11px] font-black uppercase tracking-wider pr-4">
                  {activeDoc === 'FSR' ? 'ON SITE FIELD SERVICE REPORT' : 'TAX INVOICE'}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase text-black">
                  {activeDoc === 'FSR' 
                    ? `${settings.ticket_id_prefix || 'REQ'}-${issue.id?.split('-')[0].toUpperCase()}`
                    : `INV-${issue.id?.split('-')[0].toUpperCase()}`}
                </p>
                <p className="text-[11px] font-bold text-gray-750">
                  {safeFormat(formData.createdAt, 'M/d/yyyy')}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-400 my-2"></div>

            {/* Customer & Tech details */}
            <div className="grid grid-cols-2 gap-8 mb-4">
              <div className="space-y-1">
                <h3 className="text-[9px] font-black text-gray-550 uppercase tracking-widest">
                  {activeDoc === 'FSR' ? 'CUSTOMER DETAILS' : 'BILL TO'}
                </h3>
                <div className="pl-0.5">
                  <p className="text-sm font-black text-gray-900">{reporter?.name || 'N/A'}</p>
                  <p className="text-[10px] text-gray-650 font-bold max-w-[250px]">
                    {asset?.location || 'Client Premises'}
                  </p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <h3 className="text-[9px] font-black text-gray-550 uppercase tracking-widest">
                  {activeDoc === 'FSR' ? 'TECHNICIAN' : 'ACCOUNT MANAGER'}
                </h3>
                <p className="text-sm font-black text-gray-900">{tech?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Reported Issue / Invoice Service Details */}
            <div className="mb-6 space-y-1">
              <h3 className="text-[9px] font-black text-gray-550 uppercase tracking-widest">
                {activeDoc === 'FSR' ? 'REPORTED ISSUE' : 'REFERENCE DETAILS'}
              </h3>
              <div className={clsx(
                "text-[11px] font-bold leading-relaxed pl-1",
                activeDoc === 'FSR' ? "text-red-700" : "text-gray-900"
              )}>
                {activeDoc === 'FSR' ? (
                  `1. ${issue.description}`
                ) : (
                  <span>
                    1. Related Service Ticket Reference: <span className="text-indigo-700 font-extrabold">{settings.ticket_id_prefix || 'REQ'}-{issue.id?.split('-')[0].toUpperCase()}</span> ({issue.description})
                  </span>
                )}
              </div>
            </div>

            {activeDoc === 'FSR' ? (
              <>
                {/* Service Logs Table */}
                <div className="mb-6">
                  <table className="w-full border-collapse border border-gray-300 col-span-1 border-spacing-0">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-1.5 text-left text-[9px] font-black uppercase text-gray-600">Date</th>
                        <th className="border border-gray-300 p-1.5 text-left text-[9px] font-black uppercase text-gray-600">Time In</th>
                        <th className="border border-gray-300 p-1.5 text-left text-[9px] font-black uppercase text-gray-600">Time Out</th>
                        <th className="border border-gray-300 p-1.5 text-left text-[9px] font-black uppercase text-gray-600">Total Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-2 text-[11px] font-bold text-black">
                          {isPreview ? (
                            safeFormat(formData.createdAt, 'yyyy-MM-dd')
                          ) : (
                            <input 
                              type="date"
                              value={safeFormat(formData.createdAt, 'yyyy-MM-dd', '')}
                              readOnly
                              className="w-full bg-transparent border-none p-0 focus:ring-0 text-[11px]"
                            />
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-[11px] font-bold text-black">
                          {isPreview ? (
                            formData.timeStarted || '00:00 AM'
                          ) : (
                            <input 
                              type="time"
                              value={formData.timeStarted || ''}
                              onChange={(e) => updateFormData({timeStarted: e.target.value})}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 text-[11px]"
                            />
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-[11px] font-bold text-black">
                          {isPreview ? (
                            formData.timeFinished || '00:00 PM'
                          ) : (
                            <input 
                              type="time"
                              value={formData.timeFinished || ''}
                              onChange={(e) => updateFormData({timeFinished: e.target.value})}
                              className="w-full bg-transparent border-none p-0 focus:ring-0 text-[11px]"
                            />
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-[11px] font-black uppercase text-black font-mono">
                          {formData.totalTimeSpent || '0h 0m'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Work Performed Header */}
                <div className="mb-4">
                  <h3 className="text-[10px] font-black text-gray-900 border-b-2 border-black pb-1 mb-2 uppercase tracking-widest text-left">
                    02. SERVICE DETAILS & WORK PERFORMED
                  </h3>
                  <div className={clsx(
                    "p-4 border border-gray-200 rounded min-h-[140px] text-black",
                    isPreview ? "bg-white" : "bg-gray-50"
                  )} style={{ backgroundColor: '#ffffff' }}>
                    {isPreview ? (
                      <div className="text-[12px] font-bold text-black whitespace-pre-wrap leading-relaxed text-left">
                        {formData.workPerformed}
                      </div>
                    ) : (
                      <textarea
                        disabled={isReadOnly}
                        rows={6}
                        value={formData.workPerformed || ''}
                        onChange={(e) => updateFormData({workPerformed: e.target.value})}
                        placeholder="Describe technical work performed..."
                        className="w-full bg-transparent text-[12px] font-bold border-none outline-none focus:ring-0 resize-none text-black text-left"
                      />
                    )}
                  </div>
                </div>

                {/* Materials Used with textarea for Enter support */}
                <div className="mb-6 grid grid-cols-2 gap-4 text-left">
                  <div>
                    <h4 className="text-[8px] font-black text-gray-400 uppercase mb-1">Hardware / Parts Used</h4>
                    <div className={clsx(
                      "border border-gray-200 p-2 min-h-[50px] rounded",
                      isPreview ? "bg-white" : "bg-white text-black"
                    )}>
                      {isPreview ? (
                        <p className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap">{formData.hardwareUsed || 'None'}</p>
                      ) : (
                        <textarea 
                          disabled={isReadOnly}
                          rows={2}
                          value={formData.hardwareUsed || ''}
                          onChange={(e) => updateFormData({hardwareUsed: e.target.value})}
                          placeholder="List hardware parts (Press Enter for new line)..."
                          className="w-full text-[10px] bg-transparent outline-none border-none p-0 focus:ring-0 resize-none text-black leading-normal"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[8px] font-black text-gray-400 uppercase mb-1">Software / Licenses</h4>
                    <div className={clsx(
                      "border border-gray-200 p-2 min-h-[50px] rounded",
                      isPreview ? "bg-white" : "bg-white text-black"
                    )}>
                      {isPreview ? (
                        <p className="text-[10px] font-bold text-gray-800 whitespace-pre-wrap">{formData.softwareUsed || 'None'}</p>
                      ) : (
                        <textarea 
                          disabled={isReadOnly}
                          rows={2}
                          value={formData.softwareUsed || ''}
                          onChange={(e) => updateFormData({softwareUsed: e.target.value})}
                          placeholder="List software licenses (Press Enter for new line)..."
                          className="w-full text-[10px] bg-transparent outline-none border-none p-0 focus:ring-0 resize-none text-black leading-normal"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Remarks */}
                <div className="mb-8">
                  <h3 className="text-[10px] font-black text-gray-900 border-b-2 border-black pb-1 mb-2 uppercase tracking-widest text-left">
                    03. CUSTOMER REMARKS & SATISFACTION
                  </h3>
                  <div className={clsx(
                    "grid grid-cols-3 gap-4 border border-gray-200 p-4 rounded",
                    isPreview ? "bg-white" : "bg-gray-50"
                  )} style={{ backgroundColor: '#ffffff' }}>
                    <div className="col-span-2 text-left">
                      {isPreview ? (
                        <p className="text-[12px] font-bold text-black whitespace-pre-wrap leading-relaxed">{formData.additionalComments || 'None'}</p>
                      ) : (
                        <textarea
                          disabled={isReadOnly}
                          rows={2}
                          value={formData.additionalComments || ''}
                          onChange={(e) => updateFormData({additionalComments: e.target.value})}
                          placeholder="Customer feedback or remarks (Press Enter for new line)..."
                          className="w-full bg-transparent text-[11px] font-bold border-none outline-none focus:ring-0 resize-none text-black p-0 leading-normal"
                        />
                      )}
                    </div>
                    <div className="flex flex-col justify-center border-l border-gray-200 pl-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center",
                          formData.customerSatisfied ? "bg-emerald-600 border-emerald-600" : "bg-white border-gray-400 font-black"
                        )}>
                          {formData.customerSatisfied && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black uppercase text-gray-900 leading-none">Service Rating</span>
                          <span className={clsx(
                            "text-[9px] font-bold uppercase mt-1",
                            formData.customerSatisfied ? "text-emerald-600" : "text-gray-400 font-gray-500"
                          )}>
                            {formData.customerSatisfied ? 'EXCELLENT' : 'SATISFACTION PENDING'}
                          </span>
                        </div>
                      </div>
                      {!isPreview && (
                        <button 
                          type="button"
                          onClick={() => updateFormData({customerSatisfied: !formData.customerSatisfied})}
                          className={clsx(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors",
                            formData.customerSatisfied ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          )}
                        >
                          {formData.customerSatisfied ? 'Reset Toggle' : 'Toggle Satisfied'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 02. Itemized Invoice Breakdown */}
                <div className="mb-6">
                  <h3 className="text-[10px] font-black text-gray-900 border-b-2 border-black pb-1 mb-4 uppercase tracking-widest text-left">
                    02. ITEMIZED BILLABLE CHARGES
                  </h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2.5 text-left text-[9px] font-black uppercase text-gray-600 w-2/3">Item & Description</th>
                        <th className="border border-gray-300 p-2.5 text-center text-[9px] font-black uppercase text-gray-600 w-[15%]">Duration</th>
                        <th className="border border-gray-300 p-2.5 text-right text-[9px] font-black uppercase text-gray-600 w-[15%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-3 text-[11px] text-left">
                          <div className="font-black text-gray-900 uppercase tracking-wide">IT Engineering On-Site Support</div>
                          <p className="text-[9.5px] font-bold text-gray-500 mt-1.5 leading-relaxed whitespace-pre-wrap">
                            {formData.workPerformed || "Diagnostics, equipment maintenance and service calibration support."}
                          </p>
                        </td>
                        <td className="border border-gray-300 p-3 text-[11px] font-black text-center text-gray-805">
                          {formData.totalTimeSpent || 'N/A'}
                        </td>
                        <td className="border border-gray-300 p-3 text-[11px] font-black text-right text-gray-900 font-mono">
                          ${parseFloat(formData.price || 0).toFixed(2)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-gray-300 p-2.5 text-[11px] text-left">
                          <div className="font-bold text-gray-900">Hardware Parts Utilized</div>
                          <p className="text-[9.5px] font-medium text-gray-400 mt-1 leading-normal whitespace-pre-wrap">{formData.hardwareUsed || "None specified."}</p>
                        </td>
                        <td className="border border-gray-300 p-2.5 text-[11px] font-black text-center text-gray-400">—</td>
                        <td className="border border-gray-300 p-2.5 text-[11px] font-bold text-right text-emerald-600 italic">INCLUDED</td>
                      </tr>

                      <tr>
                        <td className="border border-gray-300 p-2.5 text-[11px] text-left">
                          <div className="font-bold text-gray-900">Software & Licenses Installed</div>
                          <p className="text-[9.5px] font-medium text-gray-400 mt-1 leading-normal whitespace-pre-wrap">{formData.softwareUsed || "None specified."}</p>
                        </td>
                        <td className="border border-gray-300 p-2.5 text-[11px] font-black text-center text-gray-400">—</td>
                        <td className="border border-gray-300 p-2.5 text-[11px] font-bold text-right text-emerald-600 italic">INCLUDED</td>
                      </tr>

                      <tr className="bg-gray-50">
                        <td colSpan={2} className="border border-gray-300 p-2 text-right text-[10px] font-black uppercase text-gray-500">Sub Total:</td>
                        <td className="border border-gray-300 p-2 text-right text-[11px] font-black text-gray-900 font-mono">${parseFloat(formData.price || 0).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={2} className="border border-gray-300 p-2 text-right text-[10px] font-black uppercase text-gray-500">Tax / VAT (0%):</td>
                        <td className="border border-gray-300 p-2 text-right text-[11px] font-black text-gray-400 font-mono">$0.00</td>
                      </tr>
                      <tr className="bg-gray-100">
                        <td colSpan={2} className="border border-gray-300 p-2.5 text-right text-[10px] font-black uppercase tracking-wider text-gray-900">Total Amount Due:</td>
                        <td className="border border-gray-300 p-2.5 text-right text-xs font-black text-indigo-700 border-double border-b-2 border-dashed border-gray-900 font-mono">${parseFloat(formData.price || 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 03. Payment Directions */}
                <div className="mb-8 select-none">
                  <h3 className="text-[10px] font-black text-gray-900 border-b-2 border-black pb-1 mb-2 uppercase tracking-widest text-left">
                    03. DIRECT BANK WIRE DIRECTIONS
                  </h3>
                  <div className="border border-gray-200 p-3 rounded bg-gray-50/30" style={{ backgroundColor: '#ffffff' }}>
                    <div className="grid grid-cols-2 gap-4 text-[9.5px] leading-relaxed select-text text-left">
                      <div className="space-y-1 text-gray-700">
                        <p className="font-extrabold text-gray-900 uppercase">Wire Settlement Details:</p>
                        <p><span className="font-bold text-gray-500">Banker:</span> ECOMBANK PLC</p>
                        <p><span className="font-bold text-gray-500">Branch:</span> Battaramulla Town Branch</p>
                        <p><span className="font-bold text-gray-500">Beneficiary:</span> {formData.serviceProviderName || 'ECOM SOLUTION'} (PVT) LTD</p>
                        <p><span className="font-bold text-gray-500">Account No:</span> 100-349-1124-55</p>
                        <p><span className="font-bold text-gray-500">SWIFT / BIC:</span> ECOMSLLK</p>
                      </div>
                      <div className="space-y-1 text-gray-700 border-l border-gray-200 pl-4">
                        <p className="font-extrabold text-gray-900 uppercase">Due Terms & Policies:</p>
                        <p><span className="font-bold text-gray-500">Settle-Terms:</span> Net 14 Days from invoice issuance</p>
                        <p><span className="font-bold text-gray-500">Settle-By Date:</span> {safeFormat(new Date(new Date(formData.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), 'M/d/yyyy')}</p>
                        <p className="text-[8.5px] text-gray-400 italic mt-1.5 font-medium">Please quote the unique Invoice Referenced ID on your wire authorization form to ensure immediate clearance.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 mt-12 pb-10">
              <div className="space-y-4">
                <div className="h-[120px] border-b-4 border-black relative group bg-white rounded-sm">
                  {formData.technicianSignature ? (
                    <img src={formData.technicianSignature} alt="Tech" className="max-h-full mx-auto object-contain" />
                  ) : !isPreview && (
                    <div className="w-full h-full relative font-bold">
                      <SignatureCanvas 
                        ref={techSigRef}
                        penColor='black'
                        canvasProps={{className: 'w-full h-full cursor-crosshair'}}
                        onEnd={() => setIsDirty(true)}
                      />
                      <button 
                        onClick={() => techSigRef.current?.clear()}
                        className="absolute top-1 right-1 p-1 bg-white/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <p className="text-[12px] font-black uppercase text-gray-900 leading-none text-left">{tech?.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 text-left">
                    {activeDoc === 'FSR' ? 'Authorized Technical Engineer' : 'Authorized Representative'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-[120px] border-b-4 border-black relative group bg-white rounded-sm">
                   {formData.customerSignature ? (
                    <img src={formData.customerSignature} alt="Cust" className="max-h-full mx-auto object-contain" />
                  ) : !isPreview && (
                    <div className="w-full h-full relative font-bold">
                      <SignatureCanvas 
                        ref={custSigRef}
                        penColor='black'
                        canvasProps={{className: 'w-full h-full cursor-crosshair'}}
                        onEnd={() => setIsDirty(true)}
                      />
                      <button 
                        onClick={() => custSigRef.current?.clear()}
                        className="absolute top-1 right-1 p-1 bg-white/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                   <p className="text-[12px] font-black uppercase text-gray-900 leading-none text-left">{reporter?.name}</p>
                   <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 text-left">
                     {activeDoc === 'FSR' ? 'Client Authorization & Seal' : 'Acknowledged & Approved By'}
                   </p>
                </div>
              </div>
            </div>

            {/* Footnote */}
            <div className="border-t-2 border-black pt-4 grid grid-cols-4 gap-4 select-none">
               <div className="col-span-3 text-[8px] font-bold text-gray-500 space-y-1 text-left">
                 <p className="font-black text-gray-900 uppercase">Terms & Conditions:</p>
                 {activeDoc === 'FSR' ? (
                   <>
                     <p>1. Warranty valid only against manufacturing defects. Physical damage void warranty.</p>
                     <p>2. Payment strictly as per agreed terms. Late payments may attract interest.</p>
                     <p>3. Company not responsible for data loss during repair/service. Please ensure backup.</p>
                   </>
                 ) : (
                   <>
                     <p>1. Payments must be settled within the specified payment terms (Grace period Net 14 Days).</p>
                     <p>2. Late payments may attract a monthly interest rate of 1.5% until fully settled.</p>
                     <p>3. Checks should be written to {formData.serviceProviderName || 'ECOM SOLUTION'} (PVT) LTD.</p>
                   </>
                 )}
               </div>
               <div className="text-right flex flex-col justify-end select-none">
                 <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">
                   {activeDoc === 'FSR' ? 'Official Copy' : 'Original Invoice'}
                 </p>
               </div>
            </div>

            <div className="mt-6 text-center border-t border-gray-100 pt-4 select-none">
              <p className="text-[7px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                {activeDoc === 'FSR' 
                  ? 'Generated by TechPortal FSR System' 
                  : `Generated by ${formData.serviceProviderName || 'ECOM SOLUTION'} Billing System`}
              </p>
            </div>
          </div>
      </div>

        {/* Action Controls */}
        <div className={clsx(
          "flex flex-col md:flex-row justify-between items-center gap-4 pt-10 pb-6 print:hidden w-full",
          isPreview 
            ? "sticky bottom-0 left-0 right-0 px-8 py-6 bg-gray-900 text-white shadow-2xl z-[50] mt-10"
            : "mt-10 px-4"
        )}>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 border-2 transition-all text-[11px] font-black uppercase tracking-[0.2em]",
                isPreview 
                  ? "bg-white text-black border-white hover:bg-gray-100" 
                  : "bg-black text-white border-black hover:bg-gray-900"
              )}
            >
              <Eye className="w-5 h-5" /> {isPreview ? 'EDIT MODE' : 'A4 PREVIEW'}
            </button>
            <div className="h-8 w-px bg-white/20 hidden md:block"></div>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black border-2 border-white hover:bg-gray-100 transition-all text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-50"
            >
              <Download className={clsx("w-5 h-5", isGeneratingPDF && "animate-bounce")} /> 
              {isGeneratingPDF ? 'PREPARING...' : 'EXPORT TO PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black border-2 border-white hover:bg-gray-100 transition-all text-[11px] font-black uppercase tracking-[0.2em]"
            >
              <Printer className="w-5 h-5" /> PRINT DOCUMENT
            </button>
          </div>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isGeneratingPDF}
              className="flex items-center gap-3 px-12 py-4 bg-white text-black hover:bg-gray-100 transition-all text-[12px] font-black uppercase tracking-[0.3em] shadow-xl disabled:opacity-50"
            >
              <Save className="w-5 h-5" /> SAVE RECORD
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const IssueCard = ({ 
  issue, 
  isResolved = false, 
  users, 
  assets, 
  expandedIssue, 
  setExpandedIssue, 
  handleEdit, 
  setIsDeleting,
  handleStatusChange,
  updateIssue,
  currentUser,
  setFsrIssueId
}: any) => {
  const { hasPermission, updateIssueFeedback } = useStore();
  const user = (users || []).find(u => u.id === issue.reportedByUserId);
  const assignedUser = (users || []).find(u => u.id === issue.assignedToUserId);
  const asset = (assets || []).find(a => a.id === issue.assetId);
  const isExpanded = expandedIssue === issue.id;
  
  const isAdmin = hasPermission('issues', 'canDelete');
  const isTech = hasPermission('issues', 'canEdit');
  const isUserRole = currentUser?.role === 'User';

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(issue.progress || 0);
  const [localNote, setLocalNote] = useState(issue.resolutionNote || '');
  const [rating, setRating] = useState(issue.feedback?.rating || 0);
  const [comment, setComment] = useState(issue.feedback?.comment || '');

  useEffect(() => {
    setLocalProgress(issue.progress || 0);
    setLocalNote(issue.resolutionNote || '');
  }, [issue.progress, issue.resolutionNote]);

  useEffect(() => {
    setRating(issue.feedback?.rating || 0);
    setComment(issue.feedback?.comment || '');
  }, [issue.feedback]);

  const hasChanges = localProgress !== (issue.progress || 0) || localNote !== (issue.resolutionNote || '');

  const handleSave = () => {
    updateIssue(issue.id, { progress: localProgress, resolutionNote: localNote });
  };

  const handleRate = async (val: number) => {
    if (currentUser?.id !== issue.reportedByUserId) return;
    setRating(val);
    await updateIssueFeedback(issue.id, { rating: val, comment });
  };

  const handleCommentBlur = async () => {
    if (currentUser?.id !== issue.reportedByUserId) return;
    await updateIssueFeedback(issue.id, { rating, comment });
  };

  return (
    <div id={`issue-${issue.id}`} className={clsx(
      "bg-white dark:bg-gray-800 rounded-2xl border transition-all overflow-hidden relative",
      isResolved ? "border-gray-100 dark:border-gray-700 opacity-90" : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm"
    )}>
      <div className="p-3 md:p-5">
        {issue.feedback?.rating > 0 && (isAdmin || currentUser?.id === issue.assignedToUserId || currentUser?.id === issue.reportedByUserId) && (
          <div className="absolute top-2 right-12 md:top-3 md:right-16 flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 rounded-full text-[8px] font-black border border-yellow-400/20 z-10">
            <Star className="w-2.5 h-2.5 fill-current" />
            {issue.feedback.rating}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-8">
          {/* Status Column */}
          <div className="flex md:flex-col items-center md:items-center gap-1 md:w-28 shrink-0 order-1">
            <span className={clsx(
              "text-[10px] font-black uppercase px-3 py-1.5 rounded-xl tracking-widest text-center w-full",
              issue.status === 'Resolved' ? 'bg-emerald-500 text-white' :
              issue.status === 'In Progress' ? 'bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-300 dark:shadow-none font-black' :
              issue.status === 'Pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-300 dark:shadow-none' :
              'bg-red-600 text-white shadow-lg shadow-red-300 dark:shadow-none font-black'
            )}>
              {issue.status}
            </span>
          </div>

          {/* Main Info Column */}
          <div className="flex-1 min-w-0 order-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={clsx(
                "text-[9px] font-black uppercase tracking-widest mr-2",
                issue.priority === 'High' ? 'text-red-500' :
                issue.priority === 'Medium' ? 'text-orange-500' :
                'text-blue-500'
              )}>
                {issue.priority}
              </span>
              {issue.category && (
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {issue.category}
                </span>
              )}
              {asset && (
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  Tag: {asset.tag}
                </span>
              )}
              {issue.fsr?.isBillable && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/55 flex items-center gap-1">
                  💸 BILLABLE: ${parseFloat(issue.fsr.price || 0).toFixed(2)}
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white truncate">
              {issue.type === 'User' ? `User: ${user?.name || 'Unknown'}` : `Asset: ${asset?.name || 'Unknown'}`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 whitespace-pre-wrap">{issue.description}</p>
            
            {assignedUser && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tech:</span>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-md">
                  {assignedUser.name}
                </span>
              </div>
            )}
          </div>

          {/* Image & Thumb (Vertical) */}
          <div className="flex items-center gap-4 order-3 md:w-32 lg:w-40 max-md:mt-2">
            {issue.image && (
              <div className="shrink-0">
                <img 
                  src={issue.image} 
                  alt="Issue" 
                  className="w-12 h-12 lg:w-16 lg:h-16 object-cover rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedImage(issue.image)}
                  referrerPolicy="no-referrer"
                  id={`issue-img-${issue.id}`}
                />
              </div>
            )}
            <ImageModal 
              isOpen={!!selectedImage} 
              onClose={() => setSelectedImage(null)} 
              imageUrl={selectedImage || ''} 
              title={issue.description}
              id={`issue-image-modal-${issue.id}`}
            />
          </div>

          {/* Progress Column (Horizontal) */}
          {!isResolved && (
            <div className="flex flex-col gap-1 md:w-32 lg:w-40 order-4 max-md:mt-2">
              <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <span>{issue.progress || 0}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${issue.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions Column */}
          <div className="flex items-center gap-1 order-5 shrink-0 ml-auto max-md:absolute max-md:top-3 max-md:right-3">
            {issue.status === 'Resolved' && (
              <button 
                onClick={() => setFsrIssueId(issue.id)}
                title="Field Service Report"
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase hidden lg:inline">FSR</span>
              </button>
            )}
            <button 
              onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {hasPermission('issues', 'canEdit') && (
              <button 
                onClick={() => handleEdit(issue)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {hasPermission('issues', 'canDelete') && (
              <button 
                onClick={() => setIsDeleting(issue.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasPermission('issues', 'canEdit') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</label>
                <select 
                  value={issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value as any)}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            )}
            {!isResolved && hasPermission('issues', 'canEdit') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Progress (%)</label>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localProgress}
                  onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>

          {hasPermission('issues', 'canEdit') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isResolved ? 'Resolution Note' : 'Add Progress Note'}
              </label>
              <textarea 
                rows={2}
                placeholder="Details about the work done..."
                className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white border p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
              />
            </div>
          )}

          {hasChanges && (
            <div className="flex justify-end">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Changes
              </button>
            </div>
          )}

          {isResolved && (isAdmin || currentUser?.id === issue.assignedToUserId || currentUser?.id === issue.reportedByUserId) && (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Client Satisfaction</span>
                  <p className="text-[9px] text-gray-500">Please rate the resolution of this issue.</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      disabled={currentUser?.id !== issue.reportedByUserId}
                      onClick={() => handleRate(star)}
                      className={clsx(
                        "p-1 transition-all",
                        star <= rating ? "text-yellow-400 scale-110" : "text-gray-200 dark:text-gray-700 hover:text-gray-300",
                        currentUser?.id === issue.reportedByUserId && "hover:scale-125 active:scale-95"
                      )}
                    >
                      <Star className={clsx("w-5 h-5", star <= rating && "fill-current")} />
                    </button>
                  ))}
                </div>
              </div>
              
              {currentUser?.id === issue.reportedByUserId ? (
                <textarea
                  rows={2}
                  placeholder="Tell us what you think... (optional)"
                  className="w-full text-xs p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onBlur={handleCommentBlur}
                />
              ) : issue.feedback?.comment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{issue.feedback.comment}"</p>
                </div>
              )}
            </div>
          )}

          {isResolved && issue.resolvedDate && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Resolved on {safeFormat(issue.resolvedDate, 'MMM d, yyyy HH:mm')}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default function Issues() {
  const { currentUser, issues, users, assets, addIssue, updateIssue, deleteIssue, addNotification, hasPermission, toDos } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = (searchParams.get('status') as any) || 'All';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>('All');
  const [fsrIssueId, setFsrIssueId] = useState<string | null>(null);
  const [hideResolvedInAll, setHideResolvedInAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'New Tickets' | 'In Progress' | 'Pending Works' | 'Done Works'>(
    initialTab === 'Open' ? 'New Tickets' : 
    initialTab === 'Resolved' ? 'Done Works' : 
    initialTab === 'Pending' ? 'Pending Works' : 
    initialTab
  );

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setActiveTab(
        status === 'Open' ? 'New Tickets' : 
        status === 'Resolved' ? 'Done Works' : 
        status === 'Pending' ? 'Pending Works' : 
        status as any
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.state?.openAdd) {
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.filterAssetId) {
      setSelectedAsset(location.state.filterAssetId);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setExpandedIssue(targetId);
      setTimeout(() => {
        const element = document.getElementById(`issue-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
          }, 3000);
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const isAdmin = hasPermission('issues', 'canDelete');
  const isTech = hasPermission('issues', 'canEdit');
  const isUser = currentUser?.role === 'User';

  const today = format(new Date(), 'yyyy-MM-dd');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormData = {
    date: today,
    type: 'User' as const,
    reportedByUserId: isUser ? currentUser?.id || '' : '',
    assignedToUserId: '',
    assetId: '',
    description: '',
    status: 'Open' as const,
    priority: 'Medium' as const,
    cost: '',
    category: '',
    progress: 0,
    resolutionNote: '',
    image: ''
  };

  const { 
    formData, 
    setFormData, 
    updateForm, 
    resetForm, 
    clearPersistence,
    isDirty,
    setIsDirty
  } = useFormPersistence('issues', initialFormData, showForm && !editingId);

  useEffect(() => {
    if (searchParams.get('status')) {
      setActiveTab(searchParams.get('status') as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({ ...location.state, activeTab: undefined }, document.title);
    }
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
      window.history.replaceState({ ...location.state, searchQuery: undefined }, document.title);
    }
    if (location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setActiveTab('All'); // Show all to ensure it's visible
      setTimeout(() => {
        setExpandedIssue(targetId);
        setTimeout(() => {
          const element = document.getElementById(`issue-${targetId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'dark:ring-offset-gray-900');
            }, 3000);
          }
        }, 300);
      }, 500);
      window.history.replaceState({ ...location.state, scrollToId: undefined }, document.title);
    }
    if (location.state?.filterAssetId) {
      setSearchQuery(assets.find(a => a.id === location.state.filterAssetId)?.tag || '');
      window.history.replaceState({ ...location.state, filterAssetId: undefined }, document.title);
    }
  }, [location.state, assets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost as string) : 0,
        reportedByUserId: isUser ? currentUser?.id : (formData.reportedByUserId || '')
      };

      if (editingId) {
        await updateIssue(editingId, dataToSubmit);
        addNotification('Issue updated successfully', 'success');
        setEditingId(null);
      } else {
        await addIssue({
          ...dataToSubmit,
          progress: 0,
          resolutionNote: '',
          image: formData.image || ''
        });
        addNotification('Issue reported successfully', 'success');
        clearPersistence();
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting issue:', error);
      addNotification(`Failed to ${editingId ? 'update' : 'report'} issue`, 'error');
    }
  };

  const handleDeleteIssue = async () => {
    if (!isDeleting) return;
    try {
      await deleteIssue(isDeleting);
      addNotification('Issue deleted successfully', 'success');
      setIsDeleting(null);
    } catch (error) {
      console.error('Error deleting issue:', error);
      addNotification('Failed to delete issue', 'error');
    }
  };

  const handleUpdateIssue = async (id: string, data: any) => {
    try {
      await updateIssue(id, data);
      addNotification('Issue updated', 'success');
    } catch (error) {
      console.error('Error updating issue:', error);
      addNotification('Failed to update issue', 'error');
    }
  };

  const handleEdit = (issue: any) => {
    setEditingId(issue.id);
    setFormData({
      date: issue.date || today,
      type: issue.type || 'User',
      reportedByUserId: issue.reportedByUserId || '',
      assignedToUserId: issue.assignedToUserId || '',
      assetId: issue.assetId || '',
      description: issue.description || '',
      status: issue.status || 'Open',
      priority: issue.priority || 'Medium',
      cost: issue.cost?.toString() || '',
      category: issue.category || '',
      progress: issue.progress || 0,
      resolutionNote: issue.resolutionNote || '',
      image: issue.image || ''
    });
    setIsDirty(false);
    setShowForm(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let result = reader.result as string;
      try {
        result = await compressImage(result);
      } catch (err) {
        console.error('Compression failed:', err);
      }
      setFormData(prev => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleStatusChange = async (id: string, status: 'Open' | 'In Progress' | 'Pending' | 'Resolved') => {
    const update: any = { status };
    if (status === 'Resolved') {
      update.resolvedDate = new Date().toISOString();
      update.progress = 100;
      update.resolvedByUserId = currentUser?.id;
    }
    try {
      await updateIssue(id, update);
      addNotification(`Issue marked as ${status}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      addNotification('Failed to update issue status', 'error');
    }
  };

  const categories = [
    'General IT Support',
    'Hardware Failure',
    'Software Issue',
    'Network Problem',
    'Physical Damage',
    'Routine Maintenance',
    'User Error',
    'Printer/Scanner',
    'Email/Office 365',
    'Mobile Device',
    'Other'
  ];

  const filteredIssues = isUser 
    ? (issues || []).filter(i => i.reportedByUserId === currentUser?.id)
    : (issues || []);

  const tabIssues = activeTab === 'All' 
    ? (hideResolvedInAll ? filteredIssues.filter(i => i.status !== 'Resolved') : filteredIssues)
    : activeTab === 'Pending Works'
    ? filteredIssues.filter(i => i.status === 'Pending')
    : activeTab === 'New Tickets'
    ? filteredIssues.filter(i => i.status === 'Open')
    : activeTab === 'In Progress'
    ? filteredIssues.filter(i => i.status === 'In Progress')
    : activeTab === 'Done Works'
    ? filteredIssues.filter(i => i.status === 'Resolved')
    : filteredIssues.filter(i => i.status === activeTab);

  const groupIssuesByDate = (issuesList: any[]) => {
    const groups: Record<string, any[]> = {};
    issuesList.forEach(issue => {
      const date = issue.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(issue);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const searchedIssues = tabIssues.filter(i => {
    const q = searchQuery.toLowerCase();
    const reporter = users.find(u => u.id === i.reportedByUserId);
    const assignedTech = users.find(u => u.id === i.assignedToUserId);
    const resolvedTech = users.find(u => u.id === i.resolvedByUserId);
    const asset = assets.find(a => a.id === i.assetId);
    
    const matchesSearch = 
      i.description.toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (reporter?.name || '').toLowerCase().includes(q) ||
      (assignedTech?.name || '').toLowerCase().includes(q) ||
      (resolvedTech?.name || '').toLowerCase().includes(q) ||
      (asset?.name || '').toLowerCase().includes(q) ||
      (asset?.tag || '').toLowerCase().includes(q);

    const matchesPriority = !filterPriority || i.priority === filterPriority;
    const matchesCategory = !filterCategory || i.category === filterCategory;

    return matchesSearch && matchesPriority && matchesCategory;
  });

  const groupedIssues = groupIssuesByDate(searchedIssues);

  const handleDownloadReport = () => {
    const headers = [
      { key: 'date', label: 'Date' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'type', label: 'Ticket Type' },
      { key: 'reportedByName', label: 'Reported By' },
      { key: 'assetName', label: 'Asset' },
      { key: 'progress', label: 'Progress (%)' },
      { key: 'resolutionNote', label: 'Resolution Note' },
      { key: 'resolvedDate', label: 'Resolved Date' }
    ];

    const data = searchedIssues.map(issue => {
      const reporter = users.find(u => u.id === issue.reportedByUserId);
      const asset = assets.find(a => a.id === issue.assetId);
      return {
        ...issue,
        reportedByName: reporter?.name || 'Unknown',
        assetName: asset ? `${asset.name} (${asset.tag})` : 'N/A'
      };
    });

    downloadCSV(data, `tickets_report_${activeTab.toLowerCase()}`, headers);
  };

  return (
    <div className="space-y-8">
      {/* Upcoming Tasks Ribbon (Podiyata) */}
      {!isUser && (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px]">
            <Clock className="w-3.5 h-3.5" />
            Upcoming (7 Days):
          </div>
          <div className="flex-1 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
             {toDos.filter(t => !t.completed && t.dueDate && safeIsBefore(t.dueDate, addDays(new Date(), 7)) && (safeIsAfter(t.dueDate, startOfDay(new Date())) || safeIsSameDay(t.dueDate, new Date()))).slice(0, 3).map(todo => (
               <div key={todo.id} className="whitespace-nowrap bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-3 py-1 rounded-lg flex items-center gap-2">
                 <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 translate-y-[0.5px] uppercase tracking-tight">{todo.title}</span>
                 <span className="text-[9px] text-indigo-500 font-mono font-bold uppercase">{safeFormat(todo.dueDate!, 'MMM d')}</span>
               </div>
             ))}
             {toDos.filter(t => !t.completed && t.dueDate && safeIsBefore(t.dueDate, addDays(new Date(), 7))).length === 0 && (
               <span className="text-[10px] text-gray-400 italic">No tasks due soon</span>
             )}
          </div>
          <Link to="/todos" className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets (Issues) & Maintenance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Track and resolve hardware/software issues.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold uppercase tracking-wider text-xs"
          >
            <Upload className="w-4 h-4 rotate-180" /> Download Report
          </button>
          <button 
            onClick={() => {
              const saved = safeStorage.getItem('form_draft_issues');
              if (saved) {
                try {
                  setFormData(JSON.parse(saved));
                } catch {
                  setFormData(initialFormData);
                }
              } else {
                setFormData(initialFormData);
              }
              setEditingId(null);
              setShowForm(!showForm);
            }} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold uppercase tracking-wider text-xs"
          >
            <Plus className="w-4 h-4" /> Report Issue
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
          {(['All', 'New Tickets', 'In Progress', 'Pending Works', 'Done Works'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                const statusMap: any = {
                  'New Tickets': 'Open',
                  'In Progress': 'In Progress',
                  'Done Works': 'Resolved',
                  'Pending Works': 'Pending'
                };
                setSearchParams({ status: statusMap[tab] || tab });
              }}
              className={clsx(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                activeTab === tab 
                  ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {activeTab === 'All' && (
          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={hideResolvedInAll}
              onChange={e => setHideResolvedInAll(e.target.checked)}
            />
            <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 uppercase tracking-widest translate-y-[0.5px]">Hide Resolved</span>
          </label>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search description, user, asset..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select 
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Issue' : 'Report New Issue'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
            <input required type="date" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
            <select required className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.priority || 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Type</label>
            <select required className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.type || 'User'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
              <option value="User">User Reported</option>
              {!isUser && <option value="Device">Device Maintenance</option>}
            </select>
          </div>
          
          {!isUser && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reported By</label>
              <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.reportedByUserId || ''} onChange={e => setFormData({...formData, reportedByUserId: e.target.value})}>
                <option value="">Select User (Optional)</option>
                {(users || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.assignedToUserId || ''} onChange={e => setFormData({...formData, assignedToUserId: e.target.value})}>
               <option value="">Unassigned</option>
               {(users || []).filter(u => u.role === 'Technician' || u.role === 'Admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Related Asset</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.assetId || ''} onChange={e => setFormData({...formData, assetId: e.target.value})}>
              <option value="">Select Asset (Optional)</option>
              {(isUser ? (assets || []).filter(a => a.userId === currentUser?.id) : (assets || [])).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
            <select className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="">Select Category</option>
              {(categories || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {!isUser && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost (Optional)</label>
              <input type="number" className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="0.00" />
            </div>
          )}

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea required rows={3} className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white border p-3 focus:ring-2 focus:ring-indigo-500 font-medium" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the issue..."></textarea>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Photo (Optional)</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm font-bold uppercase tracking-widest"
              >
                <Upload className="w-4 h-4" /> {formData.image ? 'Change Photo' : 'Upload Photo'}
              </button>
              {formData.image && (
                <div className="relative">
                  <img src={formData.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" referrerPolicy="no-referrer" id="issue-form-img-preview" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="md:col-span-2 flex justify-between items-center mt-4 gap-4">
            {isDirty && !editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <RotateCcw className="w-4 h-4" /> Clear Draft
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }} className="px-6 py-3 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest text-xs transition-colors">Cancel</button>
              <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 dark:shadow-none transition-all">{editingId ? 'Update Issue' : 'Report Issue'}</button>
            </div>
          </div>
        </form>
      </Modal>

      {activeTab === 'All' && !searchQuery && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* New Tickets Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> New Tickets
              </h4>
              <span className="text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                {filteredIssues.filter(i => i.status === 'Open').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredIssues.filter(i => i.status === 'Open').slice(0, 2).map(issue => (
                <button 
                  key={issue.id}
                  onClick={() => {
                    setExpandedIssue(issue.id);
                    document.getElementById(`issue-${issue.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-500 transition-all text-left shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={clsx(
                      "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600"
                    )}>
                      {issue.priority}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 ml-auto">{safeFormat(issue.date, 'MMM d')}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold line-clamp-1 group-hover:text-red-600 transition-colors leading-tight">
                    {issue.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[8px] font-black text-gray-500">
                      {(users.find(u => u.id === issue.reportedByUserId)?.name || '?')[0]}
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium truncate">
                      {users.find(u => u.id === issue.reportedByUserId)?.name || 'Unknown'}
                    </span>
                  </div>
                </button>
              ))}
              {filteredIssues.filter(i => i.status === 'Open').length === 0 && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/20">
                  <CheckCircle2 className="w-5 h-5 text-gray-300 mb-1" />
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Inbox Zero</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> In Progress
              </h4>
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                {filteredIssues.filter(i => i.status === 'In Progress').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredIssues.filter(i => i.status === 'In Progress').slice(0, 2).map(issue => (
                <button 
                  key={issue.id}
                  onClick={() => {
                    setExpandedIssue(issue.id);
                    document.getElementById(`issue-${issue.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all text-left shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{issue.progress || 0}% Done</span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 ml-auto">{safeFormat(issue.date, 'MMM d')}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold line-clamp-1 group-hover:text-blue-600 transition-colors leading-tight">
                    {issue.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/10 rounded">
                      Tech: {users.find(u => u.id === issue.assignedToUserId)?.name || 'Assigning...'}
                    </span>
                  </div>
                </button>
              ))}
              {filteredIssues.filter(i => i.status === 'In Progress').length === 0 && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/20">
                  <Clock className="w-5 h-5 text-gray-300 mb-1" />
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Quiet Hub</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Works Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <PauseCircle className="w-3.5 h-3.5 text-orange-500" /> Pending Works
              </h4>
              <span className="text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                {filteredIssues.filter(i => i.status === 'Pending').length}
              </span>
            </div>
            <div className="space-y-2.5">
              {filteredIssues.filter(i => i.status === 'Pending').slice(0, 2).map(issue => (
                <button 
                  key={issue.id}
                  onClick={() => {
                    setExpandedIssue(issue.id);
                    document.getElementById(`issue-${issue.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500 transition-all text-left shadow-sm group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20">Paused</span>
                    <span className="text-[8px] font-bold text-gray-400 ml-auto">{safeFormat(issue.date, 'MMM d')}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold line-clamp-1 group-hover:text-orange-600 transition-colors leading-tight">
                    {issue.description}
                  </p>
                  <div className="mt-2 text-[9px] text-gray-500 italic px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 truncate">
                    {issue.resolutionNote || 'No explanation provided...'}
                  </div>
                </button>
              ))}
              {filteredIssues.filter(i => i.status === 'Pending').length === 0 && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/20">
                  <PauseCircle className="w-5 h-5 text-gray-300 mb-1" />
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">No Blocks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {(groupedIssues || []).length > 0 ? (
          (groupedIssues || []).map(([date, issuesInDate]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-950 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                  {safeFormat(date, 'EEEE, MMMM d, yyyy')}
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {(issuesInDate || []).map(issue => (
                  <IssueCard 
                    key={issue.id} 
                    issue={issue} 
                    isResolved={issue.status === 'Resolved'} 
                    users={users}
                    assets={assets}
                    expandedIssue={expandedIssue}
                    setExpandedIssue={setExpandedIssue}
                    handleEdit={handleEdit}
                    setIsDeleting={setIsDeleting}
                    handleStatusChange={handleStatusChange}
                    updateIssue={handleUpdateIssue}
                    currentUser={currentUser}
                    setFsrIssueId={setFsrIssueId}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            {activeTab === 'Resolved' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Resolved Issues</h3>
                <p className="text-gray-500 dark:text-gray-400">Issues marked as "Resolved" will appear here.</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No {activeTab === 'All' ? '' : activeTab} Issues</h3>
                <p className="text-gray-500 dark:text-gray-400">Everything looks good for this category!</p>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDeleteIssue}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
      />

      {fsrIssueId && (
        <FSRModal 
          isOpen={!!fsrIssueId}
          onClose={() => setFsrIssueId(null)}
          issue={issues.find(i => i.id === fsrIssueId)}
          users={users}
          updateIssue={handleUpdateIssue}
          isReadOnly={issues.find(i => i.id === fsrIssueId)?.fsr && !isTech && !isAdmin}
        />
      )}
    </div>
  );
}
