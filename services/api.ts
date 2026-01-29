// The Service now accepts the full URL pattern from the user config
// and replaces {target_uid} with the actual UID.

// Helper: Fetch with timeout
const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = 10000) => {
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

export const launchInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    let url = apiUrlPattern.trim(); // Sanitize input
    if (!url.startsWith('http')) url = `https://${url}`; // Add protocol if missing
    
    url = url.replace(/{target_uid}/g, targetUid);
    
    try { new URL(url); } catch (_) { throw new Error("Invalid API URL Configuration"); }

    console.log(`[Launch API] Requesting: ${url}`);
    const response = await fetch(url);
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
    const response = await fetch(url);
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

// --- New Data Fetching APIs ---

export const fetchProfileData = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  const baseUrl = apiUrlPattern || "https://banner-smoky-theta.vercel.app/profile?uid={uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
  
  console.log(`[Profile API] Fetching: ${url}`);

  const handleResponse = async (response: Response) => {
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
          return await response.json();
      }
      if (contentType && contentType.startsWith("image/")) {
          const blob = await response.blob();
          return { Banner: URL.createObjectURL(blob), Avatar: "", Nickname: "" };
      }
      const text = await response.text();
      if (text.trim().startsWith("http")) return { Banner: text.trim(), Avatar: "", Nickname: "" };
      return null;
  };

  try {
    // Strategy 1: Direct
    try {
        const response = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
        const data = await handleResponse(response);
        if (data) return data;
    } catch(e) { /* Fallback */ }

    // Strategy 2: CorsProxy
    try {
         const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
         const response = await fetchWithTimeout(proxyUrl, { cache: 'no-store' }, 8000);
         const data = await handleResponse(response);
         if (data) return data;
    } catch(e) { /* Fail */ }

    return { Banner: url, Avatar: "", Nickname: "" };
  } catch (error) {
    console.warn("[Profile API] All fetch strategies failed.", error);
    return { Banner: url, Avatar: "", Nickname: "" };
  }
};

export const fetchLevelInfo = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  try {
    const baseUrl = apiUrlPattern || "https://danger-level-info.vercel.app/level/{uid}";
    const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
    
    console.log(`[Level API] Fetching: ${url}`);
    
    // Helper to try a fetch with logging and parsing
    const tryFetch = async (fetchUrl: string, label: string, isJsonWrapper = false) => {
        try {
            // console.log(`[Level API] Strategy: ${label}`);
            const response = await fetchWithTimeout(fetchUrl, { cache: 'no-store' }, 10000);
            if (response.ok) {
                const text = await response.text();
                try {
                    let json = JSON.parse(text);
                    
                    // AllOrigins /get wrapper handling
                    if (isJsonWrapper && json.contents) {
                        try {
                            // Try parsing the contents as JSON
                            json = JSON.parse(json.contents);
                        } catch {
                            // If contents isn't JSON, return null (wrapper failed to wrap JSON)
                            console.warn(`[Level API] ${label}: Wrapped content was not JSON`);
                            return null;
                        }
                    }

                    // Basic validation: must be object
                    if (json && typeof json === 'object') {
                        console.log(`[Level API] Success via ${label}`);
                        return json;
                    }
                } catch (e) {
                    console.warn(`[Level API] ${label} returned non-JSON response.`);
                }
            }
        } catch (e) {
            console.warn(`[Level API] ${label} failed: ${e}`);
        }
        return null;
    };

    // Strategy 1: Direct Fetch (Fastest if CORS allowed)
    let data = await tryFetch(url, "Direct");
    if (data) return data;

    // Strategy 2: CorsProxy.io (Usually reliable)
    data = await tryFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, "CorsProxy");
    if (data) return data;

    // Strategy 3: CodeTabs (Alternative proxy)
    data = await tryFetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, "CodeTabs");
    if (data) return data;

    // Strategy 4: AllOrigins Raw (Reliable but sometimes blocks)
    data = await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, "AllOrigins Raw");
    if (data) return data;
    
    // Strategy 5: AllOrigins Wrapper (Handles CORS headers better by wrapping response)
    data = await tryFetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, "AllOrigins Wrapper", true);
    if (data) return data;

    // Strategy 6: ThingProxy (Another backup)
    data = await tryFetch(`https://thingproxy.freeboard.io/fetch/${url}`, "ThingProxy");
    if (data) return data;

    // No error thrown here to prevent cluttering console if it's just a transient network issue
    // We return null and the UI shows '--'
    console.warn("[Level API] All fetch strategies exhausted for " + uid);
    return null;

  } catch (error) {
    console.error("[Level API] Error:", error);
    return null;
  }
};