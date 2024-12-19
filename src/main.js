import * as THREE from 'three';
import { STAR_CONFIG, CAMERA_CONFIG } from './config.js';
import { scene, camera, createRenderer, createControls, handleResize } from './scene.js';
import { initializeStyles } from './ui.js';
import { createStar } from './celestialObjects.js';
import { onMouseDown, onMouseUp, onKeyPress, onMouseMove, updateOrbitVisibility, initializeControls } from './controls.js';

// Initialize scene
const renderer = createRenderer();
const controls = createControls(camera, renderer);

// Initialize UI
initializeStyles();

// Track orbit visibility state
let orbitsVisible = true;

// Create star systems
const starSystems = [];
for (let i = 0; i < STAR_CONFIG.COUNT; i++) {
    const starSystem = createStar();
    starSystems.push(starSystem);
    scene.add(starSystem.star);
    starSystem.planets.forEach(planet => {
        scene.add(planet.orbit);
    });
}

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
        
        // Calculate opacity based on distance
        let opacity = 1;
        if (distanceToCamera > CAMERA_CONFIG.FADE_START) {
            opacity = 1 - (distanceToCamera - CAMERA_CONFIG.FADE_START) / 
                        (CAMERA_CONFIG.FADE_END - CAMERA_CONFIG.FADE_START);
            opacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
        }
        
        // Update star visibility and opacity
        if (starInView && distanceToCamera < CAMERA_CONFIG.FADE_END) {
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
            
            // Only check planet visibility if star is visible
            if (starSystem.star.visible) {
                const planetWorldPos = new THREE.Vector3();
                planet.getWorldPosition(planetWorldPos);
                const planetInView = frustum.containsPoint(planetWorldPos);
                
                planet.visible = planetInView;
                if (planet.visible) {
                    planet.material.opacity = opacity;
                    if (!planet.material.transparent && opacity < 1) {
                        planet.material.transparent = true;
                    }
                }
                
                orbitLine.visible = planetInView && orbitsVisible;
                if (orbitLine.visible) {
                    orbitLine.material.opacity = opacity * 0.3; // Keep orbit lines slightly transparent
                }
                
                moons.forEach(({ orbit: moonOrbit, orbitSpeed: moonSpeed }) => {
                    moonOrbit.rotation.y += moonSpeed;
                    
                    if (planetInView) {
                        moonOrbit.children.forEach(child => {
                            if (child instanceof THREE.Mesh) {
                                const moonWorldPos = new THREE.Vector3();
                                child.getWorldPosition(moonWorldPos);
                                const moonInView = frustum.containsPoint(moonWorldPos);
                                child.visible = moonInView;
                                if (child.visible) {
                                    child.material.opacity = opacity;
                                    if (!child.material.transparent && opacity < 1) {
                                        child.material.transparent = true;
                                    }
                                }
                            } else if (child instanceof THREE.Line) {
                                child.visible = planetInView && orbitsVisible;
                                if (child.visible) {
                                    child.material.opacity = opacity * 0.3;
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
