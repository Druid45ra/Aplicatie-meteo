async function getWeather() {
    const city = document.getElementById('city').value.trim(); // Elimină spațiile albe
    const apiKey = *********;  // Înlocuiește cu cheia ta API reală
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const forecastWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = ''; // Clear previous error messages

    if (!city) {
        errorMessage.textContent = 'Te rog introdu un oraș valid.';
        return;
    }

    try {
        // Fetch current weather data
        const currentResponse = await fetch(currentWeatherUrl);
        if (!currentResponse.ok) {
            const errorData = await currentResponse.json();
            throw new Error(errorData.message || 'Orașul nu a fost găsit.');
        }
        const currentData = await currentResponse.json();

        // Update current weather section
        document.getElementById('cityName').textContent = currentData.name;
        document.getElementById('temperature').textContent = `Temperatura: ${currentData.main.temp}°C`;
        document.getElementById('description').textContent = currentData.weather[0].description;

        const currentIconCode = currentData.weather[0].icon;
        const currentIconUrl = `https://openweathermap.org/img/wn/${currentIconCode}@2x.png`;
        document.querySelector('.current-weather .icon').innerHTML = `<img src="${currentIconUrl}" alt="weather icon">`;

        // Dynamically change the background based on the weather condition
        const weatherCondition = currentData.weather[0].main.toLowerCase();
        changeBackground(weatherCondition);

        // Fetch 5-day forecast data
        const forecastResponse = await fetch(forecastWeatherUrl);
        if (!forecastResponse.ok) {
            const errorData = await forecastResponse.json();
            throw new Error(errorData.message || 'Eroare la obținerea prognozei.');
        }
        const forecastData = await forecastResponse.json();

        const forecastDays = document.querySelectorAll('.day');
        forecastDays.forEach((day, index) => {
            const forecast = forecastData.list[index * 8]; // Get the forecast for every 8 hours
            day.querySelector('.temp').textContent = `${Math.round(forecast.main.temp)}°C`;
            day.querySelector('p').textContent = new Date(forecast.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
            const forecastIconCode = forecast.weather[0].icon;
            const forecastIconUrl = `https://openweathermap.org/img/wn/${forecastIconCode}@2x.png`;
            day.querySelector('.icon').innerHTML = `<img src="${forecastIconUrl}" alt="forecast icon">`;
        });

    } catch (error) {
        console.error(error); // Log the error for debugging
        errorMessage.textContent = error.message; // Display the error message to the user
    }
}

function changeBackground(condition) {
    const body = document.body;
    switch (condition) {
        case 'clear':
            body.style.backgroundImage = "url('clear-sky.jpg')";
            break;
        case 'clouds':
            body.style.backgroundImage = "url('cloudy.jpg')";
            break;
        case 'rain':
            body.style.backgroundImage = "url('rainy.jpg')";
            break;
        case 'snow':
            body.style.backgroundImage = "url('snowy.jpg')";
            break;
        default:
            body.style.backgroundImage = "url('default.jpg')";
    }
}