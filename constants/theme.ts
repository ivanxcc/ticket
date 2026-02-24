export const STATUS_COLORS = {
  submitted: '#5B8DEF',
  in_progress: '#F59E0B',
  pending: '#A855F7',
  complete: '#22C55E',
} as const;

export const STATUS_LABELS = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  pending: 'Pending',
  complete: 'Complete',
} as const;

export const STATUS_ICONS = {
  submitted: 'radio-button-on-outline',
  in_progress: 'time-outline',
  pending: 'pause-circle-outline',
  complete: 'checkmark-circle-outline',
} as const;

export const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#F59E0B',
  urgent: '#EF4444',
} as const;

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  urgent: 'Urgent',
} as const;

export const COLORS = {
  light: {
    background: '#F4F4EF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E4E4DF',
    borderSubtle: '#EFEFEA',
    text: '#111111',
    textSecondary: '#555555',
    textTertiary: '#999999',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E4E4DF',
    accent: '#5B8DEF',
    inputBackground: '#F8F8F3',
  },
  dark: {
    background: '#0C0C0C',
    surface: '#161616',
    card: '#1C1C1C',
    border: '#2C2C2C',
    borderSubtle: '#222222',
    text: '#F0F0F0',
    textSecondary: '#888888',
    textTertiary: '#505050',
    tabBar: '#111111',
    tabBarBorder: '#252525',
    accent: '#5B8DEF',
    inputBackground: '#1A1A1A',
  },
} as const;

export type ColorScheme = typeof COLORS.light;
