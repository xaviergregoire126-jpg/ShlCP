import React from 'react';
import { BarChart3, LayoutDashboard, History, Settings } from 'lucide-react';

export type ActiveNavWindow = 'dash' | 'guichet' | 'history' | 'settings';

interface BottomNavBarProps {
  activeWindow: ActiveNavWindow;
  onSelectWindow: (window: ActiveNavWindow) => void;
  transactionsCount: number;
  hasDiscrepancies?: boolean;
  hasFlowAlert?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeWindow,
  onSelectWindow,
  transactionsCount,
  hasDiscrepancies = false,
  hasFlowAlert = false,
}) => {
  const navItems: {
    id: ActiveNavWindow;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | boolean;
    badgeColor?: string;
  }[] = [
    {
      id: 'dash',
      label: 'Dash',
      icon: BarChart3,
      badge: hasFlowAlert ? '!' : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'guichet',
      label: 'Guichet',
      icon: LayoutDashboard,
      badge: hasDiscrepancies ? '!' : undefined,
      badgeColor: 'bg-red-500 text-white font-bold',
    },
    {
      id: 'history',
      label: 'Historique',
      icon: History,
      badge: transactionsCount > 0 ? transactionsCount : undefined,
      badgeColor: 'bg-blue-600 text-white font-semibold',
    },
    {
      id: 'settings',
      label: 'Réglages',
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 py-1"
    >
      <div className="max-w-xl mx-auto px-2 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = activeWindow === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectWindow(item.id)}
              className={`relative flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer select-none ${
                isActive
                  ? 'text-amber-400 bg-amber-500/10 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 font-normal'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-6 h-0.5 bg-amber-400 rounded-full" />
              )}

              <div className="relative">
                <Icon className="w-5 h-5" />

                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-[15px] text-[9px] font-mono leading-none flex items-center justify-center rounded-full ${
                      item.badgeColor || 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
