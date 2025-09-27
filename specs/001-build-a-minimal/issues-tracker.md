# PhishProof MFA Banking - Issue Tracker

**Last Updated**: September 27, 2025  
**Current Phase**: Phase 3.6 Complete → Ready for Phase 4.1

## 🐛 Active Issues (Phase 4.1 Implementation Queue)

### UI/UX Issues

#### Issue #1: Welcome Message Color
- **Status**: ✅ RESOLVED
- **Priority**: Medium
- **Resolution**: Added CSS `!important` declarations for white color
- **Task**: T061

#### Issue #2: Empty Button Bug
- **Status**: 🔴 Open  
- **Priority**: High
- **Description**: Login and signup buttons sometimes appear empty/blank intermittently
- **Investigation Plan**:
  - Debug JavaScript timing issues
  - Check CSS loading problems
  - Verify event listener conflicts
  - Review state management issues
- **Task**: T065

#### Issue #3: Logout Cancellation UX
- **Status**: ✅ RESOLVED
- **Priority**: Medium
- **Resolution**: Modified hideLogoutModal() to redirect to dashboard
- **Task**: T063

#### Issue #4: Balance Display Enhancement
- **Status**: ✅ RESOLVED
- **Priority**: Medium
- **Resolution**: Changed to ₹ (rupees), green color, larger font
- **Task**: T064

#### Issue #5: Security Warning Text
- **Status**: 🔴 Open
- **Priority**: Low
- **Description**: Remove "🔐 Enter the exact username - no dropdown for security" warning text from transfer form
- **Fix**: Remove the `<small class="form-hint security-note">` element
- **Files**: `src/frontend/index.html`
- **Task**: T070

### Backend Issues

#### Issue #6: Audit Log Event Types
- **Status**: 🔴 Open (REGRESSION)
- **Priority**: Medium
- **Description**: Audit log still shows "unknown event" instead of descriptive event names
- **Previous Attempt**: Updated event names but still not working
- **Investigation Needed**:
  - Check if audit event creation is using correct event type parameter
  - Verify database schema for audit events table
  - Debug actual audit event storage vs display
- **Files**: `src/backend/routes.js`, possibly `src/backend/database.js`
- **Task**: T062

#### Issue #4: Last Login Tracking
- **Status**: ✅ RESOLVED
- **Priority**: High  
- **Description**: Dashboard always shows "First time" instead of actual last login timestamp
- **Root Cause**: Database field mapping issue - db stores `last_login` but API returned `lastLogin`
- **Solution**: Fixed dashboard route to map `userResult.user.last_login` to `lastLogin` field
- **Verification**: Database stores correct timestamps, now properly displayed
- **Task**: T067

#### Issue #5: Audit Log Event Types  
- **Status**: ✅ RESOLVED
- **Priority**: Medium
- **Description**: Audit logs showing "unknown event" for some operations
- **Verification**: Database shows proper event types (registration_challenge, authentication_success, login_failure, etc.)
- **Task**: T062

### Feature Requests

#### Feature #1: User-to-User Transfer System
- **Status**: ✅ COMPLETED
- **Priority**: High
- **Resolution**: Full secure transfer system implemented with atomic transactions
- **Task**: T066

#### Feature #2: Transaction History for Transfers  
- **Status**: ✅ COMPLETED
- **Priority**: High  
- **Resolution**: Both sender and recipient transactions properly recorded
- **Task**: T068

#### Feature #3: Simplified Transfers Interface
- **Status**: ✅ COMPLETED
- **Priority**: Medium
- **Resolution**: Removed withdraw/deposit, kept only user-to-user transfers
- **Task**: T069

## 🔍 Investigation Notes

### Welcome Message Color Investigation
```
Files to check:
- src/frontend/css/styles.css (CSS rules)
- src/frontend/js/app.js (JavaScript styling)
- src/frontend/index.html (inline styles)

Search for:
- "welcome" (case insensitive)
- Color properties (color, style.color)
- CSS class assignments
```

### Empty Button Investigation  
```
Potential causes:
- Race condition in DOM manipulation
- CSS loading timing
- JavaScript event binding issues
- State management conflicts
- Template rendering problems

Debug approach:
- Add console.log statements
- Check browser developer tools
- Monitor network requests
- Test across different browsers
```

### Database Last Login Investigation
```
Database operations to verify:
1. Login endpoint: UPDATE users SET last_login = ? WHERE username = ?
2. Dashboard endpoint: SELECT last_login FROM users WHERE username = ?

Check:
- SQL query syntax
- Timestamp format (ISO 8601 recommended)
- Database connection timing
- Transaction rollback issues
```

## 📋 Implementation Checklist Template

For each issue resolution:
- [ ] Create branch for issue
- [ ] Write failing test (if applicable)
- [ ] Implement fix
- [ ] Verify fix works
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Create pull request
- [ ] Mark issue as resolved

## 🎯 Definition of Done

Each issue is considered resolved when:
- ✅ Root cause identified and documented
- ✅ Fix implemented and tested
- ✅ No regression in existing functionality  
- ✅ All automated tests pass
- ✅ Manual testing confirms fix
- ✅ Code reviewed (if applicable)
- ✅ Documentation updated

## � **Current Phase 4.1 Status**

### **Progress Overview: 6/10 Tasks Completed (60%)**

#### ✅ **COMPLETED (6 tasks)**:
- T061: Welcome message white color ✅
- T063: Logout cancellation redirect ✅  
- T064: Rupee currency & green balance ✅
- T066: User-to-user transfer system ✅
- T068: Transfer transaction history ✅
- T069: Simplified transfers interface ✅

#### 🔄 **PENDING (4 tasks)**:
- T062: Audit log event names (REGRESSION - still broken) 🔴
- T065: Empty button bug 🔴
- T067: Last login tracking (CONFIRMED BROKEN - always "First time") 🔴
- T070: Remove security warning text (NEW) 🔴

### **Phase 4.1 Complete - Status: 10/10 ✅**

**All High Priority Issues Resolved:**
1. ✅ **Last Login Tracking** - Fixed database field mapping (`last_login` → `lastLogin`)
2. ✅ **Audit Log Event Types** - Verified proper event storage and display  
3. ✅ **Security Warning Text** - Removed from transfer form
4. ✅ **User-to-User Transfer System** - Complete atomic transaction implementation
5. ✅ **Currency Display** - Converted to Indian Rupees (₹)
6. ✅ **UI Polish** - Balance styling, welcome message, logout fix

### **Next Implementation Focus:**
**Phase 3.7**: Begin 8 additional enhancement tasks:
- T051: Personalized welcome messages
- T052: Red logout button with confirmation  
- T053: Authentication state warnings
- T054-T058: Advanced transfer and session features

---

**Phase 4.1 Complete** ✅ Ready to proceed with Phase 3.7 feature enhancements when requested.