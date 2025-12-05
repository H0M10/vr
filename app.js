// ===== CONFIGURACIÓN DE THREE.JS =====
let scene, camera, renderer, controls;
let trajectoryLine, positionPoint, velocityArrow, accelerationArrow;
let normalArrow, osculatingCircle;
let particles = [];
let isPlaying = true;
let currentT = 6;
const tMin = 6, tMax = 20;
const t0 = 6;

// ===== FUNCIONES MATEMÁTICAS =====
function r(t) {
    return new THREE.Vector3(
        2 * Math.cos(t),
        3 * Math.sin(t),
        t * 0.5
    );
}

function v(t) {
    return new THREE.Vector3(
        -2 * Math.sin(t),
        3 * Math.cos(t),
        0.5
    );
}

function a(t) {
    return new THREE.Vector3(
        -2 * Math.cos(t),
        -3 * Math.sin(t),
        0
    );
}

function calcularCurvatura(t) {
    const vel = v(t);
    const acc = a(t);
    const cross = new THREE.Vector3().crossVectors(vel, acc);
    return cross.length() / Math.pow(vel.length(), 3);
}

function calcularComponentes(t) {
    const vel = v(t);
    const acc = a(t);
    const velNorm = vel.clone().normalize();
    
    const aT_scalar = acc.dot(velNorm);
    const aT_vector = velNorm.clone().multiplyScalar(aT_scalar);
    const aN_vector = acc.clone().sub(aT_vector);
    
    return {
        aT: aT_scalar,
        aT_vec: aT_vector,
        aN: aN_vector.length(),
        aN_vec: aN_vector
    };
}

// ===== INICIALIZACIÓN =====
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(8, 6, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    checkXRSupport();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    createGrid();
    createAxes();
    createTrajectory();
    createPositionPoint();
    createVectorArrows();
    createOsculatingCircle();
    createParticles();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);

    animate();
}

function createGrid() {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -1;
    scene.add(gridHelper);
}

function createAxes() {
    const axes = [
        { points: [[-5, 0, 0], [5, 0, 0]], color: 0xff4444 },
        { points: [[0, -5, 0], [0, 5, 0]], color: 0x44ff44 },
        { points: [[0, 0, -2], [0, 0, 12]], color: 0x4444ff }
    ];
    
    axes.forEach(axis => {
        const geom = new THREE.BufferGeometry().setFromPoints(
            axis.points.map(p => new THREE.Vector3(...p))
        );
        scene.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: axis.color })));
    });
}

function createTrajectory() {
    const points = [];
    for (let t = tMin; t <= tMax; t += 0.1) {
        points.push(r(t));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 200, 0.05, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.8
    });
    scene.add(new THREE.Mesh(tubeGeometry, tubeMaterial));
}

function createPositionPoint() {
    const geometry = new THREE.SphereGeometry(0.15, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffc107 });
    positionPoint = new THREE.Mesh(geometry, material);
    scene.add(positionPoint);

    const glowGeom = new THREE.SphereGeometry(0.25, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0xffc107, 
        transparent: true, 
        opacity: 0.3 
    });
    positionPoint.add(new THREE.Mesh(glowGeom, glowMat));
}

function createVectorArrows() {
    velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        1, 0x2ecc71, 0.2, 0.1
    );
    scene.add(velocityArrow);

    accelerationArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        1, 0xff4757, 0.2, 0.1
    );
    scene.add(accelerationArrow);

    normalArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        1, 0x9b59b6, 0.15, 0.08
    );
    scene.add(normalArrow);
}

function createOsculatingCircle() {
    const geometry = new THREE.RingGeometry(4.5, 4.7, 64);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x9b59b6, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25
    });
    osculatingCircle = new THREE.Mesh(geometry, material);
    scene.add(osculatingCircle);
}

function createParticles() {
    const particleGeom = new THREE.SphereGeometry(0.03, 8, 8);
    
    for (let i = 0; i < 15; i++) {
        const particleMat = new THREE.MeshBasicMaterial({ 
            color: 0x00d9ff,
            transparent: true
        });
        const particle = new THREE.Mesh(particleGeom, particleMat);
        particle.userData.offset = i * 0.1;
        particles.push(particle);
        scene.add(particle);
    }
}

function updateParticles(t) {
    particles.forEach((particle) => {
        const particleT = t - particle.userData.offset;
        if (particleT >= tMin && particleT <= tMax) {
            particle.position.copy(r(particleT));
            particle.material.opacity = Math.max(0, 1 - (particle.userData.offset / 1.8));
            particle.visible = true;
        } else {
            particle.visible = false;
        }
    });
}

function updateOsculatingCircle(t) {
    const pos = r(t);
    const vel = v(t);
    const acc = a(t);
    const kappa = calcularCurvatura(t);
    const radius = Math.min(1 / kappa, 10);
    
    osculatingCircle.geometry.dispose();
    osculatingCircle.geometry = new THREE.RingGeometry(radius - 0.06, radius + 0.06, 64);
    
    const velNorm = vel.clone().normalize();
    const aN_vec = acc.clone().sub(velNorm.clone().multiplyScalar(acc.dot(velNorm)));
    
    if (aN_vec.length() > 0.01) {
        const normal = aN_vec.clone().normalize();
        const center = pos.clone().add(normal.multiplyScalar(radius));
        osculatingCircle.position.copy(center);
        osculatingCircle.lookAt(center.clone().add(vel));
    }
}

function updateVectors(t) {
    const pos = r(t);
    const vel = v(t);
    const acc = a(t);
    const componentes = calcularComponentes(t);

    positionPoint.position.copy(pos);

    const velNorm = vel.clone().normalize();
    const velLength = vel.length() * 0.5;
    velocityArrow.position.copy(pos);
    velocityArrow.setDirection(velNorm);
    velocityArrow.setLength(velLength, velLength * 0.2, velLength * 0.1);

    if (acc.length() > 0.01) {
        const accNorm = acc.clone().normalize();
        const accLength = acc.length() * 0.5;
        accelerationArrow.position.copy(pos);
        accelerationArrow.setDirection(accNorm);
        accelerationArrow.setLength(accLength, accLength * 0.2, accLength * 0.1);
    }

    if (componentes.aN_vec.length() > 0.01) {
        const aNNorm = componentes.aN_vec.clone().normalize();
        const aNLength = componentes.aN * 0.5;
        normalArrow.position.copy(pos);
        normalArrow.setDirection(aNNorm);
        normalArrow.setLength(aNLength, aNLength * 0.2, aNLength * 0.1);
    }

    updateOsculatingCircle(t);
    updateParticles(t);

    const kappa = calcularCurvatura(t);
    const radius = 1 / kappa;
    const speedVal = vel.length();
    const accelVal = acc.length();

    document.getElementById('time-display').textContent = t.toFixed(2);
    document.getElementById('vec-r').textContent = 
        `(${(2*Math.cos(t)).toFixed(2)}, ${(3*Math.sin(t)).toFixed(2)}, ${t.toFixed(2)})`;
    document.getElementById('vec-v').textContent = 
        `(${(-2*Math.sin(t)).toFixed(2)}, ${(3*Math.cos(t)).toFixed(2)}, 1.00)`;
    document.getElementById('vec-a').textContent = 
        `(${(-2*Math.cos(t)).toFixed(2)}, ${(-3*Math.sin(t)).toFixed(2)}, 0.00)`;
    
    document.getElementById('curvature-value').textContent = kappa.toFixed(3);
    document.getElementById('radius-value').textContent = radius.toFixed(2);
    document.getElementById('speed-value').textContent = speedVal.toFixed(2);
    
    document.getElementById('aT-value').textContent = componentes.aT.toFixed(3);
    document.getElementById('aN-value').textContent = componentes.aN.toFixed(3);
    document.getElementById('a-total').textContent = accelVal.toFixed(3);

    const t0Indicator = document.getElementById('t0-indicator');
    if (Math.abs(t - t0) < 0.12) {
        t0Indicator.classList.add('show');
    } else {
        t0Indicator.classList.remove('show');
    }

    const engConclusion = document.getElementById('eng-conclusion');
    if (kappa < 0.25) {
        engConclusion.innerHTML = '✓ Diseño óptimo';
        engConclusion.style.background = 'rgba(46,204,113,0.2)';
        engConclusion.style.color = '#2ecc71';
    } else if (kappa < 0.5) {
        engConclusion.innerHTML = '⚠️ Revisar';
        engConclusion.style.background = 'rgba(255,193,7,0.2)';
        engConclusion.style.color = '#ffc107';
    } else {
        engConclusion.innerHTML = '⚠️ Alto estrés';
        engConclusion.style.background = 'rgba(255,71,87,0.2)';
        engConclusion.style.color = '#ff4757';
    }
}

function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('btn-play');
    btn.textContent = isPlaying ? '⏸️' : '▶️';
    btn.classList.toggle('active', isPlaying);

    const pauseMessage = document.getElementById('pause-message');
    if (!isPlaying) {
        const kappa = calcularCurvatura(currentT);
        const rho = 1 / kappa;
        document.getElementById('pause-time-val').textContent = currentT.toFixed(2);
        document.getElementById('pause-kappa').textContent = kappa.toFixed(3);
        document.getElementById('pause-rho').textContent = rho.toFixed(2);
        pauseMessage.classList.add('show');
    } else {
        pauseMessage.classList.remove('show');
    }
}

function resetSimulation() {
    currentT = tMin;
    isPlaying = true;
    document.getElementById('btn-play').textContent = '⏸️';
    document.getElementById('btn-play').classList.add('active');
    document.getElementById('pause-message').classList.remove('show');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== WEBXR AR =====
let xrSession = null;
let xrRefSpace = null;
let arScale = 0.1;
let arPosition = { x: 0, y: 0, z: -1 };
let touchStartDistance = 0;
let touchStartPos = { x: 0, y: 0 };
let lastTouchPos = { x: 0, y: 0 };

async function checkXRSupport() {
    const arButton = document.getElementById('ar-button');

    if ('xr' in navigator) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                arButton.classList.add('visible');
                arButton.addEventListener('click', toggleAR);
            } else {
                showARMessage('Tu dispositivo no soporta AR');
            }
        } catch (e) {
            console.log('WebXR no disponible:', e);
        }
    } else {
        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
            showARMessage('Abre en Chrome para AR');
        }
    }
}

function showARMessage(msg) {
    const arMessage = document.getElementById('ar-message');
    arMessage.textContent = msg;
    arMessage.classList.add('show');
    setTimeout(() => arMessage.classList.remove('show'), 3000);
}

async function toggleAR() {
    const arButton = document.getElementById('ar-button');

    if (xrSession) {
        await xrSession.end();
        return;
    }

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['dom-overlay', 'hit-test'],
            domOverlay: { root: document.body }
        });

        xrSession.addEventListener('end', onXRSessionEnd);
        
        await renderer.xr.setSession(xrSession);
        
        xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
        
        document.body.classList.add('ar-mode');
        scene.background = null;
        arButton.textContent = '❌ Salir AR';
        arButton.classList.add('active');

        arScale = 0.1;
        arPosition = { x: 0, y: 0, z: -1 };
        scene.scale.set(arScale, arScale, arScale);
        scene.position.set(arPosition.x, arPosition.y, arPosition.z);

        setupARGestures();
        showARMessage('¡AR Activo! Usa gestos para mover');

        setTimeout(() => {
            const hint = document.getElementById('ar-gesture-hint');
            if (hint) hint.style.opacity = '0';
        }, 5000);

    } catch (e) {
        console.error('Error iniciando AR:', e);
        showARMessage('Error al iniciar AR');
    }
}

function setupARGestures() {
    const canvas = renderer.domElement;
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
}

function removeARGestures() {
    const canvas = renderer.domElement;
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
}

function onTouchStart(e) {
    if (!xrSession) return;
    
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        
        touchStartPos.x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartPos.y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
        lastTouchPos.x = e.touches[0].clientX;
        lastTouchPos.y = e.touches[0].clientY;
    }
}

function onTouchMove(e) {
    if (!xrSession) return;
    e.preventDefault();

    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const scaleFactor = distance / touchStartDistance;
        arScale = Math.max(0.03, Math.min(0.3, arScale * scaleFactor));
        scene.scale.set(arScale, arScale, arScale);
        touchStartDistance = distance;

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        const deltaX = (centerX - touchStartPos.x) * 0.002;
        const deltaY = (centerY - touchStartPos.y) * 0.002;
        
        arPosition.x += deltaX;
        arPosition.y -= deltaY;
        scene.position.set(arPosition.x, arPosition.y, arPosition.z);
        
        touchStartPos.x = centerX;
        touchStartPos.y = centerY;

    } else if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - lastTouchPos.x;
        const deltaY = e.touches[0].clientY - lastTouchPos.y;
        
        const rotationSpeed = 0.015;
        scene.rotation.y += deltaX * rotationSpeed;
        scene.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, scene.rotation.x + deltaY * rotationSpeed));
        
        lastTouchPos.x = e.touches[0].clientX;
        lastTouchPos.y = e.touches[0].clientY;
    }
}

function onTouchEnd(e) {
    touchStartDistance = 0;
}

function onXRSessionEnd() {
    xrSession = null;
    const arButton = document.getElementById('ar-button');
    arButton.textContent = '📱 Ver en AR';
    arButton.classList.remove('active');
    
    document.body.classList.remove('ar-mode');
    removeARGestures();
    
    scene.background = new THREE.Color(0x0a0a1a);
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(time, frame) {
    if (isPlaying) {
        currentT += 0.015;
        if (currentT > tMax) currentT = tMin;
        updateVectors(currentT);
    }

    controls.update();
    renderer.render(scene, camera);
}

init();
