// Star classification based on temperature and radius
import { SCALE } from './config.js';

// Get star type based on temperature and radius
function getStarType(temperature, radius) {
    // Convert radius to solar radii for classification
    const solarRadius = radius / (SCALE.SOLAR_RADIUS * SCALE.VISUAL_MULTIPLIER);
    
    // Main sequence stars
    if (solarRadius < 2) {
        if (temperature < 3500) return 'Red Dwarf';
        if (temperature < 5000) return 'Orange Dwarf';
        if (temperature < 6000) return 'Yellow Dwarf';
        if (temperature < 7500) return 'White Dwarf';
        if (temperature < 10000) return 'Blue-White Dwarf';
        return 'Blue Dwarf';
    }
    
    // Giants and supergiants
    if (solarRadius > 100) {
        if (temperature < 4500) return 'Red Supergiant';
        if (temperature < 6000) return 'Yellow Supergiant';
        return 'Blue Supergiant';
    }
    
    if (solarRadius > 10) {
        if (temperature < 4500) return 'Red Giant';
        if (temperature < 6000) return 'Yellow Giant';
        return 'Blue Giant';
    }
    
    // Regular stars
    if (temperature < 3500) return 'Red Star';
    if (temperature < 5000) return 'Orange Star';
    if (temperature < 6000) return 'Yellow Star';
    if (temperature < 7500) return 'White Star';
    if (temperature < 10000) return 'Blue-White Star';
    return 'Blue Star';
}

// Get descriptive data for celestial objects
export function getObjectData(object) {
    if (!object || !object.userData) return null;

    const baseData = {
        name: object.userData.name || generateRandomName(),
        radius: Math.round((object.geometry.parameters.radius / SCALE.VISUAL_MULTIPLIER) * 149597870.7), // Convert from LY to km
    };

    // Star-specific data
    if (object.userData.type === 'star') {
        const temperature = object.userData.temperature || 5000;
        return {
            ...baseData,
            starType: getStarType(temperature, baseData.radius),
            temperature: Math.round(temperature),
            numPlanets: object.userData.planets?.length || 0,
            color: object.material?.color?.getHex() || 0xffffff
        };
    }

    // Planet-specific data
    if (object.userData.type === 'planet') {
        return {
            ...baseData,
            orbitRadius: object.userData.orbitRadius?.toFixed(2) || 'Unknown',
            numMoons: object.userData.moons?.length || 0,
            color: object.material?.color?.getHex() || 0xffffff
        };
    }

    // Moon-specific data
    if (object.userData.type === 'moon') {
        return {
            ...baseData,
            orbitRadius: object.userData.orbitRadius?.toFixed(2) || 'Unknown',
            color: object.material?.color?.getHex() || 0xffffff
        };
    }

    return baseData;
}

// Helper function to generate random names
function generateRandomName() {
    const syllables = ['zor', 'nax', 'vex', 'tron', 'lux', 'dex', 'pho', 'kro', 'mex', 'thy'];
    const length = Math.floor(Math.random() * 2) + 2; // 2-3 syllables
    let name = '';
    
    for (let i = 0; i < length; i++) {
        name += syllables[Math.floor(Math.random() * syllables.length)];
        // Capitalize first letter if it's the first syllable
        if (i === 0) name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    // Add a random number suffix sometimes
    if (Math.random() > 0.5) {
        name += '-' + Math.floor(Math.random() * 999);
    }
    
    return name;
}
