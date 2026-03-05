import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useIsAdmin, useIsOwner } from "@/hooks/use-rbac";
import { trpc } from "@/lib/trpc";

// ─── Module Definitions ───────────────────────────────────────────────────────

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", icon: "chart.bar.fill", description: "Screen Ordering & Sales Pipeline analytics" },
  { key: "screen-ordering", label: "Screen Ordering", icon: "rectangle.grid.2x2.fill", description: "Create and manage screen installation orders" },
  { key: "client-meeting-report", label: "Client Meeting Report", icon: "doc.text.fill", description: "Log client meetings and track follow-ups" },
  { key: "sales-pipeline", label: "Sales Pipeline", icon: "chart.bar.fill", description: "Track deals, confidence & outcomes" },
  { key: "job-intelligence", label: "Job Intelligence", icon: "chart.bar.fill", description: "Job readiness and field status overview" },
  { key: "receipt-capture", label: "Receipt Capture", icon: "camera.fill", description: "Capture and categorize expense receipts" },
  { key: "aquaclean-receipt-capture", label: "AquaClean Receipt Capture", icon: "camera.fill", description: "AquaClean-specific expense receipt capture and reporting" },
  { key: "time-off", label: "Time Off", icon: "calendar", description: "Employee time off requests and PTO balance tracking" },
  { key: "zoning-lookup", label: "Zoning Lookup", icon: "map.fill", description: "Look up property zoning information" },
  { key: "hubspot-crm", label: "HubSpot CRM", icon: "link", description: "Access HubSpot CRM contacts and deals" },
  { key: "training", label: "Training", icon: "book.fill", description: "Training materials and resources" },
  { key: "project-material-delivery", label: "Material Delivery", icon: "shippingbox.fill", description: "Project material checklists & warehouse tracking" },
  { key: "admin-users", label: "User Management", icon: "person.2.fill", description: "Manage users, roles, and permissions" },
  { key: "module-permissions", label: "Module Permissions", icon: "lock.fill", description: "Configure which job roles can access each module" },
];

const DOS_ROLES = [
  "Owner",
  "Finance Dept.",
  "Project Consultant",
  "Sales Manager",
  "Construction Coordinator",
  "Executive Assistant",
  "Permit Dept",
  "Logistics Dept",
  "Drafting",
  "Engineering",
  "Operations Manager",
  "Project Manager",
  "Project Supervisor",
  "Warehouse Manager",
  "Marketing",
  "AquaClean",
  "Team Member",
  "Guest User",
];

// ─── Role Picker Modal ────────────────────────────────────────────────────────

function RolePickerModal({
  visible,
  moduleLabel,
  selectedRoles,
  onSave,
  onClose,
}: {
  visible: boolean;
  moduleLabel: string;
  selectedRoles: string[];
  onSave: (roles: string[]) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<string[]>(selectedRoles);

  const handleToggle = (role: string) => {
    setDraft((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setDraft(selectedRoles)}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            {moduleLabel}
          </Text>
          <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>
            Select which job roles can access this module:
          </Text>

          {/* Select All / None */}
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              onPress={() => setDraft([...DOS_ROLES])}
              activeOpacity={0.7}
              style={[styles.selectAllBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDraft([])}
              activeOpacity={0.7}
              style={[styles.selectAllBtn, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {DOS_ROLES.map((role) => {
              const selected = draft.includes(role);
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleToggle(role)}
                  activeOpacity={0.7}
                  style={[
                    styles.checkRow,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + "12" : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {selected && <IconSymbol name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={{ fontSize: 15, color: colors.foreground, flex: 1 }}>{role}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.btn, { borderColor: colors.border, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(draft)}
              activeOpacity={0.7}
              style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function ModulePermissionsContent() {
  const colors = useColors();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isOwner = useIsOwner();

  const [editingModule, setEditingModule] = useState<{ key: string; label: string; roles: string[] } | null>(null);

  // Load all module permissions from server
  const { data: permissionsData, isLoading, refetch } = trpc.modulePermissions.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const setPermissionsMutation = trpc.modulePermissions.set.useMutation({
    onSuccess: () => {
      refetch();
      setEditingModule(null);
    },
  });

  const getModuleRoles = useCallback((moduleKey: string): string[] => {
    if (!permissionsData) return DOS_ROLES; // Default: all roles have access
    const entry = permissionsData.find((p: any) => p.moduleKey === moduleKey);
    if (!entry) return DOS_ROLES; // Not configured = all roles
    try {
      const roles = typeof entry.allowedJobRoles === "string"
        ? JSON.parse(entry.allowedJobRoles)
        : entry.allowedJobRoles;
      return Array.isArray(roles) ? roles : DOS_ROLES;
    } catch {
      return DOS_ROLES;
    }
  }, [permissionsData]);

  const handleSave = (roles: string[]) => {
    if (!editingModule) return;
    setPermissionsMutation.mutate({
      moduleKey: editingModule.key,
      allowedJobRoles: roles,
    });
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <IconSymbol name="lock.fill" size={48} color={colors.error} />
        <Text style={[styles.accessTitle, { color: colors.foreground }]}>Admin Access Required</Text>
        <Text style={[styles.accessSubtitle, { color: colors.muted }]}>
          This section is restricted to administrators.
        </Text>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <IconSymbol name="lock.fill" size={48} color={colors.warning} />
        <Text style={[styles.accessTitle, { color: colors.foreground }]}>Owner Access Required</Text>
        <Text style={[styles.accessSubtitle, { color: colors.muted }]}>
          Only users with the Owner job role can modify module permissions.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          <Text style={{ fontSize: 16, color: colors.primary, fontWeight: "600" }}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Module Permissions</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={[styles.infoBar, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
        <IconSymbol name="lock.fill" size={14} color={colors.primary} />
        <Text style={{ fontSize: 13, color: colors.primary, flex: 1, marginLeft: 8 }}>
          Configure which job roles can access each module. Owner role always has full access.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 12 }}>Loading permissions...</Text>
        </View>
      ) : (
        <FlatList
          data={ALL_MODULES}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const allowedRoles = getModuleRoles(item.key);
            const isAllRoles = allowedRoles.length === DOS_ROLES.length;
            return (
              <TouchableOpacity
                onPress={() => setEditingModule({ key: item.key, label: item.label, roles: allowedRoles })}
                activeOpacity={0.8}
                style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.moduleRow}>
                  <View style={[styles.moduleIcon, { backgroundColor: colors.primary + "15" }]}>
                    <IconSymbol name={item.icon as any} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.moduleLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.moduleDesc, { color: colors.muted }]}>{item.description}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </View>
                <View style={[styles.rolesRow, { borderTopColor: colors.border }]}>
                  {isAllRoles ? (
                    <View style={[styles.allRolesBadge, { backgroundColor: colors.success + "20" }]}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>All Roles</Text>
                    </View>
                  ) : allowedRoles.length === 0 ? (
                    <View style={[styles.allRolesBadge, { backgroundColor: colors.error + "20" }]}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.error }}>No Access</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {allowedRoles.slice(0, 4).map((role) => (
                        <View key={role} style={[styles.rolePill, { backgroundColor: colors.primary + "15" }]}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>{role}</Text>
                        </View>
                      ))}
                      {allowedRoles.length > 4 && (
                        <View style={[styles.rolePill, { backgroundColor: colors.border }]}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>+{allowedRoles.length - 4} more</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {editingModule && (
        <RolePickerModal
          visible={true}
          moduleLabel={editingModule.label}
          selectedRoles={editingModule.roles}
          onSave={handleSave}
          onClose={() => setEditingModule(null)}
        />
      )}
    </View>
  );
}

export default function ModulePermissionsScreen() {
  return (
    <AuthGuard requireAdmin>
      <ScreenContainer edges={["top", "left", "right"]}>
        <ModulePermissionsContent />
      </ScreenContainer>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  accessTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  accessSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  moduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  rolesRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allRolesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  selectAllRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  selectAllBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
});
