import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import SalesPipelineScreen, { SalesPipelineContent } from "./sales-pipeline";
import { ReceiptDashboardContent } from "./receipt-dashboard";

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "#687076", icon: "pencil" },
  submitted: { label: "Submitted", color: "#3B82F6", icon: "paperplane.fill" },
  approved: { label: "Approved", color: "#22C55E", icon: "checkmark.circle.fill" },
  rejected: { label: "Rejected", color: "#EF4444", icon: "xmark.circle.fill" },
  completed: { label: "Completed", color: "#8B5CF6", icon: "checkmark.seal.fill" },
};

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{title}</Text>
    </View>
  );
}

// ─── Status Bar ─────────────────────────────────────────────────────────────

function StatusBar({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const colors = useColors();
  if (total === 0) return null;

  const segments = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    count: byStatus[key] || 0,
    pct: total > 0 ? ((byStatus[key] || 0) / total) * 100 : 0,
    color: cfg.color,
    label: cfg.label,
  }));

  return (
    <View style={[styles.statusBarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Status Breakdown</Text>

      {/* Visual bar */}
      <View style={styles.barContainer}>
        {segments.map((s) =>
          s.count > 0 ? (
            <View key={s.key} style={[styles.barSegment, { flex: s.pct, backgroundColor: s.color }]} />
          ) : null,
        )}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={[styles.legendText, { color: colors.muted }]}>
              {s.label}: {s.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Technician Table ───────────────────────────────────────────────────────

function TechTable({ data }: { data: any[] }) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Technician Performance</Text>
        <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 20 }}>
          No technician data available yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, flex: 1 }]}>Technician Performance</Text>
        <IconSymbol name="person.3.fill" size={20} color={colors.muted} />
      </View>

      {/* Table header */}
      <View style={[styles.tRow, styles.tHeaderRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.tHeaderCell, styles.tCellName, { color: colors.muted }]}>Name</Text>
        <Text style={[styles.tHeaderCell, styles.tCellNum, { color: colors.muted }]}>Orders</Text>
        <Text style={[styles.tHeaderCell, styles.tCellNum, { color: colors.muted }]}>Screens</Text>
        <Text style={[styles.tHeaderCell, styles.tCellNum, { color: colors.muted }]}>Done %</Text>
        <Text style={[styles.tHeaderCell, styles.tCellNum, { color: colors.muted }]}>Edits</Text>
      </View>

      {data.map((tech, idx) => (
        <View
          key={tech.userId}
          style={[
            styles.tRow,
            idx < data.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
          ]}
        >
          <View style={[styles.tCellName]}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>
              {tech.name}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {tech.pendingOrders} pending · {tech.approvedOrders} approved
            </Text>
          </View>
          <Text style={[styles.tCellNumText, { color: colors.foreground }]}>{tech.totalOrders}</Text>
          <Text style={[styles.tCellNumText, { color: colors.foreground }]}>{tech.totalScreens}</Text>
          <View style={styles.tCellNum}>
            <Text
              style={[
                styles.tCellNumText,
                {
                  color:
                    tech.completionRate >= 75
                      ? "#22C55E"
                      : tech.completionRate >= 50
                        ? "#F59E0B"
                        : colors.foreground,
                },
              ]}
            >
              {tech.completionRate}%
            </Text>
          </View>
          <Text style={[styles.tCellNumText, { color: tech.revisionCount > 0 ? "#F59E0B" : colors.muted }]}>
            {tech.revisionCount}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Recent Activity ────────────────────────────────────────────────────────

function RecentActivity({ orders, onTapOrder }: { orders: any[]; onTapOrder: (id: number) => void }) {
  const colors = useColors();

  if (!orders || orders.length === 0) {
    return (
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
        <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 20 }}>
          No orders yet. Orders will appear here as technicians submit them.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, flex: 1 }]}>Recent Activity</Text>
        <IconSymbol name="clock.fill" size={18} color={colors.muted} />
      </View>

      {orders.slice(0, 10).map((order, idx) => {
        const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
        return (
          <TouchableOpacity
            key={order.id}
            onPress={() => onTapOrder(order.id)}
            activeOpacity={0.7}
            style={[
              styles.activityItem,
              idx < Math.min(orders.length, 10) - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.activityDot, { backgroundColor: statusCfg.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>
                {order.title || "Untitled Order"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {order.userName} · {order.screenCount} screen{order.screenCount !== 1 ? "s" : ""} ·{" "}
                {order.manufacturer || "—"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={[styles.statusPill, { backgroundColor: statusCfg.color + "20" }]}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: statusCfg.color }}>{statusCfg.label}</Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                {new Date(order.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Module Picker ──────────────────────────────────────────────────────────

type DashboardModule = 'screen-ordering' | 'sales-pipeline' | 'receipts';

const DASHBOARD_MODULES: { key: DashboardModule; label: string; icon: any }[] = [
  { key: 'screen-ordering', label: 'Screen Ordering', icon: 'rectangle.grid.2x2.fill' },
  { key: 'sales-pipeline', label: 'Sales Pipeline', icon: 'chart.bar.fill' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt' },
];

function ModulePicker({
  active,
  onChange,
}: {
  active: DashboardModule;
  onChange: (m: DashboardModule) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: 12, marginBottom: 4, flexGrow: 0, flexShrink: 0, maxHeight: 52 }}
      contentContainerStyle={{ gap: 8, paddingVertical: 8, alignItems: 'center' }}
    >
      {DASHBOARD_MODULES.map((m) => (
        <Pressable
          key={m.key}
          onPress={() => onChange(m.key)}
          style={({ pressed }) => ([
            modulePickerStyles.tab,
            {
              borderColor: active === m.key ? colors.primary : colors.border,
              backgroundColor: active === m.key ? colors.primary + '18' : colors.surface,
            },
            pressed && { opacity: 0.7 },
          ])}
        >
          <IconSymbol
            name={m.icon}
            size={15}
            color={active === m.key ? colors.primary : colors.muted}
          />
          <Text
            style={[
              modulePickerStyles.tabText,
              { color: active === m.key ? colors.primary : colors.muted },
            ]}
          >
            {m.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const modulePickerStyles = StyleSheet.create({
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
});

// ─── Main Dashboard ─────────────────────────────────────────────────────────

function DashboardContent() {
  const colors = useColors();
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<DashboardModule>('screen-ordering');

  const { data, isLoading, refetch } = trpc.dashboard.stats.useQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTapOrder = (orderId: number) => {
    router.push({ pathname: "/modules/order-detail", params: { orderId: String(orderId) } } as any);
  };

  // ── Header (shared across modules) ──────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
        <IconSymbol
          name="chevron.right"
          size={24}
          color={colors.foreground}
          style={{ transform: [{ rotate: "180deg" }] }}
        />
      </TouchableOpacity>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, marginLeft: 8, flex: 1 }}>
        Dashboard
      </Text>
      {activeModule === 'screen-ordering' && (
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.6} style={{ padding: 4 }}>
          <IconSymbol name="arrow.clockwise" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Receipts Finance module ──────────────────────────────────────────────────────
  if (activeModule === 'receipts') {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ flexShrink: 0 }}>
            <ModulePicker active={activeModule} onChange={setActiveModule} />
          </View>
          <View style={{ flex: 1 }}>
            <ReceiptDashboardContent />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ── Sales Pipeline module ────────────────────────────────────────────────────────
  if (activeModule === 'sales-pipeline') {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ flexShrink: 0 }}>
            <ModulePicker active={activeModule} onChange={setActiveModule} />
          </View>
          <View style={{ flex: 1 }}>
            <SalesPipelineContent />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // -- Screen Ordering module (default) --
  if (isLoading) {
    return (
      <ScreenContainer>
        {header}
        <ModulePicker active={activeModule} onChange={setActiveModule} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 12 }}>Loading dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const stats = data || { totalOrders: 0, totalScreens: 0, byStatus: {} as Record<string, number>, recentOrders: [] as any[], techPerformance: [] as any[] };
  const byStatus = (stats.byStatus || {}) as Record<string, number>;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {header}
        <ModulePicker active={activeModule} onChange={setActiveModule} />

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon="receipt"
            color="#3B82F6"
            bgColor="#3B82F620"
          />
          <StatCard
            title="Total Screens"
            value={stats.totalScreens || 0}
            icon="rectangle.grid.2x2.fill"
            color="#8B5CF6"
            bgColor="#8B5CF620"
          />
          <StatCard
            title="Completed"
            value={byStatus.completed || 0}
            icon="checkmark.seal.fill"
            color="#22C55E"
            bgColor="#22C55E20"
          />
          <StatCard
            title="Pending"
            value={(byStatus.draft || 0) + (byStatus.submitted || 0)}
            icon="clock.fill"
            color="#F59E0B"
            bgColor="#F59E0B20"
          />
        </View>

        {/* Status Breakdown Bar */}
        <View style={styles.section}>
          <StatusBar byStatus={byStatus} total={stats.totalOrders} />
        </View>

        {/* Technician Performance */}
        <View style={styles.section}>
          <TechTable data={stats.techPerformance || []} />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <RecentActivity orders={stats.recentOrders || []} onTapOrder={handleTapOrder} />
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, styles.quickActions]}>
          <TouchableOpacity
            onPress={() => router.push("/modules/order-review" as any)}
            activeOpacity={0.7}
            style={[styles.quickActionBtn, { backgroundColor: colors.primary }]}
          >
            <IconSymbol name="tray.full.fill" size={18} color="#FFFFFF" />
            <Text style={styles.quickActionText}>View All Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/modules/admin-users" as any)}
            activeOpacity={0.7}
            style={[styles.quickActionBtn, { backgroundColor: "#8B5CF6" }]}
          >
            <IconSymbol name="person.3.fill" size={18} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function DashboardScreen() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  // Stat cards
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Status bar
  statusBarCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  barContainer: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  barSegment: {
    height: "100%",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  // Table
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  tHeaderRow: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tCellName: {
    flex: 2,
    paddingRight: 8,
  },
  tCellNum: {
    flex: 1,
    alignItems: "center",
  },
  tCellNumText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  // Activity
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  // Quick actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
