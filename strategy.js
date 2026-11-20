import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentRulesList = [];
let tempStrategyName = "";
let tempStrategyDesc = "";

window.openMyStrategiesModal = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    const modal = document.getElementById('myStrategiesModal');
    const container = document.getElementById('my-strategies-list-container');
    if (!modal || !container) return;

    modal.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-8 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading vault...</div>`;

    try {
        const qStrat = query(collection(db, "strategies"), where("userEmail", "==", currentLoggedInUser));
        const snap = await getDocs(qStrat);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-wider">No private strategies saved yet.</div>`;
            return;
        }

        snap.forEach(docSnap => {
            let s = docSnap.data();
            let rulesHtml = "";
            if (s.rules && s.rules.length > 0) {
                s.rules.forEach((r, idx) => {
                    rulesHtml += `<li class="text-xs text-slate-600 dark:text-slate-400 font-semibold">• Rule ${idx + 1}: ${r}</li>`;
                });
            } else {
                rulesHtml = `<li class="text-xs text-slate-400 italic">No specific rules defined.</li>`;
            }

            container.innerHTML += `
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <h4 class="text-slate-900 dark:text-white font-extrabold text-base mb-1.5">${s.name}</h4>
                <p class="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-3 whitespace-pre-wrap">${s.description || 'No execution overview.'}</p>
                <div class="space-y-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Checklist Rules:</span>
                    <ul class="space-y-1">${rulesHtml}</ul>
                </div>
            </div>`;
        });
    } catch (e) {
        container.innerHTML = `<div class="text-center py-8 text-rose-500 font-bold text-xs">Error loading strategies: ${e.message}</div>`;
    }
};

window.proceedToRulesStep = function() {
    tempStrategyName = document.getElementById('strategy-name-input').value.trim();
    tempStrategyDesc = document.getElementById('strategy-code-input').value.trim();

    if (!tempStrategyName) {
        window.showToast("Strategy name required!", "error");
        return;
    }

    document.getElementById('rule-page-title').innerText = "Rules for: " + tempStrategyName;
    document.getElementById('strategy-step-1').classList.add('hidden');
    document.getElementById('strategy-step-2').classList.remove('hidden');
    currentRulesList = [];
    renderRulesUI();
};

window.backToStrategyStep1 = function() {
    document.getElementById('strategy-step-2').classList.add('hidden');
    document.getElementById('strategy-step-1').classList.remove('hidden');
};

window.addSingleRule = function() {
    const ruleText = document.getElementById('single-rule-input').value.trim();
    if (!ruleText) return;

    currentRulesList.push(ruleText);
    document.getElementById('single-rule-input').value = "";
    renderRulesUI();
};

function renderRulesUI() {
    const container = document.getElementById('rules-list-container');
    if (!container) return;
    if (currentRulesList.length === 0) {
        container.innerHTML = `<li class="text-slate-400 italic font-medium text-center mt-6">No rules added yet...</li>`;
        return;
    }
    container.innerHTML = "";

    currentRulesList.forEach((rule, idx) => {
        container.innerHTML += `
        <li class="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 shadow-2xs">
            <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-xl">${idx + 1}</span>
            <span class="font-semibold text-xs text-slate-700 dark:text-slate-300">${rule}</span>
        </li>`;
    });
}

window.saveCompleteStrategyToDatabase = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    if (currentRulesList.length === 0) {
        window.showToast("Add at least one execution rule!", "error");
        return;
    }

    try {
        await addDoc(collection(db, "strategies"), {
            userEmail: currentLoggedInUser,
            name: tempStrategyName,
            description: tempStrategyDesc,
            rules: currentRulesList,
            timestamp: new Date()
        });

        window.showToast("Vault Strategy Secured Privately!");
        document.getElementById('strategy-name-input').value = "";
        document.getElementById('strategy-code-input').value = "";
        currentRulesList = [];

        window.backToStrategyStep1();
        if (typeof window.loadUserDataFromFirebase === 'function') await window.loadUserDataFromFirebase();
        window.switchTab('dashboard');
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
};
