# FinaPilot: The Autonomous AI-CFO Operating System

FinaPilot is an industrial-grade, AI-driven financial planning and analysis (FP&A) platform designed to automate the office of the CFO. It combines a high-performance mathematical computation engine with a multi-agent AI orchestrator to provide real-time strategic insights, predictive forecasting, and autonomous data governance.

---

## 🏗️ System Architecture

FinaPilot uses a specialized **Three-Layer Strategic Stack**:

1.  **Experience Layer (Frontend)**: A high-fidelity Next.js 14 dashboard providing real-time data visualization, natural language interfaces, and collaborative modeling environments.
2.  **Orchestration Layer (Backend)**: A Node.js TypeScript API that manages business logic, role-based access control (RBAC), and coordinates a multi-agent system (Strategic, Analytics, Risk, and Compliance agents).
3.  **Computation Layer (Python Worker)**: A high-performance Python environment handling the "Heavy Math":
    *   **Hyperblock DAG Engine**: Vectorized dependency graph recomputation.
    *   **Reasoning Engine**: Causal driver analysis and logic explanation.
    *   **Risk Engine**: Monte Carlo simulations for 10,000+ paths.
    *   **Forecasting Engine**: ML-based ARIMA and Seasonal Decomposition models.

---

## ⚡ Core Feature Modules

### 1. AI CFO Assistant (The Decision Engine)
The heart of FinaPilot is an agentic assistant that goes beyond basic chatbots.
*   **Multi-Agent Collaboration**: Orchestrates specialized agents (Forecasting, Risk, Strategic) to answer complex queries.
*   **Staged Changes Flow**: AI suggestions are presented as a "Draft Plan" that users can review, modify, and promote to the live model.
*   **Actionable Insights**: Detects cash runway issues, suggests unit economic improvements, and identifies M&A opportunities autonomously.
*   **Logic Explainability**: Every AI recommendation includes a "Thinking Process" and explicit links to the underlying financial data sources.

### 2. Hyperblock Computation Engine (DAG)
A next-generation modeling engine that replaces static spreadsheets with a dynamic dependency graph.
*   **Topological Recomputation**: Uses `networkx` to update only affected downstream nodes when an input changes, enabling sub-millisecond real-time updates.
*   **Formula Transparency**: Every cell's formula is visible and traced back to its "leaf" drivers.
*   **Vectorized Math**: Powered by `numpy` and `sympy` to handle complex multi-dimensional models across 36+ month horizons instantly.
*   **Computation Tracing**: Visual audit trail showing exactly *why* a number changed and which drivers triggered the update.

### 3. AI Scenario Planning & What-If Analysis
Model the future in seconds using natural language or structured templates.
*   **NLP Discovery**: Ask "What happens if we double our engineering headcount in Q3?" and see the impact on burn and runway instantly.
*   **Branch-and-Merge Modeling**: Create isolated scenario branches (Base, Upside, Downside) without corrupting the baseline model.
*   **Scenario Comparison**: Visual side-by-side delta analysis between various business assumptions.
*   **Version History**: Full rollback capabilities to any previous state of the model.

### 4. 3-Statement Financial Modeling
Autonomous generation of investor-ready financial statements.
*   **Automated Accounting Linkages**: Real-time synchronization between the Income Statement, Balance Sheet, and Cash Flow Statement.
*   **GAAP/IFRS Alignment**: Enforces the $Assets = Liabilities + Equity$ equation across all forecast periods.
*   **Direct & Indirect Cash Flow**: Supports both methods for cash flow projection based on transactional data.
*   **Retained Earnings Flow**: Automatically handles the closing link between Net Income and Shareholders' Equity.

### 5. Monte Carlo Risk Engine
Industrial-grade uncertainty modeling for robust planning.
*   **Probabilistic Outcomes**: Runs 10,000+ simulations to provide a "Confidence Corridor" rather than a single-point forecast.
*   **Percentile Analysis**: Understand your "P10", "P50", and "P90" outcomes for revenue and cash-out dates.
*   **Stress Testing**: Automatically simulates "Black Swan" events to test business resilience.
*   **Sensitivity Heatmaps**: Identifies which assumptions carry the highest risk variance.

### 6. Semantic Ledger & Data Provenance
Bridging the gap between raw transactions and strategic metrics.
*   **Causal Provenance**: Click any number in a financial statement to see the exact transactions and assumptions that created it.
*   **Semantic Layer**: Converts raw accounting data into "Business Metrics" (CAC, LTV, MRR) through a governed mapping layer.
*   **Deduplication & Audit**: Advanced hashing algorithms prevent duplicate imports and maintain a "Source of Truth" ledger.
*   **One-Click Correction**: Adjust or re-categorize at the ledger level with a full audit log of who made the change.

### 7. Governance, Approvals & Audit
Platform-wide trust and oversight for the finance team.
*   **Approval Workflows**: Sensitive changes (e.g., modifying payroll assumptions or large expenses) require formal approval from authorized personnel.
*   **Escalation Logic**: AI-detected anomalies or high-variance changes automatically trigger escalation to the Board or Admin.
*   **Immutable Audit Logs**: Every model run, user edit, and AI action is logged for compliance (SOC2/FINRA ready).
*   **RBAC Controls**: Granular permissions (Viewer, Finance, Admin) across all organizational resources.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Recharts, Lucide, Framer Motion |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL |
| **AI/Worker** | Python 3.11, FastAPI, Sympy, Numpy, Scikit-Learn, Statsmodels, NetworkX |
| **Auth** | JWT, Google OAuth 2.0, RBAC/ABAC Middleware |
| **Infrastructure** | Docker, AWS (S3, RDS, Lambda), Redis (for task queuing) |

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js v18+
*   Python 3.11+
*   PostgreSQL 14+
*   Gemini API Key (for the Reasoning Engine)

### 2. Installation

#### Clone the repository:
```bash
git clone https://github.com/finapilot/finapilot.git
cd finapilot
```

#### Setup Backend:
```bash
cd backend
npm install
# Configure .env with DATABASE_URL
npx prisma migrate deploy
npm run dev
```

#### Setup Python Worker:
```bash
cd python-worker
pip install -r requirements.txt
# Configure .env with GEMINI_API_KEY
uvicorn app:app --port 5000
```

#### Setup Frontend:
```bash
cd client
npm install
npm run dev
```

---

## 📈 Roadmap & Industrial Future
FinaPilot is evolving from an AI Assistant into an **Autonomous Finance Engine**.
*   **Direct ERP Integrations**: Deep-linking with Oracle NetSuite, SAP, and Microsoft Dynamics 365.
*   **Real-time Anomaly Response**: Autonomous budget adjustments based on detected variance.
*   **Predictive Revenue Recognition**: ML models that predict churn *before* it happens based on user usage datasets.

---
© 2026 FinaPilot Systems Inc. | Built for the Modern CFO.
