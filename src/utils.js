import * as THREE from 'three';

export function getStarColor(temperature) {
    // Approximate star color based on temperature using simplified blackbody radiation
    let r, g, b;

    if (temperature < 3500) {
        // Red to orange
        r = 1;
        g = (temperature - 2000) / 1500;
        b = 0;
    } else if (temperature < 5000) {
        // Orange to yellow-white
        r = 1;
        g = 0.8;
        b = (temperature - 3500) / 1500;
    } else if (temperature < 6500) {
        // Yellow-white to white
        r = 1;
        g = 0.9;
        b = 0.9;
    } else {
        // White to blue-white
        r = Math.max(1 - (temperature - 6500) / 8500, 0.8);
        g = Math.max(1 - (temperature - 6500) / 8500, 0.8);
        b = 1;
    }

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
