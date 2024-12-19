import * as THREE from 'three';
import { STAR_CONFIG, PLANET_CONFIG, MOON_CONFIG, CAMERA_CONFIG } from './config.js';
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
    
    const orbitSpeed = MOON_CONFIG.ORBIT_SPEED_FACTOR / Math.sqrt(orbitRadius);
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitTilt = Math.random() * Math.PI / 3; // More varied tilt
    
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
            color: 0x666666, 
            transparent: true, 
            opacity: 0.5 
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
            color: 0x666666, 
            transparent: true, 
            opacity: 0.5 
        })
    );
    orbit.add(orbitLine);

    // Position planet in orbit
    planet.position.x = orbitRadius * Math.cos(orbitAngle);
    planet.position.z = orbitRadius * Math.sin(orbitAngle);
    orbit.add(planet);

    // Add random number of moons based on config
    const moonCount = Math.floor(Math.random() * (MOON_CONFIG.MAX_MOONS - MOON_CONFIG.MIN_MOONS + 1)) + MOON_CONFIG.MIN_MOONS;
    const moons = [];
    
    // Create moons with non-overlapping orbits
    const usedOrbits = [];
    for (let i = 0; i < moonCount; i++) {
        let moon = createMoon(radius);  
        let attempts = 0;
        const maxAttempts = 10;
        
        // Ensure moons don't share similar orbits
        while (attempts < maxAttempts && 
               usedOrbits.some(usedOrbit => Math.abs(moon.orbit.children[1].position.x - usedOrbit) < radius * 3)) {
            moon = createMoon(radius);
            attempts++;
        }
        
        if (attempts < maxAttempts) {
            usedOrbits.push(moon.orbit.children[1].position.x);
            planet.add(moon.orbit);  
            moons.push(moon);
        }
    }

    return { 
        planet,
        orbit,
        orbitSpeed,
        moons,
        orbitLine
    };
}

// Add glow shader
const vertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec3 vNormal;
    uniform vec3 glowColor;
    uniform float intensity;
    void main() {
        float strength = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, strength * intensity);
    }
`;

export function createStar() {
    const radius = Math.random() * (STAR_CONFIG.MAX_RADIUS - STAR_CONFIG.MIN_RADIUS) + STAR_CONFIG.MIN_RADIUS;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const temperature = Math.random() * (STAR_CONFIG.MAX_TEMP - STAR_CONFIG.MIN_TEMP) + STAR_CONFIG.MIN_TEMP;
    const color = getStarColor(temperature);
    
    // Create the main star material
    const material = new THREE.MeshBasicMaterial({ color: color });
    const star = new THREE.Mesh(geometry, material);

    // Create the glow effect
    const glowGeometry = new THREE.SphereGeometry(radius * 1.2, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(color) },
            intensity: { value: 1.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    star.add(glowMesh);

    // Use Gaussian distribution for more realistic star clustering
    const range = STAR_CONFIG.SPACE_RANGE;
    let position = new THREE.Vector3();
    let attempts = 0;
    const maxAttempts = 50;

    do {
        // Generate position within the space range
        position.set(
            (Math.random() - 0.5) * STAR_CONFIG.SPACE_RANGE,
            (Math.random() - 0.5) * STAR_CONFIG.SPACE_RANGE,
            (Math.random() - 0.5) * STAR_CONFIG.SPACE_RANGE
        );

        attempts++;
    } while (
        window.existingStars && 
        getDistanceToNearestStar(position, window.existingStars) < STAR_CONFIG.MIN_DISTANCE && 
        attempts < maxAttempts
    );

    star.position.copy(position);

    if (!window.existingStars) window.existingStars = [];
    window.existingStars.push(star);

    const distanceFromCenter = position.length();
    const planets = [];
    
    if (Math.random() < STAR_CONFIG.HAS_PLANETS_CHANCE) {
        const planetCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < planetCount; i++) {
            const planet = createPlanet(star.position);
            planets.push(planet);
        }
    }

    return {
        star,
        planets,
        distanceFromCenter
    };
}
