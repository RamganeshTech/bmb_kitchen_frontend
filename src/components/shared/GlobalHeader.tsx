import { Menu } from 'lucide-react';
// import { UserAvatar } from '../../pages/profile/UserAvatar'; // Adjust path as needed
import { GlobalSearch } from './GlobalSearch'; // Adjust path as needed
import { UserAvatar } from './UserAvatar';
// import GlobalSetupProgress from './GlobalSetupProgress'; // Adjust path as needed
// import { NotificationIcon } from './NotificationIcon'; // Adjust path as needed

interface GlobalHeaderProps {
  onMenuClick: () => void;
}

export const GlobalHeader = ({ onMenuClick }: GlobalHeaderProps) => {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-2 sm:px-6 sticky top-0 z-[35]">
      
      {/* Mobile Menu Toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-muted hover:text-heading hover:bg-surface-hover rounded-lg transition-colors mr-2 shrink-0"
        aria-label="Toggle Sidebar"
      >
        <Menu size={24} />
      </button>

      {/* Left side: Global Search (Command Palette) */}
      <div className="flex-1 flex items-center px-2 md:px-0">
        <GlobalSearch />
      </div>

      {/* Right side: User Profile & Actions */}
      <div className="flex items-center gap-1 sm:gap-4 sm:pl-6 sm:ml-4 sm:border-l border-border shrink-0">
        
        {/* We'll implement these components next */}
        {/* <NotificationIcon />
        
        <GlobalSetupProgress /> */}
        
        <UserAvatar />
        
      </div>
    </header>
  );
};