import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { AdminLogin } from './components/AdminLogin';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import { auth } from './firebase/config';
import { LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error: any) {
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminLogin onLogin={() => setIsAuthenticated(true)} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Firebase Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span>{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>

        <Dashboard 
          activeSection={activeSection}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;