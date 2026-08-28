import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Transactions from './pages/Transactions';
import Bills from './pages/Bills';
import Budgets from './pages/Budgets';
import People from './pages/People';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Investments from './pages/Investments';
import Loans from './pages/Loans';
import NetWorth from './pages/NetWorth';
import Taxes from './pages/Taxes';
import Calendar from './pages/Calendar';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard';
import Intelligence from './pages/Intelligence';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
