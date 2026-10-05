import { useNavigate } from 'react-router-dom';
import { useAuthData } from '../../hooks/useAuthData'; // Adjust path

export const UserAvatar = () => {
  const { userName, profileImageUrl } = useAuthData();
  const navigate = useNavigate();

  const initials = userName?.charAt(0).toUpperCase() || 'U';

  const handleClick = () => {
    // In Civil Mind Pro, all roles (owner, admin, cto, staff) 
    // can navigate to the same profile/settings route.
    navigate('/layout/profile');
  };

  return (
    <div
      className="flex items-center gap-3 cursor-pointer hover:bg-surface-hover p-1 sm:p-2 rounded-xl transition-colors"
      onClick={handleClick}
      title="View Profile"
    >
      {/* 🌟 Avatar Image / Initials Wrapper */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-primary-text font-bold text-sm shadow-sm overflow-hidden shrink-0">

        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={userName || 'Profile'}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}

      </div>

      {/* 🌟 User Name & Action (Hidden on mobile) */}
      <div className="hidden md:block text-left">
        <p className="text-sm font-semibold text-heading leading-tight truncate max-w-[150px]">
          {userName || 'User'}
        </p>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mt-0.5">
          View Profile
        </p>
      </div>
    </div>
  );
};