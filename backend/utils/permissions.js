const PERMISSIONS = {
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  CATALOG_DELETE: 'catalog:delete',
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  COMMERCE_MANAGE: 'commerce:manage',
  VENDORS_MANAGE: 'vendors:manage',
  REPORTS_READ: 'reports:read',
  CMS_MANAGE: 'cms:manage',
  MEDIA_MANAGE: 'media:manage',
  STAFF_MANAGE: 'staff:manage',
  AUDIT_READ: 'audit:read',
  BULK_MANAGE: 'bulk:manage',
  WEBHOOKS_MANAGE: 'webhooks:manage',
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  catalog_manager: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_WRITE,
    PERMISSIONS.CATALOG_DELETE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.BULK_MANAGE,
  ],
  order_manager: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.BULK_MANAGE,
  ],
  commerce_manager: [
    PERMISSIONS.COMMERCE_MANAGE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.WEBHOOKS_MANAGE,
  ],
  content_manager: [
    PERMISSIONS.CMS_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
  ],
  analyst: [
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.ORDERS_READ,
  ],
  vendor_manager: [
    PERMISSIONS.VENDORS_MANAGE,
    PERMISSIONS.REPORTS_READ,
  ],
};

const normalizePermissionList = (permissions = []) =>
  [...new Set((permissions || []).map((permission) => String(permission || '').trim()).filter(Boolean))];

const getPermissionsForUser = (user = {}) => {
  if (!user) {
    return [];
  }

  if (user.isAdmin) {
    return ALL_PERMISSIONS;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return normalizePermissionList([...rolePermissions, ...(user.staffPermissions || [])]);
};

const hasPermission = (user = {}, requiredPermission = '') => {
  if (user?.isAdmin) {
    return true;
  }

  if (!user?.isStaff || user.staffStatus === 'Suspended') {
    return false;
  }

  const permissions = getPermissionsForUser(user);
  return permissions.includes('*') || permissions.includes(requiredPermission);
};

export {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForUser,
  hasPermission,
  normalizePermissionList,
};
