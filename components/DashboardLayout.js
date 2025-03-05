import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Footer from './Footer';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (res.ok) {
        localStorage.removeItem('user');
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    setIsMenuOpen(false);
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/projects', label: 'Projects', icon: '📁' },
    { path: '/tasks/board', label: 'Task Board', icon: '📋' },
    { path: '/time', label: 'Time Tracking', icon: '⏱️' },
    { path: '/time/reports', label: 'Reports', icon: '📈' },
  ];

  const isActive = (path) => router.pathname === path;

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-base-200 min-h-screen">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-8">Agency Dashboard</h1>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-300 ${
                  isActive(item.path) ? 'bg-primary text-primary-content' : ''
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-base-100 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-end items-center py-4">
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <span>{user.email}</span>
                  <svg 
                    className={`w-4 h-4 transform transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-lg shadow-xl py-2">
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-base-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 bg-base-200 p-4">
          <div className="container mx-auto">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
} 