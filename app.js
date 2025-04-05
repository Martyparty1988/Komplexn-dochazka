// Globální proměnné a konstantyconst HOURLY_RATES = {‘Maru’: 275,‘Marty’: 400};

const DEBT_PAYMENT_RATIOS = {‘Maru’: 1/3, // 33.33%‘Marty’: 1/2  // 50%};

const CURRENCY_SYMBOLS = {‘CZK’: ‘Kč’,‘EUR’: ‘€’};

// Datová strukturalet appData = {reports: [],finances: [],debts: [],debtPayments: [],categories: [‘Komunikace s hostem’, ‘Úklid’, ‘Wellness’],financeCategories: [‘Výplata’, ‘Záloha’, ‘Nájem’, ‘Nákup’],settings: {monthlyRentCZK: 20400,monthlyRentEUR: 800,autoAddRentDay: 1, // 1. den v měsícilastRentAddedMonth: null}};

// Timer proměnnélet timerInterval;let timerRunning = false;let timerStartTime;let timerElapsedTime = 0;let timerPausedTime = 0;

// Pomocné funkcefunction formatTime(seconds) {const hours = Math.floor(seconds / 3600);const minutes = Math.floor((seconds % 3600) / 60);const secs = seconds % 60;return ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')};}

function formatTimeHM(time) {return time.substring(0, 5);}

function formatDate(dateString) {const date = new Date(dateString);return date.toLocaleDateString(‘cs-CZ’);}

function formatCurrency(amount, currency = ‘CZK’) {if (currency === ‘EUR’) {return parseFloat(amount).toLocaleString(‘cs-CZ’) + ’ €’;} else {return parseFloat(amount).toLocaleString(‘cs-CZ’) + ’ Kč’;}}

function formatYearMonth(dateString) {const date = new Date(dateString);return ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')};}

function formatMonthName(dateString) {const date = new Date(dateString);const monthNames = [‘leden’, ‘únor’, ‘březen’, ‘duben’, ‘květen’, ‘červen’,‘červenec’, ‘srpen’, ‘září’, ‘říjen’, ‘listopad’, ‘prosinec’];return monthNames[date.getMonth()];}

function parseHoursInput(input) {if (!input) return 0;

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

function calculateHours(startTime, endTime, pauseMinutes) {if (!startTime || !endTime) return 0;

const start = new Date(`2000-01-01T${startTime}`);
const end = new Date(`2000-01-01T${endTime}`);

if (end < start) {
    end.setDate(end.getDate() + 1); // Přidá 1 den
}

const diffMs = end - start;
const diffHours = diffMs / (1000 * 60 * 60);

return Math.max(0, diffHours - (pauseMinutes / 60));

}

function calculateEarnings(hours, person, currency = ‘CZK’) {let rate = HOURLY_RATES[person];// Pokud je měna EUR, přepočítáme hodinovou sazbu (předpokládáme kurz 1 EUR = 25 CZK)if (currency === ‘EUR’) {rate = rate / 25;}return hours * rate;}

function calculateDebtPayment(amount, person, currency) {return amount * DEBT_PAYMENT_RATIOS[person];}

function calculateRentDebtPayment(amount, person, currency) {// Z dluhové splátky nejprve jde na nájem, zbytek na ostatní dluhyconst rentAmount = currency === ‘CZK’ ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;const maxRentPayment = Math.min(amount, rentAmount);return maxRentPayment;}

function calculateOtherDebtPayment(amount, person, currency) {// Pokud zbývá něco po splacení nájmu, jde to na ostatní dluhyconst rentAmount = currency === ‘CZK’ ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;const rentPayment = Math.min(amount, rentAmount);const otherDebtPayment = Math.max(0, amount - rentPayment);return otherDebtPayment;}

function showNotification(message, type = ‘success’) {const notification = document.getElementById(‘notification’);notification.textContent = message;notification.classList.remove(‘success’, ‘error’, ‘warning’);notification.classList.add(type, ‘show’);

setTimeout(() => {
    notification.classList.remove('show');
}, 3000);

}

function validateWorkReport(data) {const { date, person, category, startTime, endTime, pauseMinutes, hours, earnings } = data;

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

function validateFinanceRecord(data) {const { date, type, amount, currency } = data;

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

if (!currency) {
    showNotification('Prosím vyberte měnu.', 'error');
    return false;
}

return true;

}

function validateDebtRecord(data) {const { date, person, type, amount, currency } = data;

if (!date) {
    showNotification('Prosím vyplňte datum.', 'error');
    return false;
}

if (!person) {
    showNotification('Prosím vyberte osobu.', 'error');
    return false;
}

if (!type) {
    showNotification('Prosím vyberte typ dluhu.', 'error');
    return false;
}

if (!amount || amount <= 0) {
    showNotification('Prosím zadejte platnou částku.', 'error');
    return false;
}

if (!currency) {
    showNotification('Prosím vyberte měnu.', 'error');
    return false;
}

return true;

}

// Funkce pro správu lokálního úložištěfunction saveData() {localStorage.setItem(‘workReportData’, JSON.stringify(appData));}

function loadData() {const savedData = localStorage.getItem(‘workReportData’);if (savedData) {appData = JSON.parse(savedData);

    // Zajistí, že potřebná pole existují
    if (!appData.categories) {
        appData.categories = ['Komunikace s hostem', 'Úklid', 'Wellness'];
    }
    
    if (!appData.financeCategories) {
        appData.financeCategories = ['Výplata', 'Záloha', 'Nájem', 'Nákup'];
    }
    
    if (!appData.debts) {
        appData.debts = [];
    }
    
    if (!appData.debtPayments) {
        appData.debtPayments = [];
    }
    
    if (!appData.settings) {
        appData.settings = {
            monthlyRentCZK: 20400,
            monthlyRentEUR: 800,
            autoAddRentDay: 1,
            lastRentAddedMonth: null
        };
    }
    
    // Aktualizace formulářů s daty
    document.getElementById('monthly-rent-amount').value = appData.settings.monthlyRentCZK;
    document.getElementById('monthly-rent-amount-eur').value = appData.settings.monthlyRentEUR;
    document.getElementById('auto-add-rent').value = appData.settings.autoAddRentDay;
}

// Kontrola, zda není třeba přidat měsíční nájem
checkAndAddMonthlyRent();

}

// Funkce pro kontrolu a přidání měsíčního nájmufunction checkAndAddMonthlyRent() {// Pokud je vypnuto automatické přičítání nájmuif (appData.settings.autoAddRentDay === ‘0’) return;

const today = new Date();
const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
const currentDay = today.getDate();

// Pokud je dnes den pro přidání nájmu a ještě nebyl přidán
if (currentDay >= parseInt(appData.settings.autoAddRentDay) && 
    appData.settings.lastRentAddedMonth !== currentMonth) {
    
    // Přidání nájmu v CZK
    addDebt({
        date: today.toISOString().split('T')[0],
        person: 'Společný',
        type: 'rent',
        amount: appData.settings.monthlyRentCZK,
        currency: 'CZK',
        note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}`
    });
    
    // Přidání nájmu v EUR
    addDebt({
        date: today.toISOString().split('T')[0],
        person: 'Společný',
        type: 'rent',
        amount: appData.settings.monthlyRentEUR,
        currency: 'EUR',
        note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}`
    });
    
    // Aktualizace měsíce posledního přidání nájmu
    appData.settings.lastRentAddedMonth = currentMonth;
    saveData();
    
    showNotification(`Automaticky přidán měsíční nájem za ${formatMonthName(today)}.`);
}

}

// Funkce pro export dat do CSVfunction exportToCSV() {// Export výkazůlet reportsCSV = ‘Datum,Osoba,Kategorie,Začátek,Konec,Pauza,Odpracováno,Výdělek,Měna\n’;appData.reports.forEach(report => {reportsCSV += ${report.date},${report.person},${report.category},${report.startTime || ''},${report.endTime || ''},${report.pauseMinutes || 0},${report.hours},${report.earnings},${report.currency || 'CZK'}\n;});

// Export financí
let financesCSV = 'Datum,Typ,Osoba,Kategorie,Částka,Měna,Splátka nájmu,Splátka ost. dluhu,K vyplacení,Reálně vyplaceno,Poznámka\n';
appData.finances.forEach(finance => {
    const type = finance.type === 'income' ? 'Příjem' : 'Výdaj';
    financesCSV += `${finance.date},${type},${finance.person || '-'},${finance.category || '-'},${finance.amount},${finance.currency || 'CZK'},${finance.rentPayment || 0},${finance.otherDebtPayment || 0},${finance.payout || 0},${finance.paidAmount || 0},${finance.note || ''}\n`;
});

// Export dluhů
let debtsCSV = 'Datum,Osoba,Typ dluhu,Částka,Měna,Poznámka\n';
appData.debts.forEach(debt => {
    const type = debt.type === 'rent' ? 'Nájem' : 'Ostatní';
    debtsCSV += `${debt.date},${debt.person},${type},${debt.amount},${debt.currency || 'CZK'},${debt.note || ''}\n`;
});

// Export splátek dluhů
let debtPaymentsCSV = 'Datum,Osoba,Typ splátky,Částka,Měna,Poznámka\n';
appData.debtPayments.forEach(payment => {
    const type = payment.type === 'rent' ? 'Nájem' : 'Ostatní';
    debtPaymentsCSV += `${payment.date},${payment.person},${type},${payment.amount},${payment.currency || 'CZK'},${payment.note || ''}\n`;
});

// Vytvoření a stažení souborů
downloadCSV('vykazy.csv', reportsCSV);
downloadCSV('finance.csv', financesCSV);
downloadCSV('dluhy.csv', debtsCSV);
downloadCSV('splatky.csv', debtPaymentsCSV);

showNotification('Data byla exportována do CSV souborů.');

}

function downloadCSV(filename, csvData) {const blob = new Blob([csvData], { type: ‘text/csv;charset=utf-8;’ });const link = document.createElement(‘a’);const url = URL.createObjectURL(blob);

link.setAttribute('href', url);
link.setAttribute('download', filename);
link.style.visibility = 'hidden';

document.body.appendChild(link);
link.click();
document.body.removeChild(link);

}

// Funkce pro timerfunction startTimer() {if (timerRunning) return;

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

function pauseTimer() {if (!timerRunning) return;

timerRunning = false;
clearInterval(timerInterval);

timerElapsedTime = Date.now() - timerStartTime;

document.getElementById('start-timer').disabled = false;
document.getElementById('pause-timer').disabled = true;
document.getElementById('stop-timer').disabled = false;

}

function stopTimer() {if (!timerStartTime) return;

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

function resetTimer() {clearInterval(timerInterval);timerRunning = false;timerElapsedTime = 0;document.getElementById(‘timer’).textContent = ‘00:00:00’;document.getElementById(‘start-timer’).disabled = false;document.getElementById(‘pause-timer’).disabled = true;document.getElementById(‘stop-timer’).disabled = true;}

function updateTimerSummary() {const startTime = document.getElementById(‘timer-start’).value;const endTime = document.getElementById(‘timer-end’).value;const pauseMinutes = parseInt(document.getElementById(‘timer-pause’).value) || 0;const person = document.getElementById(‘timer-person’).value;const currency = document.getElementById(‘timer-currency’).value;

const hours = calculateHours(startTime, endTime, pauseMinutes);
const earnings = calculateEarnings(hours, person, currency);

document.getElementById('timer-hours').value = hours.toFixed(2);
document.getElementById('timer-earnings').value = formatCurrency(earnings, currency);

}

// Funkce pro vykreslení UIfunction renderReportsTable() {const tableBody = document.getElementById(‘reports-table-body’);const noReportsMessage = document.getElementById(‘no-reports-message’);

// Získání filtrů
const dateFilter = document.getElementById('filter-date').value;
const personFilter = document.getElementById('filter-person').value;
const currencyFilter = document.getElementById('filter-currency').value;

// Aplikace filtrů
let filteredReports = appData.reports;

if (dateFilter) {
    filteredReports = filteredReports.filter(report => report.date === dateFilter);
}

if (personFilter) {
    filteredReports = filteredReports.filter(report => report.person === personFilter);
}

if (currencyFilter) {
    filteredReports = filteredReports.filter(report => (!report.currency && currencyFilter === 'CZK') || report.currency === currencyFilter);
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
    const currency = report.currency || 'CZK';
    
    row.innerHTML = `
        <td>${formatDate(report.date)}</td>
        <td>${report.person}</td>
        <td>${report.category}</td>
        <td>${report.startTime ? formatTimeHM(report.startTime) : '-'}</td>
        <td>${report.endTime ? formatTimeHM(report.endTime) : '-'}</td>
        <td>${report.pauseMinutes}</td>
        <td>${report.hours.toFixed(2)}</td>
        <td>${formatCurrency(report.earnings, currency)}</td>
        <td>${currency}</td>
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

function renderFinancesTable() {const tableBody = document.getElementById(‘finances-table-body’);const noFinancesMessage = document.getElementById(‘no-finances-message’);

// Získání filtrů
const dateFilter = document.getElementById('filter-finance-date').value;
const typeFilter = document.getElementById('filter-finance-type').value;
const personFilter = document.getElementById('filter-finance-person').value;
const currencyFilter = document.getElementById('filter-finance-currency').value;

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

if (currencyFilter) {
    filteredFinances = filteredFinances.filter(finance => (!finance.currency && currencyFilter === 'CZK') || finance.currency === currencyFilter);
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
    
    const currency = finance.currency || 'CZK';
    const amountDisplay = finance.type === 'expense' ? 
        `-${formatCurrency(finance.amount, currency)}` : 
        formatCurrency(finance.amount, currency);
    
    row.innerHTML = `
        <td>${formatDate(finance.date)}</td>
        <td class="${typeClass}">${finance.type === 'income' ? 'Příjem' : 'Výdaj'}</td>
        <td>${finance.person || '-'}</td>
        <td>${finance.category || '-'}</td>
        <td class="${typeClass}">${amountDisplay}</td>
        <td>${currency}</td>
        <td>${finance.rentPayment ? formatCurrency(finance.rentPayment, currency) : '-'}</td>
        <td>${finance.otherDebtPayment ? formatCurrency(finance.otherDebtPayment, currency) : '-'}</td>
        <td>${finance.payout ? formatCurrency(finance.payout, currency) : '-'}</td>
        <td>${finance.paidAmount ? formatCurrency(finance.paidAmount, currency) : '-'}</td>
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

function renderDebtTable() {const tableBody = document.getElementById(‘debt-table-body’);const noDebtMessage = document.getElementById(‘no-debt-message’);

// Získání filtrů
const personFilter = document.getElementById('filter-debt-person').value;
const typeFilter = document.getElementById('filter-debt-type').value;
const currencyFilter = document.getElementById('filter-debt-currency').value;
const monthFilter = document.getElementById('filter-debt-month').value;

// Sestavení kompletní historie dluhů a splátek
let debtHistory = [];

// Přidání dluhů
appData.debts.forEach(debt => {
    const month = debt.date.substring(0, 7);
    if ((!monthFilter || month === monthFilter) &&
        (!personFilter || debt.person === personFilter) &&
        (!typeFilter || debt.type === typeFilter) &&
        (!currencyFilter || debt.currency === currencyFilter)) {
        debtHistory.push({
            date: debt.date,
            person: debt.person,
            type: debt.type,
            added: debt.amount,
            addedCurrency: debt.currency,
            paid: 0,
            paidCurrency: debt.currency,
            note: debt.note,
            id: debt.id,
            isDebt: true
        });
    }
});

// Přidání splátek
appData.debtPayments.forEach(payment => {
    const month = payment.date.substring(0, 7);
    if ((!monthFilter || month === monthFilter) &&
        (!personFilter || payment.person === personFilter) &&
        (!typeFilter || payment.type === typeFilter) &&
        (!currencyFilter || payment.currency === currencyFilter)) {
        debtHistory.push({
            date: payment.date,
            person: payment.person,
            type: payment.type,
            added: 0,
            addedCurrency: payment.currency,
            paid: payment.amount,
            paidCurrency: payment.currency,
            note: payment.note,
            id: payment.id,
            isPayment: true
        });
    }
});

// Přidání splátek z výplat
appData.finances.forEach(finance => {
    if (finance.type === 'income' && finance.person && (finance.rentPayment || finance.otherDebtPayment)) {
        const month = finance.date.substring(0, 7);
        if ((!monthFilter || month === monthFilter) &&
            (!personFilter || finance.person === personFilter) &&
            (!currencyFilter || finance.currency === currencyFilter)) {
            
            // Splátka nájmu
            if (finance.rentPayment > 0 && (!typeFilter || typeFilter === 'rent')) {
                debtHistory.push({
                    date: finance.date,
                    person: finance.person,
                    type: 'rent',
                    added: 0,
                    addedCurrency: finance.currency,
                    paid: finance.rentPayment,
                    paidCurrency: finance.currency,
                    note: `Automatická splátka nájmu z výplaty (${finance.note})`,
                    id: finance.id + '_rent',
                    isAutoPayment: true
                });
            }
            
            // Splátka ostatního dluhu
            if (finance.otherDebtPayment > 0 && (!typeFilter || typeFilter === 'other')) {
                debtHistory.push({
                    date: finance.date,
                    person: finance.person, type: 'other',
                    added: 0,
                    addedCurrency: finance.currency,
                    paid: finance.otherDebtPayment,
                    paidCurrency: finance.currency,
                    note: `Automatická splátka ostatního dluhu z výplaty (${finance.note})`,
                    id: finance.id + '_other',
                    isAutoPayment: true
                });
            }
        }
    }
});

// Seřazení dle data
debtHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

// Výpočet zůstatku
const balances = {
    'Maru': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } },
    'Marty': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } },
    'Společný': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }
};

debtHistory.forEach(item => {
    const currency = item.addedCurrency || 'CZK';
    if (item.added > 0) {
        balances[item.person][currency][item.type] += item.added;
    }
    if (item.paid > 0) {
        const paidCurrency = item.paidCurrency || 'CZK';
        if (item.type === 'rent') {
            balances[item.person][paidCurrency].rent -= item.paid;
        } else {
            balances[item.person][paidCurrency].other -= item.paid;
        }
    }
});

// Vyčistit tabulku
tableBody.innerHTML = '';

// Kontrola prázdných dat
if (debtHistory.length === 0) {
    tableBody.innerHTML = '';
    noDebtMessage.classList.remove('hidden');
    return;
} else {
    noDebtMessage.classList.add('hidden');
}

// Naplnění tabulky
let cumulativeBalance = {
    'Maru': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } },
    'Marty': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } },
    'Společný': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }
};

debtHistory.forEach((item, index) => {
    const row = document.createElement('tr');
    const addedCurrency = item.addedCurrency || 'CZK';
    const paidCurrency = item.paidCurrency || 'CZK';
    
    // Aktualizace kumulativního zůstatku
    if (item.added > 0) {
        cumulativeBalance[item.person][addedCurrency][item.type] += item.added;
    }
    if (item.paid > 0) {
        cumulativeBalance[item.person][paidCurrency][item.type] -= item.paid;
    }
    
    // Výpočet celkového zůstatku pro aktuální typ a měnu
    const currentBalance = cumulativeBalance[item.person][addedCurrency][item.type];
    
    // Určení typu dluhu pro zobrazení
    const typeDisplay = item.type === 'rent' ? 'Nájem' : 'Ostatní';
    
    row.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${item.person}</td>
        <td>${typeDisplay}</td>
        <td>${item.added > 0 ? formatCurrency(item.added, addedCurrency) : '-'}</td>
        <td>${item.added > 0 ? addedCurrency : '-'}</td>
        <td>${item.paid > 0 ? formatCurrency(item.paid, paidCurrency) : '-'}</td>
        <td>${item.paid > 0 ? paidCurrency : '-'}</td>
        <td>${formatCurrency(currentBalance, addedCurrency)}</td>
        <td>${item.note || '-'}</td>
        <td class="action-cell">
            ${!item.isAutoPayment ? `
            <button class="btn danger-btn delete-debt-item" data-index="${index}" data-type="${item.isDebt ? 'debt' : 'payment'}">
                <i class="fas fa-trash"></i>
            </button>` : '-'}
        </td>
    `;
    
    tableBody.appendChild(row);
});

// Přidat event listenery pro tlačítka
document.querySelectorAll('.delete-debt-item').forEach(button => {
    button.addEventListener('click', function() {
        const index = this.getAttribute('data-index');
        const type = this.getAttribute('data-type');
        const item = debtHistory[index];
        
        if (type === 'debt') {
            deleteDebt(item.id);
        } else {
            deleteDebtPayment(item.id);
        }
    });
});

// Aktualizace celkových součtů na kartách
updateDebtSummary();

}

function updateDebtSummary() {// Inicializace hodnotconst summary = {‘Maru’: {‘CZK’: { initial: 0, rent: 0, other: 0, payments: 0 },‘EUR’: { initial: 0, rent: 0, other: 0, payments: 0 }},‘Marty’: {‘CZK’: { initial: 0, rent: 0, other: 0, payments: 0 },‘EUR’: { initial: 0, rent: 0, other: 0, payments: 0 }},‘Společný’: {‘CZK’: { initial: 0, rent: 0, other: 0, payments: 0 },‘EUR’: { initial: 0, rent: 0, other: 0, payments: 0 }}};

// Zpracování dluhů
appData.debts.forEach(debt => {
    const person = debt.person;
    const currency = debt.currency || 'CZK';
    
    if (debt.type === 'rent') {
        summary[person][currency].rent += debt.amount;
    } else {
        summary[person][currency].other += debt.amount;
    }
});

// Zpracování splátek dluhů
appData.debtPayments.forEach(payment => {
    const person = payment.person;
    const currency = payment.currency || 'CZK';
    
    summary[person][currency].payments += payment.amount;
});

// Zpracování automatických splátek z financí
appData.finances.forEach(finance => {
    if (finance.type === 'income' && finance.person) {
        const person = finance.person;
        const currency = finance.currency || 'CZK';
        
        if (finance.rentPayment) {
            summary[person][currency].payments += finance.rentPayment;
        }
        
        if (finance.otherDebtPayment) {
            summary[person][currency].payments += finance.otherDebtPayment;
        }
    }
});

// Výpočet aktuálních dluhů
for (const person of ['Maru', 'Marty', 'Společný']) {
    for (const currency of ['CZK', 'EUR']) {
        const current = summary[person][currency];
        const currentDebt = current.initial + current.rent + current.other - current.payments;
        
        // Aktualizace UI pro Maru
        if (person === 'Maru') {
            if (currency === 'CZK') {
                document.getElementById('maru-initial-debt-czk').textContent = formatCurrency(current.initial, currency);
                document.getElementById('maru-rent-debt-czk').textContent = formatCurrency(current.rent, currency);
                document.getElementById('maru-other-debt-czk').textContent = formatCurrency(current.other, currency);
                document.getElementById('maru-payments-czk').textContent = formatCurrency(current.payments, currency);
                document.getElementById('maru-current-debt-czk').textContent = formatCurrency(currentDebt, currency);
            } else {
                document.getElementById('maru-initial-debt-eur').textContent = formatCurrency(current.initial, currency);
                document.getElementById('maru-rent-debt-eur').textContent = formatCurrency(current.rent, currency);
                document.getElementById('maru-other-debt-eur').textContent = formatCurrency(current.other, currency);
                document.getElementById('maru-payments-eur').textContent = formatCurrency(current.payments, currency);
                document.getElementById('maru-current-debt-eur').textContent = formatCurrency(currentDebt, currency);
            }
        }
        
        // Aktualizace UI pro Marty
        if (person === 'Marty') {
            if (currency === 'CZK') {
                document.getElementById('marty-initial-debt-czk').textContent = formatCurrency(current.initial, currency);
                document.getElementById('marty-rent-debt-czk').textContent = formatCurrency(current.rent, currency);
                document.getElementById('marty-other-debt-czk').textContent = formatCurrency(current.other, currency);
                document.getElementById('marty-payments-czk').textContent = formatCurrency(current.payments, currency);
                document.getElementById('marty-current-debt-czk').textContent = formatCurrency(currentDebt, currency);
            } else {
                document.getElementById('marty-initial-debt-eur').textContent = formatCurrency(current.initial, currency);
                document.getElementById('marty-rent-debt-eur').textContent = formatCurrency(current.rent, currency);
                document.getElementById('marty-other-debt-eur').textContent = formatCurrency(current.other, currency);
                document.getElementById('marty-payments-eur').textContent = formatCurrency(current.payments, currency);
                document.getElementById('marty-current-debt-eur').textContent = formatCurrency(currentDebt, currency);
            }
        }
    }
}

// Celkový dluh (součet pro Maru a Marty)
const totalDebtCZK = 
    (summary['Maru']['CZK'].initial + summary['Maru']['CZK'].rent + summary['Maru']['CZK'].other - summary['Maru']['CZK'].payments) +
    (summary['Marty']['CZK'].initial + summary['Marty']['CZK'].rent + summary['Marty']['CZK'].other - summary['Marty']['CZK'].payments) +
    (summary['Společný']['CZK'].initial + summary['Společný']['CZK'].rent + summary['Společný']['CZK'].other - summary['Společný']['CZK'].payments);

const totalDebtEUR = 
    (summary['Maru']['EUR'].initial + summary['Maru']['EUR'].rent + summary['Maru']['EUR'].other - summary['Maru']['EUR'].payments) +
    (summary['Marty']['EUR'].initial + summary['Marty']['EUR'].rent + summary['Marty']['EUR'].other - summary['Marty']['EUR'].payments) +
    (summary['Společný']['EUR'].initial + summary['Společný']['EUR'].rent + summary['Společný']['EUR'].other - summary['Společný']['EUR'].payments);

// Aktualizace UI v souhrnné sekci
document.getElementById('total-current-debt-czk').textContent = formatCurrency(totalDebtCZK, 'CZK');
document.getElementById('total-current-debt-eur').textContent = formatCurrency(totalDebtEUR, 'EUR');

}

function updateSummary() {// Pro Maruconst maruReports = appData.reports.filter(report => report.person === ‘Maru’);const maruTotalHours = maruReports.reduce((sum, report) => sum + report.hours, 0);

const maruReportsCZK = maruReports.filter(report => !report.currency || report.currency === 'CZK');
const maruReportsEUR = maruReports.filter(report => report.currency === 'EUR');

const maruTotalEarningsCZK = maruReportsCZK.reduce((sum, report) => sum + report.earnings, 0);
const maruTotalEarningsEUR = maruReportsEUR.reduce((sum, report) => sum + report.earnings, 0);

// Splátky dluhů a vyplacené částky pro Maru
const maruFinancesCZK = appData.finances.filter(finance => 
    finance.person === 'Maru' && (!finance.currency || finance.currency === 'CZK'));

const maruFinancesEUR = appData.finances.filter(finance => 
    finance.person === 'Maru' && finance.currency === 'EUR');

const maruRentPaidCZK = maruFinancesCZK
    .filter(finance => finance.rentPayment)
    .reduce((sum, finance) => sum + finance.rentPayment, 0);

const maruOtherDebtPaidCZK = maruFinancesCZK
    .filter(finance => finance.otherDebtPayment)
    .reduce((sum, finance) => sum + finance.otherDebtPayment, 0);

const maruPaidOutCZK = maruFinancesCZK
    .filter(finance => finance.payout)
    .reduce((sum, finance) => sum + finance.payout, 0);

const maruRentPaidEUR = maruFinancesEUR
    .filter(finance => finance.rentPayment)
    .reduce((sum, finance) => sum + finance.rentPayment, 0);

const maruOtherDebtPaidEUR = maruFinancesEUR
    .filter(finance => finance.otherDebtPayment)
    .reduce((sum, finance) => sum + finance.otherDebtPayment, 0);

const maruPaidOutEUR = maruFinancesEUR
    .filter(finance => finance.payout)
    .reduce((sum, finance) => sum + finance.payout, 0);

// Pro Marty
const martyReports = appData.reports.filter(report => report.person === 'Marty');
const martyTotalHours = martyReports.reduce((sum, report) => sum + report.hours, 0);

const martyReportsCZK = martyReports.filter(report => !report.currency || report.currency === 'CZK');
const martyReportsEUR = martyReports.filter(report => report.currency === 'EUR');

const martyTotalEarningsCZK = martyReportsCZK.reduce((sum, report) => sum + report.earnings, 0);
const martyTotalEarningsEUR = martyReportsEUR.reduce((sum, report) => sum + report.earnings, 0);

// Splátky dluhů a vyplacené částky pro Marty
const martyFinancesCZK = appData.finances.filter(finance => 
    finance.person === 'Marty' && (!finance.currency || finance.currency === 'CZK'));

const martyFinancesEUR = appData.finances.filter(finance => 
    finance.person === 'Marty' && finance.currency === 'EUR');

const martyRentPaidCZK = martyFinancesCZK
    .filter(finance => finance.rentPayment)
    .reduce((sum, finance) => sum + finance.rentPayment, 0);

const martyOtherDebtPaidCZK = martyFinancesCZK
    .filter(finance => finance.otherDebtPayment)
    .reduce((sum, finance) => sum + finance.otherDebtPayment, 0);

const martyPaidOutCZK = martyFinancesCZK
    .filter(finance => finance.payout)
    .reduce((sum, finance) => sum + finance.payout, 0);

const martyRentPaidEUR = martyFinancesEUR
    .filter(finance => finance.rentPayment)
    .reduce((sum, finance) => sum + finance.rentPayment, 0);

const martyOtherDebtPaidEUR = martyFinancesEUR
    .filter(finance => finance.otherDebtPayment)
    .reduce((sum, finance) => sum + finance.otherDebtPayment, 0);

const martyPaidOutEUR = martyFinancesEUR
    .filter(finance => finance.payout)
    .reduce((sum, finance) => sum + finance.payout, 0);

// Celkové souhrny
const totalHours = maruTotalHours + martyTotalHours;
const totalEarningsCZK = maruTotalEarningsCZK + martyTotalEarningsCZK;
const totalEarningsEUR = maruTotalEarningsEUR + martyTotalEarningsEUR;

const totalIncomeCZK = appData.finances
    .filter(finance => finance.type === 'income' && (!finance.currency || finance.currency === 'CZK'))
    .reduce((sum, finance) => sum + finance.amount, 0);

const totalIncomeEUR = appData.finances
    .filter(finance => finance.type === 'income' && finance.currency === 'EUR')
    .reduce((sum, finance) => sum + finance.amount, 0);

const totalExpensesCZK = appData.finances
    .filter(finance => finance.type === 'expense' && (!finance.currency || finance.currency === 'CZK'))
    .reduce((sum, finance) => sum + finance.amount, 0);

const totalExpensesEUR = appData.finances
    .filter(finance => finance.type === 'expense' && finance.currency === 'EUR')
    .reduce((sum, finance) => sum + finance.amount, 0);

// Aktualizace UI
document.getElementById('maru-total-hours').textContent = `${maruTotalHours.toFixed(2)} hodin`;
document.getElementById('maru-total-earnings-czk').textContent = formatCurrency(maruTotalEarningsCZK, 'CZK');
document.getElementById('maru-total-earnings-eur').textContent = formatCurrency(maruTotalEarningsEUR, 'EUR');
document.getElementById('maru-rent-paid-czk').textContent = formatCurrency(maruRentPaidCZK, 'CZK');
document.getElementById('maru-other-debt-paid-czk').textContent = formatCurrency(maruOtherDebtPaidCZK, 'CZK');
document.getElementById('maru-rent-paid-eur').textContent = formatCurrency(maruRentPaidEUR, 'EUR');
document.getElementById('maru-other-debt-paid-eur').textContent = formatCurrency(maruOtherDebtPaidEUR, 'EUR');
document.getElementById('maru-paid-out-czk').textContent = formatCurrency(maruPaidOutCZK, 'CZK');
document.getElementById('maru-paid-out-eur').textContent = formatCurrency(maruPaidOutEUR, 'EUR');

document.getElementById('marty-total-hours').textContent = `${martyTotalHours.toFixed(2)} hodin`;
document.getElementById('marty-total-earnings-czk').textContent = formatCurrency(martyTotalEarningsCZK, 'CZK');
document.getElementById('marty-total-earnings-eur').textContent = formatCurrency(martyTotalEarningsEUR, 'EUR');
document.getElementById('marty-rent-paid-czk').textContent = formatCurrency(martyRentPaidCZK, 'CZK');
document.getElementById('marty-other-debt-paid-czk').textContent = formatCurrency(martyOtherDebtPaidCZK, 'CZK');
document.getElementById('marty-rent-paid-eur').textContent = formatCurrency(martyRentPaidEUR, 'EUR');
document.getElementById('marty-other-debt-paid-eur').textContent = formatCurrency(martyOtherDebtPaidEUR, 'EUR');
document.getElementById('marty-paid-out-czk').textContent = formatCurrency(martyPaidOutCZK, 'CZK');
document.getElementById('marty-paid-out-eur').textContent = formatCurrency(martyPaidOutEUR, 'EUR');

document.getElementById('total-hours').textContent = `${totalHours.toFixed(2)} hodin`;
document.getElementById('total-earnings-czk').textContent = formatCurrency(totalEarningsCZK, 'CZK');
document.getElementById('total-earnings-eur').textContent = formatCurrency(totalEarningsEUR, 'EUR');
document.getElementById('total-income-czk').textContent = formatCurrency(totalIncomeCZK, 'CZK');
document.getElementById('total-income-eur').textContent = formatCurrency(totalIncomeEUR, 'EUR');
document.getElementById('total-expenses-czk').textContent = `-${formatCurrency(totalExpensesCZK, 'CZK')}`;
document.getElementById('total-expenses-eur').textContent = `-${formatCurrency(totalExpensesEUR, 'EUR')}`;

// Aktualizace zůstatku dluhu - toto je již řešeno v updateDebtSummary()

}

if (this.value === ‘custom’) {customCategoryInput.classList.remove(‘hidden’);customCategoryInput.focus();} else {customCategoryInput.classList.add(‘hidden’);}});

document.getElementById('manual-category').addEventListener('change', function() {
    const customCategoryInput = document.getElementById('manual-custom-category');
    
    if (this.value === 'custom') {
        customCategoryInput.classList.remove('hidden');
        customCategoryInput.focus();
    } else {
        customCategoryInput.classList.add('hidden');
    }
});

document.getElementById('finance-category').addEventListener('change', function() {
    const customCategoryInput = document.getElementById('finance-custom-category');
    
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
const manualCurrencySelect = document.getElementById('manual-currency');

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
    const currency = manualCurrencySelect.value;
    const earnings = calculateEarnings(hours, person, currency);
    
    document.getElementById('manual-earnings').value = formatCurrency(earnings, currency);
}

manualStartInput.addEventListener('change', updateManualEarnings);
manualEndInput.addEventListener('change', updateManualEarnings);
manualPauseInput.addEventListener('input', updateManualEarnings);
manualHoursInput.addEventListener('input', updateManualEarnings);
manualPersonSelect.addEventListener('change', updateManualEarnings);
manualCurrencySelect.addEventListener('change', updateManualEarnings);

// Timer měna změna
document.getElementById('timer-currency').addEventListener('change', updateTimerSummary);

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
    const currency = document.getElementById('finance-currency').value;
    const debtRatioInput = document.getElementById('finance-debt-ratio');
    
    if (person) {
        // Nastavit výchozí hodnotu podle osoby
        const defaultRatio = DEBT_PAYMENT_RATIOS[person] * 100;
        debtRatioInput.value = defaultRatio;
        
        const ratio = parseFloat(debtRatioInput.value) / 100;
        const debtAmount = amount * ratio;
        
        // Rozdělit na splátku nájmu a ostatního dluhu
        const rentAmount = currency === 'CZK' ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;
        const rentPayment = Math.min(debtAmount, rentAmount);
        const otherDebtPayment = Math.max(0, debtAmount - rentPayment);
        
        const payout = amount - debtAmount;
        
        document.getElementById('finance-rent-payment').value = rentPayment.toFixed(2);
        document.getElementById('finance-other-debt-payment').value = otherDebtPayment.toFixed(2);
        document.getElementById('finance-payout').value = payout.toFixed(2);
        document.getElementById('finance-paid-amount').value = payout.toFixed(2); // Výchozí hodnota reálně vyplaceno
    }
}

document.getElementById('finance-amount').addEventListener('input', updateDebtPayment);
document.getElementById('finance-debt-ratio').addEventListener('input', updateDebtPayment);
document.getElementById('finance-currency').addEventListener('change', updateDebtPayment);

// Timer pauza změna
document.getElementById('timer-pause').addEventListener('input', updateTimerSummary);

// Nastavení nájmu
document.getElementById('monthly-rent-amount').addEventListener('change', function() {
    appData.settings.monthlyRentCZK = parseFloat(this.value);
    saveData();
});

document.getElementById('monthly-rent-amount-eur').addEventListener('change', function() {
    appData.settings.monthlyRentEUR = parseFloat(this.value);
    saveData();
});

document.getElementById('auto-add-rent').addEventListener('change', function() {
    appData.settings.autoAddRentDay = parseInt(this.value);
    saveData();
});

}

// Event listeneryfunction initEventListeners() {// Navigacedocument.getElementById(‘nav-reports’).addEventListener(‘click’, function() {showSection(‘reports-section’);this.classList.add(‘active’);document.getElementById(‘nav-finances’).classList.remove(‘active’);document.getElementById(‘nav-debt’).classList.remove(‘active’);document.getElementById(‘nav-summary’).classList.remove(‘active’);});

document.getElementById('nav-finances').addEventListener('click', function() {
    showSection('finances-section');
    this.classList.add('active');
    document.getElementById('nav-reports').classList.remove('active');
    document.getElementById('nav-debt').classList.remove('active');
    document.getElementById('nav-summary').classList.remove('active');
});

document.getElementById('nav-debt').addEventListener('click', function() {
    showSection('debt-section');
    this.classList.add('active');
    document.getElementById('nav-reports').classList.remove('active');
    document.getElementById('nav-finances').classList.remove('active');
    document.getElementById('nav-summary').classList.remove('active');
    renderDebtTable();
});

document.getElementById('nav-summary').addEventListener('click', function() {
    showSection('summary-section');
    this.classList.add('active');
    document.getElementById('nav-reports').classList.remove('active');
    document.getElementById('nav-finances').classList.remove('active');
    document.getElementById('nav-debt').classList.remove('active');
    updateSummary();
    updateDebtSummary();
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
document.getElementById('filter-currency').addEventListener('change', renderReportsTable);
document.getElementById('clear-filters').addEventListener('click', function() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-person').value = '';
    document.getElementById('filter-currency').value = '';
    renderReportsTable();
});

// Filtry financí
document.getElementById('filter-finance-date').addEventListener('change', renderFinancesTable);
document.getElementById('filter-finance-type').addEventListener('change', renderFinancesTable);
document.getElementById('filter-finance-person').addEventListener('change', renderFinancesTable);
document.getElementById('filter-finance-currency').addEventListener('change', renderFinancesTable);
document.getElementById('clear-finance-filters').addEventListener('click', function() {
    document.getElementById('filter-finance-date').value = '';
    document.getElementById('filter-finance-type').value = '';
    document.getElementById('filter-finance-person').value = '';
    document.getElementById('filter-finance-currency').value = '';
    renderFinancesTable();
});

// Filtry dluhů
document.getElementById('filter-debt-person').addEventListener('change', renderDebtTable);
document.getElementById('filter-debt-type').addEventListener('change', renderDebtTable);
document.getElementById('filter-debt-currency').addEventListener('change', renderDebtTable);
document.getElementById('filter-debt-month').addEventListener('change', renderDebtTable);
document.getElementById('clear-debt-filters').addEventListener('click', function() {
    document.getElementById('filter-debt-person').value = '';
    document.getElementById('filter-debt-type').value = '';
    document.getElementById('filter-debt-currency').value = '';
    document.getElementById('filter-debt-month').value = '';
    renderDebtTable();
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

// Dluh sekce
document.getElementById('add-debt').addEventListener('click', function() {
    document.getElementById('debt-form').classList.remove('hidden');
    document.getElementById('debt-payment-form').classList.add('hidden');
});

document.getElementById('add-debt-payment').addEventListener('click', function() {
    document.getElementById('debt-payment-form').classList.remove('hidden');
    document.getElementById('debt-form').classList.add('hidden');
});

document.getElementById('cancel-debt').addEventListener('click', function() {
    document.getElementById('debt-form').classList.add('hidden');
    resetDebtForm();
});

document.getElementById('cancel-debt-payment').addEventListener('click', function() {
    document.getElementById('debt-payment-form').classList.add('hidden');
    resetDebtPaymentForm();
});

document.getElementById('save-debt').addEventListener('click', saveDebtRecord);
document.getElementById('save-debt-payment').addEventListener('click', saveDebtPaymentRecord);

// Nastavení počátečního dluhu
document.getElementById('set-initial-debt').addEventListener('click', setInitialDebt);

// Přidání měsíčního nájmu
document.getElementById('add-monthly-rent').addEventListener('click', addMonthlyRent);

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

// Funkce pro zobrazení sekcefunction showSection(sectionId) {const sections = document.querySelectorAll(’.section’);sections.forEach(section => {section.classList.remove(‘active’);});

document.getElementById(sectionId).classList.add('active');

}

// Funkce pro ukládání záznamůfunction saveTimerReport() {const date = new Date().toISOString().split(‘T’)[0];const person = document.getElementById(‘timer-person’).value;let category = document.getElementById(‘timer-category’).value;const currency = document.getElementById(‘timer-currency’).value;

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
const earnings = parseFloat(document.getElementById('timer-earnings').value.replace(/\s/g, '').replace(',', '.').replace('Kč', '').replace('€', ''));

const reportData = {
    date,
    person,
    category,
    startTime,
    endTime,
    pauseMinutes,
    hours,
    earnings,
    currency
};

if (validateWorkReport(reportData)) {
    addWorkReport(reportData);
    resetTimerForm();
}

}

function saveManualReport() {const date = document.getElementById(‘manual-date’).value;const person = document.getElementById(‘manual-person’).value;let category = document.getElementById(‘manual-category’).value;const currency = document.getElementById(‘manual-currency’).value;

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

const earnings = calculateEarnings(hours, person, currency);

const reportData = {
    date,
    person,
    category,
    startTime,
    endTime,
    pauseMinutes,
    hours,
    earnings,
    currency
};

if (validateWorkReport(reportData)) {
    addWorkReport(reportData);
    resetManualForm();
}

}

function saveFinanceRecord() {const date = document.getElementById(‘finance-date’).value;const type = document.getElementById(‘finance-type’).value;const amount = parseFloat(document.getElementById(‘finance-amount’).value);const person = document.getElementById(‘finance-person’).value;const currency = document.getElementById(‘finance-currency’).value;let category = document.getElementById(‘finance-category’).value;const note = document.getElementById(‘finance-note’).value;

// Kontrola vlastní kategorie
if (category === 'custom') {
    const customCategory = document.getElementById('finance-custom-category').value.trim();
    
    if (!customCategory) {
        showNotification('Prosím zadejte vlastní kategorii.', 'error');
        return;
    }
    
    category = customCategory;
    
    // Přidat novou kategorii pokud ještě neexistuje
    if (!appData.financeCategories.includes(category)) {
        appData.financeCategories.push(category);
        updateFinanceCategoryDropdown();
    }
}

let rentPayment = null;
let otherDebtPayment = null;
let payout = null;
let paidAmount = parseFloat(document.getElementById('finance-paid-amount').value) || 0;

// Výpočet splátky dluhu a vyplacené částky pro příjmy
if (type === 'income' && person) {
    const ratio = parseFloat(document.getElementById('finance-debt-ratio').value) / 100;
    const debtAmount = amount * ratio;
    
    // Rozdělit na splátku nájmu a ostatního dluhu
    const rentAmount = currency === 'CZK' ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;
    rentPayment = Math.min(debtAmount, rentAmount);
    otherDebtPayment = Math.max(0, debtAmount - rentPayment);
    
    payout = amount - debtAmount;
}

const financeData = {
    date,
    type,
    amount,
    person,
    category,
    currency,
    note,
    rentPayment,
    otherDebtPayment,
    payout,
    paidAmount
};

if (validateFinanceRecord(financeData)) {
    addFinance(financeData);
    resetFinanceForm();
    document.getElementById('finance-form').classList.add('hidden');
    document.getElementById('add-finance').classList.remove('hidden');
}

}

function saveDebtRecord() {const date = document.getElementById(‘debt-date’).value;const person = document.getElementById(‘debt-person’).value;const type = document.getElementById(‘debt-type’).value;const amount = parseFloat(document.getElementById(‘debt-amount’).value);const currency = document.getElementById(‘debt-currency’).value;const note = document.getElementById(‘debt-note’).value;

const debtData = {
    date,
    person,
    type,
    amount,
    currency,
    note
};

if (validateDebtRecord(debtData)) {
    addDebt(debtData);
    resetDebtForm();
    document.getElementById('debt-form').classList.add('hidden');
}

}

function saveDebtPaymentRecord() {const date = document.getElementById(‘debt-payment-date’).value;const person = document.getElementById(‘debt-payment-person’).value;const type = document.getElementById(‘debt-payment-type’).value;const amount = parseFloat(document.getElementById(‘debt-payment-amount’).value);const currency = document.getElementById(‘debt-payment-currency’).value;const note = document.getElementById(‘debt-payment-note’).value;

const paymentData = {
    date,
    person,
    type,
    amount,
    currency,
    note
};

if (validateDebtRecord(paymentData)) {
    addDebtPayment(paymentData);
    resetDebtPaymentForm();
    document.getElementById('debt-payment-form').classList.add('hidden');
}

}

function setInitialDebt() {const person = document.getElementById(‘initial-debt-person’).value;const amount = parseFloat(document.getElementById(‘initial-debt-amount’).value);const currency = document.getElementById(‘initial-debt-currency’).value;const type = document.getElementById(‘initial-debt-type’).value;

if (!amount || amount <= 0) {
    showNotification('Prosím zadejte platnou částku.', 'error');
    return;
}

const today = new Date().toISOString().split('T')[0];

const debtData = {
    date: today,
    person,
    type,
    amount,
    currency,
    note: 'Počáteční dluh'
};

addDebt(debtData);
document.getElementById('initial-debt-amount').value = '';
showNotification(`Počáteční dluh pro ${person} byl nastaven.`);

}

function addMonthlyRent() {const today = new Date();

// Přidání nájmu v CZK
addDebt({
    date: today.toISOString().split('T')[0],
    person: 'Společný',
    type: 'rent',
    amount: appData.settings.monthlyRentCZK,
    currency: 'CZK',
    note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}`
});

// Přidání nájmu v EUR
addDebt({
    date: today.toISOString().split('T')[0],
    person: 'Společný',
    type: 'rent',
    amount: appData.settings.monthlyRentEUR,
    currency: 'EUR',
    note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}`
});

// Aktualizace měsíce posledního přidání nájmu
appData.settings.lastRentAddedMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
saveData();

showNotification(`Přidán měsíční nájem za ${formatMonthName(today)}.`);

}

// Reset formulářůfunction resetTimerForm() {document.getElementById(‘timer-summary’).classList.add(‘hidden’);document.getElementById(‘timer-pause’).value = ‘0’;resetTimer();}

function resetManualForm() {const today = new Date().toISOString().split(‘T’)[0];document.getElementById(‘manual-date’).value = today;document.getElementById(‘manual-start’).value = ‘’;document.getElementById(‘manual-end’).value = ‘’;document.getElementById(‘manual-pause’).value = ‘0’;document.getElementById(‘manual-hours’).value = ‘’;document.getElementById(‘manual-earnings’).value = ‘’;document.getElementById(‘manual-custom-category’).value = ‘’;document.getElementById(‘manual-custom-category’).classList.add(‘hidden’);document.getElementById(‘manual-category’).value = document.getElementById(‘manual-category’).options[0].value;}

function resetFinanceForm() {const today = new Date().toISOString().split(‘T’)[0];document.getElementById(‘finance-date’).value = today;document.getElementById(‘finance-type’).value = ‘income’;document.getElementById(‘finance-amount’).value = ‘’;document.getElementById(‘finance-person’).value = ‘’;document.getElementById(‘finance-currency’).value = ‘CZK’;document.getElementById(‘finance-category’).value = document.getElementById(‘finance-category’).options[0].value;document.getElementById(‘finance-custom-category’).value = ‘’;document.getElementById(‘finance-custom-category’).classList.add(‘hidden’);document.getElementById(‘finance-note’).value = ‘’;document.getElementById(‘finance-debt-ratio’).value = ‘0’;document.getElementById(‘finance-rent-payment’).value = ‘’;document.getElementById(‘finance-other-debt-payment’).value = ‘’;document.getElementById(‘finance-payout’).value = ‘’;document.getElementById(‘finance-paid-amount’).value = ‘’;document.getElementById(‘finance-debt-payment’).style.display = ‘none’;}

function resetDebtForm() {const today = new Date().toISOString().split(‘T’)[0];document.getElementById(‘debt-date’).value = today;document.getElementById(‘debt-person’).value = ‘Společný’;document.getElementById(‘debt-type’).value = ‘rent’;document.getElementById(‘debt-amount’).value = ‘’;document.getElementById(‘debt-currency’).value = ‘CZK’;document.getElementById(‘debt-note’).value = ‘’;}

function resetDebtPaymentForm() {const today = new Date().toISOString().split(‘T’)[0];document.getElementById(‘debt-payment-date’).value = today;document.getElementById(‘debt-payment-person’).value = ‘Společný’;document.getElementById(‘debt-payment-type’).value = ‘rent’;document.getElementById(‘debt-payment-amount’).value = ‘’;document.getElementById(‘debt-payment-currency’).value = ‘CZK’;document.getElementById(‘debt-payment-note’).value = ‘’;}

// Inicializace aplikacefunction initApp() {// Načíst dataloadData();

// Inicializovat formuláře
initForms();

// Přidat event listenery
initEventListeners();

// Vyplnit tabulky
renderReportsTable();
renderFinancesTable();
renderDebtTable();

// Aktualizovat souhrn
updateSummary();
updateDebtSummary();

// Aktualizovat dropdowny kategorií
updateCategoryDropdowns();
updateFinanceCategoryDropdown();

}

// Spuštění aplikace při načtení stránkydocument.addEventListener(‘DOMContentLoaded’, initApp);