document.addEventListener('DOMContentLoaded', () => {
    const timerTimeDisplay = document.getElementById('timer-time');
    const timerStartButton = document.getElementById('timer-start');
    const timerPauseButton = document.getElementById('timer-pause');
    const timerStopButton = document.getElementById('timer-stop');
    const timerPersonDisplay = document.getElementById('timer-person');
    const timerActivitySelect = document.getElementById('timer-activity');
    const timerActivityDisplay = document.getElementById('timer-activity-display');

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
    let isRunning = false;
    let currentPerson = localStorage.getItem('currentTimerPerson') || 'maru'; // Default person for timer
    let currentActivity = localStorage.getItem('currentTimerActivity') || ''; // Current activity being tracked

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
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        return { workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities };
    };

    const saveData = (data) => {
        localStorage.setItem('workLogs', JSON.stringify(data.workLogs));
        localStorage.setItem('finances', JSON.stringify(data.finances));
        localStorage.setItem('debts', JSON.stringify(data.debts));
        localStorage.setItem('rentSettings', JSON.stringify(data.rentSettings));
        localStorage.setItem('taskCategories', JSON.stringify(data.taskCategories));
        localStorage.setItem('expenseCategories', JSON.stringify(data.expenseCategories));
        localStorage.setItem('activities', JSON.stringify(data.activities));
    };

    let { workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities } = loadData();

    // --- Persistent Timer ---
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
        timerActivityDisplay.textContent = timerState.activity;
    };

    const initializeTimer = () => {
        const timerState = getTimerState();
        isRunning = timerState.isRunning;
        currentPerson = timerState.person;
        currentActivity = timerState.activity;

        // Update the UI based on stored state
        document.querySelector(`#timer-person-select input[value="${currentPerson}"]`).checked = true;
        if (timerActivitySelect) {
            populateActivitySelect();
            // Try to set the selected activity if it exists in the list
            const activityOption = Array.from(timerActivitySelect.options).find(option => option.value === currentActivity);
            if (activityOption) {
                activityOption.selected = true;
            }
        }

        updateTimerDisplay();

        if (isRunning) {
            timerStartButton.disabled = true;
            timerPauseButton.disabled = false;
            timerStopButton.disabled = false;
            
            // Restart the interval for the running timer
            timerInterval = setInterval(updateTimerDisplay, 1000);
        } else {
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
            timerStopButton.disabled = timerState.startTime ? false : true;
        }
    };

    const startTimer = () => {
        const timerState = getTimerState();
        
        if (!isRunning) {
            isRunning = true;
            
            let startTime;
            if (timerState.startTime && timerState.pauseTime) {
                // Resume from pause - adjust the start time to account for the pause
                const pauseDuration = Date.now() - timerState.pauseTime;
                startTime = timerState.startTime + pauseDuration;
            } else {
                // New timer
                startTime = Date.now();
                currentActivity = timerActivitySelect ? timerActivitySelect.value : '';
                
                // Save the activity if it's new and not empty
                if (currentActivity && !activities.includes(currentActivity)) {
                    activities.push(currentActivity);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                    populateActivitySelect();
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

    const stopTimer = () => {
        const timerState = getTimerState();
        
        if (timerState.startTime) {
            isRunning = false;
            clearInterval(timerInterval);
            
            let runningTime;
            if (isRunning) {
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
                id: Date.now().toString(), // Unique ID for deletion
                person: currentPerson,
                date: dateString,
                start: `${String(startTimeObj.getHours()).padStart(2, '0')}:${String(startTimeObj.getMinutes()).padStart(2, '0')}`,
                end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
                break: 0,
                worked: durationInMinutes,
                earnings: (durationInMinutes / 60) * hourlyRates[currentPerson],
                activity: currentActivity
            });
            
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
            
            // Clear timer state
            saveTimerState(null, null, false, currentPerson, currentActivity);
            
            renderWorkLogs();
            
            timerStartButton.disabled = false;
            timerPauseButton.disabled = true;
            timerStopButton.disabled = true;
            
            updateTimerDisplay();
        }
    };

    timerStartButton.addEventListener('click', startTimer);
    timerPauseButton.addEventListener('click', pauseTimer);
    timerStopButton.addEventListener('click', stopTimer);

    document.querySelectorAll('#timer-person-select input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentPerson = event.target.value;
            localStorage.setItem('currentTimerPerson', currentPerson);
        });
    });

    // Populate activity dropdown from saved activities
    const populateActivitySelect = () => {
        if (!timerActivitySelect) return;
        
        // Save the current selection if any
        const currentSelection = timerActivitySelect.value;
        
        // Clear current options except the first empty one
        while (timerActivitySelect.options.length > 1) {
            timerActivitySelect.remove(1);
        }
        
        // Add saved activities
        activities.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = activity;
            timerActivitySelect.appendChild(option);
        });
        
        // Restore selection if it exists
        if (currentSelection && Array.from(timerActivitySelect.options).some(option => option.value === currentSelection)) {
            timerActivitySelect.value = currentSelection;
        }
    };

    if (timerActivitySelect) {
        timerActivitySelect.addEventListener('change', (e) => {
            currentActivity = e.target.value;
            localStorage.setItem('currentTimerActivity', currentActivity);
        });
    }

    // --- Manual Work Log Entry ---
    manualEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('manual-person').value;
        const date = document.getElementById('manual-date').value;
        const startTimeStr = document.getElementById('manual-start-time').value;
        const endTimeStr = document.getElementById('manual-end-time').value;
        const breakTime = parseInt(document.getElementById('manual-break-time').value) || 0;
        const activity = document.getElementById('manual-activity') ? document.getElementById('manual-activity').value : '';

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

        // Save activity if it's new and not empty
        if (activity && !activities.includes(activity)) {
            activities.push(activity);
        }

        workLogs.push({
            id: Date.now().toString(), // Unique ID for deletion
            person,
            date,
            start: startTimeStr,
            end: endTimeStr,
            break: breakTime,
            worked: durationInMinutes,
            earnings: (durationInMinutes / 60) * hourlyRates[person],
            activity
        });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
        renderWorkLogs();
        manualEntryForm.reset();
        populateActivitySelect(); // Update activity dropdown in case a new one was added
    });

    // Function to delete a work log
    const deleteWorkLog = (id) => {
        const index = workLogs.findIndex(log => log.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento záznam?')) {
                workLogs.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                renderWorkLogs();
            }
        }
    };

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
            
            // Add activity column if not already existing
            const activityCell = row.insertCell();
            activityCell.textContent = log.activity || '';

            // Add delete button
            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => deleteWorkLog(log.id));
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

        finances.push({ 
            id: Date.now().toString(), // Unique ID for deletion
            type, 
            description, 
            amount, 
            currency, 
            date,
            category
        });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
        renderFinances();
        financeForm.reset();
    });

    // Function to delete a finance record
    const deleteFinance = (id) => {
        const index = finances.findIndex(finance => finance.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento záznam?')) {
                finances.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                renderFinances();
            }
        }
    };

    const renderFinances = () => {
        financeTableBody.innerHTML = '';
        finances.forEach(finance => {
            const row = financeTableBody.insertRow();
            row.insertCell().textContent = finance.type === 'income' ? 'Příjem' : 'Výdaj';
            row.insertCell().textContent = finance.description;
            row.insertCell().textContent = finance.amount;
            row.insertCell().textContent = finance.currency;
            row.insertCell().textContent = finance.date;
            
            // Add category column if not already existing
            const categoryCell = row.insertCell();
            categoryCell.textContent = finance.category || '';

            // Add delete button
            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => deleteFinance(finance.id));
            deleteCell.appendChild(deleteButton);
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

        debts.push({ 
            id: Date.now().toString(), // Unique ID for deletion
            person, 
            description, 
            amount, 
            currency, 
            paid: 0 
        });
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
        renderDebts();
        debtForm.reset();
    });

    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const person = document.getElementById('payment-person').value;
        const description = document.getElementById('payment-description').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const currency = document.getElementById('payment-currency').value;
        const debtId = document.getElementById('payment-debt-id') ? document.getElementById('payment-debt-id').value : null;

        if (isNaN(amount)) {
            alert('Neplatná částka splátky.');
            return;
        }

        // For simplicity, we'll just add a finance record for the payment
        finances.push({ 
            id: Date.now().toString(),
            type: 'expense', 
            description: `Splátka dluhu: ${description}`, 
            amount, 
            currency, 
            date: new Date().toISOString().slice(0, 10) 
        });
        
        // If a debt ID was specified, update the debt's paid amount
        if (debtId) {
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                debt.paid = (debt.paid || 0) + amount;
            }
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
        renderFinances();
        renderDebts(); // Update debts overview after payment
        paymentForm.reset();
    });

    // Function to delete a debt
    const deleteDebt = (id) => {
        const index = debts.findIndex(debt => debt.id === id);
        if (index !== -1) {
            if (confirm('Opravdu chcete smazat tento dluh?')) {
                debts.splice(index, 1);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                renderDebts();
            }
        }
    };

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
                currencyDiv.innerHTML = `<h4>${currency}</h4><ul class="debts-list"></ul>`;
                const ul = currencyDiv.querySelector('ul');
                let totalDebt = 0;
                let totalPaid = 0;
                
                debtsByPerson[person][currency].forEach(debt => {
                    const li = document.createElement('li');
                    li.dataset.id = debt.id;
                    const remaining = debt.amount - (debt.paid || 0);
                    li.textContent = `${debt.description}: ${debt.amount} ${debt.currency} (Zbývá: ${remaining.toFixed(2)} ${debt.currency})`;
                    
                    // Add delete button for each debt
                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.className = 'delete-btn';
                    deleteButton.addEventListener('click', () => deleteDebt(debt.id));
                    li.appendChild(deleteButton);
                    
                    ul.appendChild(li);
                    totalDebt += debt.amount;
                    totalPaid += (debt.paid || 0);
                });
                
                const totalRemainingDebt = totalDebt - totalPaid;
                const totalLi = document.createElement('li');
                totalLi.innerHTML = `<strong>Celkem: ${totalDebt.toFixed(2)} ${currency} (Zbývá: ${totalRemainingDebt.toFixed(2)} ${currency})</strong>`;
                ul.appendChild(totalLi);
                personDiv.appendChild(currencyDiv);
            }
            debtsListDiv.appendChild(personDiv);
        }
    };

    // --- Nastavení ---
    const renderCategories = () => {
        // Task categories
        taskCategoriesList.innerHTML = '';
        taskCategories.forEach((category, index) => {
            const li = document.createElement('li');
            li.textContent = category;
            
            // Add delete button for each category
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => {
                if (confirm('Opravdu chcete smazat tuto kategorii?')) {
                    taskCategories.splice(index, 1);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                    renderCategories();
                }
            });
            li.appendChild(deleteButton);
            
            taskCategoriesList.appendChild(li);
        });

        // Expense categories
        expenseCategoriesList.innerHTML = '';
        expenseCategories.forEach((category, index) => {
            const li = document.createElement('li');
            li.textContent = category;
            
            // Add delete button for each category
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => {
                if (confirm('Opravdu chcete smazat tuto kategorii?')) {
                    expenseCategories.splice(index, 1);
                    saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                    renderCategories();
                }
            });
            li.appendChild(deleteButton);
            
            expenseCategoriesList.appendChild(li);
        });

        // Activities (for timer)
        const activitiesList = document.getElementById('activities-list');
        if (activitiesList) {
            activitiesList.innerHTML = '';
            activities.forEach((activity, index) => {
                const li = document.createElement('li');
                li.textContent = activity;
                
                // Add delete button for each activity
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.className = 'delete-btn';
                deleteButton.addEventListener('click', () => {
                    if (confirm('Opravdu chcete smazat tuto činnost?')) {
                        activities.splice(index, 1);
                        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                        renderCategories();
                        populateActivitySelect();
                    }
                });
                li.appendChild(deleteButton);
                
                activitiesList.appendChild(li);
            });
        }
    };

    addTaskCategoryButton.addEventListener('click', () => {
        const newCategory = newTaskCategoryInput.value.trim();
        if (newCategory) {
            taskCategories.push(newCategory);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
            renderCategories();
            newTaskCategoryInput.value = '';
        }
    });

    addExpenseCategoryButton.addEventListener('click', () => {
        const newCategory = newExpenseCategoryInput.value.trim();
        if (newCategory) {
            expenseCategories.push(newCategory);
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
            renderCategories();
            newExpenseCategoryInput.value = '';
        }
    });

    // Add activity button handler
    const addActivityButton = document.getElementById('add-activity');
    const newActivityInput = document.getElementById('new-activity');
    
    if (addActivityButton && newActivityInput) {
        addActivityButton.addEventListener('click', () => {
            const newActivity = newActivityInput.value.trim();
            if (newActivity) {
                activities.push(newActivity);
                saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
                renderCategories();
                populateActivitySelect();
                newActivityInput.value = '';
            }
        });
    }

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
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories, activities });
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
        const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)', 'Činnost'];
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

    exportFinanceButton.addEventListener('click', () => {
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

    exportDebtsButton.addEventListener('click', () => {
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

    const sections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('header nav ul li a');

    // --- Přepínání sekcí ---
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

        // Update URL hash without triggering a page reload
        history.pushState(null, null, `#${sectionId}`);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Window visibility change handling for timer
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Update the timer display when the page becomes visible again
            updateTimerDisplay();
            
            const timerState = getTimerState();
            if (timerState.isRunning && !timerInterval) {
                // Restart the interval if the timer should be running
                timerInterval = setInterval(updateTimerDisplay, 1000);
            }
        }
    });

    // Handle browser window unload
    window.addEventListener('beforeunload', () => {
        // Make sure the timer state is saved
        const timerState = getTimerState();
        if (timerState.isRunning) {
            // Timer is running, save the current state
            saveTimerState(timerState.startTime, null, true, timerState.person, timerState.activity);
        }
    });

    // Při načtení stránky zobrazit výchozí sekci
    if (window.location.hash) {
        showSection(window.location.hash.substring(1));
    } else {
        showSection('vyskazy'); // Zobrazit výkazy jako výchozí
    }

    // --- Initial Render ---
    renderWorkLogs();
    renderFinances();
    renderDebts();
    renderCategories();
    populateActivitySelect();
    initializeTimer();

    // Synchronize the timer across browser tabs/windows
    window.addEventListener('storage', (event) => {
        if (event.key === 'timerStartTime' || event.key === 'timerPauseTime' || event.key === 'timerIsRunning') {
            // Timer state changed in another tab, update the UI
            clearInterval(timerInterval);
            initializeTimer();
        }
    });
});