import { camera } from './scene.js';
import * as THREE from 'three';
import { SCALE } from './config.js';
import { getObjectData } from './celestialData.js';

let crosshairElement = null;
let infoPanel = null;

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
        .info-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.8);
            font-family: Arial, sans-serif;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            z-index: 1000;
            display: none;
        }
        .info-panel.visible {
            display: block;
        }
        .info-panel .close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: background 0.2s;
        }
        .info-panel .close-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .info-panel .object-preview {
            width: 100%;
            height: 150px;
            margin-bottom: 15px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .info-panel .object-preview .sphere {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            box-shadow: inset -25px -25px 40px rgba(0,0,0,.5);
            position: relative;
        }
        .info-panel .object-preview .sphere::before {
            content: '';
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: inherit;
            border-radius: 50%;
            filter: blur(10px);
            opacity: 0.7;
            z-index: -1;
        }
        .info-panel .object-preview .sphere::after {
            content: '';
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            background: inherit;
            border-radius: 50%;
            filter: blur(5px);
            opacity: 0.3;
            z-index: -1;
        }
        .info-panel h2 {
            margin: 0 0 10px 0;
            font-size: 1.2em;
            color: #fff;
        }
        .info-panel .data-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #333;
        }
        .info-panel .data-row:last-child {
            border-bottom: none;
        }
        .info-panel .label {
            color: #aaa;
        }
        .info-panel .value {
            color: #fff;
            text-align: right;
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

export function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => {
        if (infoPanel) {
            infoPanel.classList.remove('visible');
        }
    };
    
    infoPanel.appendChild(closeButton);
    document.body.appendChild(infoPanel);
}

export function updateInfoPanel(object) {
    if (!infoPanel) createInfoPanel();
    
    if (!object) {
        infoPanel.classList.remove('visible');
        return;
    }

    const data = getObjectData(object);
    if (!data) return;

    // Convert hex color to CSS format
    const color = new THREE.Color(data.color);
    const colorStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;

    // Create content container if it doesn't exist
    let contentContainer = infoPanel.querySelector('.panel-content');
    if (!contentContainer) {
        contentContainer = document.createElement('div');
        contentContainer.className = 'panel-content';
        infoPanel.appendChild(contentContainer);
    }

    contentContainer.innerHTML = `
        <div class="object-preview">
            <div class="sphere" style="background-color: ${colorStyle}"></div>
        </div>
        <h2>${data.name}</h2>
        ${data.starType ? `
        <div class="data-row">
            <span class="label">Type:</span>
            <span class="value">${data.starType}</span>
        </div>
        <div class="data-row">
            <span class="label">Temperature:</span>
            <span class="value">${data.temperature} K</span>
        </div>
        <div class="data-row">
            <span class="label">Planets:</span>
            <span class="value">${data.numPlanets}</span>
        </div>
        ` : ''}
        ${data.numMoons !== undefined ? `
        <div class="data-row">
            <span class="label">Moons:</span>
            <span class="value">${data.numMoons}</span>
        </div>
        ` : ''}
        <div class="data-row">
            <span class="label">Radius:</span>
            <span class="value">${data.radius.toLocaleString()} km</span>
        </div>
        ${data.orbitRadius ? `
        <div class="data-row">
            <span class="label">Orbit Radius:</span>
            <span class="value">${data.orbitRadius} LY</span>
        </div>
        ` : ''}
    `;
    
    infoPanel.classList.add('visible');
}
