# Step-by-Step Testing Guide: Real-Time Sync & Timelines

Congratulations! We have successfully implemented a complete, high-fidelity **Complaint History, Detail Screen, and chronological Timeline Stepper** backed by **real-time Socket.IO WebSockets**.

This temporary guide gives you exact instructions on how to test all these features from your side on your physical OnePlus 9 (`LE2111`) phone.

---

## 1. Prerequisites (Setup Ports & Devices)

To ensure the physical phone can communicate with both the **REST API** and the **Socket.IO server** running on your local development PC, you must forward ports over USB.

1. **Connect your phone** via USB and ensure USB Debugging is active.
2. **Reverse forward Port 5000**:
   Open a PowerShell terminal and run:
   ```powershell
   adb reverse tcp:5000 tcp:5000
   ```
   *(This maps the phone's port `5000` directly to your PC's localhost `5000` backend server over the USB cable!)*

3. **Verify the Backend is active**:
   Your backend must be running in the terminal (`npm run dev` in `c:\collage\Project\CityFix\backend`).

---

## 2. Launch the Application

Compile and deploy the updated application to your device:
```powershell
# Navigate to mobile directory
cd c:\collage\Project\CityFix\mobile

# Run on your LE2111 OnePlus device
flutter run -d a908f4d
```

---

## 3. Testing Flow & Milestones

### 📍 Milestone A: Dashboard & Navigation
1. Open the app, login using your test citizen credentials.
2. On the **Dashboard**, you will now see an elegant **`View History ➜`** button in the *Your Filed Complaints* section.
3. Tap **`View History`** to transition to the Complaint History screen.

### 🔍 Milestone B: Complaint History & Filtering
1. You will see a list of all complaints registered under your account.
2. **Test Filters**: Tap status horizontal pills (e.g. *Submitted*, *Under Review*, *Resolved*) or priorities (e.g. *HIGH*, *MEDIUM*, *LOW*) to dynamically filter complaints. The list transitions smoothly.
3. **Pull-to-Refresh**: Drag the list down from the top to trigger pull-to-refresh.
4. **Infinite Scroll Pagination**: If you have more than 10 complaints, scroll to the bottom to see elegant bottom loaders load page 2.

### 📋 Milestone C: Detailed Card & Stepper Logs
1. Tap on any complaint card. This opens the **Complaint Detail Screen**.
2. **Image Slider**: Horizontal scroll through any uploaded images.
3. **Google Maps Snip**: See the marker pinned to the precise latitude and longitude you reported (with an elegant gradient fallback on Windows PC clients).
4. **Initial Timeline Tracker**: Scroll down to see the vertical timeline stepper. It displays the chronological status history, role badges (e.g., citizen, admin), and timestamps.

---

## 4. Trigger & Observe Real-Time Updates (WebSockets!)

Let's test the active WebSocket synchronization live!

1. Open the **Complaint Detail Screen** on your phone for a specific complaint (e.g., note the `ID` in the GoRouter URL or logs, let's say it is `665249f3e46c761c77f8841c`).
2. Keep your phone screen open so you are actively viewing this complaint's timeline.
3. **Trigger Status Change on PC**:
   Open your REST Client (Postman, Thunder Client) or run a curl command to update the status of this complaint on the backend:

   **HTTP Method**: `PATCH`  
   **URL**: `http://localhost:5000/api/v1/complaints/YOUR_COMPLAINT_ID/status`  
   *(Replace YOUR_COMPLAINT_ID with the active ID shown)*  
   
   **Headers**: Add authorization header if required or use the Admin panel to update.  
   **JSON Body**:
   ```json
   {
     "status": "In Progress",
     "remarks": "Technician assigned! Crew has arrived at the location to inspect the deep potholes and repair the pavement."
   }
   ```

4. **Observe the Phone Screen Live**:
   * **Instantly**, without refreshing, loading indicators, or screen transitions, a new vertical step dot will appear in the vertical timeline.
   * You will see the state transition to **In Progress**.
   * The **Remarks** will display your PC input text.
   * The **Status Badge** at the top of the detail sheet changes colors immediately!

Let us know how the real-time timeline looks on your OnePlus 9 screen! 🚀

---

## 5. Milestone D: Notification Center & Live Push Alerts UX

We have fully finalized the **Notification Center and Live Push alert systems**! Follow these instructions to test these features:

### 📍 Phase 1: Foreground Alerts and Reactive Badges
1. Open the app and log in. You will land on the **Dashboard**.
2. Notice the **Bell Icon** inside the AppBar Actions deck. If you have no unread notifications, it is completely clean.
3. Keep the app open in the foreground.
4. **Trigger Status Change on PC**: Send another PATCH status update request using cURL or your PC REST client.
5. **Observe the Phone Live**:
   - An in-app **FCM SnackBar overlay** slides in beautifully from the bottom, accompanied by a pulsing bell icon and a summary of your complaint's new status.
   - Tap the **`VIEW`** button action on the SnackBar. It will slide you directly into that complaint's detailed timeline screen!
   - Navigate back to the Dashboard. You will notice that the **Dashboard Bell Icon** now features a red badge representing the incremented unread count!

### 📍 Phase 2: Notification Center List Tiles
1. Tap the **Bell Icon** on the Dashboard.
2. The **Notification Center Screen** opens, displaying a clean layout of all logs.
3. The new alert update shows up as unread with a glowing teal visual mark.
4. **Mark as Read Sync**: 
   - Tap **"Read All"** in the AppBar, or simply tap on the specific alert card.
   - Tap action transitions the card's visual design to a read state instantly.
   - The unread count badge decreases immediately in real-time!
   - This state change is automatically recorded in the MongoDB database collections!

### 📍 Phase 3: Background Clicks and Deep-linking Routing
1. Press the **Home button** on your phone to put the app in the background.
2. Trigger another status change PATCH from your PC REST client.
3. You will receive a native push notification banner at the top of your phone screen.
4. **Click the push banner.** The app will open and immediately direct you to the corresponding complaint's timeline detail screen!

---

## 6. Milestone E: Interactive Nearby Maps Feed & Dynamic Marker Sync

We have fully finalized the **Geospatial Map Feed and custom Marker UX**! Follow these instructions to test these features:

### 📍 Phase 1: Location Bootstrapper and Dynamic Boundaries
1. Open the app and log in. On the Dashboard, you will now see a **Map Icon** inside the AppBar Actions.
2. Tap the **Map Icon**. The **Nearby Incident Feed Screen** will open.
3. The map dynamically requests location permissions, zooms, and centers on your exact GPS coordinates!
4. **Change Search Parameters**: Tap different horizontal floating radius pills (e.g. **1km**, **3km**, **5km**) or category chips (e.g. *Waste*, *Roads*). The map instantly triggers geodetic fetches and updates pins!
5. **Pan/Zoom Throttler**: Scroll or pan the map. The map uses a built-in 600ms pan debouncer to automatically fetch fresh complaints matching the new camera center without flooding the Express REST API!

### 📍 Phase 2: Animated Preview Overlay Card
1. Tap on any colored marker pin on the map.
2. **Observe Bottom Slide-up Sheet:** An interactive overlay card slides up instantly from the bottom of the map, displaying a preview image, category tags, priority tags, and a summary.
3. **Timeline Deep-link Navigation:** Tap the **`View Timeline Stepper ➜`** button. The app transitions cleanly to the full vertical timeline audit stepper!
4. Tap anywhere on the blank map background to slide down and hide the preview card.

### 📍 Phase 3: WebSockets Live Pin Color Sync
1. Open the Map Feed screen and tap a marker pin to display the bottom preview card. Note the marker color and status (e.g. a Violet pin for *Under Review*).
2. Keep this map screen open.
3. **Trigger PC Status Update**: Open your PC REST client and patch the status of this specific complaint:
   
   **HTTP PATCH**: `http://localhost:5000/api/v1/complaints/YOUR_COMPLAINT_ID/status`  
   **Body**:
   ```json
   {
     "status": "In Progress",
     "remarks": "Technician has arrived at location."
   }
   ```
4. **Observe Phone Live**:
   - The map pin immediately changes colors! It shifts from a Violet pin to an Orange pin representing **In Progress**!
   - The status text inside the floating preview card updates immediately in-memory!
   - **Zero refreshes or screen rebuilds!**


