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
    notification.textContent = message;
    notification.classList.remove('success', 'error', 'warning');
    notification.classList.add(type, 'show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function validateWorkReport(data) {
    const { date, person, category, startTime, endTime, pauseMinutes, hours, earnings } = data;
    
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
    localStorage.setItem('workReportData', JSON.stringify(appData));
}

function loadData() {
    const savedData = localStorage.getItem('workReportData');
    if (savedData) {
        appData = JSON.parse(savedData);
        
        // Zajistí, že pole kategorií existuje
        if (!appData.categories) {
            appData.categories = ['Komunikace s hostem', 'Úklid', 'Wellness'];
        }
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
    document.getElementById('start-timer').disabled = true;
    document.getElementById('pause-timer').disabled = false;
    document.getElementById('stop-timer').disabled = false;
    
    timerStartTime = Date.now() - timerElapsedTime;
    
    timerInterval = setInterval(() => {
        const currentTime = Math.floor((Date.now() - timerStartTime) / 1000);
        document.getElementById('timer').textContent = formatTime(currentTime);
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    
    timerRunning = false;
    clearInterval(timerInterval);
    
    timerElapsedTime = Date.now() - timerStartTime;
    
    document.getElementById('start-timer').disabled = false;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('stop-timer').disabled = false;
}

function stopTimer() {
    if (!timerStartTime) return;
    
    pauseTimer();
    
    const startTime = new Date(timerStartTime);
    const endTime = new Date(timerStartTime + timerElapsedTime);
    
    document.getElementById('timer-start').value = 
        `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    
    document.getElementById('timer-end').value = 
        `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
    
    // Výpočet a zobrazení shrnutí
    updateTimerSummary();
    
    // Zobrazení shrnutí
    document.getElementById('timer-summary').classList.remove('hidden');
    
    // Reset timeru
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerElapsedTime = 0;
    document.getElementById('timer').textContent = '00:00:00';
    document.getElementById('start-timer').disabled = false;
    document.getElementById('pause-timer').disabled = true;
    document.getElementById('stop-timer').disabled = true;
}

function updateTimerSummary() {
    const startTime = document.getElementById('timer-start').value;
    const endTime = document.getElementById('timer-end').value;
    const pauseMinutes = parseInt(document.getElementById('timer-pause').value) || 0;
    const person = document.getElementById('timer-person').value;
    
    const hours = calculateHours(startTime, endTime, pauseMinutes);
    const earnings = calculateEarnings(hours, person);
    
    document.getElementById('timer-hours').value = hours.toFixed(2);
    document.getElementById('timer-earnings').value = formatCurrency(earnings);
}

// Funkce pro vykreslení UI
function renderReportsTable() {
    const tableBody = document.getElementById('reports-table-body');
    const noReportsMessage = document.getElementById('no-reports-message');
    
    // Získání filtrů
    const dateFilter = document.getElementById('filter-date').value;
    const personFilter = document.getElementById('filter-person').value;
    
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
    
    // Získání filtrů
    const dateFilter = document.getElementById('filter-finance-date').value;
    const typeFilter = document.getElementById('filter-finance-type').value;
    const personFilter = document.getElementById('filter-finance-person').value;
    
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
    document.getElementById('maru-total-hours').textContent = `${maruTotalHours.toFixed(2)} hodin`;
    document.getElementById('maru-total-earnings').textContent = formatCurrency(maruTotalEarnings);
    document.getElementById('maru-debt-paid').textContent = formatCurrency(maruDebtPaid);
    document.getElementById('maru-paid-out').textContent = formatCurrency(maruPaidOut);
    
    document.getElementById('marty-total-hours').textContent = `${martyTotalHours.toFixed(2)} hodin`;
    document.getElementById('marty-total-earnings').textContent = formatCurrency(martyTotalEarnings);
    document.getElementById('marty-debt-paid').textContent = formatCurrency(martyDebtPaid);
    document.getElementById('marty-paid-out').textContent = formatCurrency(martyPaidOut);
    
    document.getElementById('total-hours').textContent = `${totalHours.toFixed(2)} hodin`;
    document.getElementById('total-earnings').textContent = formatCurrency(totalEarnings);
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = `-${formatCurrency(totalExpenses)}`;
    document.getElementById('total-paid-out').textContent = formatCurrency(totalPaidOut);
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
        dropdown.appendChild(customOption);
        
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
    document.getElementById('manual-date').value = today;
    document.getElementById('finance-date').value = today;
    
    // Přidání nových kategorií
    document.getElementById('timer-category').addEventListener('change', function() {
        const customCategoryInput = document.getElementById('timer-custom-category');
        
        if (this.value === 'custom') {
            customCategoryInput.classList.remove('hidden');
            customCategoryInput.focus();
        } else {
            customCategoryInput.classList.add('hidden');
        }
    });
    
    document.getElementById('manual-category').addEventListener('change', function() {
        const customCategoryInput = document.getElementById('manual-custom-category');
        
        if (this.value === 'custom') {
            customCategoryInput.classList.remove('hidden');
            customCategoryInput.focus();
        } else {
            customCategoryInput.classList.add('hidden');
        }
    });
    
    // Výpočet hodin a výdělku pro manuální režim
    const manualStartInput = document.getElementById('manual-start');
    const manualEndInput = document.getElementById('manual-end');
    const manualPauseInput = document.getElementById('manual-pause');
    const manualHoursInput = document.getElementById('manual-hours');
    const manualPersonSelect = document.getElementById('manual-person');
    
    function updateManualEarnings() {
        let hours = 0;
        
        // Pokud je vyplněn počet hodin ručně, použijeme to
        if (manualHoursInput.value) {
            hours = parseHoursInput(manualHoursInput.value);
        } 
        // Jinak vypočítáme z času začátku, konce a pauzy
        else if (manualStartInput.value && manualEndInput.value) {
            const pauseMinutes = parseInt(manualPauseInput.value) || 0;
            hours = calculateHours(manualStartInput.value, manualEndInput.value, pauseMinutes);
            manualHoursInput.value = hours.toFixed(2);
        }
        
        const person = manualPersonSelect.value;
        const earnings = calculateEarnings(hours, person);
        
        document.getElementById('manual-earnings').value = formatCurrency(earnings);
    }
    
    manualStartInput.addEventListener('change', updateManualEarnings);
    manualEndInput.addEventListener('change', updateManualEarnings);
    manualPauseInput.addEventListener('input', updateManualEarnings);
    manualHoursInput.addEventListener('input', updateManualEarnings);
    manualPersonSelect.addEventListener('change', updateManualEarnings);
    
    // Finance form
    document.getElementById('finance-type').addEventListener('change', function() {
        const debtPaymentSection = document.getElementById('finance-debt-payment');
        const financePersonSelect = document.getElementById('finance-person');
        
        if (this.value === 'income' && financePersonSelect.value) {
            debtPaymentSection.style.display = 'flex';
            updateDebtPayment();
        } else {
            debtPaymentSection.style.display = 'none';
        }
    });
    
    document.getElementById('finance-person').addEventListener('change', function() {
        const debtPaymentSection = document.getElementById('finance-debt-payment');
        const financeTypeSelect = document.getElementById('finance-type');
        
        if (financeTypeSelect.value === 'income' && this.value) {
            debtPaymentSection.style.display = 'flex';
            updateDebtPayment();
        } else {
            debtPaymentSection.style.display = 'none';
        }
    });
    
    function updateDebtPayment() {
        const amount = parseFloat(document.getElementById('finance-amount').value) || 0;
        const person = document.getElementById('finance-person').value;
        const debtRatioInput = document.getElementById('finance-debt-ratio');
        
        if (person) {
            // Nastavit výchozí hodnotu podle osoby
            const defaultRatio = DEBT_PAYMENT_RATIOS[person] * 100;
            debtRatioInput.value = defaultRatio;
            
            const ratio = parseFloat(debtRatioInput.value) / 100;
            const debtAmount = amount * ratio;
            const payout = amount - debtAmount;
            
            document.getElementById('finance-debt-amount').value = debtAmount.toFixed(2);
            document.getElementById('finance-payout').value = payout.toFixed(2);
        }
    }
    
    document.getElementById('finance-amount').addEventListener('input', updateDebtPayment);
    document.getElementById('finance-debt-ratio').addEventListener('input', updateDebtPayment);
    
    // Timer pauza změna
```javascript
document.getElementById('timer-pause').addEventListener('input', updateTimerSummary);
```
// Event listenery
function initEventListeners() {
    // Navigace
    document.getElementById('nav-reports').addEventListener('click', function() {
        showSection('reports-section');
        this.classList.add('active');
        document.getElementById('nav-finances').classList.remove('active');
        document.getElementById('nav-summary').classList.remove('active');
    });
    
    document.getElementById('nav-finances').addEventListener('click', function() {
        showSection('finances-section');
        this.classList.add('active');
        document.getElementById('nav-reports').classList.remove('active');
        document.getElementById('nav-summary').classList.remove('active');
    });
    
    document.getElementById('nav-summary').addEventListener('click', function() {
        showSection('summary-section');
        this.classList.add('active');
        document.getElementById('nav-reports').classList.remove('active');
        document.getElementById('nav-finances').classList.remove('active');
        updateSummary();
    });
    
    // Přepínání režimů ve výkazech
    document.getElementById('toggle-timer-mode').addEventListener('click', function() {
        document.getElementById('timer-mode').classList.remove('hidden');
        document.getElementById('manual-mode').classList.add('hidden');
        this.classList.add('primary-btn');
        document.getElementById('toggle-manual-mode').classList.remove('primary-btn');
    });
    
    document.getElementById('toggle-manual-mode').addEventListener('click', function() {
        document.getElementById('timer-mode').classList.add('hidden');
        document.getElementById('manual-mode').classList.remove('hidden');
        this.classList.add('primary-btn');
        document.getElementById('toggle-timer-mode').classList.remove('primary-btn');
    });
    
    // Timer ovládání
    document.getElementById('start-timer').addEventListener('click', startTimer);
    document.getElementById('pause-timer').addEventListener('click', pauseTimer);
    document.getElementById('stop-timer').addEventListener('click', stopTimer);
    
    // Filtry výkazů
    document.getElementById('filter-date').addEventListener('change', renderReportsTable);
    document.getElementById('filter-person').addEventListener('change', renderReportsTable);
    document.getElementById('clear-filters').addEventListener('click', function() {
        document.getElementById('filter-date').value = '';
        document.getElementById('filter-person').value = '';
        renderReportsTable();
    });
    
    // Filtry financí
    document.getElementById('filter-finance-date').addEventListener('change', renderFinancesTable);
    document.getElementById('filter-finance-type').addEventListener('change', renderFinancesTable);
    document.getElementById('filter-finance-person').addEventListener('change', renderFinancesTable);
    document.getElementById('clear-finance-filters').addEventListener('click', function() {
        document.getElementById('filter-finance-date').value = '';
        document.getElementById('filter-finance-type').value = '';
        document.getElementById('filter-finance-person').value = '';
        renderFinancesTable();
    });
    
    // Tlačítka pro ukládání záznamů
    document.getElementById('save-timer').addEventListener('click', saveTimerReport);
    document.getElementById('save-manual').addEventListener('click', saveManualReport);
    
    // Finance sekce
    document.getElementById('add-finance').addEventListener('click', function() {
        document.getElementById('finance-form').classList.remove('hidden');
        this.classList.add('hidden');
    });
    
    document.getElementById('cancel-finance').addEventListener('click', function() {
        document.getElementById('finance-form').classList.add('hidden');
        document.getElementById('add-finance').classList.remove('hidden');
        resetFinanceForm();
    });
    
    document.getElementById('save-finance').addEventListener('click', saveFinanceRecord);
    
    // Export
    document.getElementById('export-data').addEventListener('click', exportToCSV);
    
    // Přidat event listener pro instalaci PWA
    const installButton = document.getElementById('install-app');
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.classList.remove('hidden');
    });
    
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

// Funkce pro zobrazení sekce
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
}

// Funkce pro ukládání záznamů
function saveTimerReport() {
    const date = new Date().toISOString().split('T')[0];
    const person = document.getElementById('timer-person').value;
    let category = document.getElementById('timer-category').value;
    
    // Kontrola vlastní kategorie
    if (category === 'custom') {
        const customCategory = document.getElementById('timer-custom-category').value.trim();
        
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
    
    const startTime = document.getElementById('timer-start').value;
    const endTime = document.getElementById('timer-end').value;
    const pauseMinutes = parseInt(document.getElementById('timer-pause').value) || 0;
    const hours = parseFloat(document.getElementById('timer-hours').value);
    const earnings = parseFloat(document.getElementById('timer-earnings').value.replace(/\s/g, '').replace(',', '.').replace('Kč', ''));
    
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
    const date = document.getElementById('manual-date').value;
    const person = document.getElementById('manual-person').value;
    let category = document.getElementById('manual-category').value;
    
    // Kontrola vlastní kategorie
    if (category === 'custom') {
        const customCategory = document.getElementById('manual-custom-category').value.trim();
        
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
    
    const startTime = document.getElementById('manual-start').value;
    const endTime = document.getElementById('manual-end').value;
    const pauseMinutes = parseInt(document.getElementById('manual-pause').value) || 0;
    
    let hours;
    
    // Pokud je vyplněn počet hodin ručně, použijeme to
    if (document.getElementById('manual-hours').value) {
        hours = parseHoursInput(document.getElementById('manual-hours').value);
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
    const date = document.getElementById('finance-date').value;
    const type = document.getElementById('finance-type').value;
    const amount = parseFloat(document.getElementById('finance-amount').value);
    const person = document.getElementById('finance-person').value;
    const note = document.getElementById('finance-note').value;
    
    let debtPayment = null;
    let payout = null;
    
    // Výpočet splátky dluhu a vyplacené částky pro příjmy
    if (type === 'income' && person) {
        const ratio = parseFloat(document.getElementById('finance-debt-ratio').value) / 100;
        debtPayment = amount * ratio;
        payout = amount - debtPayment;
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
        document.getElementById('finance-form').classList.add('hidden');
        document.getElementById('add-finance').classList.remove('hidden');
    }
}

// Reset formulářů
function resetTimerForm() {
    document.getElementById('timer-summary').classList.add('hidden');
    document.getElementById('timer-pause').value = '0';
    resetTimer();
}

function resetManualForm() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('manual-date').value = today;
    document.getElementById('manual-start').value = '';
    document.getElementById('manual-end').value = '';
    document.getElementById('manual-pause').value = '0';
    document.getElementById('manual-hours').value = '';
    document.getElementById('manual-earnings').value = '';
    document.getElementById('manual-custom-category').value = '';
    document.getElementById('manual-custom-category').classList.add('hidden');
    document.getElementById('manual-category').value = document.getElementById('manual-category').options[0].value;
}

function resetFinanceForm() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('finance-date').value = today;
    document.getElementById('finance-type').value = 'income';
    document.getElementById('finance-amount').value = '';
    document.getElementById('finance-person').value = '';
    document.getElementById('finance-note').value = '';
    document.getElementById('finance-debt-ratio').value = '0';
    document.getElementById('finance-debt-amount').value = '';
    document.getElementById('finance-payout').value = '';
    document.getElementById('finance-debt-payment').style.display = 'none';
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