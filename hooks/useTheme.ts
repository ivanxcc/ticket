import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store';
import { COLORS } from '@/constants/theme';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  return {
    isDark,
    colors: isDark ? COLORS.dark : COLORS.light,
  };
}
