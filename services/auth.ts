import { User, Admin, CurrentUser, AppConfig } from '../types';

const ADMIN_USER = "staradmin";
const ADMIN_PASS = "Star12341234";
const USERS_STORAGE_KEY = "ff_bot_users";
const SESSION_KEY = "ff_bot_session";
const CONFIG_KEY = "ff_bot_config";

// --- App Config Logic ---
export const getAppConfig = (): AppConfig => {
  const stored = localStorage.getItem(CONFIG_KEY);
  // Default to a generic placeholder if not set
  return stored ? JSON.parse(stored) : { contactLink: '#' };
};

export const saveAppConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

// --- User Logic ---
export const getStoredUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const login = (username: string, password: string): { success: boolean; user?: CurrentUser; message?: string } => {
  // Check Admin
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const admin: Admin = { username, role: 'admin' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }

  // Check Users
  const users = getStoredUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Check Expiry
    if (Date.now() > user.expiryDate) {
      return { success: false, message: "Account Expired. Contact Admin." };
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  }

  return { success: false, message: "Invalid credentials" };
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): CurrentUser | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  const user = JSON.parse(session);
  
  // Re-check expiry if it's a regular user
  if (user.role === 'user' && Date.now() > (user as User).expiryDate) {
    logout();
    return null;
  }
  return user;
};

// Admin Functions
export const createUser = (user: User) => {
  const users = getStoredUsers();
  if (users.some(u => u.username === user.username)) {
    throw new Error("Username already exists");
  }
  users.push(user);
  saveUsers(users);
};

export const deleteUser = (username: string) => {
  const users = getStoredUsers();
  const newUsers = users.filter(u => u.username !== username);
  saveUsers(newUsers);
};