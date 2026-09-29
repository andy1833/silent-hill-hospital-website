# Silent Hill Hospital website

Website + admin panel (Node.js, Express). Data is stored in a JSON file and uploaded photos on disk.

## Run it locally
```
npm install
npm start
```
- Website: http://localhost:3000
- Admin:   http://localhost:3000/admin

On the very first start a random admin password is printed in the terminal (username `admin`).
Change it in **Account -> My password**. Add staff under **Account -> Users & roles**.

## Deploy on Railway
1. Push this repo to GitHub, then in Railway choose **New Project -> Deploy from GitHub repo**.
2. Open the service -> **Variables** and add:
   - `ADMIN_INITIAL_PASSWORD` = a strong password (used only when the first admin is created)
3. Attach a **Volume** to the service mounted at `/data`. Without a volume, data and uploaded photos
   are lost on every redeploy. The app detects the volume automatically (`RAILWAY_VOLUME_MOUNT_PATH`).
4. **Settings -> Networking -> Generate Domain** to get your public https address.
5. Visit `https://<your-domain>/admin` and sign in as `admin`.

Health check: `/healthz`.

### Environment variables
| Variable | Purpose |
|---|---|
| `ADMIN_INITIAL_PASSWORD` | Password for the first admin, only when the account is first created |
| `ADMIN_PASSWORD` | Resets the first admin's password on every start (use only to recover a lost password, then remove it) |
| `DATA_DIR`, `UPLOAD_DIR` | Override where data and uploads are stored |
| `PORT` | Set automatically by Railway |

### Backups
Everything lives in `db.json` (in the data folder) and the `uploads` folder. Download or snapshot them regularly.

## Security and reports
- Passwords are stored as salted scrypt hashes. Sessions are random 256-bit tokens in HttpOnly, SameSite=Strict (and Secure on HTTPS) cookies.
- Roles: **reception** (requests only), **editor** (plus content and reports), **admin** (plus users).
- Run the self-test: `node scripts/security-check.js https://your-site` (public checks; safe on the live site).
  Full test on a throwaway local copy only: start the site with a temporary `DATA_DIR`, `UPLOAD_DIR`, `PORT=3006` and
  `ADMIN_INITIAL_PASSWORD`, then `ADMIN_PASSWORD=... node scripts/security-check.js http://localhost:3006`.
- Admin **Reports** shows page views, visitors, bookings and inquiries, with CSV downloads. Visits are counted without cookies
  or stored IP addresses, and Do-Not-Track is honoured.
