import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import { Loader2 } from 'lucide-react';

// ⚡ Route-Level Code Splitting & Dynamic Lazy Loading
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Categories = lazy(() => import('./pages/Categories'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Bills = lazy(() => import('./pages/Bills'));
const Budgets = lazy(() => import('./pages/Budgets'));
const People = lazy(() => import('./pages/People'));
const Goals = lazy(() => import('./pages/Goals'));
const Reports = lazy(() => import('./pages/Reports'));
const Investments = lazy(() => import('./pages/Investments'));
const Loans = lazy(() => import('./pages/Loans'));
const NetWorth = lazy(() => import('./pages/NetWorth'));
const Taxes = lazy(() => import('./pages/Taxes'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Intelligence = lazy(() => import('./pages/Intelligence'));

const PageLoader = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50/50">
    <div className="relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
      </div>
    </div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Loading Capise...</p>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/people" element={<People />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/networth" element={<NetWorth />} />
              <Route path="/taxes" element={<Taxes />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
