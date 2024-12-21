import { camera } from './scene.js';
import * as THREE from 'three';

let crosshairElement = null;

// Create and append CSS styles
export function initializeStyles() {
    const style = document.createElement('style');
    style.textContent = `
        body {
            cursor: url('assets/cursors/cursor-default.png') 10 10, auto;
        }
        .star-hover {
            cursor: url('assets/cursors/cursor-active.png') 10 10, pointer;
        }
        .crosshair {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 2px solid #00ff00;
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1000;
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
}

export function createCrosshair(object, selectedType) {
    removeCrosshair();

    crosshairElement = document.createElement('div');
    crosshairElement.className = 'crosshair';
    
    document.body.appendChild(crosshairElement);
    updateCrosshairPosition(object);
}

export function removeCrosshair() {
    if (crosshairElement) {
        crosshairElement.remove();
        crosshairElement = null;
    }
}

export function updateCrosshairPosition(selectedObject) {
    if (selectedObject && crosshairElement) {
        const vector = new THREE.Vector3();
        selectedObject.getWorldPosition(vector);
        
        // Calculate distance to camera
        const distanceToCamera = vector.distanceTo(camera.position);
        
        // Check if object is behind the camera
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const objectDirection = vector.clone().sub(camera.position).normalize();
        const dotProduct = cameraDirection.dot(objectDirection);
        
        if (dotProduct > 0) {  // Object is in front of camera
            vector.project(camera);
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            // Get object's geometry radius
            const geometry = selectedObject.geometry;
            const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;
            
            // Calculate apparent size based on object's radius and distance
            // Using similar triangles: apparent size = (actual size * viewport height) / distance
            const fov = camera.fov * Math.PI / 180;  // convert to radians
            const apparentSize = (2 * radius * window.innerHeight) / (2 * distanceToCamera * Math.tan(fov / 2));
            
            // Make crosshair slightly larger than the apparent object size, with a minimum of 20px
            const size = Math.max(20, apparentSize * 1.5);
            
            crosshairElement.style.display = 'block';
            crosshairElement.style.width = `${size}px`;
            crosshairElement.style.height = `${size}px`;
            crosshairElement.style.left = `${x}px`;
            crosshairElement.style.top = `${y}px`;
        } else {
            // Hide crosshair when object is behind camera
            crosshairElement.style.display = 'none';
        }
    }
}
