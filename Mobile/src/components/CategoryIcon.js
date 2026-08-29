import React from 'react';
import {
  Tag,
  Home,
  Utensils,
  Car,
  Zap,
  Activity,
  Film,
  ShoppingBag,
  BookOpen,
  Briefcase,
  TrendingUp,
  PlusCircle,
  Coffee,
  Music,
  Plane,
  Monitor,
  Smartphone,
  Gift,
  Heart,
  Smile,
  CircleDollarSign,
  HelpCircle,
} from 'lucide-react-native';

const ICON_MAP = {
  Tag,
  Home,
  Utensils,
  Car,
  Zap,
  Activity,
  Film,
  ShoppingBag,
  BookOpen,
  Briefcase,
  TrendingUp,
  PlusCircle,
  Coffee,
  Music,
  Plane,
  Monitor,
  Smartphone,
  Gift,
  Heart,
  Smile,
  CircleDollarSign,
};

export const AVAILABLE_ICONS = [
  'Tag',
  'Home',
  'Utensils',
  'Car',
  'Zap',
  'Activity',
  'Film',
  'ShoppingBag',
  'BookOpen',
  'Briefcase',
  'TrendingUp',
  'PlusCircle',
  'Coffee',
  'Music',
  'Plane',
  'Monitor',
  'Smartphone',
  'Gift',
  'Heart',
  'Smile',
];

const CategoryIcon = ({ name, color = '#3B82F6', size = 20 }) => {
  const IconComp = ICON_MAP[name] || Tag;
  return <IconComp size={size} color={color} strokeWidth={2} />;
};

export default CategoryIcon;
