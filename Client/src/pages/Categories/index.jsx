import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, seedCategories, deleteCategory } from '../../store/categorySlice';
import CategoryFormModal from './CategoryFormModal';
import Pagination from '../../components/Pagination';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Wand2 } from 'lucide-react';
import * as Icons from 'lucide-react';

const CategoryIcon = ({ name, color, size = 20 }) => {
  const IconComponent = Icons[name] || Icons['Tag'];
  return <IconComponent size={size} color={color} />;
};

const CategoryTreeSection = ({ typeList, typeName, expandedParents, toggleExpand, handleAddNew, handleEdit, handleDelete }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const parents = useMemo(() => typeList.filter(c => !c.parent), [typeList]);

  const pagedParents = useMemo(() => {
    if (pageSize === 'all') return parents;
    const start = (page - 1) * pageSize;
    return parents.slice(start, start + pageSize);
  }, [parents, page, pageSize]);

  if (parents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
        No {typeName.toLowerCase()} categories found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {pagedParents.map(parent => {
          const children = typeList.filter(c => c.parent === parent._id);
          const isExpanded = expandedParents[parent._id] !== false; // Default to true
          
          return (
            <li key={parent._id} className="block">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div className="flex items-center space-x-3 flex-1 cursor-pointer" onClick={() => toggleExpand(parent._id)}>
                  <button className="text-gray-400 focus:outline-none">
                    {children.length > 0 ? (
                      isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4" /> // placeholder
                    )}
                  </button>
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <CategoryIcon name={parent.icon} color={parent.color} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{parent.name}</h4>
                    {children.length > 0 && <p className="text-xs text-gray-500">{children.length} subcategories</p>}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button onClick={() => handleAddNew(parent.type, parent._id)} className="p-1 text-gray-400 hover:text-green-600" title="Add Subcategory">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(parent)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(parent._id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && children.length > 0 && (
                <ul className="bg-gray-50 border-t border-gray-50 divide-y divide-gray-100">
                  {children.map(child => (
                    <li key={child._id} className="flex items-center justify-between py-3 pl-14 pr-4 hover:bg-gray-100 transition">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                        <span className="text-sm text-gray-700">{child.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(child)} className="p-1 text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(child._id)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <Pagination
        currentPage={page}
        totalItems={parents.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 'all']}
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

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category? All transactions linked to it may lose their categorization.')) {
      dispatch(deleteCategory(id));
    }
  };

  const toggleExpand = (id) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group by type and parent
  const expenses = useMemo(() => categories.filter(c => c.type === 'Expense'), [categories]);
  const incomes = useMemo(() => categories.filter(c => c.type === 'Income'), [categories]);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-1 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Manage your income and expense categories.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {categories.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-xs text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Wand2 className="w-4 h-4 mr-2 text-purple-500" />
              Generate Defaults
            </button>
          )}
          <button
            onClick={() => handleAddNew('Expense')}
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading && categories.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                Expenses
              </h2>
              <button 
                onClick={() => handleAddNew('Expense')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + New Expense
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
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                Income
              </h2>
              <button 
                onClick={() => handleAddNew('Income')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + New Income
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
