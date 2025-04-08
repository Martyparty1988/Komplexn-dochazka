
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM elementy ---
    
    // Časovač
    const timerTimeDisplay = document.getElementById('timer-time');
    const timerStartButton = document.getElementById('timer-start');
    const timerPauseButton = document.getElementById('timer-pause');
    const timerStopButton = document.getElementById('timer-stop');
    const timerPersonDisplay = document.getElementById('timer-person');
    const timerActivitySelect = document.getElementById('timer-activity');
    const timerActivityDisplay = document.getElementById('timer-activity-display');
    const timerNoteInput = document.getElementById('timer-note-input');
    
    // Hlavičkový časovač
    const headerTimer = document.getElementById('header-timer');
    const headerTimerTime = document.getElementById('header-timer-time');
    const headerTimerPerson = document.getElementById('header-timer-person');
    const headerTimerActivity = document.getElementById('header-timer-activity');

    // Formuláře
    const manualEntryForm = document.getElementById('manual-entry-form');
    const editLogIdInput = document.getElementById('edit-log-id');
    const saveLogButton = document.getElementById('save-log-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const manualActivitySelect = document.getElementById('manual-activity');
    const manualNoteInput = document.getElementById('manual-note');
    
    const financeForm = document.getElementById('finance-form');
    const editFinanceIdInput = document.getElementById('edit-finance-id');
    const saveFinanceButton = document.getElementById('save-finance-button');
    const cancelFinanceEditButton = document.getElementById('cancel-finance-edit-button');
    
    // Tabulky a přehledy
    const workLogsTableBody = document.getElementById('work-logs-table');
    const financeTableBody = document.getElementById('finance-table');
    const deductionsSummaryTableBody = document.getElementById('deductions-summary-table');
    const chartArea = document.getElementById('chart-area');
    const accordionContainer = document.getElementById('work-logs-accordion');
    
    // Filtry
    const filtersForm = document.getElementById('filters-form');
    const filterPerson = document.getElementById('filter-person');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterActivity = document.getElementById('filter-activity');
    const applyFiltersButton = document.getElementById('apply-filters');
    const resetFiltersButton = document.getElementById('reset-filters');
    
    // Dluhy
    const debtForm = document.getElementById('debt-form');
    const editDebtIdInput = document.getElementById('edit-debt-id');
    const saveDebtButton = document.getElementById('save-debt-button');
    const cancelDebtEditButton = document.getElementById('cancel-debt-edit-button');
    const debtsListDiv = document.getElementById('debts-list');
    
    // Splátky
    const paymentForm = document.getElementById('payment-form');
    const editPaymentIdInput = document.getElementById('edit-payment-id');
    const savePaymentButton = document.getElementById('save-payment-button');
    const cancelPaymentEditButton = document.getElementById('cancel-payment-edit-button');
    
    // Nastavení
    const taskCategoriesList = document.getElementById('task-categories-list');
    const addTaskCategoryButton = document.getElementById('add-task-category');
    const newTaskCategoryInput = document.getElementById('new-task-category');
    
    const expenseCategoriesList = document.getElementById('expense-categories-list');
    const addExpenseCategoryButton = document.getElementById('add-expense-category');
    const newExpenseCategoryInput = document.getElementById('new-expense-category');
    
    const rentAmountInput = document.getElementById('rent-amount');
    const rentDayInput = document.getElementById('rent-day');
    const saveRentSettingsButton = document.getElementById('save-rent-settings');
    
    // Export
    const exportWorkLogsButton = document.getElementById('export-work-logs');
    const exportFinanceButton = document.getElementById('export-finance');
    const exportDeductionsButton = document.getElementById('export-deductions');
    const exportDebtsButton = document.getElementById('export-debts');
    
    // Graf
    const chartButtons = document.querySelectorAll('.chart-options button');
    
    // --- Globální proměnné ---
    let timerInterval;
    let isRunning = false;
    let currentPerson = localStorage.getItem('currentTimerPerson') || 'maru';
    let currentActivity = localStorage.getItem('currentTimerActivity') || '';
    
    // Sazby a srážky
    const hourlyRates = {
        maru: 275,
        marty: 400
    };
    
    const deductionRates = {
        maru: 1/3, // 33.33%
        marty: 0.5  // 50%
    };
    
    // Instance grafu
    let chartInstance = null;
    let currentChartType = 'person';
    
    // Filtry
    let filters = {
        person: '',
        startDate: '',
        endDate: '',
        activity: ''
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
    
    // Formátování času
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    // Aktualizace časovače
    const updateTimerDisplay = () => {
        const timerState = getTimerState();
        
        if (!timerState.startTime) {
            timerTimeDisplay.textContent = '00:00:00';
            headerTimer.classList.add('hidden');
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
        const timeString = formatTime(totalSeconds);
        
        // Aktualizace hlavního časovače
        timerTimeDisplay.textContent = timeString;
        timerPersonDisplay.textContent = timerState.person === 'maru' ? 'Maru' : 'Marty';
        timerActivityDisplay.textContent = timerState.activity || '';
        
        // Aktualizace časovače v hlavičce
        if (timerState.isRunning) {
            headerTimer.classList.remove('hidden');
            headerTimerTime.textContent = timeString;
            headerTimerPerson.textContent = timerState.person === 'maru' ? 'Maru' : 'Marty';
            headerTimerActivity.textContent = timerState.activity || '';
        } else {
            headerTimer.classList.add('hidden');
        }
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
            
            updateTimerDisplay();
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
            
            // Získat hodnotu poznámky z textového pole
            const note = timerNoteInput ? timerNoteInput.value : '';
            
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
                activity: currentActivity,
                note: note  // Uložení poznámky
            });
            
            saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
            
            // Resetovat stav časovače a pole poznámky
            saveTimerState(null, null, false, currentPerson, currentActivity);
            if (timerNoteInput) timerNoteInput.value = '';
            
            renderWorkLogs();
            renderDeductionsSummary();
            updateChart();
            
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
        // Seznam selectů k naplnění
        const activitySelects = [
            { element: timerActivitySelect, currentValue: timerActivitySelect ? timerActivitySelect.value : '' },
            { element: manualActivitySelect, currentValue: manualActivitySelect ? manualActivitySelect.value : '' },
            { element: filterActivity, currentValue: filterActivity ? filterActivity.value : '' }
        ];
        
        // Pro každý select
        activitySelects.forEach(({element, currentValue}) => {
            if (!element) return;
            
            // Uložit aktuální hodnotu
            
            // Vyčistit options kromě první prázdné (pokud existuje)
            const firstOption = element.options[0];
            element.innerHTML = '';
            if (firstOption) {
                element.appendChild(firstOption);
            }
            
            // Přidat kategorie úkolů
            taskCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                element.appendChild(option);
            });
            
            // Obnovit vybranou hodnotu
            if (currentValue) {
                for (let i = 0; i < element.options.length; i++) {
                    if (element.options[i].value === currentValue) {
                        element.selectedIndex = i;
                        break;
                    }
                }
            }
        });
        
        // Pro finanční kategorie
        const financeCategorySelect = document.getElementById('finance-category');
        if (financeCategorySelect) {
            const currentSelection = financeCategorySelect.value;
            
            // Vyčistit options kromě první prázdné
            const firstOption = financeCategorySelect.options[0];
            financeCategorySelect.innerHTML = '';
            if (firstOption) {
                financeCategorySelect.appendChild(firstOption);
            }
            
            // Přidat kategorie výdajů
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
        const note = manualNoteInput ? manualNoteInput.value : '';
        
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
                    activity,
                    note
                };
            }
            
            // Resetovat formulář pro přidání nového záznamu
            saveLogButton.textContent = 'Přidat záznam';
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
                activity,
                note
            });
        }
        
        saveData({ workLogs, finances, debts, rentSettings, taskCategories, expenseCategories });
        renderWorkLogs();
        renderDeductionsSummary();
        updateChart();
        
        manualEntryForm.reset();
        
        // Nastavit dnešní datum
        document.getElementById('manual-date').valueAsDate = new Date();
    });
    
    // Zrušení editace výkazu
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', (e) => {
            e.preventDefault();
            saveLogButton.textContent = 'Přidat záznam';
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
        
        // Přepnout na sekci Docházka
        showSection('dochazka');
        
        // Naplnit formulář daty
        document.getElementById('manual-person').value = log.person;
        document.getElementById('manual-date').value = log.date;
        document.getElementById('manual-start-time').value = log.start;
        document.getElementById('manual-end-time').value = log.end;
        document.getElementById('manual-break-time').value = log.break;
        
        // Nastavit poznámku
        if (manualNoteInput) {
            manualNoteInput.value = log.note || '';
        }
        
        // Nastavit aktivitu, pokud existuje
        if (manualActivitySelect && log.activity) {
            setTimeout(() => {
                // Timeout pro zajištění, že select je již naplněn
                for (let i = 0; i < manualActivitySelect.options.length; i++) {
                    if (manualActivitySelect.options[i].value === log.activity) {
                        manualActivitySelect.selectedIndex = i;
                        break;
                    }
                }
            }, 10);
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
                updateChart();
            }
        }
    };
    
    // --- Aplikace filtrů ---
    const applyFilters = () => {
        filters = {
            person: filterPerson ? filterPerson.value : '',
            startDate: filterStartDate ? filterStartDate.value : '',
            endDate: filterEndDate ? filterEndDate.value : '',
            activity: filterActivity ? filterActivity.value : ''
        };
        
        renderWorkLogs();
        updateChart();
    };
    
    // --- Reset filtrů ---
    const resetFilters = () => {
        if (filterPerson) filterPerson.value = '';
        if (filterStartDate) filterStartDate.value = '';
        if (filterEndDate) filterEndDate.value = '';
        if (filterActivity) filterActivity.value = '';
        
        filters = {
            person: '',
            startDate: '',
            endDate: '',
            activity: ''
        };
        
        renderWorkLogs();
        updateChart();
    };
    
    // --- Filtrování dat ---
    const filterData = (data) => {
        return data.filter(item => {
            // Filtrovat podle osoby
            if (filters.person && item.person !== filters.person) {
                return false;
            }
            
            // Filtrovat podle data
            if (filters.startDate) {
                const itemDate = new Date(item.date);
                const startDate = new Date(filters.startDate);
                if (itemDate < startDate) {
                    return false;
                }
            }
            
            if (filters.endDate) {
                const itemDate = new Date(item.date);
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59); // Konec dne
                if (itemDate > endDate) {
                    return false;
                }
            }
            
            // Filtrovat podle aktivity
            if (filters.activity && item.activity !== filters.activity) {
                return false;
            }
            
            return true;
        });
    };
    
    // --- Vykreslení seznamu výkazů v accordion stylu ---
    const renderWorkLogs = () => {
        // Najdeme container pro accordion
        if (!accordionContainer) return;
        
        accordionContainer.innerHTML = '';
        
        // Filtrování dat
        const filteredLogs = filterData(workLogs);
        
        if (filteredLogs.length === 0) {
            // Zobrazit prázdnou zprávu, pokud nejsou žádné záznamy
            accordionContainer.innerHTML = '<div class="accordion-empty">Žádné záznamy odpovídající zvoleným filtrům</div>';
            return;
        }
        
        // Seskupení záznamů podle dne a osoby
        const groupedLogs = {};
        
        filteredLogs.forEach(log => {
            // Vytvoření klíče ve formátu 'datum-osoba'
            const key = `${log.date}-${log.person}`;
            
            if (!groupedLogs[key]) {
                groupedLogs[key] = {
                    date: log.date,
                    person: log.person,
                    logs: [],
                    totalWorked: 0,
                    totalEarnings: 0,
                    totalDeduction: 0
                };
            }
            
            // Přidání záznamu do skupiny
            groupedLogs[key].logs.push(log);
            
            // Aktualizace souhrnů
            groupedLogs[key].totalWorked += log.worked;
            groupedLogs[key].totalEarnings += log.earnings;
            
            const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
            groupedLogs[key].totalDeduction += deduction;
        });
        
        // Seřadit dny podle data (nejnovější první)
        const sortedDays = Object.values(groupedLogs).sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Vykreslení accordion pro každý den a osobu
        sortedDays.forEach(dayGroup => {
            const personName = dayGroup.person === 'maru' ? 'Maru' : 'Marty';
            const formattedDate = formatDateCZ(dayGroup.date);
            
            // Formátování odpracovaného času
            const hoursWorked = Math.floor(dayGroup.totalWorked / 60);
            const minutesWorked = dayGroup.totalWorked % 60;
            const workedTime = `${hoursWorked}:${String(minutesWorked).padStart(2, '0')}`;
            
            // Vytvoření accordion položky
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            
            // Vytvoření hlavičky
            const accordionHeader = document.createElement('div');
            accordionHeader.className = 'accordion-header';
            accordionHeader.innerHTML = `
                <div class="accordion-header-content">
                    <div class="accordion-person-tag ${dayGroup.person}">${personName}</div>
                    <div>${formattedDate}</div>
                </div>
                <div class="accordion-header-right">
                    <div class="accordion-day-summary">
                        <div><i class="fas fa-clock"></i> ${workedTime}</div>
                        <div><i class="fas fa-money-bill-wave"></i> ${dayGroup.totalEarnings.toFixed(2)} CZK</div>
                        <div><i class="fas fa-percentage"></i> ${dayGroup.totalDeduction.toFixed(2)} CZK</div>
                    </div>
                    <i class="fas fa-chevron-down accordion-toggle"></i>
                </div>
            `;
            
            // Vytvoření obsahu
            const accordionContent = document.createElement('div');
            accordionContent.className = 'accordion-content';
            
            // Vnitřní obsah s tabulkou záznamů
            const innerContent = document.createElement('div');
            innerContent.className = 'accordion-content-inner';
            
            // Vytvoření tabulky pro záznamy dne
            const table = document.createElement('table');
            table.className = 'accordion-table';
            
            // Hlavička tabulky
            const tableHead = document.createElement('thead');
            tableHead.innerHTML = `
                <tr>
                    <th>Začátek</th>
                    <th>Konec</th>
                    <th>Pauza</th>
                    <th>Práce</th>
                    <th>Výdělek</th>
                    <th>Srážka</th>
                    <th>Úkol</th>
                    <th>Poznámka</th>
                    <th>Akce</th>
                </tr>
            `;
            
            // Tělo tabulky
            const tableBody = document.createElement('tbody');
            
            // Seřadit záznamy dne podle času začátku
            const sortedLogs = [...dayGroup.logs].sort((a, b) => {
                return a.start.localeCompare(b.start);
            });
            
            // Přidání jednotlivých záznamů do tabulky
            sortedLogs.forEach(log => {
                const row = document.createElement('tr');
                
                // Formátování odpracovaného času pro záznam
                const logHoursWorked = Math.floor(log.worked / 60);
                const logMinutesWorked = log.worked % 60;
                const logWorkedTime = `${logHoursWorked}:${String(logMinutesWorked).padStart(2, '0')}`;
                
                // Výpočet srážky pro záznam
                const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
                
                // Vytvoření buněk s data-label atributem pro mobilní zobrazení
                const cells = [
                    { label: 'Začátek', content: log.start },
                    { label: 'Konec', content: log.end },
                    { label: 'Pauza', content: log.break },
                    { label: 'Práce', content: logWorkedTime },
                    { label: 'Výdělek', content: `${log.earnings.toFixed(2)} CZK` },
                    { label: 'Srážka', content: `${deduction.toFixed(2)} CZK` },
                    { label: 'Úkol', content: log.activity || '-' },
                    { label: 'Poznámka', content: log.note || '-' }
                ];
                
                // Přidání buněk do řádku
                cells.forEach(cell => {
                    const td = document.createElement('td');
                    td.setAttribute('data-label', cell.label);
                    
                    // Obalení obsahu do divu pro lepší stylování
                    const cellContent = document.createElement('div');
                    cellContent.className = 'cell-content';
                    cellContent.textContent = cell.content;
                    
                    td.appendChild(cellContent);
                    row.appendChild(td);
                });
                
                // Buňka s tlačítky akcí
                const actionsCell = document.createElement('td');
                actionsCell.className = 'actions-cell';
                actionsCell.setAttribute('data-label', 'Akce');
                
                // Vytvoření tlačítek akcí
                const actionButtons = document.createElement('div');
                actionButtons.className = 'cell-content action-buttons';
                
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
                
                // Přidání tlačítek do buňky
                actionButtons.appendChild(editButton);
                actionButtons.appendChild(deleteButton);
                actionsCell.appendChild(actionButtons);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            });
            
            // Sestavení tabulky
            table.appendChild(tableHead);
            table.appendChild(tableBody);
            innerContent.appendChild(table);
            accordionContent.appendChild(innerContent);
            
            // Přidání hlavičky a obsahu do accordion položky
            accordionItem.appendChild(accordionHeader);
            accordionItem.appendChild(accordionContent);
            
            // Přidání accordion položky do containeru
            accordionContainer.appendChild(accordionItem);
            
            // Přidání event listeneru pro rozbalení/sbalení
            accordionHeader.addEventListener('click', () => {
                accordionHeader.classList.toggle('active');
                
                const content = accordionHeader.nextElementSibling;
                if (accordionHeader.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = null;
                }
            });
        });
    };
    
    // --- Vykreslení přehledu srážek ---
    const renderDeductionsSummary = () => {
        if (!deductionsSummaryTableBody) return;
        
        deductionsSummaryTableBody.innerHTML = '';
        
        // Filtrování dat
        const filteredLogs = filterData(workLogs);
        
        // Seskupit data podle osoby a měsíce
        const deductionsByPersonMonth = {};
        
        filteredLogs.forEach(log => {
            const date = new Date(log.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const key = `${log.person}-${yearMonth}`;
            
            if (!deductionsByPersonMonth[key]) {
                deductionsByPersonMonth[key] = {
                    person: log.person,
                    yearMonth: yearMonth,
                    monthName: getMonthNameCZ(date),
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
        
        // Zobrazit zprávu, pokud nejsou žádné záznamy
        if (Object.keys(deductionsByPersonMonth).length === 0) {
            const row = deductionsSummaryTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = 'Žádné záznamy odpovídající zvoleným filtrům';
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = '#888';
        }
    };
    
    // --- Chart.js grafy ---
    const updateChart = () => {
        if (!chartArea) return;
        
        // Zrušit předchozí instanci grafu
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Filtrování dat
        const filteredLogs = filterData(workLogs);
        
        let chartData;
        let chartOptions;
        
        // Podle typu grafu
        switch (currentChartType) {
            case 'person':
                chartData = preparePersonChartData(filteredLogs);
                chartOptions = {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Výdělek podle osoby',
                            font: { size: 16 }
                        }
                    }
                };
                break;
            case 'activity':
                chartData = prepareActivityChartData(filteredLogs);
                chartOptions = {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Výdělek podle úkolu',
                            font: { size: 16 }
                        }
                    }
                };
                break;
            case 'month':
                chartData = prepareMonthChartData(filteredLogs);
                chartOptions = {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Výdělek podle měsíce',
                            font: { size: 16 }
                        }
                    }
                };
                break;
        }
        
        // Vytvořit nový graf
        chartInstance = new Chart(chartArea, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...chartOptions
            }
        });
    };
    
    // Příprava dat pro graf podle osoby
    const preparePersonChartData = (logs) => {
        const personEarnings = {};
        const personDeductions = {};
        
        logs.forEach(log => {
            if (!personEarnings[log.person]) {
                personEarnings[log.person] = 0;
                personDeductions[log.person] = 0;
            }
            
            personEarnings[log.person] += log.earnings;
            
            const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
            personDeductions[log.person] += deduction;
        });
        
        const persons = Object.keys(personEarnings);
        const earnings = persons.map(person => personEarnings[person]);
        const deductions = persons.map(person => personDeductions[person]);
        
        return {
            labels: persons.map(p => p === 'maru' ? 'Maru' : 'Marty'),
            datasets: [
                {
                    label: 'Výdělek (CZK)',
                    data: earnings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Srážky (CZK)',
                    data: deductions,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    };
    
    // Příprava dat pro graf podle úkolu
    const prepareActivityChartData = (logs) => {
        const activityEarnings = {};
        
        logs.forEach(log => {
            const activity = log.activity || 'Bez úkolu';
            
            if (!activityEarnings[activity]) {
                activityEarnings[activity] = 0;
            }
            
            activityEarnings[activity] += log.earnings;
        });
        
        const activities = Object.keys(activityEarnings);
        const earnings = activities.map(activity => activityEarnings[activity]);
        
        return {
            labels: activities,
            datasets: [
                {
                    label: 'Výdělek (CZK)',
                    data: earnings,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        };
    };
    
    // Příprava dat pro graf podle měsíce
    const prepareMonthChartData = (logs) => {
        const monthEarnings = {};
        
        logs.forEach(log => {
            const date = new Date(log.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthEarnings[yearMonth]) {
                monthEarnings[yearMonth] = {
                    maru: 0,
                    marty: 0
                };
            }
            
            monthEarnings[yearMonth][log.person] += log.earnings;
        });
        
        // Seřadit měsíce
        const sortedMonths = Object.keys(monthEarnings).sort();
        
        const monthLabels = sortedMonths.map(ym => {
            const [year, month] = ym.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return getMonthNameCZ(date);
        });
        
        const maruEarnings = sortedMonths.map(ym => monthEarnings[ym].maru);
        const martyEarnings = sortedMonths.map(ym => monthEarnings[ym].marty);
        
        return {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Maru',
                    data: maruEarnings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Marty',
                    data: martyEarnings,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
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
        if (!financeTableBody) return;
        
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
            row.insertCell().textContent = finance.amount.toFixed(2);
            row.insertCell().textContent = finance.currency;
            row.insertCell().textContent = formatDateCZ(finance.date);
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
        
        // Zobrazit zprávu, pokud nejsou žádné záznamy
        if (sortedFinances.length === 0) {
            const row = financeTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 7;
            cell.textContent = 'Žádné finanční záznamy';
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = '#888';
        }
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
        if (!debtsListDiv) return;
        
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
        
        // Zobrazit zprávu, pokud nejsou žádné dluhy
        if (Object.keys(debtsByCurrency).length === 0) {
            debtsListDiv.innerHTML = '<p class="no-records">Žádné dluhy</p>';
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
            const header = ['Osoba', 'Datum', 'Začátek', 'Konec', 'Pauza', 'Odpracováno (min)', 'Výdělek (CZK)', 'Srážka (CZK)', 'Úkol', 'Poznámka'];
            const data = workLogs.map(log => {
                const deduction = log.deduction || calculateDeduction(log.earnings, log.person);
                return [
                    log.person === 'maru' ? 'Maru' : 'Marty',
                    formatDateCZ(log.date),
                    log.start,
                    log.end,
                    log.break,
                    log.worked,
                    log.earnings.toFixed(2),
                    deduction.toFixed(2),
                    log.activity || '',
                    log.note || ''
                ];
            });
            exportToCSV('pracovni_zaznamy.csv', [header, ...data]);
        });
    }
    
    if (exportFinanceButton) {
        exportFinanceButton.addEventListener('click', (e) => {
            e.preventDefault();
            const header = ['Typ', 'Popis', 'Částka', 'Měna', 'Datum', 'Kategorie'];
            const data = finances.map(finance => [
                finance.type === 'income' ? 'Příjem' : 'Výdaj',
                finance.description,
                finance.amount.toFixed(2),
                finance.currency,
                formatDateCZ(finance.date),
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
                        monthName: getMonthNameCZ(date),
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
            
            exportToCSV('srazky.csv', [header, ...data]);
        });
    }
    
    if (exportDebtsButton) {
        exportDebtsButton.addEventListener('click', (e) => {
            e.preventDefault();
            const header = ['Osoba', 'Popis', 'Částka', 'Měna', 'Zaplaceno', 'Zbývá'];
            const data = debts.map(debt => [
                debt.person === 'maru' ? 'Maru' : 'Marty',
                debt.description,
                debt.amount.toFixed(2),
                debt.currency,
                (debt.paid || 0).toFixed(2),
                (debt.amount - (debt.paid || 0)).toFixed(2)
            ]);
            exportToCSV('dluhy.csv', [header, ...data]);
        });
    }
    
    // --- Přepínání sekcí ---
    const sections = document.querySelectorAll('main > section');
    const navLinks = document.querySelectorAll('nav ul li a');
    
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
        
        // Aktualizovat graf, pokud je zobrazen
        if (sectionId === 'prehledy') {
            updateChart();
        }
    };
    
    // Přepínání sekcí pomocí navigace
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });
    
    // --- Filtry ---
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }
    
    if (resetFiltersButton) {
        resetFiltersButton.addEventListener('click', (e) => {
            e.preventDefault();
            resetFilters();
        });
    }
    
    // --- Přepínání typů grafů ---
    chartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Odstranit aktivní třídu ze všech tlačítek
            chartButtons.forEach(btn => btn.classList.remove('active'));
            
            // Přidat aktivní třídu na kliknuté tlačítko
            button.classList.add('active');
            
            // Nastavit typ grafu
            currentChartType = button.dataset.chartType;
            
            // Aktualizovat graf
            updateChart();
        });
    });
    
    // --- Nastavení datumů ve formulářích ---
    ['manual-date', 'finance-date'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.valueAsDate = new Date();
        }
    });
    
    // --- Formatování dat ---
    function formatDateCZ(dateStr) {
        if (!dateStr) return '';
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    }
    
    function getMonthNameCZ(date) {
        const months = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    // --- Při načtení stránky zobrazit výchozí sekci ---
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        if (document.getElementById(sectionId)) {
            showSection(sectionId);
        } else {
            showSection('dochazka');
        }
    } else {
        showSection('dochazka');
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
    
    // Nastavit aktivní tlačítko grafu
    document.querySelector(`.chart-options button[data-chart-type="${currentChartType}"]`)?.classList.add('active');
});
