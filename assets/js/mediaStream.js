// Browser JS module codes

// getMediaStream (mic and camera access)
export const getMediaStream = async (options) => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("MediaDevices API is not supported in this browser.");
        }
        if (!options) {
            options = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user", // Front camera
                },
                audio: {
                    sampleRate: 16000,
                    channelCount: 1, // Mono audio for
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            };
        }
        const stream = await navigator.mediaDevices.getUserMedia(options);
        return stream;
    } catch (error) {
        console.error("Error accessing media devices.", error);
        throw error;
    }
};

// stopMediaStream (stop mic and camera)
export const stopMediaStream = (stream) => {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
};

// mediaRecorder for video recording (optional - for saving video locally)
export const createMediaRecorder = async (stream, options = {}) => {
    try {
        if (!stream) {
            throw new Error("No media stream provided for MediaRecorder.");
        }
        if (typeof MediaRecorder === "undefined") {
            throw new Error("MediaRecorder API is not supported in this browser.");
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType || "")) {
            console.warn(`MIME type ${options.mimeType} is not supported. Using default settings.`);
            options = {};
        }
        const mediaRecorder = new MediaRecorder(stream, options);

        const recordedChunks = [];
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
            //console.log("Recording stopped. Recorded blob:", blob);
            if (options.onStop) {
                options.onStop(blob);
            }
        };
        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
        };
        mediaRecorder.onstart = () => {
            console.log("MediaRecorder started");
        };

        mediaRecorder.start();
        return mediaRecorder;
    } catch (error) {
        console.error("Error creating MediaRecorder.", error);
        throw error;
    }
};

export const stopMediaRecorder = async (mediaRecorder) => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
};

export const createAudioProcessor = async (stream, onAudioData) => {
    try {
        if (!stream) {
            throw new Error("No media stream provided for audio processor.");
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000,
        });

        console.log("Loading AudioWorklet module...");

        // Load the audio worklet module
        await audioContext.audioWorklet.addModule("/assets/js/audio-processor.worklet.js");

        console.log("AudioWorklet module loaded successfully");

        const audioStream = new MediaStream(stream.getAudioTracks());
        const sourceNode = audioContext.createMediaStreamSource(audioStream);
        const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

        // Listen for audio data from the worklet
        workletNode.port.onmessage = (event) => {
            const float32Array = event.data.audio;
            if (onAudioData && float32Array.length > 0) {
                const base64Audio = base64EncodeAudio(float32Array);
                onAudioData(base64Audio);
            }
        };

        // Connect the nodes
        sourceNode.connect(workletNode);

        console.log("AudioProcessor connected and running");

        return { audioContext, workletNode, sourceNode };
    } catch (error) {
        console.error("Error creating audio processor.", error);
        throw error;
    }
};

export const stopAudioProcessor = async (audioProcessor) => {
    if (audioProcessor) {
        const { audioContext, workletNode, sourceNode } = audioProcessor;
        if (sourceNode) sourceNode.disconnect();
        if (workletNode) workletNode.disconnect();
        if (audioContext && audioContext.state !== "closed") {
            await audioContext.close();
        }
        console.log("AudioProcessor stopped");
    }
};

// Mute/unmute audio track
export const muteAudioTrack = (stream) => {
    if (!stream) {
        console.warn("No stream provided to mute");
        return;
    }
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track) => {
        track.enabled = false;
    });
    console.log("Audio muted");
};

export const unmuteAudioTrack = (stream) => {
    if (!stream) {
        console.warn("No stream provided to unmute");
        return;
    }
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track) => {
        track.enabled = true;
    });
    console.log("Audio unmuted");
};

// Converts Float32Array of audio data to PCM16 ArrayBuffer
const floatTo16BitPCM = (float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
};

// Converts a Float32Array to base64-encoded PCM16 data
const base64EncodeAudio = (float32Array) => {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    let binary = "";
    let bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
        let chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
};

export const closeSession = async (mediaStream, mediaRecorder, audioProcessor = null) => {
    try {
        if (audioProcessor) {
            await stopAudioProcessor(audioProcessor);
        }
        await stopMediaRecorder(mediaRecorder);
        stopMediaStream(mediaStream);
        console.log("Media session closed");
    } catch (error) {
        console.error("Error closing media session.", error);
    }
};
