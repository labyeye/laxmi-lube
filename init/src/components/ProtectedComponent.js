import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import styled from 'styled-components';

/**
 * Component wrapper that conditionally renders children based on user permissions
 * @param {string} module - Module name to check
 * @param {string} action - Action to check (view, create, edit, delete, etc.)
 * @param {ReactNode} children - Content to render if permission is granted
 * @param {ReactNode} fallback - Content to render if permission is denied
 */
const ProtectedComponent = ({ module, action, children, fallback = null }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <LoadingPlaceholder>Loading...</LoadingPlaceholder>;
  }

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  return fallback;
};

/**
 * Component that shows content only to admins
 */
export const AdminOnly = ({ children, fallback = null }) => {
  const { isAdmin, loading } = usePermissions();

  if (loading) return null;
  return isAdmin ? <>{children}</> : fallback;
};

/**
 * Component that shows content if user has ANY of the specified permissions
 */
export const HasAnyPermission = ({ permissions, children, fallback = null }) => {
  const { user, loading } = usePermissions();
  const { hasPermission } = usePermissions();

  if (loading) return null;

  const hasAny = permissions.some(({ module, action }) => 
    hasPermission(module, action)
  );

  return hasAny ? <>{children}</> : fallback;
};

/**
 * Component that shows content if user has ALL of the specified permissions
 */
export const HasAllPermissions = ({ permissions, children, fallback = null }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;

  const hasAll = permissions.every(({ module, action }) => 
    hasPermission(module, action)
  );

  return hasAll ? <>{children}</> : fallback;
};

/**
 * Component that shows different content based on user role
 */
export const RoleBasedContent = ({ admin, staff, retailer, fallback = null }) => {
  const { user, loading } = usePermissions();

  if (loading) return null;

  switch (user?.role) {
    case 'admin':
      return admin || fallback;
    case 'staff':
      return staff || fallback;
    case 'retailer':
      return retailer || fallback;
    default:
      return fallback;
  }
};

/**
 * Higher-order component for protecting routes/pages
 */
export const withPermission = (Component, module, action, FallbackComponent = null) => {
  return (props) => {
    const { hasPermission, loading } = usePermissions();

    if (loading) {
      return <LoadingScreen>Loading...</LoadingScreen>;
    }

    if (!hasPermission(module, action)) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return <AccessDenied />;
    }

    return <Component {...props} />;
  };
};

// Default access denied component
const AccessDenied = () => (
  <AccessDeniedContainer>
    <AccessDeniedIcon>🔒</AccessDeniedIcon>
    <AccessDeniedTitle>Access Denied</AccessDeniedTitle>
    <AccessDeniedText>
      You don't have permission to access this feature. Please contact your administrator.
    </AccessDeniedText>
  </AccessDeniedContainer>
);

// Styled Components
const LoadingPlaceholder = styled.div`
  padding: 0.5rem;
  color: var(--nb-ink);
  opacity: 0.6;
`;

const LoadingScreen = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--nb-ink);
  font-size: 1.2rem;
`;

const AccessDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  text-align: center;
`;

const AccessDeniedIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const AccessDeniedTitle = styled.h2`
  color: var(--nb-ink);
  font-size: 2rem;
  margin: 0 0 1rem 0;
`;

const AccessDeniedText = styled.p`
  color: var(--nb-ink);
  opacity: 0.7;
  font-size: 1.1rem;
  max-width: 500px;
  line-height: 1.6;
`;

export default ProtectedComponent;
