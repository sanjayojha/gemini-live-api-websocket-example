// UI updates module

let transcriptContainer = null;
let currentParagraph = null;

let userTranscriptContainer = null;
let currentUserParagraph = null;

export const initializeTranscriptUI = (containerElement, userContainerElement) => {
    transcriptContainer = containerElement;
    currentParagraph = null;
    userTranscriptContainer = userContainerElement;
    currentUserParagraph = null;
    return { transcriptContainer, userTranscriptContainer };
};

export const appendTranscriptText = (text) => {
    if (!transcriptContainer) return;

    if (!currentParagraph) {
        currentParagraph = document.createElement("p");
        currentParagraph.className = "mb-2";
        transcriptContainer.appendChild(currentParagraph);
    }

    currentParagraph.textContent += text;

    // Auto-scroll to bottom
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
};

export const appendUserTranscriptText = (text) => {
    if (!userTranscriptContainer) return;

    if (!currentUserParagraph) {
        currentUserParagraph = document.createElement("p");
        currentUserParagraph.className = "mb-2";
        userTranscriptContainer.appendChild(currentUserParagraph);
    }

    currentUserParagraph.textContent += text;

    // Auto-scroll to bottom
    userTranscriptContainer.scrollTop = userTranscriptContainer.scrollHeight;
};

export const startNewTranscriptParagraph = () => {
    currentParagraph = null;
};
export const startNewUserTranscriptParagraph = () => {
    currentUserParagraph = null;
};

export const clearTranscript = () => {
    if (transcriptContainer) {
        transcriptContainer.innerHTML = "";
        currentParagraph = null;
    }
    if (userTranscriptContainer) {
        userTranscriptContainer.innerHTML = "";
        currentUserParagraph = null;
    }
};
