// SRM KTR Building Coordinates
const srmBuildings = {
    "Medical Block": { lat: 12.823391313620416, lng: 80.04780825170434 },
    "Tech Park": { lat: 12.824697512364116, lng: 80.04522039919466 },
    "Library": { lat: 12.823657796962754, lng: 80.04248849029675 },
    "Food Court": { lat: 12.823374020942719, lng: 80.04449687250127 },
    "MBA Block": { lat: 12.82367014886474, lng: 80.04414291309796 },
    "Main Block": { lat: 12.820631881598812, lng: 80.03874059582789 }
};

// Waste icons for different types
const wasteIcons = {
    "Bio-Waste": 'https://cdn-icons-png.flaticon.com/512/3483/3483634.png',
    "E-Waste": 'https://cdn-icons-png.flaticon.com/512/3483/3483693.png',
    "Paper": 'https://cdn-icons-png.flaticon.com/512/3483/3483682.png',
    "Organic": 'https://cdn-icons-png.flaticon.com/512/3483/3483628.png',
    "Default": 'https://cdn-icons-png.flaticon.com/512/447/447031.png' // Default icon
};

// DOM elements
const optimizeBtn = document.getElementById('optimize-btn');
const capacityInput = document.getElementById('capacity');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const routeInfoDiv = document.getElementById('route-info');
const wasteTableBody = document.querySelector('#waste-table tbody');
const totalWeightSpan = document.getElementById('total-weight');
const totalValueSpan = document.getElementById('total-value');

let map; // Google Map instance
let markers = []; // Array to store markers
let directionsService; // Directions service instance
let directionsRenderer; // Directions renderer instance

// Initialize Google Map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 12.8231, lng: 80.0445 },
        zoom: 16,
        mapTypeId: 'roadmap'
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true // Suppress default markers to use custom ones
    });
}

// Event listener
optimizeBtn.addEventListener('click', optimizeCollection);

async function optimizeCollection() {
    const capacity = capacityInput.value;

    // Show loading state
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    optimizeBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:5000//optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ capacity: parseInt(capacity) })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.classList.remove('hidden');
    } finally {
        loadingDiv.classList.add('hidden');
        optimizeBtn.disabled = false;
    }
}

function displayResults(data) {
    // Clear previous results
    wasteTableBody.innerHTML = '';
    markers.forEach(marker => marker.setMap(null)); // Remove existing markers
    markers = [];
    directionsRenderer.set('directions', null); // Clear previous route

    // Sort collected waste by value in descending order
    const sortedWaste = data.collected_waste.sort((a, b) => b.value - a.value);

    // Display route sequence based on highest value
    routeInfoDiv.innerHTML = `
        <p><strong>Optimal Collection Route (Based on Value):</strong></p>
        <ol>
            ${sortedWaste.map(item => `<li>${item.block} ($${item.value})</li>`).join('')}
        </ol>
    `;

    // Add markers to map
    const waypoints = [];
    sortedWaste.forEach((item, index) => {
        const coords = srmBuildings[item.block];

        // Add marker
        const marker = new google.maps.Marker({
            position: coords,
            map: map,
            title: `${item.block} - $${item.value}`,
            icon: {
                url: wasteIcons[item.type] || wasteIcons["Default"], // Use the appropriate icon or default
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <b>${item.block}</b><br>
                Type: ${item.type}<br>
                Total Weight: ${item.weight} kg<br>
                Collected Weight: ${item.collected_weight || item.weight} kg<br>
                Value: $${item.value}
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        markers.push(marker);

        // Add to waypoints (skip the first and last points for waypoints)
        if (index > 0 && index < sortedWaste.length - 1) {
            waypoints.push({
                location: coords,
                stopover: true
            });
        }
    });

    // Calculate and display route
    const origin = srmBuildings[sortedWaste[0].block]; // Start point
    const destination = srmBuildings[sortedWaste[sortedWaste.length - 1].block]; // End point

    directionsService.route(
        {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
            } else {
                console.error('Error calculating directions:', status);
            }
        }
    );
    // Change the first marker to green and the last marker to red
    if (markers.length > 0) {
        markers[0].setIcon({
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new google.maps.Size(32, 32)
        });

        // Change icons for intermediate stops to blue
        for (let i = 1; i < markers.length - 1; i++) {
            markers[i].setIcon({
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new google.maps.Size(32, 32)
            });
        }
    }
    if (markers.length > 1) {
        markers[markers.length - 1].setIcon({
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32)
        });
    }
    // Populate waste table
    let totalWeight = 0;
    let totalCollectedWeight = 0;
    sortedWaste.forEach(item => {
        const collected = item.collected_weight || item.weight; // Use collected_weight for divisible items
        totalWeight += item.weight;
        totalCollectedWeight += collected;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.block}</td>
            <td>${item.type}</td>
            <td>${item.weight} kg</td>
            <td>${collected} kg</td>
            <td>$${item.value}</td>
        `;
        wasteTableBody.appendChild(row);
    });

    // Display totals
    totalWeightSpan.textContent = `${totalCollectedWeight} kg`;
    totalValueSpan.textContent = `$${data.total_value}`;
}
