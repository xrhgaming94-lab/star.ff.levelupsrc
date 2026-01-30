// The Service now accepts the full URL pattern from the user config
// and replaces {target_uid} with the actual UID.

// Helper: Delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch with timeout
const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Helper: Recursive Search for keys in JSON with Smart Object Penetration
const findValueRecursive = (obj: any, keyRegex: RegExp, searchInsideObject = false): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;

    // Handle Arrays: iterate elements
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = findValueRecursive(item, keyRegex, searchInsideObject);
            if (res) return res;
        }
        return undefined;
    }

    const keys = Object.keys(obj);

    // 1. Check top-level keys first
    for (const key of keys) {
        if (keyRegex.test(key)) {
            const val = obj[key];
            
            // Case A: Found a string URL
            if (typeof val === 'string' && val.length > 4) {
                return val;
            }
            
            // Case B: Found an object, search inside it for generic image keys if requested
            if (searchInsideObject && typeof val === 'object' && val !== null) {
                const innerUrl = findValueRecursive(val, /^(url|src|href|icon|img|image|link|pic|source)$/i, false);
                if (innerUrl) return innerUrl;
            }
        }
    }

    // 2. Dive deeper into other objects
    for (const key of keys) {
        if (typeof obj[key] === 'object') {
            const result = findValueRecursive(obj[key], keyRegex, searchInsideObject);
            if (result) return result;
        }
    }
    
    return undefined;
};

export const launchInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    let url = apiUrlPattern.trim(); 
    if (!url.startsWith('http')) url = `https://${url}`; 
    
    url = url.replace(/{target_uid}/g, targetUid);
    
    try { new URL(url); } catch (_) { throw new Error("Invalid API URL Configuration"); }

    console.log(`[Launch API] Requesting: ${url}`);
    const response = await fetchWithTimeout(url, {}, 8000); 
    const text = await response.text();
    console.log(`[Launch API] Status: ${response.status}, Response: ${text}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }
    return text || "Instance launched successfully";
  } catch (error: any) {
    console.error("[Launch API] Failed:", error);
    throw new Error(error.message || "Failed to connect to server");
  }
};

export const deleteInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    let url = apiUrlPattern.trim();
    if (!url.startsWith('http')) url = `https://${url}`; 
    
    url = url.replace(/{target_uid}/g, targetUid);
    
    try { new URL(url); } catch (_) { throw new Error("Invalid API URL Configuration"); }
    
    console.log(`[Delete API] Requesting: ${url}`);
    const response = await fetchWithTimeout(url, {}, 8000);
    const text = await response.text();
    console.log(`[Delete API] Status: ${response.status}, Response: ${text}`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }
    return text || "Instance removed successfully";
  } catch (error: any) {
    console.error("[Delete API] Failed:", error);
    throw new Error(error.message || "Failed to connect to server");
  }
};

// --- Profile / Banner Fetching Logic ---

export const fetchProfileData = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  // Construct the URL by replacing placeholder
  const baseUrl = apiUrlPattern || "https://sagar-banner.vercel.app/profile?uid={uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
  
  // OPTIMIZATION 1: Instant Extension Check
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
      return { Banner: url, Avatar: "", Nickname: "" };
  }

  // Helper to add cache buster
  const getCacheBustedUrl = (u: string) => {
      const sep = u.includes('?') ? '&' : '?';
      return `${u}${sep}_t=${Date.now()}`;
  };

  const proxies = [
      (u: string) => u, // Direct
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const proxy of proxies) {
      try {
          const fetchUrl = getCacheBustedUrl(proxy(url));
          const response = await fetchWithTimeout(fetchUrl, { cache: 'no-store' }, 5000);
          
          if (response.ok) {
              const text = await response.text();
              try {
                  const json = JSON.parse(text);
                  if (json && typeof json === 'object') {
                      const banner = findValueRecursive(json, /.*(banner|background|cover|wall|header).*/i, true);
                      const avatar = findValueRecursive(json, /.*(avatar|icon|image|pic|photo|profile).*/i, true);
                      const nickname = findValueRecursive(json, /^(nickname|name|user_name|username|ign|player_name)$/i, false);

                      if (banner || avatar || nickname) {
                          return {
                              Banner: banner || "",
                              Avatar: avatar || "",
                              Nickname: nickname || ""
                          };
                      }
                  }
              } catch (e) {
                  // Parsing failed, it might be a plain text URL
                  if (text.trim().startsWith("http")) {
                       return { Banner: text.trim(), Avatar: "", Nickname: "" };
                  }
              }
          }
      } catch (e) {
          continue;
      }
  }

  // FALLBACK: Force use of the constructed URL if all else fails
  return { Banner: url, Avatar: "", Nickname: "" };
};

export const fetchLevelInfo = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  const baseUrl = apiUrlPattern || "https://danger-level-info.vercel.app/level/{uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
  
  // Robust CORS Handling: Try multiple strategies
  const proxies = [
      (u: string) => u, // 1. Direct (Works if API supports CORS)
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`, // 2. CORS Proxy IO
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, // 3. AllOrigins
      (u: string) => `https://thingproxy.freeboard.io/fetch/${u}` // 4. ThingProxy
  ];

  for (const proxy of proxies) {
      try {
          const targetUrl = proxy(url);
          const separator = targetUrl.includes('?') ? '&' : '?';
          const cacheBustedUrl = `${targetUrl}${separator}_t=${Date.now()}`;
          
          // Use no-referrer to bypass some referer-based blocks
          const res = await fetchWithTimeout(cacheBustedUrl, { 
              cache: 'no-store',
              referrerPolicy: 'no-referrer'
          }, 6000);
          
          if (res.ok) {
              const txt = await res.text();
              try {
                  const j = JSON.parse(txt);
                  if (j && typeof j === 'object') return j;
              } catch (jsonErr) {
                  // Not JSON, try next proxy
                  console.warn(`[LevelInfo] Invalid JSON from ${targetUrl}`);
              }
          }
      } catch (e) {
          // Network error or timeout, try next proxy
          continue;
      }
  }
  
  return null;
};