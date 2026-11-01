import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import authService from '../services/authService';
import { fetchProactiveNudges, fetchSalaryPlan, fetchSubscriptionAudit, fetchOverdraftForecast, openWhatIfModal } from '../store/proactiveSlice';
import ActionCenterDrawer from '../components/ActionCenterDrawer';
import AICopilotDrawer from '../components/AICopilotDrawer';
import SalaryDistributorModal from '../components/SalaryDistributorModal';
import SubscriptionAuditModal from '../components/SubscriptionAuditModal';
import OverdraftShieldModal from '../components/OverdraftShieldModal';
import WhatIfSimulatorModal from '../components/WhatIfSimulatorModal';
import ThemeToggle from '../components/ui/ThemeToggle';
import PwaInstallBanner from '../components/ui/PwaInstallBanner';
import PwaInstallButton from '../components/ui/PwaInstallButton';
import {
  User, LogOut, LayoutDashboard, Wallet, Tags, ArrowRightLeft,
  CalendarClock, PiggyBank, Users, Target, BarChart3, TrendingUp,
  Building2, Scale, Activity, Menu, X, ChevronRight, Bell,
  Bot, Compass
} from 'lucide-react';

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { nudges } = useSelector((state) => state.proactive);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    try {
      setIsResendingVerification(true);
      await authService.resendVerification(user.email);
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  useEffect(() => {
    dispatch(fetchProactiveNudges());
    dispatch(fetchSalaryPlan());
    dispatch(fetchSubscriptionAudit());
    dispatch(fetchOverdraftForecast());
  }, [dispatch]);

  useEffect(() => {
    const path = location.pathname;
    let pageName = 'Dashboard';
    if (path !== '/' && path.length > 1) {
      const section = path.split('/')[1];
      pageName = section.charAt(0).toUpperCase() + section.slice(1);
    }
    document.title = `${pageName}`;
  }, [location]);

  // Close mobile menu whenever location/route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    dispatch(logout());
    navigate('/login');
  };

  const navLinks = [
    {
      group: 'Core',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      group: 'Ledger',
      items: [
        { path: '/accounts', label: 'Accounts', icon: Wallet },
        { path: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
        { path: '/categories', label: 'Categories', icon: Tags },
      ]
    },
    {
      group: 'Planning',
      items: [
        { path: '/calendar', label: 'Calendar', icon: CalendarClock },
        { path: '/bills', label: 'Bills & Recurring', icon: CalendarClock },
        { path: '/budgets', label: 'Budgets', icon: PiggyBank },
      ]
    },
    {
      group: 'People & Goals',
      items: [
        { path: '/people', label: 'People', icon: Users },
        { path: '/goals', label: 'Goals', icon: Target },
      ]
    },
    {
      group: 'Insights & AI',
      items: [
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/intelligence', label: 'Intelligence', icon: Activity },
      ]
    },
    {
      group: 'Wealth',
      items: [
        { path: '/investments', label: 'Investments', icon: TrendingUp },
        { path: '/loans', label: 'Loans & EMIs', icon: Building2 },
        { path: '/networth', label: 'Net Worth', icon: Scale },
        { path: '/taxes', label: 'Taxes', icon: Wallet },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#090d16] text-gray-900 dark:text-slate-100 flex flex-col md:flex-row w-full overflow-x-hidden transition-colors duration-200">

      {/* ── Mobile Top Header (Visible only on screens < md) ── */}
      <header className="no-print md:hidden bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 px-4 h-16 pt-[env(safe-area-inset-top,0px)] flex items-center justify-between shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Capise</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Action Center Bell */}
          <button
            onClick={() => setIsActionCenterOpen(true)}
            className="p-2 text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
            title="Proactive Action Center"
          >
            <Bell className="w-5 h-5" />
            {nudges.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <Link to="/profile" className="flex items-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="" className="h-8 w-8 rounded-full bg-gray-200 object-cover ring-2 ring-indigo-500/20" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User className="h-4 w-4" />
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* ── Mobile Slide-over Drawer / Backdrop ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-[#0f172a] shadow-2xl z-10 animate-in slide-in-from-left duration-300 border-r border-gray-100 dark:border-slate-800">

            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-xs">
                  <Activity className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Capise</h2>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">

              {navLinks.map((section) => (
                <div key={section.group}>
                  {section.group !== 'Core' && (
                    <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      {section.group}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map(({ path, label, icon: Icon }) => {
                      const active = isActive(path);
                      return (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${active
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                            : 'text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-400'}`} />
                            <span>{label}</span>
                          </div>
                          {active && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer Profile & Signout */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 space-y-3">
              <PwaInstallButton />
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
              >
                {user?.profilePic ? (
                  <img src={user.profilePic} alt="" className="h-9 w-9 rounded-full bg-gray-200 object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User Profile'}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email || 'View details'}</p>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Desktop Sidebar (Visible on md and larger) ── */}
      <aside className="w-64 bg-white dark:bg-[#0f172a] border-r border-gray-200 dark:border-slate-800 hidden md:flex md:flex-col fixed inset-y-0 left-0 z-30 no-print transition-colors duration-200">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-xs">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Capise</span>
          </Link>

          {/* Header Controls: Theme Switcher & Action Center Bell */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => setIsActionCenterOpen(true)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800/80 rounded-lg relative transition-colors"
              title="Proactive Action Center"
            >
              <Bell className="w-5 h-5" />
              {nudges.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-4">

          <nav className="px-3 space-y-4">
            {navLinks.map((section) => (
              <div key={section.group}>
                {section.group !== 'Core' && (
                  <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    {section.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map(({ path, label, icon: Icon }) => {
                    const active = isActive(path);
                    return (
                      <Link
                        key={path}
                        to={path}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${active
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 font-semibold'
                          : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
                          }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-400'}`} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 shrink-0 space-y-2">
          <PwaInstallButton />
          <Link to="/profile" className="flex items-center group p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="" className="h-8 w-8 rounded-full bg-gray-200 object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400 truncate">Settings & Profile</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400 dark:text-slate-400 group-hover:text-rose-500" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area (Mobile & Desktop) ── */}
      <main className="flex-1 flex flex-col min-w-0 w-full md:pl-64 overflow-x-hidden relative">
        {/* Email Verification Reminder Banner */}
        {user && !user.isEmailVerified && user.authProvider !== 'google' && (
          <div className="no-print bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span>
                Your email address <strong>({user.email})</strong> is not verified yet. Please verify your account.
              </span>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={isResendingVerification || verificationSent}
              className="font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer disabled:opacity-50"
            >
              {isResendingVerification
                ? 'Sending link...'
                : verificationSent
                ? 'Verification email sent! ✓'
                : 'Resend verification email'}
            </button>
          </div>
        )}

        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden pb-20 md:pb-8">
          <Outlet />
        </div>

        {/* 🔮 Time-Machine Simulator Floating Button */}
        <button
          onClick={() => dispatch(openWhatIfModal())}
          className="no-print fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-6 sm:right-56 z-40 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-purple-400/30 group"
          aria-label="Open What-If Financial Time-Machine"
          title="Predictive What-If Financial Time-Machine"
        >
          <Compass className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
          <span className="hidden sm:inline font-bold text-xs tracking-wide">Time-Machine 🔮</span>
        </button>

        {/* 🤖 AI Copilot Floating Launcher */}
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="no-print fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-40 bg-gradient-to-r from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-slate-900 text-white p-3.5 sm:px-5 sm:py-3 rounded-full shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-indigo-500/30 group"
          aria-label="Open AI Copilot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-indigo-200 group-hover:text-white transition-colors" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="hidden sm:inline font-bold text-xs tracking-wide">Capise Copilot (AI)</span>
        </button>
      </main>

      {/* ── Modals, Drawers and PWA Banner ── */}
      <ActionCenterDrawer isOpen={isActionCenterOpen} onClose={() => setIsActionCenterOpen(false)} />
      <AICopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
      <SalaryDistributorModal />
      <SubscriptionAuditModal />
      <OverdraftShieldModal />
      <WhatIfSimulatorModal />
      <PwaInstallBanner />

    </div>
  );
};

export default MainLayout;
