document.addEventListener('DOMContentLoaded', () => {
    const timerTimeDisplay = document.getElementById('timer-time');
    const timerStartButton = document.getElementById('timer-start');
    const timerPauseButton = document.getElementById('timer-pause');
    const timerStopButton = document.getElementById('timer-stop');
    const timerPersonDisplay = document.getElementById('timer-person');

    const manualEntryForm = document.getElementById('manual-entry-form');
    const workLogsTableBody = document.getElementById('work-logs-table');

    const financeForm = document.getElementById('finance-form');
    const financeTableBody = document.getElementById('finance-table');

    const debtForm = document.getElementById('debt-form');
    const paymentForm = document.getElementById('payment-form');
    const debtsListDiv = document.getElementById('debts-list');

    const taskCategoriesList = document.getElementById('task-categories-list');
    const addTaskCategoryButton = document.getElementById('add-task-category');
    const newTaskCategoryInput = document.getElementById('new-task-category');
    const expenseCategoriesList = document.getElementById('expense-categories-list');
    const addExpenseCategoryButton = document.getElementById('add-expense-category');
    const newExpenseCategoryInput = document.getElementById('new-expense-category');

    const rentAmountInput = document.getElementById('rent-amount');
    const rentDayInput = document.getElementById('rent-day');
    const saveRentSettingsButton = document.getElementById('save-rent-settings');

    const exportWorkLogsButton = document.getElementById('export-work-logs');
    const exportFinanceButton = document.getElementById('export-finance');
    const exportDebtsButton = document.getElementById('export-debts');

    let timerInterval;
    let startTime;
    let pauseTime;
    let runningTime = 0;
    let isRunning = false;
    let currentPerson = 'maru'; // Default person for timer

    const hourlyRates = {
        maru: 275,
        marty: 400
    };

    // --- Local Storage ---
    const loadData = () => {
        const workLogs = JSON.parse(localStorage.getItem('workLogs')) || [];
        const finances = JSON.parse(localStorage.getItem('finances')) || [];
        const debts = JSON.parse(localStorage.getItem('debts')) || [];
        const rentSettings = JSON.parse(localStorage.getItem('rentSettings')) || { amount: 0, day: null };
        const taskCategories = JSON.parse(localStorage.getItem('taskCategories')) || [];
        const expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || [];
        return { workLogs, finances, debts, rentSettings, taskCategories, expenseCategories };
    };

    const saveData = (data) => {
        localStorage.setItem('workLogs', JSON.stringify(data.workLogs));
        localStorage.setItem('finances', JSON.stringify(data.finances));
        localStorage.setItem('debts', JSON.stringify(data.debts));
        localStorage.setItem('rentSettings', JSON.stringify(data.rentSettings));
        localStorage.setItem('taskCategories', JSON.stringify(data.taskCategories));
        localStorage.setItem('expenseCategories', JSON.stringify(data.expenseCategories));
    };

    let { workLogs, finances, debts, rentSettings, taskCategories, expenseCategories } = loadData();

    // --- Timer ---
    const updateTimerDisplay = () => {
        const totalSeconds = Math.floor(runningTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timerTimeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (!isRunning) {
            isRunning = true;
            startTime = Date.now() - runningTime;
            timerInterval = setInterval(() => {
                runningTime = Date.now() - startTime;
                updateTimerDisplay();
            }, 1000);
            timerStartButton.disabled = true;
            timerPauseButton.disabled = false;
            timerStopButton.disabled = false;
            timerPersonDisplay.textContent = currentPerson === 'maru' ? 'Maru' : 'Marty';
        }
    };

    const pauseTimer = () => {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerInterval);
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
        }
    };

    const stopTimer = () => {
        if (isRunning || runningTime > 0) {
            isRunning = false;
            clearInterval(timerInterval);
            const endTime = new Date();
            const durationInMinutes = Math.round(runningTime / (1000 * 60));
            const startTimeObj = new Date(startTime);
            const now = new Date(); // Current date for the work log
            const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            workLogs.push({
                person: currentPerson,
                date: dateString,
                start: `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`,
                end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
                break: 0, // No break implemented in basic timer
                worked: durationInMinutes,
                earnings: (durationInMinutes / 60) * hourlyRates[currentPerson]
            });
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            renderWorkLogs();

            runningTime = 0;
            updateTimerDisplay();
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
            timerStopButton.disabled = true;
            timerPersonDisplay.textContent = '';
        }
    };

    timerStartButton.addEventListener('click', startTimer);
    timerPauseButton.addEventListener('click', pauseTimer);
    timerStopButton.addEventListener('click', stopTimer);

    document.querySelectorAll('#timer-person-select input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentPerson = event.target.value;
        });
    });

    // --- Manual Work Log Entry ---
    manualEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('manual-person').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const endTimeStr = document.getElementById('manual-end-time').value;
        const breakTime = parseInt(document.getElementById('manual-break-time').value) || 0;

        const startParts = startTimeStr.split(':');
        const endParts = endTimeStr.split(':');

        if (startParts.length !== 2 || endParts.length !== 2 || isNaN(parseInt(startParts[0])) || isNaN(parseInt(startParts[1])) || isNaN(parseInt(endParts[0])) || isNaN(parseInt(endParts[1]))) {
            alert('Neplatný formát času.');
            return;
        }

        const startHour = parseInt(startParts[0]);
        const startMinute = parseInt(startParts[1]);
        const endHour = parseInt(endParts[0]);
        const endMinute = parseInt(endParts[1]);

        const startDate = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);
        const endDate = new Date(`${date}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
            alert('Neplatné datum nebo čas.');
            return;
        }

        const durationInMinutes = Math.round((endDate - startDate) / (1000 * 60)) - breakTime;
        if (durationInMinutes <= 0) {
            alert('Odpracovaný čas musí být kladný.');
            return;
        }

        workLogs.push({
            person,
            date,
            start: startTimeStr,
            end: endTimeStr,
            break: breakTime,
            worked: durationInMinutes,
            earnings: (durationInMinutes / 60) * hourlyRates[person]
        });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderWorkLogs();
        manualEntryForm.reset();
    });

    const renderWorkLogs = () => {
        workLogsTableBody.innerHTML = '';
        workLogs.forEach(log => {
            const row = workLogsTableBody.insertRow();
            row.insertCell().textContent = log.person === 'maru' ? 'Maru' : 'Marty';
            row.insertCell().textContent = log.date;
            row.insertCell().textContent = log.start;
            row.insertCell().textContent = log.end;
            row.insertCell().textContent = log.break;
            row.insertCell().textContent = `${Math.floor(log.worked / 60)}:${String(log.worked % 60).padStart(2, '0')}`;
            row.insertCell().textContent = `${log.earnings.toFixed(2)} CZK`;
        });
    };

    // --- Finance ---
    financeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('finance-type').value;
        const description = document.getElementById('finance-description').value;
        const amount = parseFloat(document.getElementById('finance-amount').value);
        const currency = document.getElementById('finance-currency').value;
        const date = document.getElementById('finance-date').value;

        if (isNaN(amount)) {
            alert('Neplatná částka.');
            return;
        }

        finances.push({ type, description, amount, currency, date });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        financeForm.reset();
    });

    const renderFinances = () => {
        financeTableBody.innerHTML = '';
        finances.forEach(finance => {
            const row = financeTableBody.insertRow();
            row.insertCell().textContent = finance.type === 'income' ? 'Příjem' : 'Výdaj';
            row.insertCell().textContent = finance.description;
            row.insertCell().textContent = finance.amount;
            row.insertCell().textContent = finance.currency;
            row.insertCell().textContent = finance.date;
        });
    };

    // --- Dluhy a splátky ---
    debtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('debt-person').value;
        const description = document.getElementById('debt-description').value;
        const amount = parseFloat(document.getElementById('debt-amount').value);
        const currency = document.getElementById('debt-currency').value;

        if (isNaN(amount)) {
            alert('Neplatná částka dluhu.');
            return;
        }

        debts.push({ person, description, amount, currency, paid: 0 });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderDebts();
        debtForm.reset();
    });

    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('payment-person').value;
        const description = document.getElementById('payment-description').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const currency = document.getElementById('payment-currency').value;

        if (isNaN(amount)) {
            alert('Neplatná částka splátky.');
            return;
        }

        // For simplicity, we'll just add a finance record for the payment
        finances.push({ type: 'expense', description: `Splátka dluhu: ${description}`, amount, currency, date: new Date().toISOString().slice(0, 10) });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        renderDebts(); // Update debts overview after payment
        paymentForm.reset();
    });

    const renderDebts = () => {
        debtsListDiv.innerHTML = '';
        const debtsByPerson = {};
        debts.forEach(debt => {
            if (!debtsByPerson[debt.person]) {
                debtsByPerson[debt.person] = {};
            }
            if (!debtsByPerson[debt.person][debt.currency]) {
                debtsByPerson[debt.person][debt.currency] = [];
            }
            debtsByPerson[debt.person][debt.currency].push(debt);
        });

        for (const person in debtsByPerson) {
            const personDiv = document.createElement('div');
            personDiv.innerHTML = `<h3>${person === 'maru' ? 'Maru' : 'Marty'}</h3>`;
            for (const currency in debtsByPerson[person]) {
                const currencyDiv = document.createElement('div');
                currencyDiv.innerHTML = `<h4>${currency}</h4><ul></ul>`;
                const ul = currencyDiv.querySelector('ul');
                let totalDebt = 0;
                debtsByPerson[person][currency].forEach(debt => {
                    const li = document.createElement('li');
                    li.textContent = `${debt.description}: ${debt.amount} ${debt.currency}`;
                    ul.appendChild(li);
                    totalDebt += debt.amount;
                });
                const totalLi = document.createElement('li');
                totalLi.textContent = `Celkem: ${totalDebt} ${currency}`;
                ul.appendChild(totalLi);
                personDiv.appendChild(currencyDiv);
            }
            debtsListDiv.appendChild(personDiv);
        }
    };

    // --- Nastavení ---
    const renderCategories = () => {
        taskCategoriesList.innerHTML = '';
        taskCategories.forEach(category => {
            const li = document.createElement('li');
            li.textContent = category;
            taskCategoriesList.appendChild(li);
        });

        expenseCategoriesList.innerHTML = '';
        expenseCategories.forEach(category => {
            const li = document.createElement('li');
            li.textContent = category;
            expenseCategoriesList.appendChild(li);
        });
    };

    addTaskCategoryButton.addEventListener('click', () => {
        const newCategory = newTaskCategoryInput.value.trim();
        if (newCategory) {
            taskCategories.push(newCategory);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            renderCategories();
            newTaskCategoryInput.value = '';
        }
    });

    addExpenseCategoryButton.addEventListener('click', () => {
        const newCategory = newExpenseCategoryInput.value.trim();
        if (newCategory) {
            expenseCategories.push(newCategory);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            renderCategories();
            newExpenseCategoryInput.value = '';
        }
    });

    if (rentSettings.amount) {
        rentAmountInput.value = rentSettings.amount;
    }
    if (rentSettings.day) {
        rentDayInput.value = rentSettings.day;
    }

    saveRentSettingsButton.addEventListener('click', () => {
        const amount = parseFloat(rentAmountInput.value);
        const day = parseInt(rentDayInput.value);
        if (!isNaN(amount) && !isNaN(day) && day >= 1 && day <= 31) {
            rentSettings.amount = amount;
            rentSettings.day = day;
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            alert('Nastavení nájmu uloženo.');
        } else {
            alert('Neplatná výše nájmu nebo den v měsíci.');
        }
    });

    const exportToCSV = (filename, rows) => {
        const processRow = function (row) {
            const finalVal = [];
            for (let j = 0; j < row.length; j++) {
                let innerValue = row[j] === null ? '' : row[j].toString();
                if (row[j] instanceof Date) {
                    innerValue = row[j].toLocaleString();
                };
                let result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                finalVal.push(result);
            }
            return finalVal.join(',');
        };

        let csvFile = '';
        for (let i = 0; i < rows.length; i++) {
            csvFile += processRow(rows[i]) + '\n';
        }

        const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    exportWorkLogsButton.addEventListener('click', () => {
        const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)'];
        const data = workLogs.map(log => [
            log.person === 'maru' ? 'Maru' : 'Marty',
            log.date,
            log.start,
            log.end,
            log.break,
            log.worked,
            log.earnings.toFixed(2)
        ]);
        exportToCSV('work_logs.csv', [header, ...data]);
    });

    exportFinanceButton.addEventListener('click', () => {
        const header = ['Typ', 'Popis', 'Částka', 'Měna', 'Datum'];
        const data = finances.map(finance => [
            finance.type === 'income' ? 'Příjem' : 'Výdaj',
            finance.description,
            finance.amount,
            finance.currency,
            finance.date
        ]);
        exportToCSV('finance.csv', [header, ...data]);
    });

    exportDebtsButton.addEventListener('click', () => {
        const header = ['Osoba', 'Popis', 'Částka', 'Měna'];
        const data = debts.map(debt => [
            debt.person === 'maru' ? 'Maru' : 'Marty',
            debt.description,
            debt.amount,
            debt.currency
        ]);
        exportToCSV('debts.csv', [header, ...data]);
    });

    // --- Initial Render ---
    renderWorkLogs();
    renderFinances();
    renderDebts();
    renderCategories();
});