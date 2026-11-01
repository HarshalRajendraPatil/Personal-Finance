import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ variant = 'icon', className = '' }) => {
  const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-2xs ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'light'
              ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          title="Light Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'dark'
              ? 'bg-slate-900 text-indigo-300 shadow-xs dark:bg-indigo-600 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          title="Dark Mode"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === 'system'
              ? 'bg-white text-gray-900 shadow-xs dark:bg-slate-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          title="System Preference"
        >
          <Monitor className="w-3.5 h-3.5 text-gray-400" />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Default: Iconic Quick-Toggle Button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl border border-gray-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-2xs hover:shadow-xs transition-all active:scale-95 group overflow-hidden ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode (currently ${resolvedTheme})`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (currently ${theme === 'system' ? 'System ' + resolvedTheme : resolvedTheme})`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (Rotates and scales out in dark mode) */}
        <Sun
          className={`w-4 h-4 text-amber-500 absolute transition-all duration-300 transform ${isDark
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
            }`}
        />
        {/* Moon Icon (Rotates and scales in in dark mode) */}
        <Moon
          className={`w-4 h-4 text-indigo-400 absolute transition-all duration-300 transform ${isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
            }`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;

