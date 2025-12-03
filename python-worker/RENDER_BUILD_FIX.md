# Fixing Render Build Error - Scipy Fortran Compiler Issue

## Problem

The build fails because `scipy` requires a Fortran compiler (gfortran) to build from source, but Render's build environment doesn't have it installed.

**Error:**
```
ERROR: Unknown compiler(s): [['gfortran'], ['flang-new'], ...]
```

## Solution

### Option 1: Use Python 3.12 (Recommended)

Python 3.12 has better pre-built wheel support for scipy. Create `runtime.txt`:

```txt
python-3.12.7
```

**Steps:**
1. Create `python-worker/runtime.txt` with: `python-3.12.7`
2. Update `requirements.txt` to use versions with pre-built wheels
3. Redeploy on Render

### Option 2: Use Updated Package Versions

Update `requirements.txt` to use newer versions that have pre-built wheels for Python 3.13:

```txt
numpy==1.26.4
scipy==1.13.1
pandas==2.2.2
```

### Option 3: Add Build Dependencies (Not Recommended)

This is complex and may not work on Render's build environment.

## Recommended Fix

I've updated your `requirements.txt` and created `runtime.txt` to use Python 3.12, which has better wheel support.

**Files Updated:**
- ✅ `python-worker/requirements.txt` - Updated to compatible versions
- ✅ `python-worker/runtime.txt` - Set to Python 3.12.7

**Next Steps:**
1. Commit these changes
2. Push to GitHub
3. Render will auto-redeploy
4. Build should succeed

