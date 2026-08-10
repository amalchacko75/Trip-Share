# TripShare MVP

A PWA for sharing original-quality photos without automatically uploading originals.

Current MVP:
- Django REST API
- React + TypeScript + Vite
- Shared spaces
- User registration/login using token authentication
- Select photos locally from the device
- Generate thumbnails in the browser
- Upload only metadata + thumbnail to Django
- Keep the original photo in the browser/device
- Shared gallery displays thumbnails
- Owner can preview/download the locally selected original while the page is open

Important:
The browser cannot be treated as a permanent file server. If the owner closes/reloads the PWA, the selected File object may no longer be available. P2P/WebRTC is intentionally not implemented yet.

## Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Create two users in separate browser profiles/tabs, create a shared space, and use the space ID to add the second user through the API/admin during this MVP.

## Production direction

Do not store original photos on Render's filesystem. The current backend stores thumbnails locally only for development. Original files remain client-side.

Next milestones:
1. Better invitations/member UI
2. IndexedDB/OPFS local source cache
3. WebRTC signalling + P2P original transfer
4. Resumable online transfer as optional fallback
# Trip-Share
