# Fix: "Running scripts is disabled on this system"

When you see this error in PowerShell:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## Option 1: Allow scripts (recommended)

In **PowerShell** (run as your user, no admin needed), run **once**:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Type `Y` and press Enter. Then run:

```powershell
npm run dev:frontend
npm run dev:backend
```

## Option 2: Use the batch files (no PowerShell change)

Double-click or run from **Command Prompt (cmd)**:

- **run-backend.bat** – starts the backend
- **run-frontend.bat** – starts the frontend

Or in **cmd** (not PowerShell):

```cmd
cd "d:\Agricultural Supply Chain System"
run-backend.bat
```

In a second cmd window:

```cmd
run-frontend.bat
```

## Option 3: Use Command Prompt instead of PowerShell

1. Press `Win + R`, type `cmd`, press Enter.
2. In the Command Prompt window:
   ```cmd
   cd "d:\Agricultural Supply Chain System"
   npm run dev:backend
   ```
3. Open another Command Prompt and run:
   ```cmd
   cd "d:\Agricultural Supply Chain System"
   npm run dev:frontend
   ```

Then open **http://localhost:5173** in your browser.
