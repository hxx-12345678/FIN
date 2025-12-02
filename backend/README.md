# FinaPilot Backend API Server

Node.js + TypeScript backend for FinaPilot financial modeling platform.

## Architecture

- **Node.js Backend**: REST API, authentication, job creation, metadata management
- **Python Worker**: Heavy compute tasks (Monte Carlo, exports, CSV parsing)
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: AWS S3 for file storage

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Database Setup**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Organizations
- `GET /api/v1/orgs/:id` - Get organization
- `POST /api/v1/orgs/:id/invite` - Invite user
- `POST /api/v1/orgs/:id/roles` - Update user role

### Connectors
- `POST /api/v1/connectors/orgs/:org_id/connectors/:type/start-oauth` - Start OAuth
- `GET /api/v1/connectors/:id/callback` - OAuth callback
- `POST /api/v1/connectors/:id/sync` - Sync connector
- `GET /api/v1/connectors/:id/status` - Get connector status

### CSV Import
- `POST /api/v1/orgs/:org_id/import/csv` - Import CSV (returns job_id)
- `GET /api/v1/jobs/:job_id` - Get job status

### Models
- `POST /api/v1/orgs/:org_id/models` - Create model
- `GET /api/v1/orgs/:org_id/models` - List models
- `POST /api/v1/models/:model_id/run` - Run model (returns job_id)
- `GET /api/v1/models/:model_id/runs/:run_id` - Get run results

### Monte Carlo
- `POST /api/v1/models/:model_id/montecarlo` - Start Monte Carlo (returns job_id)
- `GET /api/v1/montecarlo/:job_id` - Get Monte Carlo results

### Provenance
- `GET /api/v1/provenance?model_run_id={id}&cell={cell_key}` - Get provenance for a cell
- `GET /api/v1/provenance/bulk?model_run_id={id}&cells=cellA,cellB,...` - Get provenance for multiple cells
- `GET /api/v1/provenance/search?org_id={id}&query={search_term}` - Search provenance entries
- `POST /api/v1/provenance/export` - Create provenance export job

### Exports
- `POST /api/v1/models/:run_id/export` - Create export (returns job_id)
- `GET /api/v1/exports/:id` - Get export with signed URL

### Debug
- `POST /api/v1/debug/create-demo` - Create demo data

## Project Structure

```
backend/
├── src/
│   ├── config/       # Configuration (database, env)
│   ├── controllers/   # Request handlers
│   ├── services/      # Business logic
│   ├── repositories/  # Data access layer
│   ├── middlewares/   # Auth, RBAC, error handling
│   ├── routes/        # API route definitions
│   ├── utils/         # Utilities (JWT, S3, logger)
│   ├── jobs/          # Job creation helpers
│   └── app.ts         # Express app setup
├── prisma/
│   └── schema.prisma  # Database schema
└── tests/             # Test files
```

## Job Queue

The backend creates jobs in the `jobs` table. The Python worker polls this table every 2 seconds and processes jobs.

Job types:
- `csv_import` - CSV parsing and transaction import
- `model_run` - Deterministic model computation
- `monte_carlo` - Monte Carlo simulations
- `export_pdf` - PDF generation
- `export_pptx` - PowerPoint generation
- `export_csv` - CSV export
- `provenance_export` - Provenance data export (ZIP with JSON/CSV)

## Authentication

Uses JWT tokens. Include in requests:
```
Authorization: Bearer <token>
```

## RBAC

Roles: `admin`, `finance`, `viewer`

- Admin: Full access
- Finance: Read/write models, create runs
- Viewer: Read-only access

## Provenance API

The Provenance Engine provides complete traceability for model cells, showing which transactions, assumptions, and AI prompts influenced each value.

### Get Provenance for a Cell

```bash
curl -X GET "http://localhost:5000/api/v1/provenance?model_run_id=abc123&cell=2026-03:opEx:Salaries&limit=50&offset=0" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "ok": true,
  "model_run_id": "abc123",
  "cell_key": "2026-03:opEx:Salaries",
  "entries": [
    {
      "id": "entry-1",
      "source_type": "txn",
      "source_ref": ["txn-uuid-1", "txn-uuid-2"],
      "confidence_score": 0.95,
      "created_at": "2025-11-15T12:00:00Z",
      "summary": {
        "countTxns": 2,
        "totalAmount": 12000.00,
        "firstTxnDate": "2026-03-01T00:00:00Z",
        "lastTxnDate": "2026-03-15T00:00:00Z"
      },
      "sampleTransactions": [
        {
          "id": "txn-uuid-1",
          "date": "2026-03-01T00:00:00Z",
          "amount": 5000.00,
          "currency": "USD",
          "category": "Salaries",
          "description": "Monthly salary payment"
        },
        {
          "id": "txn-uuid-2",
          "date": "2026-03-15T00:00:00Z",
          "amount": 7000.00,
          "currency": "USD",
          "category": "Salaries",
          "description": "Bonus payment"
        }
      ],
      "links": {
        "downloadTransactionsUrl": "/api/v1/provenance/entry-1/transactions?format=csv"
      }
    },
    {
      "id": "entry-2",
      "source_type": "prompt",
      "source_ref": {"promptId": "prompt-uuid-1"},
      "promptId": "prompt-uuid-1",
      "confidence_score": 0.85,
      "created_at": "2025-11-15T12:05:00Z",
      "promptPreview": {
        "id": "prompt-uuid-1",
        "renderedPrompt": "What is the expected salary expense for March 2026?",
        "responseText": "Based on historical data, expected salary expense is $12,000",
        "provider": "openai",
        "modelUsed": "gpt-4"
      },
      "links": {
        "openPromptUrl": "/api/v1/prompts/prompt-uuid-1"
      }
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### Bulk Provenance Query

```bash
curl -X GET "http://localhost:5000/api/v1/provenance/bulk?model_run_id=abc123&cells=2026-03:opEx:Salaries,2026-03:opEx:Marketing" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "ok": true,
  "model_run_id": "abc123",
  "data": {
    "2026-03:opEx:Salaries": [
      {
        "id": "entry-1",
        "source_type": "txn",
        ...
      }
    ],
    "2026-03:opEx:Marketing": [
      {
        "id": "entry-3",
        "source_type": "assumption",
        ...
      }
    ]
  }
}
```

### Search Provenance

```bash
curl -X GET "http://localhost:5000/api/v1/provenance/search?org_id=org123&query=invoice123&limit=50" \
  -H "Authorization: Bearer <token>"
```

### Export Provenance

```bash
curl -X POST "http://localhost:5000/api/v1/provenance/export" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model_run_id": "abc123",
    "format": "json",
    "include_transactions": true
  }'
```

**Response:**
```json
{
  "ok": true,
  "jobId": "job-uuid-1"
}
```

The export job creates a ZIP file containing:
- `provenance.json` - All provenance entries
- `transactions.csv` - Related transactions
- `prompts.json` - Related prompts
- `metadata.json` - Export metadata

### Frontend Integration Example

```typescript
// Fetch provenance for a cell
const fetchProvenance = async (modelRunId: string, cellKey: string) => {
  const response = await fetch(
    `/api/v1/provenance?model_run_id=${modelRunId}&cell=${cellKey}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  
  if (data.ok) {
    // Display provenance entries
    data.entries.forEach((entry: ProvenanceEntry) => {
      if (entry.source_type === 'txn') {
        // Show transaction summary
        console.log(`${entry.summary.countTxns} transactions, Total: $${entry.summary.totalAmount}`);
        
        // Show sample transactions
        entry.sampleTransactions?.forEach((txn) => {
          console.log(`- ${txn.date}: $${txn.amount} - ${txn.description}`);
        });
      } else if (entry.source_type === 'prompt') {
        // Show AI explanation
        console.log(`AI Insight: ${entry.promptPreview?.responseText}`);
      }
    });
  }
};
```

### Cell Key Format

Cell keys follow the canonical format: `YYYY-MM:item:subitem`

Examples:
- `2026-03:opEx:Salaries` - March 2026 Operating Expenses > Salaries
- `2026-03:revenue:SAAS` - March 2026 Revenue > SAAS
- `2026-03:opEx` - March 2026 Operating Expenses (no subitem)

## License

ISC

