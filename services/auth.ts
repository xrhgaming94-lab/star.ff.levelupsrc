
import { User, Admin, CurrentUser, AppConfig, Instance, LogEntry } from '../types';
import { db, auth } from './firebase';
import { ref, get, set, remove, child, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";

const ADMIN_USER = "staradmin";
const ADMIN_PASS = "Star12341234";
const SESSION_KEY = "star_app_session";

// --- Helper: Ensure Auth ---
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
  if (error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
     alert("⚠️ FIREBASE ERROR ⚠️\n\nThe app cannot perform this action. Check your database rules.");
  }
  return null;
};

// --- App Config Logic ---
export const fetchAppConfig = async (): Promise<AppConfig> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'system_config'));
    if (snapshot.exists()) {
      return snapshot.val() as AppConfig;
    } else {
      return { contactLink: '#', youtubeLink: '#', dashboardInstructions: '' };
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
    return { contactLink: '#', youtubeLink: '#', dashboardInstructions: '' };
  }
};

export const saveAppConfig = async (config: AppConfig) => {
  await ensureAuth();
  try {
    await set(ref(db, 'system_config'), config);
  } catch (error) {
    handleFirebaseError(error);
    throw error;
  }
};

// --- User Logic ---
export const sanitize = (username: string) => username.replace(/[.#$/[\]]/g, "_");

export const fetchUsers = async (): Promise<User[]> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // We iterate through entries to get the KEY (which is the sanitized username)
      return Object.entries(data).map(([key, value]: [string, any]) => {
          const userObj = value as User;
          return {
              ...userObj,
              // The 'key' is the source of truth for identification in DB
              username: key, 
              displayName: userObj.username || key,
              allowedBots: Array.isArray(userObj.allowedBots) ? userObj.allowedBots : (userObj.allowedBots && typeof userObj.allowedBots === 'object' ? Object.values(userObj.allowedBots) : []),
              instances: userObj.instances ? (Array.isArray(userObj.instances) ? userObj.instances : Object.values(userObj.instances)) : []
          };
      });
    } else {
      return [];
    }
  } catch (error) {
    handleFirebaseError(error);
    return [];
  }
};

export const login = async (username: string, password: string): Promise<{ success: boolean; user?: CurrentUser; message?: string }> => {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const admin: Admin = { username, role: 'admin' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }

  await ensureAuth();
  try {
    const dbRef = ref(db);
    const sanitizedName = sanitize(username);
    const snapshot = await get(child(dbRef, `users/${sanitizedName}`));

    if (snapshot.exists()) {
      const user = snapshot.val() as User;
      if (user.password === password) {
        if (Date.now() > user.expiryDate) {
           return { success: false, message: "Account Expired. Contact Admin." };
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return { success: true, user };
      } else {
        return { success: false, message: "Invalid credentials" };
      }
    } else {
      return { success: false, message: "User not found" };
    }
  } catch (error) {
    console.error("Login error", error);
    return { success: false, message: "Connection failed" };
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

export const createUser = async (user: User) => {
  await ensureAuth();
  try {
      const sanitizedName = sanitize(user.username);
      const userRef = ref(db, 'users/' + sanitizedName);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
          throw new Error("Username already exists in database");
      }
      await set(userRef, user);
  } catch (error) {
      handleFirebaseError(error);
      throw error;
  }
};

export const deleteUser = async (username: string) => {
  await ensureAuth();
  try {
      // Re-sanitize to be safe
      const sanitizedName = sanitize(username);
      const userRef = ref(db, `users/${sanitizedName}`);
      
      console.log(`[DB] Attempting to delete user node: users/${sanitizedName}`);
      
      // remove() is the most reliable way to delete a node and all children
      await remove(userRef);
      
      console.log(`[DB] Successfully deleted user node: users/${sanitizedName}`);
  } catch (error) {
      console.error("[DB] Failed to delete user:", error);
      handleFirebaseError(error);
      throw error;
  }
};

export const fetchUserSession = async (username: string): Promise<{ instances: Instance[], logs: LogEntry[] }> => {
  await ensureAuth();
  const sName = sanitize(username);
  const dbRef = ref(db);
  const [instSnap, logSnap] = await Promise.all([
    get(child(dbRef, `users/${sName}/instances`)),
    get(child(dbRef, `users/${sName}/logs`))
  ]);
  return {
    instances: instSnap.exists() ? instSnap.val() : [],
    logs: logSnap.exists() ? logSnap.val() : []
  };
};

export const saveUserInstances = async (username: string, instances: Instance[]) => {
  await ensureAuth();
  try {
    const sName = sanitize(username);
    const cleanInstances = JSON.parse(JSON.stringify(instances));
    await set(ref(db, `users/${sName}/instances`), cleanInstances);
  } catch (error) {
    console.error("Error saving instances", error);
  }
};

export const saveUserLogs = async (username: string, logs: LogEntry[]) => {
  await ensureAuth();
  try {
    const sName = sanitize(username);
    const cleanLogs = JSON.parse(JSON.stringify(logs.slice(-50)));
    await set(ref(db, `users/${sName}/logs`), cleanLogs);
  } catch (error) {
    console.error("Error saving logs", error);
  }
};

export const updateAnyUserInstance = async (username: string, instances: Instance[]) => {
    await ensureAuth();
    try {
        const sName = sanitize(username);
        const instancesRef = ref(db, `users/${sName}/instances`);
        console.log(`[DB] Updating instances for ${sName}`, instances);
        if (!instances || instances.length === 0) {
            await remove(instancesRef);
        } else {
            const cleanInstances = JSON.parse(JSON.stringify(instances));
            await set(instancesRef, cleanInstances);
        }
        console.log(`[DB] Successfully updated instances for ${sName}`);
    } catch (error) {
        console.error("Failed to update user instance by Admin", error);
        throw error;
    }
};
