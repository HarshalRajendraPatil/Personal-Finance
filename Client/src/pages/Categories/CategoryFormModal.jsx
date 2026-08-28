import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { createCategory, updateCategory } from '../../store/categorySlice';
import { Loader2, X } from 'lucide-react';
import * as Icons from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['Income', 'Expense']),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  parent: z.string().optional().nullable(),
});

const ICON_OPTIONS = [
  'Tag', 'Home', 'Utensils', 'Car', 'Zap', 'Activity', 'Film', 'ShoppingBag', 
  'BookOpen', 'Briefcase', 'TrendingUp', 'PlusCircle', 'Coffee', 'Music', 'Plane',
  'Monitor', 'Smartphone', 'Gift', 'Heart', 'Smile'
];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#64748b'
];

const CategoryFormModal = ({ isOpen, onClose, category = null, parentId = null, prefilledType = 'Expense' }) => {
  const dispatch = useDispatch();
  const { categories, isLoading } = useSelector((state) => state.categories);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: prefilledType,
      icon: 'Tag',
      color: '#3b82f6',
      parent: parentId || '',
    },
  });

  const selectedType = watch('type');
  const selectedIcon = watch('icon');
  const selectedColor = watch('color');

  // Reset form when modal opens or category/parentId changes
  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        parent: category.parent || '',
      });
    } else {
      reset({
        name: '',
        type: prefilledType,
        icon: 'Tag',
        color: '#3b82f6',
        parent: parentId || '',
      });
    }
  }, [category, parentId, prefilledType, reset, isOpen]);

  const onSubmit = async (data) => {
    try {
      const formattedData = {
        ...data,
        parent: data.parent || null,
      };

      if (category) {
        await dispatch(updateCategory({ id: category._id, data: formattedData })).unwrap();
      } else {
        await dispatch(createCategory(formattedData)).unwrap();
      }
      onClose();
    } catch (err) {
      // Error is handled by global state if needed
    }
  };

  if (!isOpen) return null;

  // Filter parents to only show main categories of the selected type
  const parentOptions = categories.filter(c => !c.parent && c.type === selectedType && (!category || c._id !== category._id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {category ? 'Edit Category' : 'Add Category'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              {...register('type')}
              disabled={!!category || !!parentId} // Disable if editing or if it's a specific subcategory addition
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Parent Category (Optional)</label>
            <select
              {...register('parent')}
              disabled={!!category && !category.parent} // Main categories can't be turned into subcategories easily here
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None (Top Level)</option>
              {parentOptions.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Select a parent to make this a subcategory.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Groceries"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2 h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-gray-50">
              {ICON_OPTIONS.map(iconName => {
                const IconComponent = Icons[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setValue('icon', iconName)}
                    className={`p-2 flex items-center justify-center rounded-md ${
                      selectedIcon === iconName ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5 text-gray-700" />}
                  </button>
                );
              })}
            </div>
            {errors.icon && <p className="mt-1 text-sm text-red-600">{errors.icon.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map(hex => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setValue('color', hex)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === hex && COLOR_OPTIONS.includes(selectedColor) ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'
                  } transition-transform flex-shrink-0`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              
              <div className="relative flex items-center justify-center w-8 h-8 ml-2 group" title="Choose custom color">
                <input
                  type="color"
                  {...register('color')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${
                    !COLOR_OPTIONS.includes(selectedColor) ? 'border-gray-900 scale-110' : 'border-gray-300 border-dashed group-hover:scale-110'
                  }`}
                  style={{ backgroundColor: !COLOR_OPTIONS.includes(selectedColor) ? selectedColor : '#ffffff' }}
                >
                  {COLOR_OPTIONS.includes(selectedColor) && <span className="text-gray-400 text-lg leading-none -mt-0.5">+</span>}
                </div>
              </div>
            </div>
            {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>}
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : (category ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
