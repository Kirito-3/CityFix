# CityFix Admin Panel Testing & Verification Guide

This guide details step-by-step verification flows to test the **React Admin Dashboard & Authority Operations Panel** features, APIs, and real-time syncing mechanisms.

---

## 1. Environment Verification

Before running test steps, ensure the Node.js backend server is actively running:
* **Server Address:** `http://localhost:5000`
* **API Health Check:** Verify `http://localhost:5000/api/v1/health` returns `status: "UP"`.

---

## 2. Dynamic Manual Test Cases

### Test Case 1: Session Auth, Route Guards & Expiration Check
1. Open a browser and navigate to the admin portal: `http://localhost:5173/` (or the local Vite dev port).
2. **Route Guard Check:** Verify you are immediately redirected to `/login`. Attempting to access `/complaints` or `/heatmap` directly via the URL bar should also redirect you to `/login`.
3. **Invalid credentials:** Input `admin@cityfix.gov` and an incorrect password. Click **Access Admin Dashboard**. Confirm a red warning banner appears detailing the credentials error.
4. **Incorrect Role check:** Register or log in with a user who holds the `citizen` role. Confirm the panel displays an access-denied error indicating you lack administrative privileges.
5. **Successful Admin Login:** Enter correct admin credentials (e.g. `admin@cityfix.gov` / seeded password) and login. Verify you are redirected to `/` and the dashboard overview displays.
6. **Session Timeout validation:** Open Chrome DevTools, navigate to the Application -> Local Storage. Remove the `cityfix_admin_token` key manually, then trigger an API action (like changing filters). Confirm you are redirected back to the login screen immediately with cleared session models.

---

### Test Case 2: Dashboard Overview & Recharts Analytics
1. Log into the panel with valid administrative credentials.
2. Confirm the top statistics row renders four summary metric cards representing Total Complaints, Resolved, Under Review, and Reported counts.
3. Check that the Recharts visual graph widgets render correctly and adapt to screen resizes:
   - **Trends Area Chart:** Shows weekly filed reports vs. resolutions.
   - **Category distribution Pie Chart:** Details category proportional slices with custom hover legends.
   - **Status Bar Chart:** Displays current status distributions.
4. Verify the **Realtime Complaint Feed** list displays the latest five complaints filed in the database.

---

### Test Case 3: Complaints Paging & Operations Desk Audit
1. Navigate to the **Complaints** page via the sidebar navigation menu.
2. **Text Search check:** Type a word matching a complaint title or address in the search box. Confirm the data table dynamically filters matches.
3. **Tag Filter check:** Select a category (e.g. `pothole`), a priority (e.g. `high`), or a status. Verify the rows match the selected filters.
4. **Grid Pagination check:** Click the Next page (`>`) and Previous page (`<`) icon buttons. Verify pages load fresh sets of rows.
5. **Detail Modal audit:** Click the **Audit Details** button on a complaint row.
   - Confirm a detailed review drawer opens.
   - Verify the uploaded images render inside the attachments preview carousel.
   - Verify the location address and lat/lng coordinates display under **Location Preview**.
   - Verify the chronological status history logs display in a beautiful timeline.

---

### Test Case 4: Operations Assignment & Lifecycle Moderation
1. Open the audit details drawer for a complaint that has a status of `Submitted`.
2. Under **Moderation Desk Panel**, expand the **Assign Department Officer** dropdown. Confirm it displays active department authorities fetched dynamically from `GET /api/v1/admin/authorities`.
3. Select a department officer, click **Assign**. Verify:
   - A success banner appears.
   - The status history timeline immediately appends a new item logging the assignment.
   - The parent table updates the status of the complaint to `under_review`.
4. Under **Update Life Status**, select `In Progress`, enter remarks (e.g., *"Technicians dispatched to remediate pothole"*), and click **Commit Status Shift**.
5. Verify the timeline immediately logs the status change with your customremarks.

---

### Test Case 5: Real-time Socket.IO Live Synchronization
1. Keep the Admin Panel open to the **Overview Dashboard** screen on one side of your desktop.
2. Open a citizen mobile simulator or use Postman to file a new civic report (`POST /api/v1/complaints`).
3. Observe the Admin Dashboard screen:
   - Confirm that the **Total Complaints** and **Active/Reported** counters immediately increment by `1` without reloading the page.
   - Confirm that the newly filed issue appears at the very top of the **Realtime Complaint Feed** list.
   - Check the notifications bell at the top right: click it to verify a new notification toast is added stating a new complaint was registered.
4. Navigate to the **Complaints** page. Open the details drawer for that new complaint.
5. Submit a status PATCH using Postman or a mobile simulator on that complaint ID.
6. Verify that the status timeline inside your open detail modal immediately updates in real-time!
