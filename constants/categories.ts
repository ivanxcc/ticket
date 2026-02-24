export const CATEGORIES = [
  { id: 'it', label: 'IT & Tech', icon: 'laptop-outline', color: '#5B8DEF' },
  { id: 'appliance', label: 'Appliances', icon: 'hardware-chip-outline', color: '#F59E0B' },
  { id: 'plumbing', label: 'Plumbing', icon: 'water-outline', color: '#06B6D4' },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline', color: '#EAB308' },
  { id: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', color: '#10B981' },
  { id: 'garden', label: 'Garden', icon: 'leaf-outline', color: '#22C55E' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-outline', color: '#A855F7' },
  { id: 'repairs', label: 'Repairs', icon: 'build-outline', color: '#F97316' },
  { id: 'other', label: 'Other', icon: 'grid-outline', color: '#6B7280' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
