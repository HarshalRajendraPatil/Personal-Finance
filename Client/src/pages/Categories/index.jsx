import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, seedCategories, deleteCategory } from '../../store/categorySlice';
import CategoryFormModal from './CategoryFormModal';
import Pagination from '../../components/Pagination';
import CapiseLoader from '../../components/ui/CapiseLoader';
import { isCategoryNameReserved } from '../../constants/reservedCategories';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Wand2, Search, X } from 'lucide-react';
import * as Icons from 'lucide-react';

const CategoryIcon = ({ name, color, size = 20 }) => {
  const IconComponent = Icons[name] || Icons['Tag'];
  return <IconComponent size={size} color={color} />;
};

const CategoryTreeSection = ({
  typeList,
  typeName,
  expandedParents,
  toggleExpand,
  handleAddNew,
  handleEdit,
  handleDelete,
  searchQuery,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter parents and children based on search query
  const filteredParents = useMemo(() => {
    const allParents = typeList.filter((c) => !c.parent);
    if (!searchQuery.trim()) return allParents;

    const q = searchQuery.trim().toLowerCase();
    return allParents.filter((p) => {
      const parentMatches = p.name.toLowerCase().includes(q);
      const childrenMatch = typeList.some((c) => c.parent === p._id && c.name.toLowerCase().includes(q));
      return parentMatches || childrenMatch;
    });
  }, [typeList, searchQuery]);

  const pagedParents = useMemo(() => {
    if (pageSize === 'all') return filteredParents;
    const start = (page - 1) * pageSize;
    return filteredParents.slice(start, start + pageSize);
  }, [filteredParents, page, pageSize]);

  if (filteredParents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
        {searchQuery ? `No ${typeName.toLowerCase()} categories match "${searchQuery}".` : `No ${typeName.toLowerCase()} categories found.`}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {pagedParents.map((parent) => {
          const children = typeList.filter((c) => c.parent === parent._id);
          const isExpanded = searchQuery.trim() ? true : expandedParents[parent._id] !== false; // Auto-expand when searching
          const isDefault = isCategoryNameReserved(parent.name);

          return (
            <li key={parent._id} className="block">
              <div className="flex items-center justify-between p-3.5 hover:bg-gray-50/70 transition">
                <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(parent._id)}>
                  <button type="button" className="text-gray-400 focus:outline-none flex-shrink-0">
                    {children.length > 0 ? (
                      isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </button>
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0">
                    <CategoryIcon name={parent.icon} color={parent.color} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{parent.name}</h4>
                      {isDefault && (
                        <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-gray-100 text-gray-500 rounded border border-gray-200 flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    {children.length > 0 && (
                      <p className="text-xs text-gray-400">{children.length} subcategories</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleAddNew(parent.type, parent._id)}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition cursor-pointer"
                    title="Add Subcategory"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(parent)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isDefault ? (
                    <span
                      className="p-1.5 text-gray-300 cursor-not-allowed"
                      title="System default category cannot be deleted"
                    >
                      <Trash2 className="w-4 h-4 opacity-30" />
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(parent)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition cursor-pointer"
                      title="Delete Custom Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && children.length > 0 && (
                <ul className="bg-gray-50/60 border-t border-gray-100 divide-y divide-gray-100/60">
                  {children.map((child) => {
                    const isChildDefault = isCategoryNameReserved(child.name);
                    return (
                      <li key={child._id} className="flex items-center justify-between py-2.5 pl-12 pr-4 hover:bg-gray-100/70 transition">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: child.color }} />
                          <span className="text-xs sm:text-sm text-gray-700 truncate">{child.name}</span>
                          {isChildDefault && (
                            <span className="px-1.5 py-0.2 text-[9px] font-medium bg-gray-100 text-gray-400 rounded border border-gray-200 flex-shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(child)}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Subcategory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isChildDefault ? (
                            <span
                              className="p-1 text-gray-300 cursor-not-allowed"
                              title="System default subcategory cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5 opacity-30" />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDelete(child)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <Pagination
        currentPage={page}
        totalItems={filteredParents.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 'all']}
        itemLabel={`${typeName.toLowerCase()} categories`}
      />
    </div>
  );
};

const Categories = () => {
  const dispatch = useDispatch();
  const { categories, isLoading, error } = useSelector((state) => state.categories);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [prefilledParentId, setPrefilledParentId] = useState(null);
  const [prefilledType, setPrefilledType] = useState('Expense');
  const [expandedParents, setExpandedParents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSeed = () => {
    dispatch(seedCategories());
  };

  const handleAddNew = (type = 'Expense', parentId = null) => {
    setEditingCategory(null);
    setPrefilledType(type);
    setPrefilledParentId(parentId);
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setPrefilledType(category.type);
    setPrefilledParentId(category.parent);
    setIsModalOpen(true);
  };

  const handleDelete = (category) => {
    if (!category) return;
    if (isCategoryNameReserved(category.name)) {
      alert(`"${category.name}" is a default system category and cannot be deleted.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${category.name}"? All transactions linked to it may lose their categorization.`)) {
      dispatch(deleteCategory(category._id));
    }
  };

  const toggleExpand = (id) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group by type and parent
  const expenses = useMemo(() => categories.filter((c) => c.type === 'Expense'), [categories]);
  const incomes = useMemo(() => categories.filter((c) => c.type === 'Income'), [categories]);

  const totalExpenseSubs = useMemo(() => expenses.filter((c) => c.parent).length, [expenses]);
  const totalIncomeSubs = useMemo(() => incomes.filter((c) => c.parent).length, [incomes]);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
            System defaults and custom classifications ({categories.length} total across Income & Expense).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {categories.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-xs text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Wand2 className="w-4 h-4 mr-2 text-purple-500" />
              Generate Defaults
            </button>
          )}
          <button
            onClick={() => handleAddNew('Expense')}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Category
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories or subcategories..."
          className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {isLoading && categories.length === 0 ? (
        <div className="py-12">
          <CapiseLoader
            size="md"
            text="Loading Categories"
            subtext="Ensuring standard default taxonomy and custom classifications..."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                Expenses
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({expenses.filter((c) => !c.parent).length} parents · {totalExpenseSubs} subcategories)
                </span>
              </h2>
              <button
                onClick={() => handleAddNew('Expense')}
                className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Add Expense
              </button>
            </div>
            <CategoryTreeSection
              typeList={expenses}
              typeName="Expense"
              expandedParents={expandedParents}
              toggleExpand={toggleExpand}
              handleAddNew={handleAddNew}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              searchQuery={searchQuery}
            />
          </div>

          {/* Income Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                Income
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({incomes.filter((c) => !c.parent).length} parents · {totalIncomeSubs} subcategories)
                </span>
              </h2>
              <button
                onClick={() => handleAddNew('Income')}
                className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                + Add Income
              </button>
            </div>
            <CategoryTreeSection
              typeList={incomes}
              typeName="Income"
              expandedParents={expandedParents}
              toggleExpand={toggleExpand}
              handleAddNew={handleAddNew}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      )}

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={editingCategory}
        parentId={prefilledParentId}
        prefilledType={prefilledType}
      />
    </div>
  );
};

export default Categories;
