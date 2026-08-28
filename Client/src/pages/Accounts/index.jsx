import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccounts, deleteAccount } from '../../store/accountSlice';
import AccountFormModal from './AccountFormModal';
import { Plus, Building2, CreditCard, Wallet, IndianRupee, Trash2, Edit2, Archive } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

const getAccountIcon = (type) => {
  switch (type) {
    case 'Bank': return <Building2 className="w-5 h-5 text-blue-500" />;
    case 'Credit Card': return <CreditCard className="w-5 h-5 text-purple-500" />;
    case 'Cash': return <IndianRupee className="w-5 h-5 text-green-500" />;
    default: return <Wallet className="w-5 h-5 text-gray-500" />;
  }
};

const Accounts = () => {
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.accounts);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      dispatch(deleteAccount(id));
    }
  };

  const activeAccounts = accounts.filter(acc => !acc.isArchived);
  const archivedAccounts = accounts.filter(acc => acc.isArchived);

  // Quick Stats
  const totalAssets = activeAccounts
    .filter(acc => acc.type !== 'Credit Card' && acc.currentBalance >= 0)
    .reduce((sum, acc) => sum + acc.currentBalance, 0);
    
  const totalLiabilities = activeAccounts
    .filter(acc => acc.type === 'Credit Card' || acc.currentBalance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.currentBalance), 0);

  const netBalance = totalAssets - totalLiabilities;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts & Wallets</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your bank accounts, credit cards, and cash.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Net Balance</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(netBalance)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Assets</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Liabilities</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Account List */}
      {isLoading && accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading accounts...</p>
        </div>
      ) : activeAccounts.length === 0 ? (
        <div className="text-center bg-white rounded-xl border border-gray-200 border-dashed py-16">
          <Wallet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new account.</p>
          <div className="mt-6">
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
          <ul className="divide-y divide-gray-100">
            {activeAccounts.map((account) => (
              <li key={account._id} className="p-6 hover:bg-gray-50 transition duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                      <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-xs">
                          {account.type}
                        </span>
                        {account.notes && (
                          <span className="truncate max-w-[200px] hidden sm:inline-block">
                            • {account.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-lg font-bold ${
                      account.type === 'Credit Card' || account.currentBalance < 0 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {formatCurrency(account.currentBalance, account.currency)}
                    </span>
                    <div className="flex space-x-3 mt-2">
                      <button 
                        onClick={() => handleEdit(account)}
                        className="text-gray-400 hover:text-blue-600 transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(account._id)}
                        className="text-gray-400 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Render archived accounts section if any exist */}
      {archivedAccounts.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Archive className="w-5 h-5 mr-2 text-gray-500" />
            Archived Accounts
          </h3>
          <div className="bg-gray-50 shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {archivedAccounts.map((account) => (
                <li key={account._id} className="p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 text-gray-400">
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <h3 className="text-md font-medium text-gray-700">{account.name}</h3>
                        <p className="text-xs text-gray-500">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </span>
                      <button 
                        onClick={() => handleEdit(account)}
                        className="text-xs text-blue-600 mt-1 hover:underline"
                      >
                        Restore/Edit
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <AccountFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        account={editingAccount} 
      />
    </div>
  );
};

export default Accounts;
