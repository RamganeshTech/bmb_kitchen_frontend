import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, SearchX } from 'lucide-react';
import { useAuthorizedMenu } from '../../hooks/useAuthorizedMenu'; // You'll need to create this to return your menu array

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Get the authoritative menu list for this specific user
  const availableModules = useAuthorizedMenu();

  // 2. Flatten the menu so parent items with submenus are hidden, 
  // and only their sub-items (or standalone items) are searchable
  const searchableModules = useMemo(() => {
    const flattened: any[] = [];

    availableModules.forEach((module: any) => {
      if (module.subMenu && module.subMenu.length > 0) {
        // If it has a submenu, add all the sub-items but completely ignore the parent
        flattened.push(...module.subMenu);
      } else {
        // If it's a standalone menu, add it directly
        flattened.push(module);
      }
    });

    return flattened;
  }, [availableModules]);

  // 3. Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!query.trim()) return searchableModules;

    return searchableModules.filter((module: any) =>
      module.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, searchableModules]);

  // 4. Handle Keyboard Navigation (Up, Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredModules.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredModules[selectedIndex]) {
        handleSelect(filteredModules[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  };

  const handleSelect = (path: string) => {
    navigate(path);
    closeSearch();
  };

  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcut (Ctrl+K or Cmd+K) to open search
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  // Global Escape Listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* 🛑 DARK OVERLAY: Renders behind the search bar but over the rest of the app */}
      {isOpen && (
        <div className="fixed inset-0 bg-heading/20 backdrop-blur-sm z-[50] transition-opacity duration-200" />
      )}

      {/* SEARCH CONTAINER */}
      <div className="relative z-[99] w-full max-w-lg" ref={wrapperRef}>

        {/* Input Field */}
        <div
          className={`flex items-center bg-surface border transition-all duration-200 rounded-lg px-3 py-2 h-10
            ${isOpen ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border shadow-sm hover:border-primary/50'}`}
        >
          <Search size={18} className={`mr-2 shrink-0 ${isOpen ? 'text-primary' : 'text-muted'}`} />

          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent outline-none text-sm text-heading placeholder:text-muted font-medium"
            placeholder="Search modules (e.g., Projects, Clients)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />

          {/* Shortcut Hint / Clear Button */}
          <div className="shrink-0 flex items-center justify-center ml-2">
            {!isOpen ? (
              <div className="hidden sm:flex items-center justify-center px-2 py-0.5 rounded border border-border bg-page text-[10px] text-muted font-bold tracking-wide">
                Ctrl + K
              </div>
            ) : (
              <button
                onClick={closeSearch}
                className="text-muted hover:text-danger p-0.5 rounded transition-colors"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* DROPDOWN RESULTS */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

            {filteredModules.length > 0 ? (
              <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                <div className="px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                  Suggested Modules
                </div>

                {filteredModules.map((module: any, index: number) => {
                  const Icon = module.icon; // Assuming your authorized menu passes Lucide components

                  return (
                    <div
                      key={module.path}
                      onClick={() => handleSelect(module.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150
                        ${index === selectedIndex ? 'bg-primary/10 text-primary' : 'text-heading hover:bg-surface-hover'}
                      `}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${index === selectedIndex ? 'bg-primary text-primary-text shadow-sm' : 'bg-page text-muted border border-border'}
                      `}>
                        {Icon && <Icon size={16} />}
                      </div>

                      <span className="text-sm font-medium">{module.name}</span>

                      {index === selectedIndex && (
                        <ArrowRight size={14} className="ml-auto text-primary opacity-50 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center mb-3 text-muted">
                  <SearchX size={24} />
                </div>
                <p className="text-sm font-semibold text-heading">No modules found</p>
                <p className="text-xs text-muted mt-1">Try searching for a different keyword.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};