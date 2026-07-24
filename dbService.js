// Smart Hybrid DB Client Service: Cloud API (Neon + Vercel) + Local DB Fallback

const STORAGE_USERS_KEY = "attendance_ledger_users_v2";
const STORAGE_CURRENT_USER_KEY = "attendance_ledger_current_user_v2";

export const localStorageDb = {
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("Local DB save failed:", e);
    }
  }
};

// Unified DB Service
export const dbService = {
  // Login Handler (Tries Cloud API first, falls back to Local DB)
  login: async (rollNo, pin) => {
    const formattedRoll = rollNo.trim().toUpperCase();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', rollNo: formattedRoll, pin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorageDb.set(STORAGE_CURRENT_USER_KEY, data.user);
          return { success: true, user: data.user, isCloud: true };
        }
      }
    } catch (e) {
      // Cloud API unreachable -> Use Local DB
    }

    // Local DB Fallback
    const users = localStorageDb.get(STORAGE_USERS_KEY) || {};
    const userRecord = users[formattedRoll];
    if (!userRecord || userRecord.profile.pin !== pin) {
      return { success: false, error: "Invalid Roll Number or PIN." };
    }

    localStorageDb.set(STORAGE_CURRENT_USER_KEY, userRecord.profile);
    return { success: true, user: userRecord.profile, isCloud: false };
  },

  // Signup Handler (Tries Cloud API first, falls back to Local DB)
  signup: async (userObj) => {
    const formattedRoll = userObj.rollNo.trim().toUpperCase();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', ...userObj, rollNo: formattedRoll })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorageDb.set(STORAGE_CURRENT_USER_KEY, data.user);
          return { success: true, user: data.user, isCloud: true };
        }
      } else {
        const errData = await res.json();
        if (errData.error && res.status !== 503) {
          return { success: false, error: errData.error };
        }
      }
    } catch (e) {
      // Cloud API unreachable -> Fallback
    }

    // Local DB Fallback
    const users = localStorageDb.get(STORAGE_USERS_KEY) || {};
    if (users[formattedRoll]) {
      return { success: false, error: "An account with this Roll Number already exists." };
    }

    const newUser = { ...userObj, rollNo: formattedRoll };
    users[formattedRoll] = {
      profile: newUser,
      calendar: null,
      attendance: {},
      subjects: [],
      targetThreshold: newUser.targetThreshold || 75
    };

    localStorageDb.set(STORAGE_USERS_KEY, users);
    localStorageDb.set(STORAGE_CURRENT_USER_KEY, newUser);
    return { success: true, user: newUser, isCloud: false };
  },

  // Update Profile Handler (Name, Email, College, Branch, PIN)
  updateProfile: async (rollNo, profilePayload) => {
    const formattedRoll = rollNo.trim().toUpperCase();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateProfile', rollNo: formattedRoll, ...profilePayload })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          // Update cached current user (without exposing pin)
          const cached = localStorageDb.get(STORAGE_CURRENT_USER_KEY) || {};
          const merged = { ...cached, ...data.user };
          localStorageDb.set(STORAGE_CURRENT_USER_KEY, merged);
          return { success: true, user: merged, isCloud: true };
        }
        return { success: false, error: data.error || 'Update failed.' };
      }
    } catch (e) {
      // Cloud API fallback
    }

    // Local DB Fallback update
    const users = localStorageDb.get(STORAGE_USERS_KEY) || {};
    if (!users[formattedRoll]) {
      return { success: false, error: "User not found in local storage." };
    }

    // Build updated profile (keep old pin if new one is empty)
    const oldProfile = users[formattedRoll].profile || {};
    const updatedProfile = {
      ...oldProfile,
      name: profilePayload.name || oldProfile.name,
      email: profilePayload.email !== undefined ? profilePayload.email : oldProfile.email,
      collegeName: profilePayload.collegeName || oldProfile.collegeName,
      program: profilePayload.program || oldProfile.program,
      // Only update pin if a new non-empty pin was provided
      pin: profilePayload.pin ? profilePayload.pin : oldProfile.pin,
    };

    users[formattedRoll].profile = updatedProfile;
    localStorageDb.set(STORAGE_USERS_KEY, users);

    // Store current user WITHOUT exposing pin in the session
    const { pin: _pin, ...profileWithoutPin } = updatedProfile;
    localStorageDb.set(STORAGE_CURRENT_USER_KEY, profileWithoutPin);
    return { success: true, user: profileWithoutPin, isCloud: false };
  },

  // Admin Service: Get all registered users
  getAllUsers: async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAllUsers' })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.users) {
          return { users: result.users, source: 'cloud' };
        }
      }
      // DB might be connected but returned error
      const errData = await res.json().catch(() => ({}));
      if (errData.error && res.status === 503) {
        return { users: [], source: 'no_db', error: errData.error };
      }
    } catch (e) {
      // Network error or API not available
    }

    // Local DB Fallback: return array of stored users from THIS browser only
    const usersObj = localStorageDb.get(STORAGE_USERS_KEY) || {};
    const localUsers = Object.keys(usersObj).map(rollNo => {
      const u = usersObj[rollNo];
      return {
        roll_no: rollNo,
        name: u.profile?.name || rollNo,
        email: u.profile?.email || '',
        college_name: u.profile?.collegeName || '',
        program: u.profile?.program || '',
        target_threshold: u.targetThreshold || 75,
        attendance_json: u.attendance || {},
        created_at: new Date().toISOString()
      };
    });
    return { users: localUsers, source: 'local' };
  },

  // Fetch User Data (Tries Cloud API first, falls back to Local DB)
  getUserData: async (rollNo) => {
    if (!rollNo) return null;
    const formattedRoll = rollNo.trim().toUpperCase();
    try {
      const res = await fetch(`/api/sync?rollNo=${encodeURIComponent(formattedRoll)}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          return {
            calendar: typeof result.data.calendar_json === 'string' ? JSON.parse(result.data.calendar_json) : result.data.calendar_json,
            attendance: typeof result.data.attendance_json === 'string' ? JSON.parse(result.data.attendance_json) : result.data.attendance_json,
            subjects: typeof result.data.subjects_json === 'string' ? JSON.parse(result.data.subjects_json) : result.data.subjects_json,
            targetThreshold: result.data.target_threshold,
            isCloud: true
          };
        }
      }
    } catch (e) {
      // Cloud API unreachable -> Use Local DB
    }

    // Local DB Fallback
    const users = localStorageDb.get(STORAGE_USERS_KEY) || {};
    const userData = users[formattedRoll];
    if (userData) {
      return {
        calendar: userData.calendar,
        attendance: userData.attendance,
        subjects: userData.subjects,
        customHolidays: userData.customHolidays || [],
        targetThreshold: userData.targetThreshold,
        isCloud: false
      };
    }
    return null;
  },

  // Save User Data (Saves to both Cloud API & Local DB for maximum resilience)
  saveUserData: async (rollNo, dataPayload) => {
    const formattedRoll = rollNo.trim().toUpperCase();
    
    // Save to Local DB always
    const users = localStorageDb.get(STORAGE_USERS_KEY) || {};
    users[formattedRoll] = {
      ...users[formattedRoll],
      ...dataPayload
    };
    localStorageDb.set(STORAGE_USERS_KEY, users);

    // Try Sync to Cloud API in background if online
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo: formattedRoll, ...dataPayload })
      });
    } catch (e) {
      // Silent catch for offline local development
    }
  }
};
