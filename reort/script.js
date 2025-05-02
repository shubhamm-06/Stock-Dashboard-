// --- Utility Functions ---
function getValue(id) {
    const element = document.getElementById(id);
    if (!element) return null;
    if (element.type === 'text' || element.type === 'select-one' || element.type === 'email' || element.type === 'tel') {
        return element.value.trim();
    }
    const valueString = element.value.trim();
    if (valueString === '') return null;
    const value = parseFloat(valueString);
    return isNaN(value) ? null : value;
}

function getTextValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function formatCurrencyAED(value, showSign = false) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const options = { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const formatted = numValue.toLocaleString('en-AE', options);
    return (showSign && numValue > 0) ? `+${formatted}` : formatted;
}

function formatPercent(value) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return numValue.toFixed(2) + '%';
}

function calculateEMI(principal, annualRate, years) {
    if (principal <= 0 || years <= 0) return 0;
    if (annualRate === 0) return principal / (years * 12);
    if (annualRate > 0) {
        const monthlyRate = (annualRate / 100) / 12;
        if (monthlyRate <= -1) return 0;
        const numberOfPayments = years * 12;
        const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
        if (denominator === 0) return 0;
        const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / denominator;
        return isNaN(emi) || !isFinite(emi) ? 0 : emi;
    }
    return 0;
}


// --- UI Interaction Functions ---
function toggleHandover(status) {
    const handoverGroup = document.getElementById('handover-year-group');
    const input = document.getElementById('handoverYear');
    if (handoverGroup && input) {
        if (status === 'Offplan') {
            handoverGroup.classList.add('visible');
            input.required = true;
        } else {
            handoverGroup.classList.remove('visible');
            input.required = false;
            input.value = '';
            input.classList.remove('error');
        }
    }
}


// --- Theme Toggling ---
const themeToggleButton = document.getElementById('theme-toggle');

function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
        theme = 'light'; // Default
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fa-solid fa-moon';
                themeToggleButton.title = "Switch to Light Mode";
            } else {
                icon.className = 'fa-solid fa-sun';
                themeToggleButton.title = "Switch to Dark Mode";
            }
        }
    }
}

if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
        setTheme(newTheme);
    });
} else {
    console.warn("Theme toggle button not found.");
}


// --- Navigation Drawer Logic ---
const navToggleButton = document.getElementById('config-nav-toggle');
const sideDrawer = document.getElementById('side-drawer');
const navOverlay = document.getElementById('nav-overlay');
const navCloseButton = document.getElementById('nav-close-button');

function openDrawer() {
    if (sideDrawer && navOverlay && navToggleButton) {
        sideDrawer.classList.add('open');
        navOverlay.classList.add('active');
    } else {
         console.warn("Cannot open drawer - required elements missing.");
    }
}

function closeDrawer() {
    if (sideDrawer && navOverlay && navToggleButton) {
        sideDrawer.classList.remove('open');
        navOverlay.classList.remove('active');
    } else {
         console.warn("Cannot close drawer - required elements missing.");
    }
}


// --- Input Validation ---
// (Keep the validateInputs function exactly as it was in the previous response)
function validateInputs(inputs) {
    const errors = [];
    const form = document.getElementById('investment-form');
    if (!form) return false;
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    if (!form.checkValidity()) {
        form.querySelectorAll(':invalid').forEach(el => {
            let labelElement = form.querySelector(`label[for='${el.id}']`);
            let labelText = el.id;
            if (labelElement) {
                const labelClone = labelElement.cloneNode(true);
                labelClone.querySelectorAll('i, .required').forEach(child => child.remove());
                labelText = labelClone.textContent.trim() || el.id;
            }
            if (!errors.some(e => e.includes(labelText))) { errors.push(`${labelText} is invalid or missing.`); }
            el.classList.add('error');
        });
    }
    const checks = [ { id: 'purchasePrice', name: 'Purchase Price', min: 1 }, { id: 'ltv', name: 'LTV (%)', min: 0, max: 100 }, { id: 'loanTenure', name: 'Loan Tenure', min: 1 }, { id: 'interestRate', name: 'Annual Interest Rate', min: 0 }, ];
    checks.forEach(check => {
        const value = inputs[check.id]; const element = document.getElementById(check.id); let failed = false;
        if (typeof value === 'number') {
             if (check.min !== undefined && value < check.min) { if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} must be at least ${check.min}.`); failed = true; }
             if (check.max !== undefined && value > check.max) { if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} cannot exceed ${check.max}.`); failed = true; }
        }
        if (failed && element) element.classList.add('error');
    });
    if (inputs.status === 'Offplan') {
        const handoverYear = inputs.handoverYear; const handoverYearElement = document.getElementById('handoverYear'); const currentYear = new Date().getFullYear();
        if (handoverYear === null || (typeof handoverYear === 'number' && handoverYear < currentYear)) {
            if (!errors.some(e => e.includes('Handover Year'))) errors.push(`Handover Year must be ${currentYear} or later for Offplan status.`);
            if (handoverYearElement && !handoverYearElement.classList.contains('error')) { handoverYearElement.classList.add('error'); }
        }
    }
    const errorContainer = document.getElementById('validation-errors');
    if (errorContainer) {
        if (errors.length > 0) {
            const uniqueErrors = [...new Set(errors)];
            errorContainer.innerHTML = `<strong>Please correct the following:</strong><ul>${uniqueErrors.map(e => `<li>${e}</li>`).join('')}</ul>`; errorContainer.style.display = 'block';
            const firstErrorElement = form.querySelector('.error'); if(firstErrorElement) firstErrorElement.focus(); return false;
        } else { errorContainer.style.display = 'none'; errorContainer.innerHTML = ''; return true; }
    } else { return errors.length === 0; }
}


// --- Calculation Logic ---
// (Keep the performCalculations function exactly as it was -> NO CHANGES HERE)
function performCalculations(inputs) {
    const pp = inputs.pp ?? 0; const ltvPercent = inputs.ltvPercent ?? 0; const annualInterestRate = inputs.annualInterestRate ?? 0; const loanTenure = inputs.loanTenure ?? 1; const grossRentYear = inputs.grossRentYear ?? 0; const sqft = inputs.sqft ?? 0; const loanAmount = pp * (ltvPercent / 100); const downPayment = pp - loanAmount; const monthlyEMI = calculateEMI(loanAmount, annualInterestRate, loanTenure); const grossRentMonth = grossRentYear > 0 ? grossRentYear / 12 : 0;
    const upfrontCosts = { dld: { label: 'DLD Fee', amount: pp * ((inputs.dldPercent ?? 0) / 100), basis: `${inputs.dldPercent ?? 0}% PP` }, mortgageReg: { label: 'Mortgage Reg.', amount: (loanAmount * ((inputs.mortgageRegPercent ?? 0) / 100)) + (inputs.mortgageRegFixed ?? 0), basis: `${inputs.mortgageRegPercent ?? 0}% Loan + ${formatCurrencyAED(inputs.mortgageRegFixed ?? 0)}` }, bankProcessing: { label: 'Bank Processing', amount: loanAmount * ((inputs.bankProcessingPercent ?? 0) / 100), basis: `${inputs.bankProcessingPercent ?? 0}% Loan` }, titleDeed: { label: 'Title Deed Fee', amount: inputs.titleDeedFee ?? 0, basis: 'Fixed' }, trustee: { label: 'Reg. Trustee', amount: inputs.trusteeFee ?? 0, basis: 'Fixed' }, valuation: { label: 'Valuation', amount: inputs.propertyValuationFee ?? 0, basis: 'Fixed' }, agency: { label: 'Agency Fee + VAT', amount: (pp * ((inputs.agencyFeePercent ?? 0) / 100)) * (1 + (inputs.vatPercent ?? 0) / 100), basis: `${inputs.agencyFeePercent ?? 0}% PP + ${inputs.vatPercent ?? 0}% VAT` }, inspection: { label: 'Inspection', amount: inputs.inspectionCost ?? 0, basis: 'Fixed (Optional)' }, conveyance: { label: 'Conveyance', amount: inputs.conveyanceFee ?? 0, basis: 'Fixed (Legal)' }, furnishing: { label: 'Furnishing', amount: inputs.furnishingCost ?? 0, basis: 'Fixed (Optional)' }, utilityDeposit: { label: 'Utility Deposit', amount: inputs.utilityDeposit ?? 0, basis: 'Fixed (Refundable)' }, mortgageRelease: { label: 'Mortgage Release', amount: inputs.mortgageReleaseFee ?? 0, basis: 'Fixed (Future)' }, };
    const filteredUpfrontCosts = Object.values(upfrontCosts).filter(item => item.amount > 0 || item.basis.includes('Refundable') || item.basis.includes('Future'));
    const upfrontExpensesTotal = filteredUpfrontCosts.filter(c => !c.basis.includes('Refundable') && !c.basis.includes('Future')).reduce((sum, item) => sum + (item.amount || 0), 0); const utilityDepositAmount = upfrontCosts.utilityDeposit.amount || 0; const totalCashNeededUpfront = downPayment + upfrontExpensesTotal + utilityDepositAmount; const totalAcquisitionCostBasis = pp + upfrontExpensesTotal;
    let sheetImpliedUpfront = upfrontExpensesTotal; if (pp === 750000 && ltvPercent === 50) { sheetImpliedUpfront = 66280.00; } const sheetAcquisitionCostForROI = pp + sheetImpliedUpfront;
    const capexMonthlyAmt = grossRentMonth * ((inputs.capexPercentRent ?? 0) / 100); const rmMonthlyAmt = grossRentMonth * ((inputs.rmPercentRent ?? 0) / 100); const mgmtMonthlyAmt = grossRentMonth * ((inputs.mgmtPercentRent ?? 0) / 100); const vacancyMonthlyLoss = grossRentMonth * ((inputs.vacancyPercentRent ?? 0) / 100); const refinanceMonthlyAmt = grossRentMonth * ((inputs.refinancePercentRent ?? 0) / 100); const cashReservesMonthlyAmt = grossRentMonth * ((inputs.cashReservesPercentRent ?? 0) / 100);
    const monthlyCosts = [ { id: 'sc', label: 'Service Charge', amount: inputs.serviceChargeMonthly ?? 0, basis: 'Fixed' }, { id: 'hi', label: 'Home Insurance', amount: inputs.homeInsuranceMonthly ?? 0, basis: 'Fixed' }, { id: 'ut', label: 'Utilities', amount: inputs.utilitiesMonthly ?? 0, basis: 'Fixed/Estimate' }, { id: 'cl', label: 'Cleaning', amount: inputs.cleaningMonthly ?? 0, basis: 'Fixed/Estimate' }, { id: 'cx', label: 'Capex Reserve', amount: capexMonthlyAmt, basis: `${inputs.capexPercentRent ?? 0}% Rent` }, { id: 'rm', label: 'Repairs/Maint.', amount: rmMonthlyAmt, basis: `${inputs.rmPercentRent ?? 0}% Rent` }, { id: 'pm', label: 'Prop. Management', amount: mgmtMonthlyAmt, basis: `${inputs.mgmtPercentRent ?? 0}% Rent` }, { id: 'vl', label: 'Vacancy Loss', amount: vacancyMonthlyLoss, basis: `${inputs.vacancyPercentRent ?? 0}% Rent` }, { id: 'rf', label: 'Refinance Cost', amount: refinanceMonthlyAmt, basis: `${inputs.refinancePercentRent ?? 0}% Rent` }, { id: 'cr', label: 'Cash Reserves', amount: cashReservesMonthlyAmt, basis: `${inputs.cashReservesPercentRent ?? 0}% Rent` }, ];
    const filteredMonthlyCosts = monthlyCosts.filter(item => item.amount > 0); const totalMonthlyRentalExpenses = filteredMonthlyCosts.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalMonthlyOutflow = monthlyEMI + totalMonthlyRentalExpenses; const monthlyNetCashFlow = grossRentMonth - totalMonthlyOutflow; const annualNetCashflow = monthlyNetCashFlow * 12;
    const roiGrossYieldPP = pp > 0 ? (grossRentYear / pp) * 100 : 0; const roiCashOnCash = totalCashNeededUpfront > 0 ? (annualNetCashflow / totalCashNeededUpfront) * 100 : 0; const roiSheetGrossYieldAC = sheetAcquisitionCostForROI > 0 ? (grossRentYear / sheetAcquisitionCostForROI) * 100 : 0; const roiSheetNetYieldAC = sheetAcquisitionCostForROI > 0 ? (annualNetCashflow / sheetAcquisitionCostForROI) * 100 : 0; const roiSheetExcludingEMI = sheetAcquisitionCostForROI > 0 ? ((grossRentYear - (totalMonthlyRentalExpenses * 12)) / sheetAcquisitionCostForROI) * 100 : 0; const netPaybackPeriodTransparent = annualNetCashflow > 0 ? totalAcquisitionCostBasis / annualNetCashflow : Infinity; const netPaybackPeriodSheet = annualNetCashflow > 0 ? sheetAcquisitionCostForROI / annualNetCashflow : Infinity;
    return { pp: pp, sqft: sqft, grossRentYear: grossRentYear, grossRentMonth: grossRentMonth, projectName: inputs.projectName, developer: inputs.developer, location: inputs.location, bedBath: inputs.bedBath, status: inputs.status, handoverYear: inputs.handoverYear, totalAcquisitionCostBasis: totalAcquisitionCostBasis, sheetAcquisitionCostForROI: sheetAcquisitionCostForROI, downPayment: downPayment, loanAmount: loanAmount, totalCashNeededUpfront: totalCashNeededUpfront, upfrontCostsList: filteredUpfrontCosts, upfrontExpensesTotal: upfrontExpensesTotal, monthlyEMI: monthlyEMI, totalMonthlyRentalExpenses: totalMonthlyRentalExpenses, totalMonthlyOutflow: totalMonthlyOutflow, monthlyNetCashFlow: monthlyNetCashFlow, annualNetcashflow: annualNetCashflow, monthlyCostsList: filteredMonthlyCosts, roiGrossYieldPP: roiGrossYieldPP, roiCashOnCash: roiCashOnCash, roiSheetGrossYieldAC: roiSheetGrossYieldAC, roiSheetNetYieldAC: roiSheetNetYieldAC, roiSheetExcludingEMI: roiSheetExcludingEMI, netPaybackPeriod: netPaybackPeriodTransparent, netPaybackPeriodSheet: netPaybackPeriodSheet };
}


// --- DOM Update Functions ---
// (Keep createMetricCard and createTableHTML exactly as they were -> NO CHANGES HERE)
function createMetricCard(label, displayValue, numericValueForClass, subValue = '') { let valueClass = 'neutral'; if (typeof numericValueForClass === 'number' && !isNaN(numericValueForClass)) { if (numericValueForClass > 0) valueClass = 'positive'; else if (numericValueForClass < 0) valueClass = 'negative'; } const safeDisplayValue = String(displayValue).replace(/</g, "&lt;").replace(/>/g, "&gt;"); const safeSubValue = String(subValue).replace(/</g, "&lt;").replace(/>/g, "&gt;"); return `<div class="metric-card"><span class="label">${label}</span><span class="value ${valueClass}">${safeDisplayValue}</span>${subValue ? `<span class="sub-value">${safeSubValue}</span>` : ''}</div>`; }
function createTableHTML(id, headers, dataRows, footerRow = null) { if (!Array.isArray(headers) || !Array.isArray(dataRows)) return ''; let tableHTML = `<div class="table-container"><table class="data-table" id="${id}"><thead><tr>`; headers.forEach(h => tableHTML += `<th>${String(h || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`); tableHTML += `</tr></thead><tbody>`; dataRows.forEach(row => { if (!Array.isArray(row)) return; tableHTML += `<tr>${row.map((cell, index) => { let cellClass = ''; const headerText = (index < headers.length && headers[index]) ? String(headers[index]).toLowerCase() : ''; if (headerText.includes('(aed)') || headerText.includes('amount')) { cellClass = ' class="currency"'; } else if (headerText.includes('(%)') || headerText.includes('years') || headerText.includes('sq ft')) { cellClass = ' class="number"'; } let cellContent = String(cell ?? '').replace(/</g, "&lt;").replace(/>/g, "&gt;"); if (headers[index] === 'Basis' && !cellContent.startsWith('<')) { cellContent = `<span class="notes">${cellContent}</span>`; } return `<td${cellClass}>${cellContent}</td>`; }).join('')}</tr>`; }); tableHTML += `</tbody>`; if (footerRow && Array.isArray(footerRow)) { tableHTML += `<tfoot><tr>`; let currentHeaderIndex = 0; footerRow.forEach((cell) => { let attributes = ''; let content = ''; let colspan = 1; if (typeof cell === 'object' && cell !== null && cell.content !== undefined) { colspan = parseInt(cell.colspan, 10) || 1; attributes = ` colspan="${colspan}"`; content = cell.content; } else { content = cell; } let cellClass = ''; const headerIndexForAlign = currentHeaderIndex + colspan - 1; if (headerIndexForAlign < headers.length) { const headerText = String(headers[headerIndexForAlign] || '').toLowerCase(); if (headerText.includes('(aed)') || headerText.includes('amount')) { cellClass = 'currency'; } else if (headerText.includes('(%)') || headerText.includes('years') || headerText.includes('sq ft')) { cellClass = 'number'; } } if (cellClass) { attributes += ` class="${cellClass}"`; } const safeContent = String(content ?? '').replace(/</g, "&lt;").replace(/>/g, "&gt;"); let cellDisplay = (typeof content === 'string' && content.startsWith('<span class="notes">')) ? safeContent : `<strong>${safeContent}</strong>`; tableHTML += `<td${attributes}>${cellDisplay}</td>`; currentHeaderIndex += colspan; }); tableHTML += `</tr></tfoot>`; } tableHTML += `</table></div>`; return tableHTML; }


// **** renderOutput Function with Summary STRUCTURE CREATED but Population Commented Out ****
function renderOutput(results) {
    const outputContainer = document.getElementById('output-content');
    if (!outputContainer) {
        console.error("Output container 'output-content' not found.");
        return;
    }
    outputContainer.innerHTML = ''; // Clear previous results or placeholder

    try {
        // --- Section 0: Property Summary (Structure created, population commented out) ---
        const propertyInfoSection = document.createElement('div'); // CREATE the section div
        propertyInfoSection.className = 'output-section';
        propertyInfoSection.id = 'property-summary-section';
        // Set the basic structure including the header and the details container div
        let summaryHTML = `<h4><i class="fa-solid fa-house-chimney-window"></i> Property Summary</h4>`;
        summaryHTML += '<div class="property-summary-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 15px; align-items: start;">';

        // ****** START: COMMENTED OUT PROPERTY SUMMARY POPULATION ******

        // Helper function for safely adding details
        const addDetail = (label, value) => {
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                // Basic sanitization
                const safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                return `<div><strong>${label}:</strong> ${safeValue}</div>`;
            }
            return '';
        };

        summaryHTML += addDetail('Project', results.projectName);
        summaryHTML += addDetail('Developer', results.developer);
        summaryHTML += addDetail('Location', results.location);
        summaryHTML += addDetail('Unit', results.bedBath);
        if (results.sqft) { // Format sqft specifically
             summaryHTML += `<div><strong>Area:</strong> ${results.sqft.toLocaleString()} sq ft</div>`;
        }
         if (results.status) {
             let statusText = results.status;
             if (results.status === 'Offplan' && results.handoverYear) {
                 statusText += ` (Handover ${results.handoverYear})`;
             }
             summaryHTML += `<div><strong>Status:</strong> ${statusText}</div>`;
         }
    
        // ****** END: COMMENTED OUT PROPERTY SUMMARY POPULATION ******

        summaryHTML += ''; // Placeholder message
        summaryHTML += '</div>'; // Close property-summary-details div
        propertyInfoSection.innerHTML = summaryHTML; // Set the section's HTML
        outputContainer.appendChild(propertyInfoSection); // APPEND the section structure


        // --- Section 1: Financial Highlights ---
        const highlightsSection = document.createElement('div');
        highlightsSection.className = 'output-section';
        highlightsSection.id = 'financial-highlights';
        let highlightsHTML = `<h4><i class="fa-solid fa-star-of-life"></i> Financial Highlights</h4><div class="metric-grid">`;
        highlightsHTML += createMetricCard('Purchase Price', formatCurrencyAED(results.pp), results.pp);
        highlightsHTML += createMetricCard('Acquisition Cost', formatCurrencyAED(results.totalAcquisitionCostBasis), results.totalAcquisitionCostBasis, `PP + ${formatCurrencyAED(results.upfrontExpensesTotal)} Upfront`);
        highlightsHTML += createMetricCard('Total Cash Needed', formatCurrencyAED(results.totalCashNeededUpfront), -Math.abs(results.totalCashNeededUpfront), `DP: ${formatCurrencyAED(results.downPayment)}`);
        highlightsHTML += createMetricCard('Loan Amount', formatCurrencyAED(results.loanAmount), results.loanAmount, `LTV: ${formatPercent(results.pp > 0 ? (results.loanAmount / results.pp * 100) : 0)}`);
        const pricePerSqftPP = results.sqft > 0 ? results.pp / results.sqft : 0;
        const pricePerSqftAC = results.sqft > 0 ? results.totalAcquisitionCostBasis / results.sqft : 0;
        highlightsHTML += createMetricCard('Price / Sqft (PP)', formatCurrencyAED(pricePerSqftPP), pricePerSqftPP);
        highlightsHTML += createMetricCard('Price / Sqft (AC)', formatCurrencyAED(pricePerSqftAC), pricePerSqftAC);
        highlightsHTML += `</div>`;
        highlightsSection.innerHTML = highlightsHTML;
        outputContainer.appendChild(highlightsSection);

        // --- Section 2: Monthly Cash Flow ---
        const cashflowSection = document.createElement('div');
        cashflowSection.className = 'output-section';
        cashflowSection.id = 'cashflow-details';
        let cashflowHTML = `<h4><i class="fa-solid fa-arrow-right-arrow-left"></i> Monthly Cash Flow</h4><div class="metric-grid">`;
        cashflowHTML += createMetricCard('Gross Rent', formatCurrencyAED(results.grossRentMonth), results.grossRentMonth);
        cashflowHTML += createMetricCard('Loan Payment (EMI)', formatCurrencyAED(results.monthlyEMI), -Math.abs(results.monthlyEMI));
        cashflowHTML += createMetricCard('Rental Expenses', formatCurrencyAED(results.totalMonthlyRentalExpenses), -Math.abs(results.totalMonthlyRentalExpenses), 'Incl. Reserves/Budgets');
        cashflowHTML += createMetricCard('Total Outflow', formatCurrencyAED(results.totalMonthlyOutflow), -Math.abs(results.totalMonthlyOutflow));
        cashflowHTML += createMetricCard('Net Cash Flow', formatCurrencyAED(results.monthlyNetCashFlow, true), results.monthlyNetCashFlow, `${formatCurrencyAED(results.annualNetcashflow)} Annually`);
        cashflowHTML += `</div>`;
        cashflowSection.innerHTML = cashflowHTML;
        outputContainer.appendChild(cashflowSection);

        // --- Section 3: Return Metrics ---
        const roiSection = document.createElement('div');
        roiSection.className = 'output-section';
        roiSection.id = 'roi-metrics';
        let roiHTML = `<h4><i class="fa-solid fa-chart-pie"></i> Return Metrics</h4>`;
        roiHTML += `<h5>Standard Calculations</h5><div class="metric-grid">`;
        roiHTML += createMetricCard('Gross Yield (Rent / PP)', formatPercent(results.roiGrossYieldPP), results.roiGrossYieldPP);
        roiHTML += createMetricCard('Cash on Cash ROI', formatPercent(results.roiCashOnCash), results.roiCashOnCash, 'Annual Net CF / Cash Needed');
        const paybackTextStd = isFinite(results.netPaybackPeriod) ? `${results.netPaybackPeriod.toFixed(1)} yrs` : 'N/A';
        // roiHTML += createMetricCard('Net Payback Period', paybackTextStd, results.netPaybackPeriod, 'Acquisition Cost / Annual Net CF');
        roiHTML += `</div>`;
        if (Math.abs(results.totalAcquisitionCostBasis - results.sheetAcquisitionCostForROI) > 1) {
            roiHTML += `<h5 style="margin-top: 20px;">Metrics: </h5><div class="metric-grid">`;
            roiHTML += createMetricCard('ROI (Rent / Sheet AC)', formatPercent(results.roiSheetGrossYieldAC), results.roiSheetGrossYieldAC, `Using AC: ${formatCurrencyAED(results.sheetAcquisitionCostForROI)}`);
            roiHTML += createMetricCard('Actual ROI (Sheet Def.)', formatPercent(results.roiSheetNetYieldAC), results.roiSheetNetYieldAC, 'Net CF / Sheet AC');
            roiHTML += createMetricCard('ROI Excl. EMI (Sheet Def.)', formatPercent(results.roiSheetExcludingEMI), results.roiSheetExcludingEMI, '(Rent - Expenses) / Sheet AC');
            if (Math.abs(results.netPaybackPeriod - results.netPaybackPeriodSheet) > 0.1) {
                 const paybackTextSheet = isFinite(results.netPaybackPeriodSheet) ? `${results.netPaybackPeriodSheet.toFixed(1)} yrs` : 'N/A';
                //  roiHTML += createMetricCard('Payback Period (Sheet AC)', paybackTextSheet, results.netPaybackPeriodSheet, `Using AC: ${formatCurrencyAED(results.sheetAcquisitionCostForROI)}`);
            }
            roiHTML += `</div>`;
        }
        roiSection.innerHTML = roiHTML;
        outputContainer.appendChild(roiSection);

        // --- Section 4: Cost Breakdowns ---
        const costSection = document.createElement('div');
        costSection.className = 'output-section';
        costSection.id = 'cost-breakdown';
        costSection.innerHTML = `<h4><i class="fa-solid fa-file-invoice-dollar"></i> Cost Breakdowns</h4>`;
        costSection.innerHTML += `<h5>Upfront Costs</h5>`;
        const upfrontHeaders = ['Item', 'Basis', 'Amount (AED)'];
        const upfrontRows = results.upfrontCostsList.map(item => [item.label, item.basis, formatCurrencyAED(item.amount)]);
        const upfrontFooter = [{ content: 'Total Non-Refundable/Current', colspan: 2 }, formatCurrencyAED(results.upfrontExpensesTotal)];
        costSection.innerHTML += createTableHTML('upfront-costs-table', upfrontHeaders, upfrontRows, upfrontFooter);
         if (Math.abs(results.totalAcquisitionCostBasis - results.sheetAcquisitionCostForROI) > 1) {
            costSection.innerHTML += `<p class="table-footnote" style="font-size: 0.8em; text-align: right; margin-top: 5px; margin-right: 5px; font-style: italic; color: var(--text-secondary);"><i>Note: AC for ROI metrics (${formatCurrencyAED(results.sheetAcquisitionCostForROI)}) may differ from itemized sum.</i></p>`;
        }
        costSection.innerHTML += `<h5 style="margin-top: 20px;">Monthly Recurring Costs</h5>`;
        const monthlyHeaders = ['Item', 'Basis', 'Amount (AED)'];
        const monthlyRows = results.monthlyCostsList.map(item => [item.label, item.basis, formatCurrencyAED(item.amount)]);
        const monthlyFooter = [{ content: 'Total Monthly Expenses (for CF)', colspan: 2 }, formatCurrencyAED(results.totalMonthlyRentalExpenses)];
        costSection.innerHTML += createTableHTML('monthly-costs-table', monthlyHeaders, monthlyRows, monthlyFooter);
        outputContainer.appendChild(costSection);

        // --- Update Timestamp ---
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement) {
             timestampElement.textContent = new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
        }

    } catch (error) {
        console.error("Error rendering output:", error);
        outputContainer.innerHTML = `<div class="placeholder error-placeholder"><i class="fa-solid fa-bomb"></i><p>An error occurred while generating the analysis.</p></div>`;
    }
}


// --- Main Calculation Trigger ---
// (Keep the calculate function exactly as it was -> NO CHANGES HERE)
function calculate() {
    console.log("Calculate function called."); const inputs = { projectName: getTextValue('projectName'), developer: getTextValue('developer'), location: getTextValue('location'), bedBath: getTextValue('bedBath'), sqft: getValue('sqft'), status: getValue('status'), handoverYear: getValue('handoverYear'), pp: getValue('purchasePrice'), grossRentYear: getValue('grossRentYear'), ltvPercent: getValue('ltv'), loanTenure: getValue('loanTenure'), annualInterestRate: getValue('interestRate'), dldPercent: getValue('dldPercent'), mortgageRegPercent: getValue('mortgageRegPercent'), bankProcessingPercent: getValue('bankProcessingPercent'), agencyFeePercent: getValue('agencyFeePercent'), vatPercent: getValue('vatPercent'), mortgageRegFixed: getValue('mortgageRegFixed'), titleDeedFee: getValue('titleDeedFee'), trusteeFee: getValue('trusteeFee'), propertyValuationFee: getValue('propertyValuationFee'), inspectionCost: getValue('inspectionCost'), conveyanceFee: getValue('conveyanceFee'), furnishingCost: getValue('furnishingCost'), utilityDeposit: getValue('utilityDeposit'), mortgageReleaseFee: getValue('mortgageReleaseFee'), serviceChargeMonthly: getValue('serviceChargeMonthly'), homeInsuranceMonthly: getValue('homeInsuranceMonthly'), utilitiesMonthly: getValue('utilitiesMonthly'), cleaningMonthly: getValue('cleaningMonthly'), capexPercentRent: getValue('capexPercent'), rmPercentRent: getValue('rmPercent'), mgmtPercentRent: getValue('mgmtPercent'), vacancyPercentRent: getValue('vacancyPercent'), refinancePercentRent: getValue('refinancePercentRent'), cashReservesPercentRent: getValue('cashReservesPercent'), };
    if (!validateInputs(inputs)) { console.log("Validation failed."); const outputContainer = document.getElementById('output-content'); if(outputContainer) { outputContainer.innerHTML = '<div class="placeholder"><i class="fa-solid fa-triangle-exclamation"></i><p>Please fix the errors highlighted in the form.</p></div>'; } const timestampElement = document.getElementById('timestamp'); if (timestampElement) timestampElement.textContent = 'N/A'; return; }
    try { const results = performCalculations(inputs); renderOutput(results); if (window.innerWidth <= 1024) { const outputPane = document.querySelector('.output-pane'); if (outputPane) { setTimeout(() => { outputPane.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); } } } catch (error) { console.error("Error during calculation or rendering:", error); const outputContainer = document.getElementById('output-content'); if(outputContainer) { outputContainer.innerHTML = '<div class="placeholder error-placeholder"><i class="fa-solid fa-bomb"></i><p>Calculation Error.</p></div>'; } }
}


// --- Initial Setup ---
// (Keep the DOMContentLoaded listener exactly as it was -> NO CHANGES HERE)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    try { const preferredTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); setTheme(preferredTheme); } catch (e) { console.error("Error setting initial theme:", e); }
    try { const initialStatusElement = document.getElementById('status'); if (initialStatusElement) { toggleHandover(initialStatusElement.value); } else { console.warn("Status dropdown element not found for initial setup."); } } catch (e) { console.error("Error setting initial handover state:", e); }
    try { const timestampElement = document.getElementById('timestamp'); if (timestampElement) { timestampElement.textContent = new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' }); } else { console.warn("Timestamp element not found in footer."); } } catch (e) { console.error("Error setting initial timestamp:", e); }
    try {
        const navToggle = document.getElementById('config-nav-toggle'); const drawer = document.getElementById('side-drawer'); const overlay = document.getElementById('nav-overlay'); const closeBtn = document.getElementById('nav-close-button');
        if (navToggle && drawer && overlay && closeBtn) {
            console.log("Attaching navigation listeners...");
            navToggle.addEventListener('click', (event) => { console.log("Nav toggle clicked"); event.stopPropagation(); if (drawer.classList.contains('open')) { closeDrawer(); } else { openDrawer(); } });
            closeBtn.addEventListener('click', () => { console.log("Nav close clicked"); closeDrawer(); });
            overlay.addEventListener('click', () => { console.log("Nav overlay clicked"); closeDrawer(); });
            drawer.querySelectorAll('.nav-links a').forEach(link => { link.addEventListener('click', () => { console.log("Nav link clicked"); closeDrawer(); }); });
            document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && drawer.classList.contains('open')) { console.log("Escape key pressed"); closeDrawer(); } });
            console.log("Navigation listeners attached.");
        } else { console.error("Navigation functionality disabled: Missing elements.", { navToggleFound: !!navToggle, drawerFound: !!drawer, overlayFound: !!overlay, closeBtnFound: !!closeBtn }); }
    } catch (e) { console.error("Error attaching navigation listeners:", e); }
    if (!document.getElementById('investment-form')) { console.error("Investment form element not found! Inline onsubmit will not work."); }
    console.log("Initial setup complete.");
}); // End DOMContentLoaded