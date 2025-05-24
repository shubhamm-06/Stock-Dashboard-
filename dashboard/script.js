// Function to fetch data with optional caching using the Cache API
async function fetchWithCache(url) {
    // TODO: Enable caching by uncommenting the following block to cache data for 30 minutes

    const cacheName = 'dashboard-cache-v1'; // Versioned cache name for easier updates
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const data = await cachedResponse.json();
      // Validate cache freshness (5 minutes)
      const cacheTime = new Date(cachedResponse.headers.get('date')).getTime();
      const now = Date.now();
      if (now - cacheTime < 5 * 60 * 1000) {
        console.log(`Returning cached data for ${url}`);
        return data;
      }
      // If cache is expired, proceed to fetch fresh data
    }
    
    // Fetch fresh data from the server
    try {
      const response = await fetch(url, { cache: "no-store" }); // Ensures no browser caching
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();

      // TODO: Enable caching by uncommenting the following line to store fresh data
      await cache.put(url, new Response(JSON.stringify(data), { headers: { 'date': new Date().toUTCString() } }));

      return data;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      return null; // Return null to allow calling functions to handle failure
    }
  }

  // Fetch portfolio data from Google Apps Script endpoint
  async function fetchPortfolioData() {
    const url = "https://script.google.com/macros/s/AKfycbyZf4DthqkVu_mM0xb1031tliQ2Fm9F_KvJR5RVIz0r0uujFqkbS6iBdU_YUGZweVD7TA/exec";
    return await fetchWithCache(url);
  }

  // Fetch notifications data from Google Apps Script endpoint
  async function fetchNotificationsData() {
    const url = "https://script.google.com/macros/s/AKfycbyZf4DthqkVu_mM0xb1031tliQ2Fm9F_KvJR5RVIz0r0uujFqkbS6iBdU_YUGZweVD7TA/exec?sheet=Notification";
    return await fetchWithCache(url);
  }

  // Process portfolio data to compute totals, P&L, cash position, and allocation
  function processPortfolioData(data) {
    if (!data || !Array.isArray(data)) {
      console.warn("Invalid portfolio data received");
      return null;
    }

    // Predefined colors for chart visualization
    const predefinedColors = [
      "#003366", "#004488", "#0055AA", "#0066CC", "#0077EE",
      "#0088FF", "#1199FF", "#22AAFF", "#33BBFF", "#44CCFF",
      "#003F5C", "#2F4B7C", "#665191", "#A05195", "#D45087",
      "#FF5733", "#FF7F50", "#FFA07A", "#FFD700", "#4CAF50",
    ];

    let totalInvested = 0;
    let totalCurrent = 0;
    const allocationData = [];

    // Iterate over data to calculate totals and prepare allocation
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
    const cashPosition = 1000000 - totalInvested; // Assumes initial cash of $1,000,000

    return { totalInvested, totalCurrent, pnl, cashPosition, allocationData };
  }

  // Update the summary section of the dashboard
  function updateSummary(data) {
    if (!data) {
      console.warn("No data provided to update summary");
      return;
    }

    const elements = {
      invested: document.querySelector('.summary__number[data-label="Invested"]'),
      current: document.querySelector('.summary__number[data-label="Current"]'),
      pnl: document.querySelector('.summary__number[data-label="P&L"]'),
      percentage: document.querySelector(".summary__percentage"),
      cash: document.querySelector('.summary__number[data-label="Cash Position"]'),
    };

    // Update invested amount
    if (elements.invested) {
      elements.invested.textContent = `$${data.totalInvested.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    // Update current value
    if (elements.current) {
      elements.current.textContent = `$${data.totalCurrent.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    // Update profit and loss
    if (elements.pnl) {
      elements.pnl.textContent = `${data.pnl >= 0 ? "+" : ""}$${data.pnl.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      elements.pnl.classList.toggle("positive", data.pnl >= 0);
      elements.pnl.classList.toggle("negative", data.pnl < 0);
    }

    // Update percentage change
    if (elements.percentage) {
      const percentage = ((data.pnl / data.totalInvested) * 100).toFixed(2);
      elements.percentage.textContent = `${percentage >= 0 ? "+" : ""}${percentage}%`;
      elements.percentage.classList.toggle("positive", percentage >= 0);
      elements.percentage.classList.toggle("negative", percentage < 0);
    }

    // Update cash position
    if (elements.cash) {
      elements.cash.textContent = `$${data.cashPosition.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  // Portfolio chart configuration
  let portfolioChart;

  // Plugin to display text in the center of the doughnut chart
  const centerTextPlugin = {
    id: "centerText",
    afterDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const centerX = chartArea.left + chartArea.width / 2;
      const centerY = chartArea.top + chartArea.height / 2;

      let textToDisplay = "Allocation";
      const activeElements = chart.getActiveElements();
      if (activeElements.length > 0) {
        const index = activeElements[0].index;
        textToDisplay = `${chart.data.labels[index]} (${chart.data.datasets[0].data[index].toFixed(2)}%)`;
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

  // Update or initialize the portfolio chart
  function updatePortfolioChart(allocationData) {
    const ctx = document.getElementById("portfolioChart")?.getContext("2d");
    if (!ctx) {
      console.error("Portfolio chart canvas not found");
      return;
    }

    const labels = allocationData.map((item) => item.ticker);
    const data = allocationData.map((item) => item.allocation);
    const colors = allocationData.map((item) => item.color);

    // Update color meaning legend
    const colorMeaning = document.getElementById("color-meaning");
    if (colorMeaning) {
      colorMeaning.innerHTML = allocationData
        .map(
          (item) => `
            <div class="portfolio__color-box">
              <div class="portfolio__color" style="background: ${item.color}"></div>
              <div class="portfolio__meaning">${item.ticker} (${item.allocation.toFixed(2)}%)</div>
            </div>
          `
        )
        .join("");
    }

    if (portfolioChart) {
      portfolioChart.data.labels = labels;
      portfolioChart.data.datasets[0].data = data;
      portfolioChart.data.datasets[0].backgroundColor = colors;
      portfolioChart.update();
    } else {
      portfolioChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 0,
            cutout: "60%",
            hoverOffset: 10,
          }],
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
          animation: { animateRotate: true, animateScale: true },
          hover: {
            onHover: (event, elements) => {
              event.native.target.style.cursor = elements.length ? "pointer" : "default";
              portfolioChart.draw();
            },
          },
        },
        plugins: [centerTextPlugin],
      });
    }
  }

  // Fund allocation chart configuration
  let allocationChart;

  // Update or initialize the fund allocation chart
  function updateAllocationChart(invested, cash) {
    const ctx = document.getElementById("allocationChart")?.getContext("2d");
    if (!ctx) {
      console.error("Allocation chart canvas not found");
      return;
    }

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
              barThickness: 60,
              borderRadius: 2,
            },
            {
              label: "Cash Position",
              data: [cash],
              backgroundColor: "#3498db",
              barThickness: 60,
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
                  return `${context.dataset.label}: $${value.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    }
  }

  // Stock table and mobile cards
  let cachedFinanceData = null; // Cache for portfolio data
  let lastIsMobile = null; // Track last mobile state to optimize re-rendering

  async function createTable() {
    try {
      const stockTable = document.getElementById("stock-table");
      const skeletonLoader = document.getElementById("skeleton-loader");
      if (!stockTable) {
        console.error("Stock table element not found");
        return;
      }

      // Fetch data if not already cached
      if (!cachedFinanceData) {
        cachedFinanceData = await fetchPortfolioData();
        console.log("Portfolio data fetched:", cachedFinanceData);
      }
      const financeData = cachedFinanceData;

      if (!financeData || financeData.length === 0) {
        stockTable.innerHTML = "<p>No data found.</p>";
        if (skeletonLoader) skeletonLoader.style.display = "none";
        return;
      }

      // Utility to format currency values
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

      // Utility to format percentage values with color coding
      const formatPercentage = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        const formatted = Math.abs(num).toFixed(2) + "%";
        return num
          ? `<span style="color: red;">-${formatted}</span>`
          : `<span style="color: green;">+${formatted}</span>`;
      };

      // Generate HTML for mobile card view
      const createCard = (data) => `
        <div class="mobile-data-card">
          <div class="card-data-row">
            <div class="card-pairs">
              <div class="card-pair">
                <span class="card-label">Qty</span>
                <span class="card-value">${data["Qty"]}</span>
              </div>
              <div class="card-pair">
                <span class="card-label">Avg</span>
                <span class="card-value">${formatCurrency(data["Avg Buy Price (P/S)"])}</span>
              </div>
            </div>
            <span class="card-percentage">${formatPercentage(data["P&L (%)"])}</span>
          </div>
          <div class="card-asset-header">
            <span class="card-asset-name">${data["Ticker"]}</span>
            <span class="card-loss">${formatCurrency(data["Present Value"] - data["Buy Value"])}</span>
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
              <span class="card-value">${formatCurrency(data["LTP"])} (${formatPercentage(data["Price Change (1D)"])})</span>
            </div>
          </div>
        </div>
      `;

      const isMobile = window.matchMedia("(max-width: 600px)").matches;

      // Re-render only if mobile state changes or table is empty
      if (lastIsMobile !== isMobile || stockTable.innerHTML === "") {
        lastIsMobile = isMobile;
        stockTable.innerHTML = "";

        if (isMobile) {
          stockTable.innerHTML = financeData.map(createCard).join("");
          console.log("Rendered mobile cards");
        } else {
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
              if (["Buy Value", "Avg Buy Price (P/S)", "LTP", "Present Value"].includes(headerName)) {
                return formatCurrency(raw);
              }
              if (["P&L (%)", "Price Change (1D)"].includes(headerName)) {
                return formatPercentage(raw);
              }
              return raw;
            },
          }));

          new Tabulator("#stock-table", {
            data: financeData,
            columns,
            layout: "fitDataTable",
            responsiveLayout: false,
            height: "auto",
          });
          console.log("Rendered desktop table");
        }

        if (skeletonLoader) skeletonLoader.style.display = "none";
      }
    } catch (error) {
      console.error("Error in createTable:", error);
      document.getElementById("stock-table").innerHTML = "<p>Failed to load data.</p>";
    }
  }

  // Debounce resize events to optimize table re-rendering
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log("Resize event triggered");
      createTable();
    }, 200); // 200ms debounce
  });

  // Render notifications with animation
  function renderNotifications(notifs) {
    const container = document.getElementById("ntf-container");
    if (!container) {
      console.error("Notification container not found");
      return;
    }

    container.innerHTML = notifs
      .map((notif) => {
        let content = notif.Content || "";
        const trimmedContent = content.trim().toLowerCase();
        let borderClass = "";
        if (trimmedContent.startsWith("bought")) {
          borderClass = "notifications__box--buy";
        } else if (trimmedContent.startsWith("sold")) {
          borderClass = "notifications__box--sell";
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

    // Animate notifications
    document.querySelectorAll(".notifications__box").forEach((box, index) => {
      setTimeout(() => box.classList.add("show"), index * 100);
    });
  }

  // Toggle notifications with fade effect
  function toggleRender(notifs) {
    const container = document.getElementById("ntf-container");
    if (!container) return;
    container.style.opacity = 0;
    setTimeout(() => {
      renderNotifications(notifs);
      container.style.opacity = 1;
    }, 300);
  }

  // Fetch and sort notifications
  async function fetchNotifications() {
    const data = await fetchNotificationsData();
    if (!data || data.length === 0) {
      document.getElementById("ntf-container").innerHTML = "<p>No recent notifications.</p>";
      return;
    }
    const sortedNotifs = data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    renderNotifications(sortedNotifs);
  }

  // Main function to update the entire dashboard
  async function updateDashboard() {
    const portfolioData = await fetchPortfolioData();
    if (portfolioData) {
      const processedData = processPortfolioData(portfolioData);
      if (processedData) {
        updateSummary(processedData);
        updatePortfolioChart(processedData.allocationData);
        updateAllocationChart(processedData.totalInvested, processedData.cashPosition);
      }
    }
    await createTable();
    await fetchNotifications();
  }

  // Initialize dashboard on page load
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Dashboard initializing...");
    updateDashboard();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const themeToggleButton = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement; // Refers to the <html> tag

    // Function to update the theme icon
    const updateThemeIcon = () => {
        const icon = themeToggleButton.querySelector("i");
        if (htmlElement.getAttribute("data-theme") === "dark") {
            icon.className = "fa-solid fa-sun"; // Light mode icon
        } else {
            icon.className = "fa-solid fa-moon"; // Dark mode icon
        }
    };

    // Toggle theme on button click
    themeToggleButton.addEventListener("click", () => {
        const currentTheme = htmlElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        htmlElement.setAttribute("data-theme", newTheme);
        updateThemeIcon();
    });

    // Initialize the icon on page load
    updateThemeIcon();
});