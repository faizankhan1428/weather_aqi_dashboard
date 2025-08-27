let tempChart = null;
let pmChart = null;
let compareTempChart = null;
let comparePMChart = null;

// Initialize the Leaflet map and add tile layer
const map = L.map('map').setView([30.3753, 69.3451], 5); // Default view for Pakistan

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let cityMarker = null;
let compareMarker = null;

function getAqiClass(pm25) {
    if (pm25 === null) return '';
    if (pm25 <= 12) return 'good';
    if (pm25 <= 35.4) return 'moderate';
    return 'bad';
}

function toLocalLabels(isoTimes) {
    if (!isoTimes) return [];
    return isoTimes.map(t => {
        const d = new Date(t);
        // show as "Aug 27, 14:00"
        return d.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    });
}

function updateAqiColor(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value ?? '—';
        // Clear old classes before adding the new one
        element.className = ''; 
        element.classList.add(getAqiClass(value));
    }
}

function updateCards(data) {
    document.getElementById('city-name').textContent = data.city;
    document.getElementById('coords').textContent = `Lat ${data.coords.lat.toFixed(3)}, Lon ${data.coords.lon.toFixed(3)}`;

    const c = data.current || {};
    document.getElementById('temp').textContent = c.temperature_c ?? '—';
    document.getElementById('humidity').textContent = c.humidity_pct ?? '—';
    document.getElementById('wind').textContent = c.wind_speed_kmh ?? '—';

    const a = data.aq_now || {};
    updateAqiColor('pm25', a.pm2_5);
    document.getElementById('pm10').textContent = a.pm10 ?? '—';
    document.getElementById('co').textContent = a.co ?? '—';
    document.getElementById('o3').textContent = a.o3 ?? '—';
    document.getElementById('no2').textContent = a.no2 ?? '—';
    document.getElementById('so2').textContent = a.so2 ?? '—';
}

function drawCharts(series) {
    const labels = toLocalLabels(series.time);

    // Temperature chart
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    if (tempChart) tempChart.destroy();
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: series.temp_c,
                borderWidth: 2,
                tension: 0.25,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // PM chart
    const pmCtx = document.getElementById('pmChart').getContext('2d');
    if (pmChart) pmChart.destroy();
    pmChart = new Chart(pmCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'PM2.5 (μg/m³)',
                    data: series.pm2_5,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                },
                {
                    label: 'PM10 (μg/m³)',
                    data: series.pm10,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function drawComparison(city1, city2) {
    const labels = toLocalLabels(city1.series.time);

    // Temperature comparison
    const ctx1 = document.getElementById('compareTempChart').getContext('2d');
    if (compareTempChart) compareTempChart.destroy();
    compareTempChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: `${city1.city} Temp (°C)`,
                    data: city1.series.temp_c,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                },
                {
                    label: `${city2.city} Temp (°C)`,
                    data: city2.series.temp_c,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                }
            ]
        }
    });

    // PM2.5 comparison
    const ctx2 = document.getElementById('comparePMChart').getContext('2d');
    if (comparePMChart) comparePMChart.destroy();
    comparePMChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: `${city1.city} PM2.5`,
                    data: city1.series.pm2_5,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                },
                {
                    label: `${city2.city} PM2.5`,
                    data: city2.series.pm2_5,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                }
            ]
        }
    });
}

function updateMap(data) {
    if (cityMarker) {
        cityMarker.remove(); // Remove old marker
    }
    const lat = data.coords.lat;
    const lon = data.coords.lon;
    const city = data.city;
    const pm25Value = data.aq_now.pm2_5;
    const aqiClass = getAqiClass(pm25Value);

    // Create a custom marker icon with a color
    const customIcon = L.divIcon({
        className: 'custom-div-icon ' + aqiClass,
        html: '<div class="marker-pin"></div><i class="fa-solid fa-location-dot"></i>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    const popupText = `<b>${city}</b><br>Temp: ${data.current.temperature_c ?? '—'}°C<br>PM2.5: ${pm25Value ?? '—'} μg/m³`;

    cityMarker = L.marker([lat, lon], {icon: customIcon}).addTo(map)
        .bindPopup(popupText)
        .openPopup();

    map.setView([lat, lon], 12); // Center map on new city
}

function updateComparisonMap(data1, data2) {
    // Remove any existing single-city marker
    if (cityMarker) cityMarker.remove();
    // Remove any existing comparison markers
    if (compareMarker) compareMarker.remove();

    // Create a marker for City 1
    const lat1 = data1.coords.lat;
    const lon1 = data1.coords.lon;
    const aqiClass1 = getAqiClass(data1.aq_now.pm2_5);
    const customIcon1 = L.divIcon({
        className: 'custom-div-icon ' + aqiClass1,
        html: '<div class="marker-pin"></div><i class="fa-solid fa-location-dot"></i>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
    L.marker([lat1, lon1], {icon: customIcon1}).addTo(map)
        .bindPopup(`<b>${data1.city}</b><br>PM2.5: ${data1.aq_now.pm2_5 ?? '—'}`);

    // Create a marker for City 2
    const lat2 = data2.coords.lat;
    const lon2 = data2.coords.lon;
    const aqiClass2 = getAqiClass(data2.aq_now.pm2_5);
    const customIcon2 = L.divIcon({
        className: 'custom-div-icon ' + aqiClass2,
        html: '<div class="marker-pin"></div><i class="fa-solid fa-location-dot"></i>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
    L.marker([lat2, lon2], {icon: customIcon2}).addTo(map)
        .bindPopup(`<b>${data2.city}</b><br>PM2.5: ${data2.aq_now.pm2_5 ?? '—'}`);

    // Fit the map view to contain both markers
    const bounds = L.latLngBounds([lat1, lon1], [lat2, lon2]);
    map.fitBounds(bounds, {padding: [50, 50]});
}

// Functions to save, load, and render favorites using local storage
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function renderFavorites() {
    const favorites = getFavorites();
    const container = document.getElementById('favorites-container');
    container.innerHTML = ''; // Clear previous items

    favorites.forEach(city => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.textContent = city;
        item.onclick = () => {
            document.getElementById('city-input').value = city;
            loadCity(city);
        };

        // Add a remove button
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent the parent div's click event
            let currentFavorites = getFavorites();
            currentFavorites = currentFavorites.filter(fav => fav !== city);
            saveFavorites(currentFavorites);
            renderFavorites();
        };

        item.appendChild(removeBtn);
        container.appendChild(item);
    });
}

function showMainLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function showButtonLoader(button, show) {
    const btnText = button.querySelector('.btn-text');
    const loaderIcon = button.querySelector('.loader-icon');
    if (btnText && loaderIcon) {
        btnText.style.display = show ? 'none' : 'inline';
        loaderIcon.style.display = show ? 'inline-block' : 'none';
    }
}

// Add this function to reset the dashboard state
function resetDashboard() {
    // Clear all cards
    document.getElementById('city-name').textContent = '—';
    document.getElementById('coords').textContent = '—';
    document.getElementById('temp').textContent = '—';
    document.getElementById('humidity').textContent = '—';
    document.getElementById('wind').textContent = '—';
    document.getElementById('pm25').textContent = '—';
    document.getElementById('pm10').textContent = '—';
    document.getElementById('co').textContent = '—';
    document.getElementById('o3').textContent = '—';
    document.getElementById('no2').textContent = '—';
    document.getElementById('so2').textContent = '—';
    document.getElementById('pm25').className = ''; // Remove color class

    // Destroy all charts
    if (tempChart) tempChart.destroy();
    if (pmChart) pmChart.destroy();
    if (compareTempChart) compareTempChart.destroy();
    if (comparePMChart) comparePMChart.destroy();

    // Remove all markers from the map
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Hide comparison section and reset button
    document.getElementById('compare-section').style.display = 'none';
    document.getElementById('reset-btn').style.display = 'none';

    // Reset input fields
    document.getElementById('city-input').value = '';
    document.getElementById('city1-input').value = '';
    document.getElementById('city2-input').value = '';
}

async function loadCity(city) {
    showMainLoader(true);
    showButtonLoader(document.getElementById('city-form').querySelector('button'), true);
    const params = new URLSearchParams({ city });
    const res = await fetch(`/api/city-data?${params.toString()}`);

    showMainLoader(false);
    showButtonLoader(document.getElementById('city-form').querySelector('button'), false);

    if (!res.ok) {
        alert(`Error: ${res.status} — ${res.statusText}`);
        return;
    }
    document.getElementById('reset-btn').style.display = 'inline-block'; // Show reset button

    const data = await res.json();
    // Remove comparison charts and markers
    document.getElementById('compare-section').style.display = "none";
    if (compareTempChart) compareTempChart.destroy();
    if (comparePMChart) comparePMChart.destroy();
    if (compareMarker) compareMarker.remove();

    updateCards(data);
    drawCharts(data.series);
    updateMap(data);
}

async function loadComparison(city1, city2) {
    showMainLoader(true);
    showButtonLoader(document.getElementById('compare-form').querySelector('button'), true);

    const [res1, res2] = await Promise.all([
        fetch(`/api/city-data?city=${encodeURIComponent(city1)}`),
        fetch(`/api/city-data?city=${encodeURIComponent(city2)}`)
    ]);

    showMainLoader(false);
    showButtonLoader(document.getElementById('compare-form').querySelector('button'), false);

    if (!res1.ok || !res2.ok) {
        alert("One of the cities could not be loaded");
        return;
    }

    document.getElementById('reset-btn').style.display = 'inline-block'; // Show reset button

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Clear single-city data/charts
    updateCards({});
    if (tempChart) tempChart.destroy();
    if (pmChart) pmChart.destroy();

    document.getElementById('compare-section').style.display = "block";
    drawComparison(data1, data2);
    updateComparisonMap(data1, data2); // Call the new map function
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('city-form');
    const input = document.getElementById('city-input');

    // Add the event listener for the main form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = input.value.trim();
        if (!city) return;
        loadCity(city);
    });

    // Add the event listener for the comparison form
    const compareForm = document.getElementById('compare-form');
    compareForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const c1 = document.getElementById('city1-input').value.trim();
        const c2 = document.getElementById('city2-input').value.trim();
        if (!c1 || !c2) return;
        loadComparison(c1, c2);
    });

    // Load and render favorites on page load
    renderFavorites();

    // Add listener for the new favorite button
    const addFavoriteBtn = document.getElementById('add-favorite-btn');
    addFavoriteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const city = document.getElementById('city-input').value.trim();
        if (!city) return;
        const favorites = getFavorites();
        if (!favorites.includes(city)) {
            favorites.push(city);
            saveFavorites(favorites);
            renderFavorites();
        }
    });

    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', resetDashboard);

    // Default city to show something on load
    input.value = 'Karachi';
    loadCity('Karachi');
});

// Functions to save, load, and render favorites using local storage
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function renderFavorites() {
    const favorites = getFavorites();
    const container = document.getElementById('favorites-container');
    container.innerHTML = ''; // Clear previous items

    favorites.forEach(city => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.textContent = city;
        item.onclick = () => {
            document.getElementById('city-input').value = city;
            loadCity(city);
        };

        // Add a remove button
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent the parent div's click event
            let currentFavorites = getFavorites();
            currentFavorites = currentFavorites.filter(fav => fav !== city);
            saveFavorites(currentFavorites);
            renderFavorites();
        };

        item.appendChild(removeBtn);
        container.appendChild(item);
    });
}