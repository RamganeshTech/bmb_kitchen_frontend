
import { type UserRole } from "../features/slices/authSlice";

export const checkPermission = (
  userRole: UserRole,
  allowedRoles: Partial<UserRole[]>
): void => {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Unauthorized Action: You do not have permission to perform this action.');
  }
};
