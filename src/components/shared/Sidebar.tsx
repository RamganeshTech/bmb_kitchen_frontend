import { useEffect, useState, type ElementType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChevronDown,
  LogOut,
  ChevronsRight,
  ChevronsLeft,
  Building2,
  Loader2
} from 'lucide-react';
import type { RootState } from '../../features/store/store';
import { setOrganization } from '../../features/slices/authSlice';
// import { useGetAllOrganizations } from '../../hooks/useOrganizations'; // You'll create this to fetch orgs

export interface SubMenuItem {
  name: string;
  path: string;
  icon?: ElementType;
}

export interface MenuItem {
  name: string;
  path: string;
  icon: ElementType;
  subMenu?: SubMenuItem[];
}

interface SidebarProps {
  menuItems: MenuItem[];
  onLogout: () => void;
  // Passing these as props or pulling from Redux directly (pulled from Redux below)
}

export default function Sidebar({ menuItems, onLogout }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Pulling Auth Data directly from Redux for cleaner props
  const {
    isPlatformAdmin,
    organizationName,
    organizationUrl: orgLogoUrl
  } = useSelector((state: RootState) => state.auth);

  // Example hook placeholder - uncomment and implement when you have your API hook ready
  // const { data: organizations, isLoading: isOrgsLoading } = useGetAllOrganizations();
  const organizations: any[] = [];
  const isOrgsLoading = false;

  const [isHovered, setIsHovered] = useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const isExpanded = isManuallyExpanded || isHovered;

  // Auto-close dropdown when sidebar shrinks
  useEffect(() => {
    if (!isExpanded) {
      setIsOrgDropdownOpen(false);
    }
  }, [isExpanded]);

  // Auto-expand submenus if active
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

  const handleOrgChange = (orgId: string, orgName: string, orgLogo: string | null) => {
    dispatch(
      setOrganization({
        organizationId: orgId,
        organizationName: orgName,
        organizationUrl: orgLogo,
      })
    );
    setIsOrgDropdownOpen(false);
    navigate('/projects'); // Reset to default view on org change
  };

  const toggleSubMenu = (menuName: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const handleNav = (path: string) => {
    navigate(path);
  };

  const toggleSidebar = () => {
    setIsManuallyExpanded(!isManuallyExpanded);
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-full bg-surface border-r border-border transition-all duration-300 ease-in-out flex flex-col shadow-sm shrink-0 relative z-50
        ${isExpanded ? 'w-64' : 'w-[72px]'}`}
    >
      {/* --- HEADER (Organization Selector / Brand) --- */}
      <div className="h-16 flex items-center px-3 border-b border-border shrink-0">
        {isPlatformAdmin ? (
          <div className="w-full relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex outline-none items-center justify-between w-full hover:bg-surface-hover p-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {orgLogoUrl ? (
                    <img src={orgLogoUrl} alt={organizationName || 'Org'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-text font-bold text-lg">
                      {organizationName?.charAt(0) || <Building2 size={20} />}
                    </span>
                  )}
                </div>
                <span
                  className={`font-semibold text-heading text-sm truncate transition-all duration-300 text-left
                    ${isExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'}`}
                >
                  {organizationName || 'Select Workspace'}
                </span>
              </div>
              {isExpanded && (
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform duration-300 ${isOrgDropdownOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            {isOrgDropdownOpen && isExpanded && (
              <div className="absolute top-[110%] left-0 w-full max-h-64 overflow-y-auto bg-surface border border-border shadow-lg rounded-xl z-50 flex flex-col p-2 gap-1 animate-in fade-in slide-in-from-top-2">
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
                      className="flex cursor-pointer items-center gap-3 w-full text-left px-2 py-2 text-sm font-medium text-body hover:bg-primary/10 hover:text-primary rounded-lg transition-colors group"
                    >
                      {org.logo?.url ? (
                        <img
                          src={org.logo.url}
                          alt={org.name}
                          className="w-6 h-6 rounded-md object-cover shrink-0 border border-border group-hover:border-primary/30"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-surface-hover text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-border group-hover:border-primary/30">
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
          <div className="flex items-center gap-3 overflow-hidden w-full p-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt={organizationName || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-text font-bold text-lg">
                  {organizationName?.charAt(0) || <Building2 size={20} />}
                </span>
              )}
            </div>
            <span
              className={`font-semibold text-heading text-sm truncate transition-all duration-300
                ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}
            >
              {organizationName}
            </span>
          </div>
        )}
      </div>

      {/* --- MAIN NAVIGATION --- */}
      {/* --- MAIN NAVIGATION --- */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 custom-scrollbar">
        {menuItems.map((item) => {
          const hasSubMenu = item.subMenu && item.subMenu.length > 0;
          const isSubMenuOpen = openSubMenus[item.name];

          // 1. MUST capture the component reference with a Capital Letter
          const Icon = item.icon;

          return (
            <div key={item.name} className="flex flex-col">
              <button
                onClick={() => (hasSubMenu ? toggleSubMenu(item.name) : handleNav(item.path))}
                className={`${isExpanded ? 'w-full px-3' : 'w-11 px-0 justify-center mx-auto'} h-11 cursor-pointer flex items-center rounded-xl transition-all duration-200 group text-muted hover:bg-primary/10 hover:text-primary`}
                title={!isExpanded ? item.name : undefined}
              >
                <div className="flex items-center w-full overflow-hidden">

                  {/* 2. MUST render the component as a JSX tag */}
                  <Icon className={`w-5 h-5 shrink-0 ${!isExpanded && 'mx-auto'}`} />

                  <span
                    className={`font-medium whitespace-nowrap text-sm ml-3 transition-all duration-300
                ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 ml-0'}`}
                  >
                    {item.name}
                  </span>
                </div>
                {hasSubMenu && isExpanded && (
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 shrink-0 ${isSubMenuOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>


              {/* Sub-Menu */}
              {hasSubMenu && isExpanded && (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isSubMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-5 pl-4 py-1 space-y-1 border-l border-border flex flex-col">
                      {item.subMenu?.map((sub) => {
                        const isChildActive = location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`);
                        const SubIcon = sub.icon;

                        return (
                          <button
                            key={sub.path}
                            onClick={() => navigate(sub.path)}
                            className={`flex cursor-pointer items-center gap-3 w-full text-left py-2 px-3 rounded-lg text-sm font-medium transition-colors
                              ${isChildActive
                                ? 'text-primary bg-primary/10'
                                : 'text-muted hover:text-heading hover:bg-surface-hover'}`}
                          >
                            {SubIcon && <SubIcon className="w-4 h-4 shrink-0" />}
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

      {/* --- FOOTER --- */}
      <div className={`p-3 border-t border-border shrink-0 flex transition-all duration-300 ${isExpanded ? 'flex-row gap-2 justify-between items-center' : 'flex-col gap-3 items-center'}`}>

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-muted hover:bg-surface-hover hover:text-heading transition-colors shrink-0"
          title={isManuallyExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isManuallyExpanded ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
        </button>

        <button
          onClick={onLogout}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl text-danger hover:bg-danger/10 transition-colors group
            ${isExpanded ? 'flex-1 px-3' : 'w-11 px-0'}`}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0 group-hover:text-danger" />
          <span
            className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
              ${isExpanded ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0'}`}
          >
            Logout
          </span>
        </button>

      </div>
    </aside>
  );
}