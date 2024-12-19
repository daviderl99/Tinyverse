import * as THREE from 'three';
import { ANIMATION_DURATION, DRAG_THRESHOLD } from './config.js';
import { camera, mouse, raycaster, scene } from './scene.js';
import { createCrosshair, removeCrosshair, updateCrosshairPosition } from './ui.js';

let selectedObject = null;
let selectedType = null;
let mouseDownPos = null;
let orbitsVisible = false;
let controls;

export function initializeControls(controlsInstance, starSystemsArray) {
    controls = controlsInstance;
    window.starSystems = starSystemsArray; // Make starSystems available globally
}

export function focusOnObject(object) {
    const targetPosition = new THREE.Vector3();
    object.getWorldPosition(targetPosition);
    
    const distance = selectedType === 'moon' ? 1 :
                    selectedType === 'planet' ? 3 : 20;
    
    const startPosition = camera.position.clone();
    const startRotation = controls.target.clone();
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        
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
        planet.orbitLine.visible = visible;
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
    
    if (distance < DRAG_THRESHOLD) {
        handleStarClick(event);
    }
    
    mouseDownPos = null;
}

export function handleStarClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

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
        const closestObject = intersects[0].object;

        // Determine object type
        let type = null;
        let parent = closestObject;
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

        if (selectedObject === closestObject) {
            // Deselect if clicking the same object
            selectedObject = null;
            selectedType = null;
            removeCrosshair();
        } else {
            // Select new object
            selectedObject = closestObject;
            selectedType = type;
            createCrosshair(selectedObject, selectedType);
            focusOnObject(selectedObject);
        }
    } else {
        // Clicked empty space
        selectedObject = null;
        selectedType = null;
        removeCrosshair();
    }
}

export function onKeyPress(event) {
    if (event.key === 'o' || event.key === 'O') {
        orbitsVisible = !orbitsVisible;
        starSystems.forEach(system => {
            updateOrbitVisibility(system, orbitsVisible);
        });
    } else if (event.key === 'f' || event.key === 'F') {
        if (selectedObject) {
            focusOnObject(selectedObject);
        }
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
