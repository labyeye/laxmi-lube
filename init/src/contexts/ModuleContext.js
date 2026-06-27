import React, { createContext, useContext, useState, useEffect } from 'react';

// Default module configurations
const DEFAULT_MODULES = {
  dashboard: {
    singular: 'Dashboard',
    plural: 'Dashboards',
    icon: 'FaTachometerAlt',
    key: 'dashboard'
  },
  retailer: {
    singular: 'Retailer',
    plural: 'Retailers',
    icon: 'FaStore',
    key: 'retailer'
  },
  customer: {
    singular: 'Customer',
    plural: 'Customers',
    icon: 'FaUsers',
    key: 'customer'
  },
  product: {
    singular: 'Product',
    plural: 'Products',
    icon: 'FaBoxes',
    key: 'product'
  },
  order: {
    singular: 'Order',
    plural: 'Orders',
    icon: 'FaShoppingCart',
    key: 'order'
  },
  bill: {
    singular: 'Bill',
    plural: 'Bills',
    icon: 'FaFileInvoiceDollar',
    key: 'bill'
  },
  collection: {
    singular: 'Collection',
    plural: 'Collections',
    icon: 'FaMoneyBillWave',
    key: 'collection'
  },
  attendance: {
    singular: 'Attendance',
    plural: 'Attendance',
    icon: 'FaCalendarCheck',
    key: 'attendance'
  },
  salary: {
    singular: 'Salary',
    plural: 'Salaries',
    icon: 'FaMoneyBillWave',
    key: 'salary'
  },
  advance: {
    singular: 'Advance',
    plural: 'Advances',
    icon: 'FaMoneyBillWave',
    key: 'advance'
  },
  delivery: {
    singular: 'Delivery',
    plural: 'Deliveries',
    icon: 'FaTruck',
    key: 'delivery'
  },
  logistics: {
    singular: 'Logistics',
    plural: 'Logistics',
    icon: 'FaTruck',
    key: 'logistics'
  },
  report: {
    singular: 'Report',
    plural: 'Reports',
    icon: 'FaChartBar',
    key: 'report'
  },
  staff: {
    singular: 'Staff',
    plural: 'Staff',
    icon: 'FaUsers',
    key: 'staff'
  },
  user: {
    singular: 'User',
    plural: 'Users',
    icon: 'FaUsers',
    key: 'user'
  }
};

const ModuleContext = createContext();

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};

export const ModuleProvider = ({ children }) => {
  const [modules, setModules] = useState(() => {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem('customModules');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored modules:', error);
        return DEFAULT_MODULES;
      }
    }
    return DEFAULT_MODULES;
  });

  // Save to localStorage whenever modules change
  useEffect(() => {
    localStorage.setItem('customModules', JSON.stringify(modules));
  }, [modules]);

  // Get module name (singular or plural)
  const getModuleName = (moduleKey, form = 'singular') => {
    const module = modules[moduleKey];
    if (!module) {
      console.warn(`Module "${moduleKey}" not found`);
      return moduleKey;
    }
    return module[form] || module.singular;
  };

  // Get module icon
  const getModuleIcon = (moduleKey) => {
    const module = modules[moduleKey];
    return module?.icon || 'FaCogs';
  };

  // Update a single module
  const updateModule = (moduleKey, updates) => {
    setModules(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        ...updates
      }
    }));
  };

  // Update multiple modules at once
  const updateModules = (updates) => {
    setModules(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Reset a single module to default
  const resetModule = (moduleKey) => {
    setModules(prev => ({
      ...prev,
      [moduleKey]: DEFAULT_MODULES[moduleKey]
    }));
  };

  // Reset all modules to defaults
  const resetAllModules = () => {
    setModules(DEFAULT_MODULES);
    localStorage.setItem('customModules', JSON.stringify(DEFAULT_MODULES));
  };

  // Get all modules
  const getAllModules = () => modules;

  // Get default modules (for comparison/reset)
  const getDefaultModules = () => DEFAULT_MODULES;

  const value = {
    modules,
    getModuleName,
    getModuleIcon,
    updateModule,
    updateModules,
    resetModule,
    resetAllModules,
    getAllModules,
    getDefaultModules
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};

export default ModuleContext;
