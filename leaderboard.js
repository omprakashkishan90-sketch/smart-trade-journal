import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let globalProfilesMap = {};
let globalTraderStats = {};

window.loadLeaderboardData = async function() {
    const podiumEl = document.getElementById('leaderboard-podium');
    const challengersEl = document.getElementById('leaderboard-challengers');
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();

    if (!podiumEl || !challengersEl) return;

    podiumEl.innerHTML = `<div class="text-center text-slate-400 w-full py-6 text-xs font-bold">Loading standings...</div>`;
    challengersEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs font-bold">Loading challengers...</td></tr>`;

    try {
        const profileSnap = await getDocs(collection(db, "profiles"));
        globalProfilesMap = {};
        let tradersMap = {};

        profileSnap.forEach(docSnap => {
            let data = docSnap.data();
            let email = docSnap.id;
            globalProfilesMap[email] = data;

            tradersMap[email] = {
                email: email,
                username: data.username || email.split('@')[0],
                pfp: data.pfp || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                totalPips: 0,
                totalTrades: 0,
                totalPL: 0
            };
        });

        const snapshot = await getDocs(collection(db, "trades"));
        globalTraderStats = {};

        const now = new Date();
        let day = now.getDay();
        let hour = now.getHours();
        let daysToSubtract = day;

        if (day === 0 && hour < 3) {
            daysToSubtract = 7;
        }

        let lastSunday = new Date(now);
        lastSunday.setDate(now.getDate() - daysToSubtract);
        lastSunday.setHours(3, 0, 0, 0);
        const weekStartTimestamp = lastSunday.getTime();

        snapshot.forEach((docSnap) => {
            const t = docSnap.data();
            let email = t.userEmail || "fxarjun812@gmail.com";

            let tradeTime = 0;
            if (t.timestamp && typeof t.timestamp.toDate === 'function') {
                tradeTime = t.timestamp.toDate().getTime();
            } else if (t.date) {
                tradeTime = new Date(t.date).getTime();
            }

            if (tradeTime >= weekStartTimestamp) {
                let entry = parseFloat(t.entry) || 0;
                let exitP = parseFloat(t.exitPrice) || parseFloat(t.tp) || 0;
                let points = 0;

                if (entry > 0 && exitP > 0) {
                    points = t.direction === 'sell' ? (entry - exitP) : (exitP - entry);
                }

                let plAmt = parseFloat(t.amount || 0);

                if (!tradersMap[email]) {
                    tradersMap[email] = {
                        email: email,
                        username: email.split('@')[0],
                        pfp: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                        totalPips: 0,
                        totalTrades: 0,
                        totalPL: 0
                    };
                }

                tradersMap[email].totalPips += points;
                tradersMap[email].totalTrades += 1;
                tradersMap[email].totalPL += plAmt;
            }
        });

        let leaderboardArray = Object.values(tradersMap).sort((a, b) => b.totalPips - a.totalPips);

        if (leaderboardArray.length === 0) {
            leaderboardArray = [{
                email: currentLoggedInUser,
                username: currentUserProfile.username,
                pfp: currentUserProfile.pfp,
                totalPips: 0,
                totalTrades: 0,
                totalPL: 0
            }];
        }

        leaderboardArray.forEach(t => {
            globalTraderStats[t.email] = {
                pips: t.totalPips,
                growth: ((t.totalPL / 1000) * 100).toFixed(1)
            };
        });

        podiumEl.innerHTML = "";
        challengersEl.innerHTML = "";

        let top3 = leaderboardArray.slice(0, 3);
        let rest = leaderboardArray;

        let rankConfigs = [
            { rank: 2, emoji: "🥈", border: "border-slate-300", height: "h-52 md:h-60", width: "w-32 md:w-48", labelColor: "text-slate-500" },
            { rank: 1, emoji: "🥇", border: "border-amber-400 shadow-xl", height: "h-60 md:h-72", width: "w-36 md:w-56", labelColor: "text-amber-500", isFirst: true },
            { rank: 3, emoji: "🥉", border: "border-amber-700", height: "h-44 md:h-52", width: "w-32 md:w-48", labelColor: "text-amber-700" }
        ];

        let podiumOrder = [
            top3[1] || { email: 'empty2', username: "-", pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=2", totalPips: 0, totalTrades: 0, totalPL: 0 },
            top3[0] || { email: currentLoggedInUser, username: currentUserProfile.username, pfp: currentUserProfile.pfp, totalPips: 0, totalTrades: 0, totalPL: 0 },
            top3[2] || { email: 'empty3', username: "-", pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=3", totalPips: 0, totalTrades: 0, totalPL: 0 }
        ];

        podiumOrder.forEach((trader, idx) => {
            if (trader.username === "-") return;

            let cfg = rankConfigs[idx];
            let pipsText = (trader.totalPips >= 0 ? '+' : '') + trader.totalPips.toFixed(1) + " Pts";

            podiumEl.innerHTML += `
            <div onclick="window.viewTraderProfile('${trader.email}')" class="cursor-pointer hover:-translate-y-1 transition-all flex flex-col items-center bg-white dark:bg-slate-800 p-4 rounded-t-[24px] border-t-4 ${cfg.border} ${cfg.width} ${cfg.height} justify-end relative shadow-xs">
                <div class="text-3xl md:text-4xl absolute -top-5 md:-top-6">${cfg.emoji}</div>
                <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden border-2 border-white dark:border-slate-700 mb-2 shadow-sm shrink-0">
                    <img src="${trader.pfp}" class="w-full h-full object-cover">
                </div>
                <h3 class="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white truncate max-w-full">${trader.username}</h3>
                <p class="text-emerald-600 dark:text-emerald-400 font-black text-xs md:text-sm mt-0.5">${pipsText}</p>
                <span class="text-[9px] ${cfg.labelColor} font-black mt-1 uppercase tracking-wider">Rank ${cfg.rank}</span>
            </div>`;
        });

        if (rest.length === 0) {
            challengersEl.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 italic text-xs">No challengers yet.</td></tr>`;
        } else {
            rest.forEach((trader, i) => {
                let rankNum = i + 1;
                let pipsText = (trader.totalPips >= 0 ? '+' : '') + trader.totalPips.toFixed(1) + " Pts";

                challengersEl.innerHTML += `
                <tr onclick="window.viewTraderProfile('${trader.email}')" class="cursor-pointer border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    <td class="p-4.5 text-slate-400 font-black text-center">#${rankNum}</td>
                    <td class="p-4.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                            <img src="${trader.pfp}" class="w-full h-full object-cover">
                        </div>
                        <span>${trader.username}</span>
                    </td>
                    <td class="p-4.5 text-slate-500 hidden sm:table-cell text-center font-bold text-xs">${trader.totalTrades}</td>
                    <td class="p-4.5 text-right pr-7 text-emerald-600 dark:text-emerald-400 font-black text-sm">${pipsText}</td>
                </tr>`;
            });
        }
    } catch (e) {
        console.log(e);
    }
};

window.viewTraderProfile = function(email) {
    if (!email || email.includes('empty')) return;

    const profile = globalProfilesMap[email] || {
        username: email.split('@')[0],
        pfp: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        isPublic: false
    };

    const stats = globalTraderStats[email] || { pips: 0, growth: 0 };

    document.getElementById('pp-username').innerText = profile.username;
    document.getElementById('pp-avatar').src = profile.pfp;
    document.getElementById('pp-pips').innerText = (stats.pips >= 0 ? '+' : '') + parseFloat(stats.pips).toFixed(1) + ' Pts This Week';

    if (profile.isPublic === true) {
        document.getElementById('pp-private-msg').classList.add('hidden');
        document.getElementById('pp-public-details').classList.remove('hidden');
        document.getElementById('pp-exp').innerText = profile.experience || '-';
        document.getElementById('pp-phase').innerText = profile.phase || '-';

        const profEl = document.getElementById('pp-prof');
        if (profEl) {
            if (profile.isProfitable === 'Yes') {
                profEl.innerText = 'Yes';
                profEl.className = 'text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded';
            } else {
                profEl.innerText = 'No';
                profEl.className = 'text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded';
            }
        }
    } else {
        document.getElementById('pp-private-msg').classList.remove('hidden');
        document.getElementById('pp-public-details').classList.add('hidden');
    }

    document.getElementById('publicProfileModal').classList.remove('hidden');
};

window.openCertificateModal = function(username) {
    document.getElementById('cert-username').innerText = username;
    document.getElementById('certificateModal').classList.remove('hidden');
};

window.closeCertificateModal = function() {
    document.getElementById('certificateModal').classList.add('hidden');
};

window.loadVisitorActivity = async function() {
    const tableBody = document.getElementById('visitor-activity-table');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400">Loading activity logs...</td></tr>`;

    try {
        const snapshot = await getDocs(collection(db, "visitors"));
        tableBody.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            tableBody.innerHTML += `
            <tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <td class="p-4 font-black text-slate-900 dark:text-white">${v.username}</td>
                <td class="p-4 text-slate-500 dark:text-slate-400 text-xs font-semibold">${v.loginTime}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg ${v.status.includes('Master') || v.status.includes('Google') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}">${v.status}</span>
                </td>
            </tr>`;
        });
    } catch (e) {
        console.log(e);
    }
};
