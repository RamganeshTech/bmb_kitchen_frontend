// hooks/useRoleCheck.ts
import { useAuthData } from './useAuthData'; // Adjust this path to your original hook

export const useRoleCheck = () => {
    const { organizationId, currentRole } = useAuthData();

    return {
        organizationId,
        currentRole,
        // Rapid boolean evaluation flags
        isAdmin: currentRole === 'admin',
        isOwner: currentRole === 'owner',
        isStaff: currentRole === 'staff',
        isCto: currentRole === 'cto',
    };
};