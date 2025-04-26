// SRM KTR Building Coordinates
const srmBuildings = {
    "Medical Block": [12.8240, 80.0438],
    "Tech Park": [12.8218, 80.0462],
    "Library": [12.8225, 80.0450],
    "Food Court": [12.8220, 80.0440],
    "Admin Block": [12.8228, 80.0448],
    "Main Gate": [12.8231, 80.0445]
};

// Initialize SRM Map
const map = L.map('map').setView([12.8231, 80.0445], 16);

// Add satellite layer with labels
L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0','mt1','mt2','mt3'],
    attribution: 'Google Maps'
}).addTo(map);

// Draw SRM campus boundary
L.polygon([
    [12.8245, 80.0430],
    [12.8245, 80.0470],
    [12.8200, 80.0470],
    [12.8200, 80.0430]
], {
    color: "#2E7D32",
    weight: 3,
    fillOpacity: 0.05
}).addTo(map).bindPopup("<b>SRM University Kattankulathur</b>");

// Custom icons
const buildingIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
    iconSize: [32, 32]
});

const wasteIcons = {
    "Bio-Waste": L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3483/3483634.png',
        iconSize: [32, 32]
    }),
    "E-Waste": L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3483/3483693.png',
        iconSize: [32, 32]
    }),
    "Paper": L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3483/3483682.png',
        iconSize: [32, 32]
    }),
    "Organic": L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3483/3483628.png',
        iconSize: [32, 32]
    })
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

// Event listener
optimizeBtn.addEventListener('click', optimizeCollection);

async function optimizeCollection() {
    const capacity = capacityInput.value;
    
    // Show loading state
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    optimizeBtn.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/optimize', {
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
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    // Display route sequence
    routeInfoDiv.innerHTML = `
        <p><strong>Optimal Collection Route:</strong></p>
        <ol>
            ${data.optimal_route.map(loc => `<li>${loc}</li>`).join('')}
        </ol>
    `;
    
    // Add markers and route to map
    const routeCoordinates = data.optimal_route.map(block => srmBuildings[block]);
    
    // Add collection point markers
    data.collected_waste.forEach((item, index) => {
        const coords = srmBuildings[item.block];
        L.marker(coords, {
            icon: wasteIcons[item.type] || buildingIcon
        })
        .addTo(map)
        .bindPopup(`
            <b>${item.block}</b><br>
            Type: ${item.type}<br>
            Total Weight: ${item.weight} kg<br>
            Collected Weight: ${item.collected_weight || item.weight} kg<br>
            Value: $${item.value}
        `);
    });
    
    // Add route polyline
    L.polyline(routeCoordinates, {
        color: '#2E7D32',
        weight: 4,
        dashArray: '5, 5'
    }).addTo(map);
    
    // Fit map to route bounds
    map.fitBounds(routeCoordinates);
    
    // Populate waste table
    let totalWeight = 0;
    let totalCollectedWeight = 0;
    data.collected_waste.forEach(item => {
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

// Initialize with building markers
Object.entries(srmBuildings).forEach(([name, coords]) => {
    L.marker(coords, {
        icon: buildingIcon
    })
    .addTo(map)
    .bindPopup(`<b>${name}</b>`);
});
