# FinaPilot API Documentation

## Base URL
`https://api.finapilot.com/api/v1`

## Authentication
Header: `Authorization: Bearer <token>`

## Excel Integration

### Upload XLSX
`POST /orgs/:orgId/import/xlsx`
- **Body**: `FormData` with `file`
- **Response**: `{ uploadKey, jobId }`

### Map Columns
`POST /orgs/:orgId/import/xlsx/map`
- **Body**: `{ uploadKey, mappingJson: { columnMappings: {...} } }`
- **Response**: `{ jobId }`

### List Mappings
`GET /orgs/:orgId/excel/mappings`

## Provenance

### Get Cell Provenance
`GET /provenance?model_run_id=:id&cell_key=:key&full=true`
- **Response**: `{ cell_key, transactions: [], assumptions: [], ... }`

## Monte Carlo

### Start Simulation
`POST /models/:model_id/montecarlo`
- **Body**: `{ numSimulations: 5000, drivers: [...] }`
- **Response**: `{ jobId, monteCarloJobId }`

### Get Results
`GET /montecarlo/:jobId`
- **Response**: `{ status, percentiles: {...}, survivalProbability: {...} }`

## Scenarios

### Create Snapshot
`POST /models/:model_id/snapshot`
- **Body**: `{ name, description }`

### Compare Runs
`GET /models/:model_id/compare?run_a=:id&run_b=:id`

## AI CFO

### Generate Plan
`POST /orgs/:orgId/ai-plans`
- **Body**: `{ goal: "Reduce burn rate" }`
- **Response**: `{ plan: { stagedChanges: [...] } }`

