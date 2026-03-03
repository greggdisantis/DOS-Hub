import { useAuth } from "@/hooks/use-auth";

/**
 * System role hierarchy:
 *   pending < guest < member < manager < admin
 *
 * Capabilities:
 *   pending  - No access to any module (awaiting approval)
 *   guest    - Read-only preview of permitted modules; no save/export/reports/settings
 *   member   - Full access to own work; no admin/global settings
 *   manager  - Full access to all work; no admin tools
 *   admin    - No restrictions
 */

export type SystemRole = "pending" | "guest" | "member" | "manager" | "admin";

const ROLE_RANK: Record<string, number> = {
  pending: 0,
  guest: 1,
  member: 2,
  manager: 3,
  admin: 4,
  // Legacy role mappings
  user: 2,
  technician: 2,
};

function getRank(role: string | undefined | null): number {
  return ROLE_RANK[role ?? "pending"] ?? 0;
}

/**
 * Returns the current user's system role.
 * Falls back to "pending" if not authenticated.
 */
export function useSystemRole(): SystemRole {
  const { user } = useAuth();
  const role = user?.role ?? "pending";
  // Normalize legacy roles
  if (role === "user" || role === "technician") return "member";
  return role as SystemRole;
}

/**
 * Returns true if the current user can save/create/update records.
 * Guests cannot save. Pending users cannot save.
 */
export function useCanSave(): boolean {
  const role = useSystemRole();
  return getRank(role) >= getRank("member");
}

/**
 * Returns true if the current user can export files (PDF, CSV, etc.).
 * Guests cannot export.
 */
export function useCanExport(): boolean {
  const role = useSystemRole();
  return getRank(role) >= getRank("member");
}

/**
 * Returns true if the current user can edit another user's work.
 * Only managers and admins can edit other users' records.
 */
export function useCanEditOthers(): boolean {
  const role = useSystemRole();
  return getRank(role) >= getRank("manager");
}

/**
 * Returns true if the current user can access admin tools
 * (User Management, Module Permissions, global settings).
 */
export function useIsAdmin(): boolean {
  const role = useSystemRole();
  return role === "admin";
}

/**
 * Returns true if the current user can access manager tools
 * (Dashboard, all orders, reports).
 */
export function useIsManagerOrAbove(): boolean {
  const role = useSystemRole();
  return getRank(role) >= getRank("manager");
}

/**
 * Returns true if the current user has the Owner job role.
 * Owner job role is required to modify Module Permissions.
 */
export function useIsOwner(): boolean {
  const { user } = useAuth();
  const dosRoles = (user?.dosRoles as string[]) ?? [];
  return dosRoles.includes("Owner");
}

/**
 * Returns a display label for the current system role.
 */
export function useRoleLabel(): string {
  const role = useSystemRole();
  const labels: Record<string, string> = {
    pending: "Pending",
    guest: "Guest",
    member: "Team Member",
    manager: "Manager",
    admin: "Admin",
  };
  return labels[role] ?? role;
}
