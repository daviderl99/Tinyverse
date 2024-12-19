import * as THREE from 'three';
import { CONTROLS_CONFIG } from './config.js';
import { camera, mouse, raycaster, scene } from './scene.js';
import { createCrosshair, removeCrosshair, updateCrosshairPosition } from './ui.js';

let selectedObject = null;
let selectedType = null;
let mouseDownPos = null;
let orbitsVisible = false;
let controls;
export let isPaused = false;

export function initializeControls(controlsInstance, starSystemsArray) {
    controls = controlsInstance;
    window.starSystems = starSystemsArray; // Make starSystems available globally
}

export function getOrbitVisibility() {
    return orbitsVisible;
}

export function focusOnObject(object) {
    const targetPosition = new THREE.Vector3();
    object.getWorldPosition(targetPosition);
    
    const distance = selectedType === 'moon' ? CONTROLS_CONFIG.MIN_DISTANCE :
                    selectedType === 'planet' ? CONTROLS_CONFIG.MIN_DISTANCE * 3 : CONTROLS_CONFIG.MIN_DISTANCE * 20;
    
    const startPosition = camera.position.clone();
    const startRotation = controls.target.clone();
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / CONTROLS_CONFIG.ANIMATION_DURATION, 1);
        
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        
        const offset = new THREE.Vector3(distance, distance, distance);
        camera.position.lerpVectors(startPosition, targetPosition.clone().add(offset), t);
        controls.target.lerpVectors(startRotation, targetPosition, t);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }
    
    animateCamera();
}

export function updateOrbitVisibility(starSystem, visible) {
    starSystem.planets.forEach(planet => {
        // Get the orbit line (first child) and planet (second child)
        const orbitLine = planet.orbit.children[0];
        orbitLine.visible = visible;

        // Show/hide moon orbits
        planet.moons.forEach(moon => {
            moon.orbit.children[0].visible = visible;
        });
    });
}

export function onMouseDown(event) {
    mouseDownPos = { x: event.clientX, y: event.clientY };
}

export function onMouseUp(event) {
    if (!mouseDownPos) return;
    
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < CONTROLS_CONFIG.DRAG_THRESHOLD) {
        handleStarClick(event);
    }
    
    mouseDownPos = null;
}

export function handleStarClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Set very tight precision for raycasting
    raycaster.params.Line.threshold = 0.001;
    raycaster.params.Points.threshold = 0.001;
    raycaster.params.Mesh.threshold = 0;
    
    raycaster.setFromCamera(mouse, camera);

    let intersects = [];
    scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
            const intersect = raycaster.intersectObject(object);
            if (intersect.length > 0) {
                intersects.push({
                    distance: intersect[0].distance,
                    object: object
                });
            }
        }
    });

    if (intersects.length > 0) {
        // Sort by distance
        intersects.sort((a, b) => a.distance - b.distance);
        const clickedObject = intersects[0].object;

        // Determine object type
        let type = null;
        let parent = clickedObject;
        while (parent.parent) {
            if (parent.parent === scene) {
                type = 'star';
                break;
            } else if (parent.parent.parent === scene) {
                type = 'planet';
                break;
            } else if (parent.parent.parent.parent === scene) {
                type = 'moon';
                break;
            }
            parent = parent.parent;
        }

        if (selectedObject === clickedObject) {
            // Deselect if clicking the same object
            selectedObject = null;
            selectedType = null;
            removeCrosshair();
        } else {
            // Select new object
            selectedObject = clickedObject;
            selectedType = type;
            createCrosshair(selectedObject, selectedType);
            focusOnObject(selectedObject);
        }
        
        // Find the star system that was clicked
        const starSystem = window.starSystems.find(system => 
            system.star === clickedObject || 
            system.planets.some(planet => planet.mesh === clickedObject)
        );
        
        if (starSystem) {
            window.lastSelectedStarSystem = starSystem;
            
            // Update orbit visibility if orbits are enabled
            if (orbitsVisible) {
                window.starSystems.forEach(sys => {
                    updateOrbitVisibility(sys, false);
                });
                updateOrbitVisibility(starSystem, true);
            }
        }
    } else {
        // Clicked empty space
        selectedObject = null;
        selectedType = null;
        removeCrosshair();
    }
}

export function onKeyPress(event) {
    if (event.key === 'o') {
        orbitsVisible = !orbitsVisible;
        
        // Hide all orbits first
        if (window.starSystems) {
            window.starSystems.forEach(starSystem => {
                updateOrbitVisibility(starSystem, false);
            });
        }
        
        // Show only the last selected star system's orbits if orbits are visible
        if (orbitsVisible && window.lastSelectedStarSystem) {
            updateOrbitVisibility(window.lastSelectedStarSystem, true);
        }
    } else if (event.key === 'f' || event.key === 'F') {
        if (selectedObject) {
            focusOnObject(selectedObject);
        }
    } else if (event.key === ' ') { // Spacebar
        isPaused = !isPaused;
    }
}

export function onMouseMove(event) {
    if (selectedObject) {
        updateCrosshairPosition(selectedObject);
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    let hoveredStar = false;
    scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
            const intersects = raycaster.intersectObject(object);
            if (intersects.length > 0) {
                let parent = object;
                while (parent.parent) {
                    if (parent.parent === scene) {
                        hoveredStar = true;
                        break;
                    }
                    parent = parent.parent;
                }
            }
        }
    });

    document.body.classList.toggle('star-hover', hoveredStar);
}
