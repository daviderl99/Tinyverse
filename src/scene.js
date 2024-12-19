import * as THREE from 'three';
import { OrbitControls } from 'three/controls';
import { CAMERA_CONFIG } from './config.js';

// Scene setup
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_CONFIG.NEAR,
    CAMERA_CONFIG.FAR
);
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

// Initialize camera
camera.position.z = CAMERA_CONFIG.INITIAL_Z;

// Create renderer
export function createRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    return renderer;
}

// Create controls
export function createControls(camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    return controls;
}

// Handle window resize
export function handleResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
