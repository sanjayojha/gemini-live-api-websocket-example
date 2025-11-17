// Audio playback module using AudioContext

let audioContext = null;
let nextStartTime = 0;
let isPlaying = false;

export const initializeAudioContext = async () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 24000, // Gemini uses 24kHz for output audio
        });
        console.log("AudioContext initialized for playback");
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    return audioContext;
};

// Convert base64 PCM16 to Float32Array
const base64ToFloat32Array = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const dataView = new DataView(bytes.buffer);
    const float32Array = new Float32Array(bytes.length / 2);

    for (let i = 0; i < float32Array.length; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        float32Array[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }

    return float32Array;
};

// Play audio chunk
export const playAudioChunk = async (base64Audio) => {
    await initializeAudioContext();

    const float32Array = base64ToFloat32Array(base64Audio);
    const audioBuffer = audioContext.createBuffer(
        1, // mono
        float32Array.length,
        24000 // sample rate
    );

    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const currentTime = audioContext.currentTime;
    const startTime = Math.max(currentTime, nextStartTime);

    source.start(startTime);
    nextStartTime = startTime + audioBuffer.duration;
    isPlaying = true;

    source.onended = () => {
        // Check if this was the last chunk
        if (audioContext.currentTime >= nextStartTime - 0.01) {
            isPlaying = false;
        }
    };
};

export const stopAudioPlayback = () => {
    nextStartTime = 0;
    isPlaying = false;
    // Note: Can't stop already scheduled sources, but reset timing
};

export const closeAudioContext = async () => {
    if (audioContext && audioContext.state !== "closed") {
        await audioContext.close();
        audioContext = null;
        nextStartTime = 0;
        isPlaying = false;
    }
};

export const getAudioPlaybackState = () => {
    return { isPlaying, nextStartTime };
};
