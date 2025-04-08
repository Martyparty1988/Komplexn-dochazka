document.addEventListener('DOMContentLoaded', () => {
    // Základní DOM prvky
    const timerTimeDisplay = document.getElementById('timer-time');
    const timerStartButton = document.getElementById('timer-start');
    const timerPauseButton = document.getElementById('timer-pause');
    const timerStopButton = document.getElementById('timer-stop');
    const timerPersonDisplay = document.getElementById('timer-person');
    const timerActivitySelect = document.getElementById('timer-activity');
    const timerActivityDisplay = document.getElementById('timer-activity-display');

    const manualEntryForm = document.getElementById('manual-entry-form');
    const manualActivitySelect = document.getElementById('manual-activity');
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

    // Globální proměnné
    let timerInterval;
    let isRunning = false;
    let currentPerson = localStorage.getItem('currentTimerPerson') || 'maru';
    let currentActivity = localStorage.getItem('currentTimerActivity') || '';

    const hourlyRates = {
        maru: 275,
        marty: 400
    };

    // --- Local Storage ---
    const loadData = () => {
        return {
            workLogs: JSON.parse(localStorage.getItem('workLogs')) || [],
            finances: JSON.parse(localStorage.getItem('finances')) || [],
            debts: JSON.parse(localStorage.getItem('debts')) || [],
            rentSettings: JSON.parse(localStorage.getItem('rentSettings')) || { amount: 0, day: null },
            taskCategories: JSON.parse(localStorage.getItem('taskCategories')) || [],
            expenseCategories: JSON.parse(localStorage.getItem('expenseCategories')) || []
        };
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

    // --- Helpers pro timer ---
    const getTimerState = () => {
        return {
            startTime: localStorage.getItem('timerStartTime') ? parseInt(localStorage.getItem('timerStartTime')) : null,
            pauseTime: localStorage.getItem('timerPauseTime') ? parseInt(localStorage.getItem('timerPauseTime')) : null,
            isRunning: localStorage.getItem('timerIsRunning') === 'true',
            person: localStorage.getItem('currentTimerPerson') || 'maru',
            activity: localStorage.getItem('currentTimerActivity') || ''
        };
    };

    const saveTimerState = (startTime, pauseTime, isRunning, person, activity) => {
        localStorage.setItem('timerStartTime', startTime ? startTime.toString() : '');
        localStorage.setItem('timerPauseTime', pauseTime ? pauseTime.toString() : '');
        localStorage.setItem('timerIsRunning', isRunning.toString());
        localStorage.setItem('currentTimerPerson', person);
        localStorage.setItem('currentTimerActivity', activity);
    };

    // Aktualizace časovače
    const updateTimerDisplay = () => {
        const timerState = getTimerState();
        
        if (!timerState.startTime) {
            timerTimeDisplay.textContent = '00:00:00';
            return;
        }

        let runningTime;
        if (timerState.isRunning) {
            runningTime = Date.now() - timerState.startTime;
        } else if (timerState.pauseTime) {
            runningTime = timerState.pauseTime - timerState.startTime;
        } else {
            runningTime = 0;
        }

        const totalSeconds = Math.floor(runningTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        timerTimeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        timerPersonDisplay.textContent = timerState.person === 'maru' ? 'Maru' : 'Marty';
        timerActivityDisplay.textContent = timerState.activity || '';
    };

    // Inicializace časovače
    const initializeTimer = () => {
        const timerState = getTimerState();
        isRunning = timerState.isRunning;
        currentPerson = timerState.person;
        currentActivity = timerState.activity;

        // Nastavit radio button pro osobu
        const personRadio = document.querySelector(`#timer-person-select input[value="${currentPerson}"]`);
        if (personRadio) {
            personRadio.checked = true;
        }
        
        // Aktualizovat select s aktivitami
        populateActivitySelects();
        
        // Nastavit aktivitu v selectu časovače
        if (timerActivitySelect && currentActivity) {
            for (let i = 0; i < timerActivitySelect.options.length; i++) {
                if (timerActivitySelect.options[i].value === currentActivity) {
                    timerActivitySelect.selectedIndex = i;
                    break;
                }
            }
        }

        updateTimerDisplay();

        // Nastavit stav tlačítek podle stavu časovače
        if (isRunning) {
            timerStartButton.disabled = true;
            timerPauseButton.disabled = false;
            timerStopButton.disabled = false;
            
            // Restartovat interval
            timerInterval = setInterval(updateTimerDisplay, 1000);
        } else {
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
            timerStopButton.disabled = timerState.startTime ? false : true;
        }
    };

    // Start časovače
    const startTimer = () => {
        const timerState = getTimerState();
        
        if (!isRunning) {
            // Zkontrolovat, zda je vybrána aktivita
            if (timerActivitySelect && timerActivitySelect.value === '') {
                alert('Prosím vyberte úkol před spuštěním časovače');
                return;
            }
            
            isRunning = true;
            
            let startTime;
            if (timerState.startTime && timerState.pauseTime) {
                // Pokračovat po pauze
                const pauseDuration = Date.now() - timerState.pauseTime;
                startTime = timerState.startTime + pauseDuration;
            } else {
                // Nový časovač
                startTime = Date.now();
                currentActivity = timerActivitySelect ? timerActivitySelect.value : '';
                
                // Přidat novou kategorii úkolu, pokud neexistuje
                if (currentActivity && !taskCategories.includes(currentActivity)) {
                    taskCategories.push(currentActivity);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                    renderCategories();
                    populateActivitySelects();
                    
                    // Znovu vybrat aktivitu
                    if (timerActivitySelect) {
                        for (let i = 0; i < timerActivitySelect.options.length; i++) {
                            if (timerActivitySelect.options[i].value === currentActivity) {
                                timerActivitySelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            }
            
            saveTimerState(startTime, null, true, currentPerson, currentActivity);
            
            timerInterval = setInterval(updateTimerDisplay, 1000);
            timerStartButton.disabled = true;
            timerPauseButton.disabled = false;
            timerStopButton.disabled = false;
            
            updateTimerDisplay();
        }
    };

    // Pauza časovače
    const pauseTimer = () => {
        const timerState = getTimerState();
        
        if (isRunning) {
            isRunning = false;
            clearInterval(timerInterval);
            
            const pauseTime = Date.now();
            saveTimerState(timerState.startTime, pauseTime, false, currentPerson, currentActivity);
            
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
        }
    };

    // Zastavení a uložení časovače
    const stopTimer = () => {
        const timerState = getTimerState();
        
        if (timerState.startTime) {
            isRunning = false;
            clearInterval(timerInterval);
            
            let runningTime;
            if (timerState.isRunning) {
                runningTime = Date.now() - timerState.startTime;
            } else if (timerState.pauseTime) {
                runningTime = timerState.pauseTime - timerState.startTime;
            } else {
                runningTime = 0;
            }
            
            const endTime = new Date();
            const durationInMinutes = Math.round(runningTime / (1000 * 60));
            const startTimeObj = new Date(timerState.startTime);
            const now = new Date();
            const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            workLogs.push({
                id: Date.now().toString(),
                person: currentPerson,
                date: dateString,
                start: `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`,
                end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
                break: 0,
                worked: durationInMinutes,
                earnings: (durationInMinutes / 60) * hourlyRates[currentPerson],
                activity: currentActivity
            });
            
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            
            // Resetovat stav časovače
            saveTimerState(null, null, false, currentPerson, currentActivity);
            
            renderWorkLogs();
            
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
            timerStopButton.disabled = true;
            
            updateTimerDisplay();
        }
    };

    // --- Event Listenery pro časovač ---
    timerStartButton.addEventListener('click', startTimer);
    timerPauseButton.addEventListener('click', pauseTimer);
    timerStopButton.addEventListener('click', stopTimer);

    // Změna osoby pro časovač
    document.querySelectorAll('#timer-person-select input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentPerson = event.target.value;
            localStorage.setItem('currentTimerPerson', currentPerson);
        });
    });

    // Změna aktivity pro časovač
    if (timerActivitySelect) {
        timerActivitySelect.addEventListener('change', (e) => {
            currentActivity = e.target.value;
            localStorage.setItem('currentTimerActivity', currentActivity);
        });
    }

    // --- Naplnění selectů s aktivitami ---
    const populateActivitySelects = () => {
        // Pro časovač
        if (timerActivitySelect) {
            const currentSelection = timerActivitySelect.value;
            timerActivitySelect.innerHTML = '<option value="">-- Vyberte úkol --</option>';
            
            taskCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                timerActivitySelect.appendChild(option);
            });
            
            // Obnovit výběr
            if (currentSelection) {
                for (let i = 0; i < timerActivitySelect.options.length; i++) {
                    if (timerActivitySelect.options[i].value === currentSelection) {
                        timerActivitySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Pro ruční zadání výkazu
        if (manualActivitySelect) {
            const currentSelection = manualActivitySelect.value;
            manualActivitySelect.innerHTML = '<option value="">-- Vyberte úkol --</option>';
            
            taskCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                manualActivitySelect.appendChild(option);
            });
            
            // Obnovit výběr
            if (currentSelection) {
                for (let i = 0; i < manualActivitySelect.options.length; i++) {
                    if (manualActivitySelect.options[i].value === currentSelection) {
                        manualActivitySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Pro finanční kategorie
        const financeCategorySelect = document.getElementById('finance-category');
        if (financeCategorySelect) {
            const currentSelection = financeCategorySelect.value;
            financeCategorySelect.innerHTML = '<option value="">-- Vyberte kategorii --</option>';
            
            expenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                financeCategorySelect.appendChild(option);
            });
            
            // Obnovit výběr
            if (currentSelection) {
                for (let i = 0; i < financeCategorySelect.options.length; i++) {
                    if (financeCategorySelect.options[i].value === currentSelection) {
                        financeCategorySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    };

    // --- Ruční zadání výkazu ---
    manualEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('manual-person').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const endTimeStr = document.getElementById('manual-end-time').value;
        const breakTime = parseInt(document.getElementById('manual-break-time').value) || 0;
        const activity = manualActivitySelect ? manualActivitySelect.value : '';

        // Validace času
        const startParts = startTimeStr.split(':');
        const endParts = endTimeStr.split(':');

        if (startParts.length !== 2 || endParts.length !== 2) {
            alert('Neplatný formát času.');
            return;
        }

        const startHour = parseInt(startParts[0]);
        const startMinute = parseInt(startParts[1]);
        const endHour = parseInt(endParts[0]);
        const endMinute = parseInt(endParts[1]);

        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
            alert('Neplatný formát času.');
            return;
        }

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

        // Přidat aktivitu jako kategorii úkolu, pokud je nová
        if (activity && !taskCategories.includes(activity)) {
            taskCategories.push(activity);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            renderCategories();
            populateActivitySelects();
        }

        // Přidat nový záznam
        workLogs.push({
            id: Date.now().toString(),
            person,
            date,
            start: startTimeStr,
            end: endTimeStr,
            break: breakTime,
            worked: durationInMinutes,
            earnings: (durationInMinutes / 60) * hourlyRates[person],
            activity
        });
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderWorkLogs();
        manualEntryForm.reset();
        
        // Nastavit dnešní datum
        document.getElementById('manual-date').valueAsDate = new Date();
    });

    // --- Smazání výkazu ---
    const deleteWorkLog = (id) => {
        const index = workLogs.findIndex(log => log.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento záznam?')) {
                workLogs.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                renderWorkLogs();
            }
        }
    };

    // --- Vykreslení seznamu výkazů ---
    const renderWorkLogs = () => {
        workLogsTableBody.innerHTML = '';
        
        // Seřadit výkazy od nejnovějších
        const sortedLogs = [...workLogs].sort((a, b) => {
            // Nejprve podle data
            const dateA = new Date(a.date + 'T' + a.start);
            const dateB = new Date(b.date + 'T' + b.start);
            return dateB - dateA;
        });
        
        sortedLogs.forEach(log => {
            const row = workLogsTableBody.insertRow();
            row.insertCell().textContent = log.person === 'maru' ? 'Maru' : 'Marty';
            row.insertCell().textContent = log.date;
            row.insertCell().textContent = log.start;
            row.insertCell().textContent = log.end;
            row.insertCell().textContent = log.break;
            row.insertCell().textContent = `${Math.floor(log.worked / 60)}:${String(log.worked % 60).padStart(2, '0')}`;
            row.insertCell().textContent = `${log.earnings.toFixed(2)} CZK`;
            row.insertCell().textContent = log.activity || '';

            // Tlačítko pro smazání
            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.setAttribute('aria-label', 'Smazat záznam');
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                deleteWorkLog(log.id);
            });
            deleteCell.appendChild(deleteButton);
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
        const category = document.getElementById('finance-category') ? document.getElementById('finance-category').value : '';

        if (isNaN(amount)) {
            alert('Neplatná částka.');
            return;
        }

        // Přidat kategorii, pokud je nová
        if (category && !expenseCategories.includes(category) && type === 'expense') {
            expenseCategories.push(category);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            renderCategories();
            populateActivitySelects();
        }

        // Přidat nový záznam
        finances.push({ 
            id: Date.now().toString(),
            type, 
            description, 
            amount, 
            currency, 
            date,
            category
        });
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        financeForm.reset();
        
        // Nastavit dnešní datum
        document.getElementById('finance-date').valueAsDate = new Date();
    });

    // --- Smazání finančního záznamu ---
    const deleteFinance = (id) => {
        const index = finances.findIndex(finance => finance.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento záznam?')) {
                finances.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                renderFinances();
            }
        }
    };

    // --- Vykreslení seznamu financí ---
    const renderFinances = () => {
        financeTableBody.innerHTML = '';
        
        // Seřadit finance od nejnovějších
        const sortedFinances = [...finances].sort((a, b) => {
            // Nejprve podle data
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });
        
        sortedFinances.forEach(finance => {
            const row = financeTableBody.insertRow();
            row.insertCell().textContent = finance.type === 'income' ? 'Příjem' : 'Výdaj';
            row.insertCell().textContent = finance.description;
            row.insertCell().textContent = finance.amount;
            row.insertCell().textContent = finance.currency;
            row.insertCell().textContent = finance.date;
            row.insertCell().textContent = finance.category || '';

            // Tlačítko pro smazání
            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.setAttribute('aria-label', 'Smazat záznam');
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                deleteFinance(finance.id);
            });
            deleteCell.appendChild(deleteButton);
        });
    };

    // --- Naplnění výběru dluhů ---
    const populateDebtSelect = () => {
        const debtSelect = document.getElementById('payment-debt-id');
        if (!debtSelect) return;
        
        debtSelect.innerHTML = '<option value="">-- Vyberte dluh --</option>';
        
        // Získat vybranou osobu
        const selectedPerson = document.getElementById('payment-person').value;
        
        // Přidat pouze dluhy pro vybranou osobu
        const personDebts = debts.filter(debt => debt.person === selectedPerson);
        
        personDebts.forEach(debt => {
            const remaining = debt.amount - (debt.paid || 0);
            if (remaining > 0) {
                const option = document.createElement('option');
                option.value = debt.id;
                option.textContent = `${debt.description}: ${remaining.toFixed(2)} ${debt.currency}`;
                debtSelect.appendChild(option);
            }
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

        // Přidat nový dluh
        debts.push({ 
            id: Date.now().toString(),
            person, 
            description, 
            amount, 
            currency, 
            paid: 0 
        });
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderDebts();
        populateDebtSelect();
        debtForm.reset();
    });

    // Aktualizovat seznam dluhů při změně osoby
    if (document.getElementById('payment-person')) {
        document.getElementById('payment-person').addEventListener('change', populateDebtSelect);
    }

    // Přidání splátky
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('payment-person').value;
        const description = document.getElementById('payment-description').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const currency = document.getElementById('payment-currency').value;
        const debtId = document.getElementById('payment-debt-id') ? document.getElementById('payment-debt-id').value : '';

        if (isNaN(amount)) {
            alert('Neplatná částka splátky.');
            return;
        }

        // Přidat záznam do financí
        finances.push({ 
            id: Date.now().toString(),
            type: 'expense', 
            description: `Splátka dluhu: ${description}`, 
            amount, 
            currency, 
            date: new Date().toISOString().slice(0, 10) 
        });
        
        // Aktualizovat splátku v dluhu
        if (debtId) {
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                debt.paid = (debt.paid || 0) + amount;
            }
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        renderDebts();
        populateDebtSelect();
        paymentForm.reset();
    });

    // --- Smazání dluhu ---
    const deleteDebt = (id) => {
        const index = debts.findIndex(debt => debt.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento dluh?')) {
                debts.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                renderDebts();
                populateDebtSelect();
            }
        }
    };

    // --- Vykreslení seznamu dluhů ---
    const renderDebts = () => {
        debtsListDiv.innerHTML = '';
        
        // Vytvořit objekt seskupený podle osob a měn
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

        // Vykreslit dluhy pro každou osobu a měnu
        for (const person in debtsByPerson) {
            const personDiv = document.createElement('div');
            personDiv.className = 'debt-person';
            personDiv.innerHTML = `<h3>${person === 'maru' ? 'Maru' : 'Marty'}</h3>`;
            
            for (const currency in debtsByPerson[person]) {
                const currencyDiv = document.createElement('div');
                currencyDiv.className = 'debt-currency';
                currencyDiv.innerHTML = `<h4>${currency}</h4><ul class="debts-list"></ul>`;
                const ul = currencyDiv.querySelector('ul');
                
                let totalDebt = 0;
                let totalPaid = 0;
                
                debtsByPerson[person][currency].forEach(debt => {
                    const li = document.createElement('li');
                    li.dataset.id = debt.id;
                    
                    const remaining = debt.amount - (debt.paid || 0);
                    li.innerHTML = `<span>${debt.description}: ${debt.amount} ${debt.currency} (Zbývá: ${remaining.toFixed(2)} ${debt.currency})</span>`;
                    
                    // Tlačítko pro smazání
                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.className = 'delete-btn';
                    deleteButton.setAttribute('aria-label', 'Smazat dluh');
                    deleteButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        deleteDebt(debt.id);
                    });
                    li.appendChild(deleteButton);
                    
                    ul.appendChild(li);
                    totalDebt += debt.amount;
                    totalPaid += (debt.paid || 0);
                });
                
                const totalRemainingDebt = totalDebt - totalPaid;
                const totalLi = document.createElement('li');
                totalLi.className = 'debt-total';
                totalLi.innerHTML = `<strong>Celkem: ${totalDebt.toFixed(2)} ${currency} (Zbývá: ${totalRemainingDebt.toFixed(2)} ${currency})</strong>`;
                ul.appendChild(totalLi);
                
                personDiv.appendChild(currencyDiv);
            }
            
            debtsListDiv.appendChild(personDiv);
        }
    };

    // --- Nastavení ---
    const renderCategories = () => {
        // Kategorie úkolů
        if (taskCategoriesList) {
            taskCategoriesList.innerHTML = '';
            taskCategories.forEach((category, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${category}</span>`;
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat kategorii');
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Opravdu chcete smazat tuto kategorii úkolu?')) {
                        taskCategories.splice(index, 1);
                        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                        renderCategories();
                        populateActivitySelects();
                    }
                });
                li.appendChild(deleteButton);
                
                taskCategoriesList.appendChild(li);
            });
        }

        // Kategorie výdajů
        if (expenseCategoriesList) {
            expenseCategoriesList.innerHTML = '';
            expenseCategories.forEach((category, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${category}</span>`;
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat kategorii');
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Opravdu chcete smazat tuto kategorii výdajů?')) {
                        expenseCategories.splice(index, 1);
                        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                        renderCategories();
                        populateActivitySelects();
                    }
                });
                li.appendChild(deleteButton);
                
                expenseCategoriesList.appendChild(li);
            });
        }
    };

    // Přidání kategorie úkolu
    if (addTaskCategoryButton) {
        addTaskCategoryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const newCategory = newTaskCategoryInput.value.trim();
            if (newCategory) {
                if (!taskCategories.includes(newCategory)) {
                    taskCategories.push(newCategory);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                    renderCategories();
                    populateActivitySelects();
                    newTaskCategoryInput.value = '';
                } else {
                    alert('Tato kategorie úkolu již existuje');
                }
            }
        });
    }

    // Přidání kategorie výdajů
    if (addExpenseCategoryButton) {
        addExpenseCategoryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const newCategory = newExpenseCategoryInput.value.trim();
            if (newCategory) {
                if (!expenseCategories.includes(newCategory)) {
                    expenseCategories.push(newCategory);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                    renderCategories();
                    populateActivitySelects();
                    newExpenseCategoryInput.value = '';
                } else {
                    alert('Tato kategorie výdajů již existuje');
                }
            }
        });
    }

    // Nastavení nájmu
    if (rentSettings.amount && rentAmountInput) {
        rentAmountInput.value = rentSettings.amount;
    }
    if (rentSettings.day && rentDayInput) {
        rentDayInput.value = rentSettings.day;
    }

    if (saveRentSettingsButton) {
        saveRentSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
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
    }

    // --- Export dat ---
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
        
        // Na iOS musíme použít jinou metodu pro stažení
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
            const url = window.URL.createObjectURL(blob);
            window.location.href = url;
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        } else {
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
        }
    };

    if (exportWorkLogsButton) {
        exportWorkLogsButton.addEventListener('click', (e) => {
            e.preventDefault();
            const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)', 'Úkol'];
            const data = workLogs.map(log => [
                log.person === 'maru' ? 'Maru' : 'Marty',
                log.date,
                log.start,
                log.end,
                log.break,
                log.worked,
                log.earnings.toFixed(2),
                log.activity || ''
            ]);
            exportToCSV('work_logs.csv', [header, ...data]);
        });
    }

    if (exportFinanceButton) {
        exportFinanceButton.addEventListener('click', (e) => {
            e.preventDefault();
            const header = ['Typ', 'Popis', 'Částka', 'Měna', 'Datum', 'Kategorie'];
            const data = finances.map(finance => [
                finance.type === 'income' ? 'Příjem' : 'Výdaj',
                finance.description,
                finance.amount,
                finance.currency,
                finance.date,
                finance.category || ''
            ]);
            exportToCSV('finance.csv', [header, ...data]);
        });
    }

    if (exportDebtsButton) {
        exportDebtsButton.addEventListener('click', (e) => {
            e.preventDefault();
            const header = ['Osoba', 'Popis', 'Částka', 'Měna', 'Zaplaceno', 'Zbývá'];
            const data = debts.map(debt => [
                debt.person === 'maru' ? 'Maru' : 'Marty',
                debt.description,
                debt.amount,
                debt.currency,
                debt.paid || 0,
                debt.amount - (debt.paid || 0)
            ]);
            exportToCSV('debts.csv', [header, ...data]);
        });
    }

    // --- Přepínání sekcí ---
    const sections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('header nav ul li a');

    const showSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) {
            sectionToShow.classList.add('active');
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });

        // Aktualizovat URL hash bez přenačtení stránky
        history.pushState(null, null, `#${sectionId}`);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    // --- Detekce změny viditelnosti stránky ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Aktualizovat časovač při návratu na stránku
            updateTimerDisplay();
            
            const timerState = getTimerState();
            if (timerState.isRunning && !timerInterval) {
                // Restartovat interval, pokud má časovač běžet
                timerInterval = setInterval(updateTimerDisplay, 1000);
            }
        }
    });

    // --- Před zavřením okna ---
    window.addEventListener('beforeunload', () => {
        // Uložit stav časovače
        const timerState = getTimerState();
        if (timerState.isRunning) {
            saveTimerState(timerState.startTime, null, true, timerState.person, timerState.activity);
        }
    });

    // --- Detekce offline režimu ---
    const offlineNotification = document.getElementById('offline-notification');
    
    window.addEventListener('online', () => {
        if (offlineNotification) {
            offlineNotification.classList.remove('show');
        }
    });
    
    window.addEventListener('offline', () => {
        if (offlineNotification) {
            offlineNotification.classList.add('show');
            
            setTimeout(() => {
                offlineNotification.classList.remove('show');
            }, 5000);
        }
    });

    // --- Nastavení datumů ve formulářích ---
    ['manual-date', 'finance-date'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.valueAsDate = new Date();
        }
    });

    // --- Oprava touchstart události pro iOS ---
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.querySelectorAll('button, select, input[type="radio"]').forEach(el => {
            el.addEventListener('touchstart', function(e) {
                // Tato prázdná funkce zajistí, že element reaguje na dotyk na iOS
            }, { passive: true });
        });
    }

    // --- Při načtení stránky zobrazit výchozí sekci ---
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        if (document.getElementById(sectionId)) {
            showSection(sectionId);
        } else {
            showSection('vyskazy');
        }
    } else {
        showSection('vyskazy');
    }

    // --- Initial Render ---
    renderWorkLogs();
    renderFinances();
    renderDebts();
    renderCategories();
    populateActivitySelects();
    populateDebtSelect();
    initializeTimer();

    // --- Synchronizace časovače mezi záložkami ---
    window.addEventListener('storage', (event) => {
        if (event.key === 'timerStartTime' || event.key === 'timerPauseTime' || event.key === 'timerIsRunning') {
            // Stav časovače se změnil v jiné záložce, aktualizovat UI
            clearInterval(timerInterval);
            initializeTimer();
        }
    });
});