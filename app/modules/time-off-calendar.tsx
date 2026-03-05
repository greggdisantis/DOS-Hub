import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { DatePicker } from '@/components/ui/date-picker';

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarRequest = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalDays: number | null;
  notes: string | null;
  periodYear: string | null;
};

type ViewMode = 'month' | 'week' | 'day';

// ─── Employee Color Palette ───────────────────────────────────────────────────

const EMPLOYEE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#A855F7', // purple
];

function getEmployeeColor(index: number): string {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start) return false;
  const endDate = end || start;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return d >= s && d <= e;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getWeekDays(baseDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // go to Sunday
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return '';
  const first = days[0];
  const last = days[days.length - 1];
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${first.toLocaleDateString('en-US', opts)} – ${last.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPE_OPTIONS = ['Vacation', 'Sick', 'Personal', 'Bereavement', 'Other'];
const STATUS_OPTIONS = ['pending', 'approved'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimeOffCalendar() {
  const colors = useColors();
  const today = new Date();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [filterVisible, setFilterVisible] = useState(false);

  // Employee visibility map: userId -> visible
  const [employeeVisible, setEmployeeVisible] = useState<Record<number, boolean>>({});
  // Filter state
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  // Pending filter (applied on Apply)
  const [pendingTypes, setPendingTypes] = useState<string[]>([]);
  const [pendingStatuses, setPendingStatuses] = useState<string[]>([]);
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: rawRequests = [], isLoading } = useQuery(
    trpc.timeOff.getCalendarRequests.queryOptions()
  );

  // Build sorted unique employee list with colors
  const employees = useMemo(() => {
    const map = new Map<number, { userId: number; userName: string; color: string }>();
    rawRequests.forEach((r) => {
      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName,
          color: getEmployeeColor(map.size),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [rawRequests]);

  // Initialize visibility for new employees
  useMemo(() => {
    employees.forEach((e) => {
      if (!(e.userId in employeeVisible)) {
        setEmployeeVisible((prev) => ({ ...prev, [e.userId]: true }));
      }
    });
  }, [employees]);

  // Employee color lookup
  const colorByUserId = useMemo(() => {
    const m: Record<number, string> = {};
    employees.forEach((e) => { m[e.userId] = e.color; });
    return m;
  }, [employees]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    return rawRequests.filter((r) => {
      if (!employeeVisible[r.userId]) return false;
      if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(r.status)) return false;
      if (filterFrom) {
        const start = parseDate(r.startDate);
        if (!start || formatYMD(start) < filterFrom) return false;
      }
      if (filterTo) {
        const end = parseDate(r.endDate || r.startDate);
        if (!end || formatYMD(end) > filterTo) return false;
      }
      return true;
    });
  }, [rawRequests, employeeVisible, filterTypes, filterStatuses, filterFrom, filterTo]);

  // Get requests that overlap a given date
  const getRequestsForDate = useCallback((date: Date): CalendarRequest[] => {
    return filteredRequests.filter((r) => {
      const start = parseDate(r.startDate);
      const end = parseDate(r.endDate);
      return isDateInRange(date, start, end);
    });
  }, [filteredRequests]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'month') {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    } else if (viewMode === 'week') {
      setSelectedDay((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + dir * 7);
        return next;
      });
    } else {
      setSelectedDay((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + dir);
        return next;
      });
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(new Date(today));
  };

  // ─── Active filter count ───────────────────────────────────────────────────

  const activeFilterCount = filterTypes.length + filterStatuses.length + (filterFrom ? 1 : 0) + (filterTo ? 1 : 0);

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const renderEventDot = (req: CalendarRequest) => (
    <View
      key={req.id}
      style={[styles.eventDot, { backgroundColor: colorByUserId[req.userId] || '#888' }]}
    />
  );

  const renderEventBar = (req: CalendarRequest) => (
    <View
      key={req.id}
      style={[styles.eventBar, { backgroundColor: colorByUserId[req.userId] || '#888' }]}
    >
      <Text style={styles.eventBarText} numberOfLines={1}>
        {req.userName.split(' ')[0]}
      </Text>
    </View>
  );

  // ─── Month View ────────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = getDaysInMonth(year, month);
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const blanks = Array(firstDayOfWeek).fill(null);
    const allCells = [...blanks, ...days];
    // Pad to complete last row
    while (allCells.length % 7 !== 0) allCells.push(null);

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeks.push(allCells.slice(i, i + 7));
    }

    return (
      <ScrollView style={{ flex: 1 }}>
        {/* Day headers */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((d) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, { color: colors.muted }]}>{d}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={[styles.weekRow, { borderTopWidth: 0.5, borderTopColor: colors.border }]}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dayCell} />;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const reqs = getRequestsForDate(day);
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => { setSelectedDay(day); setViewMode('day'); }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.dayNumber,
                    isToday && { backgroundColor: colors.primary },
                  ]}>
                    <Text style={[
                      styles.dayNumberText,
                      { color: isToday ? '#fff' : colors.foreground },
                      day.getMonth() !== month && { color: colors.muted },
                    ]}>
                      {day.getDate()}
                    </Text>
                  </View>
                  <View style={styles.eventDotsRow}>
                    {reqs.slice(0, 3).map(renderEventDot)}
                    {reqs.length > 3 && (
                      <Text style={[styles.moreText, { color: colors.muted }]}>+{reqs.length - 3}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  // ─── Week View ─────────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDay);
    return (
      <ScrollView style={{ flex: 1 }}>
        {/* Day headers */}
        <View style={[styles.weekRow, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.weekHeaderCell, isSelected && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
                onPress={() => { setSelectedDay(day); setViewMode('day'); }}
              >
                <Text style={[styles.weekHeaderDay, { color: colors.muted }]}>{DAY_LABELS[day.getDay()]}</Text>
                <View style={[styles.dayNumber, isToday && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.dayNumberText, { color: isToday ? '#fff' : colors.foreground }]}>
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Event rows per employee */}
        {employees
          .filter((e) => employeeVisible[e.userId])
          .map((emp) => {
            const empReqs = filteredRequests.filter((r) => r.userId === emp.userId);
            const hasAny = weekDays.some((day) =>
              empReqs.some((r) => isDateInRange(day, parseDate(r.startDate), parseDate(r.endDate)))
            );
            if (!hasAny) return null;
            return (
              <View key={emp.userId} style={[styles.weekEmpRow, { borderBottomColor: colors.border }]}>
                <View style={styles.weekEmpLabel}>
                  <View style={[styles.empColorDot, { backgroundColor: emp.color }]} />
                  <Text style={[styles.weekEmpName, { color: colors.foreground }]} numberOfLines={1}>
                    {emp.userName.split(' ')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  {weekDays.map((day, di) => {
                    const dayReqs = empReqs.filter((r) =>
                      isDateInRange(day, parseDate(r.startDate), parseDate(r.endDate))
                    );
                    return (
                      <View key={di} style={[styles.weekDayCell, { borderLeftColor: colors.border }]}>
                        {dayReqs.map((req) => (
                          <View key={req.id} style={[styles.weekEventBlock, { backgroundColor: emp.color + 'CC' }]}>
                            <Text style={styles.weekEventText} numberOfLines={1}>
                              {req.type}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        {/* Empty state */}
        {filteredRequests.filter((r) =>
          weekDays.some((day) => isDateInRange(day, parseDate(r.startDate), parseDate(r.endDate)))
        ).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No time off this week</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ─── Day View ──────────────────────────────────────────────────────────────

  const renderDayView = () => {
    const dayReqs = getRequestsForDate(selectedDay);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {dayReqs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No time off on this day</Text>
          </View>
        ) : (
          dayReqs.map((req) => {
            const color = colorByUserId[req.userId] || '#888';
            return (
              <View key={req.id} style={[styles.dayEventCard, { borderLeftColor: color, backgroundColor: colors.surface }]}>
                <View style={styles.dayEventHeader}>
                  <View style={[styles.empColorDot, { backgroundColor: color }]} />
                  <Text style={[styles.dayEventName, { color: colors.foreground }]}>{req.userName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: req.status === 'approved' ? '#10B98120' : '#F59E0B20' }]}>
                    <Text style={[styles.statusBadgeText, { color: req.status === 'approved' ? '#10B981' : '#F59E0B' }]}>
                      {req.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.dayEventMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color }]}>{req.type}</Text>
                  </View>
                  <Text style={[styles.dayEventDates, { color: colors.muted }]}>
                    {req.startDate} {req.endDate && req.endDate !== req.startDate ? `→ ${req.endDate}` : ''}
                  </Text>
                </View>
                {req.totalDays != null && (
                  <Text style={[styles.dayEventDays, { color: colors.muted }]}>{req.totalDays} day{req.totalDays !== 1 ? 's' : ''}</Text>
                )}
                {req.notes ? (
                  <Text style={[styles.dayEventNotes, { color: colors.muted }]}>{req.notes}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ─── Header title ──────────────────────────────────────────────────────────

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return formatMonthYear(currentDate);
    if (viewMode === 'week') return formatWeekRange(getWeekDays(selectedDay));
    return formatDayHeader(selectedDay);
  }, [viewMode, currentDate, selectedDay]);

  // ─── Filter Sheet ──────────────────────────────────────────────────────────

  const togglePendingType = (t: string) => {
    setPendingTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };
  const togglePendingStatus = (s: string) => {
    setPendingStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };
  const applyFilters = () => {
    setFilterTypes(pendingTypes);
    setFilterStatuses(pendingStatuses);
    setFilterFrom(pendingFrom);
    setFilterTo(pendingTo);
    setFilterVisible(false);
  };
  const clearFilters = () => {
    setPendingTypes([]);
    setPendingStatuses([]);
    setPendingFrom('');
    setPendingTo('');
    setFilterTypes([]);
    setFilterStatuses([]);
    setFilterFrom('');
    setFilterTo('');
    setFilterVisible(false);
  };
  const openFilter = () => {
    setPendingTypes(filterTypes);
    setPendingStatuses(filterStatuses);
    setPendingFrom(filterFrom);
    setPendingTo(filterTo);
    setFilterVisible(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background">
      <Stack.Screen
        options={{
          title: 'Time Off Calendar',
          headerBackTitle: 'Admin',
          headerShown: true,
        }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigate(-1)} style={styles.navBtn}>
          <Text style={[styles.navBtnText, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{headerTitle}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate(1)} style={styles.navBtn}>
          <Text style={[styles.navBtnText, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* View mode switcher */}
      <View style={[styles.viewSwitcher, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewTab, viewMode === mode && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.viewTabText, { color: viewMode === mode ? colors.primary : colors.muted }]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {/* Filter button */}
        <TouchableOpacity style={styles.filterBtn} onPress={openFilter}>
          <Text style={[styles.filterBtnText, { color: activeFilterCount > 0 ? colors.primary : colors.muted }]}>
            {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Employee legend + toggles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.legendBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, gap: 8 }}
      >
        {employees.map((emp) => (
          <TouchableOpacity
            key={emp.userId}
            style={[
              styles.legendChip,
              {
                backgroundColor: employeeVisible[emp.userId] ? emp.color + '22' : colors.surface,
                borderColor: employeeVisible[emp.userId] ? emp.color : colors.border,
              },
            ]}
            onPress={() => setEmployeeVisible((prev) => ({ ...prev, [emp.userId]: !prev[emp.userId] }))}
          >
            <View style={[styles.empColorDot, { backgroundColor: employeeVisible[emp.userId] ? emp.color : colors.border }]} />
            <Text style={[
              styles.legendChipText,
              { color: employeeVisible[emp.userId] ? emp.color : colors.muted },
            ]}>
              {emp.userName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Calendar content */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Loading calendar…</Text>
          </View>
        ) : viewMode === 'month' ? renderMonthView()
          : viewMode === 'week' ? renderWeekView()
          : renderDayView()}
      </View>

      {/* Filter Sheet Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent presentationStyle="overCurrentContext">
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)} />
        <View style={[styles.filterSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.filterSheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.filterSheetTitle, { color: colors.foreground }]}>Filter Calendar</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Request Type */}
            <Text style={[styles.filterSectionLabel, { color: colors.muted }]}>REQUEST TYPE</Text>
            <View style={styles.chipRow}>
              {TYPE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: pendingTypes.includes(t) ? colors.primary : colors.surface,
                      borderColor: pendingTypes.includes(t) ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => togglePendingType(t)}
                >
                  <Text style={[styles.filterChipText, { color: pendingTypes.includes(t) ? '#fff' : colors.foreground }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <Text style={[styles.filterSectionLabel, { color: colors.muted }]}>STATUS</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: pendingStatuses.includes(s) ? colors.primary : colors.surface,
                      borderColor: pendingStatuses.includes(s) ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => togglePendingStatus(s)}
                >
                  <Text style={[styles.filterChipText, { color: pendingStatuses.includes(s) ? '#fff' : colors.foreground }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Range */}
            <Text style={[styles.filterSectionLabel, { color: colors.muted }]}>DATE RANGE</Text>
            <View style={styles.dateRangeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>From</Text>
                <DatePicker
                  value={pendingFrom}
                  onChange={setPendingFrom}
                  placeholder="Start date"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateRangeLabel, { color: colors.muted }]}>To</Text>
                <DatePicker
                  value={pendingTo}
                  onChange={setPendingTo}
                  placeholder="End date"
                  minimumDate={pendingFrom || undefined}
                />
              </View>
            </View>

            {/* Employee visibility */}
            <Text style={[styles.filterSectionLabel, { color: colors.muted }]}>EMPLOYEES</Text>
            {employees.map((emp) => (
              <View key={emp.userId} style={[styles.empToggleRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.empColorDot, { backgroundColor: emp.color }]} />
                <Text style={[styles.empToggleName, { color: colors.foreground }]}>{emp.userName}</Text>
                <Switch
                  value={!!employeeVisible[emp.userId]}
                  onValueChange={(v) => setEmployeeVisible((prev) => ({ ...prev, [emp.userId]: v }))}
                  trackColor={{ false: colors.border, true: emp.color + '88' }}
                  thumbColor={employeeVisible[emp.userId] ? emp.color : colors.muted}
                />
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.filterFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={[styles.clearBtnText, { color: colors.muted }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    paddingHorizontal: 4,
  },
  viewTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: -0.5,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendBar: {
    flexShrink: 0,
    maxHeight: 50,
    borderBottomWidth: 0.5,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  legendChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  empColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Month view
  weekRow: {
    flexDirection: 'row',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayCell: {
    flex: 1,
    minHeight: 72,
    padding: 2,
    alignItems: 'center',
  },
  dayNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventBar: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginBottom: 1,
    width: '100%',
  },
  eventBarText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  moreText: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Week view
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekHeaderDay: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  weekEmpRow: {
    flexDirection: 'row',
    minHeight: 44,
    borderBottomWidth: 0.5,
    alignItems: 'stretch',
  },
  weekEmpLabel: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  weekEmpName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  weekDayCell: {
    flex: 1,
    borderLeftWidth: 0.5,
    padding: 2,
    minHeight: 44,
  },
  weekEventBlock: {
    borderRadius: 3,
    padding: 2,
    marginBottom: 2,
  },
  weekEventText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  // Day view
  dayEventCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dayEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dayEventName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayEventDates: {
    fontSize: 12,
  },
  dayEventDays: {
    fontSize: 12,
    marginBottom: 2,
  },
  dayEventNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
  },
  // Filter sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  filterSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dateRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  empToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  empToggleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  filterFooter: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 0.5,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
