// The Service now accepts the full URL pattern from the user config
// and replaces {target_uid} with the actual UID.

export const launchInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    // Replace placeholder with actual UID
    // Matches {target_uid} or just target_uid if user forgot brackets, handling basic variations
    const url = apiUrlPattern.replace(/{target_uid}/g, targetUid);
    
    // Check if URL is valid
    try {
        new URL(url);
    } catch (_) {
        throw new Error("Invalid API URL Configuration");
    }

    const response = await fetch(url);
    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }
    
    return text || "Instance launched successfully";
  } catch (error: any) {
    throw new Error(error.message || "Failed to connect to server");
  }
};

export const deleteInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    const url = apiUrlPattern.replace(/{target_uid}/g, targetUid);

    try {
        new URL(url);
    } catch (_) {
        throw new Error("Invalid API URL Configuration");
    }
    
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    return text || "Instance removed successfully";
  } catch (error: any) {
    throw new Error(error.message || "Failed to connect to server");
  }
};
