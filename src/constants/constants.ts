// import noimg from '../assets/no image.jpeg'
// import DLogo from '../assets/daily-grades-app-icon-generic-square.png'


import { type UserRole } from "../features/slices/authSlice";
import { Building2, FolderKanban, HardHat, Layers, LayoutDashboard, type LucideProps } from 'lucide-react';
import { type ComponentType } from 'react';


export const DOMAIN_NAME = "BMB Kitchen"
// export const DOMAIN_IMG = DLogo

// export const NO_IMAGE = noimg


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
    { name: 'Menu Category', path: '/layout/menu-category', icon: FolderKanban },
    { name: 'Tables', path: '/layout/tables', icon: FolderKanban },
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

