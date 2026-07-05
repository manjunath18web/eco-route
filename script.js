// 1. Initialize Map focusing on India 
var map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let startMarker, endMarker;
let timeoutId;
let watchId; // For tracking real-time movement

// 2. City Autocomplete Logic
async function fetchCities(inputId, suggestionId) {
    const query = document.getElementById(inputId).value;
    const suggestionBox = document.getElementById(suggestionId);
    
    clearTimeout(timeoutId);

    if (query.length < 3) {
        suggestionBox.style.display = 'none';
        return;
    }

    timeoutId = setTimeout(async () => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&featuretype=city`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            suggestionBox.innerHTML = '';
            if (data.length > 0) {
                suggestionBox.style.display = 'block';
                data.forEach(place => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.innerText = place.display_name.split(',').slice(0, 2).join(', ');
                    
                    item.onclick = () => {
                        document.getElementById(inputId).value = place.display_name;
                        suggestionBox.style.display = 'none';
                        placeMarker(inputId, place.lat, place.lon, place.display_name);
                    };
                    suggestionBox.appendChild(item);
                });
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    }, 300);
}

// 3. Marker Logic
function placeMarker(inputId, lat, lon, name) {
    const coords = [lat, lon];
    if (inputId === 'start-city') {
        if (startMarker) map.removeLayer(startMarker);
        startMarker = L.marker(coords).addTo(map).bindPopup("Start: " + name).openPopup();
    } else {
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(coords).addTo(map).bindPopup("Destination: " + name).openPopup();
    }

    if (startMarker && endMarker) {
        map.fitBounds(L.featureGroup([startMarker, endMarker]).getBounds().pad(0.3));
    } else {
        map.setView(coords, 10);
    }
}

// 4. FIX: Real-Time GPS Tracking with Reverse Geocoding & High-Accuracy Enforcement
function getCurrentLocation() {
    if (navigator.geolocation) {
        if (watchId) navigator.geolocation.clearWatch(watchId);

        // FIX 2: Better GPS stability configuration
        const options = {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        };

        watchId = navigator.geolocation.watchPosition(async (pos) => {
            // FIX 1: Exact accuracy tracking and coordinate payload storage
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            window.currentGpsCoords = [lat, lon];

            console.log(
                "GPS Locked:",
                lat,
                lon,
                "Accuracy:",
                pos.coords.accuracy
            );

            if (pos.coords.accuracy > 1000) {
                console.warn(
                    "Ignoring inaccurate GPS fix:",
                    pos.coords.accuracy
                );
                return;
            }

            if (pos.coords.accuracy > 5000) {
                console.warn("High positional inaccuracy detected. Browser may be caching data or using IP routing.");
            }

            // Reverse geocode raw coordinates to extract true local destination names (e.g. Ballari)
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                const addressData = await response.json();
                if (addressData && addressData.display_name) {
                    const cleanName = addressData.display_name.split(',').slice(0, 2).join(', ');
                    document.getElementById('start-city').value = cleanName;
                    placeMarker('start-city', lat, lon, cleanName);
                } else {
                    document.getElementById('start-city').value = "My Current Location";
                    placeMarker('start-city', lat, lon, "Your Real-Time Position");
                }
            } catch (err) {
                document.getElementById('start-city').value = "My Current Location";
                placeMarker('start-city', lat, lon, "Your Real-Time Position");
            }
            
            map.panTo([lat, lon]);

        }, (error) => {
            console.error("GPS Error: ", error.message);
            alert("Could not lock precise location data. Verify your browser permissions.");
        }, options);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 5. Clear Function
function clearInputs() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    document.getElementById('start-city').value = "";
    document.getElementById('end-city').value = "";
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    startMarker = endMarker = null;
    map.setView([20.5937, 78.9629], 5);
}

// 6. Transition & FIX: Save History to Database
async function calculateAndMove() {
    const startInput = document.getElementById('start-city').value;
    const end = document.getElementById('end-city').value;
    const vehicle = document.getElementById('vehicle').value;

    if (!startInput || !end) {
        alert("Please pick both points!"); 
        return;
    }

    // FIX 3: Prioritize exact coordinate routing options over text
    let startPayload = startInput;

    if (window.currentGpsCoords) {
        startPayload =
            `${window.currentGpsCoords[0]},${window.currentGpsCoords[1]}`;
    }
    else if (startMarker) {
        const latlng = startMarker.getLatLng();

        startPayload =
            `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
    }

    const data = { 
        start: startPayload, 
        end: end, 
        vehicle: vehicle 
    };

    // --- FIX: Save to Database using the correct route ---
    try {
        const response = await fetch('/save_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if(result.status !== "success") console.warn("History not saved properly");
    } catch (error) {
        console.error("History sync failed:", error);
    }

    // Save selection for route.html and redirect
    localStorage.setItem("ecoData", JSON.stringify(data));
    window.location.href = "/route";
}