

console.log("Background loaded");

// When the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "option.html" });
    }
  });

  chrome.contextMenus.create({
    id: "summarize-selection",
    title: "Summarize selected text",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "summarize-selection" && info.selectionText) {
    try {
      const { geminiApiKey } = await chrome.storage.sync.get("geminiApiKey");
      if (!geminiApiKey) {
        chrome.storage.local.set(
          { textToSummarize: "No API key set. Click the gear icon to add one." },
          () => {
            chrome.windows.create({
              url: chrome.runtime.getURL("popup.html"),
              type: "popup",
              width: 350,
              height: 500
            });
          }
        );
        return;
      }

      const summary = await getGeminiSummary(info.selectionText, "brief", geminiApiKey);

      chrome.storage.local.set({ textToSummarize: summary }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: 350,
          height: 500
        });
      });

    } catch (error) {
      console.error("Summarization error:", error.message);
      chrome.storage.local.set({ textToSummarize: "Gemini error: " + error.message }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: 350,
          height: 500
        });
      });
    }
  }
});

async function getGeminiSummary(rawText, type, apiKey) {
  const max = 20000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

  const promptMap = {
    brief: `Summarize in 2-3 sentences:\n\n${text}`,
    detailed: `Give a detailed summary:\n\n${text}`,
    bullets: `Summarize in 5-7 bullet points (start each line with "-"):\n\n${text}`
  };
  const prompt = promptMap[type] || promptMap.brief;

  // ✅ Updated to the correct API version and model
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Gemini API request failed");
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary available.";
}
