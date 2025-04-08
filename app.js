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
    const editLogIdInput = document.getElementById('edit-log-id');
    const saveLogButton = document.getElementById('save-log-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const manualActivitySelect = document.getElementById('manual-activity');
    const workLogsTableBody = document.getElementById('work-logs-table');

    const financeForm = document.getElementById('finance-form');
    const editFinanceIdInput = document.getElementById('edit-finance-id');
    const saveFinanceButton = document.getElementById('save-finance-button');
    const cancelFinanceEditButton = document.getElementById('cancel-finance-edit-button');
    const financeTableBody = document.getElementById('finance-table');

    const deductionsSummaryTableBody = document.getElementById('deductions-summary-table');

    const debtForm = document.getElementById('debt-form');
    const editDebtIdInput = document.getElementById('edit-debt-id');
    const saveDebtButton = document.getElementById('save-debt-button');
    const cancelDebtEditButton = document.getElementById('cancel-debt-edit-button');
    const debtsListDiv = document.getElementById('debts-list');

    const paymentForm = document.getElementById('payment-form');
    const editPaymentIdInput = document.getElementById('edit-payment-id');
    const savePaymentButton = document.getElementById('save-payment-button');
    const cancelPaymentEditButton = document.getElementById('cancel-payment-edit-button');

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
    const exportDeductionsButton = document.getElementById('export-deductions');
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

    // Srážky - konstanty
    const deductionRates = {
        maru: 1/3, // 33.33%
        marty: 0.5  // 50%
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

    // Výpočet srážky
    const calculateDeduction = (earnings, person) => {
        return earnings * deductionRates[person];
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
            
            const earnings = (durationInMinutes / 60) * hourlyRates[currentPerson];
            const deduction = calculateDeduction(earnings, currentPerson);

            workLogs.push({
                id: Date.now().toString(),
                person: currentPerson,
                date: dateString,
                start: `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`,
                end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
                break: 0,
                worked: durationInMinutes,
                earnings: earnings,
                deduction: deduction,
                activity: currentActivity
            });
            
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            
            // Resetovat stav časovače
            saveTimerState(null, null, false, currentPerson, currentActivity);
            
            renderWorkLogs();
            renderDeductionsSummary();
            
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

        const earnings = (durationInMinutes / 60) * hourlyRates[person];
        const deduction = calculateDeduction(earnings, person);

        const editId = editLogIdInput.value;
        
        if (editId) {
            // Editace existujícího záznamu
            const logIndex = workLogs.findIndex(log => log.id === editId);
            if (logIndex !== -1) {
                workLogs[logIndex] = {
                    ...workLogs[logIndex],
                    person,
                    date,
                    start: startTimeStr,
                    end: endTimeStr,
                    break: breakTime,
                    worked: durationInMinutes,
                    earnings: earnings,
                    deduction: deduction,
                    activity
                };
            }
            
            // Resetovat formulář pro přidání nového záznamu
            saveLogButton.textContent = 'Přidat výkaz';
            cancelEditButton.style.display = 'none';
            editLogIdInput.value = '';
        } else {
            // Přidat nový záznam
            workLogs.push({
                id: Date.now().toString(),
                person,
                date,
                start: startTimeStr,
                end: endTimeStr,
                break: breakTime,
                worked: durationInMinutes,
                earnings: earnings,
                deduction: deduction,
                activity
            });
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderWorkLogs();
        renderDeductionsSummary();
        manualEntryForm.reset();
        
        // Nastavit dnešní datum
        document.getElementById('manual-date').valueAsDate = new Date();
    });

    // Zrušení editace výkazu
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', (e) => {
            e.preventDefault();
            saveLogButton.textContent = 'Přidat výkaz';
            cancelEditButton.style.display = 'none';
            editLogIdInput.value = '';
            manualEntryForm.reset();
            document.getElementById('manual-date').valueAsDate = new Date();
        });
    }

    // --- Editace výkazu ---
    const editWorkLog = (id) => {
        const log = workLogs.find(log => log.id === id);
        if (!log) return;
        
        // Naplnit formulář daty
        document.getElementById('manual-person').value = log.person;
        document.getElementById('manual-date').value = log.date;
        document.getElementById('manual-start-time').value = log.start;
        document.getElementById('manual-end-time').value = log.end;
        document.getElementById('manual-break-time').value = log.break;
        
        // Nastavit aktivitu, pokud existuje
        if (manualActivitySelect && log.activity) {
            for (let i = 0; i < manualActivitySelect.options.length; i++) {
                if (manualActivitySelect.options[i].value === log.activity) {
                    manualActivitySelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // Nastavit ID editovaného záznamu a změnit text tlačítka
        editLogIdInput.value = id;
        saveLogButton.textContent = 'Uložit změny';
        cancelEditButton.style.display = 'block';
        
        // Přeskrolovat na formulář
        manualEntryForm.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Smazání výkazu ---
    const deleteWorkLog = (id) => {
        const index = workLogs.findIndex(log => log.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento záznam?')) {
                workLogs.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                renderWorkLogs();
                renderDeductionsSummary();
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
            
            // Přidat sloupec srážek - pokud neexistuje, přidat výchozí hodnotu
            const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
            row.insertCell().textContent = `${deduction.toFixed(2)} CZK`;
            
            row.insertCell().textContent = log.activity || '';

            // Tlačítka pro akce
            const actionsCell = row.insertCell();
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'action-buttons';
            
            // Tlačítko pro editaci
            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.className = 'edit-btn';
            editButton.setAttribute('aria-label', 'Upravit záznam');
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                editWorkLog(log.id);
            });
            
            // Tlačítko pro smazání
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.setAttribute('aria-label', 'Smazat záznam');
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                deleteWorkLog(log.id);
            });
            
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);
            actionsCell.appendChild(actionsDiv);
        });
    };

    // --- Vykreslení přehledu srážek ---
    const renderDeductionsSummary = () => {
        if (!deductionsSummaryTableBody) return;
        
        deductionsSummaryTableBody.innerHTML = '';
        
        // Seskupit data podle osoby a měsíce
        const deductionsByPersonMonth = {};
        
        workLogs.forEach(log => {
            const date = new Date(log.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const key = `${log.person}-${yearMonth}`;
            
            if (!deductionsByPersonMonth[key]) {
                deductionsByPersonMonth[key] = {
                    person: log.person,
                    yearMonth: yearMonth,
                    monthName: new Date(log.date).toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }),
                    totalWorked: 0,
                    totalEarnings: 0,
                    totalDeduction: 0
                };
            }
            
            deductionsByPersonMonth[key].totalWorked += log.worked;
            deductionsByPersonMonth[key].totalEarnings += log.earnings;
            
            // Použít uloženou hodnotu srážky, nebo ji vypočítat
            const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
            deductionsByPersonMonth[key].totalDeduction += deduction;
        });
        
        // Zobrazit přehled srážek podle měsíců
        Object.values(deductionsByPersonMonth)
            .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)) // Nejnovější první
            .forEach(summary => {
                const row = deductionsSummaryTableBody.insertRow();
                row.insertCell().textContent = summary.person === 'maru' ? 'Maru' : 'Marty';
                row.insertCell().textContent = summary.monthName;
                
                const hoursWorked = Math.floor(summary.totalWorked / 60);
                const minutesWorked = summary.totalWorked % 60;
                row.insertCell().textContent = `${hoursWorked}:${String(minutesWorked).padStart(2, '0')}`;
                
                row.insertCell().textContent = `${summary.totalEarnings.toFixed(2)} CZK`;
                row.insertCell().textContent = `${summary.totalDeduction.toFixed(2)} CZK`;
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

        const editId = editFinanceIdInput.value;
        
        if (editId) {
            // Editace existujícího záznamu
            const financeIndex = finances.findIndex(finance => finance.id === editId);
            if (financeIndex !== -1) {
                finances[financeIndex] = {
                    ...finances[financeIndex],
                    type,
                    description,
                    amount,
                    currency,
                    date,
                    category
                };
            }
            
            // Resetovat formulář pro přidání nového záznamu
            saveFinanceButton.textContent = 'Přidat';
            cancelFinanceEditButton.style.display = 'none';
            editFinanceIdInput.value = '';
        } else {
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
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        financeForm.reset();
        
        // Nastavit dnešní datum
        document.getElementById('finance-date').valueAsDate = new Date();
    });

    // Zrušení editace finance
    if (cancelFinanceEditButton) {
        cancelFinanceEditButton.addEventListener('click', (e) => {
            e.preventDefault();
            saveFinanceButton.textContent = 'Přidat';
            cancelFinanceEditButton.style.display = 'none';
            editFinanceIdInput.value = '';
            financeForm.reset();
            document.getElementById('finance-date').valueAsDate = new Date();
        });
    }

    // --- Editace finance ---
    const editFinance = (id) => {
        const finance = finances.find(finance => finance.id === id);
        if (!finance) return;
        
        // Naplnit formulář daty
        document.getElementById('finance-type').value = finance.type;
        document.getElementById('finance-description').value = finance.description;
        document.getElementById('finance-amount').value = finance.amount;
        document.getElementById('finance-currency').value = finance.currency;
        document.getElementById('finance-date').value = finance.date;
        
        // Nastavit kategorii, pokud existuje
        const financeCategorySelect = document.getElementById('finance-category');
        if (financeCategorySelect && finance.category) {
            for (let i = 0; i < financeCategorySelect.options.length; i++) {
                if (financeCategorySelect.options[i].value === finance.category) {
                    financeCategorySelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        // Nastavit ID editovaného záznamu a změnit text tlačítka
        editFinanceIdInput.value = id;
        saveFinanceButton.textContent = 'Uložit změny';
        cancelFinanceEditButton.style.display = 'block';
        
        // Přeskrolovat na formulář
        financeForm.scrollIntoView({ behavior: 'smooth' });
    };

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

            // Tlačítka pro akce
            const actionsCell = row.insertCell();
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'action-buttons';
            
            // Tlačítko pro editaci
            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.className = 'edit-btn';
            editButton.setAttribute('aria-label', 'Upravit záznam');
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                editFinance(finance.id);
            });
            
            // Tlačítko pro smazání
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.setAttribute('aria-label', 'Smazat záznam');
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                deleteFinance(finance.id);
            });
            
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);
            actionsCell.appendChild(actionsDiv);
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

        const editId = editDebtIdInput.value;
        
        if (editId) {
            // Editace existujícího záznamu
            const debtIndex = debts.findIndex(debt => debt.id === editId);
            if (debtIndex !== -1) {
                debts[debtIndex] = {
                    ...debts[debtIndex],
                    person,
                    description,
                    amount,
                    currency
                };
            }
            
            // Resetovat formulář pro přidání nového záznamu
            saveDebtButton.textContent = 'Přidat dluh';
            cancelDebtEditButton.style.display = 'none';
            editDebtIdInput.value = '';
        } else {
            // Přidat nový dluh
            debts.push({ 
                id: Date.now().toString(),
                person, 
                description, 
                amount, 
                currency, 
                paid: 0 
            });
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderDebts();
        populateDebtSelect();
        debtForm.reset();
    });

    // Zrušení editace dluhu
    if (cancelDebtEditButton) {
        cancelDebtEditButton.addEventListener('click', (e) => {
            e.preventDefault();
            saveDebtButton.textContent = 'Přidat dluh';
            cancelDebtEditButton.style.display = 'none';
            editDebtIdInput.value = '';
            debtForm.reset();
        });
    }

    // --- Editace dluhu ---
    const editDebt = (id) => {
        const debt = debts.find(debt => debt.id === id);
        if (!debt) return;
        
        // Naplnit formulář daty
        document.getElementById('debt-person').value = debt.person;
        document.getElementById('debt-description').value = debt.description;
        document.getElementById('debt-amount').value = debt.amount;
        document.getElementById('debt-currency').value = debt.currency;
        
        // Nastavit ID editovaného záznamu a změnit text tlačítka
        editDebtIdInput.value = id;
        saveDebtButton.textContent = 'Uložit změny';
        cancelDebtEditButton.style.display = 'block';
        
        // Přeskrolovat na formulář
        debtForm.scrollIntoView({ behavior: 'smooth' });
    };

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

        const editId = editPaymentIdInput.value;
        let oldDebtId = '';
        let oldAmount = 0;
        
        if (editId) {
            // Editace existující splátky - najít původní záznam
            const paymentIndex = finances.findIndex(f => f.id === editId);
            if (paymentIndex !== -1) {
                // Uložit původní hodnoty pro aktualizaci dluhu
                oldDebtId = finances[paymentIndex].debtId;
                oldAmount = finances[paymentIndex].amount;
                
                // Pokud se mění dluh, odečíst splátku od původního dluhu
                if (oldDebtId && oldDebtId !== debtId) {
                    const oldDebt = debts.find(d => d.id === oldDebtId);
                    if (oldDebt) {
                        oldDebt.paid = Math.max(0, (oldDebt.paid || 0) - oldAmount);
                    }
                }
                
                // Aktualizovat záznam splátky
                finances[paymentIndex] = {
                    ...finances[paymentIndex],
                    description,
                    amount,
                    currency,
                    debtId: debtId
                };
            }
            
            // Resetovat formulář pro přidání nové splátky
            savePaymentButton.textContent = 'Přidat splátku';
            cancelPaymentEditButton.style.display = 'none';
            editPaymentIdInput.value = '';
        } else {
            // Přidat nový záznam do financí
            finances.push({ 
                id: Date.now().toString(),
                type: 'expense', 
                description: `Splátka dluhu: ${description}`, 
                amount, 
                currency, 
                date: new Date().toISOString().slice(0, 10),
                debtId: debtId
            });
        }
        
        // Aktualizovat splátku v dluhu
        if (debtId) {
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                // Pokud jde o editaci, přidat jen rozdíl ve splátce
                if (editId && oldDebtId === debtId) {
                    debt.paid = (debt.paid || 0) - oldAmount + amount;
                } else {
                    debt.paid = (debt.paid || 0) + amount;
                }
            }
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderFinances();
        renderDebts();
        populateDebtSelect();
        paymentForm.reset();
    });

    // Zrušení editace splátky
    if (cancelPaymentEditButton) {
        cancelPaymentEditButton.addEventListener('click', (e) => {
            e.preventDefault();
            savePaymentButton.textContent = 'Přidat splátku';
            cancelPaymentEditButton.style.display = 'none';
            editPaymentIdInput.value = '';
            paymentForm.reset();
        });
    }

    // --- Editace splátky ---
    const editPayment = (id) => {
        const payment = finances.find(f => f.id === id && f.type === 'expense' && f.description.startsWith('Splátka dluhu:'));
        if (!payment) return;
        
        // Naplnit formulář daty
        document.getElementById('payment-person').value = payment.person || 'maru'; // Výchozí hodnota, pokud není nastaveno
        document.getElementById('payment-description').value = payment.description.replace('Splátka dluhu: ', '');
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-currency').value = payment.currency;
        
        // Aktualizovat seznam dluhů a vybrat správný dluh
        populateDebtSelect();
        if (payment.debtId) {
            const debtSelect = document.getElementById('payment-debt-id');
            if (debtSelect) {
                setTimeout(() => { // Dát čas na aktualizaci seznamu
                    for (let i = 0; i < debtSelect.options.length; i++) {
                        if (debtSelect.options[i].value === payment.debtId) {
                            debtSelect.selectedIndex = i;
                            break;
                        }
                    }
                }, 100);
            }
        }
        
        // Nastavit ID editovaného záznamu a změnit text tlačítka
        editPaymentIdInput.value = id;
        savePaymentButton.textContent = 'Uložit změny';
        cancelPaymentEditButton.style.display = 'block';
        
        // Přeskrolovat na formulář
        paymentForm.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Smazání dluhu ---
    const deleteDebt = (id) => {
        const index = debts.findIndex(debt => debt.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento dluh?')) {
                // Také smazat splátky tohoto dluhu
                const paymentsToRemove = finances.filter(f => f.debtId === id);
                if (paymentsToRemove.length > 0 && !confirm(`Tento dluh má ${paymentsToRemove.length} splátk${paymentsToRemove.length > 1 ? 'y' : 'u'}. Opravdu chcete smazat dluh i všechny jeho splátky?`)) {
                    return;
                }
                
                // Smazat dluh
                debts.splice(index, 1);
                
                // Smazat splátky tohoto dluhu
                finances = finances.filter(f => f.debtId !== id);
                
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
                renderDebts();
                renderFinances();
                populateDebtSelect();
            }
        }
    };

    // --- Vykreslení seznamu dluhů ---
    const renderDebts = () => {
        debtsListDiv.innerHTML = '';
        
        // Seskupit dluhy podle měny (bez rozdělení na osoby)
        const debtsByCurrency = {};
        
        debts.forEach(debt => {
            if (!debtsByCurrency[debt.currency]) {
                debtsByCurrency[debt.currency] = [];
            }
            debtsByCurrency[debt.currency].push(debt);
        });

        // Vykreslit dluhy pro každou měnu
        for (const currency in debtsByCurrency) {
            const currencyDiv = document.createElement('div');
            currencyDiv.className = 'debt-currency';
            currencyDiv.innerHTML = `<h4>${currency}</h4><ul class="debts-list"></ul>`;
            const ul = currencyDiv.querySelector('ul');
            
            let totalDebt = 0;
            let totalPaid = 0;
            
            debtsByCurrency[currency].forEach(debt => {
                const li = document.createElement('li');
                li.dataset.id = debt.id;
                
                const remaining = debt.amount - (debt.paid || 0);
                const personName = debt.person === 'maru' ? 'Maru' : 'Marty';
                li.innerHTML = `<span>${personName}: ${debt.description}: ${debt.amount} ${debt.currency} (Zbývá: ${remaining.toFixed(2)} ${debt.currency})</span>`;
                
                // Tlačítka pro akce
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'action-buttons';
                
                // Tlačítko pro editaci
                const editButton = document.createElement('button');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.className = 'edit-btn';
                editButton.setAttribute('aria-label', 'Upravit dluh');
                editButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    editDebt(debt.id);
                });
                
                // Tlačítko pro smazání
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.setAttribute('aria-label', 'Smazat dluh');
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    deleteDebt(debt.id);
                });
                
                actionsDiv.appendChild(editButton);
                actionsDiv.appendChild(deleteButton);
                li.appendChild(actionsDiv);
                
                ul.appendChild(li);
                totalDebt += debt.amount;
                totalPaid += (debt.paid || 0);
            });
            
            const totalRemainingDebt = totalDebt - totalPaid;
            const totalLi = document.createElement('li');
            totalLi.className = 'debt-total';
            totalLi.innerHTML = `<strong>Celkem: ${totalDebt.toFixed(2)} ${currency} (Zbývá: ${totalRemainingDebt.toFixed(2)} ${currency})</strong>`;
            ul.appendChild(totalLi);
            
            debtsListDiv.appendChild(currencyDiv);
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
        // Pro Apple Numbers - BOM (Byte Order Mark) na začátku
        const bom = "\uFEFF";
        
        const processRow = function (row) {
            const finalVal = [];
            for (let j = 0; j < row.length; j++) {
                let innerValue = row[j] === null ? '' : row[j].toString();
                if (row[j] instanceof Date) {
                    innerValue = row[j].toLocaleString('cs-CZ');
                };
                let result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                finalVal.push(result);
            }
            return finalVal.join(',');
        };

        let csvFile = bom; // Přidat BOM na začátek pro lepší kompatibilitu
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
            const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)', 'Srážka (CZK)', 'Úkol'];
            const data = workLogs.map(log => {
                const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
                return [
                    log.person === 'maru' ? 'Maru' : 'Marty',
                    log.date,
                    log.start,
                    log.end,
                    log.break,
                    log.worked,
                    log.earnings.toFixed(2),
                    deduction.toFixed(2),
                    log.activity || ''
                ];
            });
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

    if (exportDeductionsButton) {
        exportDeductionsButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Příprava dat pro export
            const deductionsByPersonMonth = {};
        
            workLogs.forEach(log => {
                const date = new Date(log.date);
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const key = `${log.person}-${yearMonth}`;
                
                if (!deductionsByPersonMonth[key]) {
                    deductionsByPersonMonth[key] = {
                        person: log.person,
                        yearMonth: yearMonth,
                        monthName: new Date(log.date).toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }),
                        totalWorked: 0,
                        totalEarnings: 0,
                        totalDeduction: 0
                    };
                }
                
                deductionsByPersonMonth[key].totalWorked += log.worked;
                deductionsByPersonMonth[key].totalEarnings += log.earnings;
                
                const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
                deductionsByPersonMonth[key].totalDeduction += deduction;
            });
            
            const header = ['Osoba', 'Měsíc', 'Celkem odpracováno (min)', 'Celkový výdělek (CZK)', 'Srážka (CZK)'];
            const data = Object.values(deductionsByPersonMonth)
                .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
                .map(summary => [
                    summary.person === 'maru' ? 'Maru' : 'Marty',
                    summary.monthName,
                    summary.totalWorked,
                    summary.totalEarnings.toFixed(2),
                    summary.totalDeduction.toFixed(2)
                ]);
                
            exportToCSV('deductions.csv', [header, ...data]);
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
    renderDeductionsSummary();
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