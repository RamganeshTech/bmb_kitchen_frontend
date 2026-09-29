import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, ChevronDown, LogOut, Building2, Loader2 } from 'lucide-react';
import type { MenuItem } from './Sidebar'; // Import types from your main Sidebar file
import type { RootState } from '../../features/store/store';
import { setOrganization } from '../../features/slices/authSlice';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onLogout: () => void;
}

export default function MobileSidebar({ isOpen, onClose, menuItems, onLogout }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  // Pull Auth Data from Redux
  const {
    isPlatformAdmin,
    organizationName,
    organizationUrl: orgLogoUrl
  } = useSelector((state: RootState) => state.auth);

  // Placeholder for organization fetching hook
  // const { data: organizations, isLoading: isOrgsLoading } = useGetAllOrganizations();
  const organizations: any[] = [];
  const isOrgsLoading = false;

  // Auto-expand active submenus on load
  useEffect(() => {
    const activeSubMenus: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (
        item.subMenu?.some(
          (sub) => location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`)
        )
      ) {
        activeSubMenus[item.name] = true;
      }
    });
    setOpenSubMenus((prev) => ({ ...prev, ...activeSubMenus }));
  }, [location.pathname, menuItems]);

  // Close dropdowns if sidebar closes
  useEffect(() => {
    if (!isOpen) setIsOrgDropdownOpen(false);
  }, [isOpen]);

  const handleOrgChange = (orgId: string, orgName: string, orgLogo: string | null) => {
    dispatch(
      setOrganization({
        organizationId: orgId,
        organizationName: orgName,
        organizationUrl: orgLogo,
      })
    );
    setIsOrgDropdownOpen(false);
    onClose(); // Close sidebar on switch
    navigate('/projects'); // Redirect to default view
  };

  const toggleSubMenu = (menuName: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose(); // Auto-close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-heading/40 z-[998] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-[999] w-72 bg-surface border-r border-border flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header / Workspace Info */}
        <div className="h-16 flex justify-between items-center px-4 border-b border-border shrink-0">
          {isPlatformAdmin ? (
            <div className="flex-1 relative mr-2">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex outline-none items-center justify-between w-full p-1.5 hover:bg-surface-hover rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    {orgLogoUrl ? (
                      <img src={orgLogoUrl} alt={organizationName || 'Org'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary-text font-bold text-sm">
                        {organizationName?.charAt(0) || <Building2 size={18} />}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-heading text-sm truncate max-w-[130px]">
                    {organizationName || 'Select Workspace'}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-muted transition-transform duration-300 ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Org Dropdown */}
              {isOrgDropdownOpen && (
                <div className="absolute top-[110%] left-0 w-full max-h-64 overflow-y-auto bg-surface border border-border shadow-lg rounded-xl z-50 flex flex-col p-2 gap-1 custom-scrollbar">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 pt-1 pb-2">
                    Switch Workspace
                  </span>
                  {isOrgsLoading ? (
                    <div className="px-3 py-4 flex justify-center">
                      <Loader2 className="animate-spin text-primary w-5 h-5" />
                    </div>
                  ) : (
                    organizations?.map((org: any) => (
                      <button
                        key={org._id}
                        onClick={() => handleOrgChange(org._id, org.name, org.logo?.url || null)}
                        className="flex items-center gap-3 w-full text-left p-2 text-sm font-medium text-heading hover:bg-primary/10 hover:text-primary rounded-lg transition-colors group"
                      >
                        {org.logo?.url ? (
                          <img src={org.logo.url} alt={org.name} className="w-6 h-6 rounded-md object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-surface-hover text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-border">
                            {org.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{org.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 overflow-hidden p-1.5 mr-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                {orgLogoUrl ? (
                  <img src={orgLogoUrl} alt={organizationName || 'Org'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-text font-bold text-sm">
                    {organizationName?.charAt(0) || <Building2 size={18} />}
                  </span>
                )}
              </div>
              <span className="font-semibold text-heading text-sm truncate max-w-[150px]">
                {organizationName}
              </span>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-hover text-muted hover:text-heading transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => {
            const isParentActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const hasSubMenu = item.subMenu && item.subMenu.length > 0;
            const isSubMenuOpen = openSubMenus[item.name];

            // 1. Capture the component reference
            const Icon = item.icon;

            return (
              <div key={item.name} className="flex flex-col">
                <button
                  onClick={() => (hasSubMenu ? toggleSubMenu(item.name) : handleNav(item.path))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 
            ${isParentActive ? 'bg-primary text-primary-text shadow-md shadow-primary/20' : 'text-muted hover:bg-primary/10 hover:text-primary'}`}
                >
                  <div className="flex items-center gap-3">

                    {/* 2. Render the component as a JSX tag */}
                    <Icon size={20} className={`shrink-0 ${isParentActive ? 'text-primary-text' : ''}`} />

                    <span className="font-medium text-[15px] truncate">{item.name}</span>
                  </div>
                  {hasSubMenu && (
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isSubMenuOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Sub-Menu */}
                {hasSubMenu && (
                  <div className={`grid transition-all duration-300 ease-in-out ${isSubMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="ml-5 pl-4 pr-2 py-2 space-y-1 border-l border-border flex flex-col">
                        {item.subMenu?.map((sub) => {
                          const isChildActive = location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`);
                          const SubIcon = sub.icon;

                          return (
                            <button
                              key={sub.path}
                              onClick={() => handleNav(sub.path)}
                              className={`flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg text-sm font-medium transition-colors
                                ${isChildActive ? 'text-primary bg-primary/10' : 'text-muted hover:text-heading hover:bg-surface-hover'}`}
                            >
                              {SubIcon && <SubIcon size={16} className="shrink-0" />}
                              <span className="truncate">{sub.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center justify-center gap-3 w-full p-3 rounded-xl text-danger bg-danger/10 hover:bg-danger hover:text-primary-text transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}