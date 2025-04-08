// --- Vykreslení seznamu výkazů v accordion stylu ---
const renderWorkLogs = () => {
    // Najdeme container pro accordion
    const accordionContainer = document.getElementById('work-logs-accordion');
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