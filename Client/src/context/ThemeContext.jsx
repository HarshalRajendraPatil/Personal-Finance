import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';

const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  isDark: false,
  setTheme: () => { },
  toggleTheme: () => { },
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('capise_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) { }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to OS system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  const isDark = resolvedTheme === 'dark';

  // Apply theme class and colorScheme to DOM, plus update PWA window theme-color
  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#090d16');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#4f46e5');
    }
  }, [isDark]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('capise_theme', newTheme);
    } catch (e) { }
  };

  const toggleTheme = () => {
    // If currently dark, switch to light; if currently light, switch to dark
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Synchronized Material UI Theme
  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: '#6366f1', // Indigo
          light: '#818cf8',
          dark: '#4f46e5',
        },
        background: {
          default: isDark ? '#090d16' : '#f8fafc',
          paper: isDark ? '#0f172a' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
        divider: isDark ? '#1e293b' : '#e2e8f0',
      },
      shape: {
        borderRadius: 12,
      },
      typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
              color: isDark ? '#f1f5f9' : '#1e293b',
            },
            head: {
              backgroundColor: isDark ? '#131c31' : '#f8fafc',
              color: isDark ? '#94a3b8' : '#475569',
              fontWeight: 700,
            },
          },
        },
        MuiTableSortLabel: {
          styleOverrides: {
            root: {
              color: isDark ? '#94a3b8' : '#475569',
              '&.Mui-active': {
                color: isDark ? '#818cf8' : '#4f46e5',
              },
            },
            icon: {
              color: `${isDark ? '#818cf8' : '#4f46e5'} !important`,
            },
          },
        },
      },
    });
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isDark, setTheme, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

