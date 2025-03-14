// Function to fetch data with 30-minute caching
async function fetchWithCache(url, storageKey) {
    const cacheData = localStorage.getItem(storageKey);
    const cacheTime = localStorage.getItem(`${storageKey}_time`);
    const now = Date.now();

    // If cache exists and is still valid (within 2 minutes), return cached data
    if (cacheData && cacheTime && now - cacheTime < 2 * 60 * 1000) {
        return JSON.parse(cacheData);
    }

    // Fetch fresh data if cache is expired or doesn't exist
    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        // Store the new data and the timestamp
        localStorage.setItem(storageKey, JSON.stringify(data));
        localStorage.setItem(`${storageKey}_time`, now);

        return data;
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        return null;
    }
}

// Fetch Portfolio Data
async function fetchPortfolioData() {
    return await fetchWithCache(
        "https://shubhamm-06.github.io/Portfolio-API/Data.json",
        "portfolioData"
    );
}

// Fetch Notifications Data
async function fetchNotificationsData() {
    return await fetchWithCache(
        "https://shubhamm-06.github.io/Portfolio-API/notification.json",
        "notificationsData"
    );
}


// Process Portfolio Data
function processPortfolioData(data) {
    if (!data || !Array.isArray(data)) return null;

    const predefinedColors = [
        "#003366",
        "#004488",
        "#0055AA",
        "#0066CC",
        "#0077EE",
        "#0088FF",
        "#1199FF",
        "#22AAFF",
        "#33BBFF",
        "#44CCFF",
        "#003F5C",
        "#2F4B7C",
        "#665191",
        "#A05195",
        "#D45087",
        "#FF5733",
        "#FF7F50",
        "#FFA07A",
        "#FFD700",
        "#4CAF50",
    ];

    let totalInvested = 0;
    let totalCurrent = 0;
    const allocationData = [];

    data.forEach((item, index) => {
        const buyValue = parseFloat(item["Buy Value"]) || 0;
        const presentValue = parseFloat(item["Present Value"]) || 0;
        const allocation = parseFloat(item["Allocation (%)"]) || 0;
        const ticker = item["Ticker"] || "Unknown";

        totalInvested += buyValue;
        totalCurrent += presentValue;

        allocationData.push({
            ticker,
            allocation,
            color: predefinedColors[index % predefinedColors.length],
        });
    });

    const pnl = totalCurrent - totalInvested;
    const cashPosition = 1000000 - totalInvested;

    return {
        totalInvested,
        totalCurrent,
        pnl,
        cashPosition,
        allocationData,
    };
}

// Update Summary
function updateSummary(data) {
    if (!data) return;

    document.querySelector(
        '.summary__number[data-label="Invested"]'
    ).textContent = `$${data.totalInvested.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
    document.querySelector(
        '.summary__number[data-label="Current"]'
    ).textContent = `$${data.totalCurrent.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

    const pnlElement = document.querySelector(
        '.summary__number[data-label="P&L"]'
    );
    pnlElement.textContent = `${data.pnl >= 0 ? "+" : ""
        }$${data.pnl.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    pnlElement.classList.toggle("positive", data.pnl >= 0);
    pnlElement.classList.toggle("negative", data.pnl < 0);

    const percentage = ((data.pnl / data.totalInvested) * 100).toFixed(2);
    const percentageElement = document.querySelector(
        ".summary__percentage"
    );
    percentageElement.textContent = `${percentage >= 0 ? "+" : ""
        }${percentage}%`;
    percentageElement.classList.toggle("positive", percentage >= 0);
    percentageElement.classList.toggle("negative", percentage < 0);

    document.querySelector(
        '.summary__number[data-label="Cash Position"]'
    ).textContent = `$${data.cashPosition.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Update Portfolio Chart
let portfolioChart;

const centerTextPlugin = {
    id: "centerText",
    afterDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        const centerX = chartArea.left + chartArea.width / 2;
        const centerY = chartArea.top + chartArea.height / 2;

        // Determine text based on hovered segment
        let textToDisplay = "Allocation";
        const activeElements = chart.getActiveElements();
        if (activeElements.length > 0) {
            const index = activeElements[0].index;
            textToDisplay = `${chart.data.labels[index]
                } (${chart.data.datasets[0].data[index].toFixed(2)}%)`;
        }

        ctx.save();
        ctx.font = "12px Inter";
        ctx.fillStyle = "#1a3c34";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(textToDisplay, centerX, centerY);
        ctx.restore();
    },
};

Chart.register(centerTextPlugin);

function updatePortfolioChart(allocationData) {
    const ctx = document.getElementById("portfolioChart").getContext("2d");
    const labels = allocationData.map((item) => item.ticker);
    const data = allocationData.map((item) => item.allocation);
    const colors = allocationData.map((item) => item.color);

    const colorMeaning = document.getElementById("color-meaning");
    colorMeaning.innerHTML = allocationData
        .map(
            (item) => `
<div class="portfolio__color-box">
  <div class="portfolio__color" style="background: ${item.color}"></div>
  <div class="portfolio__meaning">${item.ticker
                } (${item.allocation.toFixed(2)}%)</div>
</div>
`
        )
        .join("");

    if (portfolioChart) {
        portfolioChart.data.labels = labels;
        portfolioChart.data.datasets[0].data = data;
        portfolioChart.data.datasets[0].backgroundColor = colors;
        portfolioChart.update();
    } else {
        portfolioChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 0,
                        cutout: "60%",
                        hoverOffset: 10, // Segment pops out on hover
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => tooltipItems[0].label,
                            label: (tooltipItem) => `${tooltipItem.raw.toFixed(2)}%`,
                        },
                    },
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                },
                hover: {
                    onHover: (event, elements) => {
                        // Change cursor style based on hover presence
                        event.native.target.style.cursor = elements.length
                            ? "pointer"
                            : "default";
                        // Force redraw to update the center text
                        portfolioChart.draw();
                    },
                },
            },
            plugins: [centerTextPlugin],
        });
    }
}

// Update Fund Allocation Chart
let allocationChart;
function updateAllocationChart(invested, cash) {
    const ctx = document.getElementById("allocationChart").getContext("2d");
    const total = 1000000;

    if (allocationChart) {
        allocationChart.data.datasets[0].data = [invested];
        allocationChart.data.datasets[1].data = [cash];
        allocationChart.update();
    } else {
        allocationChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: [""],
                datasets: [
                    {
                        label: "Invested",
                        data: [invested],
                        backgroundColor: "#2ecc71",
                        barThickness: 80,
                        borderRadius: 2,
                    },
                    {
                        label: "Cash",
                        data: [cash],
                        backgroundColor: "#3498db",
                        barThickness: 80,
                        borderRadius: 2,
                    },
                ],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, display: false, max: total },
                    y: { stacked: true, display: false },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.dataset.label}: $${value.toLocaleString(
                                    "en-US",
                                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                                )} (${percentage}%)`;
                            },
                        },
                    },
                },
            },
        });
    }
}

// Stock Table
// Cache for fetched data and last mobile state
let cachedFinanceData = null;
let lastIsMobile = null;

async function createTable() {
    try {
        // Fetch data only if not cached
        if (!cachedFinanceData) {
            cachedFinanceData = await fetchPortfolioData();
            console.log("Data fetched:", cachedFinanceData); // Debug
        }
        const financeData = cachedFinanceData;
        const skeletonLoader = document.getElementById("skeleton-loader");
        const stockTable = document.getElementById("stock-table");

        if (!stockTable) {
            console.error("stock-table element not found");
            return;
        }

        if (financeData && financeData.length > 0) {
            // Function to format currency
            const formatCurrency = (value) => {
                const num = parseFloat(value);
                return isNaN(num)
                    ? value
                    : num.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                    });
            };

            // Function to format percentage
            const formatPercentage = (value) => {
                const num = parseFloat(value);
                if (isNaN(num)) return value;
                const formatted = Math.abs(num).toFixed(2) + "%";
                return num < 0
                    ? `<span style="color: red;">-${formatted}</span>`
                    : `<span style="color: green;">+${formatted}</span>`;
            };

            // Function to create card HTML
            const createCard = (data) => {
                return `
              <div class="mobile-data-card">
<div class="card-data-row">
<div class="card-pairs">
<div class="card-pair">
  <span class="card-label">Qty</span>
  <span class="card-value">${data["Qty"]}</span>
</div>
<div class="card-pair">
  <span class="card-label">Avg</span>
  <span class="card-value"
    >${formatCurrency(data["Avg Buy Price (P/S)"])}</span
  >
</div>
</div>
<span class="card-percentage">${formatPercentage(data["P&L (%)"])}</span>
</div>
<div class="card-asset-header">
<span class="card-asset-name">${data["Ticker"]}</span>
<span class="card-loss"
>${formatCurrency(data["Present Value"] - data["Buy Value"])}</span
>
</div>
<div class="card-data-row">
<div class="card-pairs">
<div class="card-pair">
  <span class="card-label">Invested</span>
  <span class="card-value">${formatCurrency(data["Buy Value"])}</span>
</div>
</div>
<div class="card-pair">
<span class="card-label">LTP</span>
<span class="card-value">${formatCurrency(
                    data["LTP"]
                )} (${formatPercentage(data["Price Change (1D)"])})</span>
</div>
</div>
</div>

          `;
            };

            // Check if mobile view (less than 600px)
            const isMobile = window.matchMedia("(max-width: 600px)").matches;

            // Only re-render if mobile state changes or content is missing
            if (lastIsMobile !== isMobile || stockTable.innerHTML === "") {
                lastIsMobile = isMobile;
                stockTable.innerHTML = ""; // Clear previous content

                if (isMobile) {
                    // Render cards for mobile
                    stockTable.innerHTML = financeData.map(createCard).join("");
                    console.log("Mobile cards rendered"); // Debug
                } else {
                    // Original table rendering for desktop
                    const columns = Object.keys(financeData[0]).map((key) => ({
                        title: key,
                        field: key,
                        headerSort: true,
                        minWidth: 90,
                        hozAlign: "left",
                        frozen: key === "Ticker",
                        formatter: (cell) => {
                            const headerName = cell.getColumn().getDefinition().title;
                            const raw = cell.getRow().getData()[key];
                            if (key === "Ticker") return `<strong>${raw}</strong>`;
                            if (
                                [
                                    "Buy Value",
                                    "Avg Buy Price (P/S)",
                                    "LTP",
                                    "Present Value",
                                ].includes(headerName)
                            ) {
                                return formatCurrency(raw);
                            }
                            if (["P&L (%)", "Price Change (1D)"].includes(headerName)) {
                                return formatPercentage(raw);
                            }
                            return raw;
                        },
                    }));

                    const table = new Tabulator("#stock-table", {
                        data: financeData,
                        columns,
                        layout: "fitDataTable",
                        responsiveLayout: false,
                        height: "auto",
                    });
                    console.log("Desktop table rendered"); // Debug
                }

                if (skeletonLoader) skeletonLoader.style.display = "none";
            } else {
                console.log("No re-render needed"); // Debug
            }
        } else {
            stockTable.innerHTML = "<p>No data found.</p>";
            if (skeletonLoader) skeletonLoader.style.display = "none";
        }
    } catch (error) {
        console.error("Error in createTable:", error);
        document.getElementById("stock-table").innerHTML =
            "<p>Failed to load data.</p>";
    }
}

// Debounce resize events
let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("Resize event triggered"); // Debug
        createTable();
    }, 200); // Wait 200ms after last resize
});

// Initial call
createTable();

// Your notifications code (unchanged)
function renderNotifications(notifs) {
    const container = document.getElementById("ntf-container");
    container.innerHTML = notifs
        .map((notif) => {
            let content = notif.Content || "";
            console.log(`Notification Content: "${content}"`);
            const trimmedContent = content.trim().toLowerCase();
            let borderClass = "";
            if (trimmedContent.startsWith("bought")) {
                borderClass = "notifications__box--buy";
                console.log(`Class applied: ${borderClass}`);
            } else if (trimmedContent.startsWith("sold")) {
                borderClass = "notifications__box--sell";
                console.log(`Class applied: ${borderClass}`);
            } else {
                console.log("Default black border applied");
            }
            content = content.replace(/([\d\W]+)/g, "<strong>$1</strong>");
            content = content.replace(/^(\w+)/, "<strong>$1</strong>");
            return `
          <div class="notifications__box ${borderClass}">
              <img class="notifications__img" src="${notif.TickerImg}" alt="${notif.Ticker}">
              <div class="notifications__content">
                  <div class="notifications__header">
                      <div class="notifications__title">${notif.Ticker}</div>
                      <div class="notifications__date">${notif.Date}</div>
                  </div>
                  <div class="notifications__message">${content}</div>
              </div>
          </div>
      `;
        })
        .join("");

    document
        .querySelectorAll(".notifications__box")
        .forEach((box, index) => {
            setTimeout(() => box.classList.add("show"), index * 100);
        });
}

function toggleRender(notifs) {
    const container = document.getElementById("ntf-container");
    container.style.opacity = 0;
    setTimeout(() => {
        renderNotifications(notifs);
        container.style.opacity = 1;
    }, 300);
}

async function fetchNotifications() {
    const data = await fetchNotificationsData();
    if (!data || data.length === 0) {
        document.getElementById("ntf-container").innerHTML =
            "<p>No recent notifications.</p>";
        return;
    }
    const initialNotifs = data.sort(
        (a, b) => new Date(b.Date) - new Date(a.Date)
    );
    renderNotifications(initialNotifs);
}

// Notifications Rendering
function renderNotifications(notifs) {
    const container = document.getElementById("ntf-container");
    container.innerHTML = notifs
        .map((notif) => {
            let content = notif.Content || ""; // Ensure content is a string
            console.log(`Notification Content: "${content}"`); // Debug: Log raw content

            // Determine border class based on original content
            const trimmedContent = content.trim().toLowerCase();
            let borderClass = "";

            if (trimmedContent.startsWith("bought")) {
                // Check in lowercase
                borderClass = "notifications__box--buy";
                console.log(`Class applied: ${borderClass}`); // Debug: Confirm class
            } else if (trimmedContent.startsWith("sold")) {
                borderClass = "notifications__box--sell";
                console.log(`Class applied: ${borderClass}`); // Debug: Confirm class
            } else {
                console.log("Default black border applied"); // Debug: Confirm default
            }

            // Apply bold formatting
            content = content.replace(/([\d\W]+)/g, "<strong>$1</strong>");
            content = content.replace(/^(\w+)/, "<strong>$1</strong>");

            return `
  <div class="notifications__box ${borderClass}">
    <img class="notifications__img" src="${notif.TickerImg}" alt="${notif.Ticker}">
    <div class="notifications__content">
      <div class="notifications__header">
        <div class="notifications__title">${notif.Ticker}</div>
        <div class="notifications__date">${notif.Date}</div>
      </div>
      <div class="notifications__message">${content}</div>
    </div>
  </div>
`;
        })
        .join("");

    document
        .querySelectorAll(".notifications__box")
        .forEach((box, index) => {
            setTimeout(() => box.classList.add("show"), index * 100);
        });
}

function toggleRender(notifs) {
    const container = document.getElementById("ntf-container");
    container.style.opacity = 0;
    setTimeout(() => {
        renderNotifications(notifs);
        container.style.opacity = 1;
    }, 300);
}

async function fetchNotifications() {
    const data = await fetchNotificationsData();
    if (!data || data.length === 0) {
        document.getElementById("ntf-container").innerHTML =
            "<p>No recent notifications.</p>";
        return;
    }

    const initialNotifs = data.sort(
        (a, b) => new Date(b.Date) - new Date(a.Date)
    );
    renderNotifications(initialNotifs);
}

// Main Dashboard Update Function
async function updateDashboard() {
    const portfolioData = await fetchPortfolioData();
    if (portfolioData) {
        const processedData = processPortfolioData(portfolioData);
        if (processedData) {
            updateSummary(processedData);
            updatePortfolioChart(processedData.allocationData);
            updateAllocationChart(
                processedData.totalInvested,
                processedData.cashPosition
            );
        }
    }
    await createTable();
    await fetchNotifications();
}

document.addEventListener("DOMContentLoaded", updateDashboard);
