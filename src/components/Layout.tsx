import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  MoreHorizontal,
  LogOut,
  UserCircle,
  Settings,
  Receipt,
  GraduationCap,
  Menu,
  X,
  Wallet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: GraduationCap },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { name: 'Fees', path: '/fees', icon: IndianRupee, roles: ['admin', 'accountant'] },
    { name: 'More', path: '/more', icon: MoreHorizontal },
  ].filter(item => !item.roles || (profile && item.roles.includes(profile.role)));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-64">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[70] md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-600 p-2 rounded-xl">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">Gramshala</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto no-scrollbar">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center px-4 py-4 text-base font-bold rounded-2xl transition-all",
                      isActive 
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </NavLink>
                ))}
                
                {profile?.role === 'admin' && (
                  <>
                    <div className="pt-6 pb-2 px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      Administration
                    </div>
                    <NavLink
                      to="/staff"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center px-4 py-4 text-base font-bold rounded-2xl transition-all",
                        isActive 
                          ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Users className="mr-4 h-6 w-6" />
                      Staff & Salaries
                    </NavLink>
                    <NavLink
                      to="/expenses"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center px-4 py-4 text-base font-bold rounded-2xl transition-all",
                        isActive 
                          ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Receipt className="mr-4 h-6 w-6" />
                      Expenses
                    </NavLink>
                    <NavLink
                      to="/funds"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center px-4 py-4 text-base font-bold rounded-2xl transition-all",
                        isActive 
                          ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Wallet className="mr-4 h-6 w-6" />
                      Fund Management
                    </NavLink>
                  </>
                )}
              </nav>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center p-3 bg-white rounded-2xl border border-gray-100 mb-4 shadow-sm">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-black text-gray-900 truncate">{profile?.full_name}</p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{profile?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-4 py-4 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-all active:scale-95 border border-red-100"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50">
        <div className="p-6 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Gramshala</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                isActive 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
          
          {profile?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </div>
              <NavLink
                to="/staff"
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Users className="mr-3 h-5 w-5" />
                Staff & Salaries
              </NavLink>
              <NavLink
                to="/expenses"
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Receipt className="mr-3 h-5 w-5" />
                Expenses
              </NavLink>
              <NavLink
                to="/funds"
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Wallet className="mr-3 h-5 w-5" />
                Fund Management
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center p-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name}</p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl bg-gray-50 text-gray-600 active:scale-95 transition-all"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{profile?.role}</p>
          </div>
        </div>
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
          {profile?.full_name?.charAt(0) || 'U'}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name}</p>
        </div>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 px-2 py-1">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center py-2 px-3 rounded-xl transition-all",
                isActive ? "text-indigo-600" : "text-gray-500"
              )}
            >
              <item.icon className={cn("h-6 w-6 mb-1")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
