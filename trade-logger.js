import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let chartImgData = "";
let rrImgData = "";
let voiceNoteBase64 = "";
let mediaRecorder;
let audioChunks = [];

window.startRecording = async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                voiceNoteBase64 = reader.result;
                const audioPlayer = document.getElementById('audio-playback');
                if (audioPlayer) {
                    audioPlayer.src = voiceNoteBase64;
                    audioPlayer.classList.remove('hidden');
                }
                const voiceStatus = document.getElementById('voice-status');
                if (voiceStatus) voiceStatus.innerText = "Audio saved locally! Ready to sync.";
            };
        };

        mediaRecorder.start();
        document.getElementById('btn-start-record').classList.add('hidden');
        document.getElementById('btn-stop-record').classList.remove('hidden');
        const voiceStatus = document.getElementById('voice-status');
        if (voiceStatus) {
            voiceStatus.innerText = "Recording... Speak now 🔴";
            voiceStatus.classList.add('text-rose-500', 'animate-pulse');
        }
    } catch (err) {
        window.showToast("Microphone access denied or error.", "error");
    }
};

window.stopRecording = function() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        document.getElementById('btn-start-record').classList.remove('hidden');
        document.getElementById('btn-start-record').innerHTML = "Record Again";
        document.getElementById('btn-stop-record').classList.add('hidden');
        const voiceStatus = document.getElementById('voice-status');
        if (voiceStatus) voiceStatus.classList.remove('text-rose-500', 'animate-pulse');
    }
};

window.previewImage = function(inputId, labelId, varName) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);

    if (input && input.files && input.files[0]) {
        const file = input.files[0];
        if (label) label.innerText = "Attached: " + file.name;

        const reader = new FileReader();
        reader.onload = function(e) {
            if (varName === 'chartImgData') chartImgData = e.target.result;
            if (varName === 'rrImgData') rrImgData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

window.calculateFromPrices = function() {
    const direction = document.getElementById('trade-direction').value;
    const entry = parseFloat(document.getElementById('trade-entry').value) || 0;
    const sl = parseFloat(document.getElementById('trade-sl').value) || 0;
    const tp = parseFloat(document.getElementById('trade-tp').value) || 0;
    const lotsize = parseFloat(document.getElementById('trade-lotsize').value) || 0.01;
    const exitPriceInput = document.getElementById('trade-exit-price').value;
    const exitPrice = parseFloat(exitPriceInput);

    const risk = Math.abs(entry - sl);
    const expectedReward = Math.abs(tp - entry);
    let rr = risk > 0 ? (expectedReward / risk).toFixed(1) : 0;
    document.getElementById('trade-rr-val').value = "1:" + rr;

    let actualPoints = 0;
    if (direction === 'buy') {
        if (exitPriceInput !== "" && !isNaN(exitPrice)) {
            actualPoints = exitPrice - entry;
        } else {
            actualPoints = tp - entry;
        }
    } else if (direction === 'sell') {
        if (exitPriceInput !== "" && !isNaN(exitPrice)) {
            actualPoints = entry - exitPrice;
        } else {
            actualPoints = entry - tp;
        }
    }

    if (isNaN(actualPoints)) actualPoints = 0;
    document.getElementById('trade-pips').value = Math.abs(actualPoints).toFixed(1) + " Pts";

    const netPL = actualPoints * lotsize * 100;
    const plField = document.getElementById('trade-pl');
    plField.value = netPL.toFixed(2);

    if (netPL >= 0) {
        plField.classList.remove('text-rose-600', 'dark:text-rose-400');
        plField.classList.add('text-emerald-600', 'dark:text-emerald-400');
    } else {
        plField.classList.remove('text-emerald-600', 'dark:text-emerald-400');
        plField.classList.add('text-rose-600', 'dark:text-rose-400');
    }
};

window.openRuleVerificationModal = function() {
    const selectedStratName = document.getElementById('strategy-dropdown').value;
    const strategiesCache = typeof window.getStrategiesCache === 'function' ? window.getStrategiesCache() : [];
    const matchedStrat = strategiesCache.find(s => s.name === selectedStratName);
    const container = document.getElementById('modal-rules-checklist');
    container.innerHTML = "";

    if (matchedStrat && matchedStrat.rules && matchedStrat.rules.length > 0) {
        matchedStrat.rules.forEach((rule, idx) => {
            container.innerHTML += `
            <label class="flex items-start gap-4 cursor-pointer p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition group">
                <div class="mt-0.5">
                    <input type="checkbox" value="${rule}" class="rule-checkbox w-6 h-6 text-blue-600 bg-white border-slate-300 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer transition-all" />
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Rule ${idx + 1}</span>
                    <span class="text-sm text-slate-800 dark:text-slate-200 font-bold leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">${rule}</span>
                </div>
            </label>`;
        });
    } else {
        container.innerHTML = `
        <div class="p-8 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 text-center">
            <div class="text-3xl mb-2">⚠️</div>
            <h4 class="text-base text-amber-800 dark:text-amber-400 font-black mb-1">No Rules Found</h4>
            <p class="text-xs text-amber-700/80 dark:text-amber-500/80 font-semibold">You haven't defined any strict rules for this setup. Trading without rules is gambling!</p>
        </div>`;
    }

    const modal = document.getElementById('ruleVerificationModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeRuleModal = function() {
    const modal = document.getElementById('ruleVerificationModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.confirmAndSaveTrade = async function() {
    document.getElementById('ruleVerificationModal').classList.add('hidden');
    document.getElementById('ruleVerificationModal').classList.remove('flex');

    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();
    const checkboxes = document.querySelectorAll('.rule-checkbox:checked');
    const followedRules = [];
    checkboxes.forEach(cb => followedRules.push(cb.value));

    const assetValue = document.getElementById('trade-asset').value.trim() || 'XAUUSD';
    const dateEl = document.getElementById('trade-date');
    const dateValue = (dateEl && dateEl.value) ? dateEl.value : new Date().toISOString().split('T')[0];
    const plValue = document.getElementById('trade-pl').value;

    if (!plValue) {
        window.showToast("P/L calculation required!", "error");
        return;
    }

    const directionValue = document.getElementById('trade-direction').value;
    const emotionValue = document.getElementById('trade-emotion').value;
    const exitPriceValue = document.getElementById('trade-exit-price').value || "";
    const exitReasonValue = document.getElementById('trade-exit-reason').value || "";

    try {
        window.showToast("Saving Execution... ⏳");

        await addDoc(collection(db, "trades"), {
            userEmail: currentLoggedInUser,
            accountId: currentUserProfile.activeAccountId || "main",
            amount: parseFloat(plValue),
            asset: assetValue,
            strategy: document.getElementById('strategy-dropdown').value,
            direction: directionValue,
            emotion: emotionValue,
            lotSize: document.getElementById('trade-lotsize').value,
            entry: document.getElementById('trade-entry').value,
            sl: document.getElementById('trade-sl').value,
            tp: document.getElementById('trade-tp').value,
            exitPrice: exitPriceValue,
            exitReason: exitReasonValue,
            chartImg: chartImgData,
            rrImg: rrImgData,
            voiceNote: voiceNoteBase64,
            rulesFollowed: followedRules,
            date: dateValue,
            timestamp: new Date()
        });

        window.showToast("Execution logged securely to the Vault! ✅");

        chartImgData = "";
        rrImgData = "";
        voiceNoteBase64 = "";

        document.getElementById('chart-file-label').innerText = "Upload Chart Snippet";
        document.getElementById('rr-file-label').innerText = "Upload RR Box";
        document.getElementById('trade-exit-price').value = "";
        document.getElementById('trade-exit-reason').value = "";
        document.getElementById('audio-playback').classList.add('hidden');
        document.getElementById('voice-status').innerText = "Explain why you took this setup...";
        document.getElementById('btn-start-record').innerHTML = `<span class="w-2 h-2 bg-rose-500 rounded-full"></span> Record`;

        if (typeof window.loadUserDataFromFirebase === 'function') await window.loadUserDataFromFirebase();
        window.switchTab('dashboard');
    } catch (e) {
        window.showToast("Error saving log: " + e.message, "error");
    }
};
