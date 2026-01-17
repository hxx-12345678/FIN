# Monte Carlo Forecasting - Complete Test Documentation

## Overview
This document describes the comprehensive test script for the Monte Carlo Forecasting component.

## Test Script Location
`backend/test-monte-carlo-complete.js`

## Prerequisites
1. Backend server must be running on `http://localhost:3001`
2. Database must be configured and accessible
3. Test user credentials:
   - Email: `cptjacksprw@gmail.com`
   - Password: `Player@123`

## Running Tests

```bash
# Make sure backend is running first
cd backend
npm start  # or: node dist/app.js

# In another terminal, run tests
cd D:\Fin
node backend/test-monte-carlo-complete.js
```

## Test Coverage

### 1. Authentication Test ✅
- Tests login with credentials
- Verifies token is obtained
- Fetches org ID from `/auth/me` if needed
- **Expected**: 200/201 status, valid token and org ID

### 2. Get Models Test ✅
- Lists all models for the organization
- Verifies response structure
- Selects first model for testing
- **Expected**: Array of models, valid model ID extracted

### 3. List Monte Carlo Jobs Test ✅
- Lists all Monte Carlo jobs for a model
- Verifies response structure
- Finds completed jobs if available
- **Expected**: Array of jobs, job ID extracted if available

### 4. Get Monte Carlo Result Test ✅
- Retrieves detailed results for a completed job
- Verifies result structure:
  - Status validation (done/completed/processing/queued)
  - Percentiles structure (`percentiles_table` or `monthly` format)
  - P5, P50, P95 arrays exist and contain numbers
  - Sensitivity JSON structure
  - Survival probability structure with overall data
  - Confidence level (0-1 range)
- **Expected**: Valid result structure with all required fields

### 5. Create Monte Carlo Job Test ✅
- Creates a new Monte Carlo simulation job
- Uses test driver parameters:
  - Revenue Growth: mean=8, stdDev=3
  - Churn Rate: mean=5, stdDev=2
- **Expected**: Job created successfully, job ID returned

### 6. Parameter Changes Test ✅
- Tests creating jobs with different parameter sets:
  - **High Revenue Growth**: mean=15, churn=3
  - **Low Revenue Growth**: mean=3, churn=8
- Verifies each parameter set creates a job successfully
- **Expected**: All parameter variations create jobs

### 7. Job Status Polling Test ✅
- Polls job status until completion
- Maximum 10 attempts with 2-second intervals
- Verifies job reaches 'done' or 'completed' status
- **Expected**: Job completes within timeout

### 8. All Tabs Data Test ✅
Tests data structure for each tab:

#### Simulation Results Tab:
- Survival probability structure
- Overall statistics (total simulations > 0)
- Percentage surviving full period
- **Expected**: All survival probability data present and valid

#### Fan Chart Tab:
- Percentiles arrays (P5, P50, P95)
- Array length > 0
- Values are numbers
- **Expected**: All percentile arrays exist with numeric values

#### Sensitivity Analysis Tab:
- Sensitivity JSON object structure
- **Expected**: Valid sensitivity data object

#### Explainability Tab:
- Risk metrics calculable from percentiles
- Value at Risk (5%) calculation
- Confidence level present
- **Expected**: Risk metrics can be calculated, confidence level exists

### 9. Export Functionality Test ✅
- Verifies data structure needed for export
- Checks for job ID, percentiles/summary, status
- **Expected**: All export data fields present

### 10. Deterministic Mode Test ✅
- Creates job with stdDev=0 (no variation)
- Tests deterministic behavior
- **Expected**: Job created successfully

## Test Results Interpretation

### Success Indicators:
- ✅ All tests pass (Success Rate = 100%)
- ✅ All API endpoints return expected status codes
- ✅ All data structures validated
- ✅ All values are correct types (numbers, arrays, objects)

### Failure Indicators:
- ❌ Authentication fails (check credentials/server)
- ❌ API endpoints return errors (check backend logs)
- ❌ Missing required data fields
- ❌ Invalid data types or structures

## Frontend Component Testing Checklist

While the script tests API endpoints, manually verify in the UI:

### Drivers & Distributions Tab:
- [ ] All drivers display correctly
- [ ] Slider controls work for mean/stdDev/min/max
- [ ] Distribution type selector works
- [ ] Parameter changes update correctly

### Simulation Results Tab:
- [ ] Survival probability cards show correct values
- [ ] Median, P95, P5 cards display properly
- [ ] Runway distribution histogram renders
- [ ] All percentage values are between 0-100%

### Fan Chart Tab:
- [ ] Bright colors display (Green, Blue, Purple, Orange, Cyan, Red)
- [ ] Confidence level shown in description
- [ ] All percentile bands visible
- [ ] Median line clearly marked
- [ ] Tooltips show correct values

### Sensitivity Analysis Tab:
- [ ] Tornado chart displays
- [ ] Drivers sorted by correlation magnitude
- [ ] Correlation values shown
- [ ] Chart is readable and well-labeled

### Explainability Tab:
- [ ] Top 3 drivers displayed with contributions
- [ ] Risk metrics show correct values (not "$0" or "0%")
- [ ] Value at Risk displays properly
- [ ] Downside Deviation calculates correctly
- [ ] Probability of Loss shows percentage

### Export Button:
- [ ] Button is enabled when results exist
- [ ] Click triggers JSON download
- [ ] Downloaded file contains all result data
- [ ] File name includes date

### Mode Switching:
- [ ] Deterministic mode shows single values
- [ ] Monte Carlo mode shows probabilistic bands
- [ ] Mode toggle works correctly

## Common Issues and Solutions

### Issue: Authentication Fails
**Solution**: Check backend server is running and credentials are correct

### Issue: No Models Found
**Solution**: Create a model first via Financial Modeling component

### Issue: Jobs Not Completing
**Solution**: Check Python worker is running and processing jobs

### Issue: Risk Metrics Show "$0"
**Solution**: Verify percentiles data structure has valid P5/P50 values

### Issue: Confidence Level Not Displayed
**Solution**: Check `monteCarloResults.confidenceLevel` is set in result

## Test Output Example

```
✅ PASS: Login should succeed
✅ PASS: Get models should return 200
✅ PASS: List Monte Carlo jobs should return 200
✅ PASS: Get Monte Carlo result should return 200
✅ PASS: Status should be valid
✅ PASS: Percentiles should have percentiles_table or monthly structure
✅ PASS: P50 should be an array
✅ PASS: Create Monte Carlo job should return 200/201
✅ PASS: Parameter change "High Revenue Growth" should create job successfully
✅ PASS: Job should complete successfully within timeout
✅ PASS: Survival probability should have overall data
✅ PASS: P50 percentile array should exist and have data
✅ PASS: Value at Risk (5%) should be calculable and be a number

📊 TEST SUMMARY
Total Tests: 25
Passed: 25
Failed: 0
Success Rate: 100.00%

✅ ALL TESTS PASSED!
```

## Notes

- The script uses smaller simulation counts (100-1000) for faster testing
- Real production simulations may use 5000+ simulations
- Some tests may take time if jobs need to process
- All tests are designed to be idempotent and can be run multiple times
