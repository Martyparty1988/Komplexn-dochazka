// [Sloučený obsah z původních dokumentů s JavaScriptem]
const HOURLY_RATES = {
    'Maru': 275,
    'Marty': 400
};

const DEBT_PAYMENT_RATIOS = {
    'Maru': 1/3,
    'Marty': 1/2
};

const CURRENCY_SYMBOLS = {
    'CZK': 'Kč',
    'EUR': '€'
};

let appData = {
    reports: [],
    finances: [],
    debts: [],
    debtPayments: [],
    categories: ['Komunikace s hostem', 'Úklid', 'Wellness'],
    financeCategories: ['Výplata', 'Záloha', 'Nájem', 'Nákup'],
    settings: {
        monthlyRentCZK: 20400,
        monthlyRentEUR: 800,
        autoAddRentDay: 1,
        lastRentAddedMonth: null
    }
};

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

function formatCurrency(amount, currency = 'CZK') {
    if (currency === 'EUR') {
        return parseFloat(amount).toLocaleString('cs-CZ') + ' €';
    } else {
        return parseFloat(amount).toLocaleString('cs-CZ') + ' Kč';
    }
}

function formatYearMonth(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthName(dateString) {
    const date = new Date(dateString);
    const monthNames = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
    return monthNames[date.getMonth()];
}

function parseHoursInput(input) {
    if (!input) return 0;
    input = input.toString().trim();
    if (input.includes(':')) {
        const [hours, minutes] = input.split(':');
        return parseFloat(hours) + parseFloat(minutes) / 60;
    }
    if (input.endsWith('m')) {
        return parseFloat(input.slice(0, -1)) / 60;
    }
    if (input.length > 0 && !input.includes('.') && !input.includes(',') && parseInt(input) >= 60) {
        return parseInt(input) / 60;
    }
    if (input.includes(',')) {
        return parseFloat(input.replace(',', '.'));
    }
    if (input.length === 4 && !isNaN(parseInt(input))) {
        const hours = parseInt(input.substring(0, 2));
        const minutes = parseInt(input.substring(2, 4));
        return hours + minutes / 60;
    }
    return parseFloat(input);
}

function calculateHours(startTime, endTime, pauseMinutes) {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours - (pauseMinutes / 60));
}

function calculateEarnings(hours, person, currency = 'CZK') {
    let rate = HOURLY_RATES[person];
    if (currency === 'EUR') rate = rate / 25;
    return hours * rate;
}

function calculateDebtPayment(amount, person, currency) {
    return amount * DEBT_PAYMENT_RATIOS[person];
}

function calculateRentDebtPayment(amount, person, currency) {
    const rentAmount = currency === 'CZK' ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;
    return Math.min(amount, rentAmount);
}

function calculateOtherDebtPayment(amount, person, currency) {
    const rentAmount = currency === 'CZK' ? appData.settings.monthlyRentCZK : appData.settings.monthlyRentEUR;
    const rentPayment = Math.min(amount, rentAmount);
    return Math.max(0, amount - rentPayment);
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('success', 'error', 'warning');
    notification.classList.add(type, 'show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

function validateWorkReport(data) {
    const { date, person, category, startTime, endTime, pauseMinutes, hours, earnings } = data;
    if (!date) { showNotification('Prosím vyplňte datum.', 'error'); return false; }
    if (!person) { showNotification('Prosím vyberte osobu.', 'error'); return false; }
    if (!category) { showNotification('Prosím vyberte kategorii.', 'error'); return false; }
    if (!hours || hours <= 0) { showNotification('Neplatný počet hodin. Prosím vyplňte všechny údaje.', 'error'); return false; }
    return true;
}

function validateFinanceRecord(data) {
    const { date, type, amount, currency } = data;
    if (!date) { showNotification('Prosím vyplňte datum.', 'error'); return false; }
    if (!type) { showNotification('Prosím vyberte typ.', 'error'); return false; }
    if (!amount || amount <= 0) { showNotification('Prosím zadejte platnou částku.', 'error'); return false; }
    if (!currency) { showNotification('Prosím vyberte měnu.', 'error'); return false; }
    return true;
}

function validateDebtRecord(data) {
    const { date, person, type, amount, currency } = data;
    if (!date) { showNotification('Prosím vyplňte datum.', 'error'); return false; }
    if (!person) { showNotification('Prosím vyberte osobu.', 'error'); return false; }
    if (!type) { showNotification('Prosím vyberte typ dluhu.', 'error'); return false; }
    if (!amount || amount <= 0) { showNotification('Prosím zadejte platnou částku.', 'error'); return false; }
    if (!currency) { showNotification('Prosím vyberte měnu.', 'error'); return false; }
    return true;
}

function saveData() {
    localStorage.setItem('workReportData', JSON.stringify(appData));
}

function loadData() {
    const savedData = localStorage.getItem('workReportData');
    if (savedData) {
        appData = JSON.parse(savedData);
        if (!appData.categories) appData.categories = ['Komunikace s hostem', 'Úklid', 'Wellness'];
        if (!appData.financeCategories) appData.financeCategories = ['Výplata', 'Záloha', 'Nájem', 'Nákup'];
        if (!appData.debts) appData.debts = [];
        if (!appData.debtPayments) appData.debtPayments = [];
        if (!appData.settings) appData.settings = { monthlyRentCZK: 20400, monthlyRentEUR: 800, autoAddRentDay: 1, lastRentAddedMonth: null };
        document.getElementById('monthly-rent-amount').value = appData.settings.monthlyRentCZK;
        document.getElementById('monthly-rent-amount-eur').value = appData.settings.monthlyRentEUR;
        document.getElementById('auto-add-rent').value = appData.settings.autoAddRentDay;
    }
    checkAndAddMonthlyRent();
}

function checkAndAddMonthlyRent() {
    if (appData.settings.autoAddRentDay === '0') return;
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = today.getDate();
    if (currentDay >= parseInt(appData.settings.autoAddRentDay) && appData.settings.lastRentAddedMonth !== currentMonth) {
        addDebt({ date: today.toISOString().split('T')[0], person: 'Společný', type: 'rent', amount: appData.settings.monthlyRentCZK, currency: 'CZK', note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}` });
        addDebt({ date: today.toISOString().split('T')[0], person: 'Společný', type: 'rent', amount: appData.settings.monthlyRentEUR, currency: 'EUR', note: `Nájem - ${formatMonthName(today)} ${today.getFullYear()}` });
        appData.settings.lastRentAddedMonth = currentMonth;
        saveData();
        showNotification(`Automaticky přidán měsíční nájem za ${formatMonthName(today)}.`);
    }
}

function exportToCSV() {
    let reportsCSV = 'Datum,Osoba,Kategorie,Začátek,Konec,Pauza,Odpracováno,Výdělek,Měna\n';
    appData.reports.forEach(report => reportsCSV += `${report.date},${report.person},${report.category},${report.startTime || ''},${report.endTime || ''},${report.pauseMinutes || 0},${report.hours},${report.earnings},${report.currency || 'CZK'}\n`);
    let financesCSV = 'Datum,Typ,Osoba,Kategorie,Částka,Měna,Splátka nájmu,Splátka ost. dluhu,K vyplacení,Reálně vyplaceno,Poznámka\n';
    appData.finances.forEach(finance => financesCSV += `${finance.date},${finance.type === 'income' ? 'Příjem' : 'Výdaj'},${finance.person || '-'},${finance.category || '-'},${finance.amount},${finance.currency || 'CZK'},${finance.rentPayment || 0},${finance.otherDebtPayment || 0},${finance.payout || 0},${finance.paidAmount || 0},${finance.note || ''}\n`);
    let debtsCSV = 'Datum,Osoba,Typ dluhu,Částka,Měna,Poznámka\n';
    appData.debts.forEach(debt => debtsCSV += `${debt.date},${debt.person},${debt.type === 'rent' ? 'Nájem' : 'Ostatní'},${debt.amount},${debt.currency || 'CZK'},${debt.note || ''}\n`);
    let debtPaymentsCSV = 'Datum,Osoba,Typ splátky,Částka,Měna,Poznámka\n';
    appData.debtPayments.forEach(payment => debtPaymentsCSV += `${payment.date},${payment.person},${payment.type === 'rent' ? 'Nájem' : 'Ostatní'},${payment.amount},${payment.currency || 'CZK'},${payment.note || ''}\n`);
    downloadCSV('vykazy.csv', reportsCSV);
    downloadCSV('finance.csv', financesCSV);
    downloadCSV('dluhy.csv', debtsCSV);
    downloadCSV('splatky.csv', debtPaymentsCSV);
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
    document.getElementById('timer-start').value = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    document.getElementById('timer-end').value = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
    updateTimerSummary();
    document.getElementById('timer-summary').classList.remove('hidden');
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
    const currency = document.getElementById('timer-currency').value;
    const hours = calculateHours(startTime, endTime, pauseMinutes);
    const earnings = calculateEarnings(hours, person, currency);
    document.getElementById('timer-hours').value = hours.toFixed(2);
    document.getElementById('timer-earnings').value = formatCurrency(earnings, currency);
}

function renderReportsTable() {
    const tableBody = document.getElementById('reports-table-body');
    const noReportsMessage = document.getElementById('no-reports-message');
    const dateFilter = document.getElementById('filter-date').value;
    const personFilter = document.getElementById('filter-person').value;
    const currencyFilter = document.getElementById('filter-currency').value;
    let filteredReports = appData.reports;
    if (dateFilter) filteredReports = filteredReports.filter(report => report.date === dateFilter);
    if (personFilter) filteredReports = filteredReports.filter(report => report.person === personFilter);
    if (currencyFilter) filteredReports = filteredReports.filter(report => (!report.currency && currencyFilter === 'CZK') || report.currency === currencyFilter);
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    tableBody.innerHTML = '';
    if (filteredReports.length === 0) {
        noReportsMessage.classList.remove('hidden');
        return;
    } else {
        noReportsMessage.classList.add('hidden');
    }
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
    const dateFilter = document.getElementById('filter-finance-date').value;
    const typeFilter = document.getElementById('filter-finance-type').value;
    const personFilter = document.getElementById('filter-finance-person').value;
    const currencyFilter = document.getElementById('filter-finance-currency').value;
    let filteredFinances = appData.finances;
    if (dateFilter) filteredFinances = filteredFinances.filter(finance => finance.date === dateFilter);
    if (typeFilter) filteredFinances = filteredFinances.filter(finance => finance.type === typeFilter);
    if (personFilter) filteredFinances = filteredFinances.filter(finance => finance.person === personFilter);
    if (currencyFilter) filteredFinances = filteredFinances.filter(finance => (!finance.currency && currencyFilter === 'CZK') || finance.currency === currencyFilter);
    filteredFinances.sort((a, b) => new Date(b.date) - new Date(a.date));
    tableBody.innerHTML = '';
    if (filteredFinances.length === 0) {
        noFinancesMessage.classList.remove('hidden');
        return;
    } else {
        noFinancesMessage.classList.add('hidden');
    }
    filteredFinances.forEach((finance, index) => {
        const row = document.createElement('tr');
        let typeClass = '';
        if (finance.type === 'income') typeClass = 'text-success';
        else if (finance.type === 'expense') typeClass = 'text-danger';
        const currency = finance.currency || 'CZK';
        const amountDisplay = finance.type === 'expense' ? `-${formatCurrency(finance.amount, currency)}` : formatCurrency(finance.amount, currency);
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
    document.querySelectorAll('.delete-finance').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            deleteFinance(filteredFinances[index].id);
        });
    });
}

function renderDebtTable() {
    const tableBody = document.getElementById('debt-table-body');
    const noDebtMessage = document.getElementById('no-debt-message');
    const personFilter = document.getElementById('filter-debt-person').value;
    const typeFilter = document.getElementById('filter-debt-type').value;
    const currencyFilter = document.getElementById('filter-debt-currency').value;
    const monthFilter = document.getElementById('filter-debt-month').value;
    let debtHistory = [];
    appData.debts.forEach(debt => {
        const month = debt.date.substring(0, 7);
        if ((!monthFilter || month === monthFilter) && (!personFilter || debt.person === personFilter) && (!typeFilter || debt.type === typeFilter) && (!currencyFilter || debt.currency === currencyFilter)) {
            debtHistory.push({ date: debt.date, person: debt.person, type: debt.type, added: debt.amount, addedCurrency: debt.currency, paid: 0, paidCurrency: debt.currency, note: debt.note, id: debt.id, isDebt: true });
        }
    });
    appData.debtPayments.forEach(payment => {
        const month = payment.date.substring(0, 7);
        if ((!monthFilter || month === monthFilter) && (!personFilter || payment.person === personFilter) && (!typeFilter || payment.type === typeFilter) && (!currencyFilter || payment.currency === currencyFilter)) {
            debtHistory.push({ date: payment.date, person: payment.person, type: payment.type, added: 0, addedCurrency: payment.currency, paid: payment.amount, paidCurrency: payment.currency, note: payment.note, id: payment.id, isPayment: true });
        }
    });
    appData.finances.forEach(finance => {
        if (finance.type === 'income' && finance.person && (finance.rentPayment || finance.otherDebtPayment)) {
            const month = finance.date.substring(0, 7);
            if ((!monthFilter || month === monthFilter) && (!personFilter || finance.person === personFilter) && (!currencyFilter || finance.currency === currencyFilter)) {
                if (finance.rentPayment > 0) {
                    debtHistory.push({ date: finance.date, person: finance.person, type: 'rent', added: 0, addedCurrency: finance.currency, paid: finance.rentPayment, paidCurrency: finance.currency, note: `Automatická splátka nájmu z výplaty (${finance.note})`, id: finance.id + '_rent', isAutoPayment: true });
                }
                if (finance.otherDebtPayment > 0) {
                    debtHistory.push({ date: finance.date, person: finance.person, type: 'other', added: 0, addedCurrency: finance.currency, paid: finance.otherDebtPayment, paidCurrency: finance.currency, note: `Automatická splátka ostatního dluhu z výplaty (${finance.note})`, id: finance.id + '_other', isAutoPayment: true });
                }
            }
        }
    });
    debtHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    const balances = { 'Maru': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }, 'Marty': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }, 'Společný': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } } };
    debtHistory.forEach(item => {
        const currency = item.addedCurrency || 'CZK';
        if (item.added > 0) balances[item.person][currency][item.type] += item.added;
        if (item.paid > 0) {
            const paidCurrency = item.paidCurrency || 'CZK';
            if (item.type === 'rent') balances[item.person][paidCurrency].rent -= item.paid;
            else balances[item.person][paidCurrency].other -= item.paid;
        }
    });
    tableBody.innerHTML = '';
    if (debtHistory.length === 0) {
        noDebtMessage.classList.remove('hidden');
        return;
    } else {
        noDebtMessage.classList.add('hidden');
    }
    let cumulativeBalance = { 'Maru': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }, 'Marty': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } }, 'Společný': { 'CZK': { rent: 0, other: 0 }, 'EUR': { rent: 0, other: 0 } } };
    debtHistory.forEach((item, index) => {
        const row = document.createElement('tr');
        const addedCurrency = item.addedCurrency || 'CZK';
        const paidCurrency = item.paidCurrency || 'CZK';
        if (item.added > 0) cumulativeBalance[item.person][addedCurrency][item.type] += item.added;
        if (item.paid > 0) cumulativeBalance[item.person][paidCurrency][item.type] -= item.paid;
        const currentBalance = cumulativeBalance[item.person][addedCurrency][item.type];
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
                ${!item.isAutoPayment ? `<button class="btn danger-btn delete-debt-item" data-index="${index}" data-type="${item.isDebt ? 'debt' : 'payment'}"><i class="fas fa-trash"></i></button>` : '-'}
            </td>
        `;
        tableBody.appendChild(row);
    });
    document.querySelectorAll('.delete-debt-item').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            const type = this.getAttribute('data-type');
            const item = debtHistory[index];
            if (type === 'debt') deleteDebt(item.id);
            else deleteDebtPayment(item.id);
        });
    });
    updateDebtSummary();
}

function updateDebtSummary() {
    const summary = { 'Maru': { 'CZK': { initial: 0, rent: 0, other: 0, payments: 0 }, 'EUR': { initial: 0, rent: 0, other: 0, payments: 0 } }, 'Marty': { 'CZK': { initial: 0, rent: 0, other: 0, payments: 0 }, 'EUR': { initial: 0, rent: 0, other: 0, payments: 0 } }, 'Společný': { 'CZK': { initial: 0, rent: 0, other: 0, payments: 0 }, 'EUR': { initial: 0, rent: 0, other: 0, payments: 0 } } };
    appData.debts.forEach(debt => { const person = debt.person; const currency = debt.currency || 'CZK'; if (debt.type === 'rent') summary[person][currency].rent += debt.amount; else summary[person][currency].other += debt.amount; });
    appData.debtPayments.forEach(payment => { const person = payment.person; const currency = payment.currency || 'CZK'; summary[person][currency].payments += payment.amount; });
    appData.finances.forEach(finance => { if (finance.type === 'income' && finance.person) { const person = finance.person; const currency = finance.currency || 'CZK'; if (finance.rentPayment) summary[person][currency].payments += finance.rentPayment; if (finance.otherDebtPayment) summary[person][currency].payments += finance.otherDebtPayment; } });
    for (const person of ['Maru', 'Marty', 'Společný']) { for (const currency of ['CZK', 'EUR']) { const current = summary[person][currency]; const currentDebt = current.initial + current.rent + current.other - current.payments; if (person === 'Maru') { if (currency === 'CZK') { document.getElementById('maru-initial-debt-czk').textContent = formatCurrency(current.initial, currency); document.getElementById('maru-rent-debt-czk').textContent = formatCurrency(current.rent, currency); document.getElementById('maru-other-debt-czk').textContent = formatCurrency(current.other, currency); document.getElementById('maru-payments-czk').textContent = formatCurrency(current.payments, currency); document.getElementById('maru-current-debt-czk').textContent = formatCurrency(currentDebt, currency); } else { document.getElementById('maru-initial-debt-eur').textContent = formatCurrency(current.initial, currency); document.getElementById('maru-rent-debt-eur').textContent = formatCurrency(current.rent, currency); document.getElementById('maru-other-debt-eur').textContent = formatCurrency(current.other, currency); document.getElementById('maru-payments-eur').textContent = formatCurrency(current.payments, currency); document.getElementById('maru-current-debt-eur').textContent = formatCurrency(currentDebt, currency); } } if (person === 'Marty') { if (currency === 'CZK') { document.getElementById('marty-initial-debt-czk').textContent = formatCurrency(current.initial, currency); document.getElementById('marty-rent-debt-czk').textContent = formatCurrency(current.rent, currency); document.getElementById('marty-other-debt-czk').textContent = formatCurrency(current.other, currency); document.getElementById('marty-payments-czk').textContent = formatCurrency(current.payments, currency); document.getElementById('marty-current-debt-czk').textContent = formatCurrency(currentDebt, currency); } else { document.getElementById('marty-initial-debt-eur').textContent = formatCurrency(current.initial, currency); document.getElementById('marty-rent-debt-eur').textContent = formatCurrency(current.rent, currency); document.getElementById('marty-other-debt-eur').textContent = formatCurrency(current.other, currency); document.getElementById('marty-payments-eur').textContent = formatCurrency(current.payments, currency); document.getElementById('marty-current-debt-eur').textContent = formatCurrency(currentDebt, currency); } } } }
    const totalDebtCZK = (summary['Maru']['CZK'].initial + summary['Maru']['CZK'].rent + summary['Maru']['CZK'].other - summary['Maru']['CZK'].payments) + (summary['Marty']['CZK'].initial + summary['Marty']['CZK'].rent + summary['Marty']['CZK'].other - summary['Marty']['CZK'].payments) + (summary['Společný']['CZK'].initial + summary['Společný']['CZK'].rent + summary['Společný']['CZK'].other - summary['Společný']['CZK'].payments);
    const totalDebtEUR = (summary['Maru']['EUR'].initial + summary['Maru']['EUR'].rent + summary['Maru']['EUR'].other - summary['Maru']['EUR'].payments) + (summary['Marty']['EUR'].initial + summary['Marty']['EUR'].rent + summary['Marty']['EUR'].other - summary['Marty']['EUR'].payments) + (summary['Společný']['EUR'].initial + summary['Společný']['EUR'].rent + summary['Společný']['EUR'].other - summary['Společný']['EUR'].payments);
    document.getElementById('total-current-debt-czk').textContent = formatCurrency(totalDebtCZK, 'CZK');
    document.getElementById('total-current-debt-eur').textContent = formatCurrency(totalDebtEUR, 'EUR');
}

function updateSummary() {
    const maruReports = appData.reports.filter(report => report.person === 'Maru');
    const maruTotalHours = maruReports.reduce((sum, report) => sum + report.hours, 0);
    const maruReportsCZK = maruReports.filter(report => !report.currency || report.currency === 'CZK');
    const maruReportsEUR = maruReports.filter(report => report.currency === 'EUR');
    const maruTotalEarningsCZK = maruReportsCZK.reduce((sum, report) => sum + report.earnings, 0);
    const maruTotalEarningsEUR = maruReportsEUR.reduce((sum, report) => sum + report.earnings, 0);
    const maruFinancesCZK = appData.finances.filter(finance => finance.person === 'Maru' && (!finance.currency || finance.currency === 'CZK'));
    const maruFinancesEUR = appData.finances.filter(finance => finance.person === 'Maru' && finance.currency === 'EUR');
    const maruRentPaidCZK = maruFinancesCZK.filter(finance => finance.rentPayment).reduce((sum, finance) => sum + finance.rentPayment, 0);
    const maruOtherDebtPaidCZK = maruFinancesCZK.filter(finance => finance.otherDebtPayment).reduce((sum, finance) => sum + finance.otherDebtPayment, 0);
    const maruPaidOutCZK = maruFinancesCZK.filter(finance => finance.payout).reduce((sum, finance) => sum + finance.payout, 0);
    const maruRentPaidEUR = maruFinancesEUR.filter(finance => finance.rentPayment).reduce((sum, finance) => sum + finance.rentPayment, 0);
    const maruOtherDebtPaidEUR = maruFinancesEUR.filter(finance => finance.otherDebtPayment).reduce((sum, finance) => sum + finance.otherDebtPayment, 0);
    const maruPaidOutEUR = maruFinancesEUR.filter(finance => finance.payout).reduce((sum, finance) => sum + finance.payout, 0);
    const martyReports = appData.reports.filter(report => report.person === 'Marty');
    const martyTotalHours = martyReports.reduce((sum, report) => sum + report.hours, 0);
    const martyReportsCZK = martyReports.filter(report => !report.currency || report.currency === 'CZK');
    const martyReportsEUR = martyReports.filter(report => report.currency === 'EUR');
    const martyTotalEarningsCZK = martyReportsCZK.reduce((sum, report) => sum + report.earnings, 0);
    const martyTotalEarningsEUR = martyReportsEUR.reduce((sum, report) => sum + report.earnings, 0);
    const martyFinancesCZK = appData.finances.filter(finance => finance.person === 'Marty' && (!finance.currency || finance.currency === 'CZK'));
    const martyFinancesEUR = appData.finances.filter(finance => finance.person === 'Marty' && finance.currency === 'EUR');
    const martyRentPaidCZK = martyFinancesCZK.filter(finance => finance.rentPayment).reduce((sum, finance) => sum + finance.rentPayment, 0);
    const martyOtherDebtPaidCZK = martyFinancesCZK.filter(finance => finance.otherDebtPayment).reduce((sum, finance) => sum + finance.otherDebtPayment, 0);
    const martyPaidOutCZK = martyFinancesCZK.filter(finance => finance.payout).reduce((sum, finance) => sum + finance.payout, 0);
    const martyRentPaidEUR = martyFinancesEUR.filter(finance => finance.rentPayment).reduce((sum, finance) => sum + finance.rentPayment, 0);
    const martyOtherDebtPaidEUR = martyFinancesEUR.filter(finance => finance.otherDebtPayment).reduce((sum, finance) => sum + finance.otherDebtPayment, 0);
    const martyPaidOutEUR = martyFinancesEUR.filter(finance => finance.payout).reduce((sum, finance) => sum + finance.payout, 0);
    const totalHours = maruTotalHours + martyTotalHours;
    const totalEarningsCZK = maruTotalEarningsCZK + martyTotalEarningsCZK;
    const totalEarningsEUR = maruTotalEarningsEUR + martyTotalEarningsEUR;
    const totalIncomeCZK = appData.finances.filter(finance => finance.type === 'income' && (!finance.currency || finance.currency === 'CZK')).reduce((sum, finance) => sum + finance.amount, 0);
    const totalIncomeEUR = appData.finances.filter(finance => finance.type === 'income' && finance.currency === 'EUR').reduce((sum, finance) => sum + finance.amount, 0);
    const totalExpensesCZK = appData.finances.filter(finance => finance.type === 'expense' && (!finance.currency || finance.currency === 'CZK')).reduce((sum, finance) => sum + finance.amount, 0);
    const totalExpensesEUR = appData.finances.filter(finance => finance.type === 'expense' && finance.currency === 'EUR').reduce((sum, finance) => sum + finance.amount, 0);
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
}

function updateCategoryDropdowns() {
    const categoryDropdowns = document.querySelectorAll('#timer-category, #manual-category');
    categoryDropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        const customOption = dropdown.querySelector('option[value="custom"]');
        dropdown.innerHTML = '';
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            dropdown.appendChild(option);
        });
        dropdown.appendChild(customOption);
        if (appData.categories.includes(currentValue) || currentValue === 'custom') dropdown.value = currentValue;
    });
}

function updateFinanceCategoryDropdown() {
    const dropdown = document.getElementById('finance-category');
    const currentValue = dropdown.value;
    const customOption = dropdown.querySelector('option[value="custom"]');
    dropdown.innerHTML = '';
    appData.financeCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        dropdown.appendChild(option);
    });
    dropdown.appendChild(customOption);
    if (appData.financeCategories.includes(currentValue) || currentValue === 'custom') dropdown.value = currentValue;
}

function addWorkReport(data) {
    const id = Date.now().toString();
    const report = { ...data, id };
    appData.reports.push(report);
    saveData();
    addFinanceFromReport(report);
    renderReportsTable();
    renderFinancesTable();
    updateSummary();
    showNotification('Pracovní výkaz byl úspěšně přidán.');
    return id;
}

function deleteReport(id) {
    if (confirm('Opravdu chcete smazat tento výkaz?')) {
        const relatedFinance = appData.finances.find(finance => finance.reportId === id);
        if (relatedFinance) deleteFinance(relatedFinance.id, false);
        appData.reports = appData.reports.filter(report => report.id !== id);
        saveData();
        renderReportsTable();
        updateSummary();
        showNotification('Výkaz byl smazán.');
    }
}

function addFinance(data) {
    const id = Date.now().toString();
    const finance = { ...data, id };
    appData.finances.push(finance);
    saveData();
    renderFinancesTable();
    renderDebtTable();
    updateSummary();
    showNotification('Finanční záznam byl úspěšně přidán.');
    return id;
}

function addFinanceFromReport(report) {
    const debtPayment = calculateDebtPayment(report.earnings, report.person);
    const rentPayment = calculateRentDebtPayment(debtPayment, report.person, report.currency);
    const otherDebtPayment = calculateOtherDebtPayment(debtPayment, report.person, report.currency);
    const payout = report.earnings - debtPayment;
    const financeData = { date: report.date, type: 'income', amount: report.earnings, person: report.person, category: 'Výplata', currency: report.currency || 'CZK', note: `Výkaz: ${report.category} (${report.hours.toFixed(2)} hod)`, rentPayment, otherDebtPayment, payout, paidAmount: 0, reportId: report.id };
    addFinance(financeData);
}

function deleteFinance(id, showConfirm = true) {
    const proceed = !showConfirm || confirm('Opravdu chcete smazat tento finanční záznam?');
    if (proceed) {
        appData.finances = appData.finances.filter(finance => finance.id !== id);
        saveData();
        renderFinancesTable();
        renderDebtTable();
        updateSummary();
        if (showConfirm) showNotification('Finanční záznam byl smazán.');
    }
}

function addDebt(data) {
    const id = Date.now().toString();
    const debt = { ...data, id };
    appData.debts.push(debt);
    saveData();
    renderDebtTable();
    showNotification('Dluh byl úspěšně přidán.');
    return id;
}

function deleteDebt(id) {
    if (confirm('Opravdu chcete smazat tento dluh?')) {
        appData.debts = appData.debts.filter(debt => debt.id !== id);
        saveData();
        renderDebtTable();
        showNotification('Dluh byl smazán.');
    }
}

function addDebtPayment(data) {
    const id = Date.now().toString();
    const payment = { ...data, id };
    appData.debtPayments.push(payment);
    saveData();
    renderDebtTable();
    showNotification('Splátka dluhu byla úspěšně přidána.');
    return id;
}

function deleteDebtPayment(id) {
    if (confirm('Opravdu chcete smazat tuto splátku dluhu?')) {
        appData.debtPayments = appData.debtPayments.filter(payment => payment.id !== id);
        saveData();
        renderDebtTable();
        showNotification('Splátka dluhu byla smazána.');
    }
}

function initForms() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('manual-date').value = today;
    document.getElementById('finance-date').value = today;
    document.getElementById('debt-date').value = today;
    document.getElementById('debt-payment-date').value = today;
    document.getElementById('monthly-rent-amount').value = appData.settings.monthlyRentCZK;
    document.getElementById('monthly-rent-amount-eur').value = appData.settings.monthlyRentEUR;
    document.getElementById('auto-add-rent').value = appData.settings.autoAddRentDay;
    document.getElementById('timer-category').addEventListener('change', function() {
        const customCategoryInput = document.getElementById('timer-custom-category');
        if (this.value === 'custom') customCategoryInput.classList.remove('hidden');
        else customCategoryInput.classList.add('hidden');
    });
}

// Inicializace aplikace
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderReportsTable();
    renderFinancesTable();
    renderDebtTable();
    updateSummary();
    initForms();

    // Přidání event listenerů
    document.getElementById('start-timer').addEventListener('click', startTimer);
    document.getElementById('pause-timer').addEventListener('click', pauseTimer);
    document.getElementById('stop-timer').addEventListener('click', stopTimer);
    document.getElementById('save-timer').addEventListener('click', () => {
        const data = {
            date: new Date().toISOString().split('T')[0],
            person: document.getElementById('timer-person').value,
            category: document.getElementById('timer-category').value === 'custom' ? document.getElementById('timer-custom-category').value : document.getElementById('timer-category').value,
            startTime: document.getElementById('timer-start').value,
            endTime: document.getElementById('timer-end').value,
            pauseMinutes: parseInt(document.getElementById('timer-pause').value) || 0,
            hours: parseFloat(document.getElementById('timer-hours').value),
            earnings: parseFloat(document.getElementById('timer-earnings').value.replace(/[^\d.,-]/g, '').replace(',', '.')),
            currency: 'CZK' // Přidat podporu měny později
        };
        if (validateWorkReport(data)) addWorkReport(data);
    });
    document.getElementById('save-manual').addEventListener('click', () => {
        const data = {
            date: document.getElementById('manual-date').value,
            person: document.getElementById('manual-person').value,
            category: document.getElementById('manual-category').value === 'custom' ? document.getElementById('manual-custom-category').value : document.getElementById('manual-category').value,
            startTime: document.getElementById('manual-start').value,
            endTime: document.getElementById('manual-end').value,
            pauseMinutes: parseInt(document.getElementById('manual-pause').value) || 0,
            hours: parseFloat(document.getElementById('manual-hours').value),
            earnings: parseFloat(document.getElementById('manual-earnings').value.replace(/[^\d.,-]/g, '').replace(',', '.')),
            currency: 'CZK' // Přidat podporu měny později
        };
        if (validateWorkReport(data)) addWorkReport(data);
    });
    document.getElementById('toggle-timer-mode').addEventListener('click', () => {
        document.getElementById('timer-mode').classList.remove('hidden');
        document.getElementById('manual-mode').classList.add('hidden');
    });
    document.getElementById('toggle-manual-mode').addEventListener('click', () => {
        document.getElementById('manual-mode').classList.remove('hidden');
        document.getElementById('timer-mode').classList.add('hidden');
    });
    document.getElementById('export-data').addEventListener('click', exportToCSV);
    document.querySelectorAll('nav button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
            const sectionId = button.id.replace('nav-', '') + '-section';
            document.getElementById(sectionId).classList.add('active');
            button.classList.add('active');
        });
    });
});