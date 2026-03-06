/**
 * Role-based access control utilities
 * Provides consistent role checking across the app
 * 
 * Role hierarchy (highest to lowest):
 * 1. super-admin: Unrestricted access to everything, can promote others to super-admin
 * 2. admin: Full access to all features and admin tools
 * 3. manager: Full access to all work + modifications, no admin tools
 * 4. member: Full access to own work only
 * 5. guest: Read-only preview of permitted modules
 * 6. pending: No access until approved by admin
 */

export type SystemRole = "pending" | "guest" | "member" | "manager" | "admin" | "super-admin";

/**
 * Check if a user has admin or higher privileges
 */
export function isAdminOrHigher(role?: string | null): boolean {
  return role === "admin" || role === "super-admin";
}

/**
 * Check if a user has manager or higher privileges
 */
export function isManagerOrHigher(role?: string | null): boolean {
  return role === "manager" || role === "admin" || role === "super-admin";
}

/**
 * Check if a user is a super-admin
 */
export function isSuperAdmin(role?: string | null): boolean {
  return role === "super-admin";
}

/**
 * Check if a user has a specific role or higher
 */
export function hasRoleOrHigher(role?: string | null, requiredRole: SystemRole = "admin"): boolean {
  const roleHierarchy: Record<SystemRole, number> = {
    "pending": 0,
    "guest": 1,
    "member": 2,
    "manager": 3,
    "admin": 4,
    "super-admin": 5,
  };

  const userLevel = roleHierarchy[role as SystemRole] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Get a human-readable label for a role
 */
export function getRoleLabel(role?: string | null): string {
  const labels: Record<string, string> = {
    "pending": "Pending Approval",
    "guest": "Guest",
    "member": "Team Member",
    "manager": "Manager",
    "admin": "Administrator",
    "super-admin": "Super Admin",
    "technician": "Team Member",
    "user": "Team Member",
  };

  return labels[role as string] || "Unknown";
}

/**
 * Get the color for a role badge
 */
export function getRoleColor(role?: string | null): string {
  const colors: Record<string, string> = {
    "pending": "#F59E0B",
    "guest": "#94A3B8",
    "member": "#0a7ea4",
    "manager": "#8B5CF6",
    "admin": "#EF4444",
    "super-admin": "#3B82F6",
    "technician": "#0a7ea4",
    "user": "#0a7ea4",
  };

  return colors[role as string] || "#6B7280";
}
