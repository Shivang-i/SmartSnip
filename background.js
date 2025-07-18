console.log("Background loaded");
chrome.runtime.onInstalled.addListener(()=>{
    chrome.storage.sync.get(["geminiApiKey"],(result)=>{
        if(!result.geminiApiKey){
            chrome.tabs.create({url:"option.html"});
        }
    });
});