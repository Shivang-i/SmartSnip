



// Handle "Summarize" button click
document.getElementById("summarize").addEventListener("click", () => {
  console.log("Summarize clicked");
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type").value;
  resultDiv.textContent = "Extracting text...";
  resultDiv.innerHTML = '<div class="loader"></div>';

  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    console.log("Getting API key");

    if (!geminiApiKey) {
      resultDiv.textContent = "No API key set. Click the gear icon to add one.";
      return;
    }

    // Query current tab and request content
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab || !tab.id) {
        resultDiv.textContent = "No active tab found.";
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (response) => {
        console.log("Message sent to content.js");
        
        if (chrome.runtime.lastError) {
          console.warn("Runtime error:", chrome.runtime.lastError.message);
          resultDiv.textContent = "Could not connect to the page. Make sure content.js is loaded.";
          return;
        }

        if (!response || !response.text) {
          resultDiv.textContent = "Could not extract text from this page.";
          return;
        }

        try {
          const summary = await getGeminiSummary(response.text, summaryType, geminiApiKey);
          resultDiv.textContent = summary;
        } catch (error) {
          console.error("Gemini API error:", error);
          resultDiv.textContent = "Gemini error: " + error.message;
        }
      });
    });
  });
});

// ✅ Updated Gemini API call
async function getGeminiSummary(rawText, type, apiKey) {
  console.log("Gemini API call");
  const max = 20000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

  const promptMap = {
    brief: `Summarize in 2-3 sentences:\n\n${text}`,
    detailed: `Give a detailed summary:\n\n${text}`,
    bullets: `Summarize in 5-7 bullet points (Start each line with "-"):\n\n${text}`,
  };
  const prompt = promptMap[type] || promptMap.brief;

  // ✅ Use correct endpoint and model
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini API request failed");

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary available.";
}

// ✅ Copy button handler
document.getElementById("copy-btn").addEventListener("click", () => {
  console.log("Copy Button clicked!");

  const resultDiv = document.getElementById("result");
  const textToCopy = resultDiv.textContent.trim();

  if (!textToCopy) {
    alert("Nothing to copy!");
    return;
  }

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      console.log("Summary copied!");
      chrome.notifications.create("copyNotify", {
        type: "basic",
        iconUrl: "image48.png",
        title: "Copied!",
        message: "Successfully copied to clipboard."
      });
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      alert("Could not copy text.");
    });
});

// ✅ Background-to-popup listener (context menu)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SUMMARY_RESULT") {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = message.summary;
  }
});

// ✅ Instant popup handling for context-menu flow
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("textToSummarize", ({ textToSummarize }) => {
    if (textToSummarize) {
      const resultDiv = document.getElementById("result");
      resultDiv.textContent = "Summarizing selected text...";
      resultDiv.innerHTML = '<div class="loader"></div>';

      chrome.storage.sync.get(["geminiApiKey"], async ({ geminiApiKey }) => {
        if (!geminiApiKey) {
          resultDiv.textContent = "No API key set. Click the gear icon to add one.";
          return;
        }

        try {
          const summary = await getGeminiSummary(textToSummarize, "bullets", geminiApiKey);
          resultDiv.textContent = summary;
          chrome.storage.local.remove("textToSummarize");
        } catch (error) {
          resultDiv.textContent = "Gemini error: " + error.message;
        }
      });
    }
  });
});
