import { User, Admin, CurrentUser, AppConfig } from '../types';
import { db, auth } from './firebase';
import { ref, get, set, remove, child, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";

const ADMIN_USER = "staradmin";
const ADMIN_PASS = "Star12341234";
const SESSION_KEY = "ff_bot_session";
const CONFIG_KEY = "ff_bot_config";

// --- Helper: Ensure Auth ---
// We attempt to sign in, but if it fails (e.g. provider disabled), we proceed anyway
// because the database rules are likely public.
const ensureAuth = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn("Anonymous auth failed (proceeding as guest):", error);
    }
  }
};

const handleFirebaseError = (error: any) => {
  console.error("Firebase Error:", error);
  // Only alert if it's genuinely a permission issue preventing access
  if (error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
     alert("⚠️ FIREBASE CONNECTION ERROR ⚠️\n\nThe app cannot connect to the database.\n\n1. Check your internet.\n2. In Firebase Console > Realtime Database > Rules, ensure they are:\n\n{\n  \"rules\": {\n    \".read\": true,\n    \".write\": true\n  }\n}");
  }
  // Don't throw, return empty/false to prevent app crash
  return null;
};

// --- App Config Logic ---
export const getAppConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : { contactLink: '#' };
  } catch (e) {
    return { contactLink: '#' };
  }
};

export const saveAppConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

// --- User Logic (Firebase) ---

// Helper to sanitize username for Firebase paths (remove illegal chars)
const sanitize = (username: string) => username.replace(/[.#$/[\]]/g, "_");

export const fetchUsers = async (): Promise<User[]> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data);
    } else {
      return [];
    }
  } catch (error) {
    handleFirebaseError(error);
    return [];
  }
};

export const login = async (username: string, password: string): Promise<{ success: boolean; user?: CurrentUser; message?: string }> => {
  // Check Admin (Hardcoded)
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const admin: Admin = { username, role: 'admin' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }

  await ensureAuth();

  // Check Users in Firebase
  try {
    const dbRef = ref(db);
    const sanitizedName = sanitize(username);
    const snapshot = await get(child(dbRef, `users/${sanitizedName}`));

    if (snapshot.exists()) {
      const user = snapshot.val() as User;
      
      if (user.password === password) {
        // Check Expiry
        if (Date.now() > user.expiryDate) {
           return { success: false, message: "Account Expired. Contact Admin." };
        }
        
        // Save session locally for persistence on refresh
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return { success: true, user };
      } else {
        return { success: false, message: "Invalid credentials" };
      }
    } else {
      return { success: false, message: "User not found" };
    }
  } catch (error) {
    console.error("Login DB error", error);
    // If handleFirebaseError returns null/void, we construct a message
    const errMsg = (error as any).code === 'PERMISSION_DENIED' ? "Database Locked (Check Rules)" : "Connection failed";
    return { success: false, message: errMsg };
  }
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): CurrentUser | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const user = JSON.parse(session);
    
    // Re-check expiry if it's a regular user
    if (user.role === 'user' && Date.now() > (user as User).expiryDate) {
      logout();
      return null;
    }
    return user;
  } catch (e) {
    logout();
    return null;
  }
};

// Admin Functions (Async)
export const createUser = async (user: User) => {
  await ensureAuth();
  try {
      const sanitizedName = sanitize(user.username);
      const userRef = ref(db, 'users/' + sanitizedName);
      
      // Check existence first
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
          throw new Error("Username already exists");
      }

      await set(userRef, user);
  } catch (error) {
      handleFirebaseError(error);
      throw error; // Re-throw for UI to show error
  }
};

export const deleteUser = async (username: string) => {
  await ensureAuth();
  try {
      const sanitizedName = sanitize(username);
      await remove(ref(db, 'users/' + sanitizedName));
  } catch (error) {
      handleFirebaseError(error);
  }
};

// For restoring backup
export const restoreUsers = async (users: User[]) => {
    await ensureAuth();
    try {
        const updates: any = {};
        users.forEach(user => {
            const sanitizedName = sanitize(user.username);
            updates['users/' + sanitizedName] = user;
        });
        await update(ref(db), updates);
    } catch (error) {
        handleFirebaseError(error);
    }
};