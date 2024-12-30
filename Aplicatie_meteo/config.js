// config.js
const config = {
    // În producție, acestea ar trebui să fie variabile de mediu
    // sau gestionate de un backend
    apiKey: '17f72602b6ff23ebaaeabed683dd9bcf',
    apiEndpoint: 'https://api.openweathermap.org/data/2.5',
    defaultUnits: 'metric',
    defaultLang: 'ro',
    refreshInterval: 900000, // 15 minute
    cacheExpiration: 900000, // 15 minute
    maxRetries: 3,
    errorMessages: {
        cityNotFound: 'Orașul nu a fost găsit.',
        networkError: 'Eroare de rețea. Verifică conexiunea.',
        locationDenied: 'Accesul la locație a fost refuzat.',
        generic: 'A apărut o eroare. Te rog încearcă din nou.'
    }
};

// Prevenim modificarea obiectului de configurare
Object.freeze(config);

module.exports = config;
