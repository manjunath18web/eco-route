// 1. Initialize Map focusing on India
var map;
let redRoute, greenRoute, activeCoords = [];
let userMarker, watchId;
let destinationLatLng;

document.addEventListener("DOMContentLoaded", function() {
    // Initialize map only after the 'map' div is ready in the DOM
    map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const ecoData = JSON.parse(localStorage.getItem("ecoData"));

    if (ecoData) {
        // Safe check for HTML elements to prevent "Cannot set property of null" errors
        const startEl = document.getElementById("start-name");
        const endEl = document.getElementById("end-name");
        const vehEl = document.getElementById("veh-type");

        if (startEl) startEl.innerText = ecoData.start;
        if (endEl) endEl.innerText = ecoData.end;
        if (vehEl) vehEl.innerText = ecoData.vehicle;
        
        initRouting(ecoData.start, ecoData.end, ecoData.vehicle);
    }
});

// FIXED: Improved coordinate and city name handling
async function getCoords(place) {
    if (!place) return null;
    const searchStr = place.toString().trim();
    
    if (searchStr.includes(",")) {
        const parts = searchStr.split(",");
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
    
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchStr)}&limit=1`);
        const data = await res.json();
        return data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
    } catch (error) {
        return null;
    }
}

// Function to get the emission factor in kg CO2 per km based on vehicle type
function getEmissionFactor(vehicle) {
    const vehicleType = vehicle ? vehicle.toLowerCase() : "";
    if (vehicleType.includes("electric") || vehicleType.includes("ev")) {
        return 0.05; // 50g CO2/km
    } else if (vehicleType.includes("truck") || vehicleType.includes("heavy")) {
        return 0.25; // 250g CO2/km
    } else {
        return 0.14; // Default standard car (140g CO2/km)
    }
}

async function initRouting(start, end, vehicle) {
    const s = await getCoords(start);
    const e = await getCoords(end);
    
    const emissionFactor = getEmissionFactor(vehicle);
    
    if (!s || !e) {
        const regLab = document.getElementById("reg-label");
        const ecoLab = document.getElementById("eco-label");
        if (regLab) regLab.innerText = "Error: Location not found";
        if (ecoLab) ecoLab.innerText = "Error: Location not found";
        return;
    }
    
    destinationLatLng = L.latLng(e);

    if (redRoute) map.removeControl(redRoute);
    if (greenRoute) map.removeControl(greenRoute);

    redRoute = L.Routing.control({
        waypoints: [L.latLng(s), L.latLng(e)],
        lineOptions: { styles: [{ color: '#e74c3c', weight: 6, opacity: 0.6 }] },
        addWaypoints: false,
        show: false
    }).addTo(map);

    redRoute.on('routesfound', (ev) => {
        const distKm = (ev.routes[0].summary.totalDistance / 1000);
        const emissions = (distKm * emissionFactor).toFixed(2);
        const regLab = document.getElementById("reg-label");
        if (regLab) regLab.innerText = `● Red Route: ${distKm.toFixed(2)} km (${emissions} kg CO2)`;
    });

    const mid = [(s[0] + e[0]) / 2 + 0.015, (s[1] + e[1]) / 2 + 0.015];
    greenRoute = L.Routing.control({
        waypoints: [L.latLng(s), L.latLng(mid), L.latLng(e)],
        lineOptions: { styles: [{ color: '#2ecc71', weight: 6, opacity: 0.9 }] },
        addWaypoints: false,
        show: false
    }).addTo(map);

    greenRoute.on('routesfound', (ev) => {
        // FIX 5: Performance telemetry debugging logs
        console.log(
            "Green Route Distance:",
            (ev.routes[0].summary.totalDistance / 1000).toFixed(2),
            "km"
        );

        console.log(
            "Coordinates Count:",
            ev.routes[0].coordinates.length
        );

        activeCoords = ev.routes[0].coordinates;
        const distKm = (ev.routes[0].summary.totalDistance / 1000);
        const emissions = (distKm * emissionFactor).toFixed(2);
        const ecoLab = document.getElementById("eco-label");
        if (ecoLab) ecoLab.innerText = `● Green Route: ${distKm.toFixed(2)} km (${emissions} kg CO2)`;
        
        map.fitBounds(L.latLngBounds([s, e]), { padding: [50, 50] });
    });
}

function handleSelection(type) {
    const modal = document.getElementById("selection-modal");
    if (modal) modal.style.display = "flex";

    const msgEl = document.getElementById("modal-msg");
    const iconEl = document.getElementById("modal-icon");

    if (type === 'green') {
        if (redRoute) map.removeControl(redRoute);
        if (iconEl) iconEl.innerText = "🌿";
        if (msgEl) msgEl.innerText = "Great choice! Eco-route activated...";
    } else {
        if (greenRoute) map.removeControl(greenRoute);
        if (iconEl) iconEl.innerText = "🚨";
        if (msgEl) msgEl.innerText = "This route has higher emissions. Prefer the green route instead...";
    }
}

function startLiveNavigation() {
    // FIX 4: Safety loading fallback guard
    if (!activeCoords || activeCoords.length === 0) {
        alert(
            "Route is still loading. Please wait a few seconds and try again."
        );
        return;
    }

    const modal = document.getElementById("selection-modal");
    const panel = document.getElementById("main-panel");
    const dash = document.getElementById("nav-dashboard");

    if (modal) modal.style.display = "none";
    if (panel) panel.style.display = "none";
    if (dash) dash.style.display = "block";

    var navIcon = L.icon({
        iconUrl: '/static/green.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    var endIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });

    if (typeof activeCoords !== 'undefined' && activeCoords.length > 0) {
        // FIX 6: Prevent structural layer geometry components from getting erased
        if (userMarker) {
            map.removeLayer(userMarker);
        }

        var startPoint = activeCoords[0];
        var endPoint = activeCoords[activeCoords.length - 1];

        L.marker(startPoint, {icon: navIcon}).addTo(map).bindPopup("Start Point");
        L.marker(endPoint, {icon: endIcon}).addTo(map).bindPopup("End Point");

        var polyline = L.polyline(activeCoords, {color: 'green'}).addTo(map);
        map.fitBounds(polyline.getBounds());
    }

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((pos) => {
            const currentPos = L.latLng(pos.coords.latitude, pos.coords.longitude);
            if (!userMarker) userMarker = L.marker(currentPos).addTo(map);
            else userMarker.setLatLng(currentPos);
            map.panTo(currentPos);

            // Calculate road network distance along geometry path segments instead of linear distance
            let remainingKm = 0;
            if (typeof activeCoords !== 'undefined' && activeCoords.length > 0) {
                let closestIdx = 0;
                let minDistance = Infinity;

                // Track the closest routing line index to the user
                for (let i = 0; i < activeCoords.length; i++) {
                    let d = currentPos.distanceTo(activeCoords[i]);
                    if (d < minDistance) {
                        minDistance = d;
                        closestIdx = i;
                    }
                }

                // Add distance from user to closest index route vertex point
                remainingKm += currentPos.distanceTo(activeCoords[closestIdx]);

                // Accumulate remaining distance across all segments forward to the endpoint destination
                for (let i = closestIdx; i < activeCoords.length - 1; i++) {
                    remainingKm += activeCoords[i].distanceTo(activeCoords[i + 1]);
                }
                remainingKm = (remainingKm / 1000).toFixed(1);
            } else {
                remainingKm = (currentPos.distanceTo(destinationLatLng) / 1000).toFixed(1);
            }

            const liveDist = document.getElementById("live-dist");
            if (liveDist) liveDist.innerText = `${remainingKm} km`;

            const speedKmh = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0;
            const liveSpeed = document.getElementById("live-speed");
            if (liveSpeed) liveSpeed.innerText = `${speedKmh} km/h`;
            
            const averageSpeed = speedKmh > 5 ? speedKmh : 40;
            const timeRem = Math.round((remainingKm / averageSpeed) * 60); 
            const liveTime = document.getElementById("live-time");
            
            if (liveTime) liveTime.innerText = `${timeRem} min`;

        // FIX 7: Advanced tracking parameters configuration
        }, null, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        });
    }
}

function stopNavigation() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    window.location.href = "/index";
}