AUTONOMIC TRACKER V1.2 UPDATE

1. Replace the full contents of src/App.tsx with App.tsx from this folder.
2. Replace the full contents of src/db.ts with db.ts from this folder.
3. Copy the contents of add-to-styles.css and paste them at the END of src/styles.css.
4. Commit each change directly to main. GitHub Actions will redeploy automatically.

Before editing, use the current app Export tab to download a JSON backup. Existing records should remain in IndexedDB. The code includes a compatibility function that converts old single BP/HR/temperature fields into vital reading slot 1 when an old record is opened.
