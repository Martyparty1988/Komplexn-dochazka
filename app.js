// --- START OF FILE app.js ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & State ---
    const HOURLY_RATES = {
        Maru: 275,
        Marty: 400
    };

    // DOM Elements - Navigation & Sections
    const navReportsBtn = document.getElementById('nav-reports');
    const navFinancesBtn = document.getElementById('nav-finances');
    const navSummaryBtn = document.getElementById('nav-summary');
    const reportsSection = document.getElementById('reports-section');
    const financesSection = document.getElementById('finances-section');
    const summarySection = document.getElementById('summary-section');
    const sections = [reportsSection, financesSection, summarySection];
    const navButtons = [navReportsBtn, navFinancesBtn, navSummaryBtn];

    // DOM Elements - Reports (General)
    const toggleTimerModeBtn = document.getElementById('toggle-timer-mode');
    const toggleManualModeBtn = document.getElementById('toggle-manual-mode');
    const timerModeDiv = document.getElementById('timer-mode');
    const manualModeDiv = document.getElementById('manual-mode');
    const reportsTableBody = document.getElementById('reports-table-body');
    const noReportsMessage = document.getElementById('no-reports-message');
    const filterReportDateInput = document.getElementById('filter-date');
    const filterReportPersonSelect = document.getElementById('filter-person');
    const clearReportFiltersBtn = document.getElementById('clear-filters');

    // DOM Elements - Reports (Timer Mode)
    const timerPersonSelect = document.getElementById('timer-person');
    const timerCategorySelect = document.getElementById('timer-category');
    const timerCustomCategoryInput = document.getElementById('timer-custom-category');
    const timerDisplay = document.getElementById('timer');
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const stopTimerBtn = document.getElementById('stop-timer');
    const timerSummaryDiv = document.getElementById('timer-summary');
    const timerStartInput = document.getElementById('timer-start');
    const timerEndInput = document.getElementById('timer-end');
    const timerPauseInput = document.getElementById('timer-pause');
    const timerHoursInput = document.getElementById('timer-hours');
    const timerEarningsInput = document.getElementById('timer-earnings');
    const saveTimerBtn = document.getElementById('save-timer');

    // DOM Elements - Reports (Manual Mode)
    const manualDateInput = document.getElementById('manual-date');
    const manualPersonSelect = document.getElementById('manual-person');
    const manualCategorySelect = document.getElementById('manual-category');
    const manualCustomCategoryInput = document.getElementById('manual-custom-category');
    const manualStartInput = document.getElementById('manual-start');
    const manualEndInput = document.getElementById('manual-end');
    const manualPauseInput = document.getElementById('manual-pause');
    const manualHoursInput = document.getElementById('manual-hours');
    const manualEarningsInput = document.getElementById('manual-earnings');
    const saveManualBtn = document.getElementById('save-manual');

    // DOM Elements - Finances
    const addFinanceBtn = document.getElementById('add-finance');
    const financeFormDiv = document.getElementById('finance-form');
    const financeDateInput = document.getElementById('finance-date');
    const financeTypeSelect = document.getElementById('finance-type');
    const financeAmountInput = document.getElementById('finance-amount');
    const financePersonSelect = document.getElementById('finance-person');
    const financeNoteInput = document.getElementById('finance-note');
    const financeDebtPaymentDiv = document.getElementById('finance-debt-payment');
    const financeDebtRatioInput = document.getElementById('finance-debt-ratio');
    const financeDebtAmountInput = document.getElementById('finance-debt-amount');
    const financePayoutInput = document.getElementById('finance-payout');
    const saveFinanceBtn = document.getElementById('save-finance');
    const cancelFinanceBtn = document.getElementById('cancel-finance');
    const financesTableBody = document.getElementById('finances-table-body');
    const noFinancesMessage = document.getElementById('no-finances-message');
    const filterFinanceDateInput = document.getElementById('filter-finance-date');
    const filterFinanceTypeSelect = document.getElementById('filter-finance-type');
    const filterFinancePersonSelect = document.getElementById('filter-finance-person');
    const clearFinanceFiltersBtn = document.getElementById('clear-finance-filters');

    // DOM Elements - Summary
    const maruTotalHoursSpan = document.getElementById('maru-total-hours');
    const maruTotalEarningsSpan = document.getElementById('maru-total-earnings');
    const maruDebtPaidSpan = document.getElementById('maru-debt-paid');
    const maruPaidOutSpan = document.getElementById('maru-paid-out');
    const martyTotalHoursSpan = document.getElementById('marty-total-hours');
    const martyTotalEarningsSpan = document.getElementById('marty-total-earnings');
    const martyDebtPaidSpan = document.getElementById('marty-debt-paid');
    const martyPaidOutSpan = document.getElementById('marty-paid-out');
    const totalHoursSpan = document.getElementById('total-hours');
    const totalEarningsSpan = document.getElementById('total-earnings');
    const totalIncomeSpan = document.getElementById('total-income');
    const totalExpensesSpan = document.getElementById('total-expenses');
    const totalPaidOutSpan = document.getElementById('total-paid-out');
    const exportDataBtn = document.getElementById('export-data');

    // DOM Elements - General
    const notificationDiv = document.getElementById('notification');
    const installAppBtn = document.getElementById('install-app');

    // State Variables
    let reports = [];
    let finances = [];
    let timerInterval = null;
    let timerStartTime = null;
    let timerElapsedTime = 0; // in seconds
    let timerPausedTime = 0; // in seconds, duration of current pause
    let timerTotalPauseDuration = 0; // in seconds, total for the session
    let isTimerRunning = false;
    let isTimerPaused = false;
    let editingFinanceId = null; // To handle editing later if needed

    // --- Initialization ---
    function init() {
        loadData();
        setupEventListeners();
        setDefaultDates();
        renderReportsTable();
        renderFinancesTable();
        updateSummary();
        showSection('reports-section'); // Start on reports section
        checkUrlParams(); // Check if a specific section should be opened via URL
    }

    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        if (section === 'finances') {
            showSection('finances-section');
        } else if (section === 'summary') {
            showSection('summary-section');
        }
    }


    function setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        manualDateInput.value = today;
        financeDateInput.value = today;
    }

    // --- Data Persistence (LocalStorage) ---
    function saveData() {
        try {
            localStorage.setItem('workReports', JSON.stringify(reports));
            localStorage.setItem('finances', JSON.stringify(finances));
        } catch (error) {
            console.error("Error saving data to localStorage:", error);
            showNotification("Chyba při ukládání dat.", "error");
        }
    }

    function loadData() {
        try {
            const storedReports = localStorage.getItem('workReports');
            const storedFinances = localStorage.getItem('finances');
            reports = storedReports ? JSON.parse(storedReports) : [];
            finances = storedFinances ? JSON.parse(storedFinances) : [];
            // Ensure IDs are unique if loading old data without IDs
             reports.forEach((r, index) => { if (!r.id) r.id = Date.now() + index });
             finances.forEach((f, index) => { if (!f.id) f.id = Date.now() + index + 1000 }); // Offset IDs
        } catch (error) {
            console.error("Error loading data from localStorage:", error);
            reports = [];
            finances = [];
            showNotification("Chyba při načítání dat. Data byla resetována.", "error");
        }
    }

    // --- Navigation ---
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });
        navButtons.forEach(button => {
            button.classList.toggle('active', button.id === `nav-${sectionId.split('-')[0]}`);
        });
        // Reset forms when switching sections
        if (sectionId !== 'reports-section') {
            resetTimerState(); // Stop timer if running when leaving section
            resetManualForm();
        }
         if (sectionId !== 'finances-section') {
             resetFinanceForm();
             hideFinanceForm();
         }
        if (sectionId === 'summary-section') {
            updateSummary(); // Recalculate summary when switching to it
        }
        // Update URL without reloading page
         const currentUrl = new URL(window.location);
         if (sectionId === 'reports-section') {
            currentUrl.searchParams.delete('section');
         } else {
            currentUrl.searchParams.set('section', sectionId.split('-')[0]);
         }
         // history.pushState({}, '', currentUrl); // Causes issues with back button sometimes
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Navigation
        navReportsBtn.addEventListener('click', () => showSection('reports-section'));
        navFinancesBtn.addEventListener('click', () => showSection('finances-section'));
        navSummaryBtn.addEventListener('click', () => showSection('summary-section'));

        // Reports - Mode Toggle
        toggleTimerModeBtn.addEventListener('click', switchReportMode);
        toggleManualModeBtn.addEventListener('click', switchReportMode);

        // Reports - Timer
        startTimerBtn.addEventListener('click', startTimer);
        pauseTimerBtn.addEventListener('click', pauseTimer);
        stopTimerBtn.addEventListener('click', stopTimer);
        saveTimerBtn.addEventListener('click', saveTimerReport);
        timerCategorySelect.addEventListener('change', handleCategoryChange);
        timerPauseInput.addEventListener('input', updateTimerSummaryFields); // Recalc if pause changes manually

        // Reports - Manual
        manualCategorySelect.addEventListener('change', handleCategoryChange);
        manualStartInput.addEventListener('input', calculateManualHoursAndEarnings);
        manualEndInput.addEventListener('input', calculateManualHoursAndEarnings);
        manualPauseInput.addEventListener('input', calculateManualHoursAndEarnings);
        manualHoursInput.addEventListener('input', handleManualHoursInput); // Specific handler for hours input
        manualPersonSelect.addEventListener('change', calculateManualHoursAndEarnings);
        saveManualBtn.addEventListener('click', saveManualReport);

        // Reports - Table & Filters
        reportsTableBody.addEventListener('click', handleReportTableClick);
        filterReportDateInput.addEventListener('change', renderReportsTable);
        filterReportPersonSelect.addEventListener('change', renderReportsTable);
        clearReportFiltersBtn.addEventListener('click', clearReportFilters);

        // Finances - Form & Table
        addFinanceBtn.addEventListener('click', showFinanceForm);
        cancelFinanceBtn.addEventListener('click', hideFinanceForm);
        saveFinanceBtn.addEventListener('click', saveFinanceRecord);
        financeTypeSelect.addEventListener('change', handleFinanceTypeChange);
        financeAmountInput.addEventListener('input', calculateDebtSplit);
        financeDebtRatioInput.addEventListener('input', calculateDebtSplit);
        financesTableBody.addEventListener('click', handleFinanceTableClick);
        filterFinanceDateInput.addEventListener('change', renderFinancesTable);
        filterFinanceTypeSelect.addEventListener('change', renderFinancesTable);
        filterFinancePersonSelect.addEventListener('change', renderFinancesTable);
        clearFinanceFiltersBtn.addEventListener('click', clearFinanceFilters);

        // Summary
        exportDataBtn.addEventListener('click', exportDataCSV);
    }

    // --- Helper Functions ---
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

     function formatHours(totalMinutes) {
         if (isNaN(totalMinutes) || totalMinutes <= 0) return '0.00';
         const hours = totalMinutes / 60;
         return hours.toFixed(2);
     }

     function formatCurrency(amount) {
         return `${amount.toFixed(2).replace('.', ',')} Kč`;
     }

    function getCurrentTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    function getHourlyRate(person) {
        return HOURLY_RATES[person] || 0;
    }

    function calculateEarnings(hours, person) {
        const rate = getHourlyRate(person);
        return hours * rate;
    }

    // Parses "HH:MM", "H:MM", "HH", "H", decimal hours (e.g., 2.5), or minutes (e.g., 150) into total minutes
     function parseDurationToMinutes(input) {
         if (!input || typeof input !== 'string') return 0;
         input = input.trim().replace(',', '.'); // Allow comma decimal separator

         if (input.includes(':')) {
             const parts = input.split(':');
             const hours = parseInt(parts[0], 10) || 0;
             const minutes = parseInt(parts[1], 10) || 0;
             return (hours * 60) + minutes;
         } else {
             const numericValue = parseFloat(input);
             if (isNaN(numericValue)) return 0;

             // Heuristic: If > 10 assume minutes, otherwise hours
              // Let's refine: if it has a decimal, assume hours. If integer >= 24, assume minutes. Otherwise hours.
              if (input.includes('.') || (Number.isInteger(numericValue) && numericValue < 24 )) {
                  return Math.round(numericValue * 60); // Assume hours
              } else {
                   return numericValue; // Assume minutes
              }
         }
     }

     function parseTimeToMinutes(timeString) { // HH:MM
         if (!timeString || !timeString.includes(':')) return 0;
         const [hours, minutes] = timeString.split(':').map(Number);
         return (hours * 60) + minutes;
     }

    function showNotification(message, type = 'info') {
        notificationDiv.textContent = message;
        notificationDiv.className = `notification show ${type}`; // Add type class
        setTimeout(() => {
            notificationDiv.classList.remove('show');
        }, 3000); // Hide after 3 seconds
    }

    function getSelectedCategory(categorySelect, customCategoryInput) {
        const selectedValue = categorySelect.value;
        if (selectedValue === 'custom') {
            return customCategoryInput.value.trim() || 'Nespecifikováno';
        }
        return selectedValue;
    }

    function handleCategoryChange(event) {
        const selectElement = event.target;
        const customInputId = selectElement.id.replace('-category', '-custom-category');
        const customInputElement = document.getElementById(customInputId);
        if (customInputElement) {
            customInputElement.classList.toggle('hidden', selectElement.value !== 'custom');
            if (selectElement.value === 'custom') {
                customInputElement.focus();
            }
        }
    }

    // --- Reports Logic ---

    function switchReportMode(event) {
        const isTimerMode = event.target.id === 'toggle-timer-mode';
        timerModeDiv.classList.toggle('hidden', !isTimerMode);
        manualModeDiv.classList.toggle('hidden', isTimerMode);

        toggleTimerModeBtn.classList.toggle('primary-btn', isTimerMode);
        toggleManualModeBtn.classList.toggle('primary-btn', !isTimerMode);

        if (!isTimerMode) {
            resetTimerState(); // Stop timer if switching away
        }
    }

    // Timer Functions
    function startTimer() {
        if (isTimerRunning) return; // Already running

        if (isTimerPaused) { // Resuming from pause
            const pauseDuration = Math.floor((Date.now() - timerPausedTime) / 1000);
            timerTotalPauseDuration += pauseDuration;
            isTimerPaused = false;
            pauseTimerBtn.textContent = 'Pauza';
            pauseTimerBtn.classList.remove('success-btn'); // Assuming success class for resume
        } else { // Starting fresh or after stop
            resetTimerState();
            timerStartTime = Date.now();
            timerTotalPauseDuration = 0;
            timerPersonSelect.disabled = true;
            timerCategorySelect.disabled = true;
            timerCustomCategoryInput.disabled = true;
        }

        isTimerRunning = true;
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial update

        startTimerBtn.disabled = true;
        pauseTimerBtn.disabled = false;
        stopTimerBtn.disabled = false;
        timerSummaryDiv.classList.add('hidden'); // Hide summary while running
    }

    function pauseTimer() {
        if (!isTimerRunning || isTimerPaused) return;

        isTimerPaused = true;
        clearInterval(timerInterval);
        timerPausedTime = Date.now(); // Record when pause started

        pauseTimerBtn.textContent = 'Pokračovat';
        // pauseTimerBtn.classList.add('success-btn'); // Optional: style resume button
        showNotification('Stopky pozastaveny', 'warning');
    }

    function stopTimer() {
        if (!isTimerRunning && !isTimerPaused) return; // Not running or paused

        clearInterval(timerInterval);
        isTimerRunning = false;

        if (isTimerPaused) { // Was paused when stopped
             const pauseDuration = Math.floor((Date.now() - timerPausedTime) / 1000);
             timerTotalPauseDuration += pauseDuration;
             isTimerPaused = false; // Reset pause state
             pauseTimerBtn.textContent = 'Pauza';
             // pauseTimerBtn.classList.remove('success-btn');
        }

        // Final elapsed time calculation
        timerElapsedTime = Math.floor((Date.now() - timerStartTime) / 1000); // Total duration from start
        const netElapsedTime = timerElapsedTime - timerTotalPauseDuration; // Subtract total pause time

         if (netElapsedTime < 0) netElapsedTime = 0; // Ensure non-negative

        // Show summary
        timerDisplay.textContent = formatTime(netElapsedTime); // Display final time
        timerSummaryDiv.classList.remove('hidden');
        updateTimerSummaryFields(netElapsedTime); // Populate summary fields

        // Reset buttons and enable inputs
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
        stopTimerBtn.disabled = true;
        timerPersonSelect.disabled = false;
        timerCategorySelect.disabled = false;
        timerCustomCategoryInput.disabled = false;


        showNotification('Stopky zastaveny. Zkontrolujte a uložte záznam.', 'info');
    }

     function updateTimer() {
         if (!isTimerRunning || isTimerPaused) return;
         const now = Date.now();
         timerElapsedTime = Math.floor((now - timerStartTime) / 1000) - timerTotalPauseDuration;
         if (timerElapsedTime < 0) timerElapsedTime = 0;
         timerDisplay.textContent = formatTime(timerElapsedTime);
     }

     function updateTimerSummaryFields(finalElapsedTime = null) {
          const person = timerPersonSelect.value;
          const rate = getHourlyRate(person);
          const startTime = new Date(timerStartTime);
          const endTime = new Date(timerStartTime + (timerElapsedTime * 1000)); // Use elapsed including pauses for end time

          let netSeconds;
          if (finalElapsedTime !== null) {
               netSeconds = finalElapsedTime; // Use value passed from stopTimer
          } else {
              // Recalculate based on inputs if pause is manually adjusted
              const elapsed = timerElapsedTime;
              const manualPauseMinutes = parseInt(timerPauseInput.value, 10) || 0;
              netSeconds = elapsed - (manualPauseMinutes * 60);
              if (netSeconds < 0) netSeconds = 0;
          }


          const hours = netSeconds / 3600;
          const earnings = calculateEarnings(hours, person);

          timerStartInput.value = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
          timerEndInput.value = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
          timerPauseInput.value = Math.round(timerTotalPauseDuration / 60); // Display total pause in minutes
          timerHoursInput.value = formatHours(netSeconds / 60); // Pass total minutes
          timerEarningsInput.value = formatCurrency(earnings);
     }


    function saveTimerReport() {
        const person = timerPersonSelect.value;
        const category = getSelectedCategory(timerCategorySelect, timerCustomCategoryInput);
        const date = new Date(timerStartTime).toISOString().split('T')[0]; // Get date from start time
        const startTime = timerStartInput.value;
        const endTime = timerEndInput.value;
        const pauseMinutes = parseInt(timerPauseInput.value, 10) || 0;
        // Recalculate hours/earnings based on final values in summary
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);
         let durationMinutes = endMinutes - startMinutes;
         // Handle crossing midnight
         if (durationMinutes < 0) {
             durationMinutes += 24 * 60;
         }
         const netMinutes = durationMinutes - pauseMinutes;

         if (netMinutes <= 0) {
              showNotification("Nelze uložit záznam s nulovou nebo zápornou délkou.", "error");
              return;
         }

        const hours = netMinutes / 60;
        const earnings = calculateEarnings(hours, person);

        const newReport = {
            id: Date.now(),
            date: date,
            person: person,
            category: category,
            startTime: startTime,
            endTime: endTime,
            pauseMinutes: pauseMinutes,
            hours: parseFloat(hours.toFixed(4)), // Store with more precision if needed
            earnings: parseFloat(earnings.toFixed(2)),
            mode: 'timer'
        };

        reports.push(newReport);
        sortData();
        saveData();
        renderReportsTable();
        updateSummary();
        resetTimerState();
        showNotification('Záznam z časovače úspěšně uložen.', 'success');
    }

    function resetTimerState() {
        clearInterval(timerInterval);
        timerInterval = null;
        timerStartTime = null;
        timerElapsedTime = 0;
        timerPausedTime = 0;
        timerTotalPauseDuration = 0;
        isTimerRunning = false;
        isTimerPaused = false;

        timerDisplay.textContent = '00:00:00';
        timerSummaryDiv.classList.add('hidden');
        startTimerBtn.disabled = false;
        pauseTimerBtn.disabled = true;
        pauseTimerBtn.textContent = 'Pauza';
        // pauseTimerBtn.classList.remove('success-btn');
        stopTimerBtn.disabled = true;
        timerPersonSelect.disabled = false;
        timerCategorySelect.disabled = false;
        timerCustomCategoryInput.disabled = false;
        timerPauseInput.value = 0; // Reset pause input as well
        // Clear summary fields
        timerStartInput.value = '';
        timerEndInput.value = '';
        timerHoursInput.value = '';
        timerEarningsInput.value = '';
        timerCategorySelect.value = timerCategorySelect.options[0].value; // Reset category
        timerCustomCategoryInput.classList.add('hidden');
        timerCustomCategoryInput.value = '';
    }


    // Manual Entry Functions
    function calculateManualHoursAndEarnings() {
        const person = manualPersonSelect.value;
        const rate = getHourlyRate(person);
        const startTime = manualStartInput.value;
        const endTime = manualEndInput.value;
        const pauseMinutes = parseInt(manualPauseInput.value, 10) || 0;

        let totalMinutes = 0;

        if (startTime && endTime) {
            const startMinutes = parseTimeToMinutes(startTime);
            const endMinutes = parseTimeToMinutes(endTime);
             let durationMinutes = endMinutes - startMinutes;
             // Handle crossing midnight
             if (durationMinutes < 0) {
                durationMinutes += 24 * 60; // Add 24 hours in minutes
             }
             totalMinutes = durationMinutes - pauseMinutes;
        }

        if (totalMinutes < 0) totalMinutes = 0;

        const hours = totalMinutes / 60;
        const earnings = calculateEarnings(hours, person);

        // Update the fields
         manualHoursInput.value = formatHours(totalMinutes); // Display calculated hours formatted
         manualEarningsInput.value = formatCurrency(earnings);

         // Disable manual hours input if times are filled
         manualHoursInput.disabled = !!(startTime && endTime);
    }

     function handleManualHoursInput() {
         const person = manualPersonSelect.value;
         const rate = getHourlyRate(person);
         const hoursInput = manualHoursInput.value;

         // If hours input is manually changed, calculate earnings from it
         if (hoursInput && !manualHoursInput.disabled) {
             const totalMinutes = parseDurationToMinutes(hoursInput);
             if (totalMinutes > 0) {
                const hours = totalMinutes / 60;
                const earnings = calculateEarnings(hours, person);
                manualEarningsInput.value = formatCurrency(earnings);
                // Clear time inputs if hours are entered directly? Optional.
                 // manualStartInput.value = '';
                 // manualEndInput.value = '';
             } else {
                 manualEarningsInput.value = formatCurrency(0);
             }
         } else if (!hoursInput) {
              // If hours input is cleared, recalculate from times if available
              calculateManualHoursAndEarnings();
         }
     }


    function saveManualReport() {
        const date = manualDateInput.value;
        const person = manualPersonSelect.value;
        const category = getSelectedCategory(manualCategorySelect, manualCustomCategoryInput);
        const startTime = manualStartInput.value;
        const endTime = manualEndInput.value;
        const pauseMinutes = parseInt(manualPauseInput.value, 10) || 0;
        const hoursInput = manualHoursInput.value;

        if (!date) {
            showNotification("Prosím zadejte datum.", "error");
            manualDateInput.focus();
            return;
        }

        let hours = 0;
        let totalMinutesCalc = 0;

         // Prioritize manual hours input if it's not disabled (i.e., times aren't filled) or if it has a value
         if (!manualHoursInput.disabled && hoursInput) {
            totalMinutesCalc = parseDurationToMinutes(hoursInput);
            if (totalMinutesCalc <= 0) {
                 showNotification("Neplatný formát nebo hodnota v poli Odpracováno.", "error");
                 manualHoursInput.focus();
                 return;
             }
             hours = totalMinutesCalc / 60;
         } else if (startTime && endTime) {
            const startMinutes = parseTimeToMinutes(startTime);
            const endMinutes = parseTimeToMinutes(endTime);
             let durationMinutes = endMinutes - startMinutes;
             if (durationMinutes < 0) durationMinutes += 24 * 60;
             totalMinutesCalc = durationMinutes - pauseMinutes;
             if (totalMinutesCalc <= 0) {
                 showNotification("Vypočtená doba práce je nulová nebo záporná.", "error");
                 return;
             }
             hours = totalMinutesCalc / 60;
         } else {
             showNotification("Prosím zadejte buď časy Začátek/Konec nebo Odpracováno (hod).", "error");
             return;
         }


        const earnings = calculateEarnings(hours, person);

        const newReport = {
            id: Date.now(),
            date: date,
            person: person,
            category: category,
            startTime: startTime || null, // Store null if not provided
            endTime: endTime || null,
            pauseMinutes: pauseMinutes,
            hours: parseFloat(hours.toFixed(4)),
            earnings: parseFloat(earnings.toFixed(2)),
            mode: 'manual'
        };

        reports.push(newReport);
        sortData();
        saveData();
        renderReportsTable();
        updateSummary();
        resetManualForm();
        showNotification('Manuální záznam úspěšně uložen.', 'success');
    }

    function resetManualForm() {
        setDefaultDates(); // Reset date to today
        manualPersonSelect.value = 'Maru';
        manualCategorySelect.value = manualCategorySelect.options[0].value;
        manualCustomCategoryInput.classList.add('hidden');
        manualCustomCategoryInput.value = '';
        manualStartInput.value = '';
        manualEndInput.value = '';
        manualPauseInput.value = '0';
        manualHoursInput.value = '';
        manualHoursInput.disabled = false; // Re-enable direct hours input
        manualEarningsInput.value = '';
    }


    // Report Table & Filtering
    function renderReportsTable() {
        reportsTableBody.innerHTML = ''; // Clear existing rows
        const filterDate = filterReportDateInput.value;
        const filterPerson = filterReportPersonSelect.value;

        const filteredReports = reports.filter(report => {
            const dateMatch = !filterDate || report.date === filterDate;
            const personMatch = !filterPerson || report.person === filterPerson;
            return dateMatch && personMatch;
        });

        if (filteredReports.length === 0) {
            noReportsMessage.classList.remove('hidden');
        } else {
            noReportsMessage.classList.add('hidden');
            filteredReports.forEach(report => {
                const row = reportsTableBody.insertRow();
                row.innerHTML = `
                    <td>${report.date}</td>
                    <td>${report.person}</td>
                    <td>${report.category}</td>
                    <td>${report.startTime || '-'}</td>
                    <td>${report.endTime || '-'}</td>
                    <td>${report.pauseMinutes}</td>
                    <td>${formatHours(report.hours * 60)}</td>
                    <td>${formatCurrency(report.earnings)}</td>
                    <td class="action-cell">
                        <button class="btn danger-btn delete-report" data-id="${report.id}">
                           <i class="fas fa-trash-alt"></i>
                        </button>
                        <!-- <button class="btn edit-report" data-id="${report.id}">
                           <i class="fas fa-edit"></i>
                        </button> -->
                    </td>
                `;
            });
        }
    }

     function handleReportTableClick(event) {
         if (event.target.closest('.delete-report')) {
             const button = event.target.closest('.delete-report');
             const reportId = parseInt(button.dataset.id, 10);
             deleteReport(reportId);
         }
         // Add logic for edit button if implemented
     }

    function deleteReport(id) {
        if (confirm('Opravdu chcete smazat tento záznam?')) {
            reports = reports.filter(report => report.id !== id);
            saveData();
            renderReportsTable();
            updateSummary();
            showNotification('Záznam smazán.', 'success');
        }
    }

    function clearReportFilters() {
        filterReportDateInput.value = '';
        filterReportPersonSelect.value = '';
        renderReportsTable();
    }


    // --- Finances Logic ---

    function showFinanceForm() {
        resetFinanceForm();
        financeFormDiv.classList.remove('hidden');
        addFinanceBtn.classList.add('hidden');
        financeDateInput.focus();
    }

    function hideFinanceForm() {
        financeFormDiv.classList.add('hidden');
        addFinanceBtn.classList.remove('hidden');
        editingFinanceId = null; // Reset editing state
    }

    function handleFinanceTypeChange() {
        const isIncome = financeTypeSelect.value === 'income';
        financeDebtPaymentDiv.style.display = isIncome ? 'flex' : 'none';
         // Also show person select only for income? Maybe keep it always visible for potential expense allocation.
         // financePersonSelect.closest('.form-group').style.display = isIncome ? 'block' : 'none';
         if (isIncome) {
             calculateDebtSplit(); // Recalculate if type changes to income
         } else {
             // Clear debt fields if switching to expense
             financeDebtRatioInput.value = 0;
             financeDebtAmountInput.value = '';
             financePayoutInput.value = '';
         }
    }

    function calculateDebtSplit() {
        if (financeTypeSelect.value !== 'income') return;

        const amount = parseFloat(financeAmountInput.value) || 0;
        const ratio = parseFloat(financeDebtRatioInput.value) || 0;

        if (amount <= 0) {
            financeDebtAmountInput.value = '';
            financePayoutInput.value = '';
            return;
        }

        const debtAmount = amount * (ratio / 100);
        const payoutAmount = amount - debtAmount;

        financeDebtAmountInput.value = debtAmount.toFixed(2);
        financePayoutInput.value = payoutAmount.toFixed(2);
    }

    function saveFinanceRecord() {
        const date = financeDateInput.value;
        const type = financeTypeSelect.value;
        const amount = parseFloat(financeAmountInput.value);
        const person = financePersonSelect.value || null; // Store null if no person selected
        const note = financeNoteInput.value.trim();

        if (!date) {
            showNotification("Prosím zadejte datum.", "error");
            financeDateInput.focus();
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showNotification("Prosím zadejte platnou kladnou částku.", "error");
            financeAmountInput.focus();
            return;
        }
         if (type === 'income' && !person) {
             showNotification("Pro příjem musíte vybrat osobu (Maru/Marty).", "error");
             financePersonSelect.focus();
             return;
         }


        let debtAmount = 0;
        let payoutAmount = amount; // Default for expenses or income with 0% debt

        if (type === 'income') {
            const ratio = parseFloat(financeDebtRatioInput.value) || 0;
             if (ratio < 0 || ratio > 100) {
                 showNotification("Splátka dluhu musí být mezi 0 a 100 %.", "error");
                 financeDebtRatioInput.focus();
                 return;
             }
            debtAmount = parseFloat((amount * (ratio / 100)).toFixed(2));
            payoutAmount = parseFloat((amount - debtAmount).toFixed(2));
        }

        const newFinanceRecord = {
            id: editingFinanceId || Date.now(), // Use existing ID if editing
            date: date,
            type: type,
            amount: amount,
            person: person,
            note: note,
            debtAmount: debtAmount, // Only relevant for income
            payoutAmount: payoutAmount // Relevant for income
        };

        if (editingFinanceId) {
            // Update existing record (implement later if needed)
            // finances = finances.map(f => f.id === editingFinanceId ? newFinanceRecord : f);
            showNotification('Funkce úprav zatím není implementována.', 'warning');
        } else {
            finances.push(newFinanceRecord);
            showNotification(`Finanční záznam (${type === 'income' ? 'Příjem' : 'Výdaj'}) úspěšně uložen.`, 'success');
        }

        sortData();
        saveData();
        renderFinancesTable();
        updateSummary();
        hideFinanceForm();
    }

    function resetFinanceForm() {
        setDefaultDates();
        financeTypeSelect.value = 'income';
        financeAmountInput.value = '';
        financePersonSelect.value = '';
        financeNoteInput.value = '';
        financeDebtRatioInput.value = '0'; // Default 0% debt split
        financeDebtAmountInput.value = '';
        financePayoutInput.value = '';
        financeDebtPaymentDiv.style.display = 'flex'; // Show by default as income is default type
        editingFinanceId = null;
    }


    // Finance Table & Filtering
    function renderFinancesTable() {
        financesTableBody.innerHTML = '';
        const filterDate = filterFinanceDateInput.value;
        const filterType = filterFinanceTypeSelect.value;
        const filterPerson = filterFinancePersonSelect.value;

        const filteredFinances = finances.filter(f => {
            const dateMatch = !filterDate || f.date === filterDate;
            const typeMatch = !filterType || f.type === filterType;
            // Person filter applies only if a person is set on the record OR filter is empty
            const personMatch = !filterPerson || (f.person && f.person === filterPerson) || (!f.person && filterPerson === '');
             // Refined personMatch: If filtering for 'Maru', show only Maru's. If filtering for '', show all (including null person).
              // Correct approach:
              let personMatchFilter = true;
              if (filterPerson) { // If a specific person filter is active
                  personMatchFilter = f.person === filterPerson;
              } // If filterPerson is '', show all

            return dateMatch && typeMatch && personMatchFilter;
        });


        if (filteredFinances.length === 0) {
            noFinancesMessage.classList.remove('hidden');
        } else {
            noFinancesMessage.classList.add('hidden');
            filteredFinances.forEach(f => {
                const row = financesTableBody.insertRow();
                const typeText = f.type === 'income' ? 'Příjem' : 'Výdaj';
                const amountClass = f.type === 'income' ? 'text-success' : 'text-danger'; // Add CSS classes later if needed

                row.innerHTML = `
                    <td>${f.date}</td>
                    <td>${typeText}</td>
                    <td>${f.person || '-'}</td>
                    <td class="${amountClass}">${formatCurrency(f.amount)}</td>
                    <td>${f.type === 'income' ? formatCurrency(f.debtAmount) : '-'}</td>
                    <td>${f.type === 'income' ? formatCurrency(f.payoutAmount) : '-'}</td>
                    <td>${f.note || '-'}</td>
                    <td class="action-cell">
                         <button class="btn danger-btn delete-finance" data-id="${f.id}">
                           <i class="fas fa-trash-alt"></i>
                        </button>
                       <!-- <button class="btn edit-finance" data-id="${f.id}">
                           <i class="fas fa-edit"></i>
                        </button> -->
                    </td>
                `;
            });
        }
    }

    function handleFinanceTableClick(event) {
         if (event.target.closest('.delete-finance')) {
             const button = event.target.closest('.delete-finance');
             const financeId = parseInt(button.dataset.id, 10);
             deleteFinance(financeId);
         }
         // Add logic for edit button if implemented
    }


    function deleteFinance(id) {
        if (confirm('Opravdu chcete smazat tento finanční záznam?')) {
            finances = finances.filter(f => f.id !== id);
            saveData();
            renderFinancesTable();
            updateSummary();
            showNotification('Finanční záznam smazán.', 'success');
        }
    }

    function clearFinanceFilters() {
        filterFinanceDateInput.value = '';
        filterFinanceTypeSelect.value = '';
        filterFinancePersonSelect.value = '';
        renderFinancesTable();
    }

    // --- Summary Logic ---
    function updateSummary() {
        let maruHours = 0, maruEarnings = 0, maruDebtPaid = 0, maruPaidOut = 0;
        let martyHours = 0, martyEarnings = 0, martyDebtPaid = 0, martyPaidOut = 0;
        let totalIncome = 0, totalExpenses = 0;

        // Calculate from reports
        reports.forEach(r => {
            if (r.person === 'Maru') {
                maruHours += r.hours;
                maruEarnings += r.earnings;
            } else if (r.person === 'Marty') {
                martyHours += r.hours;
                martyEarnings += r.earnings;
            }
        });

        // Calculate from finances
        finances.forEach(f => {
            if (f.type === 'income') {
                totalIncome += f.amount;
                if (f.person === 'Maru') {
                    maruDebtPaid += f.debtAmount;
                    maruPaidOut += f.payoutAmount;
                } else if (f.person === 'Marty') {
                    martyDebtPaid += f.debtAmount;
                    martyPaidOut += f.payoutAmount;
                }
            } else if (f.type === 'expense') {
                totalExpenses += f.amount;
                // Optional: Allocate expenses if needed in future
            }
        });

        // Update DOM
        maruTotalHoursSpan.textContent = `${formatHours(maruHours * 60)} hodin`;
        maruTotalEarningsSpan.textContent = formatCurrency(maruEarnings);
        maruDebtPaidSpan.textContent = formatCurrency(maruDebtPaid);
        maruPaidOutSpan.textContent = formatCurrency(maruPaidOut);

        martyTotalHoursSpan.textContent = `${formatHours(martyHours * 60)} hodin`;
        martyTotalEarningsSpan.textContent = formatCurrency(martyEarnings);
        martyDebtPaidSpan.textContent = formatCurrency(martyDebtPaid);
        martyPaidOutSpan.textContent = formatCurrency(martyPaidOut);

        totalHoursSpan.textContent = `${formatHours((maruHours + martyHours) * 60)} hodin`;
        totalEarningsSpan.textContent = formatCurrency(maruEarnings + martyEarnings);
        totalIncomeSpan.textContent = formatCurrency(totalIncome);
        totalExpensesSpan.textContent = formatCurrency(totalExpenses);
        totalPaidOutSpan.textContent = formatCurrency(maruPaidOut + martyPaidOut); // Total actually paid out after debt split
    }


     // --- Utility ---
     function sortData() {
         // Sort reports and finances by date, newest first
         reports.sort((a, b) => new Date(b.date + ' ' + (b.startTime || '00:00')) - new Date(a.date + ' ' + (a.startTime || '00:00')));
         finances.sort((a, b) => new Date(b.date) - new Date(a.date));
     }

    // --- CSV Export ---
    function exportDataCSV() {
        exportReportsCSV();
        exportFinancesCSV();
        showNotification('Data exportována do CSV souborů.', 'success');
    }

    function generateCSV(data, headers, filename) {
        const csvRows = [];
        // Add headers
        csvRows.push(headers.join(';')); // Use semicolon for Excel compatibility in some regions

        // Add data rows
        data.forEach(item => {
            const values = headers.map(headerKey => {
                let value = item[headerKey.toLowerCase().replace(/ /g, '').replace('(hod)', '').replace('(kč)', '').replace('(min)', 'minutes')]; // Map header to object key (needs adjustment)
                 // Manual mapping for clarity
                 switch(headerKey) {
                     case 'Datum': value = item.date; break;
                     case 'Osoba': value = item.person; break;
                     case 'Kategorie': value = item.category; break;
                     case 'Začátek': value = item.startTime; break;
                     case 'Konec': value = item.endTime; break;
                     case 'Pauza (min)': value = item.pauseMinutes; break;
                     case 'Odprac. (hod)': value = item.hours ? item.hours.toFixed(2).replace('.', ',') : ''; break;
                     case 'Výdělek (Kč)': value = item.earnings ? item.earnings.toFixed(2).replace('.', ',') : ''; break;
                     case 'Typ': value = item.type === 'income' ? 'Příjem' : 'Výdaj'; break;
                     case 'Částka (Kč)': value = item.amount ? item.amount.toFixed(2).replace('.', ',') : ''; break;
                     case 'Splátka dluhu (Kč)': value = item.debtAmount ? item.debtAmount.toFixed(2).replace('.', ',') : (item.type === 'income' ? '0,00' : ''); break;
                     case 'Vyplaceno (Kč)': value = item.payoutAmount ? item.payoutAmount.toFixed(2).replace('.', ',') : (item.type === 'income' ? '0,00' : ''); break;
                     case 'Poznámka': value = item.note; break;
                     default: value = item[headerKey]; // Fallback
                 }

                if (value === null || value === undefined) {
                    value = '';
                }
                // Escape quotes and handle semicolons within values
                let stringValue = String(value);
                if (stringValue.includes('"') || stringValue.includes(';') || stringValue.includes('\n')) {
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
            csvRows.push(values.join(';'));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel

        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            showNotification('Export CSV není podporován ve vašem prohlížeči.', 'error');
        }
    }

    function exportReportsCSV() {
        const headers = ['Datum', 'Osoba', 'Kategorie', 'Začátek', 'Konec', 'Pauza (min)', 'Odprac. (hod)', 'Výdělek (Kč)'];
        generateCSV(reports, headers, `pracovni_vykazy_${new Date().toISOString().slice(0,10)}.csv`);
    }

    function exportFinancesCSV() {
        const headers = ['Datum', 'Typ', 'Osoba', 'Částka (Kč)', 'Splátka dluhu (Kč)', 'Vyplaceno (Kč)', 'Poznámka'];
        generateCSV(finances, headers, `finance_${new Date().toISOString().slice(0,10)}.csv`);
    }

    // --- PWA Install Prompt ---
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        installAppBtn.classList.remove('hidden');
        console.log('`beforeinstallprompt` event fired.');
    });

    installAppBtn.addEventListener('click', async () => {
        // Hide the app provided install promotion
        installAppBtn.classList.add('hidden');
        // Show the install prompt
        if (!deferredPrompt) {
            console.log("Deferred prompt not available");
            return;
        }
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, discard it
        deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        // Hide the install button if the app is installed
        installAppBtn.classList.add('hidden');
        // Log install to analytics or console
        console.log('PWA was installed');
        deferredPrompt = null; // Clear the prompt
    });


    // --- Start the App ---
    init();
});

// --- END OF FILE app.js ---