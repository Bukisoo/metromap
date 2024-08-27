// src/fetchStations.js

export const getGeolocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error('Geolocation failed'))
    );
  });
};

export const fetchStations = async (latitude, longitude, minStations = 8) => {
  let stationNames = [];
  let radius = 10000; // Start with a 10km radius
  const maxRadius = 50000; // Maximum radius of 50km
  const radiusIncrement = 10000; // Increase radius by 10km with each attempt

  while (stationNames.length < minStations && radius <= maxRadius) {
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radius},${latitude},${longitude})[public_transport=station];out;`;
    const response = await fetch(url);
    const data = await response.json();

    // Filter and return station names
    stationNames = data.elements
      .map(element => element.tags.name)
      .filter(name => name && name.split(' ').length <= 3);

    console.log(`Fetched stations with radius ${radius / 1000}km:`, stationNames);

    radius += radiusIncrement; // Increase the search radius for the next attempt
  }

  // If still not enough station names, use fallback names
  if (stationNames.length < minStations) {
    const fallbackStations = generateFallbackNames(minStations - stationNames.length);
    stationNames = stationNames.concat(fallbackStations);
  }

  return stationNames;
};

const generateFallbackNames = (count) => {
  const fallbackStations = [];
  for (let i = 1; i <= count; i++) {
    fallbackStations.push(`Fallback Station ${i}`);
  }
  return fallbackStations;
};
