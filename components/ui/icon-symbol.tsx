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
  "shippingbox.fill": "inventory",
  "shield.fill": "admin-panel-settings",
  "bolt.fill": "bolt",
  "photo.fill": "photo",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "arrow.up.arrow.down": "swap-vert",
  "ruler.fill": "straighten",
  "paintbrush.fill": "brush",
  "square.and.arrow.up": "share",
  "trash.fill": "delete",
  "pencil": "edit",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "xmark": "close",
  "photo.on.rectangle": "add-photo-alternate",
  "clock.fill": "schedule",
  "person.3.fill": "groups",
  "arrow.clockwise": "refresh",
  "tray.full.fill": "inbox",
  "checkmark.seal.fill": "verified",
  // User management icons
  "checkmark": "check",
  "list.bullet": "list",
  "lock.fill": "lock",
  "person.fill": "person",
  "person.2.fill": "people",
  // Receipt capture icons
  "doc.badge.plus": "note-add",
  "arrow.up.tray": "upload",
  "arrow.down.tray": "download",
  "doc.text.magnifyingglass": "find-in-page",
  "line.3.horizontal.decrease.circle": "filter-list",
  "calendar": "calendar-today",
  "dollarsign.circle.fill": "attach-money",
  "chart.pie.fill": "pie-chart",
  "arrow.left": "arrow-back",
  "arrow.uturn.left": "undo",
  "archivebox.fill": "inventory",
  "chevron.left": "chevron-left",
  "plus": "add",
  "eye.fill": "visibility",
  "safari.fill": "open-in-browser",
  "arrow.down": "download",
  "arrow.down.doc.fill": "picture-as-pdf",
  "chart.line.uptrend.xyaxis": "trending-up",
  "folder.badge.plus": "create-new-folder",
  "checklist": "checklist",
} as unknown as IconMapping;

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
