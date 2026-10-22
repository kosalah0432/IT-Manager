import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, History, FileText, Printer, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import ImageModal from '../components/ImageModal';

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const { assets, assetTypes, locations, users, issues, checkups, assetHistory } = useStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const asset = assets.find(a => a.id === id);
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Asset Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">The asset you are looking for does not exist or has been removed.</p>
        <Link to="/assets" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </Link>
      </div>
    );
  }

  const type = assetTypes.find(t => t.id === asset.typeId);
  const user = users.find(u => u.id === asset.userId);
  const location = locations.find(l => l.id === asset.locationId);
  
  // Combine issues and checkups for the timeline
  const assetIssues = issues.filter(i => i.assetId === asset.id);
  const assetCheckups = checkups.filter(c => c.details?.assetId === asset.id || c.notes?.includes(asset.tag));
  const assetHist = assetHistory.filter(h => h.assetId === asset.id);
  
  const timelineItems = [
    ...(assetIssues || []).map(i => {
      const reporter = users.find(u => u.id === i.reportedByUserId);
      const resolver = users.find(u => u.id === i.resolvedByUserId);
      return {
        id: i.id,
        date: i.date,
        title: i.description,
        type: 'Issue',
        status: i.status,
        performedBy: i.status === 'Resolved' && resolver ? resolver.name : reporter ? reporter.name : 'Unknown',
        icon: AlertCircle,
        color: i.status === 'Resolved' ? 'text-green-500' : 'text-red-500'
      };
    }),
    ...(assetCheckups || []).map(c => ({
      id: c.id,
      date: c.date,
      title: `${c.category} - ${c.status}`,
      type: 'Checkup',
      status: c.status,
      performedBy: 'System/Admin', // Checkups usually handled by the person doing the daily list
      icon: CheckCircle2,
      color: 'text-blue-500'
    })),
    ...(assetHist || []).map(h => {
      const actor = users.find(u => u.id === h.userId);
      return {
        id: h.id,
        date: h.date,
        title: h.action,
        type: 'History',
        status: h.details || '',
        performedBy: actor ? actor.name : 'Unknown',
        icon: History,
        color: 'text-indigo-500'
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const assetUrl = `${window.location.origin}/asset/${asset.id}`;

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const qrSvg = document.getElementById('asset-qr-code')?.outerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${asset.tag}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            .label { border: 2px solid black; padding: 20px; text-align: center; }
            .tag { font-size: 24px; font-weight: bold; margin-top: 10px; }
            .name { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            ${qrSvg}
            <div class="tag">${asset.tag}</div>
            <div class="name">${asset.name}</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Details</h1>
        </div>
        <button 
          onClick={handlePrintQR}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <Printer className="w-4 h-4" /> Print Label
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {asset.image && (
              <div 
                className="w-full h-64 overflow-hidden border-b border-gray-200 dark:border-gray-700 cursor-zoom-in group"
                onClick={() => setSelectedImage(asset.image)}
              >
                {asset.image && (
                  <img 
                    src={asset.image} 
                    alt={asset.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer" 
                  />
                )}
              </div>
            )}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{asset.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{type?.name} • {asset.modelName}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 text-sm font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {asset.tag}
                </span>
                <span className={clsx(
                  "px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider",
                  asset.status === 'In Use' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  asset.status === 'In Stock' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  asset.status === 'Repairing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                )}>
                  {asset.status}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> General Info
                </h3>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">Serial Number:</dt><dd className="font-bold text-gray-900 dark:text-white">{asset.serialNumber}</dd></div>
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">IP Address:</dt><dd className="font-bold text-gray-900 dark:text-white">{asset.ipAddress || '-'}</dd></div>
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">MAC Address:</dt><dd className="font-bold text-gray-900 dark:text-white">{asset.macAddress || '-'}</dd></div>
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">Purchase Date:</dt><dd className="font-bold text-gray-900 dark:text-white">{asset.purchaseDate}</dd></div>
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">Assigned User:</dt><dd className="font-bold text-gray-900 dark:text-white">{user?.name || 'Unassigned'}</dd></div>
                  <div className="flex justify-between border-b dark:border-gray-700 pb-2"><dt className="text-gray-500 dark:text-gray-400">Location:</dt><dd className="font-bold text-gray-900 dark:text-white">{location?.name || 'Unknown'}</dd></div>
                </dl>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Specifications
                </h3>
                {type && (type.customFields || []).length > 0 ? (
                  <dl className="space-y-4 text-sm">
                    {(type.customFields || []).map(field => (
                      <div key={field.id} className="flex justify-between border-b dark:border-gray-700 pb-2">
                        <dt className="text-gray-500 dark:text-gray-400">{field.name}:</dt>
                        <dd className="font-bold text-gray-900 dark:text-white">{asset.specs[field.id] || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">No custom specifications defined.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Maintenance Timeline
            </h3>
            
            {timelineItems.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No maintenance history recorded.</p>
            ) : (
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">
                {(timelineItems || []).map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Icon className={clsx("w-5 h-5", item.color)} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-gray-900 dark:text-white">{item.title}</div>
                          <time className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.date}</time>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-2">
                          <span className="font-bold uppercase tracking-wider">{item.type}</span>
                          <span>•</span>
                          <span className={clsx(
                            "font-medium",
                            item.status === 'Resolved' || item.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'
                          )}>{item.status}</span>
                          <span>•</span>
                          <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            By: {item.performedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Asset QR Code</h3>
            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-inner mb-4">
              <QRCodeSVG 
                id="asset-qr-code"
                value={assetUrl} 
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Scan this code to quickly access asset info on mobile devices.</p>
            <button 
              onClick={handlePrintQR}
              className="w-full py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-bold text-xs uppercase tracking-wider"
            >
              Download Label
            </button>
          </div>

          {asset.attachments && (asset.attachments || []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Attachments</h3>
              <div className="grid grid-cols-2 gap-3">
                {(asset.attachments || []).map((att, i) => (
                  <div key={i} className="aspect-square border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 group relative">
                    {att.startsWith('data:image') ? (
                      <>
                        {att && (
                          <img src={att} alt="Attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        )}
                        <button 
                          onClick={() => setSelectedImage(att)} 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ImageModal
        id="asset-details-image-modal"
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}
