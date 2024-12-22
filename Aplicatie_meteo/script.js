// Configurare inițială
const config = {
    apiKey: '17f72602b6ff23ebaaeabed683dd9bcf',
    units: 'metric',
    lang: 'ro'
};

// Starea aplicației
let state = {
    darkMode: false,
    units: 'metric',
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
    notifications: JSON.parse(localStorage.getItem('notifications') || 'false'),
    chart: null
};

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Inițializări existente
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    initializeDarkMode();
    initializeNotifications();
    loadFavorites();
    
    // Event Listeners
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
    document.getElementById('unitToggle').addEventListener('click', toggleUnits);
    document.getElementById('getCurrentLocation').addEventListener('click', getLocationWeather);
    document.getElementById('notificationToggle').addEventListener('click', toggleNotifications);
    document.getElementById('addToFavorites').addEventListener('click', toggleFavorite);
    document.getElementById('createWidget').addEventListener('click', createWidget);
    
    // Verifică dacă există un oraș salvat
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        document.getElementById('city').value = lastCity;
        getWeather();
    }
});

// Inițializare Dark Mode
function initializeDarkMode() {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    state.darkMode = savedDarkMode;
    document.body.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
    document.getElementById('darkModeToggle').checked = savedDarkMode;
}

// Inițializare Notificări
function initializeNotifications() {
    if ('Notification' in window) {
        const notificationBtn = document.getElementById('notificationToggle');
        notificationBtn.style.display = 'block';
        
        if (Notification.permission === 'granted') {
            state.notifications = true;
            notificationBtn.innerHTML = '<i class="fas fa-bell"></i>';
        } else {
            notificationBtn.innerHTML = '<i class="fas fa-bell-slash"></i>';
        }
    }
}

// Toggle Notifications
async function toggleNotifications() {
    if (!('Notification' in window)) {
        alert('Browserul tău nu suportă notificări.');
        return;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            state.notifications = true;
            localStorage.setItem('notifications', 'true');
            document.getElementById('notificationToggle').innerHTML = '<i class="fas fa-bell"></i>';
        }
    } else if (Notification.permission === 'granted') {
        state.notifications = !state.notifications;
        localStorage.setItem('notifications', state.notifications);
        document.getElementById('notificationToggle').innerHTML = 
            state.notifications ? '<i class="fas fa-bell"></i>' : '<i class="fas fa-bell-slash"></i>';
    }
}

// Managementul orașelor favorite
function loadFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    
    state.favorites.forEach(city => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.innerHTML = `
            <i class="fas fa-star"></i>
            <span>${city}</span>
            <button onclick="removeFavorite('${city}')" class="remove-favorite">
                <i class="fas fa-times"></i>
            </button>
        `;
        favoriteItem.addEventListener('click', () => {
            document.getElementById('city').value = city;
            getWeather();
        });
        favoritesList.appendChild(favoriteItem);
    });
}

function toggleFavorite() {
    const cityName = document.getElementById('cityName').textContent;
    const btn = document.getElementById('addToFavorites');
    
    if (cityName === 'Oraș') return;
    
    const index = state.favorites.indexOf(cityName);
    if (index === -1) {
        state.favorites.push(cityName);
        btn.innerHTML = '<i class="fas fa-star"></i>';
    } else {
        state.favorites.splice(index, 1);
        btn.innerHTML = '<i class="far fa-star"></i>';
    }
    
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    loadFavorites();
}

function removeFavorite(city) {
    const index = state.favorites.indexOf(city);
    if (index !== -1) {
        state.favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        loadFavorites();
    }
}

// Toggle Dark Mode
function toggleDarkMode(e) {
    state.darkMode = e.target.checked;
    document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', state.darkMode);
}

// Toggle Units (C/F)
function toggleUnits() {
    state.units = state.units === 'metric' ? 'imperial' : 'metric';
    document.getElementById('unitToggle').textContent = state.units === 'metric' ? '°C / °F' : '°F / °C';
    if (document.getElementById('cityName').textContent !== 'Oraș') {
        getWeather(); // Reîncarcă vremea cu noile unități
    }
}

// Get Current Location
function getLocationWeather() {
    if (navigator.geolocation) {
        document.getElementById('error-message').textContent = 'Se obține locația...';
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            error => {
                document.getElementById('error-message').textContent = 'Nu s-a putut obține locația. Te rog încearcă manual.';
            }
        );
    } else {
        document.getElementById('error-message').textContent = 'Browserul tău nu suportă geolocalizarea.';
    }
}

// Get Weather by Coordinates
async function getWeatherByCoords(lat, lon) {
    const errorMessage = document.getElementById('error-message');
    try {
        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Nu s-au putut obține datele meteo pentru locația curentă.');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (!currentData || !currentData.main || !forecastData || !forecastData.list) {
            throw new Error('Date meteo invalide primite de la server.');
        }
        
        updateWeatherUI(currentData, forecastData);
        errorMessage.textContent = ''; // Șterge mesajul de eroare dacă totul e ok
    } catch (error) {
        console.error('Error fetching weather data:', error);
        errorMessage.textContent = error.message || 'A apărut o eroare la obținerea datelor meteo.';
    }
}

// Get Weather by City Name
async function getWeather() {
    const city = document.getElementById('city').value.trim();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';

    if (!city) {
        errorMessage.textContent = 'Te rog introdu un oraș.';
        return;
    }

    try {
        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;

        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Orașul nu a fost găsit.');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        // Salvează orașul pentru următoarea vizită
        localStorage.setItem('lastCity', city);

        updateWeatherUI(currentData, forecastData);
    } catch (error) {
        handleError(error);
    }
}

// Update Weather UI
function updateWeatherUI(currentData, forecastData) {
    // Update current weather
    document.getElementById('cityName').textContent = currentData.name;
    document.getElementById('temperature').textContent = `${Math.round(currentData.main.temp)}°${state.units === 'metric' ? 'C' : 'F'}`;
    document.getElementById('description').textContent = currentData.weather[0].description;
    document.getElementById('date').textContent = new Date().toLocaleDateString('ro-RO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Update weather icon
    const iconCode = currentData.weather[0].icon;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    // Update details
    document.getElementById('tempMax').textContent = `${Math.round(currentData.main.temp_max)}°${state.units === 'metric' ? 'C' : 'F'}`;
    document.getElementById('tempMin').textContent = `${Math.round(currentData.main.temp_min)}°${state.units === 'metric' ? 'C' : 'F'}`;
    document.getElementById('humidity').textContent = `${currentData.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(currentData.wind.speed)} ${state.units === 'metric' ? 'km/h' : 'mph'}`;
    document.getElementById('pressure').textContent = `${currentData.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(currentData.visibility / 1000).toFixed(1)} km`;

    // Update forecast
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';

    // Filtrează prognoza pentru a obține doar o predicție pe zi la aceeași oră
    const dailyForecasts = forecastData.list.filter((forecast, index) => index % 8 === 0).slice(0, 4);

    dailyForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('ro-RO', { weekday: 'long' });
        const temp = Math.round(forecast.main.temp);
        const iconCode = forecast.weather[0].icon;

        const forecastHTML = `
            <div class="forecast-item">
                <p>${dayName}</p>
                <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="weather icon">
                <p class="temp">${temp}°${state.units === 'metric' ? 'C' : 'F'}</p>
                <p>${forecast.weather[0].description}</p>
            </div>
        `;
        forecastContainer.innerHTML += forecastHTML;
    });

    // Actualizează background-ul în funcție de vreme
    const weatherCondition = currentData.weather[0].main.toLowerCase();
    document.body.style.backgroundImage = getBackgroundGradient(weatherCondition);
    
    // Verifică și afișează alerte meteo
    checkWeatherAlerts(currentData);
    
    // Actualizează graficul
    updateTemperatureChart(forecastData);
    
    // Actualizează widget-ul
    updateWidgetPreview(currentData);
    
    // Verifică condițiile pentru notificări
    checkWeatherConditions(currentData);
}

// Grafic pentru temperatură
function updateTemperatureChart(forecastData) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js nu este încărcat. Graficul nu poate fi afișat.');
        return;
    }

    const ctx = document.getElementById('temperatureChart');
    if (!ctx) {
        console.error('Canvas-ul pentru grafic nu a fost găsit');
        return;
    }
    
    // Pregătește datele pentru grafic
    const labels = [];
    const temperatures = [];
    
    forecastData.list.slice(0, 8).forEach(forecast => {
        labels.push(new Date(forecast.dt * 1000).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'}));
        temperatures.push(forecast.main.temp);
    });
    
    // Distruge graficul existent dacă există
    if (state.chart) {
        state.chart.destroy();
    }
    
    try {
        // Creează noul grafic
        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: temperatures,
                    borderColor: '#ff7e5f',
                    backgroundColor: 'rgba(255, 126, 95, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value + '°' + (state.units === 'metric' ? 'C' : 'F');
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Eroare la crearea graficului:', error);
    }
}

// Verificare condiții meteo pentru alerte
function checkWeatherAlerts(data) {
    const alertsContainer = document.getElementById('weatherAlerts');
    if (!alertsContainer) {
        console.error('Container-ul pentru alerte nu a fost găsit');
        return;
    }
    
    alertsContainer.innerHTML = '';
    
    const conditions = [
        {
            check: data.main.temp > 30,
            message: 'Temperatură ridicată! Evitați expunerea prelungită la soare.',
            icon: 'fa-temperature-high'
        },
        {
            check: data.main.temp < 0,
            message: 'Temperatură scăzută! Îmbrăcați-vă corespunzător.',
            icon: 'fa-temperature-low'
        },
        {
            check: data.wind.speed > 50,
            message: 'Vânt puternic! Evitați deplasările neesențiale.',
            icon: 'fa-wind'
        },
        {
            check: data.main.humidity > 85,
            message: 'Umiditate ridicată! Posibile precipitații.',
            icon: 'fa-droplet'
        }
    ];
    
    conditions.forEach(condition => {
        if (condition.check) {
            const alert = document.createElement('div');
            alert.className = 'alert-item';
            alert.innerHTML = `
                <i class="fas ${condition.icon}"></i>
                <span>${condition.message}</span>
            `;
            alertsContainer.appendChild(alert);
            
            if (state.notifications && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Alertă Meteo', {
                    body: condition.message,
                    icon: 'https://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png'
                });
            }
        }
    });
}

// Widget pentru desktop
function updateWidgetPreview(data) {
    const widgetPreview = document.getElementById('widgetPreview');
    widgetPreview.innerHTML = `
        <div class="widget-weather">
            <h4>${data.name}</h4>
            <div class="widget-temp">
                <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="weather icon">
                <span>${Math.round(data.main.temp)}°${state.units === 'metric' ? 'C' : 'F'}</span>
            </div>
            <p>${data.weather[0].description}</p>
        </div>
    `;
}

function createWidget() {
    // Aici ar trebui să implementăm logica pentru crearea unui widget real pentru desktop
    // Aceasta ar necesita o extensie pentru browser sau o aplicație desktop separată
    alert('Funcționalitatea de widget desktop va fi disponibilă în curând!');
}

// Verifică condițiile pentru notificări
function checkWeatherConditions(data) {
    const conditions = [
        {
            check: data.main.temp > 30,
            message: 'Temperatură ridicată! Evitați expunerea prelungită la soare.'
        },
        {
            check: data.main.temp < 0,
            message: 'Temperatură scăzută! Îmbrăcați-vă corespunzător.'
        },
        {
            check: data.wind.speed > 50,
            message: 'Vânt puternic! Evitați deplasările neesențiale.'
        },
        {
            check: data.main.humidity > 85,
            message: 'Umiditate ridicată! Posibile precipitații.'
        }
    ];
    
    conditions.forEach(condition => {
        if (condition.check && state.notifications) {
            new Notification('Alertă Meteo', {
                body: condition.message,
                icon: '/path/to/weather-icon.png'
            });
        }
    });
}

// Get Background Gradient based on weather
function getBackgroundGradient(condition) {
    const gradients = {
        clear: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
        clouds: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        rain: 'linear-gradient(135deg, #000046, #1CB5E0)',
        snow: 'linear-gradient(135deg, #E6DADA, #274046)',
        thunderstorm: 'linear-gradient(135deg, #232526, #414345)',
        drizzle: 'linear-gradient(135deg, #2C3E50, #3498DB)',
        mist: 'linear-gradient(135deg, #606c88, #3f4c6b)'
    };
    
    return gradients[condition] || gradients.clear;
}

// Error Handler
function handleError(error) {
    console.error('Error:', error);
    document.getElementById('error-message').textContent = error.message || 'A apărut o eroare. Te rog încearcă din nou.';
}

// Utilities
const utils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    isOnline: () => navigator.onLine,
    
    showOfflineNotification: () => {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.hidden = false;
        }
    },
    
    hideOfflineNotification: () => {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.hidden = true;
        }
    }
};

// Cache management
const cacheManager = {
    set: (key, data) => {
        const cacheItem = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));
    },
    
    get: (key) => {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp > config.cacheExpiration) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    },
    
    clear: () => {
        localStorage.clear();
    }
};

// API Service
const weatherService = {
    async getCurrentWeather(city) {
        const cacheKey = `current_${city}_${config.defaultUnits}`;
        const cached = cacheManager.get(cacheKey);
        
        if (cached) return cached;
        
        const response = await fetch(
            `${config.apiEndpoint}/weather?q=${city}&appid=${config.apiKey}&units=${config.defaultUnits}&lang=${config.defaultLang}`
        );
        
        if (!response.ok) {
            throw new Error(config.errorMessages.cityNotFound);
        }
        
        const data = await response.json();
        cacheManager.set(cacheKey, data);
        return data;
    },
    
    async getForecast(city) {
        const cacheKey = `forecast_${city}_${config.defaultUnits}`;
        const cached = cacheManager.get(cacheKey);
        
        if (cached) return cached;
        
        const response = await fetch(
            `${config.apiEndpoint}/forecast?q=${city}&appid=${config.apiKey}&units=${config.defaultUnits}&lang=${config.defaultLang}`
        );
        
        if (!response.ok) {
            throw new Error(config.errorMessages.cityNotFound);
        }
        
        const data = await response.json();
        cacheManager.set(cacheKey, data);
        return data;
    }
};

// State Management
const state = {
    darkMode: false,
    units: config.defaultUnits,
    favorites: [],
    notifications: false,
    chart: null,
    
    init() {
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.units = localStorage.getItem('units') || config.defaultUnits;
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.notifications = JSON.parse(localStorage.getItem('notifications') || 'false');
    },
    
    save() {
        localStorage.setItem('darkMode', this.darkMode);
        localStorage.setItem('units', this.units);
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        localStorage.setItem('notifications', this.notifications);
    }
};

// Event Handlers
const eventHandlers = {
    searchCity: utils.debounce(() => {
        getWeather();
    }, 500),
    
    toggleDarkMode(e) {
        state.darkMode = e.target.checked;
        document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
        state.save();
    },
    
    toggleUnits() {
        state.units = state.units === 'metric' ? 'imperial' : 'metric';
        document.getElementById('unitToggle').textContent = 
            state.units === 'metric' ? '

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });
}
