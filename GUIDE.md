# Coffee Beats by Life - Setup Guide (Step by Step)

QR table ordering + Cashier Terminal + Admin Dashboard.
Stack: React (Vite, TypeScript) frontend, FastAPI (Python) backend, MongoDB database.

## Default logins (palitan sa Admin > Settings > Staff logins)
| Role | URL | Username | Password |
|---|---|---|---|
| Admin | /admin | admin | admin123 (kailangan i-check ang Terms and Conditions) |
| Cashier | /cashier | cashier | cashier123 |

Customer menu per table: `/t/1`, `/t/2`, ... (QR codes are in Admin > Table QR).

---

## A. Kunin ang code
1. Sa Emergent, pindutin ang **Download Code** (ZIP) o **Save to GitHub**.
2. Kung ZIP: i-extract, halimbawa sa `C:\capstone\coffee-beats`.

## B. I-install ang kailangan (isang beses lang)
1. **Python 3.11+** - https://www.python.org/downloads/ (i-check ang "Add Python to PATH").
2. **Node.js 20+** - https://nodejs.org/ then sa terminal: `npm install -g yarn`
3. **MongoDB Community Server** - https://www.mongodb.com/try/download/community (i-install bilang Service para auto-start).
   - Alternatibo (cloud): gumawa ng libreng cluster sa https://www.mongodb.com/atlas at kopyahin ang connection string.

## C. Patakbuhin ang Backend (Terminal 1)
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
pip install fastapi "uvicorn[standard]" motor pymongo pydantic python-dotenv openpyxl
```
Gumawa ng file na `backend/.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="coffeebeats"
CORS_ORIGINS="*"
```
(Kung Atlas, ilagay ang Atlas connection string sa MONGO_URL.)

Run:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Sa unang takbo, kusa nitong gagawin ang admin/cashier accounts, 40 tables, settings at starter menu.
Test: buksan ang http://localhost:8001/api/ - dapat may lumabas na `{"message": ...}`.

## D. Patakbuhin ang Frontend (Terminal 2)
```bash
cd frontend
yarn install
yarn dev
```
Buksan ang http://localhost:3000 . Ang `/api` ay naka-proxy papunta sa backend (port 8001).

## E. Subukan sa phone (same Wi-Fi)
1. Alamin ang IP ng laptop (`ipconfig` sa Windows, hal. 192.168.1.10).
2. Sa phone buksan ang `http://192.168.1.10:3000/t/1`.
3. Sa Admin > Table QR, ilagay ang `http://192.168.1.10:3000` sa "Website address used inside the QR codes" bago mag-print, para gumana ang scan.

## F. Ilagay sa GitHub
Option 1 (pinakamadali): sa Emergent pindutin ang **Save to GitHub**, piliin ang repository, Save.

Option 2 (manual):
1. Gumawa ng account sa https://github.com at mag-click ng **New repository** (hal. `coffee-beats`). Huwag i-check ang README.
2. I-install ang Git: https://git-scm.com/downloads
3. Sa folder ng project:
```bash
git init
git add .
git commit -m "Coffee Beats by Life ordering system"
git branch -M main
git remote add origin https://github.com/USERNAME/coffee-beats.git
git push -u origin main
```
4. Huwag i-upload ang `.env` na may totoong passwords o database link - idagdag ang `backend/.env` sa `.gitignore`.

## G. Paganahin mula sa GitHub sa ibang computer
```bash
git clone https://github.com/USERNAME/coffee-beats.git
cd coffee-beats
```
Ulitin ang steps C at D.

## H. Paano gamitin
1. **Admin**: login (tick Terms and Conditions) -> Settings: ilagay ang GCash account name, number at i-upload ang GCash QR. Products: ayusin ang menu at pictures. Table QR: magdagdag ng tables (walang limit), i-print ang QR codes.
2. **Customer**: i-scan ang QR sa mesa -> pumili ng items -> DONE -> CONFIRM ORDER -> nickname, notes -> Cash / GCash / Card -> Place order.
3. **Cashier**: login -> makikita agad ang bagong order -> i-verify ang bayad (cash/GCash app/card terminal) -> Confirm payment -> Mark as served -> i-print ang Billing statement/Receipt at ibigay kasama ng pagkain (o pagkatapos kumain kung cash).
4. **Backup**: Admin > Backup and Export -> Download Excel (may date filter) at Download backup (.json). I-upload ang backup sa Google Drive bilang cloud backup. Restore from file kung kailangan.

## Mahalagang paalala bago i-deploy
- Palitan agad ang default passwords.
- Ilagay ang totoong GCash QR, account name at number sa Settings.
- Palitan ang sample na product photos/prices ng inyong totoong menu.
- Kapag naka-HTTPS ang deployment, idagdag ang `COOKIE_SECURE=true` sa backend `.env`.
