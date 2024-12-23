import * as THREE from 'three';
import { STAR_CONFIG, CAMERA_CONFIG } from './config.js';
import { scene, camera, createRenderer, createControls, handleResize } from './scene.js';
import { initializeStyles, updateCrosshairPosition } from './ui.js';
import { createStar } from './celestialObjects.js';
import { onMouseDown, onMouseUp, onKeyPress, onMouseMove, onWheel, updateOrbitVisibility, initializeControls, getOrbitVisibility, isPaused, getSelectedObject, updateSelectedObjectPosition } from './controls.js';

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
    
    // Add planets from the star's userData
    starSystem.star.userData.planets.forEach(planet => {
        const planetObj = planet.parent; // Get the orbit object
        scene.add(planetObj);
        
        // Find and set orbit line visibility
        planetObj.children.forEach(child => {
            if (child instanceof THREE.Line) {
                child.visible = false;
                child.material.opacity = 0.3;
            }
        });
        
        // Set moon orbit visibility
        planet.userData.moons?.forEach(moon => {
            const moonOrbit = moon.parent;
            moonOrbit.children.forEach(child => {
                if (child instanceof THREE.Line) {
                    child.visible = false;
                } else if (child instanceof THREE.Mesh) {
                    child.visible = true;
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
    
    // Update selected object tracking
    updateSelectedObjectPosition();
    
    // Update crosshair position if there's a selected object
    const selectedObject = getSelectedObject();
    if (selectedObject) {
        updateCrosshairPosition(selectedObject);
    }
    
    // Skip updates if paused
    // if (isPaused) return;

    // Update frustum for culling
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    // Get camera position for distance calculations
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    // Track closest stars for light management
    const closestStars = [];
    
    // Rotate planets and moons, and handle visibility
    starSystems.forEach(starSystem => {
        // Check if star is in view and within distance range
        const starPosition = new THREE.Vector3();
        starSystem.star.getWorldPosition(starPosition);
        const distanceToCamera = starPosition.distanceTo(cameraPosition);
        
        // Calculate visibility and opacity
        const starInView = frustum.containsPoint(starPosition);
        const isNearby = distanceToCamera <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
        const isPlanetRange = distanceToCamera <= CAMERA_CONFIG.PLANET_VISIBLE_RANGE;
        
        // Track closest stars for lighting
        if (distanceToCamera <= STAR_CONFIG.LIGHT_DISTANCE) {
            closestStars.push({ star: starSystem.star, distance: distanceToCamera });
        }
        
        let opacity = 1;
        if (distanceToCamera > CAMERA_CONFIG.FADE_START) {
            opacity = 1 - (distanceToCamera - CAMERA_CONFIG.FADE_START) / (CAMERA_CONFIG.FADE_END - CAMERA_CONFIG.FADE_START);
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
        if (isPlanetRange && starSystem.star.userData.planets.length > 0) {
            starSystem.star.userData.planets.forEach(planet => {
                const planetObj = planet.parent; // Get the orbit object
                
                // Only update orbital motion if not paused
                if (!isPaused) {
                    planetObj.rotation.y += planet.userData.orbitSpeed;
                }
                
                if (starSystem.star.visible || isNearby) {
                    const planetWorldPos = new THREE.Vector3();
                    planet.getWorldPosition(planetWorldPos);
                    const planetInView = frustum.containsPoint(planetWorldPos);
                    const planetDistance = planetWorldPos.distanceTo(cameraPosition);
                    const planetNearby = planetDistance <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
                    
                    planetObj.visible = true;
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
                            planetObj.children.forEach(child => {
                                if (child instanceof THREE.Line) {
                                    child.visible = true;
                                    child.material.opacity = opacity * 0.3;
                                }
                            });
                        } else {
                            planetObj.children.forEach(child => {
                                if (child instanceof THREE.Line) {
                                    child.visible = false;
                                }
                            });
                        }
                    } else {
                        planetObj.children.forEach(child => {
                            if (child instanceof THREE.Line) {
                                child.visible = false;
                            }
                        });
                    }
                    
                    // Update moons only if planet is visible
                    if (planet.visible) {
                        planet.userData.moons?.forEach(moon => {
                            const moonOrbit = moon.parent;
                            // Only update orbital motion if not paused
                            if (!isPaused) {
                                moonOrbit.rotation.y += moon.userData.orbitSpeed;
                            }
                            moonOrbit.visible = true;
                        });
                    } else {
                        planet.userData.moons?.forEach(moon => {
                            const moonOrbit = moon.parent;
                            moonOrbit.visible = false;
                        });
                    }
                } else {
                    planetObj.visible = false;
                }
            });
        } else if (starSystem.star.userData.planets.length > 0) {
            // Hide all planets and moons if star is too far
            starSystem.star.userData.planets.forEach(planet => {
                const planetObj = planet.parent; // Get the orbit object
                planetObj.visible = false;
            });
        }
    });

    // Manage active lights
    closestStars.sort((a, b) => a.distance - b.distance);
    const activeStars = closestStars.slice(0, STAR_CONFIG.MAX_ACTIVE_LIGHTS);
    
    // Update light visibility
    starSystems.forEach(starSystem => {
        const isActive = activeStars.some(active => active.star === starSystem.star);
        if (starSystem.star.light) {
            starSystem.star.light.visible = isActive;
        }
    });
    
    renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('keypress', onKeyPress);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('wheel', onWheel);
window.addEventListener('resize', () => handleResize(camera, renderer));

// Start animation
animate();
