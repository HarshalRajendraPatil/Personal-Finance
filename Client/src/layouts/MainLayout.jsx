import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  User, LogOut, LayoutDashboard, Wallet, Tags, ArrowRightLeft,
  CalendarClock, PiggyBank, Users, Target, BarChart3, TrendingUp,
  Building2, Scale, Activity, Menu, X, ChevronRight
} from 'lucide-react';

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row w-full overflow-x-hidden">

      {/* ── Mobile Top Header (Visible only on screens < md) ── */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-30 px-4 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Capise</span>
          </Link>
        </div>

        <Link to="/profile" className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
          {user?.profilePic ? (
            <img src={user.profilePic} alt="" className="h-8 w-8 rounded-full bg-gray-200 object-cover ring-2 ring-indigo-500/20" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <User className="h-4 w-4" />
            </div>
          )}
        </Link>
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
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-300">

            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-xs">
                  <Activity className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">Capise</h2>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                    <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                            ? 'text-indigo-600 bg-indigo-50 font-semibold'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
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
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors"
              >
                {user?.profilePic ? (
                  <img src={user.profilePic} alt="" className="h-9 w-9 rounded-full bg-gray-200 object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User Profile'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'View details'}</p>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Desktop Sidebar (Visible on md and larger) ── */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col md:h-screen md:sticky md:top-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-xs">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Capise</span>
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-4">
            {navLinks.map((section) => (
              <div key={section.group}>
                {section.group !== 'Core' && (
                  <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                          ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
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
        <div className="p-4 border-t border-gray-200">
          <Link to="/profile" className="flex items-center group mb-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="" className="h-8 w-8 rounded-full bg-gray-200 object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 group-hover:text-gray-500 truncate">Settings & Profile</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-rose-500" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area (Mobile & Desktop) ── */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default MainLayout;
