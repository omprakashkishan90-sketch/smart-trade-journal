import { auth, provider, db } from './firebase-config.js';
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CORRECT_PASS = "Xauusd @123";

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

if (localStorage.getItem('tradeVaultTheme') === 'dark' || (!('tradeVaultTheme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
    if (dropdown && !dropdown.classList.contains('hidden') && avatarDiv && !avatarDiv.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('tradeVaultUser');
    if (savedUser) {
        currentLoggedInUser = savedUser;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        setTimeout(() => document.getElementById('main-app').classList.remove('opacity-0'), 50);
        document.getElementById('dropdown-email').innerText = savedUser;

        window.loadUserProfileFromFirebase().then(() => {
            const activityBtn = document.getElementById('btn-activity');
            if (savedUser.toLowerCase() === "fxarjun812@gmail.com" || savedUser.toLowerCase() === "fx arjun") {
                activityBtn.classList.remove('hidden');
                activityBtn.classList.add('flex');
            }
            if (typeof window.initApp === 'function') window.initApp();
        });
    }
});

window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
};

window.logout = function() {
    localStorage.removeItem('tradeVaultUser');
    auth.signOut().then(() => {
        window.location.reload();
    });
};

window.loginWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        if (result && result.user) {
            await logVisitorAndEnter(result.user.email, "Google Login");
        }
    } catch (e) {
        window.showToast("Google Error", "error");
    }
};

window.handleUserPassLogin = async function() {
    const uInput = document.getElementById('login-username').value.trim().toLowerCase();
    const pInput = document.getElementById('login-password').value;

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
    document.getElementById('dropdown-email').innerText = identifier;

    try {
        await addDoc(collection(db, "visitors"), {
            username: identifier,
            loginTime: new Date().toLocaleString(),
            status: method
        });
    } catch (e) {}

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => document.getElementById('main-app').classList.remove('opacity-0'), 50);

    await window.loadUserProfileFromFirebase();
    const activityBtn = document.getElementById('btn-activity');

    if (identifier.toLowerCase() === "fxarjun812@gmail.com" || identifier.toLowerCase() === "fx arjun") {
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

    document.getElementById('user-display-name').innerText = currentUserProfile.username;
    document.getElementById('welcome-user-name').innerText = currentUserProfile.username;
    document.getElementById('header-avatar-img').src = currentUserProfile.pfp;
    if (typeof window.updateActiveAccountDropdown === 'function') {
        window.updateActiveAccountDropdown();
    }
};

window.openAdvancedProfile = function() {
    const page = document.getElementById('advanced-profile-page');
    if (!page) return;
    document.getElementById('avatar-dropdown').classList.add('hidden');
    page.classList.remove('hidden');
    page.classList.add('flex');
    document.getElementById('ap-email').value = currentLoggedInUser;
    document.getElementById('ap-username').value = currentUserProfile.username || "";
    document.getElementById('ap-experience').value = currentUserProfile.experience || "1-3 Years";
    document.getElementById('ap-phase').value = currentUserProfile.phase || "Learning";
    document.getElementById('ap-profitable').value = currentUserProfile.isProfitable || "No";

    tempAdvancedPfpData = "";
    document.getElementById('ap-dropzone-text').innerHTML = `Click to upload Avatar`;
    document.getElementById('ap-pfp-preview').classList.add('hidden');
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

    if (input.files && input.files[0]) {
        const file = input.files[0];
        dropzoneText.innerText = "Selected: " + file.name;

        const reader = new FileReader();
        reader.onload = function(e) {
            tempAdvancedPfpData = e.target.result;
            previewOverlay.style.backgroundImage = `url('${tempAdvancedPfpData}')`;
            previewOverlay.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
};

window.saveAdvancedProfile = async function() {
    const newName = document.getElementById('ap-username').value.trim();

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

        if (document.getElementById('tab-leaderboard').classList.contains('active') && typeof window.loadLeaderboardData === 'function') {
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

    document.getElementById('tab-' + tabId).classList.add('active');
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

    document.getElementById('header-title').innerText = titles[tabId] || 'Dashboard';

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
        if (!sidebar.classList.contains('-translate-x-full')) {
            window.toggleSidebar();
        }
    }
};
