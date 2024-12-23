import * as THREE from 'three';
import { CONTROLS_CONFIG } from './config.js';
import { camera, mouse, raycaster, scene } from './scene.js';
import { createCrosshair, removeCrosshair, updateCrosshairPosition, updateInfoPanel } from './ui.js';

let selectedObject = null;
let selectedType = null;
let mouseDownPos = null;
let orbitsVisible = false;
let controls;
export let isPaused = false;
let currentlySelected = null;
let isRightDragging = false;
let cameraOffset = new THREE.Vector3();
let isFollowingObject = false;
let currentDistance = CONTROLS_CONFIG.MIN_DISTANCE * 20;

export function initializeControls(controlsInstance, starSystemsArray) {
    controls = controlsInstance;
    window.starSystems = starSystemsArray;
    
    // Disable right-click context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function getOrbitVisibility() {
    return orbitsVisible;
}

export function focusOnObject(object) {
    const targetPosition = new THREE.Vector3();
    object.getWorldPosition(targetPosition);
    
    // Adjust distance based on object type
    currentDistance = selectedType === 'moon' ? CONTROLS_CONFIG.MIN_DISTANCE :
                     selectedType === 'planet' ? CONTROLS_CONFIG.MIN_DISTANCE * 2 : 
                     CONTROLS_CONFIG.MIN_DISTANCE * 20;
    
    const startPosition = camera.position.clone();
    const startRotation = controls.target.clone();
    const startTime = Date.now();

    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / CONTROLS_CONFIG.ANIMATION_DURATION, 1);
        
        const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        
        // Calculate offset based on camera's current direction
        const offset = camera.position.clone().sub(controls.target).normalize().multiplyScalar(currentDistance);
        camera.position.lerpVectors(startPosition, targetPosition.clone().add(offset), t);
        controls.target.lerpVectors(startRotation, targetPosition, t);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else if (selectedType === 'planet' || selectedType === 'moon') {
            isFollowingObject = true;
            cameraOffset.copy(camera.position).sub(targetPosition);
        }
    }
    
    animateCamera();
}

export function updateSelectedObjectPosition() {
    if (selectedObject && isFollowingObject && !isRightDragging && (selectedType === 'planet' || selectedType === 'moon')) {
        const targetPosition = new THREE.Vector3();
        selectedObject.getWorldPosition(targetPosition);
        
        // Calculate current view direction and maintain it
        const viewDirection = camera.position.clone().sub(controls.target).normalize();
        
        // Update camera and target positions
        controls.target.copy(targetPosition);
        camera.position.copy(targetPosition).add(viewDirection.multiplyScalar(currentDistance));
    }
}

export function updateOrbitVisibility(starSystem, visible) {
    // Only show orbits if globally enabled
    const shouldShow = visible && orbitsVisible;

    starSystem.star.userData.planets.forEach(planet => {
        const planetObj = planet.parent; // Get the orbit object
        
        // Update orbit line visibility
        planetObj.children.forEach(child => {
            if (child instanceof THREE.Line) {
                child.visible = shouldShow;
            }
        });

        // Show/hide moon orbits
        planet.userData.moons?.forEach(moon => {
            const moonOrbit = moon.parent;
            moonOrbit.children.forEach(child => {
                if (child instanceof THREE.Line) {
                    child.visible = shouldShow;
                }
            });
        });
    });
}

export function onMouseDown(event) {
    mouseDownPos = { x: event.clientX, y: event.clientY };
    if (event.button === 2) { // Right mouse button
        isRightDragging = true;
        isFollowingObject = false; // Stop following object when right-dragging
    }
}

export function onMouseUp(event) {
    if (event.button === 2) { // Right mouse button
        isRightDragging = false;
        // Don't resume following - stay in free camera mode
    }
    
    // Only handle left clicks for selection
    if (event.button !== 0) return;
    
    const movementThreshold = 5;
    if (mouseDownPos && 
        Math.abs(event.clientX - mouseDownPos.x) < movementThreshold && 
        Math.abs(event.clientY - mouseDownPos.y) < movementThreshold) {
        handleStarClick(event);
    }
    mouseDownPos = null;
}

export function handleStarClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Set extremely tight precision for raycasting
    raycaster.params.Line.threshold = 0.0001;
    raycaster.params.Points.threshold = 0.0001;
    raycaster.params.Mesh.threshold = 0;
    
    // Get all intersections, not just the first one
    raycaster.setFromCamera(mouse, camera);
    let intersects = [];
    scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
            const intersection = raycaster.intersectObject(object, false);
            if (intersection.length > 0) {
                intersects.push(...intersection);
            }
        }
    });

    // Sort by distance
    intersects.sort((a, b) => a.distance - b.distance);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        let objectType = clickedObject.userData.type;

        // If we clicked a planet or moon, find its star system
        let starSystem = null;
        if (objectType) {
            if (objectType === 'star') {
                starSystem = window.starSystems.find(sys => sys.star === clickedObject);
            } else if (objectType === 'planet') {
                starSystem = window.starSystems.find(sys => 
                    sys.star.userData.planets.some(planet => planet === clickedObject)
                );
            } else if (objectType === 'moon') {
                starSystem = window.starSystems.find(sys => 
                    sys.star.userData.planets.some(planet => 
                        planet.userData.moons?.some(moon => moon === clickedObject)
                    )
                );
            }
        }

        if (starSystem) {
            // Check if we're clicking the same object that's already selected
            const isClickingSelectedObject = selectedObject === clickedObject;

            // Hide orbits of previously selected system
            if (window.lastSelectedStarSystem && window.lastSelectedStarSystem !== starSystem) {
                updateOrbitVisibility(window.lastSelectedStarSystem, false);
            }

            // Show orbits of newly selected system
            if (window.lastSelectedStarSystem !== starSystem) {
                updateOrbitVisibility(starSystem, true);
                window.lastSelectedStarSystem = starSystem;
            }

            // If clicking already selected object, focus camera
            if (isClickingSelectedObject) {
                focusOnObject(clickedObject);
            } else {
                // First click - just select the object
                selectedObject = clickedObject;
                selectedType = objectType;
                createCrosshair(clickedObject, objectType);
                updateInfoPanel(clickedObject);
            }
        }
    } else {
        // Clicked empty space
        if (window.lastSelectedStarSystem) {
            updateOrbitVisibility(window.lastSelectedStarSystem, false);
            window.lastSelectedStarSystem = null;
        }
        selectedObject = null;
        selectedType = null;
        removeCrosshair();
        updateInfoPanel(null);
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

let pendingMouseMove = false;
let lastMouseEvent = null;

function handleMouseMoveFrame() {
    if (!lastMouseEvent) return;

    if (selectedObject) {
        updateCrosshairPosition(selectedObject);
    }

    mouse.x = (lastMouseEvent.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(lastMouseEvent.clientY / window.innerHeight) * 2 + 1;

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
    
    pendingMouseMove = false;
    lastMouseEvent = null;
}

export function onMouseMove(event) {
    lastMouseEvent = event;
    
    if (!pendingMouseMove) {
        pendingMouseMove = true;
        requestAnimationFrame(handleMouseMoveFrame);
    }
}

export function getSelectedObject() {
    return selectedObject;
}

export function onWheel(event) {
    if (selectedObject && (selectedType === 'planet' || selectedType === 'moon')) {
        // Adjust zoom speed based on current distance
        const zoomSpeed = currentDistance * 0.1;
        currentDistance += event.deltaY * 0.01 * zoomSpeed;
        
        // Clamp distance to reasonable limits
        const minDist = selectedType === 'moon' ? CONTROLS_CONFIG.MIN_DISTANCE * 0.2 :
                       selectedType === 'planet' ? CONTROLS_CONFIG.MIN_DISTANCE * 0.5 :
                       CONTROLS_CONFIG.MIN_DISTANCE * 2;
        const maxDist = CONTROLS_CONFIG.MIN_DISTANCE * 100;
        currentDistance = Math.max(minDist, Math.min(maxDist, currentDistance));
    }
}
