import { db } from './firebase-config.js';
import { collection, getDocs, query, where, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const WEB3FORMS_KEY = "8e21fed3-cf5f-4858-a3ef-cdcf9fe34c96";

let generatedOtp = "";
let otpGeneratedTime = 0;
let otpInterval = null;

let removeGeneratedOtp = "";
let removeOtpGeneratedTime = 0;
let removeOtpInterval = null;
let targetRemoveAccountId = "";

window.openAddNewAccountModal = function() {
    const nameEl = document.getElementById('new-account-name');
    const eqEl = document.getElementById('new-account-equity');
    const modal = document.getElementById('addNewAccountModal');
    if (nameEl) nameEl.value = "";
    if (eqEl) eqEl.value = "";
    if (modal) modal.classList.remove('hidden');
};

window.confirmAddNewAccount = async function() {
    const accName = document.getElementById('new-account-name').value.trim();
    const startingEquity = parseFloat(document.getElementById('new-account-equity').value) || 0;
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();

    if (!accName) {
        window.showToast("Please enter an account name!", "error");
        return;
    }

    const newAccId = 'acc_' + Date.now();
    currentUserProfile.activeAccountId = newAccId;

    if (!currentUserProfile.accounts) {
        currentUserProfile.accounts = {};
    }

    currentUserProfile.accounts[newAccId] = {
        name: accName,
        startingEquity: startingEquity,
        createdAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "profiles", currentLoggedInUser), currentUserProfile, { merge: true });
        window.setUserProfile(currentUserProfile);
        document.getElementById('addNewAccountModal').classList.add('hidden');
        window.showToast("Account activated successfully!");
        if (typeof window.loadUserDataFromFirebase === 'function') window.loadUserDataFromFirebase();
        window.updateActiveAccountDropdown();
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
};

window.switchActiveAccount = async function(accId) {
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();
    currentUserProfile.activeAccountId = accId;

    try {
        await setDoc(doc(db, "profiles", currentLoggedInUser), currentUserProfile, { merge: true });
        window.setUserProfile(currentUserProfile);
        window.showToast("Switched workspace successfully!");
        if (typeof window.loadUserDataFromFirebase === 'function') window.loadUserDataFromFirebase();
        window.updateActiveAccountDropdown();
    } catch (e) {
        window.showToast("Error switching account", "error");
    }
};

window.updateActiveAccountDropdown = function() {
    const currentUserProfile = window.getUserProfile();
    const dropdown = document.getElementById('workspace-account-selector');
    if (!dropdown) return;
    dropdown.innerHTML = "";

    if (currentUserProfile.accounts && Object.keys(currentUserProfile.accounts).length > 0) {
        for (let accId in currentUserProfile.accounts) {
            let opt = new Option(currentUserProfile.accounts[accId].name, accId);
            if (accId === currentUserProfile.activeAccountId) opt.selected = true;
            dropdown.add(opt);
        }
    } else {
        dropdown.add(new Option("Main Account", "main"));
    }
    window.updateActiveAccountBadge();
};

// --- REMOVE ACCOUNT WITH OTP ---
window.openRemoveAccountModal = function() {
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile() || {};
    const accounts = currentUserProfile.accounts || {};
    const selectEl = document.getElementById('remove-account-select');
    const step1 = document.getElementById('remove-step-1');
    const step2 = document.getElementById('remove-step-2');
    const otpInput = document.getElementById('remove-otp-input');
    const descEl = document.getElementById('remove-modal-desc');
    const modal = document.getElementById('removeAccountModal');

    if (removeOtpInterval) {
        clearInterval(removeOtpInterval);
        removeOtpInterval = null;
    }

    targetRemoveAccountId = "";
    removeGeneratedOtp = "";
    removeOtpGeneratedTime = 0;

    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (otpInput) otpInput.value = "";
    if (descEl) {
        descEl.innerText = "Select an extra/blown account to remove permanently. OTP will be sent to " + (currentLoggedInUser || "your email") + ".";
    }

    if (selectEl) {
        selectEl.innerHTML = "";
        const removableIds = Object.keys(accounts).filter((id) => id !== "main");

        if (removableIds.length === 0) {
            selectEl.add(new Option("No removable accounts (Main is protected)", ""));
            selectEl.disabled = true;
        } else {
            selectEl.disabled = false;
            removableIds.forEach((accId) => {
                const acc = accounts[accId] || {};
                const eq = parseFloat(acc.startingEquity || 0).toFixed(2);
                const label = `${acc.name || accId} ($${eq})`;
                selectEl.add(new Option(label, accId));
            });
        }
    }

    if (modal) modal.classList.remove('hidden');
};

window.closeRemoveAccountModal = function() {
    if (removeOtpInterval) {
        clearInterval(removeOtpInterval);
        removeOtpInterval = null;
    }
    targetRemoveAccountId = "";
    removeGeneratedOtp = "";
    const modal = document.getElementById('removeAccountModal');
    if (modal) modal.classList.add('hidden');
};

window.sendRemoveAccountOtp = async function() {
    const selectEl = document.getElementById('remove-account-select');
    const selectedId = selectEl ? selectEl.value : "";
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile() || {};

    if (!selectedId || selectedId === "main") {
        window.showToast("Please select a valid non-main account to remove!", "error");
        return;
    }

    if (!currentLoggedInUser) {
        window.showToast("User session not found!", "error");
        return;
    }

    const accName = currentUserProfile.accounts?.[selectedId]?.name || selectedId;
    targetRemoveAccountId = selectedId;
    removeGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const formData = new FormData();
    formData.append("access_key", WEB3FORMS_KEY);
    formData.append("subject", "Trade Vault - Remove Account OTP");
    formData.append("email", currentLoggedInUser);
    formData.append(
        "message",
        `Your verification OTP to permanently remove account "${accName}" (${selectedId}) is: ${removeGeneratedOtp}\n\nThis OTP will expire in 1 minute. Do NOT enter it if you didn't request removal.`
    );

    try {
        const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
        const data = await response.json();

        if (data.success) {
            removeOtpGeneratedTime = Date.now();
            window.showToast("Removal OTP sent to your registered email!");

            const targetLabel = document.getElementById('remove-target-label');
            if (targetLabel) targetLabel.innerText = `Account to remove: ${accName}`;

            document.getElementById('remove-step-1').classList.add('hidden');
            document.getElementById('remove-step-2').classList.remove('hidden');

            let timeLeft = 60;
            const timerEl = document.getElementById('remove-otp-timer');
            if (timerEl) timerEl.innerText = `Expires in ${timeLeft}s`;

            if (removeOtpInterval) clearInterval(removeOtpInterval);
            removeOtpInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(removeOtpInterval);
                    removeOtpInterval = null;
                    if (timerEl) timerEl.innerText = "Expired";
                } else {
                    if (timerEl) timerEl.innerText = `Expires in ${timeLeft}s`;
                }
            }, 1000);
        } else {
            window.showToast("Failed to send OTP email.", "error");
        }
    } catch (e) {
        window.showToast("Network error: " + e.message, "error");
    }
};

window.verifyAndRemoveAccount = async function() {
    const enteredOtp = (document.getElementById('remove-otp-input')?.value || "").trim();
    const now = Date.now();

    if (!targetRemoveAccountId || targetRemoveAccountId === "main") {
        window.showToast("Invalid account selected for removal!", "error");
        return;
    }

    if (!removeGeneratedOtp || now - removeOtpGeneratedTime > 60000) {
        window.showToast("OTP Expired! Please request a new OTP.", "error");
        window.openRemoveAccountModal();
        return;
    }

    if (enteredOtp !== removeGeneratedOtp) {
        window.showToast("Incorrect OTP! Account was NOT removed.", "error");
        return;
    }

    if (removeOtpInterval) {
        clearInterval(removeOtpInterval);
        removeOtpInterval = null;
    }

    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile() || {};
    const accIdToDelete = targetRemoveAccountId;

    try {
        // 1. Delete all trades belonging to this accountId for current user
        const q = query(
            collection(db, "trades"),
            where("userEmail", "==", currentLoggedInUser),
            where("accountId", "==", accIdToDelete)
        );
        const snapshot = await getDocs(q);
        const deletePromises = [];
        snapshot.forEach((docSnap) => {
            deletePromises.push(deleteDoc(docSnap.ref));
        });
        await Promise.all(deletePromises);

        // 2. Remove account key from profile.accounts
        if (currentUserProfile.accounts && currentUserProfile.accounts[accIdToDelete]) {
            delete currentUserProfile.accounts[accIdToDelete];
        }

        // 3. Switch active account safely if deleted account was active
        if (currentUserProfile.activeAccountId === accIdToDelete) {
            const remainingIds = Object.keys(currentUserProfile.accounts || {});
            currentUserProfile.activeAccountId = remainingIds.includes("main")
                ? "main"
                : (remainingIds[0] || "main");
        }

        // Ensure 'main' exists in profile.accounts
        if (!currentUserProfile.accounts) currentUserProfile.accounts = {};
        if (!currentUserProfile.accounts["main"]) {
            currentUserProfile.accounts["main"] = {
                name: "Main Account",
                startingEquity: 0,
                createdAt: new Date().toISOString()
            };
        }

        await setDoc(doc(db, "profiles", currentLoggedInUser), currentUserProfile, { merge: true });
        window.setUserProfile(currentUserProfile);

        window.closeRemoveAccountModal();
        window.showToast("Account and its trades permanently removed!");

        if (typeof window.loadUserDataFromFirebase === 'function') window.loadUserDataFromFirebase();
        window.updateActiveAccountDropdown();
    } catch (e) {
        window.showToast("Error removing account: " + e.message, "error");
    }
};

window.openResetModal = function() {
    const currentLoggedInUser = window.getCurrentUser();
    document.getElementById('reset-step-1').classList.remove('hidden');
    document.getElementById('reset-step-2').classList.add('hidden');
    document.getElementById('reset-step-3').classList.add('hidden');
    document.getElementById('reset-otp-input').value = "";
    document.getElementById('reset-account-equity').value = "";
    document.getElementById('reset-modal-desc').innerText = "Clicking send OTP will dispatch a verification code to " + currentLoggedInUser;
    document.getElementById('resetAccountModal').classList.remove('hidden');

    if (otpInterval) {
        clearInterval(otpInterval);
    }
};

window.sendResetOtp = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const formData = new FormData();
    formData.append("access_key", WEB3FORMS_KEY);
    formData.append("subject", "Trade Vault - Account Reset OTP");
    formData.append("email", currentLoggedInUser);
    formData.append("message", "Your verification code to reset/wipe your account data is: " + generatedOtp + "\n\nThis OTP will expire in 1 minute.");

    try {
        const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
        const data = await response.json();

        if (data.success) {
            otpGeneratedTime = Date.now();
            window.showToast("OTP sent to your registered email!");
            document.getElementById('reset-step-1').classList.add('hidden');
            document.getElementById('reset-step-2').classList.remove('hidden');
            let timeLeft = 60;
            document.getElementById('otp-timer').innerText = `Expires in ${timeLeft}s`;

            otpInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(otpInterval);
                    document.getElementById('otp-timer').innerText = "Expired";
                } else {
                    document.getElementById('otp-timer').innerText = `Expires in ${timeLeft}s`;
                }
            }, 1000);
        } else {
            window.showToast("Failed to send email.", "error");
        }
    } catch (e) {
        window.showToast("Network error: " + e.message, "error");
    }
};

window.verifyAndResetAccount = function() {
    const enteredOtp = document.getElementById('reset-otp-input').value.trim();
    const now = Date.now();

    if (now - otpGeneratedTime > 60000) {
        window.showToast("OTP Expired! Please request a new one.", "error");
        window.openResetModal();
        return;
    }

    if (enteredOtp !== generatedOtp) {
        window.showToast("Incorrect OTP code entered!", "error");
        return;
    }

    if (otpInterval) {
        clearInterval(otpInterval);
    }

    document.getElementById('reset-step-2').classList.add('hidden');
    document.getElementById('reset-step-3').classList.remove('hidden');
};

window.finalizeReset = async function(choice) {
    const newEquity = parseFloat(document.getElementById('reset-account-equity').value) || 0;
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();

    try {
        if (choice === 'wipe') {
            window.showToast("Wiping database permanently...", "success");
            const q = query(collection(db, "trades"), where("userEmail", "==", currentLoggedInUser));
            const snapshot = await getDocs(q);
            const deletePromises = [];

            snapshot.forEach((docSnap) => {
                deletePromises.push(deleteDoc(docSnap.ref));
            });
            await Promise.all(deletePromises);
        }

        const newAccId = 'acc_reset_' + Date.now();
        currentUserProfile.activeAccountId = newAccId;

        if (!currentUserProfile.accounts) {
            currentUserProfile.accounts = {};
        }

        currentUserProfile.accounts[newAccId] = {
            name: "Reset Workspace",
            startingEquity: newEquity,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "profiles", currentLoggedInUser), currentUserProfile, { merge: true });
        window.setUserProfile(currentUserProfile);
        document.getElementById('resetAccountModal').classList.add('hidden');

        if (choice === 'keep') {
            window.showToast("Dashboard reset! Old data safely kept in Calendar.");
        } else {
            window.showToast("Account wiped completely!");
        }

        if (typeof window.loadUserDataFromFirebase === 'function') window.loadUserDataFromFirebase();
        window.updateActiveAccountDropdown();
    } catch (e) {
        window.showToast("Error finalizing reset: " + e.message, "error");
    }
};

window.updateActiveAccountBadge = function() {
    const currentUserProfile = window.getUserProfile();
    const badge = document.getElementById('active-account-badge');
    const ind = document.getElementById('active-account-indicator');
    const amDisplay = document.getElementById('am-active-account');

    let accName = "Main Account";
    if (currentUserProfile.accounts && currentUserProfile.accounts[currentUserProfile.activeAccountId]) {
        accName = currentUserProfile.accounts[currentUserProfile.activeAccountId].name;
    } else if (currentUserProfile.activeAccountId && currentUserProfile.activeAccountId.includes('reset')) {
        accName = "Reset Workspace";
    }

    if (badge) badge.innerText = "Active: " + accName;
    if (ind) ind.innerText = "Account: " + accName;
    if (amDisplay) amDisplay.innerText = accName;
};
