# Setting Python Version on Render

## Problem

Render is using Python 3.13.4 by default, but scipy doesn't have pre-built wheels for Python 3.13 yet, causing build failures.

## Solution: Set Python Version in Render Dashboard

Since `runtime.txt` in a subdirectory might not be detected, set the Python version directly in Render:

### Option 1: Set in Render Dashboard (Recommended)

1. Go to your **Python Worker** service on Render
2. Go to **Settings** tab
3. Scroll to **"Environment"** section
4. Add environment variable:
   ```
   PYTHON_VERSION=3.12.7
   ```
5. Or use the **"Python Version"** dropdown if available
6. Save and redeploy

### Option 2: Use runtime.txt in Root Directory

Create `runtime.txt` in the **root** of your repository (not in python-worker/):

```txt
python-3.12.7
```

Then in Render:
- **Root Directory:** Leave empty (or set to repository root)
- Render will detect `runtime.txt` in root

### Option 3: Update Build Command

Add Python version specification to build command:

**Build Command:**
```bash
python3.12 -m pip install -r requirements.txt
```

But this requires Python 3.12 to be available, which might not work.

## Recommended: Use Render Environment Variable

**Best approach:** Set `PYTHON_VERSION=3.12.7` in Render dashboard environment variables.

This ensures Render uses Python 3.12.7, which has scipy wheels available.

