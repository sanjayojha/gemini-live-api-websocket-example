import { playAudioChunk } from "./audio-playback.js";
import { fetchGeminiKey, isTokenValid, invalidateToken } from "./session-manager.js";
import { appendTranscriptText, appendUserTranscriptText, startNewTranscriptParagraph, startNewUserTranscriptParagraph } from "./ui-handler.js";
let geminiSocketConnection = null;
let audioChunksBuffer = []; // Buffer to store audio chunks
export const geminiSocket = async (fullyLoadedCallback = null) => {
    const keyData = await fetchGeminiKey(!isTokenValid);
    if (!keyData) {
        throw new Error("Unable to obtain Gemini API key");
    }
    const ephemeralGeminKey = keyData.key;
    const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${ephemeralGeminKey}`);

    socket.onopen = async () => {
        console.log("Connected to Gemini Live API");
        // Initialize the realtime session
        await initializeRealtime(socket);
        geminiSocketConnection = socket;
        if (fullyLoadedCallback) {
            fullyLoadedCallback();
        }
    };
    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
    socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event);
        // Optionally invalidate the cached token on socket close
        invalidateToken();
    };

    // single message handler
    socket.onmessage = async (event) => {
        //const data = JSON.parse(event);
        const text = await event.data.text();
        const data = JSON.parse(text);
        if (data.serverContent) {
            const { serverContent } = data;

            // Handle turn complete
            if (serverContent.turnComplete === true) {
                console.log("Model turn complete from Gemini websocket");
                startNewTranscriptParagraph();
                startNewUserTranscriptParagraph();
            }

            // Handle generation complete
            if (serverContent.generationComplete === true) {
                console.log("Generation complete from Gemini websocket");
            }

            // Handle model turn with parts
            if (serverContent.modelTurn?.parts && serverContent.modelTurn.parts.length > 0) {
                for (const part of serverContent.modelTurn.parts) {
                    // Handle thought/acknowledgement
                    if (part.thought === true && part.text) {
                        console.log("Received Acknowledgement from gemini socket:", part.text);
                    }

                    // Handle PCM Audio
                    if (part.inlineData?.mimeType && part.inlineData?.data) {
                        console.log("Received audio chunk from Gemini websocket of mime type:", part.inlineData.mimeType);
                        await playAudioChunk(part.inlineData.data);
                    }
                }
            }

            //inputAudioTranscription
            if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
                appendUserTranscriptText(serverContent.inputTranscription.text);
            }

            //outputAudioTranscription
            if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
                appendTranscriptText(serverContent.outputTranscription.text);
            }
        }

        if (data.usageMetadata) {
            console.log("Gemini API Usage data:", data.usageMetadata);
        }

        //console.log("Received response message from Gemini websocket:", data);
    };
};

const initializeRealtime = async (socket) => {
    try {
        const setupMessage = {
            setup: {
                model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
                generationConfig: {
                    responseModalities: ["AUDIO"], // or ['AUDIO']
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Fenrir" },
                        },
                        //languageCode: "en-IN", //docs: https://ai.google.dev/api/generate-content#SpeechConfig, https://ai.google.dev/gemini-api/docs/live-guide#change-voice-and-language
                    },
                },
                systemInstruction: {
                    parts: [{ text: "You are a helpful assistant. Going to talk about upcoming Christmas plans. Ask questions and be engaging. Keep responses concise." }],
                },
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        disabled: true,
                    },
                },
                outputAudioTranscription: {},
                inputAudioTranscription: {},
            },
        };
        socket.send(JSON.stringify(setupMessage));
        console.log("Sent setup message to Gemini Live API");
    } catch (error) {
        console.error("Error initializing realtime session:", error);
    }
};

export const clearAudioBuffer = async () => {
    try {
        audioChunksBuffer = []; // Clear the local buffer
        console.log("Cleared audio buffer");
    } catch (error) {
        console.error("Error clearing audio buffer:", error);
    }
};

// empty function, its required as import in main.js if we are uisng startActivity version of code
export const startActivity = () => {
    //
};

export const bufferAudioChunk = async (base64Audio) => {
    try {
        // Just collect the chunks, don't send yet
        audioChunksBuffer.push(base64Audio);
        console.log(`Buffered audio chunk (total chunks: ${audioChunksBuffer.length})`);
    } catch (error) {
        console.error("Error buffering audio chunk:", error);
    }
};

// Helper function to combine base64 audio chunks
const combineBase64AudioChunks = (chunks) => {
    // Decode all base64 chunks to binary
    const binaryChunks = chunks.map((chunk) => atob(chunk));

    // Calculate total length
    const totalLength = binaryChunks.reduce((sum, chunk) => sum + chunk.length, 0);

    // Create a single Uint8Array to hold all data
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of binaryChunks) {
        for (let i = 0; i < chunk.length; i++) {
            combined[offset++] = chunk.charCodeAt(i);
        }
    }

    // Convert back to base64
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks for efficient string building
    for (let i = 0; i < combined.length; i += chunkSize) {
        const slice = combined.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, slice);
    }

    return btoa(binary);
};

export const createResponse = async () => {
    try {
        if (geminiSocketConnection.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket is not open");
        }
        if (audioChunksBuffer.length === 0) {
            console.warn("No audio chunks to send");
            return;
        }

        // start activity
        const activityStartMessage = {
            realtimeInput: {
                activityStart: {},
            },
        };
        geminiSocketConnection.send(JSON.stringify(activityStartMessage));
        console.log("Sent activity start to Gemini Live API");

        // Combine all buffered chunks into one
        const combinedAudio = combineBase64AudioChunks(audioChunksBuffer);

        console.log(`Sending combined audio (${audioChunksBuffer.length} chunks, ${combinedAudio.length} base64 chars)`);

        const inputMessage = {
            realtimeInput: {
                audio: {
                    data: combinedAudio,
                    mimeType: "audio/pcm;rate=16000",
                },
            },
        };

        geminiSocketConnection.send(JSON.stringify(inputMessage));
        console.log("Sent combined audio to Gemini Live API");

        // end activity
        const activityEndMessage = {
            realtimeInput: {
                activityEnd: {},
            },
        };
        geminiSocketConnection.send(JSON.stringify(activityEndMessage));
        console.log("Sent activity end to Gemini Live API");

        // Clear the buffer after sending
        audioChunksBuffer = [];
    } catch (error) {
        console.error("Error sending audio send event to Gemini Live API:", error);
    }
};
