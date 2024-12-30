const config = require('./config');

// Starea aplicației
const state = {
    darkMode: false,
    units: config.defaultUnits,
    lang: config.defaultLang,
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
    notifications: JSON.parse(localStorage.getItem('notifications') || 'false'),
    chart: null
};

// Helper pentru localStorage
function safeLocalStorage(key, value = undefined) {
    try {
        if (value === undefined) {
            return localStorage.getItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    } catch (error) {
        console.warn('LocalStorage nu este suportat sau accesibil:', error);
        return null;
    }
}

// DOM Elements
function initializeApp() {
    try {
        document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
        document.getElementById('unitToggle').addEventListener('click', toggleUnits);
        document.getElementById('getCurrentLocation').addEventListener('click', getLocationWeather);
        document.getElementById('notificationToggle').addEventListener('click', toggleNotifications);
        document.getElementById('addToFavorites').addEventListener('click', toggleFavorite);
        document.getElementById('createWidget').addEventListener('click', createWidget);

        const lastCity = safeLocalStorage('lastCity');
        if (lastCity) {
            document.getElementById('city').value = lastCity;
            getWeather();
        }
    } catch (error) {
        console.error('Eroare la inițializarea aplicației:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode()
        .then(initializeNotifications)
        .then(loadFavorites)
        .then(initializeApp);
});

// Inițializare Dark Mode
async function initializeDarkMode() {
    state.darkMode = safeLocalStorage('darkMode') === 'true';
    document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = state.darkMode;
}

// Inițializare Notificări
async function initializeNotifications() {
    if ('Notification' in window) {
        const notificationBtn = document.getElementById('notificationToggle');
        if (notificationBtn) {
            notificationBtn.style.display = 'block';

            if (Notification.permission === 'granted') {
                state.notifications = true;
                notificationBtn.innerHTML = '<i class="fas fa-bell"></i>';
            } else {
                notificationBtn.innerHTML = '<i class="fas fa-bell-slash"></i>';
            }
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
            safeLocalStorage('notifications', 'true');
            document.getElementById('notificationToggle').innerHTML = '<i class="fas fa-bell"></i>';
        }
    } else if (Notification.permission === 'granted') {
        state.notifications = !state.notifications;
        safeLocalStorage('notifications', state.notifications);
        document.getElementById('notificationToggle').innerHTML = 
            state.notifications ? '<i class="fas fa-bell"></i>' : '<i class="fas fa-bell-slash"></i>';
    }
}

// Managementul orașelor favorite
async function loadFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    if (!favoritesList) return;
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

async function toggleFavorite() {
    const cityName = document.getElementById('cityName')?.textContent;
    const btn = document.getElementById('addToFavorites');
    if (!cityName || cityName === 'Oraș' || !btn) return;

    const index = state.favorites.indexOf(cityName);
    if (index === -1) {
        state.favorites.push(cityName);
        btn.innerHTML = '<i class="fas fa-star"></i>';
    } else {
        state.favorites.splice(index, 1);
        btn.innerHTML = '<i class="far fa-star"></i>';
    }

    safeLocalStorage('favorites', JSON.stringify(state.favorites));
    loadFavorites();
}

async function removeFavorite(city) {
    const index = state.favorites.indexOf(city);
    if (index !== -1) {
        state.favorites.splice(index, 1);
        safeLocalStorage('favorites', JSON.stringify(state.favorites));
        loadFavorites();
    }
}

// Toggle Dark Mode
async function toggleDarkMode(e) {
    state.darkMode = e.target.checked;
    document.body.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    safeLocalStorage('darkMode', state.darkMode);
}

// Toggle Units (C/F)
async function toggleUnits() {
    state.units = state.units === 'metric' ? 'imperial' : 'metric';
    document.getElementById('unitToggle').textContent = state.units === 'metric' ? '°C / °F' : '°F / °C';
    if (document.getElementById('cityName').textContent !== 'Oraș') {
        getWeather(); // Reîncarcă vremea cu noile unități
    }
}

// Get Current Location
async function getLocationWeather() {
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
    const currentWeatherUrl = `${config.apiEndpoint}/weather?lat=${lat}&lon=${lon}&appid=${config.apiKey}&units=${state.units}&lang=${state.lang}`;
    const forecastUrl = `${config.apiEndpoint}/forecast?lat=${lat}&lon=${lon}&appid=${config.apiKey}&units=${state.units}&lang=${state.lang}`;
    
    try {
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
    } catch (error) {
        document.getElementById('error-message').textContent = 'Eroare la obținerea datelor meteo. Te rog încearcă din nou mai târziu.';
        console.error(error);
    }
}

// Get Weather by Coordinates
async function getWeatherByCoords(lat, lon) {
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
}

// Update Weather UI
async function updateWeatherUI(currentData, forecastData) {
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
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="weather icon">
                <p>${temp}°${state.units === 'metric' ? 'C' : 'F'}</p>
            </div>
        `;
        forecastContainer.innerHTML += forecastHTML;
    });

    // Update favorites button
    const favBtn = document.getElementById('addToFavorites');
    favBtn.innerHTML = state.favorites.includes(currentData.name) ? 
        '<i class="fas fa-star"></i>' : 
        '<i class="far fa-star"></i>';
}

// Get Weather by City Name
async function getWeather() {
    const city = document.getElementById('city').value;
    if (!city) return;

    try {
        document.getElementById('error-message').textContent = '';
        
        const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;
        const currentResponse = await fetch(currentWeatherUrl);
        const currentData = await currentResponse.json();

        if (currentResponse.ok) {
            const { lat, lon } = currentData.coord;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${config.apiKey}&units=${state.units}&lang=${config.lang}`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();

            localStorage.setItem('lastCity', city);
            updateWeatherUI(currentData, forecastData);
        } else {
            document.getElementById('error-message').textContent = currentData.message || 'Eroare la obținerea datelor meteo.';
        }
    } catch (error) {
        document.getElementById('error-message').textContent = 'Eroare la conectarea la serviciul meteo.';
    }
}

// Create Weather Widget
function createWidget() {
    const city = document.getElementById('cityName').textContent;
    if (city === 'Oraș') return;

    const widgetCode = `
        <iframe 
            src="widget.html?city=${encodeURIComponent(city)}&units=${state.units}" 
            width="300" 
            height="200" 
            frameborder="0">
        </iframe>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Cod Widget</h3>
            <textarea readonly>${widgetCode}</textarea>
            <button onclick="this.parentElement.parentElement.remove()">Închide</button>
        </div>
    `;

    document.body.appendChild(modal);
}
