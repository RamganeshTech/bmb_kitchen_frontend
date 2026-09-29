
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchAuthSession } from '../api_service/auth_api/authApi';
import { logout, setAuthCredentials } from '../features/slices/authSlice';

export const useAuthCheck = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const verify = async () => {
      try {
        const response = await fetchAuthSession();

        if (response?.ok && response.data) {
          const userData = response?.data?.user;

          // Safely extract organization ID whether it's populated or not
          const orgIdString = typeof userData.organizationId === 'object'
            ? userData.organizationId?._id
            : userData.organizationId;

          // Dispatch the user data to Redux
          dispatch(
            setAuthCredentials({
              _id: userData._id,
              userName: userData.name || userData.userName,
              organizationId: orgIdString || null,
              role: userData.role,
            //   token: '', // Leave empty if relying on HttpOnly cookies, or pass if returned by backend
              profileImageUrl: userData.profileImageUrl || null,
              isPlatformAdmin: userData.isPlatformAdmin || false,
              organizationName: userData.organizationId?.name ||  null,
              organizationUrl: userData.organizationId?.url ||  null,
            })
          );
        }
      } catch (error) {
        // If the token is invalid, expired, or missing, clear the store
        dispatch(logout());
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [dispatch]);

  return { isLoading };
};