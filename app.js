// Globální proměnné a konstanty
const HOURLY_RATES = {
    'Maru': 275,
    'Marty': 400
};

const DEBT_PAYMENT_RATIOS = {
    'Maru': 1/3, // 33.33%
    'Marty': 1/2  // 50%
};

// Datová struktura
let appData = {
    reports: [],
    finances: [],
    categories: ['Komunikace s hostem', 'Úklid', 'Wellness']
};

// Timer proměnné
let timerInterval;
let timerRunning = false;
let timerStartTime;
let timerElapsedTime = 0;
let timerPausedTime = 0;

// Pomocné funkce
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatTimeHM(time) {
    return time.substring(0, 5);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
}

function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('cs-CZ') + ' Kč';
}

function parseHoursInput(input) {
    if (!input) return 0;
    
    // Odstranění mezer
    input = input.toString().trim();
    
    // Pokud obsahuje ':', převést na desetinné číslo (2:30 -> 2.5)
    if (input.includes(':')) {
        const [hours, minutes] = input.split(':');
        return parseFloat(hours) + parseFloat(minutes) / 60;
    }
    
    // Formát s 'm' na konci (5m -> 0.08)
    if (input.endsWith('m')) {
        return parseFloat(input.slice(0, -1)) / 60;
    }
    
    // Zpracování čísla jako minut, pokud je >= 60 (250 -> 4.17)
    if (input.length > 0 && !input.includes('.') && !input.includes(',') && parseInt(input) >= 60) {
        return parseInt(input) / 60;
    }
    
    // Formát s čárkou (2,5 -> 2.5)
    if (input.includes(',')) {
        return parseFloat(input.replace(',', '.'));
    }
    
    // Formát času bez oddělovače (0830 -> 8.5)
    if (input.length === 4 && !isNaN(parseInt(input))) {
        const hours = parseInt(input.substring(0, 2));
        const minutes = parseInt(input.substring(2, 4));
        return hours + minutes / 60;
    }
    
    // Standardní číslo (2.5 -> 2.5)
    return parseFloat(input);
}

function calculateHours(startTime, endTime, pauseMinutes) {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) {
        end.setDate(end.getDate() + 1); // Přidá 1 den
    }
    
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours - (pauseMinutes / 60));
}

function calculateEarnings(hours, person) {
    return hours * HOURLY_RATES[person];
}

function calculateDebtPayment(amount, person) {
    return amount * DEBT_PAYMENT_RATIOS[person];
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.classList.remove('success', 'error', 'warning');
        notification.classList.add(type, 'show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

function validateWorkReport(data) {
    const { date, person, category, hours, earnings } = data;
    
    if (!date) {
        showNotification('Prosím vyplňte datum.', 'error');
        return false;
    }
    
    if (!person) {
        showNotification('Prosím vyberte osobu.', 'error');
        return false;
    }
    
    if (!category) {
        showNotification('Prosím vyberte kategorii.', 'error');
        return false;
    }
    
    if (!hours || hours <= 0) {
        showNotification('Neplatný počet hodin. Prosím vyplňte všechny údaje.', 'error');
        return false;
    }
    
    return true;
}

function validateFinanceRecord(data) {
    const { date, type, amount } = data;
    
    if (!date) {
        showNotification('Prosím vyplňte datum.', 'error');
        return false;
    }
    
    if (!type) {
        showNotification('Prosím vyberte typ.', 'error');
        return false;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Prosím zadejte platnou částku.', 'error');
        return false;
    }
    
    return true;
}

// Funkce pro správu lokálního úložiště
function saveData() {
    try {
        localStorage.setItem('workReportData', JSON.stringify(appData));
    } catch (e) {
        console.error('Chyba při ukládání dat:', e);
        showNotification('Chyba při ukládání dat', 'error');
    }
}

function loadData() {
    try {
        const savedData = localStorage.getItem('workReportData');
        if (savedData) {
            appData = JSON.parse(savedData);
            
            // Zajistí, že pole kategorií existuje
            if (!appData.categories) {
                appData.categories = ['Komunikace s hostem', 'Úklid', 'Wellness'];
            }
        }
    } catch (e) {
        console.error('Chyba při načítání dat:', e);
    }
}

// Funkce pro export dat do CSV
function exportToCSV() {
    // Export výkazů
    let reportsCSV = 'Datum,Osoba,Kategorie,Začátek,Konec,Pauza,Odpracováno,Výdělek\n';
    appData.reports.forEach(report => {
        reportsCSV += `${report.date},${report.person},${report.category},${report.startTime},${report.endTime},${report.pauseMinutes},${report.hours},${report.earnings}\n`;
    });
    
    // Export financí
    let financesCSV = 'Datum,Typ,Osoba,Částka,Splátka dluhu,Vyplaceno,Poznámka\n';
    appData.finances.forEach(finance => {
        const type = finance.type === 'income' ? 'Příjem' : 'Výdaj';
        financesCSV += `${finance.date},${type},${finance.person || '-'},${finance.amount},${finance.debtPayment || 0},${finance.payout || 0},${finance.note || ''}\n`;
    });
    
    // Vytvoření a stažení souborů
    downloadCSV('vykazy.csv', reportsCSV);
    downloadCSV('finance.csv', financesCSV);
    
    showNotification('Data byla exportována do CSV souborů.');
}

function downloadCSV(filename, csvData) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Funkce pro timer
function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    const startButton = document.getElementById('start-timer');
    const pauseButton = document.getElementById('pause-timer');
    const stopButton = document.getElementById('stop-timer');
    
    if (startButton) startButton.disabled = true;
    if (pauseButton) pauseButton.disabled = false;
    if (stopButton) stopButton.disabled = false;
    
    timerStartTime = Date.now() - timerElapsedTime;
    
    timerInterval = setInterval(() => {
        const currentTime = Math.floor((Date.now() - timerStartTime) / 1000);
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) timerDisplay.textContent = formatTime(currentTime);
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    
    timerRunning = false;
    clearInterval(timerInterval);
    
    timerElapsedTime = Date.now() - timerStartTime;
    
    const startButton = document.getElementById('start-timer');
    const pauseButton = document.getElementById('pause-timer');
    const stopButton = document.getElementById('stop-timer');
    
    if (startButton) startButton.disabled = false;
    if (pauseButton) pauseButton.disabled = true;
    if (stopButton) stopButton.disabled = false;
}

function stopTimer() {
    if (!timerStartTime) return;
    
    pauseTimer();
    
    const startTime = new Date(timerStartTime);
    const endTime = new Date(timerStartTime + timerElapsedTime);
    
    const timerStartInput = document.getElementById('timer-start');
    const timerEndInput = document.getElementById('timer-end');
    
    if (timerStartInput) {
        timerStartInput.value = 
            `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    }
    
    if (timerEndInput) {
        timerEndInput.value = 
            `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
    }
    
    // Výpočet a zobrazení shrnutí
    updateTimerSummary();
    
    // Zobrazení shrnutí
    const timerSummary = document.getElementById('timer-summary');
    if (timerSummary) timerSummary.classList.remove('hidden');
    
    // Reset timeru
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerElapsedTime = 0;
    
    const timerDisplay = document.getElementById('timer');
    const startButton = document.getElementById('start-timer');
    const pauseButton = document.getElementById('pause-timer');
    const stopButton = document.getElementById('stop-timer');
    
    if (timerDisplay) timerDisplay.textContent = '00:00:00';
    if (startButton) startButton.disabled = false;
    if (pauseButton) pauseButton.disabled = true;
    if (stopButton) stopButton.disabled = true;
}

function updateTimerSummary() {
    const startTimeInput = document.getElementById('timer-start');
    const endTimeInput = document.getElementById('timer-end');
    const pauseInput = document.getElementById('timer-pause');
    const personSelect = document.getElementById('timer-person');
    
    if (!startTimeInput || !endTimeInput || !pauseInput || !personSelect) return;
    
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const pauseMinutes = parseInt(pauseInput.value) || 0;
    const person = personSelect.value;
    
    const hours = calculateHours(startTime, endTime, pauseMinutes);
    const earnings = calculateEarnings(hours, person);
    
    const hoursInput = document.getElementById('timer-hours');
    const earningsInput = document.getElementById('timer-earnings');
    
    if (hoursInput) hoursInput.value = hours.toFixed(2);
    if (earningsInput) earningsInput.value = formatCurrency(earnings);
}

// Funkce pro vykreslení UI
function renderReportsTable() {
    const tableBody = document.getElementById('reports-table-body');
    const noReportsMessage = document.getElementById('no-reports-message');
    const dateFilterInput = document.getElementById('filter-date');
    const personFilterSelect = document.getElementById('filter-person');
    
    if (!tableBody || !noReportsMessage || !dateFilterInput || !personFilterSelect) return;
    
    // Získání filtrů
    const dateFilter = dateFilterInput.value;
    const personFilter = personFilterSelect.value;
    
    // Aplikace filtrů
    let filteredReports = appData.reports;
    
    if (dateFilter) {
        filteredReports = filteredReports.filter(report => report.date === dateFilter);
    }
    
    if (personFilter) {
        filteredReports = filteredReports.filter(report => report.person === personFilter);
    }
    
    // Seřazení dle data (nejnovější nahoře)
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Vyčistit tabulku
    tableBody.innerHTML = '';
    
    // Kontrola prázdných dat
    if (filteredReports.length === 0) {
        tableBody.innerHTML = '';
        noReportsMessage.classList.remove('hidden');
        return;
    } else {
        noReportsMessage.classList.add('hidden');
    }
    
    // Naplnění tabulky
    filteredReports.forEach((report, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatDate(report.date)}</td>
            <td>${report.person}</td>
            <td>${report.category}</td>
            <td>${report.startTime ? formatTimeHM(report.startTime) : '-'}</td>
            <td>${report.endTime ? formatTimeHM(report.endTime) : '-'}</td>
            <td>${report.pauseMinutes}</td>
            <td>${report.hours.toFixed(2)}</td>
            <td>${formatCurrency(report.earnings)}</td>
            <td class="action-cell">
                <button class="btn danger-btn delete-report" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Přidat event listenery pro tlačítka
    document.querySelectorAll('.delete-report').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            deleteReport(filteredReports[index].id);
        });
    });
}

function renderFinancesTable() {
    const tableBody = document.getElementById('finances-table-body');
    const noFinancesMessage = document.getElementById('no-finances-message');
    
    if (!tableBody || !noFinancesMessage) return;
    
    // Získání filtrů
    const dateFilter = document.getElementById('filter-finance-date')?.value;
    const typeFilter = document.getElementById('filter-finance-type')?.value;
    const personFilter = document.getElementById('filter-finance-person')?.value;
    
    // Aplikace filtrů
    let filteredFinances = appData.finances;
    
    if (dateFilter) {
        filteredFinances = filteredFinances.filter(finance => finance.date === dateFilter);
    }
    
    if (typeFilter) {
        filteredFinances = filteredFinances.filter(finance => finance.type === typeFilter);
    }
    
    if (personFilter) {
        filteredFinances = filteredFinances.filter(finance => finance.person === personFilter);
    }
    
    // Seřazení dle data (nejnovější nahoře)
    filteredFinances.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Vyčistit tabulku
    tableBody.innerHTML = '';
    
    // Kontrola prázdných dat
    if (filteredFinances.length === 0) {
        tableBody.innerHTML = '';
        noFinancesMessage.classList.remove('hidden');
        return;
    } else {
        noFinancesMessage.classList.add('hidden');
    }
    
    // Naplnění tabulky
    filteredFinances.forEach((finance, index) => {
        const row = document.createElement('tr');
        
        // Určení barvy řádku podle typu
        let typeClass = '';
        if (finance.type === 'income') {
            typeClass = 'text-success';
        } else if (finance.type === 'expense') {
            typeClass = 'text-danger';
        }
        
        const amountDisplay = finance.type === 'expense' ? 
            `-${formatCurrency(finance.amount)}` : 
            formatCurrency(finance.amount);
        
        row.innerHTML = `
            <td>${formatDate(finance.date)}</td>
            <td class="${typeClass}">${finance.type === 'income' ? 'Příjem' : 'Výdaj'}</td>
            <td>${finance.person || '-'}</td>
            <td class="${typeClass}">${amountDisplay}</td>
            <td>${finance.debtPayment ? formatCurrency(finance.debtPayment) : '-'}</td>
            <td>${finance.payout ? formatCurrency(finance.payout) : '-'}</td>
            <td>${finance.note || '-'}</td>
            <td class="action-cell">
                <button class="btn danger-btn delete-finance" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Přidat event listenery pro tlačítka
    document.querySelectorAll('.delete-finance').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            deleteFinance(filteredFinances[index].id);
        });
    });
}

function updateSummary() {
    // Pro Maru
    const maruReports = appData.reports.filter(report => report.person === 'Maru');
    const maruTotalHours = maruReports.reduce((sum, report) => sum + report.hours, 0);
    const maruTotalEarnings = maruReports.reduce((sum, report) => sum + report.earnings, 0);
    
    const maruDebtPaid = appData.finances
        .filter(finance => finance.person === 'Maru' && finance.debtPayment)
        .reduce((sum, finance) => sum + finance.debtPayment, 0);
    
    const maruPaidOut = appData.finances
        .filter(finance => finance.person === 'Maru' && finance.payout)
        .reduce((sum, finance) => sum + finance.payout, 0);
    
    // Pro Marty
    const martyReports = appData.reports.filter(report => report.person === 'Marty');
    const martyTotalHours = martyReports.reduce((sum, report) => sum + report.hours, 0);
    const martyTotalEarnings = martyReports.reduce((sum, report) => sum + report.earnings, 0);
    
    const martyDebtPaid = appData.finances
        .filter(finance => finance.person === 'Marty' && finance.debtPayment)
        .reduce((sum, finance) => sum + finance.debtPayment, 0);
    
    const martyPaidOut = appData.finances
        .filter(finance => finance.person === 'Marty' && finance.payout)
        .reduce((sum, finance) => sum + finance.payout, 0);
    
    // Celkové souhrny
    const totalHours = maruTotalHours + martyTotalHours;
    const totalEarnings = maruTotalEarnings + martyTotalEarnings;
    
    const totalIncome = appData.finances
        .filter(finance => finance.type === 'income')
        .reduce((sum, finance) => sum + finance.amount, 0);
    
    const totalExpenses = appData.finances
        .filter(finance => finance.type === 'expense')
        .reduce((sum, finance) => sum + finance.amount, 0);
    
    const totalPaidOut = maruPaidOut + martyPaidOut;
    
    // Aktualizace UI
    const elements = {
        maruTotalHours: document.getElementById('maru-total-hours'),
        maruTotalEarnings: document.getElementById('maru-total-earnings'),
        maruDebtPaid: document.getElementById('maru-debt-paid'),
        maruPaidOut: document.getElementById('maru-paid-out'),
        martyTotalHours: document.getElementById('marty-total-hours'),
        martyTotalEarnings: document.getElementById('marty-total-earnings'),
        martyDebtPaid: document.getElementById('marty-debt-paid'),
        martyPaidOut: document.getElementById('marty-paid-out'),
        totalHours: document.getElementById('total-hours'),
        totalEarnings: document.getElementById('total-earnings'),
        totalIncome: document.getElementById('total-income'),
        totalExpenses: document.getElementById('total-expenses'),
        totalPaidOut: document.getElementById('total-paid-out')
    };

    if (elements.maruTotalHours) elements.maruTotalHours.textContent = `${maruTotalHours.toFixed(2)} hodin`;
    if (elements.maruTotalEarnings) elements.maruTotalEarnings.textContent = formatCurrency(maruTotalEarnings);
    if (elements.maruDebtPaid) elements.maruDebtPaid.textContent = formatCurrency(maruDebtPaid);
    if (elements.maruPaidOut) elements.maruPaidOut.textContent = formatCurrency(maruPaidOut);
    
    if (elements.martyTotalHours) elements.martyTotalHours.textContent = `${martyTotalHours.toFixed(2)} hodin`;
    if (elements.martyTotalEarnings) elements.martyTotalEarnings.textContent = formatCurrency(martyTotalEarnings);
    if (elements.martyDebtPaid) elements.martyDebtPaid.textContent = formatCurrency(martyDebtPaid);
    if (elements.martyPaidOut) elements.martyPaidOut.textContent = formatCurrency(martyPaidOut);
    
    if (elements.totalHours) elements.totalHours.textContent = `${totalHours.toFixed(2)} hodin`;
    if (elements.totalEarnings) elements.totalEarnings.textContent = formatCurrency(totalEarnings);
    if (elements.totalIncome) elements.totalIncome.textContent = formatCurrency(totalIncome);
    if (elements.totalExpenses) elements.totalExpenses.textContent = `-${formatCurrency(totalExpenses)}`;
    if (elements.totalPaidOut) elements.totalPaidOut.textContent = formatCurrency(totalPaidOut);
}

function updateCategoryDropdowns() {
    const categoryDropdowns = document.querySelectorAll('#timer-category, #manual-category');
    
    categoryDropdowns.forEach(dropdown => {
        // Uložit aktuální hodnotu
        const currentValue = dropdown.value;
        
        // Vyčistit dropdown kromě vlastní kategorie
        const customOption = dropdown.querySelector('option[value="custom"]');
        dropdown.innerHTML = '';
        
        // Přidat všechny kategorie
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            dropdown.appendChild(option);
        });
        
        // Přidat zpět vlastní kategorii
        if (customOption) dropdown.appendChild(customOption);
        
        // Obnovit původní hodnotu
        if (appData.categories.includes(currentValue) || currentValue === 'custom') {
            dropdown.value = currentValue;
        }
    });
}

// CRUD operace pro výkazy a finance
function addWorkReport(data) {
    // Generování ID
    const id = Date.now().toString();
    const report = { ...data, id };
    
    appData.reports.push(report);
    saveData();
    
    // Automaticky přidat příjem do financí
    addFinanceFromReport(report);
    
    renderReportsTable();
    renderFinancesTable();
    updateSummary();
    
    showNotification('Pracovní výkaz byl úspěšně přidán.');
    
    return id;
}

function deleteReport(id) {
    if (confirm('Opravdu chcete smazat tento výkaz?')) {
        appData.reports = appData.reports.filter(report => report.id !== id);
        saveData();
        renderReportsTable();
        updateSummary();
        showNotification('Výkaz byl smazán.');
    }
}

function addFinance(data) {
    // Generování ID
    const id = Date.now().toString();
    const finance = { ...data, id };
    
    appData.finances.push(finance);
    saveData();
    
    renderFinancesTable();
    updateSummary();
    
    showNotification('Finanční záznam byl úspěšně přidán.');
    
    return id;
}

function addFinanceFromReport(report) {
    // Výpočet splátek dluhu
    const debtPayment = calculateDebtPayment(report.earnings, report.person);
    const payout = report.earnings - debtPayment;
    
    const financeData = {
        date: report.date,
        type: 'income',
        amount: report.earnings,
        person: report.person,
        note: `Výkaz: ${report.category} (${report.hours.toFixed(2)} hod)`,
        debtPayment: debtPayment,
        payout: payout,
        reportId: report.id
    };
    
    addFinance(financeData);
}

function deleteFinance(id) {
    if (confirm('Opravdu chcete smazat tento finanční záznam?')) {
        appData.finances = appData.finances.filter(finance => finance.id !== id);
        saveData();
        renderFinancesTable();
        updateSummary();
        showNotification('Finanční záznam byl smazán.');
    }
}

// Inicializace formulářů
function initForms() {
    // Nastavit dnešní datum pro všechny datumové vstupy
    const today = new Date().toISOString().split('T')[0];
    const manualDate = document.getElementById('manual-date');
    const financeDate = document.getElementById('finance-date');
    
    if (manualDate) manualDate.value = today;
    if (financeDate) financeDate.value = today;
    
    // Přidání nových kategorií
    const timerCategory = document.getElementById('timer-category');
    if (timerCategory) {
        timerCategory.addEventListener('change', function() {
            const customCategoryInput = document.getElementById('timer-custom-category');
            if (customCategoryInput) {
                if (this.value === 'custom') {
                    customCategoryInput.classList.remove('hidden');
                    customCategoryInput.focus();
                } else {
                    customCategoryInput.classList.add('hidden');
                }
            }
        });
    }
    
    const manualCategory = document.getElementById('manual-category');
    if (manualCategory) {
        manualCategory.addEventListener('change', function() {
            const customCategoryInput = document.getElementById('manual-custom-category');
            if (customCategoryInput) {
                if (this.value === 'custom') {
                    customCategoryInput.classList.remove('hidden#pragma once');
                    customCategoryInput.focus();
                } else {
                    customCategoryInput.classList.add('hidden');
                }
            }
        });
    }
    
    // Výpočet hodin a výdělku pro manuální režim
    const manualStartInput = document.getElementById('manual-start');
    const manualEndInput = document.getElementById('manual-end');
    const manualPauseInput = document.getElementById('manual-pause');
    const manualHoursInput = document.getElementById('manual-hours');
    const manualPersonSelect = document.getElementById('manual-person');
    
    function updateManualEarnings() {
        if (!manualHoursInput || !manualPersonSelect) return;
        
        let hours = 0;
        
        // Pokud je vyplněn počet hodin ručně, použijeme to
        if (manualHoursInput.value) {
            hours = parseHoursInput(manualHoursInput.value);
        } 
        // Jinak vypočítáme z času začátku, konce a pauzy
        else if (manualStartInput?.value && manualEndInput?.value) {
            const pauseMinutes = parseInt(manualPauseInput?.value) || 0;
            hours = calculateHours(manualStartInput.value, manualEndInput.value, pauseMinutes);
            manualHoursInput.value = hours.toFixed(2);
        }
        
        const person = manualPersonSelect.value;
        const earnings = calculateEarnings(hours, person);
        
        const earningsInput = document.getElementById('manual-earnings');
        if (earningsInput) earningsInput.value = formatCurrency(earnings);
    }
    
    if (manualStartInput) manualStartInput.addEventListener('change', updateManualEarnings);
    if (manualEndInput) manualEndInput.addEventListener('change', updateManualEarnings);
    if (manualPauseInput) manualPauseInput.addEventListener('input', updateManualEarnings);
    if (manualHoursInput) manualHoursInput.addEventListener('input', updateManualEarnings);
    if (manualPersonSelect) manualPersonSelect.addEventListener('change', updateManualEarnings);
    
    // Finance form
    const financeType = document.getElementById('finance-type');
    if (financeType) {
        financeType.addEventListener('change', function() {
            const debtPaymentSection = document.getElementById('finance-debt-payment');
            const financePersonSelect = document.getElementById('finance-person');
            
            if (debtPaymentSection && financePersonSelect) {
                if (this.value === 'income' && financePersonSelect.value) {
                    debtPaymentSection.style.display = 'flex';
                    updateDebtPayment();
                } else {
                    debtPaymentSection.style.display = 'none';
                }
            }
        });
    }
    
    const financePerson = document.getElementById('finance-person');
    if (financePerson) {
        financePerson.addEventListener('change', function() {
            const debtPaymentSection = document.getElementById('finance-debt-payment');
            const financeTypeSelect = document.getElementById('finance-type');
            
            if (debtPaymentSection && financeTypeSelect) {
                if (financeTypeSelect.value === 'income' && this.value) {
                    debtPaymentSection.style.display = 'flex';
                    updateDebtPayment();
                } else {
                    debtPaymentSection.style.display = 'none';
                }
            }
        });
    }
    
    function updateDebtPayment() {
        const amountInput = document.getElementById('finance-amount');
        const personSelect = document.getElementById('finance-person');
        const debtRatioInput = document.getElementById('finance-debt-ratio');
        
        if (!amountInput || !personSelect || !debtRatioInput) return;
        
        const amount = parseFloat(amountInput.value) || 0;
        const person = personSelect.value;
        
        if (person) {
            // Nastavit výchozí hodnotu podle osoby
            const defaultRatio = DEBT_PAYMENT_RATIOS[person] * 100;
            debtRatioInput.value = defaultRatio;
            
            const ratio = parseFloat(debtRatioInput.value) / 100;
            const debtAmount = amount * ratio;
            const payout = amount - debtAmount;
            
            const debtAmountInput = document.getElementById('finance-debt-amount');
            const payoutInput = document.getElementById('finance-payout');
            
            if (debtAmountInput) debtAmountInput.value = debtAmount.toFixed(2);
            if (payoutInput) payoutInput.value = payout.toFixed(2);
        }
    }
    
    const financeAmount = document.getElementById('finance-amount');
    const financeDebtRatio = document.getElementById('finance-debt-ratio');
    if (financeAmount) financeAmount.addEventListener('input', updateDebtPayment);
    if (financeDebtRatio) financeDebtRatio.addEventListener('input', updateDebtPayment);
    
    // Timer pauza změna
    const timerPause = document.getElementById('timer-pause');
    if (timerPause) timerPause.addEventListener('input', updateTimerSummary);
}

// Event listenery
function initEventListeners() {
    // Navigace
    const navReports = document.getElementById('nav-reports');
    if (navReports) {
        navReports.addEventListener('click', function() {
            showSection('reports-section');
            this.classList.add('active');
            document.getElementById('nav-finances')?.classList.remove('active');
            document.getElementById('nav-summary')?.classList.remove('active');
        });
    }
    
    const navFinances = document.getElementById('nav-finances');
    if (navFinances) {
        navFinances.addEventListener('click', function() {
            showSection('finances-section');
            this.classList.add('active');
            document.getElementById('nav-reports')?.classList.remove('active');
            document.getElementById('nav-summary')?.classList.remove('active');
        });
    }
    
    const navSummary = document.getElementById('nav-summary');
    if (navSummary) {
        navSummary.addEventListener('click', function() {
            showSection('summary-section');
            this.classList.add('active');
            document.getElementById('nav-reports')?.classList.remove('active');
            document.getElementById('nav-finances')?.classList.remove('active');
            updateSummary();
        });
    }
    
    // Přepínání režimů ve výkazech
    const toggleTimerMode = document.getElementById('toggle-timer-mode');
    if (toggleTimerMode) {
        toggleTimerMode.addEventListener('click', function() {
            document.getElementById('timer-mode')?.classList.remove('hidden');
            document.getElementById('manual-mode')?.classList.add('hidden');
            this.classList.add('primary-btn');
            document.getElementById('toggle-manual-mode')?.classList.remove('primary-btn');
        });
    }
    
    const toggleManualMode = document.getElementById('toggle-manual-mode');
    if (toggleManualMode) {
        toggleManualMode.addEventListener('click', function() {
            document.getElementById('timer-mode')?.classList.add('hidden');
            document.getElementById('manual-mode')?.classList.remove('hidden');
            this.classList.add('primary-btn');
            document.getElementById('toggle-timer-mode')?.classList.remove('primary-btn');
        });
    }
    
    // Timer ovládání
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const stopTimerBtn = document.getElementById('stop-timer');
    
    if (startTimerBtn) startTimerBtn.addEventListener('click', startTimer);
    if (pauseTimerBtn) pauseTimerBtn.addEventListener('click', pauseTimer);
    if (stopTimerBtn) stopTimerBtn.addEventListener('click', stopTimer);
    
    // Filtry výkazů
    const filterDate = document.getElementById('filter-date');
    const filterPerson = document.getElementById('filter-person');
    const clearFilters = document.getElementById('clear-filters');
    
    if (filterDate) filterDate.addEventListener('change', renderReportsTable);
    if (filterPerson) filterPerson.addEventListener('change', renderReportsTable);
    if (clearFilters) {
        clearFilters.addEventListener('click', function() {
            if (filterDate) filterDate.value = '';
            if (filterPerson) filterPerson.value = '';
            renderReportsTable();
        });
    }
    
    // Filtry financí
    const filterFinanceDate = document.getElementById('filter-finance-date');
    const filterFinanceType = document.getElementById('filter-finance-type');
    const filterFinancePerson = document.getElementById('filter-finance-person');
    const clearFinanceFilters = document.getElementById('clear-finance-filters');
    
    if (filterFinanceDate) filterFinanceDate.addEventListener('change', renderFinancesTable);
    if (filterFinanceType) filterFinanceType.addEventListener('change', renderFinancesTable);
    if (filterFinancePerson) filterFinancePerson.addEventListener('change', renderFinancesTable);
    if (clearFinanceFilters) {
        clearFinanceFilters.addEventListener('click', function() {
            if (filterFinanceDate) filterFinanceDate.value = '';
            if (filterFinanceType) filterFinanceType.value = '';
            if (filterFinancePerson) filterFinancePerson.value = '';
            renderFinancesTable();
        });
    }
    
    // Tlačítka pro ukládání záznamů
    const saveTimerBtn = document.getElementById('save-timer');
    const saveManualBtn = document.getElementById('save-manual');
    
    if (saveTimerBtn) saveTimerBtn.addEventListener('click', saveTimerReport);
    if (saveManualBtn) saveManualBtn.addEventListener('click', saveManualReport);
    
    // Finance sekce
    const addFinanceBtn = document.getElementById('add-finance');
    if (addFinanceBtn) {
        addFinanceBtn.addEventListener('click', function() {
            document.getElementById('finance-form')?.classList.remove('hidden');
            this.classList.add('hidden');
        });
    }
    
    const cancelFinanceBtn = document.getElementById('cancel-finance');
    if (cancelFinanceBtn) {
        cancelFinanceBtn.addEventListener('click', function() {
            document.getElementById('finance-form')?.classList.add('hidden');
            document.getElementById('add-finance')?.classList.remove('hidden');
            resetFinanceForm();
        });
    }
    
    const saveFinanceBtn = document.getElementById('save-finance');
    if (saveFinanceBtn) saveFinanceBtn.addEventListener('click', saveFinanceRecord);
    
    // Export
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportToCSV);
    
    // Přidat event listener pro instalaci PWA
    const installButton = document.getElementById('install-app');
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installButton) installButton.classList.remove('hidden');
    });
    
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('Uživatel aplikaci nainstaloval');
            } else {
                console.log('Uživatel instalaci odmítl');
            }
            
            deferredPrompt = null;
            installButton.classList.add('hidden');
        });
    }
}

// Funkce pro zobrazení sekce
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
}

// Funkce pro ukládání záznamů
function saveTimerReport() {
    const date = new Date().toISOString().split('T')[0];
    const personSelect = document.getElementById('timer-person');
    const categorySelect = document.getElementById('timer-category');
    
    if (!personSelect || !categorySelect) return;
    
    const person = personSelect.value;
    let category = categorySelect.value;
    
    // Kontrola vlastní kategorie
    if (category === 'custom') {
        const customCategoryInput = document.getElementById('timer-custom-category');
        if (!customCategoryInput) return;
        
        const customCategory = customCategoryInput.value.trim();
        
        if (!customCategory) {
            showNotification('Prosím zadejte vlastní kategorii.', 'error');
            return;
        }
        
        category = customCategory;
        
        // Přidat novou kategorii pokud ještě neexistuje
        if (!appData.categories.includes(category)) {
            appData.categories.push(category);
            updateCategoryDropdowns();
        }
    }
    
    const startTimeInput = document.getElementById('timer-start');
    const endTimeInput = document.getElementById('timer-end');
    const pauseInput = document.getElementById('timer-pause');
    const hoursInput = document.getElementById('timer-hours');
    const earningsInput = document.getElementById('timer-earnings');
    
    if (!startTimeInput || !endTimeInput || !pauseInput || !hoursInput || !earningsInput) return;
    
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const pauseMinutes = parseInt(pauseInput.value) || 0;
    const hours = parseFloat(hoursInput.value);
    const earnings = parseFloat(earningsInput.value.replace(/\s/g, '').replace(',', '.').replace('Kč', ''));
    
    const reportData = {
        date,
        person,
        category,
        startTime,
        endTime,
        pauseMinutes,
        hours,
        earnings
    };
    
    if (validateWorkReport(reportData)) {
        addWorkReport(reportData);
        resetTimerForm();
    }
}

function saveManualReport() {
    const dateInput = document.getElementById('manual-date');
    const personSelect = document.getElementById('manual-person');
    const categorySelect = document.getElementById('manual-category');
    
    if (!dateInput || !personSelect || !categorySelect) return;
    
    const date = dateInput.value;
    const person = personSelect.value;
    let category = categorySelect.value;
    
    // Kontrola vlastní kategorie
    if (category === 'custom') {
        const customCategoryInput = document.getElementById('manual-custom-category');
        if (!customCategoryInput) return;
        
        const customCategory = customCategoryInput.value.trim();
        
        if (!customCategory) {
            showNotification('Prosím zadejte vlastní kategorii.', 'error');
            return;
        }
        
        category = customCategory;
        
        // Přidat novou kategorii pokud ještě neexistuje
        if (!appData.categories.includes(category)) {
            appData.categories.push(category);
            updateCategoryDropdowns();
        }
    }
    
    const startTimeInput = document.getElementById('manual-start');
    const endTimeInput = document.getElementById('manual-end');
    const pauseInput = document.getElementById('manual-pause');
    const hoursInput = document.getElementById('manual-hours');
    
    if (!startTimeInput || !endTimeInput || !pauseInput || !hoursInput) return;
    
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const pauseMinutes = parseInt(pauseInput.value) || 0;
    
    let hours;
    
    // Pokud je vyplněn počet hodin ručně, použijeme to
    if (hoursInput.value) {
        hours = parseHoursInput(hoursInput.value);
    } 
    // Jinak vypočítáme z času začátku, konce a pauzy
    else if (startTime && endTime) {
        hours = calculateHours(startTime, endTime, pauseMinutes);
    } else {
        showNotification('Prosím vyplňte čas začátku a konce nebo zadejte počet hodin ručně.', 'error');
        return;
    }
    
    const earnings = calculateEarnings(hours, person);
    
    const reportData = {
        date,
        person,
        category,
        startTime,
        endTime,
        pauseMinutes,
        hours,
        earnings
    };
    
    if (validateWorkReport(reportData)) {
        addWorkReport(reportData);
        resetManualForm();
    }
}

function saveFinanceRecord() {
    const dateInput = document.getElementById('finance-date');
    const typeSelect = document.getElementById('finance-type');
    const amountInput = document.getElementById('finance-amount');
    const personSelect = document.getElementById('finance-person');
    const noteInput = document.getElementById('finance-note');
    
    if (!dateInput || !typeSelect || !amountInput || !personSelect || !noteInput) return;
    
    const date = dateInput.value;
    const type = typeSelect.value;
    const amount = parseFloat(amountInput.value);
    const person = personSelect.value;
    const note = noteInput.value;
    
    let debtPayment = null;
    let payout = null;
    
    // Výpočet splátky dluhu a vyplacené částky pro příjmy
    if (type === 'income' && person) {
        const debtRatioInput = document.getElementById('finance-debt-ratio');
        if (debtRatioInput) {
            const ratio = parseFloat(debtRatioInput.value) / 100;
            debtPayment = amount * ratio;
            payout = amount - debtPayment;
        }
    }
    
    const financeData = {
        date,
        type,
        amount,
        person,
        note,
        debtPayment,
        payout
    };
    
    if (validateFinanceRecord(financeData)) {
        addFinance(financeData);
        resetFinanceForm();
        document.getElementById('finance-form')?.classList.add('hidden');
        document.getElementById('add-finance')?.classList.remove('hidden');
    }
}

// Reset formulářů
function resetTimerForm() {
    const summary = document.getElementById('timer-summary');
    const pauseInput = document.getElementById('timer-pause');
    
    if (summary) summary.classList.add('hidden');
    if (pauseInput) pauseInput.value = '0';
    resetTimer();
}

function resetManualForm() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('manual-date');
    const startInput = document.getElementById('manual-start');
    const endInput = document.getElementById('manual-end');
    const pauseInput = document.getElementById('manual-pause');
    const hoursInput = document.getElementById('manual-hours');
    const earningsInput = document.getElementById('manual-earnings');
    const customCategoryInput = document.getElementById('manual-custom-category');
    const categorySelect = document.getElementById('manual-category');
    
    if (dateInput) dateInput.value = today;
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (pauseInput) pauseInput.value = '0';
    if (hoursInput) hoursInput.value = '';
    if (earningsInput) earningsInput.value = '';
    if (customCategoryInput) {
        customCategoryInput.value = '';
        customCategoryInput.classList.add('hidden');
    }
    if (categorySelect && categorySelect.options[0]) {
        categorySelect.value = categorySelect.options[0].value;
    }
}

function resetFinanceForm() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('finance-date');
    const typeSelect = document.getElementById('finance-type');
    const amountInput = document.getElementById('finance-amount');
    const personSelect = document.getElementById('finance-person');
    const noteInput = document.getElementById('finance-note');
    const debtRatioInput = document.getElementById('finance-debt-ratio');
    const debtAmountInput = document.getElementById('finance-debt-amount');
    const payoutInput = document.getElementById('finance-payout');
    const debtPaymentSection = document.getElementById('finance-debt-payment');
    
    if (dateInput) dateInput.value = today;
    if (typeSelect) typeSelect.value = 'income';
    if (amountInput) amountInput.value = '';
    if (personSelect) personSelect.value = '';
    if (noteInput) noteInput.value = '';
    if (debtRatioInput) debtRatioInput.value = '0';
    if (debtAmountInput) debtAmountInput.value = '';
    if (payoutInput) payoutInput.value = '';
    if (debtPaymentSection) debtPaymentSection.style.display = 'none';
}

// Inicializace aplikace
function initApp() {
    // Načíst data
    loadData();
    
    // Inicializovat formuláře
    initForms();
    
    // Přidat event listenery
    initEventListeners();
    
    // Vyplnit tabulky
    renderReportsTable();
    renderFinancesTable();
    
    // Aktualizovat souhrn
    updateSummary();
    
    // Aktualizovat dropdowny kategorií
    updateCategoryDropdowns();
}

// Spuštění aplikace při načtení stránky
document.addEventListener('DOMContentLoaded', initApp);