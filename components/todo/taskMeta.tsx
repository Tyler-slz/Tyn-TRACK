import React from 'react';
import { Briefcase, DollarSign, Heart, User } from 'lucide-react';
import type { Category } from '@/lib/types';

export const TASK_CATEGORY_META: Record<
  Category,
  { label: Category; icon: React.ComponentType<{ className?: string }> }
> = {
  Work: { label: 'Work', icon: Briefcase },
  Personal: { label: 'Personal', icon: User },
  Money: { label: 'Money', icon: DollarSign },
  Health: { label: 'Health', icon: Heart },
};

export const TASK_CATEGORY_LIST: Category[] = ['Work', 'Personal', 'Money', 'Health'];

export function TaskCategoryIcon({
  category,
  className = 'w-3 h-3 stroke-[2] opacity-75 shrink-0',
}: {
  category: Category | string;
  className?: string;
}) {
  const entry = TASK_CATEGORY_META[category as Category];
  if (!entry) return null;
  const Icon = entry.icon;
  return <Icon className={className} />;
}

export function formatTaskRepeatLabel(repeat?: string): string | null {
  if (repeat === 'daily') return 'Daily';
  if (repeat === 'weekdays') return 'Weekdays';
  if (repeat === 'weekly') return 'Weekly';
  return null;
}

