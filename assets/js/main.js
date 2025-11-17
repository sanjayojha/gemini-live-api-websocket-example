import { getMediaStream, createMediaRecorder, stopMediaRecorder, unmuteAudioTrack, muteAudioTrack, closeSession, createAudioProcessor, stopAudioProcessor } from "./mediaStream.js";
import { stopAudioPlayback, closeAudioContext } from "./audio-playback.js";
import { initializeTranscriptUI, clearTranscript } from "./ui-handler.js";
import { geminiSocket, clearAudioBuffer, bufferAudioChunk, createResponse, startActivity } from "./gemini.js";

// Global variables
let mediaStream = null;
let mediaRecorder = null;
let audioProcessor = null;

const setupRecording = async () => {
    mediaRecorder = await createMediaRecorder(mediaStream, {
        mimeType: "video/webm;codecs=opus",
        onStop: (blob) => {
            // Handle the recorded video blob here
            console.log("Video recording complete:", blob);
            createResponse();
        },
    });

    // start audio processing with AudioWorklet
    audioProcessor = await createAudioProcessor(mediaStream, (base64Audio) => {
        bufferAudioChunk(base64Audio);
    });
};

const stopRecording = async () => {
    await stopMediaRecorder(mediaRecorder);

    await stopAudioProcessor(audioProcessor);
    stopAudioPlayback(); // stop any ongoing audio playback
};

const initializeConnection = async (fullyLoadedCallback) => {
    await geminiSocket(fullyLoadedCallback);
};

window.addEventListener("load", async () => {
    try {
        document.getElementById("loadingOverlay").style.display = "flex";

        mediaStream = await getMediaStream(); // Get media stream (video + audio)
        muteAudioTrack(mediaStream); // Mute audio by default on load

        const startRecordingButton = document.getElementById("startRecording");
        const stopRecordingButton = document.getElementById("stopRecording");
        const aiResponseArea = document.getElementById("aiResponseArea");
        const userTranscriptArea = document.getElementById("userTranscript");

        if (aiResponseArea) {
            initializeTranscriptUI(aiResponseArea, userTranscriptArea);
        }

        if (startRecordingButton) {
            startRecordingButton.disabled = true; // disabled start button until media stream is ready

            startRecordingButton.addEventListener("click", async () => {
                clearTranscript(); // Clear previous transcript
                clearAudioBuffer(); // Clear previous audio buffer
                unmuteAudioTrack(mediaStream); // Unmute audio when starting recording
                startActivity(); // Notify Gemini Live API to start activity, note its not needed if using gemini-alt.js

                await setupRecording();

                // disable start button to prevent multiple clicks
                startRecordingButton.disabled = true;
                // enable stop button
                if (stopRecordingButton) {
                    stopRecordingButton.disabled = false;
                }
            });
        }

        if (stopRecordingButton) {
            stopRecordingButton.addEventListener("click", async () => {
                await stopRecording();
                muteAudioTrack(mediaStream);

                // disable stop button
                stopRecordingButton.disabled = true;
                // enable start button again
                if (startRecordingButton) {
                    startRecordingButton.disabled = false;
                }
            });
        }

        // Display video in the video element
        const videoElement = document.getElementById("userVideo");
        if (videoElement) {
            videoElement.srcObject = mediaStream;
            console.log("Video stream connected to video element");
        }

        await initializeConnection(() => {
            document.getElementById("loadingOverlay").style.display = "none";
            if (startRecordingButton) {
                startRecordingButton.disabled = false;
            }
        });
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", async () => {
    await closeAudioContext();
    await closeSession(mediaStream, mediaRecorder, audioProcessor);
});
