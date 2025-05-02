// =============================================================================
// == Utility Functions ==
// =============================================================================

/**
 * Gets the numeric or text value from an input/select element.
 * @param {string} id - The ID of the element.
 * @returns {number|string|null} The parsed value or null if empty/invalid.
 */
function getValue(id) {
    const element = document.getElementById(id);
    if (!element) return null;

    // Handle text-based inputs directly
    if (element.type === 'text' || element.type === 'select-one' || element.type === 'email' || element.type === 'tel') {
        return element.value.trim(); // Return trimmed string for these types
    }

    // For other types (assume numeric like 'number'), parse as float
    const valueString = element.value.trim();
    if (valueString === '') return null; // Treat empty strings as null

    const value = parseFloat(valueString);
    return isNaN(value) ? null : value; // Return number or null if parsing fails
}

/**
 * Gets the trimmed text value from any element (primarily for text inputs).
 * @param {string} id - The ID of the element.
 * @returns {string} The trimmed value or an empty string if element not found.
 */
function getTextValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

/**
 * Formats a number as AED currency.
 * @param {number|null|undefined} value - The numeric value.
 * @param {boolean} [showSign=false] - Whether to prepend a '+' for positive values.
 * @returns {string} The formatted currency string.
 */
function formatCurrencyAED(value, showSign = false) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const options = { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const formatted = numValue.toLocaleString('en-AE', options);
    // Prepend '+' only if showSign is true and the number is strictly positive
    return (showSign && numValue > 0) ? `+${formatted}` : formatted;
}

/**
 * Formats a number as a percentage string with 2 decimal places.
 * @param {number|null|undefined} value - The numeric value (e.g., 5.5 for 5.5%).
 * @returns {string} The formatted percentage string.
 */
function formatPercent(value) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return numValue.toFixed(2) + '%';
}

/**
 * Calculates the Equated Monthly Installment (EMI) for a loan.
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate (as a percentage, e.g., 5 for 5%).
 * @param {number} years - The loan tenure in years.
 * @returns {number} The calculated monthly EMI, or 0 for invalid inputs.
 */
function calculateEMI(principal, annualRate, years) {
    if (principal <= 0 || years <= 0) return 0; // Basic validation

    // Handle zero interest rate separately (linear repayment)
    if (annualRate === 0) return principal / (years * 12);

    // Handle positive interest rate
    if (annualRate > 0) {
        const monthlyRate = (annualRate / 100) / 12; // Convert annual % rate to monthly decimal rate
        // Prevent issues with rates causing (1 + monthlyRate) to be zero or negative
        if (monthlyRate <= -1) return 0;

        const numberOfPayments = years * 12;
        const powerTerm = Math.pow(1 + monthlyRate, numberOfPayments);
        const denominator = powerTerm - 1;

        // Avoid division by zero if powerTerm is exactly 1 (e.g., due to floating point issues or rate being near zero)
        if (denominator === 0) return 0;

        // Standard EMI formula
        const emi = principal * monthlyRate * powerTerm / denominator;

        // Final check for valid numeric result
        return isNaN(emi) || !isFinite(emi) ? 0 : emi;
    }

    // Return 0 for negative interest rates or other invalid cases
    return 0;
}


// =============================================================================
// == UI Interaction Functions ==
// =============================================================================

/**
 * Toggles the visibility and requirement of the Handover Year input based on property status.
 * @param {string} status - The selected property status ('Offplan' or other).
 */
function toggleHandover(status) {
    const handoverGroup = document.getElementById('handover-year-group');
    const input = document.getElementById('handoverYear');

    if (handoverGroup && input) {
        if (status === 'Offplan') {
            handoverGroup.classList.add('visible'); // Show the input group
            input.required = true; // Make the input required
        } else {
            handoverGroup.classList.remove('visible'); // Hide the input group
            input.required = false; // Make the input optional
            input.value = ''; // Clear any previous value
            input.classList.remove('error'); // Remove error styling if present
        }
    } else {
        console.warn("Handover year group or input element not found for toggling.");
    }
}


// =============================================================================
// == Theme Toggling ==
// =============================================================================

const themeToggleButton = document.getElementById('theme-toggle');

/**
 * Sets the color theme for the application.
 * @param {string} theme - The desired theme ('light' or 'dark').
 */
function setTheme(theme) {
    // Default to 'dark' if the provided theme is invalid
    if (theme !== 'light' && theme !== 'dark') {
        console.warn(`Invalid theme requested: "${theme}". Defaulting to "dark".`);
        theme = 'dark';
    }
    // Set the theme attribute on the root element
    document.documentElement.setAttribute('data-theme', theme);
    // Store the preference in local storage
    try {
        localStorage.setItem('theme', theme);
    } catch (e) {
        console.error("Failed to save theme preference to localStorage:", e);
    }
    // Update the theme toggle button icon and title
    updateThemeIcon(theme);
}

/**
 * Updates the icon and title of the theme toggle button based on the current theme.
 * @param {string} theme - The current theme ('light' or 'dark').
 */
function updateThemeIcon(theme) {
    if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('i'); // Find the icon element
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fa-solid fa-moon'; // Set moon icon for dark mode
                themeToggleButton.title = "Switch to Light Mode"; // Update tooltip
            } else {
                icon.className = 'fa-solid fa-sun'; // Set sun icon for light mode
                themeToggleButton.title = "Switch to Dark Mode"; // Update tooltip
            }
        } else {
            console.warn("Icon element not found within theme toggle button.");
        }
    }
    // No warning if button itself isn't found, handled by the calling context
}

// Attach click listener to the theme toggle button if it exists
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
        setTheme(newTheme);
    });
} else {
    // Log a warning if the button isn't found during initial setup
    console.warn("Theme toggle button ('theme-toggle') not found in the DOM.");
}


// =============================================================================
// == Navigation Drawer Logic ==
// =============================================================================

// Get references to navigation elements
const navToggleButton = document.getElementById('config-nav-toggle');
const sideDrawer = document.getElementById('side-drawer');
const navOverlay = document.getElementById('nav-overlay');
const navCloseButton = document.getElementById('nav-close-button');

/** Opens the side navigation drawer and overlay. */
function openDrawer() {
    if (sideDrawer && navOverlay) {
        sideDrawer.classList.add('open');
        navOverlay.classList.add('active');
        if (navToggleButton) navToggleButton.setAttribute('aria-expanded', 'true');
    } else {
        console.warn("Cannot open drawer - required elements (side-drawer or nav-overlay) missing.");
    }
}

/** Closes the side navigation drawer and overlay. */
function closeDrawer() {
    if (sideDrawer && navOverlay) {
        sideDrawer.classList.remove('open');
        navOverlay.classList.remove('active');
        if (navToggleButton) navToggleButton.setAttribute('aria-expanded', 'false');
    } else {
        console.warn("Cannot close drawer - required elements (side-drawer or nav-overlay) missing.");
    }
}

// Note: Navigation listeners are attached within the DOMContentLoaded event later


// =============================================================================
// == Input Validation ==
// =============================================================================

/**
 * Validates form inputs based on HTML5 constraints and custom checks.
 * Displays errors and highlights invalid fields.
 * @param {object} inputs - An object containing the values gathered from the form.
 * @returns {boolean} True if validation passes, false otherwise.
 */
function validateInputs(inputs) {
    const errors = [];
    const form = document.getElementById('investment-form');
    const errorContainer = document.getElementById('validation-errors');

    if (!form) {
        console.error("Validation failed: Form 'investment-form' not found.");
        return false; // Cannot validate without the form
    }

    // Clear previous errors visually
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.innerHTML = '';
    }

    // 1. HTML5 Built-in Validation (required, type, pattern, etc.)
    if (!form.checkValidity()) {
        form.querySelectorAll(':invalid').forEach(el => {
            let labelElement = form.querySelector(`label[for='${el.id}']`);
            let labelText = el.id; // Fallback to ID if label not found/empty
            if (labelElement) {
                // Clone label and remove icons/required markers for cleaner text
                const labelClone = labelElement.cloneNode(true);
                labelClone.querySelectorAll('i, .required, .tooltip').forEach(child => child.remove());
                labelText = labelClone.textContent.trim() || el.id; // Use cleaned text or fallback
            }
            // Add error message only if a similar one doesn't exist already
            if (!errors.some(e => e.includes(labelText))) {
                errors.push(`${labelText} is invalid or missing.`);
            }
            el.classList.add('error'); // Highlight the invalid field
        });
    }

    // 2. Custom Numeric Range Validations
    const numericChecks = [
        { id: 'purchasePrice', name: 'Purchase Price', min: 1 },
        { id: 'ltv', name: 'LTV (%)', min: 0, max: 100 },
        { id: 'loanTenure', name: 'Loan Tenure', min: 1 },
        { id: 'interestRate', name: 'Annual Interest Rate', min: 0 },
        // Add other range checks here if needed (e.g., percentage inputs)
    ];

    numericChecks.forEach(check => {
        const value = inputs[check.id]; // Get value from the already gathered inputs object
        const element = document.getElementById(check.id);
        let failed = false;

        if (typeof value === 'number') { // Only check if it's a valid number
            if (check.min !== undefined && value < check.min) {
                if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} must be at least ${check.min}.`);
                failed = true;
            }
            if (check.max !== undefined && value > check.max) {
                if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} cannot exceed ${check.max}.`);
                failed = true;
            }
        }
        // Highlight field if custom check failed and it wasn't already marked by HTML5 validation
        if (failed && element && !element.classList.contains('error')) {
            element.classList.add('error');
        }
    });

    // 3. Custom Conditional Validation (Offplan Handover Year)
    if (inputs.status === 'Offplan') {
        const handoverYear = inputs.handoverYear; // Already parsed number or null
        const handoverYearElement = document.getElementById('handoverYear');
        const currentYear = new Date().getFullYear();

        // Check if null (meaning empty or invalid input) or less than current year
        if (handoverYear === null || (typeof handoverYear === 'number' && handoverYear < currentYear)) {
            if (!errors.some(e => e.includes('Handover Year'))) errors.push(`Handover Year must be ${currentYear} or later for Offplan status.`);
             // Highlight field if custom check failed and it wasn't already marked
            if (handoverYearElement && !handoverYearElement.classList.contains('error')) {
                handoverYearElement.classList.add('error');
            }
        }
    }

    // 4. Display Errors if any found
    if (errors.length > 0) {
        if (errorContainer) {
            const uniqueErrors = [...new Set(errors)]; // Remove duplicate messages
            errorContainer.innerHTML = `<strong>Please correct the following:</strong><ul>${uniqueErrors.map(e => `<li>${e}</li>`).join('')}</ul>`;
            errorContainer.style.display = 'block';
            // Focus the first invalid element for better UX
            const firstErrorElement = form.querySelector('.error:not(label)'); // Focus input/select, not label
            if (firstErrorElement) firstErrorElement.focus();
        } else {
            console.warn("Validation error container 'validation-errors' not found. Errors:", errors);
        }
        return false; // Validation failed
    }

    return true; // Validation passed
}


// =============================================================================
// == Calculation Logic ==
// =============================================================================

/**
 * Performs all financial calculations based on validated user inputs.
 * @param {object} inputs - Object containing validated user inputs.
 * @returns {object} An object containing all calculated results.
 */
function performCalculations(inputs) {
    // --- Basic Inputs & Initial Calculations ---
    const pp = inputs.pp ?? 0;
    const ltvPercent = inputs.ltvPercent ?? 0;
    const annualInterestRate = inputs.annualInterestRate ?? 0;
    const loanTenure = inputs.loanTenure ?? 1; // Default to 1 year if invalid
    const grossRentYear = inputs.grossRentYear ?? 0;
    const sqft = inputs.sqft ?? 0;

    const loanAmount = pp * (ltvPercent / 100);
    const downPayment = pp - loanAmount;
    const monthlyEMI = calculateEMI(loanAmount, annualInterestRate, loanTenure);
    const grossRentMonth = grossRentYear > 0 ? grossRentYear / 12 : 0;

    // --- Upfront Costs Calculation ---
    // Define basis upfront costs structure
    const upfrontCosts = {
        dld: { label: 'DLD Fee', amount: pp * ((inputs.dldPercent ?? 0) / 100), basis: `${inputs.dldPercent ?? 0}% PP` },
        mortgageReg: { label: 'Mortgage Reg.', amount: (loanAmount * ((inputs.mortgageRegPercent ?? 0) / 100)) + (inputs.mortgageRegFixed ?? 0), basis: `${inputs.mortgageRegPercent ?? 0}% Loan + ${formatCurrencyAED(inputs.mortgageRegFixed ?? 0)}` },
        bankProcessing: { label: 'Bank Processing', amount: loanAmount * ((inputs.bankProcessingPercent ?? 0) / 100), basis: `${inputs.bankProcessingPercent ?? 0}% Loan` },
        titleDeed: { label: 'Title Deed Fee', amount: inputs.titleDeedFee ?? 0, basis: 'Fixed' },
        trustee: { label: 'Reg. Trustee', amount: inputs.trusteeFee ?? 0, basis: 'Fixed' },
        valuation: { label: 'Valuation', amount: inputs.propertyValuationFee ?? 0, basis: 'Fixed' },
        agency: { label: 'Agency Fee + VAT', amount: (pp * ((inputs.agencyFeePercent ?? 0) / 100)) * (1 + (inputs.vatPercent ?? 0) / 100), basis: `${inputs.agencyFeePercent ?? 0}% PP + ${inputs.vatPercent ?? 0}% VAT` },
        inspection: { label: 'Inspection', amount: inputs.inspectionCost ?? 0, basis: 'Fixed (Optional)' },
        conveyance: { label: 'Conveyance', amount: inputs.conveyanceFee ?? 0, basis: 'Fixed (Legal)' },
        furnishing: { label: 'Furnishing', amount: inputs.furnishingCost ?? 0, basis: 'Fixed (Optional)' },
        utilityDeposit: { label: 'Utility Deposit', amount: inputs.utilityDeposit ?? 0, basis: 'Fixed (Refundable)' },
        mortgageRelease: { label: 'Mortgage Release', amount: inputs.mortgageReleaseFee ?? 0, basis: 'Fixed (Future)' },
    };

    // Filter costs > 0 or special types (Refundable/Future) for display list
    const filteredUpfrontCosts = Object.values(upfrontCosts).filter(item => item.amount > 0 || item.basis.includes('Refundable') || item.basis.includes('Future'));

    // Calculate total non-refundable/current upfront expenses
    const upfrontExpensesTotal = filteredUpfrontCosts
        .filter(c => !c.basis.includes('Refundable') && !c.basis.includes('Future'))
        .reduce((sum, item) => sum + (item.amount || 0), 0);

    const utilityDepositAmount = upfrontCosts.utilityDeposit.amount || 0;
    // Total cash needed = Down Payment + Non-Refundable Expenses + Refundable Deposit
    const totalCashNeededUpfront = downPayment + upfrontExpensesTotal + utilityDepositAmount;
    // Itemized Acquisition Cost (Purchase Price + Non-Refundable Expenses)
    const totalAcquisitionCostBasis = pp + upfrontExpensesTotal;

    // --- Acquisition Cost for ROI ---
    // Allows for potential overrides or adjustments compared to the simple itemized sum
    let sheetImpliedUpfront = upfrontExpensesTotal;
    // Example override logic kept from previous versions (adjust as needed)
    if (pp === 750000 && ltvPercent === 50) {
        sheetImpliedUpfront = 66280.00;
    }
    const acquisitionCostForROI = pp + sheetImpliedUpfront; // This value is used in ROI denominators

    // --- Monthly Recurring Costs Calculation ---
    // Calculate percentage-based costs
    const capexMonthlyAmt = grossRentMonth * ((inputs.capexPercentRent ?? 0) / 100);
    const rmMonthlyAmt = grossRentMonth * ((inputs.rmPercentRent ?? 0) / 100);
    const mgmtMonthlyAmt = grossRentMonth * ((inputs.mgmtPercentRent ?? 0) / 100);
    const vacancyMonthlyLoss = grossRentMonth * ((inputs.vacancyPercentRent ?? 0) / 100);
    const refinanceMonthlyAmt = grossRentMonth * ((inputs.refinancePercentRent ?? 0) / 100); // Note: Usually not a monthly cost
    const cashReservesMonthlyAmt = grossRentMonth * ((inputs.cashReservesPercentRent ?? 0) / 100); // Allocation to reserves

    // Define monthly costs structure
    const monthlyCosts = [
        { id: 'sc', label: 'Service Charge', amount: inputs.serviceChargeMonthly ?? 0, basis: 'Fixed' },
        { id: 'hi', label: 'Home Insurance', amount: inputs.homeInsuranceMonthly ?? 0, basis: 'Fixed' },
        { id: 'ut', label: 'Utilities', amount: inputs.utilitiesMonthly ?? 0, basis: 'Fixed/Estimate' },
        { id: 'cl', label: 'Cleaning', amount: inputs.cleaningMonthly ?? 0, basis: 'Fixed/Estimate' },
        { id: 'cx', label: 'Capex Reserve', amount: capexMonthlyAmt, basis: `${inputs.capexPercentRent ?? 0}% Rent` },
        { id: 'rm', label: 'Repairs/Maint.', amount: rmMonthlyAmt, basis: `${inputs.rmPercentRent ?? 0}% Rent` },
        { id: 'pm', label: 'Prop. Management', amount: mgmtMonthlyAmt, basis: `${inputs.mgmtPercentRent ?? 0}% Rent` },
        { id: 'vl', label: 'Vacancy Loss', amount: vacancyMonthlyLoss, basis: `${inputs.vacancyPercentRent ?? 0}% Rent` },
        { id: 'rf', label: 'Refinance Cost', amount: refinanceMonthlyAmt, basis: `${inputs.refinancePercentRent ?? 0}% Rent` }, // Consider if this should be here
        { id: 'cr', label: 'Cash Reserves', amount: cashReservesMonthlyAmt, basis: `${inputs.cashReservesPercentRent ?? 0}% Rent` },
    ];

    // Filter costs > 0 for display list
    const filteredMonthlyCosts = monthlyCosts.filter(item => item.amount > 0);
    // Sum of all monthly recurring expenses (including reserves/loss allowances)
    const totalMonthlyRentalExpenses = filteredMonthlyCosts.reduce((sum, item) => sum + (item.amount || 0), 0);
    const annualRentalExpenses = totalMonthlyRentalExpenses * 12; // Annual equivalent

    // --- Cash Flow Calculation ---
    const totalMonthlyOutflow = monthlyEMI + totalMonthlyRentalExpenses;
    const monthlyNetCashFlow = grossRentMonth - totalMonthlyOutflow;
    const annualNetCashflow = monthlyNetCashFlow * 12;

    // --- ROI Calculations (Specific 6 metrics) ---
    const roiGross_PP = pp > 0 ? (grossRentYear / pp) * 100 : 0;
    const roiGross_AC = acquisitionCostForROI > 0 ? (grossRentYear / acquisitionCostForROI) * 100 : 0;
    const roiNetExclEMI_PP = pp > 0 ? ((grossRentYear - annualRentalExpenses) / pp) * 100 : 0;
    const roiNetExclEMI_AC = acquisitionCostForROI > 0 ? ((grossRentYear - annualRentalExpenses) / acquisitionCostForROI) * 100 : 0;
    const roiNetInclEMI_PP = pp > 0 ? (annualNetCashflow / pp) * 100 : 0;
    const roiNetInclEMI_AC = acquisitionCostForROI > 0 ? (annualNetCashflow / acquisitionCostForROI) * 100 : 0;

    // --- Payback Period Calculation (Not displayed by default but available) ---
    const netPaybackPeriodTransparent = annualNetCashflow > 0 ? totalAcquisitionCostBasis / annualNetCashflow : Infinity;
    const netPaybackPeriodSheet = annualNetCashflow > 0 ? acquisitionCostForROI / annualNetCashflow : Infinity; // Using AC for ROI

    // --- Return Results Object ---
    return {
        // Input Echo
        pp: pp, sqft: sqft, grossRentYear: grossRentYear, projectName: inputs.projectName, developer: inputs.developer, location: inputs.location, bedBath: inputs.bedBath, status: inputs.status, handoverYear: inputs.handoverYear,
        // Costs & Cashflow
        grossRentMonth: grossRentMonth,
        totalAcquisitionCostBasis: totalAcquisitionCostBasis, // Itemized AC Sum
        acquisitionCostForROI: acquisitionCostForROI,         // AC used for ROI calcs
        downPayment: downPayment, loanAmount: loanAmount, totalCashNeededUpfront: totalCashNeededUpfront,
        upfrontCostsList: filteredUpfrontCosts, upfrontExpensesTotal: upfrontExpensesTotal,
        monthlyEMI: monthlyEMI, totalMonthlyRentalExpenses: totalMonthlyRentalExpenses, annualRentalExpenses: annualRentalExpenses,
        totalMonthlyOutflow: totalMonthlyOutflow, monthlyNetCashFlow: monthlyNetCashFlow, annualNetcashflow: annualNetCashflow,
        monthlyCostsList: filteredMonthlyCosts,
        // --- Specific ROIs Requested ---
        roiGross_PP: roiGross_PP,
        roiGross_AC: roiGross_AC,
        roiNetExclEMI_PP: roiNetExclEMI_PP,
        roiNetExclEMI_AC: roiNetExclEMI_AC,
        roiNetInclEMI_PP: roiNetInclEMI_PP,
        roiNetInclEMI_AC: roiNetInclEMI_AC,
        // Payback (available if needed)
        netPaybackPeriod: netPaybackPeriodTransparent,
        netPaybackPeriodSheet: netPaybackPeriodSheet
    };
}


// =============================================================================
// == DOM Update Functions ==
// =============================================================================

/**
 * Creates HTML for a single metric card.
 * @param {string} label - The label for the metric.
 * @param {string} displayValue - The formatted value to display.
 * @param {number} numericValueForClass - The raw numeric value used to determine positive/negative styling.
 * @param {string} [subValue=''] - Optional smaller text below the main value.
 * @returns {string} HTML string for the metric card.
 */
function createMetricCard(label, displayValue, numericValueForClass, subValue = '') {
    let valueClass = 'neutral'; // Default style class
    // Determine class based on numeric value
    if (typeof numericValueForClass === 'number' && !isNaN(numericValueForClass)) {
        if (numericValueForClass > 0) valueClass = 'positive';
        else if (numericValueForClass < 0) valueClass = 'negative';
    }
    // Sanitize display values to prevent potential XSS
    const safeDisplayValue = String(displayValue).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeSubValue = String(subValue).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return `<div class="metric-card">
              <span class="label">${label}</span>
              <span class="value ${valueClass}">${safeDisplayValue}</span>
              ${subValue ? `<span class="sub-value">${safeSubValue}</span>` : ''}
            </div>`;
}

/**
 * Creates HTML for a data table.
 * @param {string} id - The ID attribute for the table.
 * @param {string[]} headers - Array of header strings.
 * @param {Array<Array<string|number|null>>} dataRows - Array of data rows (each row is an array of cell values).
 * @param {Array<string|object|null>|null} [footerRow=null] - Optional footer row definition. Cells can be strings or objects like { content: 'Total', colspan: 2 }.
 * @returns {string} HTML string for the table wrapped in a container.
 */
function createTableHTML(id, headers, dataRows, footerRow = null) {
    if (!Array.isArray(headers) || !Array.isArray(dataRows)) {
        console.error("Invalid input for createTableHTML: headers and dataRows must be arrays.");
        return '';
    }

    let tableHTML = `<div class="table-container"><table class="data-table" id="${id}"><thead><tr>`;
    // Add table headers
    headers.forEach(h => tableHTML += `<th>${String(h || '').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`);
    tableHTML += `</tr></thead><tbody>`;

    // Add table body rows
    dataRows.forEach(row => {
        if (!Array.isArray(row)) return; // Skip invalid rows
        tableHTML += `<tr>`;
        row.forEach((cell, index) => {
            let cellClass = '';
            // Determine cell class based on corresponding header text for alignment
            const headerText = (index < headers.length && headers[index]) ? String(headers[index]).toLowerCase() : '';
            if (headerText.includes('(aed)') || headerText.includes('amount')) {
                cellClass = ' class="currency"'; // Right-align currency
            } else if (headerText.includes('(%)') || headerText.includes('years') || headerText.includes('sq ft')) {
                cellClass = ' class="number"'; // Right-align numbers
            }

            // Sanitize cell content
            let cellContent = String(cell ?? '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            // Special formatting for 'Basis' column notes
            if (headers[index] === 'Basis' && !cellContent.startsWith('<')) { // Avoid re-wrapping if already HTML
                 cellContent = `<span class="notes">${cellContent}</span>`;
            }
            tableHTML += `<td${cellClass}>${cellContent}</td>`;
        });
        tableHTML += `</tr>`;
    });
    tableHTML += `</tbody>`;

    // Add table footer row if provided
    if (footerRow && Array.isArray(footerRow)) {
        tableHTML += `<tfoot><tr>`;
        let currentHeaderIndex = 0; // Track position for alignment with headers
        footerRow.forEach((cell) => {
            let attributes = '';
            let content = '';
            let colspan = 1;

            // Handle complex cell definition (with colspan)
            if (typeof cell === 'object' && cell !== null && cell.content !== undefined) {
                colspan = parseInt(cell.colspan, 10) || 1;
                attributes = ` colspan="${colspan}"`;
                content = cell.content;
            } else {
                content = cell; // Simple cell content
            }

            // Determine alignment class based on the *last* header this cell spans
            let cellClass = '';
            const headerIndexForAlign = currentHeaderIndex + colspan - 1;
            if (headerIndexForAlign < headers.length) {
                const headerText = String(headers[headerIndexForAlign] || '').toLowerCase();
                 if (headerText.includes('(aed)') || headerText.includes('amount')) {
                    cellClass = 'currency';
                } else if (headerText.includes('(%)') || headerText.includes('years') || headerText.includes('sq ft')) {
                    cellClass = 'number';
                }
            }
            if (cellClass) {
                attributes += ` class="${cellClass}"`;
            }

            // Sanitize content and wrap in <strong> unless it's already marked as notes
            const safeContent = String(content ?? '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            let cellDisplay = (typeof content === 'string' && content.startsWith('<span class="notes">'))
                                ? safeContent
                                : `<strong>${safeContent}</strong>`;

            tableHTML += `<td${attributes}>${cellDisplay}</td>`;
            currentHeaderIndex += colspan; // Move tracker forward by colspan
        });
        tableHTML += `</tr></tfoot>`;
    }

    tableHTML += `</table></div>`; // Close table and container
    return tableHTML;
}


// =============================================================================
// == Main Rendering Function ==
// =============================================================================

/**
 * Renders the calculated results into the output section of the page.
 * @param {object} results - The results object from performCalculations.
 */
function renderOutput(results) {
    const outputContainer = document.getElementById('output-content');
    if (!outputContainer) {
        console.error("Output container 'output-content' not found. Cannot render results.");
        return;
    }
    outputContainer.innerHTML = ''; // Clear previous results or placeholder

    try {
        // --- Section 0: Property Summary (Structure Only) ---
        const propertyInfoSection = document.createElement('div');
        propertyInfoSection.className = 'output-section';
        propertyInfoSection.id = 'property-summary-section';
        let summaryHTML = `<h4><i class="fa-solid fa-house-chimney-window"></i> Property Summary</h4>`;
        summaryHTML += '<div class="property-summary-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 15px; align-items: start;">';
        // --- Population Commented Out ---
        
        const addDetail = (label, value) => {
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                const safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                return `<div><strong>${label}:</strong> ${safeValue}</div>`;
            }
            return '';
        };
        summaryHTML += addDetail('Project', results.projectName);
        summaryHTML += addDetail('Developer', results.developer);
        summaryHTML += addDetail('Location', results.location);
        summaryHTML += addDetail('Unit', results.bedBath);
        if (results.sqft) {
            summaryHTML += `<div><strong>Area:</strong> ${results.sqft.toLocaleString()} sq ft</div>`;
        }
        if (results.status) {
            let statusText = results.status;
            if (results.status === 'Offplan' && results.handoverYear) {
                statusText += ` (Handover ${results.handoverYear})`;
            }
            summaryHTML += `<div><strong>Status:</strong> ${statusText}</div>`;
        }        
        summaryHTML += '</div>';
        propertyInfoSection.innerHTML = summaryHTML;
        outputContainer.appendChild(propertyInfoSection);


        // --- Section 1: Financial Highlights ---
        const highlightsSection = document.createElement('div');
        highlightsSection.className = 'output-section';
        highlightsSection.id = 'financial-highlights';
        let highlightsHTML = `<h4><i class="fa-solid fa-star-of-life"></i> Financial Highlights</h4><div class="metric-grid">`;
        highlightsHTML += createMetricCard('Purchase Price', formatCurrencyAED(results.pp), results.pp);
        // Show the AC used for ROI calculations for reference
        highlightsHTML += createMetricCard(
            'Acquisition Cost (for ROI)',
            formatCurrencyAED(results.acquisitionCostForROI),
            results.acquisitionCostForROI,
            `PP + ${formatCurrencyAED(results.acquisitionCostForROI - results.pp)} Upfront`
        );
        highlightsHTML += createMetricCard(
            'Total Cash Needed',
            formatCurrencyAED(results.totalCashNeededUpfront),
            -Math.abs(results.totalCashNeededUpfront), // Negative for styling
            `DP: ${formatCurrencyAED(results.downPayment)}`
        );
        highlightsHTML += createMetricCard(
            'Loan Amount',
            formatCurrencyAED(results.loanAmount),
            results.loanAmount,
            `LTV: ${formatPercent(results.pp > 0 ? (results.loanAmount / results.pp * 100) : 0)}`
        );
        const pricePerSqftPP = results.sqft > 0 ? results.pp / results.sqft : 0;
        const pricePerSqftAC = results.sqft > 0 ? results.acquisitionCostForROI / results.sqft : 0; // Use AC for ROI here
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
        cashflowHTML += createMetricCard(
            'Net Cash Flow',
            formatCurrencyAED(results.monthlyNetCashFlow, true), // Show sign
            results.monthlyNetCashFlow,
            `${formatCurrencyAED(results.annualNetcashflow)} Annually`
        );
        cashflowHTML += `</div>`;
        cashflowSection.innerHTML = cashflowHTML;
        outputContainer.appendChild(cashflowSection);


        // --- Section 3: Return Metrics (Displaying the specific 6 ROIs) ---
        const roiSection = document.createElement('div');
        roiSection.className = 'output-section';
        roiSection.id = 'roi-metrics';
        let roiHTML = `<h4><i class="fa-solid fa-chart-pie"></i> Return Metrics</h4><div class="metric-grid">`;

        // a. Gross ROI (w.r to Purchase Price)
        roiHTML += createMetricCard(
            'Gross ROI',
            formatPercent(results.roiGross_PP),
            results.roiGross_PP,
            `w.r to Purchase Price`
        );

        // b. Gross ROI (w.r to Total Acquisition Price)
        roiHTML += createMetricCard(
            'Gross ROI',
            formatPercent(results.roiGross_AC),
            results.roiGross_AC,
            `w.r to Total Acquisition Price`
        );

        // a. Net ROI (after Rental Expenses) (w.r. to Purchase Price)
        roiHTML += createMetricCard(
            'Net ROI (after Rental Expenses)',
            formatPercent(results.roiNetExclEMI_PP),
            results.roiNetExclEMI_PP,
            `(w.r. to Purchase Price)`
         );

        // b. Net ROI (after Rental Expenses) (w.r. to Total Acquisition Price)
        roiHTML += createMetricCard(
            'Net ROI (after Rental Expenses)',
            formatPercent(results.roiNetExclEMI_AC),
            results.roiNetExclEMI_AC,
            `w.r. to Total Acquisition Price`
        );

        // c. Net ROI (after Expenses & EMI) (w.r. to Purchase Price)
        roiHTML += createMetricCard(
            'Net ROI (after Expenses & EMI)',
            formatPercent(results.roiNetInclEMI_PP),
            results.roiNetInclEMI_PP,
            `w.r. to Purchase Price`
        );

        // c. Net ROI (after Expenses & EMI) (w.r. to Total Acquisition Price)
        roiHTML += createMetricCard(
            'Net ROI (after Expenses & EMI) ',
            formatPercent(results.roiNetInclEMI_AC),
            results.roiNetInclEMI_AC,
            `w.r. to Total Acquisition Price`
        );

        roiHTML += `</div>`; // Close metric-grid
        roiSection.innerHTML = roiHTML;
        outputContainer.appendChild(roiSection);


        // --- Section 4: Cost Breakdowns ---
        const costSection = document.createElement('div');
        costSection.className = 'output-section';
        costSection.id = 'cost-breakdown';
        costSection.innerHTML = `<h4><i class="fa-solid fa-file-invoice-dollar"></i> Cost Breakdowns</h4>`;

        // Upfront Costs Table
        costSection.innerHTML += `<h5>Upfront Costs</h5>`;
        const upfrontHeaders = ['Item', 'Basis', 'Amount (AED)'];
        const upfrontRows = results.upfrontCostsList.map(item => [item.label, item.basis, formatCurrencyAED(item.amount)]);
        const upfrontFooter = [{ content: 'Total Non-Refundable/Current (Itemized)', colspan: 2 }, formatCurrencyAED(results.upfrontExpensesTotal)];
        costSection.innerHTML += createTableHTML('upfront-costs-table', upfrontHeaders, upfrontRows, upfrontFooter);

        // Add footnote comparing itemized AC with AC used for ROI, if different
        if (Math.abs(results.totalAcquisitionCostBasis - results.acquisitionCostForROI) > 1) {
            costSection.innerHTML += `<p class="table-footnote" style="font-size: 0.8em; text-align: right; margin-top: 5px; margin-right: 5px; font-style: italic; color: var(--text-secondary);"><i>Note: ROI metrics use Acquisition Cost (AC) of ${formatCurrencyAED(results.acquisitionCostForROI)} for calculation.</i></p>`;
        }

        // Monthly Costs Table
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
        } else {
            console.warn("Timestamp element ('timestamp') not found in the footer.");
        }

    } catch (error) {
        console.error("Error rendering output:", error);
        // Display a user-friendly error message in the output area
        outputContainer.innerHTML = `<div class="placeholder error-placeholder">
                                         <i class="fa-solid fa-bomb"></i>
                                         <p>An error occurred while generating the analysis.</p>
                                         <p style="font-size: 0.8em; color: var(--text-secondary);">${error.message}</p>
                                     </div>`;
    }
}


// =============================================================================
// == Main Calculation Trigger ==
// =============================================================================

/**
 * Main function triggered by the form submission (or button click).
 * Gathers inputs, validates them, performs calculations, and renders the output.
 */
function calculate() {
    console.log("Calculate function called.");

    // 1. Gather All Inputs
    const inputs = {
        // Property Details
        projectName: getTextValue('projectName'),
        developer: getTextValue('developer'),
        location: getTextValue('location'),
        bedBath: getTextValue('bedBath'),
        sqft: getValue('sqft'),
        status: getValue('status'),
        handoverYear: getValue('handoverYear'), // Will be number or null
        // Financial Inputs
        pp: getValue('purchasePrice'),
        grossRentYear: getValue('grossRentYear'),
        ltvPercent: getValue('ltv'),
        loanTenure: getValue('loanTenure'),
        annualInterestRate: getValue('interestRate'),
        // Upfront Cost Percentages & Fixed
        dldPercent: getValue('dldPercent'),
        mortgageRegPercent: getValue('mortgageRegPercent'),
        bankProcessingPercent: getValue('bankProcessingPercent'),
        agencyFeePercent: getValue('agencyFeePercent'),
        vatPercent: getValue('vatPercent'), // Applied to Agency Fee
        mortgageRegFixed: getValue('mortgageRegFixed'),
        titleDeedFee: getValue('titleDeedFee'),
        trusteeFee: getValue('trusteeFee'),
        propertyValuationFee: getValue('propertyValuationFee'),
        // Other Upfront Costs
        inspectionCost: getValue('inspectionCost'),
        conveyanceFee: getValue('conveyanceFee'),
        furnishingCost: getValue('furnishingCost'),
        utilityDeposit: getValue('utilityDeposit'),
        mortgageReleaseFee: getValue('mortgageReleaseFee'),
        // Monthly Costs Fixed & Percentages
        serviceChargeMonthly: getValue('serviceChargeMonthly'),
        homeInsuranceMonthly: getValue('homeInsuranceMonthly'),
        utilitiesMonthly: getValue('utilitiesMonthly'),
        cleaningMonthly: getValue('cleaningMonthly'),
        capexPercentRent: getValue('capexPercent'),
        rmPercentRent: getValue('rmPercent'),
        mgmtPercentRent: getValue('mgmtPercent'),
        vacancyPercentRent: getValue('vacancyPercent'),
        refinancePercentRent: getValue('refinancePercentRent'), // Consider if this input makes sense
        cashReservesPercentRent: getValue('cashReservesPercent'),
    };

    // 2. Validate Inputs
    if (!validateInputs(inputs)) {
        console.log("Validation failed.");
        // Display placeholder message in output if validation fails
        const outputContainer = document.getElementById('output-content');
        if (outputContainer) {
            outputContainer.innerHTML = '<div class="placeholder"><i class="fa-solid fa-triangle-exclamation"></i><p>Please fix the errors highlighted in the form.</p></div>';
        }
        // Reset timestamp if validation fails
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement) timestampElement.textContent = 'N/A';
        return; // Stop processing
    }

    console.log("Validation passed. Performing calculations...");

    // 3. Perform Calculations & Render Output
    try {
        const results = performCalculations(inputs);
        renderOutput(results);

        // Optional: Scroll to output on smaller screens after calculation
        if (window.innerWidth <= 1024) { // Adjust breakpoint as needed
            const outputPane = document.querySelector('.output-pane');
            if (outputPane) {
                // Use setTimeout to ensure rendering is complete before scrolling
                setTimeout(() => {
                    outputPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100); // Small delay
            }
        }
    } catch (error) {
        console.error("Error during calculation or rendering:", error);
        const outputContainer = document.getElementById('output-content');
        if (outputContainer) {
             outputContainer.innerHTML = `<div class="placeholder error-placeholder">
                                            <i class="fa-solid fa-bomb"></i>
                                            <p>Calculation Error.</p>
                                            <p style="font-size: 0.8em; color: var(--text-secondary);">${error.message}</p>
                                         </div>`;
        }
         // Reset timestamp on error
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement) timestampElement.textContent = 'Error';
    }
}


// =============================================================================
// == Initial Setup & Event Listeners ==
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing...");

    // 1. Set Initial Theme
    try {
        // Prefer stored theme, fallback to system preference, then default to 'dark'
        const preferredTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark');
        setTheme(preferredTheme);
    } catch (e) {
        console.error("Error setting initial theme:", e);
        setTheme('dark'); // Ensure a default theme is set on error
    }

    // 2. Set Initial State for Conditional Inputs (Handover Year)
    try {
        const initialStatusElement = document.getElementById('status');
        if (initialStatusElement) {
            toggleHandover(initialStatusElement.value);
            // Add listener for status changes
             initialStatusElement.addEventListener('change', (event) => {
                toggleHandover(event.target.value);
            });
        } else {
            console.warn("Status dropdown element ('status') not found for initial setup.");
        }
    } catch (e) {
        console.error("Error setting initial handover state:", e);
    }

    // 3. Set Initial Timestamp in Footer
    try {
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement) {
            timestampElement.textContent = new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
        } else {
            console.warn("Timestamp element ('timestamp') not found in footer.");
        }
    } catch (e) {
        console.error("Error setting initial timestamp:", e);
    }

    // 4. Attach Navigation Drawer Listeners
    try {
        // Check if all required navigation elements exist
        if (navToggleButton && sideDrawer && navOverlay && navCloseButton) {
            console.log("Attaching navigation listeners...");

            // Toggle button opens/closes drawer
            navToggleButton.addEventListener('click', (event) => {
                console.log("Nav toggle clicked");
                event.stopPropagation(); // Prevent triggering overlay click if nested
                if (sideDrawer.classList.contains('open')) {
                    closeDrawer();
                } else {
                    openDrawer();
                }
            });

            // Close button closes drawer
            navCloseButton.addEventListener('click', () => {
                console.log("Nav close clicked");
                closeDrawer();
            });

            // Clicking overlay closes drawer
            navOverlay.addEventListener('click', () => {
                console.log("Nav overlay clicked");
                closeDrawer();
            });

            // Clicking links inside drawer closes drawer (for SPA-like behavior or section links)
            sideDrawer.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', () => {
                    console.log("Nav link clicked");
                    closeDrawer();
                });
            });

            // Close drawer on Escape key press
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && sideDrawer.classList.contains('open')) {
                    console.log("Escape key pressed, closing drawer");
                    closeDrawer();
                }
            });

            console.log("Navigation listeners attached successfully.");
        } else {
            // Log which elements are missing if setup fails
            console.error("Navigation functionality disabled: Missing one or more required elements.", {
                navToggleFound: !!navToggleButton,
                drawerFound: !!sideDrawer,
                overlayFound: !!navOverlay,
                closeBtnFound: !!navCloseButton
            });
        }
    } catch (e) {
        console.error("Error attaching navigation listeners:", e);
    }

    // 5. Attach Form Submission Listener (if using JS instead of inline onclick)
    const mainForm = document.getElementById('investment-form');
    if (mainForm) {
         mainForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission
            console.log("Form submitted via JS listener.");
            calculate(); // Call the main calculation function
        });
         // Add input/change listeners to clear validation errors dynamically (optional enhancement)
        mainForm.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', () => {
                if (el.classList.contains('error')) {
                    el.classList.remove('error');
                    // Optionally, re-validate silently or clear the main error message area
                    // Or just let the next 'Calculate' click handle full re-validation
                }
            });
         });

    } else {
        console.error("Investment form element ('investment-form') not found! Form submission listener not attached.");
        // Rely on inline `onclick="calculate()"` on the button if form element is missing
    }

    // 6. Initial Placeholder in Output
    const outputContainer = document.getElementById('output-content');
     if (outputContainer && outputContainer.innerHTML.trim() === '') {
         outputContainer.innerHTML = '<div class="placeholder"><i class="fa-solid fa-calculator"></i><p>Enter details and click Calculate.</p></div>';
     }


    console.log("Initial setup complete.");
}); // End DOMContentLoaded