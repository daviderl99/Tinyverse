import * as THREE from 'three';
import { STAR_CONFIG, PLANET_CONFIG, MOON_CONFIG } from './config.js';
import { getStarColor, getPlanetColor } from './utils.js';

// Helper function to check distance between stars
function getDistanceToNearestStar(position, existingStars) {
    let minDistance = Infinity;
    for (const star of existingStars) {
        const distance = position.distanceTo(star.position);
        if (distance < minDistance) {
            minDistance = distance;
        }
    }
    return minDistance;
}

// Helper function for Gaussian distribution
function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

export function createMoon(planetRadius) {
    const radius = planetRadius * (Math.random() * (MOON_CONFIG.MAX_SIZE_RATIO - MOON_CONFIG.MIN_SIZE_RATIO) + MOON_CONFIG.MIN_SIZE_RATIO);
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    const baseColor = Math.random() * 0.3 + 0.5;
    const color = new THREE.Color(baseColor, baseColor * 0.95, baseColor * 0.8);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const moon = new THREE.Mesh(geometry, material);

    const minOrbit = planetRadius * MOON_CONFIG.MIN_ORBIT_RATIO;
    const maxOrbit = planetRadius * MOON_CONFIG.MAX_ORBIT_RATIO;
    const orbitRadius = Math.random() * (maxOrbit - minOrbit) + minOrbit;
    
    const orbitSpeed = (0.005 / Math.sqrt(orbitRadius)) + 0.001;
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitTilt = Math.random() * Math.PI / 4;
    
    const orbit = new THREE.Object3D();
    orbit.rotation.x = orbitTilt;
    orbit.rotation.y = Math.random() * Math.PI * 2;

    const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        orbitRadius, orbitRadius,
        0, 2 * Math.PI,
        false,
        0
    );
    const orbitPoints = orbitCurve.getPoints(50);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitLine = new THREE.Line(
        orbitGeometry,
        new THREE.LineBasicMaterial({ 
            color: 0x444444, 
            transparent: true, 
            opacity: 0.3 
        })
    );
    orbit.add(orbitLine);

    moon.position.x = orbitRadius * Math.cos(orbitAngle);
    moon.position.z = orbitRadius * Math.sin(orbitAngle);
    orbit.add(moon);

    return { orbit, orbitSpeed };
}

export function createPlanet(starPosition) {
    const radius = Math.random() * (PLANET_CONFIG.MAX_RADIUS - PLANET_CONFIG.MIN_RADIUS) + PLANET_CONFIG.MIN_RADIUS;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    const color = getPlanetColor();
    const material = new THREE.MeshBasicMaterial({ color: color });
    const planet = new THREE.Mesh(geometry, material);

    const minOrbit = PLANET_CONFIG.MIN_ORBIT;
    const maxOrbit = PLANET_CONFIG.MAX_ORBIT;
    const orbitRadius = Math.random() * (maxOrbit - minOrbit) + minOrbit;
    
    const orbitSpeed = (0.002 / Math.sqrt(orbitRadius)) + 0.0002;
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitTilt = Math.random() * Math.PI / 6;
    
    const orbit = new THREE.Object3D();
    orbit.rotation.x = orbitTilt;
    orbit.position.copy(starPosition);

    // Create visible orbit line
    const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        orbitRadius, orbitRadius,
        0, 2 * Math.PI,
        false,
        0
    );
    const orbitPoints = orbitCurve.getPoints(50);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
        orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitLine = new THREE.Line(
        orbitGeometry,
        new THREE.LineBasicMaterial({ 
            color: 0x444444, 
            transparent: true, 
            opacity: 0.3 
        })
    );
    orbit.add(orbitLine);

    // Position planet in orbit
    planet.position.x = orbitRadius * Math.cos(orbitAngle);
    planet.position.z = orbitRadius * Math.sin(orbitAngle);
    orbit.add(planet);

    // Add random number of moons (0-3)
    const moonCount = Math.floor(Math.random() * 4);
    const moons = [];
    for (let i = 0; i < moonCount; i++) {
        const moon = createMoon(radius);
        orbit.add(moon.orbit);
        moons.push(moon);
    }

    return { 
        planet,
        orbit,
        orbitSpeed,
        moons,
        orbitLine
    };
}

export function createStar() {
    const radius = Math.random() * (STAR_CONFIG.MAX_RADIUS - STAR_CONFIG.MIN_RADIUS) + STAR_CONFIG.MIN_RADIUS;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const temperature = Math.random() * (STAR_CONFIG.MAX_TEMP - STAR_CONFIG.MIN_TEMP) + STAR_CONFIG.MIN_TEMP;
    const color = getStarColor(temperature);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const star = new THREE.Mesh(geometry, material);

    // Use Gaussian distribution for more realistic star clustering
    const range = STAR_CONFIG.SPACE_RANGE;
    let position = new THREE.Vector3();
    let attempts = 0;
    const maxAttempts = 50;

    do {
        // Use Gaussian distribution for each coordinate
        position.set(
            gaussianRandom(0, range / 4),
            gaussianRandom(0, range / 6), // Less vertical spread
            gaussianRandom(0, range / 4)
        );

        // Add some randomness to create occasional outliers
        if (Math.random() < 0.1) { // 10% chance for outliers
            position.multiplyScalar(Math.random() * 2 + 1);
        }

        attempts++;
    } while (
        window.existingStars && 
        getDistanceToNearestStar(position, window.existingStars) < STAR_CONFIG.MIN_DISTANCE && 
        attempts < maxAttempts
    );

    star.position.copy(position);

    // Store the star's position for future distance checks
    if (!window.existingStars) window.existingStars = [];
    window.existingStars.push(star);

    // Create random number of planets (1-5)
    const planetCount = Math.floor(Math.random() * 5) + 1;
    const planets = [];
    for (let i = 0; i < planetCount; i++) {
        const planet = createPlanet(star.position);
        planets.push(planet);
    }

    return {
        star,
        planets
    };
}
