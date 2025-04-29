// --- Utility Functions ---
// (Keep these functions as they were in the previous version)
function getValue(id) {
    const element = document.getElementById(id);
    if (!element) return 0;
    if (element.type === 'text' || element.type === 'select-one' || element.type === 'email' || element.type === 'tel') {
        return element.value.trim();
    }
    const value = parseFloat(element.value);
    return isNaN(value) ? null : value; // Return null if not a valid number
}

function getTextValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function formatCurrencyAED(value, showSign = false) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const options = {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0, // Typically whole numbers for large AED amounts
        maximumFractionDigits: 0,
    };
    const formatted = numValue.toLocaleString('en-AE', options);
    if (showSign && numValue > 0) {
        return `+${formatted}`;
    }
    return formatted; // Negative sign is handled automatically
}

function formatPercent(value) {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return numValue.toFixed(2) + '%';
}

function calculateEMI(principal, annualRate, years) {
    if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = years * 12;
    if (monthlyRate === 0) return principal / numberOfPayments; // Handle 0% interest rate
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return isNaN(emi) || !isFinite(emi) ? 0 : emi;
}

function toggleHandover(status) {
    const handoverGroup = document.getElementById('handover-year-group');
    const input = document.getElementById('handoverYear');
    if (handoverGroup && input) {
         if (status === 'Offplan') {
             handoverGroup.classList.add('visible');
             input.required = true; // Make required if offplan
         } else {
             handoverGroup.classList.remove('visible');
             input.required = false; // Not required if ready
             input.value = ''; // Clear value
         }
    }
}

// --- Input Validation ---
function validateInputs(inputs) {
    const errors = [];
    const form = document.getElementById('investment-form');
    // Clear previous errors visually first
    form.querySelectorAll('input.error, select.error').forEach(el => el.classList.remove('error'));

    // Use HTML5 validation API + custom checks
    if (!form.checkValidity()) {
        form.querySelectorAll(':invalid').forEach(el => {
            let label = document.querySelector(`label[for='${el.id}']`)?.textContent || el.placeholder || el.id;
            label = label.replace('*', '').trim();
            if (!errors.some(e => e.includes(label))) {
                errors.push(`${label} is invalid or missing.`);
            }
            el.classList.add('error'); // Add error class to invalid elements
        });
    }

     const checks = [
         { id: 'sqft', name: 'Area', min: 1 },
         { id: 'purchasePrice', name: 'Purchase Price', min: 1 },
         { id: 'grossRentYear', name: 'Gross Annual Rent', min: 0 },
         { id: 'ltv', name: 'LTV (%)', min: 0, max: 100 },
         { id: 'loanTenure', name: 'Loan Tenure', min: 1 },
         { id: 'interestRate', name: 'Interest Rate', min: 0 },
         // Add more specific checks if needed (e.g., handover year > current year)
     ];

     checks.forEach(check => {
         const value = inputs[check.id];
         const element = document.getElementById(check.id);
         let failed = false;

         if (value === null && element?.required) { // Check if required field failed parsing
            // Already handled by checkValidity generally, but ensures numeric check adds class
            failed = true;
         } else if (value !== null) { // Only check range if value is a number
            if (check.min !== undefined && value < check.min) {
                if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} must be at least ${check.min}.`);
                failed = true;
            }
            if (check.max !== undefined && value > check.max) {
                 if (!errors.some(e => e.includes(check.name))) errors.push(`${check.name} cannot exceed ${check.max}.`);
                failed = true;
            }
         }
         if (failed && element) element.classList.add('error');
     });


    const errorContainer = document.getElementById('validation-errors');
    if (errors.length > 0) {
         const uniqueErrors = [...new Set(errors)];
         errorContainer.innerHTML = `<strong>Please correct the following:</strong><ul>${uniqueErrors.map(e => `<li>${e}</li>`).join('')}</ul>`;
         errorContainer.style.display = 'block';
         // REMOVED scrollIntoView for error box
        return false; // Validation failed
    } else {
        errorContainer.style.display = 'none';
        return true; // Validation passed
    }
}


// --- Calculation Logic ---
// (Keep the performCalculations function exactly as it was in the previous version)
function performCalculations(inputs) {
    // Basic Calculations
    const loanAmount = inputs.pp * (inputs.ltvPercent / 100);
    const downPayment = inputs.pp - loanAmount;
    const monthlyEMI = calculateEMI(loanAmount, inputs.annualInterestRate, inputs.loanTenure);
    const grossRentMonth = inputs.grossRentYear > 0 ? inputs.grossRentYear / 12 : 0;

    // Upfront Costs Breakdown
    const upfrontCosts = {
        dld: { label: 'DLD Fee', amount: inputs.pp * (inputs.dldPercent / 100), basis: `${inputs.dldPercent}% PP` },
        mortgageReg: { label: 'Mortgage Reg.', amount: (loanAmount * (inputs.mortgageRegPercent / 100)) + inputs.mortgageRegFixed, basis: `${inputs.mortgageRegPercent}% Loan + ${formatCurrencyAED(inputs.mortgageRegFixed)}` },
        bankProcessing: { label: 'Bank Processing', amount: loanAmount * (inputs.bankProcessingPercent / 100), basis: `${inputs.bankProcessingPercent}% Loan` },
        titleDeed: { label: 'Title Deed Fee', amount: inputs.titleDeedFee, basis: 'Fixed' },
        trustee: { label: 'Reg. Trustee', amount: inputs.trusteeFee, basis: 'Fixed' },
        valuation: { label: 'Valuation', amount: inputs.propertyValuationFee, basis: 'Fixed' },
        agency: { label: 'Agency Fee + VAT', amount: (inputs.pp * (inputs.agencyFeePercent / 100)) * (1 + inputs.vatPercent / 100), basis: `${inputs.agencyFeePercent}% PP + ${inputs.vatPercent}% VAT` },
        inspection: { label: 'Inspection', amount: inputs.inspectionCost, basis: 'Fixed (Optional)' },
        conveyance: { label: 'Conveyance', amount: inputs.conveyanceFee, basis: 'Fixed (Legal)' },
        furnishing: { label: 'Furnishing', amount: inputs.furnishingCost, basis: 'Fixed (Optional)' },
        utilityDeposit: { label: 'Utility Deposit', amount: inputs.utilityDeposit, basis: 'Fixed (Refundable)' },
        mortgageRelease: { label: 'Mortgage Release', amount: inputs.mortgageReleaseFee, basis: 'Fixed (Future)' },
    };
    const filteredUpfrontCosts = Object.values(upfrontCosts).filter(item => item.amount > 0 || item.basis.includes('Refundable'));
    const upfrontExpensesTotal = filteredUpfrontCosts.filter(c => !c.basis.includes('Refundable')).reduce((sum, item) => sum + item.amount, 0);
    const utilityDepositAmount = upfrontCosts.utilityDeposit.amount;
    const totalCashNeededUpfront = downPayment + upfrontExpensesTotal + utilityDepositAmount;
    const totalAcquisitionCostBasis = inputs.pp + upfrontExpensesTotal; // Exclude deposit for ROI basis

    // Monthly Costs Breakdown
    const capexMonthlyAmt = grossRentMonth * (inputs.capexPercentRent / 100);
    const rmMonthlyAmt = grossRentMonth * (inputs.rmPercentRent / 100);
    const mgmtMonthlyAmt = grossRentMonth * (inputs.mgmtPercentRent / 100);
    const vacancyMonthlyLoss = grossRentMonth * (inputs.vacancyPercentRent / 100);
    const monthlyCosts = [
        { label: 'Service Charge', amount: inputs.serviceChargeMonthly, basis: 'Fixed' },
        { label: 'Home Insurance', amount: inputs.homeInsuranceMonthly, basis: 'Fixed' },
        { label: 'Utilities', amount: inputs.utilitiesMonthly, basis: 'Fixed/Estimate' },
        { label: 'Cleaning', amount: inputs.cleaningMonthly, basis: 'Fixed/Estimate' },
        { label: 'Capex Reserve', amount: capexMonthlyAmt, basis: `${inputs.capexPercentRent}% Rent` },
        { label: 'Repairs/Maint.', amount: rmMonthlyAmt, basis: `${inputs.rmPercentRent}% Rent` },
        { label: 'Prop. Management', amount: mgmtMonthlyAmt, basis: `${inputs.mgmtPercentRent}% Rent` },
        { label: 'Vacancy Loss', amount: vacancyMonthlyLoss, basis: `${inputs.vacancyPercentRent}% Rent` },
    ];
    const filteredMonthlyCosts = monthlyCosts.filter(item => item.amount > 0);
    const totalMonthlyRentalExpenses = filteredMonthlyCosts.reduce((sum, item) => sum + item.amount, 0);

    // Cash Flow
    const totalMonthlyOutflow = monthlyEMI + totalMonthlyRentalExpenses;
    const monthlyNetCashFlow = grossRentMonth - totalMonthlyOutflow;
    const annualNetCashflow = monthlyNetCashFlow * 12;

    // Other Factors
    const cashReservesMonthlyAmt = grossRentMonth * (inputs.cashReservesPercentRent / 100);
    const refinanceCostAmountTotal = loanAmount * (inputs.refinancePercentLoan / 100);

    // ROI Calculations
    const roiGrossYield = inputs.pp > 0 ? (inputs.grossRentYear / inputs.pp) * 100 : 0;
    const roiNetYield = totalAcquisitionCostBasis > 0 ? (annualNetCashflow / totalAcquisitionCostBasis) * 100 : 0;
    const roiCashOnCash = totalCashNeededUpfront > 0 ? (annualNetCashflow / totalCashNeededUpfront) * 100 : 0;
    const netPaybackPeriod = annualNetCashflow > 0 ? totalAcquisitionCostBasis / annualNetCashflow : Infinity;


    return {
        // Key Financials
        pp: inputs.pp,
        totalAcquisitionCostBasis,
        downPayment,
        loanAmount,
        totalCashNeededUpfront,
        monthlyEMI,
        grossRentYear: inputs.grossRentYear,
        grossRentMonth,
        totalMonthlyRentalExpenses,
        monthlyNetCashFlow,
        annualNetCashflow,
        // ROI Metrics
        roiGrossYield,
        roiNetYield,
        roiCashOnCash,
        netPaybackPeriod,
        // Breakdowns
        upfrontCostsList: filteredUpfrontCosts,
        monthlyCostsList: filteredMonthlyCosts,
        // Other
        cashReservesMonthlyAmt,
        refinanceCostAmountTotal,
        // Project Info (Pass through)
        projectName: inputs.projectName,
        developer: inputs.developer,
        location: inputs.location,
    };
}

// --- DOM Update Functions ---
// (Keep createMetricCard and createTableHTML exactly as they were)
function createMetricCard(label, value, formatClass = 'neutral', subValue = '') {
    return `
        <div class="metric-card">
            <span class="label">${label}</span>
            <span class="value ${formatClass}">${value}</span>
            ${subValue ? `<span class="sub-value">${subValue}</span>` : ''}
        </div>
    `;
}

function createTableHTML(id, headers, dataRows, footerRow = null) {
    let tableHTML = `<div class="table-container"><table class="data-table" id="${id}"><thead><tr>`;
    headers.forEach(h => tableHTML += `<th>${h}</th>`);
    tableHTML += `</tr></thead><tbody>`;
    dataRows.forEach(row => {
        // Ensure cells are wrapped correctly if they contain HTML like the notes span
        tableHTML += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    });
    tableHTML += `</tbody>`;
    if (footerRow) {
        tableHTML += `<tfoot><tr>`;
        footerRow.forEach((cell, index) => {
            // Apply colspan if specified (e.g., ['Total', { colspan: 1, content: '' }, { colspan: 1, content: 'Value'}]) - simplistic example
            let attributes = '';
            let content = cell;
            if (typeof cell === 'object' && cell !== null) {
                attributes = ` colspan="${cell.colspan || 1}"`;
                content = cell.content;
            }
             // Make footer content bold by default unless it's notes
            let cellContent = content;
            if (!String(content).includes('<span class="notes">')) {
                 cellContent = `<strong>${content}</strong>`;
            }

            tableHTML += `<td${attributes}>${cellContent}</td>`;

        });
        tableHTML += `</tr></tfoot>`;
    }
    tableHTML += `</table></div>`;
    return tableHTML;
}


// (Keep renderOutput exactly as it was, including the structure and how it calls the helper functions)
function renderOutput(results) {
    const outputContainer = document.getElementById('output-content');
    outputContainer.innerHTML = ''; // Clear placeholder or previous results

    // 1. Financial Highlights Section
    const highlightsSection = document.createElement('div');
    highlightsSection.className = 'output-section';
    highlightsSection.id = 'financial-highlights';
    let highlightsHTML = `<h4><i class="fa-solid fa-star-of-life"></i> Financial Highlights</h4><div class="metric-grid">`;
    highlightsHTML += createMetricCard('Purchase Price', formatCurrencyAED(results.pp));
    highlightsHTML += createMetricCard('Acquisition Cost', formatCurrencyAED(results.totalAcquisitionCostBasis), 'neutral', 'PP + Upfront Costs');
    highlightsHTML += createMetricCard('Total Cash Needed', formatCurrencyAED(results.totalCashNeededUpfront), 'negative', 'DP + Costs + Deposit');
    highlightsHTML += createMetricCard('Loan Amount', formatCurrencyAED(results.loanAmount));
    highlightsHTML += `</div>`;
    highlightsSection.innerHTML = highlightsHTML;
    outputContainer.appendChild(highlightsSection);

    // 2. Cash Flow Section
    const cashflowSection = document.createElement('div');
    cashflowSection.className = 'output-section';
    cashflowSection.id = 'cashflow-details';
    let cashflowHTML = `<h4><i class="fa-solid fa-arrow-right-arrow-left"></i> Monthly Cash Flow</h4><div class="metric-grid">`;
    cashflowHTML += createMetricCard('Gross Rent', formatCurrencyAED(results.grossRentMonth), 'positive');
    cashflowHTML += createMetricCard('Loan Payment (EMI)', formatCurrencyAED(results.monthlyEMI), 'negative');
    cashflowHTML += createMetricCard('Rental Expenses', formatCurrencyAED(results.totalMonthlyRentalExpenses), 'negative');
    const cfClass = results.monthlyNetCashFlow >= 0 ? 'positive' : 'negative';
    cashflowHTML += createMetricCard('Net Cash Flow', formatCurrencyAED(results.monthlyNetCashFlow, true), cfClass, `${formatCurrencyAED(results.annualNetCashflow)} Annually`);
    cashflowHTML += `</div>`;
    cashflowSection.innerHTML = cashflowHTML;
    outputContainer.appendChild(cashflowSection);

    // 3. ROI Metrics Section
    const roiSection = document.createElement('div');
    roiSection.className = 'output-section';
    roiSection.id = 'roi-metrics';
    let roiHTML = `<h4><i class="fa-solid fa-chart-pie"></i> Return Metrics</h4><div class="metric-grid">`;
    roiHTML += createMetricCard('Gross Yield', formatPercent(results.roiGrossYield), 'positive', 'On Purchase Price');
    const nyClass = results.roiNetYield >= 0 ? 'positive' : 'negative';
    roiHTML += createMetricCard('Net Yield', formatPercent(results.roiNetYield), nyClass, 'On Acquisition Cost');
    const cocClass = results.roiCashOnCash >= 0 ? 'positive' : 'negative';
    roiHTML += createMetricCard('Cash on Cash ROI', formatPercent(results.roiCashOnCash), cocClass, 'On Total Cash Invested');
    const paybackText = isFinite(results.netPaybackPeriod) ? `${results.netPaybackPeriod.toFixed(1)} yrs` : 'N/A';
    roiHTML += createMetricCard('Payback Period', paybackText, 'neutral', 'Years to recoup cost');
    roiHTML += `</div>`;
    roiSection.innerHTML = roiHTML;
    outputContainer.appendChild(roiSection);

    // 4. Cost Breakdown Section
    const costSection = document.createElement('div');
    costSection.className = 'output-section';
    costSection.id = 'cost-breakdown';
    costSection.innerHTML = `<h4><i class="fa-solid fa-file-invoice-dollar"></i> Cost Breakdowns</h4>`;

    // Upfront Costs Table
    costSection.innerHTML += `<h5>Upfront Costs</h5>`;
    const upfrontHeaders = ['Item', 'Basis', 'Amount (AED)'];
    const upfrontRows = results.upfrontCostsList.map(item => [item.label, `<span class="notes">${item.basis}</span>`, formatCurrencyAED(item.amount)]); // Made basis notes style
    // Prepare footer row with potential notes span
    let upfrontFooterLabel = 'Total Expenses';
    if(results.upfrontCostsList.some(c => c.basis.includes('Refundable'))) {
        upfrontFooterLabel += '<br><span class="notes">(Excludes Refundable Deposit)</span>';
    }
    const upfrontFooter = [upfrontFooterLabel, '', formatCurrencyAED(results.totalAcquisitionCostBasis - results.pp)];
    costSection.innerHTML += createTableHTML('upfront-costs-table', upfrontHeaders, upfrontRows, upfrontFooter);

     // Monthly Costs Table
     costSection.innerHTML += `<h5 style="margin-top: 20px;">Monthly Recurring Costs</h5>`;
     const monthlyHeaders = ['Item', 'Basis', 'Amount (AED)'];
     const monthlyRows = results.monthlyCostsList.map(item => [item.label, `<span class="notes">${item.basis}</span>`, formatCurrencyAED(item.amount)]);
     const monthlyFooter = ['Total Monthly Expenses', '', formatCurrencyAED(results.totalMonthlyRentalExpenses)];
     costSection.innerHTML += createTableHTML('monthly-costs-table', monthlyHeaders, monthlyRows, monthlyFooter);

     outputContainer.appendChild(costSection);

     // 5. Other Factors (Optional Section)
     if (results.cashReservesMonthlyAmt > 0 || results.refinanceCostAmountTotal > 0) {
         const otherSection = document.createElement('div');
         otherSection.className = 'output-section';
         otherSection.id = 'other-factors';
         otherSection.innerHTML = `<h4><i class="fa-solid fa-cogs"></i> Other Calculated Factors</h4><div class="metric-grid">`;
         if (results.cashReservesMonthlyAmt > 0) {
             otherSection.querySelector('.metric-grid').innerHTML += createMetricCard('Cash Reserves', formatCurrencyAED(results.cashReservesMonthlyAmt), 'neutral', 'Monthly Allocation (Input %)');
         }
          if (results.refinanceCostAmountTotal > 0) {
              otherSection.querySelector('.metric-grid').innerHTML += createMetricCard('Refinance Cost', formatCurrencyAED(results.refinanceCostAmountTotal), 'neutral', 'Total Estimate (Input %)');
          }
         otherSection.innerHTML += `</div>`;
         outputContainer.appendChild(otherSection);
     }

     // Update Timestamp
     document.getElementById('timestamp').textContent = new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' }); // Nicer format
}


// --- Main Calculation Trigger ---
function calculate() {
    // Get all input values (using nullish coalescing for defaults)
    const inputs = {
        projectName: getTextValue('projectName'), developer: getTextValue('developer'), location: getTextValue('location'),
        bedBath: getTextValue('bedBath'), sqft: getValue('sqft'), status: getValue('status'), handoverYear: getValue('handoverYear'),
        pp: getValue('purchasePrice'), grossRentYear: getValue('grossRentYear'), ltvPercent: getValue('ltv'),
        loanTenure: getValue('loanTenure'), annualInterestRate: getValue('interestRate'),
        dldPercent: getValue('dldPercent') ?? 0, mortgageRegPercent: getValue('mortgageRegPercent') ?? 0,
        bankProcessingPercent: getValue('bankProcessingPercent') ?? 0, agencyFeePercent: getValue('agencyFeePercent') ?? 0,
        vatPercent: getValue('vatPercent') ?? 0, mortgageRegFixed: getValue('mortgageRegFixed') ?? 0,
        titleDeedFee: getValue('titleDeedFee') ?? 0, trusteeFee: getValue('trusteeFee') ?? 0,
        propertyValuationFee: getValue('propertyValuationFee') ?? 0, inspectionCost: getValue('inspectionCost') ?? 0,
        conveyanceFee: getValue('conveyanceFee') ?? 0, furnishingCost: getValue('furnishingCost') ?? 0,
        utilityDeposit: getValue('utilityDeposit') ?? 0, mortgageReleaseFee: getValue('mortgageReleaseFee') ?? 0,
        serviceChargeMonthly: getValue('serviceChargeMonthly') ?? 0, homeInsuranceMonthly: getValue('homeInsuranceMonthly') ?? 0,
        utilitiesMonthly: getValue('utilitiesMonthly') ?? 0, cleaningMonthly: getValue('cleaningMonthly') ?? 0,
        capexPercentRent: getValue('capexPercent') ?? 0, rmPercentRent: getValue('rmPercent') ?? 0,
        mgmtPercentRent: getValue('mgmtPercent') ?? 0, vacancyPercentRent: getValue('vacancyPercent') ?? 0,
        refinancePercentLoan: getValue('refinancePercent') ?? 0, cashReservesPercentRent: getValue('cashReservesPercent') ?? 0,
    };

    // Validate
    if (!validateInputs(inputs)) {
        return; // Stop if validation fails
    }

    // Calculate
    const results = performCalculations(inputs);

    // Render
    renderOutput(results);

    // REMOVED scroll output pane to top
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state for handover year display based on default select value
    const initialStatus = document.getElementById('status').value;
    toggleHandover(initialStatus);

     // Initial timestamp
     document.getElementById('timestamp').textContent = new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
});