// src/fetchStations.js
export const fetchStations = async (latitude, longitude) => {
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${latitude},${longitude})[public_transport=station];out;`;
    const response = await fetch(url);
    const data = await response.json();
  
    // Filter and return station names
    const stationNames = data.elements
      .map(element => element.tags.name)
      .filter(name => name && name.split(' ').length <= 3);
  
    console.log("Fetched stations:", stationNames);
    return stationNames;
  };
  