// Permission utility functions for frontend

/**
 * Check if user has permission for a specific action on a module
 * @param {Object} user - User object with permissions
 * @param {string} module - Module name (e.g., 'bills', 'products')
 * @param {string} action - Action name (e.g., 'view', 'create', 'edit', 'delete')
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (user, module, action) => {
  // Admin has all permissions
  if (user?.role === 'admin') {
    return true;
  }

  // Check if user has specific permission
  return user?.permissions?.[module]?.[action] === true;
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object with permissions
 * @param {Array} permissionChecks - Array of {module, action} objects
 * @returns {boolean} - True if user has at least one permission
 */
export const hasAnyPermission = (user, permissionChecks) => {
  if (user?.role === 'admin') {
    return true;
  }

  return permissionChecks.some(({ module, action }) => 
    hasPermission(user, module, action)
  );
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - User object with permissions
 * @param {Array} permissionChecks - Array of {module, action} objects
 * @returns {boolean} - True if user has all permissions
 */
export const hasAllPermissions = (user, permissionChecks) => {
  if (user?.role === 'admin') {
    return true;
  }

  return permissionChecks.every(({ module, action }) => 
    hasPermission(user, module, action)
  );
};

/**
 * Get user's permissions for a specific module
 * @param {Object} user - User object with permissions
 * @param {string} module - Module name
 * @returns {Object} - Object with permission flags
 */
export const getModulePermissions = (user, module) => {
  if (user?.role === 'admin') {
    // Return all permissions as true for admin
    return {
      view: true,
      create: true,
      edit: true,
      delete: true,
      assign: true,
      approve: true,
      export: true
    };
  }

  return user?.permissions?.[module] || {};
};

/**
 * Check if user can access a module (has view permission)
 * @param {Object} user - User object with permissions
 * @param {string} module - Module name
 * @returns {boolean} - True if user can view module
 */
export const canAccessModule = (user, module) => {
  return hasPermission(user, module, 'view');
};

/**
 * Get list of modules user can access
 * @param {Object} user - User object with permissions
 * @returns {Array} - Array of module names
 */
export const getAccessibleModules = (user) => {
  if (user?.role === 'admin') {
    return [
      'dashboard',
      'bills',
      'collections',
      'products',
      'retailers',
      'orders',
      'deliveries',
      'users',
      'reports',
      'salary',
      'advances',
      'attendance',
      'settings'
    ];
  }

  const modules = [];
  if (user?.permissions) {
    Object.entries(user.permissions).forEach(([module, actions]) => {
      if (actions.view === true) {
        modules.push(module);
      }
    });
  }
  return modules;
};

/**
 * Filter navigation items based on user permissions
 * @param {Array} navItems - Array of navigation items with module property
 * @param {Object} user - User object with permissions
 * @returns {Array} - Filtered navigation items
 */
export const filterNavigation = (navItems, user) => {
  if (user?.role === 'admin') {
    return navItems;
  }

  return navItems.filter(item => {
    if (!item.module) return true; // Items without module are always shown
    return canAccessModule(user, item.module);
  });
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

/**
 * Check if user is staff
 * @param {Object} user - User object
 * @returns {boolean} - True if user is staff
 */
export const isStaff = (user) => {
  return user?.role === 'staff';
};

/**
 * Check if user is retailer
 * @param {Object} user - User object
 * @returns {boolean} - True if user is retailer
 */
export const isRetailer = (user) => {
  return user?.role === 'retailer';
};

/**
 * Get permission level for display
 * @param {Object} user - User object with permissions
 * @param {string} module - Module name
 * @returns {string} - Permission level description
 */
export const getPermissionLevel = (user, module) => {
  if (user?.role === 'admin') {
    return 'Full Access';
  }

  const permissions = getModulePermissions(user, module);
  const actions = Object.entries(permissions).filter(([_, value]) => value === true);
  
  if (actions.length === 0) return 'No Access';
  if (actions.length === 1 && actions[0][0] === 'view') return 'View Only';
  if (actions.length === Object.keys(permissions).length) return 'Full Access';
  
  return `Limited (${actions.length} permissions)`;
};

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getModulePermissions,
  canAccessModule,
  getAccessibleModules,
  filterNavigation,
  isAdmin,
  isStaff,
  isRetailer,
  getPermissionLevel
};
