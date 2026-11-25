const WEB3FORMS_KEY = "8e21fed3-cf5f-4858-a3ef-cdcf9fe34c96";

window.openLightbox = function(imageSrc) {
    if (!imageSrc || imageSrc.includes('undefined') || imageSrc === window.location.href) return;
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = imageSrc;
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
    }
};

window.closeLightbox = function() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
    }
};

window.openTradeReport = function(trade) {
    if (!trade) return;
    document.getElementById('rep-title').innerText = "Trade Report: " + (trade.strategy || "Manual Execution");
    document.getElementById('rep-date').innerText = "Execution Date: " + (trade.date || "N/A");

    document.getElementById('rep-asset').innerText = trade.asset && trade.asset !== 'undefined' ? trade.asset : 'XAUUSD';
    document.getElementById('rep-strat').innerText = trade.strategy || '-';

    const isBuy = trade.direction === 'buy';
    document.getElementById('rep-direction').innerText = isBuy ? 'BUY' : 'SELL';
    document.getElementById('rep-dir-dot').className = isBuy ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-rose-500';

    document.getElementById('rep-emotion').innerText = trade.emotion || 'Neutral';
    document.getElementById('rep-lot').innerText = trade.lotSize || '0.01';
    document.getElementById('rep-entry').innerText = trade.entry || '-';

    const plAmt = parseFloat(trade.amount || 0);
    const plEl = document.getElementById('rep-pl');

    plEl.innerText = (plAmt >= 0 ? '+$' : '-$') + Math.abs(plAmt).toFixed(2);
    plEl.className = "text-xl font-black " + (plAmt >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");

    const audioContainer = document.getElementById('rep-audio-container');
    const audioPlayer = document.getElementById('rep-audio-player');

    if (trade.voiceNote && trade.voiceNote.length > 50) {
        audioPlayer.src = trade.voiceNote;
        audioContainer.classList.remove('hidden');
    } else {
        audioPlayer.src = "";
        audioContainer.classList.add('hidden');
    }

    document.getElementById('flex-pair').innerText = trade.asset && trade.asset !== 'undefined' ? trade.asset : 'XAUUSD';
    const flexPl = document.getElementById('flex-pl');

    flexPl.innerText = (plAmt >= 0 ? '+$' : '-$') + Math.abs(plAmt).toFixed(2);
    flexPl.className = "text-[140px] leading-none font-black tracking-tighter " + (plAmt >= 0 ? "text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_40px_rgba(251,113,133,0.3)]");

    document.getElementById('flex-direction').innerText = isBuy ? 'BUY' : 'SELL';
    document.getElementById('flex-direction').className = "text-4xl font-black " + (isBuy ? 'text-emerald-400' : 'text-rose-400');
    document.getElementById('flex-strategy').innerText = trade.strategy || 'SMC';
    document.getElementById('flex-date').innerText = trade.date || '-';

    const emBadge = document.getElementById('flex-emotion-badge');
    emBadge.innerText = trade.emotion || 'Neutral';

    const chartImg = document.getElementById('rep-chart-img');
    const chartNoImg = document.getElementById('rep-chart-noimg');

    if (trade.chartImg && trade.chartImg.length > 50) {
        chartImg.src = trade.chartImg;
        chartImg.classList.remove('hidden');
        chartNoImg.classList.add('hidden');
    } else {
        chartImg.src = '';
        chartImg.classList.add('hidden');
        chartNoImg.classList.remove('hidden');
    }

    const rrImg = document.getElementById('rep-rr-img');
    const rrNoImg = document.getElementById('rep-rr-noimg');

    if (trade.rrImg && trade.rrImg.length > 50) {
        rrImg.src = trade.rrImg;
        rrImg.classList.remove('hidden');
        rrNoImg.classList.add('hidden');
    } else {
        rrImg.src = '';
        rrImg.classList.add('hidden');
        rrNoImg.classList.remove('hidden');
    }

    const rulesListContainer = document.getElementById('rep-rules-list');
    if (rulesListContainer) {
        rulesListContainer.innerHTML = "";
        if (trade.rulesFollowed && trade.rulesFollowed.length > 0) {
            trade.rulesFollowed.forEach((rule) => {
                rulesListContainer.innerHTML += `
                <li class="flex items-start gap-2.5 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xs">
                    <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full p-0.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </span>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${rule}</span>
                </li>`;
            });
        } else {
            rulesListContainer.innerHTML = `<li class="italic text-slate-400 text-xs">No rule checklist recorded.</li>`;
        }
    }

    const modal = document.getElementById('tradeReportModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeTradeReport = function() {
    const modal = document.getElementById('tradeReportModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    const audioPlayer = document.getElementById('rep-audio-player');
    if (audioPlayer) {
        audioPlayer.pause();
    }
};

window.downloadReportImage = function() {
    const reportEl = document.getElementById('capture-trade-report');
    if (!reportEl) return;

    const closeBtn = document.getElementById('close-report-btn');
    const btnRow = document.getElementById('report-action-buttons');
    const rulesList = document.getElementById('rep-rules-list');
    const rulesBox = rulesList ? rulesList.closest('div.rounded-2xl') || rulesList.parentElement : null;

    if (closeBtn) closeBtn.style.display = 'none';
    if (btnRow) btnRow.style.display = 'none';
    if (rulesBox) rulesBox.style.display = 'none';

    window.showToast("Capturing ticket... 📸");

    const originalWidth = reportEl.style.width;
    const originalMaxWidth = reportEl.style.maxWidth;
    const originalMargin = reportEl.style.margin;
    const originalPadding = reportEl.style.padding;

    reportEl.style.width = '650px';
    reportEl.style.maxWidth = '650px';
    reportEl.style.margin = '0 auto';
    reportEl.style.padding = '28px';

    const restoreReportUi = () => {
        reportEl.style.width = originalWidth;
        reportEl.style.maxWidth = originalMaxWidth;
        reportEl.style.margin = originalMargin;
        reportEl.style.padding = originalPadding;

        if (closeBtn) closeBtn.style.display = 'flex';
        if (btnRow) btnRow.style.display = 'flex';
        if (rulesBox) rulesBox.style.display = '';
    };

    setTimeout(() => {
        html2canvas(reportEl, {
            scale: 2,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedRulesList = clonedDoc.getElementById('rep-rules-list');
                const clonedRulesBox = clonedRulesList
                    ? clonedRulesList.closest('div.rounded-2xl') || clonedRulesList.parentElement
                    : null;
                if (clonedRulesBox) {
                    clonedRulesBox.style.display = 'none';
                }
            }
        }).then((canvas) => {
            restoreReportUi();

            const link = document.createElement('a');
            link.download = `Vault_Ticket_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(() => {
            restoreReportUi();
            window.showToast("Capture failed.", "error");
        });
    }, 120);
};

window.generateFlexCard = function() {
    const flexCard = document.getElementById('capture-flex-card');
    const container = document.getElementById('flex-card-container');
    if (!flexCard || !container) return;

    const currentUserProfile = typeof window.getUserProfile === 'function'
        ? window.getUserProfile()
        : { pfp: "", username: "Trader" };

    const flexAvatar = document.getElementById('flex-avatar');
    const flexUsername = document.getElementById('flex-username');
    const flexStrategy = document.getElementById('flex-strategy');

    if (flexAvatar) {
        flexAvatar.src = currentUserProfile.pfp || "https://api.dicebear.com/7.x/avataaars/svg?seed=trader";
    }
    if (flexUsername) {
        flexUsername.innerText = currentUserProfile.username || "Trader";
    }
    if (flexStrategy) {
        flexStrategy.classList.remove('text-4xl', 'truncate', 'max-w-[300px]');
        flexStrategy.classList.add('text-2xl', 'leading-snug', 'break-words', 'max-w-[340px]');
    }

    window.showToast("Generating Aesthetic Flex Card... 🌟");

    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '9999';
    container.style.opacity = '1';

    setTimeout(() => {
        html2canvas(flexCard, {
            scale: 1,
            width: 1080,
            height: 1080,
            windowWidth: 1080,
            windowHeight: 1080,
            backgroundColor: null,
            useCORS: true
        }).then((canvas) => {
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.zIndex = '-1';
            container.style.opacity = '0';

            const link = document.createElement('a');
            link.download = `Vault_Flex_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            window.showToast("Flex Card Downloaded! 📸");
        }).catch(() => {
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.zIndex = '-1';
            container.style.opacity = '0';
            window.showToast("Flex card failed.", "error");
        });
    }, 300);
};

window.downloadExcel = function() {
    const globalTradesCache = typeof window.getTradesCache === 'function' ? window.getTradesCache() : [];
    const noTradingDates = window.noTradingDaysList || [];

    if (globalTradesCache.length === 0 && noTradingDates.length === 0) {
        window.showToast("No trades found to export!", "error");
        return;
    }

    window.showToast("Generating Excel file... ⏳");

    let excelData = globalTradesCache.map(t => ({
        Date: t.date || "-",
        Asset: t.asset || "XAUUSD",
        Strategy: t.strategy || "-",
        Direction: t.direction === 'sell' ? 'SELL' : 'BUY',
        Emotion: t.emotion || "Neutral",
        Lot_Size: t.lotSize || "-",
        Entry: t.entry || "-",
        Stop_Loss: t.sl || "-",
        Take_Profit: t.tp || "-",
        Exit_Price: t.exitPrice || "-",
        Exit_Reason: t.exitReason || "-",
        Net_PL_Amount: t.amount || 0,
        Rules_Followed: t.rulesFollowed ? t.rulesFollowed.join(", ") : "-"
    }));

    noTradingDates.forEach(dateStr => {
        excelData.push({
            Date: dateStr,
            Asset: "No Trading Day",
            Strategy: "-",
            Direction: "-",
            Emotion: "-",
            Lot_Size: "-",
            Entry: "-",
            Stop_Loss: "-",
            Take_Profit: "-",
            Exit_Price: "-",
            Exit_Reason: "-",
            Net_PL_Amount: "-",
            Rules_Followed: "-"
        });
    });

    excelData.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    setTimeout(() => {
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Trades Report");
        XLSX.writeFile(workbook, "Vault_Audit.xlsx");
    }, 500);
};

window.downloadPDF = async function() {
    const globalTradesCache = typeof window.getTradesCache === 'function' ? window.getTradesCache() : [];
    if (globalTradesCache.length === 0) {
        window.showToast("No trades found to export!", "error");
        return;
    }

    window.showToast("Generating PDF Report, please wait... ⏳");

    setTimeout(async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const getAspectRatio = (dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img.height / img.width);
                img.onerror = () => resolve(0.75);
                img.src = dataUrl;
            });
        };

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Trade Vault Pro - Master Audit", 14, 20);

        let yPos = 30;

        for (let i = 0; i < globalTradesCache.length; i++) {
            const t = globalTradesCache[i];

            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text(`Trade #${i + 1} | Date: ${t.date || '-'} | Asset: ${t.asset || 'XAUUSD'} | Strategy: ${t.strategy || '-'}`, 14, yPos);

            yPos += 7;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);

            const dirLabel = t.direction === 'sell' ? 'SELL' : 'BUY';
            const plText = (t.amount >= 0 ? '+$' : '-$') + Math.abs(t.amount);
            doc.text(`Direction: ${dirLabel} | Emotion: ${t.emotion || '-'} | Net P/L: ${plText}`, 14, yPos);

            yPos += 6;
            doc.text(`Entry: ${t.entry || '-'} | SL: ${t.sl || '-'} | TP: ${t.tp || '-'}`, 14, yPos);

            yPos += 6;
            doc.text(`Exit Price: ${t.exitPrice || '-'} | Reason: ${t.exitReason || '-'}`, 14, yPos);

            yPos += 10;
            let maxImgWidth = 85;
            let height1 = 0;
            let height2 = 0;
            let hasImages = false;

            if (t.chartImg && t.chartImg.includes("data:image")) {
                doc.setFont("helvetica", "bold");
                doc.text("Chart Screenshot:", 14, yPos);
                try {
                    const ratio = await getAspectRatio(t.chartImg);
                    height1 = maxImgWidth * ratio;
                    doc.addImage(t.chartImg, 14, yPos + 3, maxImgWidth, height1);
                    hasImages = true;
                } catch (e) {}
            }

            if (t.rrImg && t.rrImg.includes("data:image")) {
                doc.setFont("helvetica", "bold");
                doc.text("RR Target Box:", 105, yPos);
                try {
                    const ratio = await getAspectRatio(t.rrImg);
                    height2 = maxImgWidth * ratio;
                    doc.addImage(t.rrImg, 105, yPos + 3, maxImgWidth, height2);
                    hasImages = true;
                } catch (e) {}
            }

            if (hasImages) {
                yPos += Math.max(height1, height2) + 15;
            } else {
                yPos += 5;
            }

            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 196, yPos);
            yPos += 10;
        }
        doc.save("Vault_Audit.pdf");
        window.showToast("PDF Downloaded Successfully! ✅");
    }, 500);
};

window.sendWeeklyReportEmail = async function() {
    const globalTradesCache = typeof window.getTradesCache === 'function' ? window.getTradesCache() : [];
    const currentLoggedInUser = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : "";
    window.showToast("Sending email... ⏳");
    let totalPl = globalTradesCache.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    let messageBody = `Weekly Trading Report for ${currentLoggedInUser}\nTotal Trades: ${globalTradesCache.length}\nNet P/L: $${totalPl.toFixed(2)}`;

    const formData = new FormData();
    formData.append("access_key", WEB3FORMS_KEY);
    formData.append("subject", "Trade Vault - Performance Report");
    formData.append("email", "fxarjun812@gmail.com");
    formData.append("message", messageBody);

    try {
        const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
        const data = await response.json();
        if (data.success) {
            window.showToast("Report sent to Inbox! ✅");
        } else {
            window.showToast("Error: " + data.message, "error");
        }
    } catch (e) {
        window.showToast("Network error: " + e.message, "error");
    }
};
