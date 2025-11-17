# Gemini Live API (Realtime) Demonstration with WebSocket.

This repository contains an example of connecting to the Gemini Live API using WebSocket on the client side (browser) without any SDK using ephemeral authentication tokens. This example allows you to have voice conversations with a Gemini LLM about planning a Christmas party. The application generates realtime transcriptions of both the AI's responses and your speech, which can be used for further processing in your application.

**Note:**

-   We recommend using the Chrome browser when testing this application.
-   The Gemini Live API is in beta and many of its configurations are not working.
-   The API reference lacks in-depth examples and configurations.
-   It is not recommended to use the current Gemini Live API in production.
-   Use an SDK if you need it in production.
-   The example is merely an effort to create a minimal working example without any SDK, through much trial and error.
-   We have a similar example for the [OpenAI realtime API](https://github.com/sanjayojha/openai-realtime-websocket-webrtc-example "click"). This repository contains examples of both `WebSocket` and `WebRTC`. So if you need a WebRTC implementation, see the example from there.

## Architecture

The example uses a PHP backend to generate ephemeral (temporary) tokens for creating secure sessions. The PHP code is basic and serves as an example; you can use any backend technology (Python, Node.js, Go, etc.) to generate these temporary tokens.

**Important:** This application must run in a secure environment with HTTPS enabled.

## Requirements

The only requirement is that your Gemini API key is loaded as an environment variable with the key `GEMINI_API_KEY`.

```bash
export GEMINI_API_KEY='your-api-key-here'
```

## Running the Example

```
https://localhost/websocket-chat.html
```

## Implementation Notes

### Recording API

The JavaScript code uses the `MediaRecorder` Web API to record audio and video. You can completely remove this functionality if you don't need to record the user's video and audio. You can directly stream audio with a little modification of the code.

### Two versions.

We have 2 versions of the Gemini API implementation.

**gemini.js**

-   Sends small audio chunks to the Gemini socket connection during recording.
-   Responds only when recording is stopped.

**gemini-alt.js**

-   Collects the audio chunks in an array during recording.
-   When recording is stopped, it combines all chunks and sends them, after which we get a response.

### Documenation and API problem

Since the Live API is in beta, many of the setup configurations do not work. For example, when I tried to set `languageCode: "en-IN"`, it throws an error "Unknown object languageCode". There are many such small issues with the documentation and API references.

## Voice Activity Detection (VAD)

We have disabled `VAD` in our example for granular control of user and model turns, but it is enabled by default. To enable it, remove the following configuration setting:

```js
automaticActivityDetection: {
    disabled: true,
},
```

Use the `gemini-alt.js` example and remove the granular control of the user's send and end events mentioned in the `createResponse` function.

## Getting Started

1.  Set your Gemini API key as an environment variable.
2.  Ensure HTTPS is configured on your server.
3.  Open `websocket-chat.html` in Chrome.
4.  Allow microphone and camera permissions when prompted.
5.  Click "Start Recording" to begin the conversation.
6.  Click "Stop Recording" when you want the AI to respond.

## Troubleshooting

-   **HTTPS Required:** The application will not work without HTTPS due to browser security restrictions for accessing media devices.
-   **Browser Compatibility:** Chrome is recommended for the best experience.
-   **Audio Issues:** Ensure your microphone is properly connected and browser permissions are granted.

## License

This project is for demonstration purposes. Please review Gemini's usage policies and terms of service before deploying to production.
