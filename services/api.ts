// The Service now accepts the full URL pattern from the user config
// and replaces {target_uid} with the actual UID.

// Helper: Fetch with timeout
// INCREASED TIMEOUT: 10000ms (10s) to ensure slow proxies have time to respond
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

// Helper: Race multiple promises and return the first success
const raceSuccess = <T>(promises: Promise<T>[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        let rejectedCount = 0;
        if (promises.length === 0) {
            reject(new Error("No promises provided"));
            return;
        }
        promises.forEach(p => {
            p.then(resolve).catch((e) => {
                rejectedCount++;
                if (rejectedCount === promises.length) {
                    reject(new Error("All promises failed"));
                }
            });
        });
    });
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

// --- New Data Fetching APIs (PARALLEL MODE) ---

export const fetchProfileData = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  const baseUrl = apiUrlPattern || "https://banner-smoky-theta.vercel.app/profile?uid={uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
  
  // Internal fetcher that throws on error
  const attemptFetch = async (fetchUrl: string) => {
      const response = await fetchWithTimeout(fetchUrl, { cache: 'no-store' }, 8000);
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
      // Heuristic: if text looks like a URL
      if (text.trim().startsWith("http")) return { Banner: text.trim(), Avatar: "", Nickname: "" };
      
      // Attempt JSON parse even if header is wrong
      try {
          const json = JSON.parse(text);
          return json;
      } catch(e) {
          throw new Error("Invalid response format");
      }
  };

  try {
    // Race Direct vs Proxy vs Wrapped
    const strategies = [
        attemptFetch(url),
        attemptFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`),
        attemptFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
    ];

    const data = await raceSuccess(strategies);
    return data;
  } catch (error) {
    // Fallback: return url as banner if everything fails, assuming it might be a direct image link logic
    return { Banner: url, Avatar: "", Nickname: "" };
  }
};

export const fetchLevelInfo = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  try {
    const baseUrl = apiUrlPattern || "https://danger-level-info.vercel.app/level/{uid}";
    const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
    
    // Internal helper that throws on failure
    const attemptFetch = async (fetchUrl: string, isJsonWrapper = false) => {
        const response = await fetchWithTimeout(fetchUrl, { cache: 'no-store' }, 8000);
        if (!response.ok) throw new Error("Status " + response.status);
        
        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            throw new Error("Not JSON");
        }
        
        // AllOrigins /get wrapper handling
        if (isJsonWrapper && json.contents) {
            try {
                json = JSON.parse(json.contents);
            } catch {
                // Sometimes contents is just the raw string if not JSON, but we expect JSON for level info
                throw new Error("Wrapper JSON parse failed");
            }
        }

        if (json && typeof json === 'object') {
            return json;
        }
        throw new Error("Invalid JSON Object");
    };

    // Prepare strategies - Fire multiple requests in parallel
    const strategies = [
        attemptFetch(url), // Direct
        attemptFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`), // CorsProxy
        attemptFetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`), // CodeTabs
        attemptFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`), // AllOrigins Raw
        attemptFetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, true), // AllOrigins Wrapped
        attemptFetch(`https://thingproxy.freeboard.io/fetch/${url}`) // ThingProxy
    ];

    // Race them! First one to succeed wins.
    try {
        const result = await raceSuccess(strategies);
        return result;
    } catch (aggregateError) {
        console.warn("[Level API] All parallel strategies failed for " + uid);
        return null;
    }

  } catch (error) {
    console.error("[Level API] Error:", error);
    return null;
  }
};