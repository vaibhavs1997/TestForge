// External libraries
import { useThemeStore } from '../store/themeStore';

export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
};

export default useTheme;
