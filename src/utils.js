import * as THREE from 'three';

export function getStarColor(temperature) {
    // Approximate star color based on temperature using simplified blackbody radiation
    let r, g, b;

    if (temperature < 3500) {
        // Red to orange (2000K - 3500K)
        r = 1;
        g = (temperature - 2000) / 1500;
        b = 0;
    } else if (temperature < 5000) {
        // Orange to yellow-white (3500K - 5000K)
        r = 1;
        g = 0.8 + (temperature - 3500) / 7500;
        b = (temperature - 3500) / 1500;  // Increased blue
    } else if (temperature < 6500) {
        // Yellow-white to white (5000K - 6500K)
        r = 1;
        g = 0.9;
        b = 0.9 + (temperature - 5000) / 1500 * 0.3;  // More blue
    } else if (temperature < 8000) {
        // White to blue-white (6500K - 8000K)
        r = 0.9 - (temperature - 6500) / 1500 * 0.4;  // Reduce red faster
        g = 0.9 - (temperature - 6500) / 1500 * 0.5;  // Reduce green faster
        b = 1;
    } else {
        // Blue-white to blue (8000K - 10000K)
        r = 0.5 - (temperature - 8000) / 2000 * 0.3;  // Less red
        g = 0.4 - (temperature - 8000) / 2000 * 0.3;  // Less green
        b = 1;
    }

    // Ensure all values are between 0 and 1
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));

    return new THREE.Color(r, g, b);
}

export function getPlanetColor() {
    const colors = [
        new THREE.Color(0x887766),  // Rocky brown
        new THREE.Color(0x445566),  // Ocean blue
        new THREE.Color(0xAA8855),  // Desert orange
        new THREE.Color(0x557744),  // Forest green
        new THREE.Color(0x996644),  // Red rocky
        new THREE.Color(0x8888AA),  // Icy blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
