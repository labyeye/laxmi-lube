import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  hasPermission, 
  getModulePermissions, 
  canAccessModule,
  getAccessibleModules,
  isAdmin
} from '../utils/permissions';

/**
 * Custom hook for managing user permissions
 * @returns {Object} - Permission checking functions and user data
 */
export const usePermissions = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:2500/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user,
    loading,
    isAdmin: user ? isAdmin(user) : false,
    hasPermission: (module, action) => hasPermission(user, module, action),
    canAccessModule: (module) => canAccessModule(user, module),
    getModulePermissions: (module) => getModulePermissions(user, module),
    getAccessibleModules: () => getAccessibleModules(user),
  };
};

/**
 * Hook for checking a specific permission
 * @param {string} module - Module name
 * @param {string} action - Action name
 * @returns {boolean} - True if user has permission
 */
export const useHasPermission = (module, action) => {
  const { user, loading } = usePermissions();
  
  if (loading) return false;
  return hasPermission(user, module, action);
};

/**
 * Hook for getting module permissions
 * @param {string} module - Module name
 * @returns {Object} - Module permissions object
 */
export const useModulePermissions = (module) => {
  const { user, loading } = usePermissions();
  
  if (loading) return {};
  return getModulePermissions(user, module);
};

export default usePermissions;
