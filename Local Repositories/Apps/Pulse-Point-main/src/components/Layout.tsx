import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, FileText, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  // Clear all session data when the window is closed or refreshed
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Clear all session storage
      sessionStorage.clear();
      
      // Show warning if user hasn't explicitly saved/printed
      const hasUnsavedData = sessionStorage.getItem('hasUnsavedAssessmentData');
      if (hasUnsavedData) {
        e.preventDefault();
        e.returnValue = 'You have unsaved assessment data. Please print or download your results before leaving.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const navigation = [
    { name: 'Assessments', href: '/assessments', icon: FileText },
    { name: 'Resources', href: '/resources', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200">
        <div className="flex items-center px-6 py-8 border-b border-slate-200">
          <Activity className="h-8 w-8 text-primary" />
          <div className="ml-3">
            <h1 className="text-xl font-bold text-slate-900">PulsePoint</h1>
            <p className="text-sm text-slate-600">Private. Confidential. Secure.</p>
          </div>
        </div>
        
        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 mb-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-4 border-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                {item.name}
              </Link>
          );
        })}
      </nav>
    </div>      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Trauma Assessment Tools</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600">
                <span className="font-medium">Session Active - Data Not Saved</span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
