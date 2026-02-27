// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings.
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "wrench.and.screwdriver.fill": "build",
  "folder.fill": "folder",
  "person.circle.fill": "account-circle",
  // Navigation
  "chevron.right": "chevron-right",
  "chevron.left.forwardslash.chevron.right": "code",
  // Module icons
  "camera.fill": "camera-alt",
  "map.fill": "map",
  "doc.text.fill": "description",
  "chart.bar.fill": "bar-chart",
  "link": "link",
  "rectangle.grid.2x2.fill": "grid-view",
  "magnifyingglass": "search",
  "bell.fill": "notifications",
  "gearshape.fill": "settings",
  "arrow.right.square.fill": "open-in-new",
  "paperplane.fill": "send",
  "receipt": "receipt",
  "building.2.fill": "business",
  "hammer.fill": "construction",
  "book.fill": "menu-book",
  "shield.fill": "admin-panel-settings",
  "bolt.fill": "bolt",
  "photo.fill": "photo",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
