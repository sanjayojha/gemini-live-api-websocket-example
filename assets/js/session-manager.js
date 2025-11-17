// Shared session and token management

let cachedTokenData = null;

// Fetch ephemeral Gemnini API key from the server
export const fetchGeminiKey = async (forceRefresh = false) => {
    try {
        // Check if we have a valid cached token
        if (!forceRefresh && cachedTokenData) {
            const currentTime = Math.floor(Date.now() / 1000);
            // Add a buffer of 30 seconds before expiry
            if (cachedTokenData.expiry > currentTime + 30) {
                console.log("Using cached Gemini token");
                return cachedTokenData;
            }
        }

        console.log("Fetching new Gemini token");

        const response = await fetch("ajax/get-gemini-key.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch Gemini API key");
        }

        const data = await response.json();
        if (data.success) {
            cachedTokenData = { key: data.token, expiry: data.expiry };
            return cachedTokenData;
        } else {
            let error = data.error || "Unknown error";
            console.error("Server error:", error);
            if (data.response) {
                console.error("Server response:", data.response);
            }
            throw new Error("Failed to get session token");
        }
    } catch (error) {
        console.error("Error fetching Gemini API key:", error);
        return null;
    }
};

export const isTokenValid = () => {
    if (!cachedTokenData) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    // Add a buffer of 30 seconds before expiry
    return cachedTokenData.expiry > currentTime + 30;
};

export const invalidateToken = () => {
    cachedTokenData = null;
};
