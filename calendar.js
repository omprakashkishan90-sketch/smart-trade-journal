import { db } from './firebase-config.js';
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let selectedNoteDate = "";
window.calendarInstance = null;

window.initApp = async function() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    window.calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
        eventClick: function(info) {
            try {
                const tradeObj = info.event.extendedProps.trade;
                if (typeof window.openTradeReport === 'function') {
                    window.openTradeReport(tradeObj);
                }
            } catch (e) {
                console.error("Calendar click error:", e);
                window.showToast("Error opening trade details", "error");
            }
        },
        datesSet: function() {
            attachCalendarLongPress();
        },
        events: []
    });
    window.calendarInstance.render();

    const tdInput = document.getElementById('trade-date');
    if (tdInput) {
        tdInput.value = new Date().toISOString().split('T')[0];
    }

    if (typeof window.loadUserDataFromFirebase === 'function') {
        await window.loadUserDataFromFirebase();
    }
};

function attachCalendarLongPress() {
    setTimeout(() => {
        const dayEls = document.querySelectorAll('.fc-daygrid-day');
        dayEls.forEach(el => {
            let pressTimer = null;
            const dateStr = el.getAttribute('data-date');
            if (!dateStr) return;

            const startPress = () => {
                pressTimer = setTimeout(() => {
                    window.openDailyNotesModal(dateStr);
                }, 1500);
            };

            const cancelPress = () => {
                if (pressTimer) clearTimeout(pressTimer);
            };

            el.addEventListener('mousedown', startPress);
            el.addEventListener('touchstart', startPress, { passive: true });
            el.addEventListener('mouseup', cancelPress);
            el.addEventListener('mouseleave', cancelPress);
            el.addEventListener('touchend', cancelPress);
            el.addEventListener('touchmove', cancelPress, { passive: true });
        });
    }, 500);
}

window.openDailyNotesModal = async function(dateStr) {
    if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
    selectedNoteDate = dateStr;
    const datePicker = document.getElementById('notes-modal-date-picker');
    if (datePicker) datePicker.value = dateStr;

    const textarea = document.getElementById('daily-note-textarea');
    if (textarea) textarea.value = "Loading note...";

    const modal = document.getElementById('dailyNotesModal');
    if (modal) modal.classList.remove('hidden');

    await window.loadNoteForSelectedDate();
};

window.loadNoteForSelectedDate = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();
    const datePicker = document.getElementById('notes-modal-date-picker');
    const textarea = document.getElementById('daily-note-textarea');
    if (!datePicker || !textarea || !currentLoggedInUser) return;

    const dateStr = datePicker.value;
    selectedNoteDate = dateStr;

    try {
        const docId = currentLoggedInUser + "_" + (currentUserProfile.activeAccountId || "main") + "_" + dateStr;
        const docRef = doc(db, "daily_notes", docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            textarea.value = docSnap.data().note || "";
        } else {
            textarea.value = "";
        }
    } catch (e) {
        textarea.value = "";
    }
};

window.closeDailyNotesModal = function() {
    const modal = document.getElementById('dailyNotesModal');
    if (modal) modal.classList.add('hidden');
};

window.saveDailyNote = async function() {
    const currentLoggedInUser = window.getCurrentUser();
    const currentUserProfile = window.getUserProfile();
    const textarea = document.getElementById('daily-note-textarea');
    const noteText = textarea ? textarea.value.trim() : "";
    if (!selectedNoteDate || !currentLoggedInUser) return;

    try {
        window.showToast("Saving Daily Note... ⏳");
        const docId = currentLoggedInUser + "_" + (currentUserProfile.activeAccountId || "main") + "_" + selectedNoteDate;
        await setDoc(doc(db, "daily_notes", docId), {
            userEmail: currentLoggedInUser,
            accountId: currentUserProfile.activeAccountId || "main",
            date: selectedNoteDate,
            note: noteText,
            updatedAt: new Date()
        }, { merge: true });

        window.showToast("Daily Note Saved Successfully! ✅");
        window.closeDailyNotesModal();
    } catch (e) {
        window.showToast("Error saving note: " + e.message, "error");
    }
};
