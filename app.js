// --- Globální proměnné a konstanty ---
const HOURLY_RATES_KEY = 'hourlyRates';
const DEFAULT_HOURLY_RATES = { Maru: 200, Marty: 180 };
const CATEGORIES_KEY = 'workCategories';
const DEFAULT_CATEGORIES = ['Úklid', 'Komunikace s hostem', 'Nákup', 'Správa', 'Údržba'];
const LOCAL_STORAGE_KEY = 'workReportData';

let appData = {
    reports: [],
    finances: [],
    categories: [...DEFAULT_CATEGORIES],
    settings: {
        hourlyRates: { ...DEFAULT_HOURLY_RATES }
    },
    lastSyncTimestamp: null // Pro sledování poslední synchronizace
};

// --- Firebase Konfigurace (!!! NAHRAĎTE SVÝMI ÚDAJI !!!) ---
const firebaseConfig = {
  apiKey: "VASE_API_KEY",
  authDomain: "VAS_AUTH_DOMAIN.firebaseapp.com",
  databaseURL: "https://VASE_DATABASE_URL.firebaseio.com", // !!! DŮLEŽITÉ: Nahraďte svou Database URL
  projectId: "VAS_PROJECT_ID",
  storageBucket: "VAS_STORAGE_BUCKET.appspot.com",
  messagingSenderId: "VAS_MESSAGING_SENDER_ID",
  appId: "VAS_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dataRef = database.ref('appData'); // Odkaz na kořen dat v DB

// --- Časovač ---
let timerInterval = null;
let timerStartTime = null;
let elapsedTime = 0; // Celkový uplynulý čas v sekundách
let pauseStartTime = null; // Čas, kdy byla pauza spuštěna
let totalPausedTime = 0; // Celkový čas strávený v pauze v sekundách

// --- Pomocné funkce ---

// Formátování měny
function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
    }
    return amount.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Parsování zadání hodin (např. "2.5" nebo "2:30") na desetinné číslo
function parseHoursInput(input) {
    if (!input) return 0;
    input = input.replace(',', '.').trim();
    if (input.includes(':')) {
        const parts = input.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours + minutes / 60;
    } else {
        return parseFloat(input) || 0;
    }
}

// Formátování času z sekund na HH:MM:SS
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Získání aktuálního času ve formátu HH:MM
function getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Výpočet výdělku
function calculateEarnings(hours, person) {
    const rate = appData.settings.hourlyRates[person] || 0;
    return hours * rate;
}

// Zobrazení notifikace
function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.className = 'notification show'; // Reset tříd a zobrazí
    if (type === 'error') {
        notification.classList.add('error');
    }
    setTimeout(() => {
        notification.className = 'notification'; // Skryje notifikaci
    }, duration);
}

// --- Správa Dat (Lokální + Firebase) ---

// Uložení dat do Local Storage
function saveDataLocally() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
}

// Načtení dat z Local Storage
function loadDataLocally() {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            // Sloučení načtených dat s výchozí strukturou pro případ, že by chyběly některé klíče
             appData = {
                reports: parsedData.reports || [],
                finances: parsedData.finances || [],
                categories: parsedData.categories && parsedData.categories.length > 0 ? parsedData.categories : [...DEFAULT_CATEGORIES],
                settings: {
                    hourlyRates: {
                        ...DEFAULT_HOURLY_RATES,
                        ...(parsedData.settings?.hourlyRates || {})
                    }
                },
                 lastSyncTimestamp: parsedData.lastSyncTimestamp || null
            };
             // Zajistíme, že základní kategorie vždy existují, pokud nejsou načteny
            if (!appData.categories || appData.categories.length === 0) {
                appData.categories = [...DEFAULT_CATEGORIES];
            } else {
                 // Přidáme výchozí kategorie, pokud ještě neexistují
                DEFAULT_CATEGORIES.forEach(cat => {
                    if (!appData.categories.includes(cat)) {
                        appData.categories.push(cat);
                    }
                });
            }
             // Zajistíme, že hodinové sazby existují
             if (!appData.settings || !appData.settings.hourlyRates) {
                appData.settings = { hourlyRates: { ...DEFAULT_HOURLY_RATES }};
             } else {
                 // Doplníme výchozí sazby, pokud chybí pro Maru nebo Martyho
                 if (!appData.settings.hourlyRates.Maru) appData.settings.hourlyRates.Maru = DEFAULT_HOURLY_RATES.Maru;
                 if (!appData.settings.hourlyRates.Marty) appData.settings.hourlyRates.Marty = DEFAULT_HOURLY_RATES.Marty;
             }

        } catch (e) {
            console.error("Chyba při parsování dat z Local Storage:", e);
            showNotification("Nepodařilo se načíst lokální data.", "error");
            // Pokud jsou data poškozená, resetujeme na výchozí
             initializeDefaultData();
        }
    } else {
        // Pokud žádná data nejsou uložena, inicializujeme výchozí
        initializeDefaultData();
    }
    // Po načtení vždy aktualizujeme UI (sazby v nastavení, kategorie atd.)
    updateSettingsUI();
    updateCategoryDropdowns();
    updateCategoryList();
}

function initializeDefaultData() {
     appData = {
        reports: [],
        finances: [],
        categories: [...DEFAULT_CATEGORIES],
        settings: {
            hourlyRates: { ...DEFAULT_HOURLY_RATES }
        },
        lastSyncTimestamp: null
    };
    saveDataLocally(); // Uložíme výchozí stav
}


// Synchronizace dat s Firebase (odeslání lokálních změn)
async function syncDataWithServer() {
    if (!navigator.onLine) {
        showNotification("Jste offline. Data budou synchronizována později.", "warning");
        // Pokus o registraci sync eventu pro pozdější synchronizaci
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.sync.register('sync-data');
            }).then(() => {
                console.log('Sync event registrovan.');
            }).catch(err => {
                console.error('Registrace sync eventu selhala:', err);
            });
        }
        return; // Neodesílat, pokud jsme offline
    }

    console.log("Synchronizuji lokální data s Firebase...");
    showNotification("Synchronizuji data...", "info", 1500);
    try {
        appData.lastSyncTimestamp = Date.now(); // Aktualizujeme čas poslední synchronizace
        saveDataLocally(); // Uložíme i timestamp lokálně
        await dataRef.set(appData); // Odešleme kompletní lokální data
        console.log("Data úspěšně synchronizována s Firebase.");
       // showNotification("Data úspěšně synchronizována."); // Může být matoucí s notifikací z listeneru
    } catch (error) {
        console.error("Chyba při synchronizaci dat s Firebase:", error);
        showNotification("Chyba synchronizace s cloudem.", "error");
    }
}

// Sloučení dat (jednoduchá strategie "poslední zápis vyhrává" na základě timestampu)
// V reálné aplikaci by bylo robustnější řešení (např. porovnání záznamů)
function mergeData(local, server) {
    if (!server || !server.lastSyncTimestamp) {
        return local; // Pokud server nemá data nebo timestamp, použijeme lokální
    }
    if (!local || !local.lastSyncTimestamp || server.lastSyncTimestamp > local.lastSyncTimestamp) {
        console.log("Přijímám novější data ze serveru.");
        return server; // Server má novější data
    }
    console.log("Lokální data jsou novější nebo stejná.");
    return local; // Lokální data jsou novější nebo stejná
}

// --- Vykreslování UI ---

// Vykreslení tabulky pracovních výkazů
function renderReportsTable(reportsToRender = appData.reports) {
    const tableBody = document.getElementById('reports-table')?.querySelector('tbody');
    if (!tableBody) return; // Pokud element neexistuje (např. v jiné sekci)

    // Seřazení výkazů od nejnovějšího
    const sortedReports = [...reportsToRender].sort((a, b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = ''; // Vyčistit staré řádky
    if (sortedReports.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Žádné výkazy k zobrazení.</td></tr>';
        return;
    }
    sortedReports.forEach(r => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${new Date(r.date).toLocaleDateString('cs-CZ') || '-'}</td>
            <td>${r.person || '-'}</td>
            <td>${r.category || '-'}</td>
            <td>${r.startTime || '-'}</td>
            <td>${r.endTime || '-'}</td>
            <td>${r.pauseMinutes || 0} min</td>
            <td>${r.hours ? r.hours.toFixed(2) : '0.00'} hod</td>
            <td>${formatCurrency(r.earnings)}</td>
            <td>
                <button class="delete-button" onclick="deleteReport('${r.id}')" title="Smazat výkaz">
                    <i class="fas fa-trash-alt"></i>
                </button>
                 {/* Zde může být v budoucnu tlačítko pro úpravu
                 <button class="edit-button" onclick="editReport('${r.id}')" title="Upravit výkaz">
                    <i class="fas fa-edit"></i>
                </button> */}
            </td>
        `;
    });
}


// Vykreslení tabulky financí
function renderFinancesTable() {
    const tableBody = document.getElementById('finances-table')?.querySelector('tbody');
     if (!tableBody) return;

     // Seřazení financí od nejnovějšího
    const sortedFinances = [...appData.finances].sort((a, b) => new Date(b.date) - new Date(a.date));


    tableBody.innerHTML = ''; // Vyčistit staré řádky
     if (sortedFinances.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné finanční záznamy.</td></tr>';
        return;
    }
    sortedFinances.forEach(f => {
        const row = tableBody.insertRow();
        const amountClass = f.type === 'Náklad' ? 'negative-amount' : 'positive-amount'; // Pro případné budoucí stylování
        row.innerHTML = `
            <td>${new Date(f.date).toLocaleDateString('cs-CZ') || '-'}</td>
            <td>${f.type || '-'}</td>
            <td class="${amountClass}">${formatCurrency(f.type === 'Náklad' ? -f.amount : f.amount)}</td>
            <td>${f.person || '-'}</td>
            <td>${f.note || '-'}</td>
            <td>
                <button class="delete-button" onclick="deleteFinance('${f.id}')" title="Smazat záznam">
                     <i class="fas fa-trash-alt"></i>
                </button>
                {/* Tlačítko pro úpravu může být přidáno později */}
            </td>
        `;
    });
     updateFinanceSummary(); // Aktualizace přehledu financí po vykreslení
}

// Aktualizace celkového přehledu (sumáře)
function updateSummary() {
    const maruReports = appData.reports.filter(r => r.person === 'Maru');
    const martyReports = appData.reports.filter(r => r.person === 'Marty');

    const maruTotalHours = maruReports.reduce((sum, r) => sum + (r.hours || 0), 0);
    const maruTotalEarnings = maruReports.reduce((sum, r) => sum + (r.earnings || 0), 0);
    const martyTotalHours = martyReports.reduce((sum, r) => sum + (r.hours || 0), 0);
    const martyTotalEarnings = martyReports.reduce((sum, r) => sum + (r.earnings || 0), 0);

    document.getElementById('maru-total-hours').textContent = maruTotalHours.toFixed(2);
    document.getElementById('maru-total-earnings').textContent = formatCurrency(maruTotalEarnings);
    document.getElementById('marty-total-hours').textContent = martyTotalHours.toFixed(2);
    document.getElementById('marty-total-earnings').textContent = formatCurrency(martyTotalEarnings);

    document.getElementById('total-hours').textContent = (maruTotalHours + martyTotalHours).toFixed(2);
    document.getElementById('total-earnings').textContent = formatCurrency(maruTotalEarnings + martyTotalEarnings);

    updateFinanceSummary(); // Aktualizace i finančního přehledu
}

// Aktualizace přehledu financí v sumáři
function updateFinanceSummary() {
    const totalIncome = appData.finances
        .filter(f => f.type === 'Příjem')
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalExpense = appData.finances
        .filter(f => f.type === 'Náklad')
        .reduce((sum, f) => sum + (f.amount || 0), 0);
    const balance = totalIncome - totalExpense;

    const financeSummaryEl = document.getElementById('finance-summary');
    if(financeSummaryEl) {
        financeSummaryEl.textContent = `${formatCurrency(balance)} (Příjmy: ${formatCurrency(totalIncome)}, Náklady: ${formatCurrency(totalExpense)})`;
    }
}


// Aktualizace výběrových polí (dropdownů) pro kategorie
function updateCategoryDropdowns() {
    const selectors = [
        document.getElementById('timer-category'),
        document.getElementById('manual-category'),
        document.getElementById('filter-category') // Přidán filtr
    ];

    selectors.forEach(select => {
        if (!select) return;

        const currentValue = select.value; // Uchováme aktuálně vybranou hodnotu
        let customOptionExists = false;
        // Odstraníme existující option kromě "Všechny" u filtru a "Jiná (zadat)"
        Array.from(select.options).forEach(option => {
            if (select.id === 'filter-category' && option.value === 'all') {
                 // Ponechat "Všechny"
            } else if (option.value === 'custom') {
                customOptionExists = true; // Ponechat "Jiná (zadat)"
            }
            else {
                select.remove(option.index);
            }
        });
         // Znovu přidáme 'custom' na konec, pokud tam byla, jinak ji přidáme
         if (!customOptionExists && select.id !== 'filter-category') {
             select.add(new Option('Jiná (zadat)', 'custom'));
         }

        // Přidáme aktuální kategorie ze seznamu appData.categories
         // Seřadíme kategorie abecedně pro lepší přehlednost
        const sortedCategories = [...appData.categories].sort((a, b) => a.localeCompare(b, 'cs'));

        sortedCategories.forEach(category => {
            // Přidáme pouze pokud ještě neexistuje (pro jistotu)
            if (!Array.from(select.options).some(opt => opt.value === category)) {
                const option = new Option(category, category);
                 // Vložíme před 'custom' nebo na konec, pokud 'custom' není
                 const customOpt = select.querySelector('option[value="custom"]');
                 if (customOpt) {
                     select.insertBefore(option, customOpt);
                 } else {
                    select.add(option);
                 }
            }
        });

        // Pokusíme se obnovit původně vybranou hodnotu
        if (Array.from(select.options).some(opt => opt.value === currentValue)) {
             select.value = currentValue;
        } else if (select.id === 'filter-category') {
             select.value = 'all'; // Default pro filtr
        }
         // U formulářů nastavíme výchozí, pokud aktuální není platná
         else if (select.id !== 'filter-category' && appData.categories.length > 0) {
             select.value = appData.categories[0]; // Nastaví první dostupnou kategorii
         }
    });
}

// Aktualizace seznamu kategorií v nastavení
function updateCategoryList() {
    const listElement = document.getElementById('category-list');
    if (!listElement) return;

    listElement.innerHTML = ''; // Clear list
     const sortedCategories = [...appData.categories].sort((a, b) => a.localeCompare(b, 'cs'));

    sortedCategories.forEach(category => {
        const listItem = document.createElement('li');
        listItem.textContent = category;

        // Zabráníme smazání základních kategorií
        if (!DEFAULT_CATEGORIES.includes(category)) {
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-times"></i>';
            deleteButton.classList.add('delete-category-button');
            deleteButton.title = 'Smazat kategorii';
            deleteButton.onclick = () => deleteCategory(category);
            listItem.appendChild(deleteButton);
        } else {
             listItem.title = "Základní kategorii nelze smazat."; // Přidáme tooltip
        }
        listElement.appendChild(listItem);
    });
}


// Aktualizace formuláře v nastavení (hodinové sazby)
function updateSettingsUI() {
    const rateMaruInput = document.getElementById('rate-maru');
    const rateMartyInput = document.getElementById('rate-marty');
    if(rateMaruInput) rateMaruInput.value = appData.settings.hourlyRates.Maru;
    if(rateMartyInput) rateMartyInput.value = appData.settings.hourlyRates.Marty;
}


// --- CRUD Operace (Pracovní výkazy) ---

// Přidání pracovního výkazu
function addWorkReport(data) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7); // Unikátnější ID
    const report = { ...data, id };
    appData.reports.push(report);
    saveDataLocally();
    syncDataWithServer(); // Okamžitá synchronizace po přidání
    renderReportsTable();
    updateSummary();
    showNotification('Pracovní výkaz byl přidán.');
    // Reset formuláře? (Záleží na UX preferenci)
    // resetTimerForm();
    // resetManualForm();
}

// Smazání pracovního výkazu
function deleteReport(id) {
    if (confirm('Opravdu chcete smazat tento výkaz?')) {
        const initialLength = appData.reports.length;
        appData.reports = appData.reports.filter(r => r.id !== id);
        if (appData.reports.length < initialLength) {
            saveDataLocally();
            syncDataWithServer(); // Synchronizace po smazání
            renderReportsTable(); // Znovu vykreslíme tabulku (už s aplikovanými filtry)
            updateSummary();
            showNotification('Výkaz byl smazán.');
            applyFilters(); // Znovu aplikujeme filtry, aby se zohlednilo smazání
        } else {
            showNotification('Výkaz s daným ID nebyl nalezen.', 'error');
        }
    }
}

// --- CRUD Operace (Finance) ---

// Přidání finančního záznamu
function addFinance(data) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7); // Unikátnější ID
    const finance = { ...data, id };
    appData.finances.push(finance);
    saveDataLocally();
    syncDataWithServer(); // Okamžitá synchronizace
    renderFinancesTable();
    updateSummary(); // Aktualizuje i finanční přehled
    showNotification('Finanční záznam byl přidán.');
    // Reset formuláře
    resetFinanceForm();
    document.getElementById('finance-form').classList.add('hidden'); // Skryjeme formulář
}

// Smazání finančního záznamu
function deleteFinance(id) {
    if (confirm('Opravdu chcete smazat tento finanční záznam?')) {
         const initialLength = appData.finances.length;
        appData.finances = appData.finances.filter(f => f.id !== id);
         if (appData.finances.length < initialLength) {
            saveDataLocally();
            syncDataWithServer(); // Synchronizace po smazání
            renderFinancesTable();
            updateSummary(); // Aktualizuje i finanční přehled
            showNotification('Finanční záznam byl smazán.');
         } else {
             showNotification('Finanční záznam s daným ID nebyl nalezen.', 'error');
         }
    }
}

// Reset finančního formuláře
function resetFinanceForm() {
    document.getElementById('finance-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('finance-type').value = 'Náklad';
    document.getElementById('finance-amount').value = '';
    document.getElementById('finance-person').value = '';
    document.getElementById('finance-note').value = '';
}

// --- CRUD Operace (Kategorie) ---

// Přidání vlastní kategorie
function addCategory(categoryName) {
    const trimmedName = categoryName.trim();
    if (trimmedName && !appData.categories.includes(trimmedName)) {
        appData.categories.push(trimmedName);
        // appData.categories.sort((a, b) => a.localeCompare(b, 'cs')); // Seřadíme hned po přidání
        saveDataLocally();
        syncDataWithServer();
        updateCategoryDropdowns();
        updateCategoryList(); // Aktualizace seznamu v nastavení
        showNotification(`Kategorie "${trimmedName}" byla přidána.`);
        return true; // Signalizuje úspěch
    } else if (appData.categories.includes(trimmedName)) {
        showNotification(`Kategorie "${trimmedName}" již existuje.`, 'warning');
        return false;
    } else {
        showNotification('Název kategorie nemůže být prázdný.', 'error');
        return false;
    }
}

// Smazání kategorie
function deleteCategory(categoryName) {
     // Extra ochrana - nemělo by se stát díky UI, ale pro jistotu
     if (DEFAULT_CATEGORIES.includes(categoryName)) {
        showNotification(`Základní kategorii "${categoryName}" nelze smazat.`, 'error');
        return;
    }

    if (confirm(`Opravdu chcete smazat kategorii "${categoryName}"? \nPozor: Výkazy s touto kategorií zůstanou, ale kategorii nebude možné znovu vybrat.`)) {
        const initialLength = appData.categories.length;
        appData.categories = appData.categories.filter(c => c !== categoryName);
         if (appData.categories.length < initialLength) {
             saveDataLocally();
             syncDataWithServer();
             updateCategoryDropdowns();
             updateCategoryList(); // Aktualizace seznamu v nastavení
             showNotification(`Kategorie "${categoryName}" byla smazána.`);
         }
    }
}


// --- Funkce Časovače ---

function startTimer() {
    if (timerInterval) return; // Už běží

    if (pauseStartTime) {
        // Pokračování po pauze
        const pausedDuration = Math.round((Date.now() - pauseStartTime) / 1000);
        totalPausedTime += pausedDuration;
        pauseStartTime = null; // Resetovat čas začátku pauzy
        document.getElementById('pause-timer').innerHTML = '<i class="fas fa-pause"></i> Pauza';
        document.getElementById('pause-timer').classList.remove('resuming');
    } else {
        // Nový start nebo restart po stopnutí
        timerStartTime = Date.now();
        elapsedTime = 0;
        totalPausedTime = 0;
        document.getElementById('timer-start').value = getCurrentTime();
        document.getElementById('timer-end').value = '';
        document.getElementById('timer-pause').value = '0';
        document.getElementById('timer-hours').value = '0.00';
         document.getElementById('timer-earnings').textContent = formatCurrency(0);
        document.querySelector('.timer-summary').classList.add('hidden'); // Skrýt souhrn při novém startu
    }

    timerInterval = setInterval(updateTimerDisplay, 1000);

    // Aktualizace tlačítek
    document.getElementById('start-timer').disabled = true;
    document.getElementById('pause-timer').disabled = false;
    document.getElementById('stop-timer').disabled = false;

    updateTimerDisplay(); // Okamžitá aktualizace
}

function pauseTimer() {
    if (!timerInterval) return; // Neběží

    if (pauseStartTime) {
        // Pokračování (resume)
        clearInterval(timerInterval); // Zastavíme interval na moment
        const pausedDuration = Math.round((Date.now() - pauseStartTime) / 1000);
        totalPausedTime += pausedDuration;
        pauseStartTime = null;
        document.getElementById('pause-timer').innerHTML = '<i class="fas fa-pause"></i> Pauza';
         document.getElementById('pause-timer').classList.remove('resuming');
        // Restartujeme interval
         timerInterval = setInterval(updateTimerDisplay, 1000);

    } else {
        // Začátek pauzy
        pauseStartTime = Date.now();
        clearInterval(timerInterval); // Zastavit hlavní interval
        timerInterval = null; // Označit, že interval neběží
        document.getElementById('pause-timer').innerHTML = '<i class="fas fa-play"></i> Pokračovat';
         document.getElementById('pause-timer').classList.add('resuming');
        updateTimerDisplay(); // Zobrazí aktuální čas (nebude se měnit)
    }
     // Aktualizujeme zobrazení celkové pauzy ve formuláři
     document.getElementById('timer-pause').value = Math.round(totalPausedTime / 60);
}

function stopTimer() {
    if (!timerInterval && !pauseStartTime) return; // Není spuštěno ani pauznuto

    clearInterval(timerInterval);
    timerInterval = null;

     if (pauseStartTime) {
         // Pokud bylo zastaveno během pauzy, přičteme poslední pauzu
        const pausedDuration = Math.round((Date.now() - pauseStartTime) / 1000);
        totalPausedTime += pausedDuration;
        pauseStartTime = null;
         document.getElementById('pause-timer').innerHTML = '<i class="fas fa-pause"></i> Pauza';
         document.getElementById('pause-timer').classList.remove('resuming');
    }

    // Výpočet finálního času
    const now = Date.now();
    const totalSeconds = elapsedTime; // elapsedTime už obsahuje čistý čas práce
    const hours = totalSeconds / 3600;

    // Aktualizace UI formuláře
    document.getElementById('timer-end').value = getCurrentTime();
     document.getElementById('timer-pause').value = Math.round(totalPausedTime / 60);
    document.getElementById('timer-hours').value = hours.toFixed(2);
    const person = document.getElementById('timer-person').value;
    const earnings = calculateEarnings(hours, person);
     document.getElementById('timer-earnings').textContent = formatCurrency(earnings);


    // Zobrazit souhrn a aktualizovat tlačítka
    document.querySelector('.timer-summary').classList.remove('hidden');
    document.getElementById('start-timer').disabled = false;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('stop-timer').disabled = true;

    // Resetovat čítače pro příští start
    // elapsedTime = 0; // Neresetovat zde, potřebujeme hodnotu pro uložení
    // totalPausedTime = 0; // Neresetovat zde
}

function updateTimerDisplay() {
    let currentElapsedTime = 0;
    if (timerStartTime && !pauseStartTime) { // Běží normálně
         currentElapsedTime = Math.round((Date.now() - timerStartTime) / 1000) - totalPausedTime;
    } else { // Je pauznuto nebo zastaveno
        currentElapsedTime = elapsedTime; // Použijeme poslední známý čistý čas
    }

    elapsedTime = currentElapsedTime; // Uložíme si aktuální čistý čas

    document.getElementById('timer-display').textContent = formatTime(elapsedTime);
}

// Reset formuláře časovače (volitelné, po uložení)
function resetTimerForm() {
    document.getElementById('timer-person').value = 'Maru';
    document.getElementById('timer-category').value = appData.categories[0] || 'Úklid'; // První kategorie nebo default
    document.getElementById('timer-custom-category').value = '';
    document.getElementById('timer-custom-category').classList.add('hidden');
    document.getElementById('timer-display').textContent = '00:00:00';
    document.querySelector('.timer-summary').classList.add('hidden');
    document.getElementById('start-timer').disabled = false;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('stop-timer').disabled = true;
     document.getElementById('timer-start').value = '';
     document.getElementById('timer-end').value = '';
     document.getElementById('timer-pause').value = '0';
     document.getElementById('timer-hours').value = '';
     document.getElementById('timer-earnings').textContent = formatCurrency(0);

    // Reset interních proměnných časovače
    clearInterval(timerInterval);
    timerInterval = null;
    timerStartTime = null;
    elapsedTime = 0;
    pauseStartTime = null;
    totalPausedTime = 0;
}


// --- Validace Formulářů ---
function validateWorkReport(data) {
    if (!data.date || !data.person || !data.category) {
        showNotification('Chybí datum, osoba nebo kategorie.', 'error');
        return false;
    }
    if (data.hours <= 0) {
        showNotification('Počet hodin musí být větší než 0.', 'error');
        return false;
    }
    if (data.category === 'custom') { // Zajistí, že 'custom' se neuloží jako kategorie
         showNotification('Vyberte platnou kategorii nebo zadejte vlastní název.', 'error');
         return false;
    }
    // Zde mohou být další validace (např. kontrola překrytí časů, pokud startTime a endTime jsou povinné)
    return true;
}

// --- Export a Import ---

// Export do CSV
function exportToCSV() {
    try {
        // Výkazy
        let reportsCSV = 'Datum,Osoba,Kategorie,Začátek,Konec,Pauza (min),Odpracováno (hod),Výdělek (Kč)\n';
        // Použijeme aktuálně seřazená data pro konzistenci s tabulkou
         const sortedReports = [...appData.reports].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedReports.forEach(r => {
            reportsCSV += `"${new Date(r.date).toLocaleDateString('cs-CZ')}","${r.person}","${r.category}","${r.startTime || ''}","${r.endTime || ''}","${r.pauseMinutes || 0}","${(r.hours || 0).toFixed(2)}","${(r.earnings || 0).toFixed(2)}"\n`;
        });

        // Finance
        let financesCSV = 'Datum,Typ,Částka (Kč),Osoba,Poznámka\n';
         // Použijeme aktuálně seřazená data
         const sortedFinances = [...appData.finances].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedFinances.forEach(f => {
            financesCSV += `"${new Date(f.date).toLocaleDateString('cs-CZ')}","${f.type}","${(f.type === 'Náklad' ? -f.amount : f.amount).toFixed(2)}","${f.person || ''}","${f.note ? f.note.replace(/"/g, '""') : ''}"\n`; // Handle quotes in notes
        });

        downloadCSV(`pracovni-vykazy_${getDateString()}.csv`, reportsCSV);
        downloadCSV(`finance_${getDateString()}.csv`, financesCSV);
        showNotification('Data byla exportována do CSV.');
    } catch (error) {
         console.error("Chyba při exportu do CSV:", error);
         showNotification('Nastala chyba při exportu dat.', 'error');
    }
}

function downloadCSV(filename, csvData) {
    // Přidání BOM pro správné zobrazení českých znaků v Excelu
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) { // Feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Uvolnění paměti
    } else {
         // Fallback pro starší prohlížeče (může otevřít v novém okně)
         navigator.msSaveBlob(blob, filename); // Pro IE
    }
}

function getDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

// Zálohování dat (stáhne lokální JSON)
function backupData() {
    try {
        saveDataLocally(); // Ujistíme se, že máme nejaktuálnější stav v localStorage
        const dataToBackup = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!dataToBackup) {
            showNotification("Nebyly nalezena žádná data k zálohování.", "warning");
            return;
        }
        const blob = new Blob([dataToBackup], { type: 'application/json;charset=utf-8;' });
        const filename = `pracovni-vykazy-zaloha_${getDateString()}.json`;
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification("Data byla úspěšně zálohována.");
        } else {
            navigator.msSaveBlob(blob, filename);
            showNotification("Data byla úspěšně zálohována.");
        }
    } catch (error) {
        console.error("Chyba při zálohování dat:", error);
        showNotification("Nastala chyba při zálohování dat.", "error");
    }
}


// Obnovení dat ze zálohy (načte JSON soubor)
function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    if (file.type !== 'application/json') {
        showNotification("Vyberte prosím platný JSON soubor zálohy.", "error");
         event.target.value = null; // Reset file input
        return;
    }

    if (!confirm("Opravdu chcete obnovit data z tohoto souboru? Aktuální lokální data budou přepsána!")) {
         event.target.value = null; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDataString = e.target.result;
            // Základní validace, zda data vypadají jako náš formát
            const parsedData = JSON.parse(importedDataString);
            if (typeof parsedData === 'object' && parsedData !== null && ('reports' in parsedData || 'finances' in parsedData || 'settings' in parsedData)) {
                localStorage.setItem(LOCAL_STORAGE_KEY, importedDataString); // Přepíšeme lokální úložiště
                loadDataLocally(); // Znovu načteme data z úložiště do appData
                renderAll(); // Vykreslíme všechna data znovu
                updateSummary();
                updateSettingsUI();
                updateCategoryDropdowns();
                updateCategoryList();
                showNotification("Data byla úspěšně obnovena ze zálohy.");
                 // Po úspěšném importu synchronizujeme s Firebase
                syncDataWithServer();
            } else {
                showNotification("Soubor neobsahuje platná data zálohy.", "error");
            }
        } catch (error) {
            console.error("Chyba při importu dat:", error);
            showNotification("Nastala chyba při zpracování souboru zálohy.", "error");
        } finally {
             event.target.value = null; // Reset file input po zpracování
        }
    };
    reader.onerror = function() {
        showNotification("Nepodařilo se přečíst soubor.", "error");
         event.target.value = null; // Reset file input
    };
    reader.readAsText(file);
}


// --- Inicializace a Event Listenery ---

// Inicializace formulářů (nastavení dnešního data)
function initForms() {
    const today = new Date().toISOString().split('T')[0];
    const manualDateInput = document.getElementById('manual-date');
    const financeDateInput = document.getElementById('finance-date');
    if(manualDateInput) manualDateInput.value = today;
    if(financeDateInput) financeDateInput.value = today;

    // Skrytí/zobrazení vlastního pole kategorie
    ['timer-category', 'manual-category'].forEach(id => {
        const select = document.getElementById(id);
        if(select) {
            select.addEventListener('change', function() {
                const customInputId = id.replace('-category', '-custom-category');
                const customInput = document.getElementById(customInputId);
                if(customInput) {
                    customInput.classList.toggle('hidden', this.value !== 'custom');
                    if (this.value !== 'custom') {
                        customInput.value = ''; // Vymažeme hodnotu, pokud není vybráno 'custom'
                    } else {
                         customInput.focus(); // Zaostříme na pole pro zadání
                    }
                }
            });
            // Počáteční nastavení viditelnosti
             const customInputId = id.replace('-category', '-custom-category');
             const customInput = document.getElementById(customInputId);
             if(customInput) {
                customInput.classList.toggle('hidden', select.value !== 'custom');
             }
        }
    });
}

// Vykreslení všech dynamických částí UI
function renderAll() {
    applyFilters(); // Aplikuje filtry a vykreslí tabulku výkazů
    renderFinancesTable();
}

// Aplikace filtrů na tabulku výkazů
function applyFilters() {
    const personFilter = document.getElementById('filter-person')?.value || 'all';
    const categoryFilter = document.getElementById('filter-category')?.value || 'all';
    const monthFilter = document.getElementById('filter-month')?.value || ''; // YYYY-MM

    let filteredReports = appData.reports;

    if (personFilter !== 'all') {
        filteredReports = filteredReports.filter(r => r.person === personFilter);
    }
    if (categoryFilter !== 'all') {
        filteredReports = filteredReports.filter(r => r.category === categoryFilter);
    }
    if (monthFilter) {
        // Očekává formát YYYY-MM
        filteredReports = filteredReports.filter(r => r.date && r.date.startsWith(monthFilter));
    }

    renderReportsTable(filteredReports); // Vykreslíme pouze filtrovaná data
}

// Reset filtrů
function resetFilters() {
     const personFilter = document.getElementById('filter-person');
     const categoryFilter = document.getElementById('filter-category');
     const monthFilter = document.getElementById('filter-month');

     if(personFilter) personFilter.value = 'all';
     if(categoryFilter) categoryFilter.value = 'all';
     if(monthFilter) monthFilter.value = '';

    applyFilters(); // Znovu vykreslíme s resetovanými filtry
    showNotification("Filtry byly zrušeny.");
}


// --- Hlavní inicializace po načtení DOM ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataLocally(); // Načíst lokální data jako první
    renderAll();
    updateSummary();
    initForms();
    updateSettingsUI(); // Zobrazit načtené sazby
    updateCategoryDropdowns();
    updateCategoryList();

    // Pokus o synchronizaci při startu (pokud online)
    syncDataWithServer();

    // --- Event Listenery pro tlačítka a formuláře ---

    // Navigace
    document.querySelectorAll('nav button').forEach(button => {
        button.addEventListener('click', () => {
            // Skrýt všechny sekce a odebrat aktivní třídu z tlačítek
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));

            // Zobrazit cílovou sekci a označit tlačítko jako aktivní
            const sectionId = button.id.replace('nav-', '') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                 targetSection.classList.add('active');
            } else {
                // Fallback na přehled, pokud sekce neexistuje
                 document.getElementById('overview-section').classList.add('active');
                 document.getElementById('nav-overview').classList.add('active');
                 console.warn(`Sekce s ID ${sectionId} nebyla nalezena.`);
            }
            button.classList.add('active');
        });
    });

     // Přepínání režimů zadávání
    document.getElementById('toggle-timer-mode')?.addEventListener('click', () => {
        document.getElementById('timer-mode')?.classList.remove('hidden');
        document.getElementById('manual-mode')?.classList.add('hidden');
    });
    document.getElementById('toggle-manual-mode')?.addEventListener('click', () => {
        document.getElementById('manual-mode')?.classList.remove('hidden');
        document.getElementById('timer-mode')?.classList.add('hidden');
    });


    // --- Časovač ---
    document.getElementById('start-timer')?.addEventListener('click', startTimer);
    document.getElementById('pause-timer')?.addEventListener('click', pauseTimer);
    document.getElementById('stop-timer')?.addEventListener('click', stopTimer);
    document.getElementById('save-timer')?.addEventListener('click', () => {
        let category = document.getElementById('timer-category').value;
        const customCategoryInput = document.getElementById('timer-custom-category');
        const customCategory = customCategoryInput.value.trim();

        if (category === 'custom') {
             if (customCategory) {
                 // Pokusíme se přidat novou kategorii, pokud uspěje, použijeme ji
                 if(addCategory(customCategory)) {
                    category = customCategory; // Použijeme nově přidanou kategorii
                     customCategoryInput.value = ''; // Vyčistíme pole
                     customCategoryInput.classList.add('hidden'); // Skryjeme pole
                     document.getElementById('timer-category').value = category; // Nastavíme select na novou kategorii
                 } else {
                     showNotification("Zadejte platný název pro novou kategorii.", "error");
                     return; // Zastavíme ukládání, dokud není kategorie vyřešena
                 }
             } else {
                 showNotification('Zadejte název pro vlastní kategorii nebo vyberte existující.', 'error');
                 return; // Neukládat, pokud je vybráno "custom", ale není zadán název
             }
         }


        const data = {
            date: new Date().toISOString().split('T')[0], // Datum dne, kdy byl timer zastaven
            person: document.getElementById('timer-person').value,
            category: category,
            startTime: document.getElementById('timer-start').value || null, // Může být null, pokud timer neběžel
            endTime: document.getElementById('timer-end').value || null,
            pauseMinutes: parseInt(document.getElementById('timer-pause').value) || 0,
            hours: parseFloat(document.getElementById('timer-hours').value) || 0,
             // Výdělek znovu přepočítáme pro jistotu, kdyby se mezitím změnila sazba
            earnings: calculateEarnings(parseFloat(document.getElementById('timer-hours').value) || 0, document.getElementById('timer-person').value),
            currency: 'CZK'
        };

        if (validateWorkReport(data)) {
            addWorkReport(data);
            resetTimerForm(); // Resetujeme formulář časovače po úspěšném uložení
        }
    });

    // --- Manuální zadání ---
    document.getElementById('save-manual')?.addEventListener('click', () => {
        let category = document.getElementById('manual-category').value;
        const customCategoryInput = document.getElementById('manual-custom-category');
        const customCategory = customCategoryInput.value.trim();

        if (category === 'custom') {
            if (customCategory) {
                 if(addCategory(customCategory)) {
                    category = customCategory;
                     customCategoryInput.value = '';
                     customCategoryInput.classList.add('hidden');
                     document.getElementById('manual-category').value = category;
                 } else {
                     showNotification("Zadejte platný název pro novou kategorii.", "error");
                     return;
                 }
            } else {
                 showNotification('Zadejte název pro vlastní kategorii nebo vyberte existující.', 'error');
                 return;
             }
         }

         const hours = parseHoursInput(document.getElementById('manual-hours').value);

        const data = {
            date: document.getElementById('manual-date').value,
            person: document.getElementById('manual-person').value,
            category: category,
            startTime: document.getElementById('manual-start').value || null, // Nepovinné
            endTime: document.getElementById('manual-end').value || null,     // Nepovinné
            pauseMinutes: parseInt(document.getElementById('manual-pause').value) || 0,
            hours: hours,
            earnings: calculateEarnings(hours, document.getElementById('manual-person').value),
            currency: 'CZK'
        };

        if (validateWorkReport(data)) {
            addWorkReport(data);
            // Reset formuláře manuálního zadání
            document.getElementById('manual-hours').value = '';
            document.getElementById('manual-start').value = '';
            document.getElementById('manual-end').value = '';
            document.getElementById('manual-pause').value = '0';
            document.getElementById('manual-category').value = appData.categories[0] || 'Úklid'; // Reset na první kategorii
            document.getElementById('manual-custom-category').value = '';
            document.getElementById('manual-custom-category').classList.add('hidden');
             // Můžeme ponechat datum a osobu pro snazší zadávání více položek
             // document.getElementById('manual-date').value = new Date().toISOString().split('T')[0];
             // document.getElementById('manual-person').value = 'Maru';
        }
    });

    // --- Finance ---
    document.getElementById('add-finance')?.addEventListener('click', () => {
        resetFinanceForm(); // Vyčistíme formulář před zobrazením
        document.getElementById('finance-form').classList.toggle('hidden');
    });
    document.getElementById('save-finance')?.addEventListener('click', () => {
        const data = {
            date: document.getElementById('finance-date').value,
            type: document.getElementById('finance-type').value,
            amount: parseFloat(document.getElementById('finance-amount').value) || 0,
            person: document.getElementById('finance-person').value || null, // null pokud není vybráno
            note: document.getElementById('finance-note').value.trim()
        };

        // Validace
        if (!data.date) {
            showNotification('Vyplňte datum.', 'error'); return;
        }
        if (!data.type) {
            showNotification('Vyberte typ záznamu.', 'error'); return;
        }
        if (data.amount <= 0) {
            showNotification('Částka musí být kladné číslo.', 'error'); return;
        }

        addFinance(data);
        // Formulář se skryje v `addFinance` po úspěšném přidání
    });
    document.getElementById('cancel-finance')?.addEventListener('click', () => {
        document.getElementById('finance-form').classList.add('hidden');
         resetFinanceForm();
    });

     // --- Filtry Výkazů ---
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('reset-filters')?.addEventListener('click', resetFilters);

    // --- Export / Sync ---
    document.getElementById('export-data')?.addEventListener('click', exportToCSV);
    document.getElementById('sync-data-manual')?.addEventListener('click', syncDataWithServer); // Manuální tlačítko synchronizace


     // --- Nastavení ---
    document.getElementById('save-rates')?.addEventListener('click', () => {
        const rateMaru = parseFloat(document.getElementById('rate-maru').value) || 0;
        const rateMarty = parseFloat(document.getElementById('rate-marty').value) || 0;

        if (rateMaru >= 0 && rateMarty >= 0) {
            appData.settings.hourlyRates.Maru = rateMaru;
            appData.settings.hourlyRates.Marty = rateMarty;
            saveDataLocally();
            syncDataWithServer(); // Synchronizujeme změny nastavení
            updateSummary(); // Přepočítáme výdělky s novými sazbami
             renderAll(); // Překreslíme tabulky, které zobrazují výdělky
            showNotification('Hodinové sazby byly uloženy.');
        } else {
            showNotification('Sazby musí být nezáporná čísla.', 'error');
        }
    });

    document.getElementById('add-new-category')?.addEventListener('click', () => {
        const newCategoryInput = document.getElementById('new-category-name');
        const categoryName = newCategoryInput.value.trim();
        if (addCategory(categoryName)) {
            newCategoryInput.value = ''; // Vyčistit pole po úspěšném přidání
        }
    });

     document.getElementById('backup-data')?.addEventListener('click', backupData);
     document.getElementById('import-data-file')?.addEventListener('change', importData);
     document.getElementById('clear-local-data')?.addEventListener('click', () => {
         if(confirm("Opravdu chcete smazat VŠECHNA lokální data? Tato akce je nevratná a může vést ke ztrátě dat, pokud nejsou synchronizována s cloudem!")) {
             if(confirm("Poslední varování: Jste si absolutně jisti, že chcete vymazat lokální data?")) {
                 localStorage.removeItem(LOCAL_STORAGE_KEY);
                 initializeDefaultData(); // Reset appData na výchozí stav
                 renderAll();
                 updateSummary();
                 updateSettingsUI();
                 updateCategoryDropdowns();
                 updateCategoryList();
                 showNotification("Lokální data byla vymazána.");
                  // Po vymazání zkusíme načíst data ze serveru, pokud existují
                 dataRef.once('value').then((snapshot) => {
                    const serverData = snapshot.val();
                    if (serverData) {
                        console.log("Načítám data ze serveru po lokálním vymazání.");
                        appData = mergeData(appData, serverData); // Použijeme data ze serveru
                        saveDataLocally(); // Uložíme je lokálně
                        renderAll();
                        updateSummary();
                        updateSettingsUI();
                        updateCategoryDropdowns();
                        updateCategoryList();
                    }
                 });
             }
         }
     });


    // --- Firebase Listener pro real-time aktualizace ---
    dataRef.on('value', (snapshot) => {
        const serverData = snapshot.val();
        console.log("Přijata data z Firebase listeneru.");
        if (serverData) {
             // Načteme aktuální lokální data pro porovnání timestampu
             const localDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
             const currentLocalData = localDataString ? JSON.parse(localDataString) : appData;

             // Použijeme merge strategii
             const mergedData = mergeData(currentLocalData, serverData);

            // Aktualizujeme appData pouze pokud se data změnila
             // Jednoduché porovnání - pro komplexní data může být potřeba hlubší porovnání
             if (JSON.stringify(appData) !== JSON.stringify(mergedData)) {
                console.log("Data se liší, aktualizuji lokální stav a UI.");
                appData = mergedData; // Aktualizujeme naši hlavní proměnnou
                saveDataLocally(); // Uložíme sloučená data lokálně
                // Překreslíme celé UI, aby odráželo potenciální změny
                renderAll();
                updateSummary();
                updateSettingsUI(); // Zahrnuje sazby
                updateCategoryDropdowns(); // Zahrnuje kategorie
                updateCategoryList();
                showNotification("Data byla aktualizována z cloudu.", "info", 1500);
             } else {
                 console.log("Lokální a serverová data jsou shodná, není třeba aktualizovat UI.");
             }
        } else {
            console.log("Server nevrátil žádná data.");
            // Zde bychom mohli zvážit, zda resetovat lokální data, pokud na serveru nic není
            // Ale je bezpečnější ponechat lokální data, pokud server vrátí null/undefined
        }
    }, (error) => {
        console.error("Chyba při naslouchání změn v Firebase:", error);
        showNotification("Chyba připojení k real-time databázi.", "error");
    });


    // Registrace Service Workera pro PWA a Offline funkce
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registrován s rozsahem: ', registration.scope);

                    // Požádáme o oprávnění pro Background Sync (pokud je podporováno)
                    // return registration.sync.register('sync-data'); // Můžeme registrovat zde nebo při offline akci

                }).catch(err => {
                    console.error('ServiceWorker registrace selhala: ', err);
                });
        });
    }

}); // Konec DOMContentLoaded