# DOS Hub Mobile App — Design Rules & Conventions

This document captures all design decisions, coding conventions, and requirements for the DOS Hub app. **Any changes to the app must follow these rules.** New team members and AI agents should read this first.

---

## Core Principle: Non-Destructive Updates

**Never disturb working parts of the app unless absolutely necessary.** When adding features or fixing bugs:
1. Make changes in isolation (new files, new components, new routes)
2. Only modify existing code if the feature requires it
3. Always test the full app after changes to ensure no regressions
4. If a working feature breaks, roll back immediately and find an alternative approach

---

## Design System

### Mobile-First Orientation
- **Target:** Portrait orientation (9:16 aspect ratio)
- **Usage pattern:** One-handed operation
- **Safe area:** Use `ScreenContainer` component on all screens to handle notch, status bar, and tab bar
- **Never:** Assume landscape mode or two-handed usage

### Color Palette
| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | `#0a7ea4` | `#0a7ea4` | Buttons, links, active states |
| `background` | `#ffffff` | `#151718` | Screen backgrounds |
| `surface` | `#f5f5f5` | `#1e2022` | Cards, elevated surfaces |
| `foreground` | `#11181C` | `#ECEDEE` | Primary text |
| `muted` | `#687076` | `#9BA1A6` | Secondary text, hints |
| `border` | `#E5E7EB` | `#334155` | Dividers, borders |
| `success` | `#22C55E` | `#4ADE80` | Success states |
| `warning` | `#F59E0B` | `#FBBF24` | Warning states |
| `error` | `#EF4444` | `#F87171` | Error states, destructive actions |

**Dark mode:** Use color tokens directly (e.g., `text-foreground`, `bg-background`). No `dark:` prefix needed — ThemeProvider handles switching automatically.

### Typography
- **Headings:** `fontWeight: "700"` (bold)
- **Body text:** `fontWeight: "400"` (normal)
- **Emphasis:** `fontWeight: "600"` (semibold)
- **Line height:** Always ≥ 1.2× font size to prevent text clipping

### Spacing
- **Padding:** 4px, 8px, 12px, 16px, 24px (multiples of 4)
- **Gaps:** Use consistent spacing in flex layouts
- **Screen padding:** 16px horizontal, 12px vertical minimum

---

## Component Patterns

### ScreenContainer (Required for All Screens)
```tsx
import { ScreenContainer } from "@/components/screen-container";

export default function MyScreen() {
  return (
    <ScreenContainer className="p-4">
      {/* Content here */}
    </ScreenContainer>
  );
}
```

**Why:** Handles safe area, status bar, notch, and tab bar overlap automatically. Never use raw `View` as the root of a screen.

### Styling with NativeWind
- **Always use `className`** for styling (Tailwind CSS)
- **Never use inline `style` objects** unless absolutely necessary (e.g., dynamic colors)
- **Never use `className` on `Pressable`** — always use `style` prop for press feedback
- **Combine classes with `cn()` utility** for conditional styling:
  ```tsx
  import { cn } from "@/lib/utils";
  <View className={cn("p-4", isActive && "bg-primary")} />
  ```

### Lists
- **Always use `FlatList`** for scrollable lists
- **Never use `ScrollView` with `.map()`** — causes performance issues
- **Always provide `keyExtractor`** for proper rendering

### Forms
- **Use `returnKeyType="done"`** on text inputs that submit
- **Handle `onSubmitEditing`** to submit on keyboard "Done" button
- **Validate on blur** (not on every keystroke)
- **Show loading state** during submission

### Buttons & Press Feedback
| Element | Feedback | Implementation |
|---|---|---|
| Primary buttons | Scale 0.97 + haptic | `style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}` |
| List items / cards | Opacity 0.7 | `activeOpacity={0.7}` |
| Icons / minor actions | Opacity 0.6 | `activeOpacity={0.6}` |

**Haptics:** Use sparingly (overuse diminishes impact)
- Button tap: `impactAsync(ImpactFeedbackStyle.Light)`
- Toggle: `impactAsync(ImpactFeedbackStyle.Medium)`
- Success: `notificationAsync(NotificationFeedbackType.Success)`
- Error: `notificationAsync(NotificationFeedbackType.Error)`

---

## Navigation & Routing

### Tab Structure
The app uses Expo Router with tab-based navigation:
```
app/(tabs)/
  _layout.tsx          ← Tab bar config
  index.tsx            ← Home screen
  modules/
    dashboard.tsx      ← Dashboard module picker
    precon/
      index.tsx        ← Preconstruction list
      detail.tsx       ← Preconstruction form
    [other modules]/
```

### Deep Links
- **Format:** `manus{timestamp}://path/to/screen?param=value`
- **Example:** `manus20240115103045://dashboard?module=precon`
- **Usage:** Use `router.push()` for navigation, not `Linking.openURL()`

### Module Navigation
The Dashboard uses a module picker pattern. To add a new module:
1. Create `app/modules/{module-name}.tsx` component
2. Add to `DASHBOARD_MODULES` array in `app/modules/dashboard.tsx`
3. Handle the module case in the dashboard's switch statement

---

## Data Management

### State Management
- **Local state:** `useState` + `useReducer` for simple component state
- **Shared state:** React Context (already set up in `app/_layout.tsx`)
- **Persistence:** `AsyncStorage` for local data (no backend sync needed unless user explicitly requires it)
- **Server data:** TanStack Query (`useQuery`, `useMutation`) for API calls

### API Calls
- **Use tRPC client:** `api.{router}.{procedure}.query()` or `.mutate()`
- **Handle loading/error states:** Always show loading spinner, error message, or retry button
- **Validate end-to-end:** API → data transform → navigation params → UI render

### Database (Server-Side)
- **Schema:** `drizzle/schema.ts` (Drizzle ORM)
- **Functions:** `server/db.ts` (database queries)
- **Routes:** `server/routers.ts` (tRPC endpoints)
- **Migrations:** `drizzle/migrations/` (auto-generated by `pnpm db:push`)

---

## Preconstruction Checklist Module

### Dashboard Features (Required)
- ✅ Filter by status (All, Draft, Completed, Signed)
- ✅ Filter by supervisor name
- ✅ Search by project, supervisor, address
- ✅ PDF export button on each card (no need to open form)
- ✅ Archive button (managers/admins only) with confirmation
- ✅ Unarchive button in archived view
- ✅ Delete button with confirmation modal
- ✅ "New Checklist" button in header

### Form Features (Required)
- ✅ "Mark Complete" button at top of form (always visible)
- ✅ "Go to Dashboard" button that navigates to Precon Dashboard tab
- ✅ Status display (Draft, Completed, Signed)
- ✅ Supervisor name
- ✅ Project address
- ✅ Multiple sections with checkboxes

### Database Fields
```
id, userId, companyId, createdAt, updatedAt
projectName, address, supervisorName, supervisorId
status (draft, completed, signed)
archived, archivedAt, archivedByName
[form section data...]
```

### Permissions
- **View:** All authenticated users
- **Create:** Supervisors and above
- **Edit:** Creator or managers/admins
- **Archive/Delete:** Managers/admins only
- **PDF export:** All authenticated users

---

## Authentication & User Management

### OAuth Flow
- **Portal URL:** `https://manus.im/app-auth` (publicly accessible)
- **Callback scheme:** `manus{timestamp}://oauth/callback`
- **Token storage:** `expo-secure-store` (encrypted device keychain)
- **Session:** Persisted across app restarts

### User Roles
| Role | Permissions |
|---|---|
| Admin | Full access, can manage users, archive/delete any checklist |
| Manager | Can create/edit checklists, archive/delete, view all |
| Supervisor | Can create/edit own checklists, view assigned |
| Employee | View-only access |

---

## Performance & Best Practices

### Lists
- Use `FlatList` with `keyExtractor`
- Implement `getItemLayout` for large lists
- Use `removeClippedSubviews={true}` for performance

### Images
- Use `expo-image` component (built-in caching)
- Always provide `placeholder` prop
- Optimize image sizes before upload

### Animations
- Keep animations subtle (80-300ms duration)
- Use `withTiming` instead of `withSpring` for interactions
- Scale changes: 0.95-0.98 range (never below 0.9)
- Only animate after core functionality is complete

### Network
- Implement retry logic for failed API calls
- Show loading spinner during async operations
- Validate data before rendering (no mock/placeholder values)

---

## Testing

### Unit Tests
- Location: `*.test.ts` files
- Runner: Vitest
- Command: `pnpm test`
- Coverage: Core business logic, data transforms, utility functions

### Manual Testing Checklist
Before each checkpoint:
- [ ] All buttons work end-to-end
- [ ] No console errors on iOS, Android, web
- [ ] Forms submit and save correctly
- [ ] Navigation flows complete without dead ends
- [ ] Dark mode works correctly
- [ ] Safe area handled properly (no content under notch/tab bar)

---

## File Organization

```
app/                          ← Expo Router app directory
  (tabs)/                     ← Tab-based screens
    index.tsx                 ← Home screen
    modules/                  ← Module screens
      precon/
        index.tsx             ← List
        detail.tsx            ← Form
  modules/                    ← Module picker components
    dashboard.tsx
    precon-dashboard.tsx
  oauth/
    callback.tsx              ← OAuth callback handler
  _layout.tsx                 ← Root layout with providers

components/                   ← Reusable components
  screen-container.tsx        ← SafeArea wrapper
  themed-view.tsx
  ui/
    icon-symbol.tsx           ← Icon mapping

hooks/                        ← Custom hooks
  use-auth.ts
  use-colors.ts
  use-color-scheme.ts

lib/                          ← Utilities
  utils.ts                    ← cn() helper
  trpc.ts                     ← tRPC client
  theme-provider.tsx

constants/                    ← App constants
  oauth.ts
  theme.ts

server/                       ← Backend (Node.js)
  _core/
    index.ts                  ← Server entry
    env.ts                    ← Environment config
    oauth.ts                  ← OAuth handler
  db.ts                       ← Database queries
  routers.ts                  ← tRPC routes

drizzle/                      ← Database schema & migrations
  schema.ts
  migrations/

assets/images/                ← App icons & splash
  icon.png
  splash-icon.png
  favicon.png
```

---

## Common Pitfalls to Avoid

| Pitfall | Solution |
|---|---|
| Content under notch/tab bar | Use `ScreenContainer` |
| Slow list scrolling | Use `FlatList`, never `ScrollView` with `.map()` |
| Pressable onClick not firing | Never use `className` on Pressable — use `style` |
| Text clipped at top/bottom | Ensure `lineHeight > fontSize` (1.2-1.5×) |
| State not persisting | Call `AsyncStorage.setItem()` after `setState()` |
| Stale TS errors in LSP | Run `tsc --noEmit` to verify actual errors |
| OAuth redirects to broken domain | Portal URL is `https://manus.im`, not `oauth.manus.im` |
| New users stuck on spinner | Check pending approval screen is shown after sign-in |

---

## Deployment & Publishing

### Development
- Dev server: `pnpm dev` (Metro bundler + backend server)
- Web preview: `https://8081-{session-id}.manus.computer`
- API: `https://3000-{session-id}.manus.computer`

### Production
- **Web:** Click Publish button in Manus UI → deployed to `doshubapp-kseayhgd.manus.space`
- **APK:** Click Publish → Build APK in the panel → installable Android app
- **iOS:** Requires Apple Developer account ($99/year) → TestFlight or App Store

### Before Publishing
- [ ] All tests passing (`pnpm test`)
- [ ] No console errors
- [ ] All user flows tested end-to-end
- [ ] Checkpoint created with descriptive message
- [ ] todo.md updated with completed items marked `[x]`

---

## Questions or Changes?

If you need to update these rules, edit this file and commit the change. All future work should reference the updated rules.

Last updated: March 4, 2026
