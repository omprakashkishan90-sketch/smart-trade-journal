import { auth, provider, db } from './firebase-config.js';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CORRECT_PASS = "Xauusd @123";
// Mobile/popup issue aaye toh true rakho, popup chalana ho toh false kar sakte ho
const USE_REDIRECT_LOGIN = true;

let currentLoggedInUser = "";
let tempAdvancedPfpData = "";
let currentUserProfile = {
    username: "Fx_arjun",
    pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fx_arjun",
    activeAccountId: "main",
    accounts: {}
};

window.getCurrentUser = () => currentLoggedInUser;
window.setCurrentUser = (u) => { currentLoggedInUser = u; };
window.getUserProfile = () => currentUserProfile;
window.setUserProfile = (p) => { currentUserProfile = p; };

window.toggleTheme = function() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.setItem('tradeVaultTheme', isDark ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerText = isDark ? '☀️' : '🌙';
};

if (
    localStorage.getItem('tradeVaultTheme') === 'dark' ||
    (!('tradeVaultTheme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
    document.documentElement.classList.add('dark');
    document.addEventListener('DOMContentLoaded', () => {
        const icon = document.getElementById('theme-icon');
        if (icon) icon.innerText = '☀️';
    });
}

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-blue-600';
    const icon = type === 'error' ? '❌' : '✅';

    toast.className = `flex items-center gap-3 px-5 py-4 ${bgColor} text-white rounded-2xl shadow-2xl pointer-events-auto toast-enter z-[9999]`;
    toast.innerHTML = `<span class="text-lg">${icon}</span><span class="text-sm font-bold tracking-wide">${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('avatar-dropdown');
    const avatarDiv = document.querySelector('.relative .cursor-pointer');
    if (
        dropdown &&
        !dropdown.classList.contains('hidden') &&
        avatarDiv &&
        !avatarDiv.contains(event.target) &&
        !dropdown.contains(event.target)
    ) {
        dropdown.classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user && redirectResult.user.email) {
            await logVisitorAndEnter(redirectResult.user.email, "Google Redirect Login");
            return;
        }
    } catch (e) {
        console.error("Redirect Result Error:", e);
        window.showToast(e?.code ? `Google Error: ${e.code}` : "Google Redirect Error", "error");
    }

    const savedUser = localStorage.getItem('tradeVaultUser');
    if (savedUser) {
        currentLoggedInUser = savedUser;
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainApp) {
            mainApp.classList.remove('hidden');
            setTimeout(() => mainApp.classList.remove('opacity-0'), 50);
        }
        const dropEmail = document.getElementById('dropdown-email');
        if (dropEmail) dropEmail.innerText = savedUser;

        await window.loadUserProfileFromFirebase();
        const activityBtn = document.getElementById('btn-activity');
        if (
            activityBtn &&
            (savedUser.toLowerCase() === "fxarjun812@gmail.com" || savedUser.toLowerCase() === "fx arjun")
        ) {
            activityBtn.classList.remove('hidden');
            activityBtn.classList.add('flex');
        }
        if (typeof window.initApp === 'function') window.initApp();
    }
});

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
    if (overlay) overlay.classList.toggle('hidden');
};

window.logout = function() {
    localStorage.removeItem('tradeVaultUser');
    auth.signOut().then(() => {
        window.location.reload();
    }).catch(() => {
        window.location.reload();
    });
};

window.loginWithGoogle = async function() {
    try {
        if (USE_REDIRECT_LOGIN) {
            window.showToast("Redirecting to Google...");
            await signInWithRedirect(auth, provider);
            return;
        }

        const result = await signInWithPopup(auth, provider);
        if (result && result.user && result.user.email) {
            await logVisitorAndEnter(result.user.email, "Google Login");
        }
    } catch (e) {
        console.error("Google Sign-In Error:", e);
        if (!USE_REDIRECT_LOGIN && (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment')) {
            try {
                await signInWithRedirect(auth, provider);
                return;
            } catch (redirectErr) {
                console.error("Fallback Redirect Error:", redirectErr);
            }
        }
        window.showToast(e?.code ? `Google Error: ${e.code}` : "Google Error", "error");
    }
};

window.handleUserPassLogin = async function() {
    const uInputEl = document.getElementById('login-username');
    const pInputEl = document.getElementById('login-password');
    const uInput = uInputEl ? uInputEl.value.trim().toLowerCase() : "";
    const pInput = pInputEl ? pInputEl.value : "";

    if ((uInput === "fx arjun" || uInput === "fxarjun") && pInput === CORRECT_PASS) {
        await logVisitorAndEnter("fxarjun812@gmail.com", "Master Credentials 🔒");
    } else {
        if (uInput !== "") {
            try {
                await addDoc(collection(db, "visitors"), {
                    username: uInput + " (Wrong)",
                    loginTime: new Date().toLocaleString(),
                    status: "Failed Attempt ❌"
                });
            } catch (e) {}
        }
        window.showToast("Incorrect Username or Password!", "error");
    }
};

async function logVisitorAndEnter(identifier, method) {
    currentLoggedInUser = identifier;
    localStorage.setItem('tradeVaultUser', identifier);
    const dropEmail = document.getElementById('dropdown-email');
    if (dropEmail) dropEmail.innerText = identifier;

    try {
        await addDoc(collection(db, "visitors"), {
            username: identifier,
            loginTime: new Date().toLocaleString(),
            status: method
        });
    } catch (e) {}

    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) {
        mainApp.classList.remove('hidden');
        setTimeout(() => mainApp.classList.remove('opacity-0'), 50);
    }

    await window.loadUserProfileFromFirebase();
    const activityBtn = document.getElementById('btn-activity');

    if (
        activityBtn &&
        (identifier.toLowerCase() === "fxarjun812@gmail.com" || identifier.toLowerCase() === "fx arjun")
    ) {
        activityBtn.classList.remove('hidden');
        activityBtn.classList.add('flex');
    }
    if (typeof window.initApp === 'function') window.initApp();
}

window.loadUserProfileFromFirebase = async function() {
    try {
        const docRef = doc(db, "profiles", currentLoggedInUser);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentUserProfile = docSnap.data();
        } else {
            currentUserProfile = {
                username: currentLoggedInUser.split('@')[0],
                pfp: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentLoggedInUser}`,
                experience: "1-3 Years",
                phase: "Learning",
                isProfitable: "No",
                isPublic: false,
                activeAccountId: "main",
                accounts: { "main": { name: "Main Account", startingEquity: 0 } }
            };
            await setDoc(docRef, currentUserProfile);
        }
    } catch (e) {
        currentUserProfile = {
            username: currentLoggedInUser.split('@')[0],
            pfp: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentLoggedInUser}`,
            experience: "1-3 Years",
            phase: "Learning",
            isProfitable: "No",
            isPublic: false,
            activeAccountId: "main",
            accounts: { "main": { name: "Main Account", startingEquity: 0 } }
        };
    }

    currentUserProfile.activeAccountId = currentUserProfile.activeAccountId || "main";

    if (!currentUserProfile.accounts || Object.keys(currentUserProfile.accounts).length === 0) {
        currentUserProfile.accounts = { "main": { name: "Main Account", startingEquity: 0 } };
    }

    const dispName = document.getElementById('user-display-name');
    const welcName = document.getElementById('welcome-user-name');
    const avatarImg = document.getElementById('header-avatar-img');
    if (dispName) dispName.innerText = currentUserProfile.username;
    if (welcName) welcName.innerText = currentUserProfile.username;
    if (avatarImg) avatarImg.src = currentUserProfile.pfp;

    if (typeof window.updateActiveAccountDropdown === 'function') {
        window.updateActiveAccountDropdown();
    }
};

window.openAdvancedProfile = function() {
    const page = document.getElementById('advanced-profile-page');
    if (!page) return;
    const dropdown = document.getElementById('avatar-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    page.classList.remove('hidden');
    page.classList.add('flex');

    const emailEl = document.getElementById('ap-email');
    const userEl = document.getElementById('ap-username');
    const expEl = document.getElementById('ap-experience');
    const phaseEl = document.getElementById('ap-phase');
    const profEl = document.getElementById('ap-profitable');
    const dropText = document.getElementById('ap-dropzone-text');
    const previewEl = document.getElementById('ap-pfp-preview');

    if (emailEl) emailEl.value = currentLoggedInUser;
    if (userEl) userEl.value = currentUserProfile.username || "";
    if (expEl) expEl.value = currentUserProfile.experience || "1-3 Years";
    if (phaseEl) phaseEl.value = currentUserProfile.phase || "Learning";
    if (profEl) profEl.value = currentUserProfile.isProfitable || "No";

    tempAdvancedPfpData = "";
    if (dropText) dropText.innerHTML = `Click to upload Avatar`;
    if (previewEl) previewEl.classList.add('hidden');
};

window.closeAdvancedProfile = function() {
    const page = document.getElementById('advanced-profile-page');
    if (!page) return;
    page.classList.add('hidden');
    page.classList.remove('flex');
};

window.handleAdvancedPfpUpload = function() {
    const input = document.getElementById('ap-pfp-input-file');
    const dropzoneText = document.getElementById('ap-dropzone-text');
    const previewOverlay = document.getElementById('ap-pfp-preview');

    if (input && input.files && input.files[0]) {
        const file = input.files[0];
        if (dropzoneText) dropzoneText.innerText = "Selected: " + file.name;

        const reader = new FileReader();
        reader.onload = function(e) {
            tempAdvancedPfpData = e.target.result;
            if (previewOverlay) {
                previewOverlay.style.backgroundImage = `url('${tempAdvancedPfpData}')`;
                previewOverlay.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

window.saveAdvancedProfile = async function() {
    const newNameEl = document.getElementById('ap-username');
    const newName = newNameEl ? newNameEl.value.trim() : "";

    if (!newName) {
        window.showToast("Trader name cannot be empty!", "error");
        return;
    }

    currentUserProfile.username = newName;
    currentUserProfile.experience = document.getElementById('ap-experience').value;
    currentUserProfile.phase = document.getElementById('ap-phase').value;
    currentUserProfile.isProfitable = document.getElementById('ap-profitable').value;

    if (tempAdvancedPfpData !== "") {
        currentUserProfile.pfp = tempAdvancedPfpData;
    }

    try {
        await setDoc(doc(db, "profiles", currentLoggedInUser), currentUserProfile, { merge: true });
        window.showToast("Profile Updated Successfully!");
        window.closeAdvancedProfile();
        await window.loadUserProfileFromFirebase();

        const lbTab = document.getElementById('tab-leaderboard');
        if (lbTab && lbTab.classList.contains('active') && typeof window.loadLeaderboardData === 'function') {
            window.loadLeaderboardData();
        }
    } catch (e) {
        window.showToast("Error: " + e.message, "error");
    }
};

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    document.querySelectorAll('nav button').forEach(btn => {
        if (!btn.onclick || (!btn.onclick.toString().includes('openAddNewAccount') && !btn.onclick.toString().includes('openResetModal'))) {
            btn.classList.remove('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-400');
            btn.classList.add('text-slate-600', 'dark:text-slate-400');
        }
    });

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
        activeBtn.classList.add('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-400');
    }

    const titles = {
        'dashboard': 'Dashboard',
        'mytrades': 'Trading Calendar & Reports',
        'account': 'Account Manager',
        'strategies': 'Strategy Management',
        'logtrade': 'Log Execution',
        'leaderboard': 'Weekly Champions',
        'activity': 'System Security Logs',
        'aicoach': 'AI Trading Coach'
    };

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.innerText = titles[tabId] || 'Dashboard';

    if (tabId === 'mytrades' && window.calendarInstance) {
        setTimeout(() => { window.calendarInstance.render(); }, 100);
    }
    if (tabId === 'leaderboard' && typeof window.loadLeaderboardData === 'function') {
        window.loadLeaderboardData();
    }
    if (tabId === 'activity' && typeof window.loadVisitorActivity === 'function') {
        window.loadVisitorActivity();
    }
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            window.toggleSidebar();
        }
    }
};
