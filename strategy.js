import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentRulesList = [];
let tempStrategyName = "";
let tempStrategyDesc = "";
let editingDocId = null;
let loadedStrategiesMap = {};

window.openMyStrategiesModal = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    const modal = document.getElementById('myStrategiesModal');
    const container = document.getElementById('my-strategies-list-container');
    if (!modal || !container) return;

    modal.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-8 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading vault...</div>`;
    loadedStrategiesMap = {};

    try {
        const qStrat = query(collection(db, "strategies"), where("userEmail", "==", currentLoggedInUser));
        const snap = await getDocs(qStrat);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-wider">No private strategies saved yet.</div>`;
            return;
        }

        snap.forEach((docSnap) => {
            const docId = docSnap.id;
            const s = docSnap.data();
            loadedStrategiesMap[docId] = { id: docId, ...s };

            let rulesHtml = "";
            if (Array.isArray(s.rules) && s.rules.length > 0) {
                s.rules.forEach((r, idx) => {
                    const ruleLabel = typeof r === 'string' ? r : (r?.text || "");
                    rulesHtml += `<li class="text-xs text-slate-600 dark:text-slate-400 font-semibold">• Rule ${idx + 1}: ${ruleLabel}</li>`;
                });
            } else {
                rulesHtml = `<li class="text-xs text-slate-400 italic">No specific rules defined.</li>`;
            }

            container.innerHTML += `
            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col gap-3">
                <div class="flex justify-between items-center gap-2">
                    <h4 class="text-slate-900 dark:text-white font-extrabold text-base">${s.name || "Untitled Strategy"}</h4>
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="window.startEditStrategy('${docId}')" class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-xl text-xs font-extrabold transition">✏️ Edit</button>
                        <button onclick="window.deleteStrategyItem('${docId}')" class="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-3 py-1.5 rounded-xl text-xs font-extrabold transition">🗑️ Delete</button>
                    </div>
                </div>
                <p class="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 whitespace-pre-wrap">${s.description || 'No execution overview.'}</p>
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

window.startEditStrategy = function(docId) {
    const strat = loadedStrategiesMap[docId];
    if (!strat) return;

    editingDocId = docId;
    tempStrategyName = strat.name || "";
    tempStrategyDesc = strat.description || "";
    currentRulesList = Array.isArray(strat.rules)
        ? strat.rules.map((r) => (typeof r === 'string' ? r : (r?.text || ""))).filter(Boolean)
        : [];

    const nameInput = document.getElementById('strategy-name-input');
    const codeInput = document.getElementById('strategy-code-input');
    if (nameInput) nameInput.value = tempStrategyName;
    if (codeInput) codeInput.value = tempStrategyDesc;

    document.getElementById('myStrategiesModal')?.classList.add('hidden');
    document.getElementById('strategy-step-2')?.classList.add('hidden');
    document.getElementById('strategy-step-1')?.classList.remove('hidden');

    if (typeof window.switchTab === 'function') {
        window.switchTab('strategies');
    }

    window.showToast("Editing strategy: " + tempStrategyName);
};

window.deleteStrategyItem = async function(docId) {
    if (!docId) return;
    try {
        await deleteDoc(doc(db, "strategies", docId));
        window.showToast("Strategy deleted!");
        await window.openMyStrategiesModal();
        if (typeof window.loadUserDataFromFirebase === 'function') {
            await window.loadUserDataFromFirebase();
        }
    } catch (e) {
        window.showToast("Error deleting strategy: " + e.message, "error");
    }
};

window.proceedToRulesStep = function() {
    tempStrategyName = document.getElementById('strategy-name-input').value.trim();
    tempStrategyDesc = document.getElementById('strategy-code-input').value.trim();

    if (!tempStrategyName) {
        window.showToast("Strategy name required!", "error");
        return;
    }

    document.getElementById('rule-page-title').innerText =
        (editingDocId ? "Edit Rules for: " : "Rules for: ") + tempStrategyName;
    document.getElementById('strategy-step-1').classList.add('hidden');
    document.getElementById('strategy-step-2').classList.remove('hidden');
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

window.removeRuleAtIndex = function(index) {
    currentRulesList.splice(index, 1);
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
        <li class="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5 shadow-2xs">
            <div class="flex items-center gap-2.5">
                <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-xl">${idx + 1}</span>
                <span class="font-semibold text-xs text-slate-700 dark:text-slate-300">${rule}</span>
            </div>
            <button onclick="window.removeRuleAtIndex(${idx})" class="text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-xl text-xs font-black transition">&times;</button>
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
        if (editingDocId) {
            await updateDoc(doc(db, "strategies", editingDocId), {
                name: tempStrategyName,
                description: tempStrategyDesc,
                rules: currentRulesList,
                updatedAt: new Date()
            });
            window.showToast("Strategy Updated Successfully!");
        } else {
            await addDoc(collection(db, "strategies"), {
                userEmail: currentLoggedInUser,
                name: tempStrategyName,
                description: tempStrategyDesc,
                rules: currentRulesList,
                timestamp: new Date()
            });
            window.showToast("Vault Strategy Secured Privately!");
        }

        document.getElementById('strategy-name-input').value = "";
        document.getElementById('strategy-code-input').value = "";
        currentRulesList = [];
        tempStrategyName = "";
        tempStrategyDesc = "";
        editingDocId = null;

        window.backToStrategyStep1();
        if (typeof window.loadUserDataFromFirebase === 'function') await window.loadUserDataFromFirebase();
        window.switchTab('dashboard');
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
};
