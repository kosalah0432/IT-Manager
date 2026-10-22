import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Monitor, Users, MapPin, Network, 
  CheckSquare, AlertCircle, ListTodo, ShieldCheck, 
  Settings, LogOut, FileText, Calendar, Moon, Sun,
  CheckCircle2, Menu, X, Clock as ClockIcon, BarChart3,
  StickyNote, BookOpen, LayoutList, Phone
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from './store';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import ToastContainer from './components/ToastContainer';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, theme, toggleTheme, settings } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [currentUser, navigate, location.pathname]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'Admin';
  const isTech = currentUser.role === 'Technician';

  const navGroups = [
    {
      name: 'General',
      items: [
        { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard, resource: 'dashboard', roles: ['Admin', 'Technician'] },
        { id: 'user-portal', name: 'My IT Portal', path: '/portal', icon: LayoutDashboard, resource: 'portal', roles: ['User', 'Admin'] },
        { id: 'tech-portal', name: 'Technician Command Center', path: '/tech-portal', icon: LayoutDashboard, resource: 'tech_portal', roles: ['Technician', 'Admin'] },
        { id: 'admin-portal', name: 'Admin Portal', path: '/admin', icon: ShieldCheck, resource: 'admin', roles: ['Admin'] },
      ]
    },
    {
      name: 'Inventory',
      items: [
        { id: 'assets', name: 'Assets', path: '/assets', icon: Monitor, resource: 'assets' },
        { id: 'ip-addresses', name: 'IP Addresses', path: '/ip-addresses', icon: Network, resource: 'assets' },
        { id: 'software-warranties', name: 'Warranties', path: '/software-warranties', icon: ShieldCheck, resource: 'assets' },
      ]
    },
    {
      name: 'Operations',
      items: [
        { id: 'checkups', name: 'Checkups', path: '/checkups', icon: CheckSquare, resource: 'checkups' },
        { id: 'issues', name: 'Tickets (Issues)', path: '/issues', icon: AlertCircle, resource: 'issues' },
        { id: 'tasks', name: 'Maintenance', path: '/tasks', icon: ListTodo, resource: 'tasks' },
        { id: 'todos', name: 'To-Do List', path: '/todos', icon: CheckCircle2, resource: 'tasks' },
        { id: 'daily-tasks', name: 'Shift Tasks', path: '/daily-tasks', icon: LayoutList, resource: 'daily_tasks' },
      ]
    },
    {
      name: 'Resources',
      items: [
        { id: 'reports', name: 'Reports', path: '/reports', icon: BarChart3, resource: 'reports' },
        { id: 'notes', name: 'Notes', path: '/notes', icon: StickyNote, resource: 'notes' },
        { id: 'procedures', name: 'Knowledge Base', path: '/procedures', icon: BookOpen, resource: 'procedures' },
        { id: 'holidays', name: 'Holidays', path: '/holidays', icon: Calendar, resource: 'holidays' },
        { id: 'logs', name: 'System Logs', path: '/logs', icon: FileText, resource: 'logs' },
      ]
    },
    {
      name: 'System',
      items: [
        { id: 'users', name: 'Users', path: '/users', icon: Users, resource: 'users' },
        { id: 'contacts', name: 'Contacts & POCs', path: '/contacts', icon: Phone, resource: 'contacts' },
        { id: 'locations', name: 'Locations', path: '/locations', icon: MapPin, resource: 'locations' },
        { id: 'manage-fields', name: 'Manage Fields', path: '/manage', icon: Settings, resource: 'settings' },
        { id: 'backup', name: 'Backup & Restore', path: '/backup', icon: Settings, resource: 'settings', roles: ['Admin'] },
      ]
    }
  ];

  const { hasPermission } = useStore();

  const filterItems = (items: any[]) => {
    return items.filter(item => {
      if (item.roles && !item.roles.includes(currentUser.role)) return false;
      if (item.resource) {
        if (isAdmin) return true;
        return hasPermission(item.resource, 'canView');
      }
      return true;
    });
  };

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: filterItems(group.items)
  })).filter(group => group.items.length > 0);

  const flatFilteredNav = filteredGroups.flatMap(g => g.items);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 transition-colors overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-black text-gray-900 dark:text-white flex flex-col border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 text-xl font-bold border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span>{settings.company_name || 'IT Tech Manager'}</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 text-sm">
          <p className="text-gray-500 dark:text-gray-400">Logged in as:</p>
          <p className="font-semibold">{currentUser.name}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">{currentUser.role}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-4 px-2">
            {filteredGroups.map((group) => (
              <li key={group.name} className="space-y-1">
                <h3 className="px-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">{group.name}</h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.id || item.path}>
                        <Link
                          to={item.path}
                          className={clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium text-sm',
                            isActive 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header with Clock */}
        <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:inline-block">
              {flatFilteredNav.find(item => item.path === location.pathname)?.name || 'IT Tech Manager'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Actions Desktop */}
            <div className="hidden lg:flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-800">
              {(isAdmin || isTech) && (
                <>
                  <button 
                    onClick={() => navigate('/assets', { state: { openAdd: true } })}
                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/50"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Add Asset</span>
                  </button>
                  <button 
                    onClick={() => navigate('/tasks', { state: { openAdd: true } })}
                    className="flex items-center gap-2 px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-900/50"
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => navigate('/issues', { state: { openAdd: true } })}
                className="flex items-center gap-2 px-3 py-1.5 text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/50"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Add Ticket</span>
              </button>
              {(isAdmin || isTech) && (
                <button 
                  onClick={() => navigate('/todos', { state: { openAdd: true } })}
                  className="flex items-center gap-2 px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Add To-Do</span>
                </button>
              )}
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm sm:text-base">
                <ClockIcon className="w-4 h-4" />
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                {format(currentTime, 'EEEE, MMMM do, yyyy')}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}

