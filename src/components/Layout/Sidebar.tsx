import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  FileText,
  Bell,
  Settings,
  Users,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/worklist', icon: ScanLine, label: 'Worklist' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/patients', icon: Users, label: 'Patients' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/audit', icon: Activity, label: 'Audit Trail' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className={`p-4 border-b border-slate-700 ${isCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">RADILENS</h1>
                  <p className="text-xs text-slate-400">AI Radiology Platform</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${isCollapsed ? 'justify-center px-2' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`p-4 border-t border-slate-700 ${isCollapsed ? 'px-3' : ''}`}>
          {profile && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold">
                  {profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={signOut}
            className={`mt-3 flex items-center w-full gap-3 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
