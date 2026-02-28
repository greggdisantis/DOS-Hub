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
  GlobalMaterialSelections,
  ScreenPhoto,
} from "@/lib/screen-ordering/types";
import { createEmptyScreen, createEmptySelections, createEmptyGlobalMaterial } from "@/lib/screen-ordering/types";
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
    globalMotorType: "",
    inputUnits: "Inches + 1/16\"",
    allSame: true,
    globalMaterial: createEmptyGlobalMaterial(),
    screens: [createEmptyScreen(0)],
    applyUChannelToAll: false,
  };
}

export function useScreenOrder() {
  const [state, setState] = useState<OrderState>(createInitialState);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);

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
      globalMotorType: "",
      globalMaterial: createEmptyGlobalMaterial(),
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

  // ─── Global Motor Type ────────────────────────────────────────────
  const setGlobalMotorType = useCallback((motorType: string) => {
    setState((prev) => ({
      ...prev,
      globalMotorType: motorType,
      // Reset remote on all screens when global motor type changes
      screens: prev.screens.map((s) => ({
        ...s,
        selections: { ...s.selections, remoteOption: "" },
      })),
    }));
  }, []);

  // ─── Input Units ──────────────────────────────────────────────────
  const setInputUnits = useCallback((units: string) => {
    setState((prev) => ({ ...prev, inputUnits: units }));
  }, []);

  // ─── All Same Toggle ──────────────────────────────────────────────
  const setAllSame = useCallback((allSame: boolean) => {
    setState((prev) => {
      if (allSame && !prev.allSame) {
        // Switching to allSame=true: copy first screen's material to global
        const first = prev.screens[0]?.selections;
        return {
          ...prev,
          allSame,
          globalMaterial: first ? {
            screenType: first.screenType,
            series: first.series,
            screenColor: first.screenColor,
            frameColorCollection: first.frameColorCollection,
            frameColor: first.frameColor,
            vinylWindowConfig: first.vinylWindowConfig,
            vinylOrientation: first.vinylOrientation,
          } : createEmptyGlobalMaterial(),
        };
      }
      if (!allSame && prev.allSame) {
        // Switching to allSame=false: copy global material to all screens
        return {
          ...prev,
          allSame,
          screens: prev.screens.map((s) => ({
            ...s,
            selections: {
              ...s.selections,
              screenType: prev.globalMaterial.screenType,
              series: prev.globalMaterial.series,
              screenColor: prev.globalMaterial.screenColor,
              frameColorCollection: prev.globalMaterial.frameColorCollection,
              frameColor: prev.globalMaterial.frameColor,
              vinylWindowConfig: prev.globalMaterial.vinylWindowConfig,
              vinylOrientation: prev.globalMaterial.vinylOrientation,
            },
          })),
        };
      }
      return { ...prev, allSame };
    });
  }, []);

  // ─── Global Material ──────────────────────────────────────────────
  const updateGlobalMaterial = useCallback(
    (key: keyof GlobalMaterialSelections, value: string) => {
      setState((prev) => {
        const gm = { ...prev.globalMaterial, [key]: value };
        // Cascade resets
        if (key === "screenType") {
          gm.series = "";
          gm.screenColor = "";
          gm.vinylWindowConfig = "";
          gm.vinylOrientation = "";
        }
        if (key === "series") gm.screenColor = "";
        if (key === "frameColorCollection") gm.frameColor = "";
        return { ...prev, globalMaterial: gm };
      });
    },
    []
  );

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

  // ─── Per-Screen Selections ────────────────────────────────────────
  const updateSelection = useCallback(
    (screenIndex: number, key: keyof ScreenSelections, value: string) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        const selections = { ...screen.selections, [key]: value };

        // Cascade resets for per-screen material fields
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
        if (key === "installMount" && value !== "Face-mount") selections.faceMountSides = "";
        if (key === "windowBorderMaterial") {
          selections.windowBorderSeries = "";
          selections.windowBorderColor = "";
        }
        if (key === "windowBorderSeries") selections.windowBorderColor = "";

        screen.selections = selections;
        // Recalculate if mount changed
        if (key === "installMount") {
          screen.calculations = calculateScreen(
            screen.measurements,
            prev.manufacturer,
            selections.installMount,
            screen.reversedMeasurements
          );
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

  // ─── Photo Management ─────────────────────────────────────────────
  const addPhotos = useCallback(
    (screenIndex: number, photos: ScreenPhoto[]) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        screen.photos = [...screen.photos, ...photos];
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

  const removePhoto = useCallback(
    (screenIndex: number, photoIndex: number) => {
      setState((prev) => {
        const screens = [...prev.screens];
        const screen = { ...screens[screenIndex] };
        screen.photos = screen.photos.filter((_, i) => i !== photoIndex);
        screens[screenIndex] = screen;
        return { ...prev, screens };
      });
    },
    []
  );

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

  // ─── Effective material for a screen (global or per-screen) ───────
  const getEffectiveMaterial = useCallback(
    (screen: ScreenConfig) => {
      if (state.allSame) {
        return state.globalMaterial;
      }
      return {
        screenType: screen.selections.screenType,
        series: screen.selections.series,
        screenColor: screen.selections.screenColor,
        frameColorCollection: screen.selections.frameColorCollection,
        frameColor: screen.selections.frameColor,
        vinylWindowConfig: screen.selections.vinylWindowConfig,
        vinylOrientation: screen.selections.vinylOrientation,
      };
    },
    [state.allSame, state.globalMaterial]
  );

  // ─── Validation ───────────────────────────────────────────────────
  const isProjectValid = useMemo(() => {
    const p = state.project;
    return p.name.trim().length > 0 && p.submitterName.trim().length > 0;
  }, [state.project]);

  const anyUChannelRequired = useMemo(() => {
    return state.screens.some((s) => s.calculations?.uChannelNeeded);
  }, [state.screens]);

  // ─── Flags & Warnings ─────────────────────────────────────────────
  const getScreenWarnings = useCallback((screen: ScreenConfig): string[] => {
    const warnings: string[] = [];
    const c = screen.calculations;
    if (!c) return warnings;

    if (c.leftSideMismatch) {
      warnings.push("Left side check: Upper Left (UL) + Lower Left (LL) must equal Overall Left (OL) within 1/8\". Please verify.");
    }
    if (c.rightSideMismatch) {
      warnings.push("Right side check: Upper Right (UR) + Lower Right (LR) must equal Overall Right (OR) within 1/8\". Please verify.");
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
    setGlobalMotorType,
    setInputUnits,
    setAllSame,
    updateGlobalMaterial,
    setScreenCount,
    addScreen,
    removeScreen,
    updateSelection,
    updateMeasurement,
    toggleReverseMeasurements,
    updateScreenField,
    setApplyUChannelToAll,
    recalculateAll,
    resetOrder,
    isProjectValid,
    anyUChannelRequired,
    getScreenWarnings,
    getEffectiveMaterial,
    addPhotos,
    removePhoto,
  };
}
