# FinaPilot Financial Modelling Workflow

This document outlines the end-to-end workflow for leveraging the FinaPilot Financial Modelling component, from data ingestion to advanced AI reasoning.

---

## 1. Data Ingestion (Integration & Import)
**Purpose**: To populate the model with baseline historical data and current transactions.

*   **CSV Import**: Use the `CSVImportWizard` to upload raw transactions. The system automatically deduplicates entries using the `orgId` and `source_id` composite key.
*   **Excel Sync**: Connect existing spreadsheets via the `ExcelSync` connector to map cells directly to model drivers.
*   **One-Click Generate**: Use the "AI Generate" button to have the system analyze your industry and current data to build a baseline model structure automatically.

---

## 2. Financial Statements Tab
**Purpose**: View standard GAAP/IFRS financial reports.

*   **Logic**: The `model_run` job processes drivers and historicals to generate an Income Statement, Balance Sheet, and Cash Flow Statement.
*   **Workflow**:
    1. Select your Model.
    2. Click **Run Model** to trigger a baseline computation.
    3. View the three primary statements in the grid.
    4. Use the "Provenance" link on any cell to trace it back to the raw source transaction.

---

## 3. Drivers & Scenarios Tab
**Purpose**: Define the levers that move your business.

*   **Logic**: High-performance DAG (Directed Acyclic Graph) engine handles formula recalculations.
*   **Workflow**:
    1. Define **Drivers** (e.g., Revenue Growth, Churn Rate).
    2. Create **Scenarios** (e.g., "Bull Case", "Worst Case").
    3. Adjust values for specific drivers within a scenario.
    4. The engine automatically propagates changes through the dependency graph.

---

## 4. Hypercube (Multidimensional) Tab
**Purpose**: Analyze cross-sectional data across multiple dimensions (e.g., Geography, Product, Department).

*   **Logic**: Uses the `HyperblockEngine` for multi-dimensional vectorized calculations.
*   **Workflow**:
    1. Initialize Dimensions in the "Dimensions & Rollups" section.
    2. Define members (e.g., "US", "Europe", "Asia").
    3. Pivot data in the viewer to see metrics broken down by these dimensions.

---

## 5. Forecasting Tab
**Purpose**: Predictive analysis using statistical and ML models.

*   **Logic**: Uses the Python `ForecastingEngine` with ARIMA, Neural, and Trend models.
*   **Workflow**:
    1. Select a metric (e.g., Total Revenue).
    2. Choose a forecasting method (e.g., Prophet, ARIMA).
    3. View the backtest results to check the MAPE (Mean Absolute Percentage Error) and accuracy.
    4. Save the forecast to your baseline model.

---

## 6. Risk Engine Tab
**Purpose**: Probabilistic "What-If" analysis using Monte Carlo simulations.

*   **Logic**: Injects stochastic distributions (Normal, Uniform, Triangular) into model drivers.
*   **Workflow**:
    1. Select drivers to randomize (e.g., Market Growth).
    2. Set distribution parameters (Mean, Standard Deviation).
    3. Run simulation (default 1,000 iterations).
    4. Analyze the "Fan Chart" for confidence bands (95% CI) and the "Probability of Survival" (Runway analysis).

---

## 7. Projections & Sensitivity Tab
**Purpose**: Long-term outlook and sensitivity analysis.

*   **Projections**: View the 24-month horizon based on current drivers and forecasts.
*   **Sensitivity**: Automatically runs 2-variable sensitivity analysis (e.g., Price vs. Volume) to show impact on EBITDA or Cash Balance.

---

## 8. Explainability Tab
**Purpose**: Deep-dive into model logic and strategic suggestions.

*   **Reasoning Hub**: Asks the AI "Why did my burn rate increase?" and receives a causal trace of the drivers.
*   **Strategic Suggestions**: AI analyzes the model's sensitivity and suggests optimizations (e.g., "Reduce COGS by 5% to extend runway by 4 months").
*   **Dependency Graph**: Visualize the causal links between all financial components.
