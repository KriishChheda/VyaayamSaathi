import React, { useState } from 'react';
import { Bell, Menu, X, Search, Settings, User, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AnimatedList } from './ui/AnimatedList';

export function Header({ activeTab, onTabChange }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'exercises', label: 'Exercises' },
    { id: 'workout', label: 'Workout' },
    { id: 'profile', label: 'Profile' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'settings', label: 'Settings' },

  ];

  return (
    <header className="sticky top-0 w-full bg-white border-b border-slate-200 z-50 px-4 py-2.5">
      {/* Changed max-w-md to max-w-7xl for laptop screens. 
          The 'mx-auto' keeps it centered on large monitors.
      */}
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">

        {/* LEFT: Branding */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-neutral-900 rounded-[10px] md:rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-[10px] md:text-xs">VS</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm md:text-base tracking-tight leading-none text-neutral-900 truncate">
              VyayamSaathi
            </h1>
            <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
              AI Trainer
            </p>
          </div>
        </div>

        {/* CENTER: Desktop Navigation (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`text-xs font-semibold uppercase tracking-widest transition-colors ${isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Actions & User Info */}
        <div className="flex items-center gap-2 md:gap-5">

          {/* Desktop Search (Hidden on Mobile)
          <div className="hidden lg:flex items-center relative">
            <Search size={14} className="absolute left-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-neutral-200 w-40 transition-all"
            />
          </div> */}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => onTabChange && onTabChange('calendar')}
              className={`p-2 rounded-full transition-colors ${activeTab === 'calendar' ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'hover:bg-neutral-100 text-neutral-500'}`}
              title="Workout Schedule"
            >
              <CalendarDays size={18} />
            </button>
            <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500">
              <Bell size={18} />
            </button>
            <button className="hidden sm:block p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500">
              <Settings size={18} />
            </button>
          </div>

          {/* User Profile Segment */}
          <div className="flex items-center gap-3 pl-2 border-l border-neutral-200 ml-1 md:ml-2">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-xs font-bold text-neutral-900">Kriish Chheda</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Intermediate</p>
            </div>
            <Avatar className="w-7 h-7 md:w-9 md:h-9 border border-neutral-200 shadow-sm">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback className="bg-neutral-100 text-neutral-600 text-[10px] font-bold">KC</AvatarFallback>
            </Avatar>

            {/* Mobile Menu Toggle (Hidden on Desktop) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-neutral-200 shadow-xl overflow-hidden rounded-b-2xl pt-2 pb-6 text-left">
          <AnimatedList
            items={tabs}
            initialSelectedIndex={tabs.findIndex(t => t.id === activeTab)}
            onItemSelect={(tab) => {
              if (onTabChange) onTabChange(tab.id);
              // Wait for animation frame before closing for better UX
              setTimeout(() => setIsMobileMenuOpen(false), 200);
            }}
          />
        </div>
      )}
    </header>
  );
}