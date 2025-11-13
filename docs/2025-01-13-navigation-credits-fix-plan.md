# Navigation & Credits UI Fix Plan
**Date**: 2025-01-13
**Goal**: Add unobtrusive credit balance, fix navigation layout, add 402 error handling

## Current Issues

### AppNavigation.tsx Layout Problems
- **Line 156**: `h-7` - Too cramped (1.75rem = 28px)
- **Line 155**: `px-1.5` - Insufficient horizontal padding
- **Line 167**: `gap-0.5` - Navigation buttons too close together
- **Line 192**: `space-x-0.5` - Auth section elements cramped
- **Line 200-204**: Theme toggle scaled down to 75%
- **Lines 194-197**: Empty credit balance block

### Credit Balance Issues
- Only shows for `isOAuthUser` (line 194)
- Device-only users cannot see their credits
- Empty implementation (no actual display)

### Error Handling Issues
- No 402 (Payment Required) error handling in queryClient.ts
- Users get generic error when out of credits
- No guidance to purchase more credits

## Implementation Plan

### 1. Create CreditBalance Component
**File**: `client/src/components/CreditBalance.tsx`

**Requirements**:
- UNOBTRUSIVE - small, simple text display
- Shows: "X credits" in muted text
- Clickable → navigates to /billing
- Works for ALL authenticated users (device + OAuth)
- Icon: Coins (lucide-react)
- Styling: text-xs, muted color, subtle hover effect

**Component structure**:
```tsx
import { Link } from "wouter";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function CreditBalance() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <Link href="/billing">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
        <Coins className="w-3 h-3 mr-1" />
        <span className="text-muted-foreground">
          {(user.credits ?? 0).toLocaleString()}
        </span>
      </Button>
    </Link>
  );
}
```

### 2. Fix AppNavigation Layout
**File**: `client/src/components/AppNavigation.tsx`

**Changes**:
- Line 154: Keep sticky header with backdrop blur
- Line 155: Change `px-1.5` → `px-4` (better horizontal padding)
- Line 156: Change `h-7` → `h-10` (more vertical breathing room)
- Line 167: Change `gap-0.5` → `gap-1.5` (better button spacing)
- Line 192: Change `space-x-0.5` → `space-x-2` (better auth section spacing)
- Line 200-204: Remove `scale-75` from theme toggle (let it be normal size)
- Lines 194-197: Replace empty block with `<CreditBalance />`

**Key principle**: Use consistent spacing (multiples of 4px: gap-1, gap-2, gap-3, etc.)

### 3. Update Credit Balance Display Logic
**File**: `client/src/components/AppNavigation.tsx`

**Change**:
```tsx
// OLD (line 194):
{isOAuthUser && user && (
  <div className="hidden lg:block">
  </div>
)}

// NEW:
{isAuthenticated && user && (
  <CreditBalance />
)}
```

This ensures ALL authenticated users see credits (not just OAuth).

### 4. Add 402 Error Handling
**File**: `client/src/lib/queryClient.ts`

**Changes**:
```typescript
// Add at top
import { toast } from "@/hooks/use-toast";

// Update throwIfResNotOk function (lines 4-9):
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle insufficient credits (402)
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}));
      toast({
        title: "Insufficient Credits",
        description: data.message || "You need more credits to continue.",
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/billing'}
          >
            Buy Credits
          </Button>
        ),
      });
      throw new Error('Insufficient credits');
    }

    // Generic error for other status codes
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}
```

### 5. Update UserMenu for Device Users
**File**: `client/src/components/UserMenu.tsx`

**Verification**: Confirm "Billing & Credits" link works for device users (line 103)
- Should already work since it's inside the UserMenu
- Need to ensure device users can access UserMenu OR add alternative billing access

## Files to Modify

1. ✅ Create: `client/src/components/CreditBalance.tsx`
2. ✅ Edit: `client/src/components/AppNavigation.tsx`
3. ✅ Edit: `client/src/lib/queryClient.ts`
4. ❓ Check: `client/src/components/UserMenu.tsx` (may need device user support)

## Testing Checklist

- [ ] Credit balance appears in navigation for OAuth users
- [ ] Credit balance appears in navigation for device-only users
- [ ] Clicking credit balance navigates to /billing
- [ ] Navigation has better spacing and alignment
- [ ] Navigation height is comfortable (not cramped)
- [ ] 402 errors show toast with "Buy Credits" button
- [ ] Clicking "Buy Credits" in toast navigates to /billing
- [ ] Mobile menu still works properly
- [ ] Theme toggle still works

## Edge Cases

1. **User with 0 credits**: Should show "0" (not hide)
2. **User not authenticated**: Component returns null (handled)
3. **Credits undefined/null**: Default to 0 (handled with `?? 0`)
4. **Large credit numbers**: Use `.toLocaleString()` for formatting (1,000)

## Success Criteria

✅ Unobtrusive credit display (not prominent)
✅ Visible to ALL authenticated users
✅ Clickable → /billing
✅ Navigation has better spacing/margins
✅ 402 errors handled with billing redirect
✅ No breaking changes to existing functionality
