/**
 * Screen Ordering Module — State Management Hook
 * Matches the original DOS Screens Ordering Tool (v3) layout.
 */
import { useState, useCallback, useMemo } from "react";
import type {
  OrderState,
  ScreenConfig,
  ScreenSelections,
  ScreenMeasurements,
  MeasurementPoint,
  ProjectInfo,
} from "@/lib/screen-ordering/types";
import { createEmptyScreen, createEmptySelections } from "@/lib/screen-ordering/types";
import { calculateScreen } from "@/lib/screen-ordering/calculations";
import type { ScreenManufacturer } from "@/lib/screen-ordering/constants";

function createInitialState(): OrderState {
  return {
    project: {
      name: "",
      submitterName: "",
      date: new Date().toISOString().split("T")[0],
      address: "",
      jobNumber: "",
    },
    manufacturer: "DOS Screens",
    screens: [createEmptyScreen(0)],
    applyUChannelToAll: false,
    allSame: true,
  };
}

export function useScreenOrder() {
  const [state, setState] = useState<OrderState>(createInitialState);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);

  // ─── Recalculate a single screen ──────────────────────────────────
  const recalcScreen = useCallback(
    (screen: ScreenConfig, manufacturer: ScreenManufacturer): ScreenConfig => {
      const calculations = calculateScreen(
        screen.measurements,
        manufacturer,
        screen.selections.installMount,
        screen.reversedMeasurements
      );
      return { ...screen, calculations };
    },
    []
  );

  // ─── Project Info ─────────────────────────────────────────────────
  const updateProject = useCallback((updates: Partial<ProjectInfo>) => {
    setState((prev) => ({
      ...prev,
      project: { ...prev.project, ...updates },
    }));
  }, []);

  // ─── Manufacturer ─────────────────────────────────────────────────
  const setManufacturer = useCallback((manufacturer: ScreenManufacturer) => {
    setState((prev) => ({
      ...prev,
      manufacturer,
      screens: prev.screens.map((s) => ({
        ...s,
        selections: {
          ...createEmptySelections(),
          installMount: s.selections.installMount,
          motorSide: s.selections.motorSide,
        },
        calculations: null,
      })),
    }));
  }, []);

  // ─── Screen Count ─────────────────────────────────────────────────
  const setScreenCount = useCallback((count: number) => {
    setState((prev) => {
      const current = prev.screens.length;
      if (count === current) return prev;
      let screens: ScreenConfig[];
      if (count > current) {
        screens = [...prev.screens];
        for (let i = current; i < count; i++) {
          screens.push(createEmptyScreen(i));
        }
      } else {
        screens = prev.screens.slice(0, count);
      }
      return { ...prev, screens };
    });
    setActiveScreenIndex((prev) => Math.min(prev, count - 1));
  }, []);

  // ─── Screen Management ────────────────────────────────────────────
  const addScreen = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screens: [...prev.screens, createEmptyScreen(prev.screens.length)],
    }));
  }, []);

  const removeScreen = useCallback((index: number) => {
    setState((prev) => {
      if (prev.screens.length <= 1) return prev;
      const screens = prev.screens.filter((_, i) => i !== index);
      return { ...prev, screens };
    });
    setActiveScreenIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // ─── Screen Selections ────────────────────────────────────────────
  const updateSelection = useCallback(
    (screenIndex: number, key: keyof ScreenSelections, value: string) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        const selections = { ...screen.selections, [key]: value };

        // Cascade resets
        if (key === "screenType") {
          selections.series = "";
          selections.screenColor = "";
          selections.vinylWindowConfig = "";
          selections.vinylOrientation = "";
          selections.windowBorderMaterial = "";
          selections.windowBorderSeries = "";
          selections.windowBorderColor = "";
        }
        if (key === "series") selections.screenColor = "";
        if (key === "frameColorCollection") selections.frameColor = "";
        if (key === "motorType") selections.remoteOption = "";
        if (key === "installMount" && value !== "Face-mount") selections.faceMountSides = "";
        if (key === "windowBorderMaterial") {
          selections.windowBorderSeries = "";
          selections.windowBorderColor = "";
        }
        if (key === "windowBorderSeries") selections.windowBorderColor = "";

        screen.selections = selections;
        // Recalculate if mount changed (affects extended hood)
        if (key === "installMount") {
          const calcs = calculateScreen(
            screen.measurements,
            prev.manufacturer,
            selections.installMount,
            screen.reversedMeasurements
          );
          screen.calculations = calcs;
        }
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── Measurements ─────────────────────────────────────────────────
  const updateMeasurement = useCallback(
    (screenIndex: number, point: MeasurementPoint, value: number | null) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        screen.measurements = { ...screen.measurements, [point]: value };
        screen.calculations = calculateScreen(
          screen.measurements,
          prev.manufacturer,
          screen.selections.installMount,
          screen.reversedMeasurements
        );
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── Reverse Measurements ─────────────────────────────────────────
  const toggleReverseMeasurements = useCallback((screenIndex: number) => {
    setState((prev) => {
      const screens = [...prev.screens];
      const screen = { ...screens[screenIndex] };
      screen.reversedMeasurements = !screen.reversedMeasurements;
      screen.calculations = calculateScreen(
        screen.measurements,
        prev.manufacturer,
        screen.selections.installMount,
        screen.reversedMeasurements
      );
      screens[screenIndex] = screen;
      return { ...prev, screens };
    });
  }, []);

  // ─── Screen Fields ────────────────────────────────────────────────
  const updateScreenField = useCallback(
    <K extends keyof ScreenConfig>(screenIndex: number, field: K, value: ScreenConfig[K]) => {
      setState((prev) => {
        const screens = [...prev.screens];
        screens[screenIndex] = { ...screens[screenIndex], [field]: value };
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── All Same Toggle ──────────────────────────────────────────────
  const setAllSame = useCallback((allSame: boolean) => {
    setState((prev) => ({ ...prev, allSame }));
  }, []);

  // ─── U-Channel Apply to All ───────────────────────────────────────
  const setApplyUChannelToAll = useCallback((apply: boolean) => {
    setState((prev) => ({ ...prev, applyUChannelToAll: apply }));
  }, []);

  // ─── Recalculate All ──────────────────────────────────────────────
  const recalculateAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screens: prev.screens.map((s) => ({
        ...s,
        calculations: calculateScreen(
          s.measurements,
          prev.manufacturer,
          s.selections.installMount,
          s.reversedMeasurements
        ),
      })),
    }));
  }, []);

  // ─── Reset ────────────────────────────────────────────────────────
  const resetOrder = useCallback(() => {
    setState(createInitialState());
    setActiveScreenIndex(0);
  }, []);

  // ─── Active Screen ────────────────────────────────────────────────
  const activeScreen = useMemo(
    () => state.screens[activeScreenIndex] ?? state.screens[0],
    [state.screens, activeScreenIndex]
  );

  // ─── Validation ───────────────────────────────────────────────────
  const isProjectValid = useMemo(() => {
    const p = state.project;
    return p.name.trim().length > 0 && p.submitterName.trim().length > 0;
  }, [state.project]);

  // ─── Any U-Channel Required ───────────────────────────────────────
  const anyUChannelRequired = useMemo(() => {
    return state.screens.some((s) => s.calculations?.uChannelNeeded);
  }, [state.screens]);

  // ─── Flags & Warnings ─────────────────────────────────────────────
  const getScreenWarnings = useCallback((screen: ScreenConfig): string[] => {
    const warnings: string[] = [];
    const c = screen.calculations;
    if (!c) return warnings;

    if (c.leftSideMismatch) {
      warnings.push("Left side check mismatch: UL + LL ≠ OL (difference > 1/8\")");
    }
    if (c.rightSideMismatch) {
      warnings.push("Right side check mismatch: UR + LR ≠ OR (difference > 1/8\")");
    }
    if (c.buildOutType === "FLAG") {
      warnings.push("Build-out FLAG: Slope exceeds 1 3/4\" — requires engineering review");
    }
    if (screen.selections.installMount === "Face-mount" && !screen.selections.faceMountSides) {
      warnings.push("Face-mount selected but # of Sides not specified");
    }
    return warnings;
  }, []);

  return {
    state,
    activeScreenIndex,
    activeScreen,
    setActiveScreenIndex,
    updateProject,
    setManufacturer,
    setScreenCount,
    addScreen,
    removeScreen,
    updateSelection,
    updateMeasurement,
    toggleReverseMeasurements,
    updateScreenField,
    setAllSame,
    setApplyUChannelToAll,
    recalculateAll,
    resetOrder,
    isProjectValid,
    anyUChannelRequired,
    getScreenWarnings,
  };
}
