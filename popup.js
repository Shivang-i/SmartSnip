document.getElementById("summarize").addEventListener("click", function() {
    console.log("Summarize clicked");
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;
    resultDiv.textContent = "Extracting text....";
    resultDiv.innerHTML = '<div class="loader"></div>';

    // Get the user's API key
    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
                    console.log("getting api key");

        if (!geminiApiKey) {
            resultDiv.textContent = "No API key set. Click the gear icon to add one.";
            return;
        }

        // Add content.js for page text
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.tabs.sendMessage(tab.id,
                { type: "GET_ARTICLE_TEXT" },
                async ({ text }) => {
                    console.log("content.js adding");
                    if (!text) {
                        resultDiv.textContent = "Could not extract text from this page.";
                        return;
                    }

                    try {
                        const summary = await getGeminiSummary(text, summaryType, geminiApiKey);
                        resultDiv.textContent = summary;
                    } catch (error) {
                        resultDiv.textContent = "Gemini error: " + error.message;
                    }
                }
            );
        });
    });
});


async function getGeminiSummary(rawText, type, apiKey) {
                    console.log("gemini api call");

    const max = 20000;

    const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

    const promptMap = {
        brief: `Summarize in 2-3 sentences:\n\n${text}`,
        detailed: `Give a detailed summary:\n\n${text}`,
        bullets: `Summarize in 5-7 bullet points (Start each line with "-"):\n\n${text}`
    };
    const prompt = promptMap[type] || promptMap.brief;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
            }),
        }
    );

    if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error?.message || "Request failed");
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary.";
}


//Adding event listener to save button 
document.getElementById("copy-btn").addEventListener('click',function(){
    console.log("Save Button clicked!!!");
});