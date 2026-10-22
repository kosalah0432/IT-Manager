import React from 'react';
import { useStore } from '../store';
import { Bell, Check, Trash2, AlertTriangle, ShieldAlert, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function AlertsCenter() {
  const { alerts, markAlertAsRead, deleteAlert } = useStore();
  const navigate = useNavigate();

  const unreadCount = (alerts || []).filter(a => !a.isRead).length;

  const handleAlertClick = (alert: any) => {
    markAlertAsRead(alert.id);
    if (alert.type === 'Warranty') {
      navigate('/software-warranties', { state: { scrollToId: alert.relatedId } });
    } else if (alert.type === 'Issue') {
      navigate('/issues', { state: { scrollToId: alert.relatedId } });
    } else if (alert.type === 'ToDo') {
      navigate('/todos', { state: { scrollToId: alert.relatedId } });
    } else if (alert.type === 'Task') {
      navigate('/tasks', { state: { scrollToId: alert.relatedId } });
    }
  };

  if ((alerts || []).length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">System Alerts</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
        {(alerts || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(alert => (
          <div 
            key={alert.id} 
            className={clsx(
              "p-4 flex gap-4 transition-colors group relative",
              !alert.isRead ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            )}
          >
            <div className={clsx(
              "p-2 rounded-lg h-fit",
              alert.type === 'Warranty' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
              "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            )}>
              {alert.type === 'Warranty' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">{alert.type}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(alert.date).toLocaleDateString()}
                </span>
              </div>
              <p className={clsx(
                "text-sm mb-2",
                !alert.isRead ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
              )}>
                {alert.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleAlertClick(alert)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> VIEW DETAILS
                </button>
                {!alert.isRead && (
                  <button 
                    onClick={() => markAlertAsRead(alert.id)}
                    className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 hover:underline"
                  >
                    <Check className="w-3 h-3" /> MARK AS READ
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={() => deleteAlert(alert.id)}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
