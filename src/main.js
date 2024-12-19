import * as THREE from 'three';
import { STAR_CONFIG, CAMERA_CONFIG } from './config.js';
import { scene, camera, createRenderer, createControls, handleResize } from './scene.js';
import { initializeStyles } from './ui.js';
import { createStar } from './celestialObjects.js';
import { onMouseDown, onMouseUp, onKeyPress, onMouseMove, updateOrbitVisibility, initializeControls, getOrbitVisibility } from './controls.js';

// Initialize scene
const renderer = createRenderer();
const controls = createControls(camera, renderer);

// Initialize UI
initializeStyles();

// Track orbit visibility state and last selected star system
window.lastSelectedStarSystem = null;

// Create star systems
const starSystems = [];
for (let i = 0; i < STAR_CONFIG.COUNT; i++) {
    const starSystem = createStar();
    starSystems.push(starSystem);
    scene.add(starSystem.star);
    starSystem.planets.forEach(planet => {
        scene.add(planet.orbit);
        // Set initial orbit visibility
        planet.orbitLine.visible = false;
        planet.orbitLine.material.opacity = 0.3; // Keep orbit lines slightly transparent
        planet.moons.forEach(moon => {
            moon.orbit.children.forEach(child => {
                if (child instanceof THREE.Line) {
                    child.visible = false;  // Hide moon orbit lines
                } else if (child instanceof THREE.Mesh) {
                    child.visible = true;   // Show moon meshes
                }
            });
        });
    });
}

// Make starSystems globally available
window.starSystems = starSystems;

// Initialize controls with required dependencies
initializeControls(controls, starSystems);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update frustum for culling
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    // Get camera position for distance calculations
    const cameraPosition = camera.position;
    
    // Rotate planets and moons, and handle visibility
    starSystems.forEach(starSystem => {
        // Check if star is in view and within distance range
        const starWorldPos = new THREE.Vector3();
        starSystem.star.getWorldPosition(starWorldPos);
        
        const distanceToCamera = starWorldPos.distanceTo(cameraPosition);
        const starInView = frustum.containsPoint(starWorldPos);
        const isNearby = distanceToCamera <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
        const isPlanetRange = distanceToCamera <= CAMERA_CONFIG.PLANET_VISIBLE_RANGE;
        
        // Calculate opacity based on distance
        let opacity = 1;
        if (distanceToCamera > CAMERA_CONFIG.FADE_START) {
            opacity = 1 - (distanceToCamera - CAMERA_CONFIG.FADE_START) / 
                        (CAMERA_CONFIG.FADE_END - CAMERA_CONFIG.FADE_START);
            opacity = Math.max(0, Math.min(1, opacity));
        }
        
        // Update star visibility and opacity
        if ((starInView || isNearby) && distanceToCamera < CAMERA_CONFIG.FADE_END) {
            starSystem.star.visible = true;
            starSystem.star.material.opacity = opacity;
            if (!starSystem.star.material.transparent && opacity < 1) {
                starSystem.star.material.transparent = true;
            }
        } else {
            starSystem.star.visible = false;
        }
        
        // Only process planets if they should be visible
        if (isPlanetRange && starSystem.planets.length > 0) {
            starSystem.planets.forEach(({ planet, orbit, orbitSpeed, moons, orbitLine }) => {
                orbit.rotation.y += orbitSpeed;
                
                if (starSystem.star.visible || isNearby) {
                    const planetWorldPos = new THREE.Vector3();
                    planet.getWorldPosition(planetWorldPos);
                    const planetInView = frustum.containsPoint(planetWorldPos);
                    const planetDistance = planetWorldPos.distanceTo(cameraPosition);
                    const planetNearby = planetDistance <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
                    
                    orbit.visible = true;
                    planet.visible = planetInView || planetNearby;
                    if (planet.visible) {
                        planet.material.opacity = opacity;
                        if (!planet.material.transparent && opacity < 1) {
                            planet.material.transparent = true;
                        }
                    }
                    
                    // Update orbit visibility
                    if (planetInView || planetNearby) {
                        if (getOrbitVisibility() && window.lastSelectedStarSystem === starSystem) {
                            orbitLine.visible = true;
                            orbitLine.material.opacity = opacity * 0.3;
                        } else {
                            orbitLine.visible = false;
                        }
                    } else {
                        orbitLine.visible = false;
                    }
                    
                    // Update moons only if planet is visible
                    if (planet.visible) {
                        moons.forEach(({ orbit: moonOrbit, orbitSpeed: moonSpeed }) => {
                            moonOrbit.rotation.y += moonSpeed;
                            moonOrbit.visible = true;
                        });
                    } else {
                        moons.forEach(({ orbit: moonOrbit }) => {
                            moonOrbit.visible = false;
                        });
                    }
                } else {
                    orbit.visible = false;
                }
            });
        } else if (starSystem.planets.length > 0) {
            // Hide all planets and moons if star is too far
            starSystem.planets.forEach(({ orbit }) => {
                orbit.visible = false;
            });
        }
    });
    
    renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('keypress', onKeyPress);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('resize', () => handleResize(camera, renderer));

// Start animation
animate();
