// src/fetchStations.js

export const getGeolocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error('Geolocation failed'))
    );
  });
};

// Helper: Generates fallback station names when needed.
const generateFallbackNames = (count) => {
  const fallbackStations = [];
  for (let i = 1; i <= count; i++) {
    fallbackStations.push(`Fallback Station ${i}`);
  }
  return fallbackStations;
};

// Original API fetch logic wrapped as its own function.
const fetchStationsFromAPI = async (latitude, longitude, minStations = 8) => {
  let stationNames = [];
  let radius = 10000; // Start with a 10km radius
  const maxRadius = 50000; // Maximum radius of 50km
  const radiusIncrement = 10000; // Increase radius by 10km with each attempt

  while (stationNames.length < minStations && radius <= maxRadius) {
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radius},${latitude},${longitude})[public_transport=station];out;`;
    const response = await fetch(url);
    const data = await response.json();

    // Filter and return station names (only names with three or fewer words)
    stationNames = data.elements
      .map(element => element.tags.name)
      .filter(name => name && name.split(' ').length <= 3);

    //console.log(`Fetched stations with radius ${radius / 1000}km:`, stationNames);
    radius += radiusIncrement; // Increase the search radius for the next attempt
  }

  // If still not enough station names, use fallback names.
  if (stationNames.length < minStations) {
    const fallbackStations = generateFallbackNames(minStations - stationNames.length);
    stationNames = stationNames.concat(fallbackStations);
  }

  return stationNames;
};

// Main fetchStations function that uses a 3-second timeout and local storage fallback.
export const fetchStations = async (latitude, longitude, minStations = 8) => {
  const storageKey = 'stationsData';

  // Create a promise for fetching stations from the API.
  const apiPromise = fetchStationsFromAPI(latitude, longitude, minStations)
    .then(stations => {
      // Save the fetched stations to local storage
      localStorage.setItem(storageKey, JSON.stringify(stations));
      return stations;
    })
    .catch(error => {
      console.error('Error fetching stations from API:', error);
      return null;
    });

  // Create a timeout promise that resolves after 3 seconds
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve(null);
    }, 3000);
  });

  // Race the API call against the timeout.
  const stationsResult = await Promise.race([apiPromise, timeoutPromise]);

  if (stationsResult) {
    // API returned data within 3 seconds.
    return stationsResult;
  } else {
    // API took too long; try to use stored stations.
    const storedStations = localStorage.getItem(storageKey);
    if (storedStations) {
      console.log('Using stored stations from localStorage.');
      return JSON.parse(storedStations);
    } else {
      // No stored data available; use fallback names.
      console.log('Using fallback stations.');
      return generateFallbackNames(minStations);
    }
  }
};
