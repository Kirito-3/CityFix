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
