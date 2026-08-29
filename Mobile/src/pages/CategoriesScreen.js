import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCategories,
  seedCategories,
  deleteCategory,
} from '../store/categorySlice';
import CategoryFormModal from '../components/CategoryFormModal';
import CategoryIcon from '../components/CategoryIcon';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Wand2,
} from 'lucide-react-native';

const CategoriesScreen = () => {
  const dispatch = useDispatch();
  const { categories, isLoading, error } = useSelector((state) => state.categories);

  const [activeTab, setActiveTab] = useState('Expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [prefilledParentId, setPrefilledParentId] = useState(null);
  const [prefilledType, setPrefilledType] = useState('Expense');
  const [expandedParents, setExpandedParents] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCategories());
    setRefreshing(false);
  }, [dispatch]);

  const handleSeed = () => {
    dispatch(seedCategories());
  };

  const handleAddNew = (type = activeTab, parentId = null) => {
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
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category? All subcategories will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteCategory(id)),
        },
      ]
    );
  };

  const toggleExpand = (id) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expenses = categories.filter((c) => c.type === 'Expense');
  const incomes = categories.filter((c) => c.type === 'Income');
  const currentList = activeTab === 'Expense' ? expenses : incomes;
  const parentCategories = currentList.filter((c) => !c.parent);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.screenTitle}>Categories</Text>
            <Text style={styles.screenSubtitle}>
              Manage income & expense categories.
            </Text>
          </View>

          <View style={styles.headerActions}>
            {categories.length === 0 && (
              <TouchableOpacity
                style={styles.seedBtn}
                onPress={handleSeed}
                disabled={isLoading}
              >
                <Wand2 size={16} color={COLORS.purple} />
                <Text style={styles.seedBtnText}>Seed</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleAddNew(activeTab)}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher (Expense / Income) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Expense' && styles.tabBtnExpenseActive]}
            onPress={() => setActiveTab('Expense')}
          >
            <View style={[styles.tabDot, { backgroundColor: COLORS.danger }]} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'Expense' && styles.tabBtnTextActive,
              ]}
            >
              Expenses ({expenses.filter((c) => !c.parent).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Income' && styles.tabBtnIncomeActive]}
            onPress={() => setActiveTab('Income')}
          >
            <View style={[styles.tabDot, { backgroundColor: COLORS.success }]} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'Income' && styles.tabBtnTextActive,
              ]}
            >
              Income ({incomes.filter((c) => !c.parent).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Content */}
        {isLoading && categories.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        ) : parentCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No {activeTab.toLowerCase()} categories found
            </Text>
            <Text style={styles.emptySubtitle}>
              Get started by adding a category or generate default ones.
            </Text>
            <View style={styles.emptyBtnRow}>
              {categories.length === 0 && (
                <TouchableOpacity
                  style={styles.emptySeedBtn}
                  onPress={handleSeed}
                  disabled={isLoading}
                >
                  <Wand2 size={16} color={COLORS.purple} />
                  <Text style={styles.emptySeedBtnText}>Generate Defaults</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => handleAddNew(activeTab)}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyAddBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.treeCard}>
            {parentCategories.map((parent, index) => {
              const children = currentList.filter((c) => c.parent === parent._id);
              const isExpanded = expandedParents[parent._id] !== false; // Default expanded
              const isLast = index === parentCategories.length - 1;

              return (
                <View
                  key={parent._id}
                  style={[styles.parentWrapper, !isLast && styles.itemBorder]}
                >
                  {/* Parent Row */}
                  <View style={styles.parentRow}>
                    <TouchableOpacity
                      style={styles.parentLeft}
                      onPress={() => toggleExpand(parent._id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chevronBox}>
                        {children.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown size={18} color={COLORS.textMuted} />
                          ) : (
                            <ChevronRight size={18} color={COLORS.textMuted} />
                          )
                        ) : (
                          <View style={{ width: 18 }} />
                        )}
                      </View>

                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: COLORS.surfaceAlt },
                        ]}
                      >
                        <CategoryIcon
                          name={parent.icon}
                          color={parent.color}
                          size={20}
                        />
                      </View>

                      <View style={styles.parentInfo}>
                        <Text style={styles.parentName} numberOfLines={1}>
                          {parent.name}
                        </Text>
                        {children.length > 0 ? (
                          <Text style={styles.subCount}>
                            {children.length} subcategor{children.length > 1 ? 'ies' : 'y'}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.parentActions}>
                      <TouchableOpacity
                        onPress={() => handleAddNew(parent.type, parent._id)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Plus size={16} color={COLORS.success} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleEdit(parent)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(parent._id)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Subcategories List */}
                  {isExpanded && children.length > 0 && (
                    <View style={styles.subList}>
                      {children.map((child, cIdx) => (
                        <View
                          key={child._id}
                          style={[
                            styles.subRow,
                            cIdx !== children.length - 1 && styles.subItemBorder,
                          ]}
                        >
                          <View style={styles.subLeft}>
                            <View
                              style={[
                                styles.subDot,
                                { backgroundColor: child.color || parent.color },
                              ]}
                            />
                            <Text style={styles.subName}>{child.name}</Text>
                          </View>

                          <View style={styles.subActions}>
                            <TouchableOpacity
                              onPress={() => handleEdit(child)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Edit2 size={14} color={COLORS.textLight} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDelete(child._id)}
                              style={styles.actionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={14} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Category Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={editingCategory}
        parentId={prefilledParentId}
        prefilledType={prefilledType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  screenSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    ...SHADOWS.sm,
  },
  seedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tabBtnExpenseActive: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  tabBtnIncomeActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.textMain,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.dangerText,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  emptySeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptySeedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  treeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  parentWrapper: {
    backgroundColor: COLORS.surface,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  parentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  chevronBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  subCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  parentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  subList: {
    backgroundColor: COLORS.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingLeft: 46,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 14,
  },
  subItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  subName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default CategoriesScreen;
