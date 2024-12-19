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
            moon.orbit.children[0].visible = false;  // Set moon orbits to be invisible by default
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
        
        // Calculate opacity based on distance
        let opacity = 1;
        if (distanceToCamera > CAMERA_CONFIG.FADE_START) {
            opacity = 1 - (distanceToCamera - CAMERA_CONFIG.FADE_START) / 
                        (CAMERA_CONFIG.FADE_END - CAMERA_CONFIG.FADE_START);
            opacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
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
        
        starSystem.planets.forEach(({ planet, orbit, orbitSpeed, moons, orbitLine }) => {
            orbit.rotation.y += orbitSpeed;
            
            // Only check planet visibility if star is visible or nearby
            if (starSystem.star.visible || isNearby) {
                const planetWorldPos = new THREE.Vector3();
                planet.getWorldPosition(planetWorldPos);
                const planetInView = frustum.containsPoint(planetWorldPos);
                const planetDistance = planetWorldPos.distanceTo(cameraPosition);
                const planetNearby = planetDistance <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
                
                planet.visible = planetInView || planetNearby;
                if (planet.visible) {
                    planet.material.opacity = opacity;
                    if (!planet.material.transparent && opacity < 1) {
                        planet.material.transparent = true;
                    }
                }
                
                // Update orbit visibility based on view and opacity
                if (planetInView || planetNearby) {
                    if (getOrbitVisibility() && window.lastSelectedStarSystem === starSystem) {
                        updateOrbitVisibility(starSystem, true);
                        orbitLine.material.opacity = opacity * 0.3;
                    } else {
                        updateOrbitVisibility(starSystem, false);
                    }
                } else {
                    updateOrbitVisibility(starSystem, false);
                }
                
                moons.forEach(({ orbit: moonOrbit, orbitSpeed: moonSpeed }) => {
                    moonOrbit.rotation.y += moonSpeed;
                    
                    if (planetInView || planetNearby) {
                        moonOrbit.children.forEach(child => {
                            if (child instanceof THREE.Mesh) {
                                const moonWorldPos = new THREE.Vector3();
                                child.getWorldPosition(moonWorldPos);
                                const moonInView = frustum.containsPoint(moonWorldPos);
                                const moonDistance = moonWorldPos.distanceTo(cameraPosition);
                                const moonNearby = moonDistance <= CAMERA_CONFIG.ALWAYS_VISIBLE_RANGE;
                                child.visible = moonInView || moonNearby;
                                if (child.visible) {
                                    child.material.opacity = opacity;
                                    if (!child.material.transparent && opacity < 1) {
                                        child.material.transparent = true;
                                    }
                                }
                            }
                        });
                    } else {
                        moonOrbit.children.forEach(child => {
                            child.visible = false;
                        });
                    }
                });
            } else {
                planet.visible = false;
                orbitLine.visible = false;
                moons.forEach(({ orbit: moonOrbit }) => {
                    moonOrbit.children.forEach(child => {
                        child.visible = false;
                    });
                });
            }
        });
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
