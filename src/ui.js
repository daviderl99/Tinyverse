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
    
    const size = selectedType === 'moon' ? 15 :
                selectedType === 'planet' ? 20 : 25;
    crosshairElement.style.width = `${size}px`;
    crosshairElement.style.height = `${size}px`;
    
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
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        crosshairElement.style.left = `${x}px`;
        crosshairElement.style.top = `${y}px`;
    }
}
