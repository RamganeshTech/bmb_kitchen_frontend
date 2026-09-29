import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthorizedMenu } from '../hooks/useAuthorizedMenu';
import { useLogoutUser } from '../api_service/auth_api/authApi';
import { toast } from '../components/ui/toast/Toast';
import { logout } from '../features/slices/authSlice';
import Sidebar from '../components/shared/Sidebar';
import MobileSidebar from '../components/shared/MobileSidebar';
import { GlobalHeader } from '../components/shared/GlobalHeader';

// import { toast } from '../ui/toast/Toast'; // Adjust path
// import { logout } from '../../store/authSlice'; // Adjust path
// import { useLogoutUser } from '../../hooks/useAuth'; // Adjust path pointing to your logout mutation
// import { useAuthorizedMenu } from '../../hooks/useAuthorizedMenu'; // Adjust path

// import Sidebar from './Sidebar';
// import MobileSidebar from './MobileSidebar';
// import { GlobalHeader } from './GlobalHeader';

export const AppLayout = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const menuItems = useAuthorizedMenu();
    const { mutateAsync: logoutAsync } = useLogoutUser();

    const handleLogout = async () => {
        try {
            // 1. Invalidate session on the backend
            await logoutAsync();
        } catch (error: any) {
            toast.error(error.message || "Failed to logout from server");
        } finally {
            // 2. Clear Redux State (Resets to initialState)
            dispatch(logout());

            // 3. Clear all TanStack Query Cache (prevents data leaking to the next user)
            queryClient.clear();

            // 4. Force navigation to Login
            navigate('/login', { replace: true });
        }
    };

    return (
        // 1. Root Container: Locks to viewport height, prevents body scroll
        <div className="h-screen w-full flex bg-page overflow-hidden">

            {/* 2. Desktop Sidebar: Hidden on mobile, fixed width via flex-shrink-0 */}
            <div className="hidden lg:flex shrink-0 h-full z-20">
                <Sidebar 
                    menuItems={menuItems} 
                    onLogout={handleLogout} 
                />
            </div>

            {/* 3. Mobile Sidebar: Overlay controlled by state */}
            <MobileSidebar 
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                menuItems={menuItems}
                onLogout={handleLogout}
            />

            {/* 4. Main Application Area: Flexes to fill remaining space */}
            <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
                
                {/* Global Header: Stays fixed at the top of the content column */}
                <div className="shrink-0 z-10">
                    <GlobalHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
                </div>

                {/* Page Content: This is the ONLY part of the app that scrolls */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    {/* Optional max-w limits the content width on ultra-wide monitors for better UX */}
                    <div className="mx-auto w-full h-full">
                        <Outlet />
                    </div>
                </main>
                
            </div>
            
        </div>
    );
};