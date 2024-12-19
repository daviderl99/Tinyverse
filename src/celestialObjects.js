import * as THREE from 'three';
import { PLANET_ORBIT, MOON_ORBIT } from './config.js';
import { getStarColor, getPlanetColor } from './utils.js';

export function createMoon(planetRadius) {
    const radius = planetRadius * (Math.random() * 0.3 + 0.1);
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    const baseColor = Math.random() * 0.3 + 0.5;
    const color = new THREE.Color(baseColor, baseColor * 0.95, baseColor * 0.8);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const moon = new THREE.Mesh(geometry, material);

    const minOrbit = planetRadius * MOON_ORBIT.MIN_MULTIPLIER;
    const maxOrbit = planetRadius * MOON_ORBIT.MAX_MULTIPLIER;
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
    orbitLine.visible = false;
    orbit.add(orbitLine);

    moon.position.x = orbitRadius * Math.cos(orbitAngle);
    moon.position.z = orbitRadius * Math.sin(orbitAngle);
    orbit.add(moon);

    return { orbit, orbitSpeed };
}

export function createPlanet(starPosition) {
    const radius = Math.random() * 0.1 + 0.05;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    const color = getPlanetColor();
    const material = new THREE.MeshBasicMaterial({ color: color });
    const planet = new THREE.Mesh(geometry, material);

    const minOrbit = PLANET_ORBIT.MIN_RADIUS;
    const maxOrbit = PLANET_ORBIT.MAX_RADIUS;
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
    orbitLine.visible = false;
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
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const temperature = Math.random() * 15000 + 2000; // Temperature between 2000K and 17000K
    const color = getStarColor(temperature);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const star = new THREE.Mesh(geometry, material);

    // Random position within bounds
    star.position.x = (Math.random() - 0.5) * 200;
    star.position.y = (Math.random() - 0.5) * 200;
    star.position.z = (Math.random() - 0.5) * 200;

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
