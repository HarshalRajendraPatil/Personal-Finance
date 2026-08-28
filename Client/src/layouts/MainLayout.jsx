import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { User, LogOut, LayoutDashboard, Wallet, Tags, ArrowRightLeft, CalendarClock, PiggyBank, Users, Target, BarChart3, TrendingUp, Building2, Scale, Activity } from 'lucide-react';

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Finance OS</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-1">
            <Link to="/dashboard" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/dashboard') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <LayoutDashboard className={`mr-3 h-5 w-5 ${isActive('/dashboard') ? 'text-gray-500' : 'text-gray-400'}`} />
              Dashboard
            </Link>
            
            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ledger</p>
            <Link to="/accounts" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/accounts') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Wallet className={`mr-3 h-5 w-5 ${isActive('/accounts') ? 'text-gray-500' : 'text-gray-400'}`} />
              Accounts
            </Link>
            <Link to="/transactions" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/transactions') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <ArrowRightLeft className={`mr-3 h-5 w-5 ${isActive('/transactions') ? 'text-gray-500' : 'text-gray-400'}`} />
              Transactions
            </Link>
            <Link to="/categories" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/categories') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Tags className={`mr-3 h-5 w-5 ${isActive('/categories') ? 'text-gray-500' : 'text-gray-400'}`} />
              Categories
            </Link>

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Planning</p>
            <Link to="/calendar" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/calendar') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <CalendarClock className={`mr-3 h-5 w-5 ${isActive('/calendar') ? 'text-gray-500' : 'text-gray-400'}`} />
              Calendar
            </Link>
            <Link to="/bills" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/bills') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <CalendarClock className={`mr-3 h-5 w-5 ${isActive('/bills') ? 'text-gray-500' : 'text-gray-400'}`} />
              Bills & Recurring
            </Link>
            <Link to="/budgets" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/budgets') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <PiggyBank className={`mr-3 h-5 w-5 ${isActive('/budgets') ? 'text-gray-500' : 'text-gray-400'}`} />
              Budgets
            </Link>

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">People & Goals</p>
            <Link to="/people" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/people') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Users className={`mr-3 h-5 w-5 ${isActive('/people') ? 'text-gray-500' : 'text-gray-400'}`} />
              People
            </Link>
            <Link to="/goals" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/goals') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Target className={`mr-3 h-5 w-5 ${isActive('/goals') ? 'text-gray-500' : 'text-gray-400'}`} />
              Goals
            </Link>

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Insights</p>
            <Link to="/reports" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/reports') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <BarChart3 className={`mr-3 h-5 w-5 ${isActive('/reports') ? 'text-gray-500' : 'text-gray-400'}`} />
              Reports
            </Link>
            <Link to="/intelligence" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/intelligence') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Activity className={`mr-3 h-5 w-5 ${isActive('/intelligence') ? 'text-gray-500' : 'text-gray-400'}`} />
              Intelligence
            </Link>

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Wealth</p>
            <Link to="/investments" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/investments') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <TrendingUp className={`mr-3 h-5 w-5 ${isActive('/investments') ? 'text-gray-500' : 'text-gray-400'}`} />
              Investments
            </Link>
            <Link to="/loans" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/loans') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Building2 className={`mr-3 h-5 w-5 ${isActive('/loans') ? 'text-gray-500' : 'text-gray-400'}`} />
              Loans & EMIs
            </Link>
            <Link to="/networth" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/networth') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Scale className={`mr-3 h-5 w-5 ${isActive('/networth') ? 'text-gray-500' : 'text-gray-400'}`} />
              Net Worth
            </Link>
            <Link to="/taxes" className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/taxes') ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              <Wallet className={`mr-3 h-5 w-5 ${isActive('/taxes') ? 'text-gray-500' : 'text-gray-400'}`} />
              Taxes
            </Link>
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <Link to="/profile" className="flex items-center group mb-4">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="" className="h-8 w-8 rounded-full bg-gray-200 object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{user?.name}</p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">View profile</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
