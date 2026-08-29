# Admin Approval Flow Implementation

## Overview

Both RuvoPartner and RuvoShop now implement a complete approval flow where users cannot access the dashboard until their registration is approved by an admin.

## Flow Diagram

### RuvoPartner (7 Steps)
```
Step 1: Basic Details → Step 2: Vehicle Type → Step 3: Aadhaar 
→ Step 4: Onboarding Fee → Step 5: Bank Account → Step 6: Shop Selection
→ Step 7: Approval Waiting (PENDING_APPROVAL status)
   ↓ [Polls every 10s for admin approval]
   └─→ MainTabs (Dashboard) when APPROVED
```

### RuvoShop (4 Steps)
```
Step 1: Shop Details → Step 2: Aadhaar → Step 3: Bank Account
→ Step 4: Approval Waiting (PENDING_APPROVAL status)
   ↓ [Polls every 10s for admin approval]
   └─→ MyShops (Dashboard) when APPROVED
```

## Implementation Details

### Status Progression

**RuvoPartner** (uses `verificationStatus: string`):
- `NEW` → User starts onboarding
- `PENDING_APPROVAL` → All steps completed, waiting for admin
- `APPROVED` → Admin approved, access to MainTabs
- `REJECTED` → Admin rejected, show rejection reason

**RuvoShop** (uses `onboardingStatus: OnboardingStatus`):
- `NEW` → User starts onboarding
- `AADHAAR_PENDING` → Waiting for Aadhaar step
- `BANK_PENDING` → Waiting for bank account step
- `PENDING_APPROVAL` → All steps completed, waiting for admin ✅
- `APPROVED` → Admin approved, access to MyShops
- `REJECTED` → Admin rejected, show rejection reason

### Key Components

#### RuvoPartner

**Files Updated:**
- `src/navigation/AppNavigator.tsx` - Added `PENDING_APPROVAL` conditional
- `src/screens/onboarding/Step7_Success.tsx` - Approval waiting screen with polling
- `src/screens/onboarding/Step6_ShopSelection.tsx` - Navigates to Step7 with status update

**Navigation Routes:**
```typescript
// When verificationStatus === 'PENDING_APPROVAL'
<Stack.Screen name="Step7_Success" component={Step7_Success} />
```

**Polling Logic (Step7_Success):**
- Polls `/api/partners/me` every 10 seconds
- Checks for `status === 'APPROVED'` or `approved === true`
- Auto-navigates to `MainTabs` when approved
- Shows interactive "Check Approval Status" button
- Displays progress checklist of completed steps

#### RuvoShop

**Files Updated:**
- `src/ShopNavigator.tsx` - Added `PENDING_APPROVAL` conditional
- `src/screens/onboarding/Step4_Success.tsx` - Approval waiting screen with polling
- `src/screens/onboarding/Step3_BankAccount.tsx` - Navigates to Step4 with status update
- `src/context/AuthContext.tsx` - Added `PENDING_APPROVAL` to OnboardingStatus type

**Navigation Routes:**
```typescript
// When onboardingStatus === 'PENDING_APPROVAL'
<Stack.Screen name="Step4_Success" component={Step4_Success} />
```

**Polling Logic (Step4_Success):**
- Polls `/api/shops/mine` every 10 seconds
- Checks for `status === 'APPROVED'` or `approved === true`
- Auto-navigates to `MyShops` when approved
- Shows interactive "Check Approval Status" button
- Displays progress checklist of completed steps

### Approval Screen Features

Both approval screens include:

1. **Status Visualization**
   - Pulsing circular icon (animated)
   - Color-coded based on status (pending=amber, approved=green, rejected=red)
   - Spinning timer icon during pending state

2. **Progress Checklist**
   - Shows all completed steps with checkmarks
   - Current step marked as "PENDING"
   - Visual indicator of workflow progression

3. **Auto-Polling**
   - Every 10 seconds checks `/api/partners/me` or `/api/shops/mine`
   - Automatic navigation when approved
   - User can click "Check Approval Status" to force refresh

4. **User-Friendly Messaging**
   - Clear explanation of waiting state
   - Estimated timeline (24 hours)
   - Note that they can close and revisit the screen
   - Support email for rejected applications

5. **Error Handling**
   - Silently ignores network errors (keeps polling)
   - Shows rejection reason if applicable
   - Allows manual refresh attempts

### API Endpoints

**RuvoPartner:**
- `GET /api/partners/me` - Returns partner object with `verificationStatus`
- Expected fields: `{ verificationStatus: 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL' }`

**RuvoShop:**
- `GET /api/shops/mine` - Returns array of shops or single shop with `status`
- Expected fields: `{ status: 'APPROVED' | 'REJECTED' }` or `{ approved: boolean }`

### State Persistence

Both apps persist onboarding status in AsyncStorage:

**RuvoPartner:**
- Key: `verificationStatus`
- On app restart, user resumes from saved status

**RuvoShop:**
- Key: `shopOnboardingStatus`
- On app restart, user resumes from saved status

## User Experience

### Scenario 1: User Completes Onboarding
1. User completes all steps (1-7 for Partner, 1-3 for Shop)
2. Status automatically set to `PENDING_APPROVAL`
3. Taken to approval waiting screen
4. Polling begins automatically
5. Screen displays: "Submitted — Under Review"
6. Optional message: "Our team reviews applications within 24 hours"

### Scenario 2: Admin Approves Within 24 Hours
1. Admin backend sets user status to `APPROVED`
2. Polling detects the change
3. Automatic navigation to dashboard (`MainTabs` for Partner, `MyShops` for Shop)
4. Success message shown: "Profile Approved! 🎉"

### Scenario 3: Admin Rejects Application
1. Admin backend sets user status to `REJECTED`
2. Polling detects the change
3. Screen updates to show rejection
4. Message includes: "Contact support@ruvo.in to appeal"
5. User cannot proceed without reapplying

### Scenario 4: User Closes App Mid-Polling
1. Status persisted in AsyncStorage as `PENDING_APPROVAL`
2. User reopens app
3. Navigator detects `PENDING_APPROVAL` status
4. Directly shows approval screen (not onboarding steps)
5. Polling resumes

## Testing Checklist

- [ ] Partner: Complete all 7 onboarding steps → reaches approval screen
- [ ] Partner: Approval screen polls `/api/partners/me` correctly
- [ ] Partner: Auto-navigates to MainTabs when approved
- [ ] Partner: Shows rejection message when rejected
- [ ] Partner: Can manually trigger status check
- [ ] Partner: Persists status on app restart

- [ ] Shop: Complete all 3 onboarding steps → reaches approval screen
- [ ] Shop: Approval screen polls `/api/shops/mine` correctly
- [ ] Shop: Auto-navigates to MyShops when approved
- [ ] Shop: Shows rejection message when rejected
- [ ] Shop: Can manually trigger status check
- [ ] Shop: Persists status on app restart

## Backend Requirements

Admin panel should allow setting:
- `/api/partners/{id}` - `PATCH` to update `verificationStatus`
- `/api/shops/{id}` - `PATCH` to update `status` or `approved` field

Endpoints must return updated user/shop object for verification.

## Future Enhancements

- [ ] Notification when application is approved/rejected (FCM)
- [ ] Email notification to user
- [ ] Approval reason/note displayed to admin
- [ ] Analytics on approval rate and time-to-approval
- [ ] Manual approval override with admin comments
- [ ] Appeal process for rejected applications
- [ ] Reapplication flow for rejected users
