let GEMINI_API_KEY = localStorage.getItem('geminiApiKey') || "";

window.saveApiKey = function() {
    const keyInput = document.getElementById('gemini-key-input').value.trim();
    if (keyInput) {
        localStorage.setItem('geminiApiKey', keyInput);
        GEMINI_API_KEY = keyInput;
        document.getElementById('api-setup-box').classList.add('hidden');
        window.showToast("API Key saved securely!");
    } else {
        window.showToast("Please enter a valid key", "error");
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (!GEMINI_API_KEY) {
        const apiBox = document.getElementById('api-setup-box');
        if (apiBox) apiBox.classList.remove('hidden');
    }
});

window.sendAiMessage = async function() {
    const inputEl = document.getElementById('ai-msg-input');
    const userText = inputEl.value.trim();

    if (!userText) return;

    if (!GEMINI_API_KEY) {
        window.showToast("Please enter Gemini API Key first in Settings! ⚙️", "error");
        document.getElementById('api-setup-box').classList.remove('hidden');
        return;
    }

    const chatBox = document.getElementById('ai-chat-box');
    const currentUserProfile = typeof window.getUserProfile === 'function' ? window.getUserProfile() : { username: "Trader" };

    chatBox.innerHTML += `<div class="bg-blue-600 text-white p-5 rounded-3xl rounded-tr-none self-end max-w-[85%] shadow-md"><p class="text-sm font-semibold">${userText}</p></div>`;
    inputEl.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    const thinkingId = 'thinking-' + Date.now();
    chatBox.innerHTML += `<div id="${thinkingId}" class="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl rounded-tl-none self-start max-w-[85%] border border-slate-100 dark:border-slate-700"><p class="text-sm font-bold text-slate-400 animate-pulse">Analyzing vault...</p></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    let currentEq = document.getElementById('dash-equity').innerText;
    let winR = document.getElementById('dash-winrate-text').innerText;
    let totalT = document.getElementById('dash-totaltrades').innerText;

    let systemPrompt = `You are a strict, elite trading psychology coach powered by Gemini. You are talking to a trader named ${currentUserProfile.username}. Context: Their active account equity is ${currentEq}, win rate is ${winR}, and total executions are ${totalT}. The trader trades SMC on XAUUSD. Keep your response concise, actionable, formatting with bold text where necessary, and strictly avoid long essays. User question: "${userText}"`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        const aiText = data.candidates[0].content.parts[0].text;
        document.getElementById(thinkingId).remove();

        const formattedText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-500 dark:text-blue-400">$1</strong>').replace(/\n/g, '<br>');
        chatBox.innerHTML += `<div class="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl rounded-tl-none self-start max-w-[85%] border border-slate-100 dark:border-slate-700 shadow-sm"><p class="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">${formattedText}</p></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        document.getElementById(thinkingId).remove();
        chatBox.innerHTML += `<div class="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-5 rounded-3xl rounded-tl-none self-start max-w-[85%] shadow-sm"><p class="text-sm font-bold">API Connection Error. Key might be invalid or restricted.</p></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
};

const aiInput = document.getElementById("ai-msg-input");
if (aiInput) {
    aiInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            window.sendAiMessage();
        }
    });
}
