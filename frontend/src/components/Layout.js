import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  DollarSign, 
  Bell, 
  LogOut, 
  Menu,
  X,
  Plane,
  Users,
  Plus,
  Package,
  Calendar,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api } from '../utils/api';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await api.getNotifications(user.id, true);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const getNavItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['operations', 'sales', 'accountant', 'customer', 'admin'] }
    ];

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { path: '/requests', icon: FileText, label: 'Requests', roles: ['admin'] },
        { path: '/admin-panel', icon: Users, label: 'Admin Panel', roles: ['admin'] },
        { path: '/admin-settings', icon: Settings, label: 'Admin Settings', roles: ['admin'] }
      ];
    }

    if (user?.role === 'operations') {
      return [
        ...baseItems,
        { path: '/requests', icon: FileText, label: 'Requests', roles: ['operations'] },
        { path: '/catalog', icon: Package, label: 'Catalog', roles: ['operations'] },
        { path: '/payments', icon: DollarSign, label: 'Payments', roles: ['operations'] },
        { path: '/leaves', icon: Calendar, label: 'Leave Management', roles: ['operations'] }
      ];
    }

    if (user?.role === 'sales') {
      return [
        ...baseItems,
        { path: '/requests', icon: FileText, label: 'Requests', roles: ['sales'] },
        { path: '/open-requests', icon: Users, label: 'Open Requests', roles: ['sales'] },
        { path: '/quotes', icon: FileText, label: 'My Quotes', roles: ['sales'] },
        { path: '/leaves', icon: Calendar, label: 'Leave Management', roles: ['sales'] }
      ];
    }

    if (user?.role === 'accountant') {
      return [
        ...baseItems,
        { path: '/payments', icon: DollarSign, label: 'Payments', roles: ['accountant'] }
      ];
    }

    if (user?.role === 'customer') {
      return [
        ...baseItems,
        { path: '/my-requests', icon: FileText, label: 'My Requests', roles: ['customer'] },
        { path: '/requests/new', icon: Plus, label: 'New Request', roles: ['customer'] }
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              data-testid="mobile-menu-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 hidden sm:inline">QuoteVista</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="relative p-2 hover:bg-gray-100 rounded-lg"
              data-testid="notifications-button"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs">
                  {notifications.length}
                </Badge>
              )}
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-600 hover:text-red-600"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 transition-transform duration-200 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="pt-14 lg:pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};