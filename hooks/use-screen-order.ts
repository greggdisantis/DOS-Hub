/**
 * Screen Ordering Module — State Management Hook
 */
import { useState, useCallback, useMemo } from "react";
import {
  type ScreenManufacturer,
  type OrderState,
  type ScreenConfig,
  type ScreenSelections,
  type ScreenMeasurements,
  type MeasurementPoint,
  type ProjectInfo,
  createEmptyScreen,
  calculateScreen,
} from "@/lib/screen-ordering";

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
  };
}

export function useScreenOrder() {
  const [state, setState] = useState<OrderState>(createInitialState);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);

  // ─── Project Info ───────────────────────────────────────────────────
  const updateProject = useCallback((updates: Partial<ProjectInfo>) => {
    setState((prev) => ({
      ...prev,
      project: { ...prev.project, ...updates },
    }));
  }, []);

  // ─── Manufacturer ───────────────────────────────────────────────────
  const setManufacturer = useCallback((manufacturer: ScreenManufacturer) => {
    setState((prev) => ({
      ...prev,
      manufacturer,
      // Reset screen selections when manufacturer changes
      screens: prev.screens.map((s) => ({
        ...s,
        selections: {
          ...s.selections,
          screenType: "", series: "", screenColor: "",
          frameColorCollection: "", frameColor: "",
          motorType: "", remoteOption: "",
        },
        calculations: null,
      })),
    }));
  }, []);

  // ─── Screen Management ─────────────────────────────────────────────
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

  // ─── Screen Selections ─────────────────────────────────────────────
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
        if (key === "series") {
          selections.screenColor = "";
        }
        if (key === "frameColorCollection") {
          selections.frameColor = "";
        }
        if (key === "motorType") {
          selections.remoteOption = "";
        }
        if (key === "installMount") {
          if (value !== "Face-mount") {
            selections.faceMountSides = "";
          }
        }
        if (key === "windowBorderMaterial") {
          selections.windowBorderSeries = "";
          selections.windowBorderColor = "";
        }
        if (key === "windowBorderSeries") {
          selections.windowBorderColor = "";
        }

        screen.selections = selections;
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── Measurements ──────────────────────────────────────────────────
  const updateMeasurement = useCallback(
    (screenIndex: number, point: MeasurementPoint, value: number | null) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        screen.measurements = { ...screen.measurements, [point]: value };
        // Recalculate
        screen.calculations = calculateScreen(screen.measurements, prev.manufacturer);
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── Description & Instructions ────────────────────────────────────
  const updateScreenField = useCallback(
    (screenIndex: number, field: "description" | "specialInstructions", value: string) => {
      setState((prev) => {
        const screens = [...prev.screens];
        screens[screenIndex] = { ...screens[screenIndex], [field]: value };
        return { ...prev, screens };
      });
    },
    []
  );

  // ─── Recalculate All ───────────────────────────────────────────────
  const recalculateAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screens: prev.screens.map((s) => ({
        ...s,
        calculations: calculateScreen(s.measurements, prev.manufacturer),
      })),
    }));
  }, []);

  // ─── Reset ─────────────────────────────────────────────────────────
  const resetOrder = useCallback(() => {
    setState(createInitialState());
    setActiveScreenIndex(0);
  }, []);

  // ─── Active Screen ─────────────────────────────────────────────────
  const activeScreen = useMemo(
    () => state.screens[activeScreenIndex] ?? state.screens[0],
    [state.screens, activeScreenIndex]
  );

  // ─── Validation ────────────────────────────────────────────────────
  const isProjectValid = useMemo(() => {
    const p = state.project;
    return p.name.trim().length > 0 && p.submitterName.trim().length > 0;
  }, [state.project]);

  const isScreenValid = useCallback((screen: ScreenConfig) => {
    const s = screen.selections;
    const m = screen.measurements;
    return (
      s.screenType !== "" &&
      s.screenColor !== "" &&
      s.frameColor !== "" &&
      s.motorType !== "" &&
      s.installMount !== "" &&
      s.motorSide !== "" &&
      m.upperLeft != null &&
      m.upperRight != null &&
      m.top != null &&
      m.bottom != null
    );
  }, []);

  const isOrderComplete = useMemo(() => {
    return isProjectValid && state.screens.every(isScreenValid);
  }, [isProjectValid, state.screens, isScreenValid]);

  return {
    state,
    activeScreenIndex,
    activeScreen,
    setActiveScreenIndex,
    updateProject,
    setManufacturer,
    addScreen,
    removeScreen,
    updateSelection,
    updateMeasurement,
    updateScreenField,
    recalculateAll,
    resetOrder,
    isProjectValid,
    isScreenValid,
    isOrderComplete,
  };
}
