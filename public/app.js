/**
 * SkyPulse Flight Experience Portal Application Logic
 * Integrates directly with MuleSoft System API (http://localhost:8081/api/flights)
 */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    const state = {
        apiBaseUrl: window.location.origin, // Dynamically targets host:port (http://localhost:8081)
        flights: [],
        filteredFlights: [],
        activeStatusFilter: 'ALL',
        activeView: 'grid', // 'grid' | 'table'
        editingFlightId: null
    };

    // DOM Element References
    const elements = {
        apiStatusText: document.getElementById('apiStatusText'),
        apiPingText: document.getElementById('apiPingText'),
        apiStatusPill: document.getElementById('apiStatusPill'),
        btnRefresh: document.getElementById('btnRefresh'),
        btnOpenAddModal: document.getElementById('btnOpenAddModal'),
        
        // Metric Counters
        metricTotalFlights: document.getElementById('metricTotalFlights'),
        metricTotalSeats: document.getElementById('metricTotalSeats'),
        metricAvgPrice: document.getElementById('metricAvgPrice'),
        
        // Search & Filters
        searchInput: document.getElementById('searchInput'),
        btnClearSearch: document.getElementById('btnClearSearch'),
        sourceFilter: document.getElementById('sourceFilter'),
        destFilter: document.getElementById('destFilter'),
        statusFilterTabs: document.getElementById('statusFilterTabs'),
        
        // View Section
        flightCountBadge: document.getElementById('flightCountBadge'),
        viewGridBtn: document.getElementById('viewGridBtn'),
        viewTableBtn: document.getElementById('viewTableBtn'),
        loadingState: document.getElementById('loadingState'),
        emptyState: document.getElementById('emptyState'),
        btnResetFilters: document.getElementById('btnResetFilters'),
        flightsGrid: document.getElementById('flightsGrid'),
        flightsTableContainer: document.getElementById('flightsTableContainer'),
        flightsTableBody: document.getElementById('flightsTableBody'),
        
        // Add/Edit Modal
        flightModal: document.getElementById('flightModal'),
        modalTitle: document.getElementById('modalTitle'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCancelModal: document.getElementById('btnCancelModal'),
        flightForm: document.getElementById('flightForm'),
        inputFlightId: document.getElementById('inputFlightId'),
        inputAirline: document.getElementById('inputAirline'),
        inputSource: document.getElementById('inputSource'),
        inputDestination: document.getElementById('inputDestination'),
        inputDepartureTime: document.getElementById('inputDepartureTime'),
        inputArrivalTime: document.getElementById('inputArrivalTime'),
        inputSeats: document.getElementById('inputSeats'),
        inputPrice: document.getElementById('inputPrice'),
        inputStatus: document.getElementById('inputStatus'),
        saveBtnText: document.getElementById('saveBtnText'),
        
        // API Telemetry Modal
        apiTraceModal: document.getElementById('apiTraceModal'),
        btnCloseTraceModal: document.getElementById('btnCloseTraceModal'),
        traceRequestPayload: document.getElementById('traceRequestPayload'),
        traceResponsePayload: document.getElementById('traceResponsePayload'),
        
        // Toast Container
        toastContainer: document.getElementById('toastContainer')
    };

    // Initialize Application
    init();

    function init() {
        bindEvents();
        checkApiHealth();
        fetchFlights();
    }

    // Event Bindings
    function bindEvents() {
        elements.btnRefresh.addEventListener('click', () => {
            elements.btnRefresh.querySelector('i').classList.add('fa-spin');
            checkApiHealth();
            fetchFlights().then(() => {
                setTimeout(() => elements.btnRefresh.querySelector('i').classList.remove('fa-spin'), 500);
            });
        });

        elements.btnOpenAddModal.addEventListener('click', () => openAddModal());
        elements.btnCloseModal.addEventListener('click', () => closeModal());
        elements.btnCancelModal.addEventListener('click', () => closeModal());
        elements.flightForm.addEventListener('submit', handleFormSubmit);

        elements.btnCloseTraceModal.addEventListener('click', () => {
            elements.apiTraceModal.classList.remove('active');
        });

        // Search & Filters
        elements.searchInput.addEventListener('input', (e) => {
            elements.btnClearSearch.style.display = e.target.value ? 'block' : 'none';
            applyFilters();
        });

        elements.btnClearSearch.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.btnClearSearch.style.display = 'none';
            applyFilters();
        });

        elements.sourceFilter.addEventListener('change', applyFilters);
        elements.destFilter.addEventListener('change', applyFilters);
        elements.btnResetFilters.addEventListener('click', resetFilters);

        // Status Tabs
        elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                state.activeStatusFilter = e.target.dataset.status;
                applyFilters();
            });
        });

        // View Switcher
        elements.viewGridBtn.addEventListener('click', () => switchView('grid'));
        elements.viewTableBtn.addEventListener('click', () => switchView('table'));
    }

    // Ping System API Health Endpoint
    async function checkApiHealth() {
        const startTime = performance.now();
        try {
            const res = await fetch(`${state.apiBaseUrl}/health`);
            const latency = Math.round(performance.now() - startTime);
            
            if (res.ok) {
                const data = await res.json();
                elements.apiStatusText.textContent = `${data.status || 'UP'} (${data.environment || 'dev'})`;
                elements.apiPingText.textContent = `${latency} ms`;
                elements.apiStatusPill.querySelector('.status-dot').className = 'status-dot online';
            } else {
                throw new Error('Health check failed');
            }
        } catch (err) {
            elements.apiStatusText.textContent = 'Offline';
            elements.apiPingText.textContent = '-- ms';
            elements.apiStatusPill.querySelector('.status-dot').className = 'status-dot offline';
        }
    }

    // Fetch Flights List from System API
    async function fetchFlights() {
        showLoading(true);
        try {
            const res = await fetch(`${state.apiBaseUrl}/api/flights`);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            
            const flightsData = await res.json();
            state.flights = Array.isArray(flightsData) ? flightsData : [];
            
            populateCityDropdowns();
            updateMetrics();
            applyFilters();
            showLoading(false);
        } catch (err) {
            showLoading(false);
            showToast(`Failed to load flights from System API: ${err.message}`, 'error');
        }
    }

    // Populate Dynamic Source/Destination Filter Dropdowns
    function populateCityDropdowns() {
        const sources = [...new Set(state.flights.map(f => f.source).filter(Boolean))].sort();
        const dests = [...new Set(state.flights.map(f => f.destination).filter(Boolean))].sort();

        const currentSource = elements.sourceFilter.value;
        const currentDest = elements.destFilter.value;

        elements.sourceFilter.innerHTML = '<option value="">All Source Cities</option>' + 
            sources.map(c => `<option value="${c}">${c}</option>`).join('');
        elements.destFilter.innerHTML = '<option value="">All Destinations</option>' + 
            dests.map(c => `<option value="${c}">${c}</option>`).join('');

        elements.sourceFilter.value = currentSource;
        elements.destFilter.value = currentDest;
    }

    // Calculate Hero Metric Cards
    function updateMetrics() {
        const totalFlights = state.flights.length;
        const totalSeats = state.flights.reduce((acc, f) => acc + (parseInt(f.availableSeats) || 0), 0);
        const totalPrice = state.flights.reduce((acc, f) => acc + (parseFloat(f.price) || 0), 0);
        const avgPrice = totalFlights > 0 ? Math.round(totalPrice / totalFlights) : 0;

        elements.metricTotalFlights.textContent = totalFlights;
        elements.metricTotalSeats.textContent = totalSeats.toLocaleString();
        elements.metricAvgPrice.textContent = `₹${avgPrice.toLocaleString()}`;
    }

    // Filter Logic
    function applyFilters() {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const selectedSource = elements.sourceFilter.value;
        const selectedDest = elements.destFilter.value;
        const selectedStatus = state.activeStatusFilter;

        state.filteredFlights = state.flights.filter(flight => {
            const matchesSearch = !searchTerm || 
                (flight.flightId && flight.flightId.toLowerCase().includes(searchTerm)) ||
                (flight.airline && flight.airline.toLowerCase().includes(searchTerm)) ||
                (flight.source && flight.source.toLowerCase().includes(searchTerm)) ||
                (flight.destination && flight.destination.toLowerCase().includes(searchTerm));

            const matchesSource = !selectedSource || flight.source === selectedSource;
            const matchesDest = !selectedDest || flight.destination === selectedDest;
            const matchesStatus = selectedStatus === 'ALL' || flight.status === selectedStatus;

            return matchesSearch && matchesSource && matchesDest && matchesStatus;
        });

        elements.flightCountBadge.textContent = state.filteredFlights.length;
        renderFlights();
    }

    function resetFilters() {
        elements.searchInput.value = '';
        elements.btnClearSearch.style.display = 'none';
        elements.sourceFilter.value = '';
        elements.destFilter.value = '';
        state.activeStatusFilter = 'ALL';
        
        elements.statusFilterTabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === 'ALL');
        });

        applyFilters();
    }

    // Render Flight Cards / Table View
    function renderFlights() {
        if (state.filteredFlights.length === 0) {
            elements.emptyState.style.display = 'block';
            elements.flightsGrid.style.display = 'none';
            elements.flightsTableContainer.style.display = 'none';
            return;
        }

        elements.emptyState.style.display = 'none';

        if (state.activeView === 'grid') {
            elements.flightsGrid.style.display = 'grid';
            elements.flightsTableContainer.style.display = 'none';
            renderGrid();
        } else {
            elements.flightsGrid.style.display = 'none';
            elements.flightsTableContainer.style.display = 'block';
            renderTable();
        }
    }

    function renderGrid() {
        elements.flightsGrid.innerHTML = state.filteredFlights.map(flight => {
            const depTime = formatTime(flight.departureTime);
            const arrTime = formatTime(flight.arrivalTime);
            const statusClass = (flight.status || 'scheduled').toLowerCase();

            return `
                <div class="flight-card glass">
                    <div class="card-top">
                        <div class="airline-info">
                            <div class="airline-badge">${getAirlineCode(flight.airline)}</div>
                            <div>
                                <div class="airline-name">${escapeHtml(flight.airline)}</div>
                                <div class="flight-id-tag">${escapeHtml(flight.flightId)}</div>
                            </div>
                        </div>
                        <span class="status-badge ${statusClass}">${escapeHtml(flight.status || 'Scheduled')}</span>
                    </div>

                    <div class="route-container">
                        <div class="route-point">
                            <h4>${escapeHtml(flight.source)}</h4>
                            <span>${depTime}</span>
                        </div>
                        <div class="route-line-wrapper">
                            <div class="plane-line">
                                <i class="fa-solid fa-plane"></i>
                            </div>
                            <span class="duration-text">Direct</span>
                        </div>
                        <div class="route-point" style="text-align: right;">
                            <h4>${escapeHtml(flight.destination)}</h4>
                            <span>${arrTime}</span>
                        </div>
                    </div>

                    <div class="card-details">
                        <div class="price-tag">₹${parseFloat(flight.price || 0).toLocaleString()}</div>
                        <div class="seats-pill">
                            <i class="fa-solid fa-chair"></i>
                            <span><strong>${flight.availableSeats || 0}</strong> seats left</span>
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="btn btn-icon-only" onclick="window.viewTrace('${flight.flightId}')" title="System API Trace">
                            <i class="fa-solid fa-code"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="window.openEditModal('${flight.flightId}')">
                            <i class="fa-solid fa-pen-to-square"></i>
                            <span>Edit</span>
                        </button>
                        <button class="btn btn-secondary" onclick="window.deleteFlight('${flight.flightId}')" style="color: var(--accent-rose);">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTable() {
        elements.flightsTableBody.innerHTML = state.filteredFlights.map(flight => {
            const statusClass = (flight.status || 'scheduled').toLowerCase();
            return `
                <tr>
                    <td><strong>${escapeHtml(flight.flightId)}</strong></td>
                    <td>${escapeHtml(flight.airline)}</td>
                    <td>${escapeHtml(flight.source)} ✈️ ${escapeHtml(flight.destination)}</td>
                    <td>${formatTime(flight.departureTime)}</td>
                    <td>${formatTime(flight.arrivalTime)}</td>
                    <td>${flight.availableSeats || 0}</td>
                    <td><strong>₹${parseFloat(flight.price || 0).toLocaleString()}</strong></td>
                    <td><span class="status-badge ${statusClass}">${escapeHtml(flight.status || 'Scheduled')}</span></td>
                    <td>
                        <button class="btn btn-icon-only" onclick="window.openEditModal('${flight.flightId}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-icon-only" onclick="window.deleteFlight('${flight.flightId}')" title="Delete" style="color: var(--accent-rose);">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function switchView(view) {
        state.activeView = view;
        elements.viewGridBtn.classList.toggle('active', view === 'grid');
        elements.viewTableBtn.classList.toggle('active', view === 'table');
        renderFlights();
    }

    // Modal Operations (Add / Edit)
    function openAddModal() {
        state.editingFlightId = null;
        elements.modalTitle.innerHTML = '<i class="fa-solid fa-plane-circle-plus"></i><span>Add New Flight</span>';
        elements.saveBtnText.textContent = 'Create Flight';
        elements.inputFlightId.readOnly = false;
        elements.flightForm.reset();
        
        // Default timestamps
        const now = new Date();
        const depStr = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 16);
        const arrStr = new Date(now.getTime() + 26.5 * 3600 * 1000).toISOString().slice(0, 16);
        
        elements.inputDepartureTime.value = depStr;
        elements.inputArrivalTime.value = arrStr;

        elements.flightModal.classList.add('active');
    }

    window.openEditModal = function(flightId) {
        const flight = state.flights.find(f => f.flightId === flightId);
        if (!flight) return;

        state.editingFlightId = flightId;
        elements.modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Flight Details</span>';
        elements.saveBtnText.textContent = 'Update Flight';
        
        elements.inputFlightId.value = flight.flightId;
        elements.inputFlightId.readOnly = true; // Primary Key
        elements.inputAirline.value = flight.airline || '';
        elements.inputSource.value = flight.source || '';
        elements.inputDestination.value = flight.destination || '';
        elements.inputDepartureTime.value = flight.departureTime ? flight.departureTime.slice(0, 16) : '';
        elements.inputArrivalTime.value = flight.arrivalTime ? flight.arrivalTime.slice(0, 16) : '';
        elements.inputSeats.value = flight.availableSeats || 0;
        elements.inputPrice.value = flight.price || 0;
        elements.inputStatus.value = flight.status || 'Scheduled';

        elements.flightModal.classList.add('active');
    };

    function closeModal() {
        state.editingFlightId = null;
        elements.flightModal.classList.remove('active');
    }

    // Handle Flight Form Submission (POST / PUT)
    async function handleFormSubmit(e) {
        e.preventDefault();

        let depTime = elements.inputDepartureTime.value;
        if (depTime && depTime.length === 16) depTime += ':00';

        let arrTime = elements.inputArrivalTime.value;
        if (arrTime && arrTime.length === 16) arrTime += ':00';

        const payload = {
            flightId: elements.inputFlightId.value.trim().toUpperCase(),
            airline: elements.inputAirline.value.trim(),
            source: elements.inputSource.value.trim(),
            destination: elements.inputDestination.value.trim(),
            departureTime: depTime,
            arrivalTime: arrTime,
            availableSeats: parseInt(elements.inputSeats.value, 10) || 0,
            price: parseFloat(elements.inputPrice.value) || 0.0,
            status: elements.inputStatus.value
        };

        const isEdit = !!state.editingFlightId;
        const targetId = isEdit ? state.editingFlightId : payload.flightId;
        const endpoint = isEdit ? `${state.apiBaseUrl}/api/flights/${targetId}` : `${state.apiBaseUrl}/api/flights`;
        const method = isEdit ? 'PUT' : 'POST';

        elements.btnSaveFlight.disabled = true;

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resData = await res.json();
            elements.btnSaveFlight.disabled = false;

            if (res.ok) {
                showToast(resData.message || `Flight ${payload.flightId} saved successfully!`, 'success');
                closeModal();
                resetFilters();
                await fetchFlights();
            } else {
                showToast(`System API Error: ${resData.message || resData.errorType}`, 'error');
            }
        } catch (err) {
            elements.btnSaveFlight.disabled = false;
            showToast(`API Connection Failed: ${err.message}`, 'error');
        }
    }

    // Delete Flight (DELETE /api/flights/{id})
    window.deleteFlight = async function(flightId) {
        if (!confirm(`Are you sure you want to delete flight ${flightId}? This action cannot be undone.`)) return;

        try {
            const res = await fetch(`${state.apiBaseUrl}/api/flights/${flightId}`, {
                method: 'DELETE'
            });

            const resData = await res.json();

            if (res.ok) {
                showToast(`Flight ${flightId} deleted successfully.`, 'success');
                fetchFlights();
            } else {
                showToast(`Failed to delete flight: ${resData.message || 'Server error'}`, 'error');
            }
        } catch (err) {
            showToast(`Network Error: ${err.message}`, 'error');
        }
    };

    // System API Telemetry Trace View
    window.viewTrace = function(flightId) {
        const flight = state.flights.find(f => f.flightId === flightId);
        if (!flight) return;

        elements.traceRequestPayload.textContent = JSON.stringify({
            httpMethod: "GET",
            requestPath: `/api/flights/${flightId}`,
            ramlSpecification: "flight-management-api.raml",
            queryParams: {},
            headers: { "Accept": "application/json" }
        }, null, 2);

        elements.traceResponsePayload.textContent = JSON.stringify({
            dataWeaveScript: "map-db-to-flight.dwl",
            httpStatusCode: 200,
            systemApiResponsePayload: flight
        }, null, 2);

        elements.apiTraceModal.classList.add('active');
    };

    // Utility Helpers
    function showLoading(isLoading) {
        elements.loadingState.style.display = isLoading ? 'block' : 'none';
        if (isLoading) {
            elements.flightsGrid.style.display = 'none';
            elements.flightsTableContainer.style.display = 'none';
            elements.emptyState.style.display = 'none';
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            info: 'fa-circle-info'
        };

        toast.innerHTML = `
            <i class="fa-solid ${iconMap[type]}"></i>
            <span>${escapeHtml(message)}</span>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInToast 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function formatTime(isoStr) {
        if (!isoStr) return '--:--';
        try {
            const date = new Date(isoStr);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return isoStr;
        }
    }

    function getAirlineCode(airlineStr) {
        if (!airlineStr) return 'FL';
        const parts = airlineStr.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return airlineStr.slice(0, 2).toUpperCase();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});
