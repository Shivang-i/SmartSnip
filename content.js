


console.log("✅ content.js loaded on this page");

function getArticleText() {
  const article = document.querySelector("article");
  if (article) {
    console.log("Article element found");
    return article.innerText;
  }

  const paragraphs = Array.from(document.querySelectorAll("p"));
  console.log(`Found ${paragraphs.length} paragraphs`);
  return paragraphs.map((p) => p.innerText).join("\n");
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  console.log("📩 Message received in content.js:", req);

  // ✅ Use strict equality
  if (req.type === "GET_ARTICLE_TEXT") {
    const text = getArticleText();
    console.log("Sending extracted text back to popup...");
    sendResponse({ text });
  }

  // ✅ Required for async sendResponse
  return true;
});
