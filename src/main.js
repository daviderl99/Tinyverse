import { STAR_COUNT } from './config.js';
import { scene, camera, createRenderer, createControls, handleResize } from './scene.js';
import { initializeStyles } from './ui.js';
import { createStar } from './celestialObjects.js';
import { onMouseDown, onMouseUp, onKeyPress, onMouseMove, updateOrbitVisibility, initializeControls } from './controls.js';

// Initialize scene
const renderer = createRenderer();
const controls = createControls(camera, renderer);

// Initialize UI
initializeStyles();

// Create star systems
const starSystems = [];
for (let i = 0; i < STAR_COUNT; i++) {
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
    
    // Rotate planets and moons
    starSystems.forEach(starSystem => {
        starSystem.planets.forEach(planet => {
            planet.orbit.rotation.y += planet.orbitSpeed;
            
            planet.moons.forEach(moon => {
                moon.orbit.rotation.y += moon.orbitSpeed;
            });
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
