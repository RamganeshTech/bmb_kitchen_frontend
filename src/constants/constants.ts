import noimg from '../assets/no image.jpeg'
// import DLogo from '../assets/daily-grades-app-icon-generic-square.png'


import { type UserRole } from "../features/slices/authSlice";
import { BadgePercent, Boxes, Building2, ChefHat, CookingPot, CreditCard, FolderKanban, LayoutDashboard, LayoutGrid, LifeBuoy, PackageMinus, Printer, ReceiptText, ShoppingCart, Star, Tags, Users, type LucideProps } from 'lucide-react';
import { type ComponentType } from 'react';


export const DOMAIN_NAME = "BMB Kitchen"
// export const DOMAIN_IMG = DLogo

export const NO_IMAGE = noimg


export type ValidUserRole = Exclude<UserRole, null>;


export const AUTH_CHECK_ROLES: ValidUserRole[] = [
    "admin",
    "owner",
    "staff",
    "cto",
];

export const STAFF_ALL: UserRole[] = [
    "admin",
    "staff",
    "cto",
]

// Only the owner
export const SUPER_ADMIN_ONLY: UserRole[] = ["owner"];

// Top-level management (No Teachers, No Accountants)
export const MANAGEMENT_ONLY: UserRole[] = ["owner", "admin", "staff", "cto"];

export const HIGHER_OFFICIALS: UserRole[] = ["owner", "cto"];
export const ADMIN_CORREPONDENT: UserRole[] = ["owner", "admin"];
export const ONLY_ADMIN: UserRole[] = ["admin"];



export interface SubMenuItem {
    // icon: string
    icon: ComponentType<LucideProps>;
    name: string;
    path: string;
}

export interface MenuItem {
    name: string;
    path: string;
    // icon: ReactNode
    icon?: ComponentType<LucideProps>;
    subMenu?: SubMenuItem[];
}

export const baseManagementMenu: MenuItem[] = [
    { name: 'Dashboard', path: "/layout/projects", icon: LayoutDashboard },
    { name: 'Organization', path: "/layout/organization", icon: Building2 },
    { name: 'Outlet', path: '/layout/outlet', icon: FolderKanban },
    { name: 'Menu Category', path: '/layout/menu-category', icon: Tags },
    { name: 'Menu Items', path: '/layout/menu-item', icon: Tags },
    { name: 'Tables', path: '/layout/tables', icon: LayoutGrid },
    { name: 'Inventory', path: '/layout/inventory', icon: Boxes },
    { name: 'Waste Adjustment', path: '/layout/waste-adjustment', icon: PackageMinus },
    { name: 'Customer', path: '/layout/customer', icon: Users },
    { name: 'Offers', path: '/layout/offer', icon: BadgePercent },
    { name: 'Loyalty Program', path: '/layout/loyalty-program', icon: Star },
    { name: 'Receipe Cost', path: '/layout/recipe-cost-management', icon: ChefHat },
    { name: 'Purchase', path: '/layout/purchase', icon: ShoppingCart },
    { name: 'Central Kitchen', path: '/layout/central-kitchen', icon: CookingPot },
    { name: 'Support Ticket', path: '/layout/support-ticket', icon: LifeBuoy },
    { name: 'Tax Setting', path: '/layout/taxsetting', icon: ReceiptText },
    { name: 'Printer', path: '/layout/printer', icon: Printer },
    { name: 'Subscription', path: '/layout/subscription', icon: CreditCard },
];

// 2. Compose the staff's menu by adding subscription to the end
export const staffMenu: MenuItem[] = [
    ...baseManagementMenu,
    // { name: 'Subscription', path: "/dashboard/subscription", icon: 'fas fa-crown' }
];

export const ctoMenu: MenuItem[] = [
    ...baseManagementMenu,
]


export const ownerMenu: MenuItem[] = [
    ...baseManagementMenu,
]


export const adminMenu: MenuItem[] = [
    ...baseManagementMenu,
]

