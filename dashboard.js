import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let globalTradesCache = [];
let strategiesCache = [];

window.getTradesCache = () => globalTradesCache;
window.setTradesCache = (trades) => { globalTradesCache = trades; };
window.getStrategiesCache = () => strategiesCache;
window.setStrategiesCache = (strats) => { strategiesCache = strats; };

window.loadUserDataFromFirebase = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();
    if (!currentLoggedInUser) return;

    try {
        const qStrat = query(collection(db, "strategies"), where("userEmail", "==", currentLoggedInUser));
        const stratSnapshot = await getDocs(qStrat);
        const dropdown = document.getElementById('strategy-dropdown');

        if (dropdown) dropdown.innerHTML = "";
        strategiesCache = [];

        stratSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            strategiesCache.push(data);
            if (data.name && dropdown) {
                dropdown.add(new Option(data.name, data.name));
            }
        });

        if (dropdown && dropdown.options.length === 0) {
            dropdown.add(new Option("SMC (Default)", "SMC"));
        }

        const q = query(collection(db, "trades"), where("userEmail", "==", currentLoggedInUser));
        const tradeSnapshot = await getDocs(q);

        globalTradesCache = [];
        let activeAccountTrades = [];
        if (window.calendarInstance) {
            window.calendarInstance.removeAllEvents();
        }

        let validTradesForWinRate = 0, wins = 0, netPl = 0, totalLoggedTrades = 0;
        let strategyStats = {};
        let dayStats = { "Sunday": 0, "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0 };
        let biggestWinAmt = 0;

        tradeSnapshot.forEach((docSnap) => {
            const t = docSnap.data();

            if (!t.asset || t.asset === 'undefined') {
                t.asset = 'XAUUSD';
            }

            globalTradesCache.push(t);

            let tradeAccId = t.accountId || 'main';
            const isCurrentAccount = (tradeAccId === currentUserProfile.activeAccountId);

            if (isCurrentAccount) {
                activeAccountTrades.push(t);
                totalLoggedTrades++;

                const amt = parseFloat(t.amount || 0);
                netPl += amt;

                const isBreakEven = (amt >= -1.00 && amt <= 1.00);

                if (!isBreakEven) {
                    validTradesForWinRate++;
                    if (amt > 1.00) {
                        wins++;
                    }
                }

                if (t.strategy && !isBreakEven) {
                    if (!strategyStats[t.strategy]) {
                        strategyStats[t.strategy] = 0;
                    }
                    strategyStats[t.strategy] += amt;
                }

                if (t.date && !isBreakEven) {
                    const d = new Date(t.date);
                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dayName = days[d.getDay()];
                    dayStats[dayName] += amt;
                }

                if (amt > biggestWinAmt) {
                    biggestWinAmt = amt;
                }

                let bgColor = '#64748b';
                let borderColor = '#475569';
                let prefix = (amt >= 0 ? '+$' : '-$');

                if (!isBreakEven) {
                    bgColor = amt > 0 ? '#10b981' : '#f43f5e';
                    borderColor = amt > 0 ? '#059669' : '#e11d48';
                }

                if (window.calendarInstance) {
                    window.calendarInstance.addEvent({
                        title: prefix + Math.abs(amt).toFixed(0) + (isBreakEven ? ' (CTC)' : ''),
                        start: t.date,
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        extendedProps: { trade: t }
                    });
                }
            }
        });

        globalTradesCache.sort((a, b) => {
            let timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : new Date(a.date).getTime();
            let timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : new Date(b.date).getTime();
            return timeA - timeB;
        });

        const totalTradesEl = document.getElementById('dash-totaltrades');
        if (totalTradesEl) totalTradesEl.innerText = totalLoggedTrades;

        const netPlEl = document.getElementById('dash-netpl');
        if (netPlEl) {
            netPlEl.innerText = (netPl >= 0 ? '+$' : '-$') + Math.abs(netPl).toFixed(2);
            netPlEl.className = "text-2xl md:text-3xl font-black tracking-tight relative z-10 " + (netPl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");
        }

        let startingEq = 0;
        if (currentUserProfile.accounts && currentUserProfile.accounts[currentUserProfile.activeAccountId]) {
            startingEq = parseFloat(currentUserProfile.accounts[currentUserProfile.activeAccountId].startingEquity) || 0;
        }

        const totalEquity = startingEq + netPl;
        const eqEl = document.getElementById('dash-equity');
        if (eqEl) eqEl.innerText = "$" + totalEquity.toFixed(2);

        let growthPercentage = 0;
        if (startingEq > 0) {
            growthPercentage = (netPl / startingEq) * 100;
        }

        const growthText = document.getElementById('dash-growth-text');
        const growthBar = document.getElementById('dash-growth-bar');

        if (growthText && growthBar) {
            growthText.innerText = (growthPercentage >= 0 ? '+' : '') + growthPercentage.toFixed(2) + "%";
            growthText.className = "text-2xl font-black " + (growthPercentage >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400");

            let visualWidth = Math.min(Math.abs(growthPercentage), 100);
            growthBar.style.width = visualWidth + "%";
            growthBar.className = "h-4 rounded-full transition-all duration-1000 relative " + (growthPercentage >= 0 ? "bg-emerald-500" : "bg-rose-500");
        }

        let winRate = validTradesForWinRate > 0 ? Math.round((wins / validTradesForWinRate) * 100) : 0;
        const winRateText = document.getElementById('dash-winrate-text');
        const winRateBar = document.getElementById('dash-winrate-bar');
        if (winRateText) winRateText.innerText = winRate + "%";
        if (winRateBar) winRateBar.style.width = winRate + "%";

        let bestStrategy = "-";
        let maxStratPL = -Infinity;
        for (let s in strategyStats) {
            if (strategyStats[s] > maxStratPL && strategyStats[s] > 0) {
                maxStratPL = strategyStats[s];
                bestStrategy = s;
            }
        }

        let bestDay = "-";
        let maxDayPL = -Infinity;
        for (let d in dayStats) {
            if (dayStats[d] > maxDayPL && dayStats[d] > 0) {
                maxDayPL = dayStats[d];
                bestDay = d;
            }
        }

        const bestStratEl = document.getElementById('ai-best-strat');
        const bestDayEl = document.getElementById('ai-best-day');
        const biggestWinEl = document.getElementById('ai-biggest-win');

        if (bestStratEl) bestStratEl.innerText = maxStratPL > 0 ? bestStrategy : "-";
        if (bestDayEl) bestDayEl.innerText = maxDayPL > 0 ? bestDay : "-";
        if (biggestWinEl) biggestWinEl.innerText = biggestWinAmt > 0 ? "+$" + biggestWinAmt.toFixed(2) : "$0.00";

        const recentContainer = document.getElementById('dash-recent-trades');
        if (!recentContainer) return;
        recentContainer.innerHTML = "";

        activeAccountTrades.sort((a, b) => {
            let timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : new Date(a.date).getTime();
            let timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : new Date(b.date).getTime();
            return timeB - timeA;
        });

        const recentTrades = activeAccountTrades.slice(0, 5);

        if (recentTrades.length === 0) {
            recentContainer.innerHTML = "<p class='text-xs text-slate-400 italic text-center mt-6 font-semibold'>No recent trades found.</p>";
        } else {
            recentTrades.forEach(t => {
                const amt = parseFloat(t.amount || 0);
                const isBreakEven = (amt >= -1.00 && amt <= 1.00);

                let bgColor = 'bg-slate-50 dark:bg-slate-800';
                let textColor = 'text-slate-600 dark:text-slate-400';

                if (!isBreakEven) {
                    const isWin = amt > 0;
                    bgColor = isWin ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20';
                    textColor = isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                }

                const sign = amt >= 0 ? '+' : '-';

                recentContainer.innerHTML += `
                <div class="flex justify-between items-center p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition border border-transparent hover:border-slate-100 dark:hover:border-slate-700 shadow-2xs group">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl ${bgColor} ${textColor} flex items-center justify-center font-black text-[10px] uppercase shadow-sm">
                            ${t.direction === 'buy' ? 'B' : 'S'}
                        </div>
                        <div>
                            <p class="text-sm font-black text-slate-900 dark:text-white leading-tight">${t.asset || 'XAUUSD'}</p>
                            <p class="text-[9px] font-bold text-slate-400 mt-0.5">${t.date} ${isBreakEven ? '(CTC)' : ''}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black ${textColor}">${sign}$${Math.abs(amt).toFixed(2)}</p>
                        <p class="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">${t.emotion || 'Neutral'}</p>
                    </div>
                </div>`;
            });
        }
    } catch (e) {
        console.log(e);
    }
};
