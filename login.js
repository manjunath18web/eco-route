const canvas = document.getElementById("earthCanvas");
const ctx = canvas.getContext("2d");

let earthImg = new Image();
earthImg.src = "/static/earth.jpeg";

let angle = 0;
let stars = [];
let planets = [];

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createStars() {
    stars = [];
    for (let i = 0; i < 150; i++) { // Increased star count slightly
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.2,
            opacity: Math.random() // For twinkling effect
        });
    }
}

function createPlanets() {
    planets = [];
    for (let i = 0; i < 3; i++) {
        planets.push({
            angle: Math.random() * Math.PI * 2,
            radius: 140 + i * 50,
            size: 4 + Math.random() * 3,
            speed: 0.001 + Math.random() * 0.002
        });
    }
}

createStars();
createPlanets();

function drawStars() {
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        // Twinkle effect
        star.opacity += (Math.random() - 0.5) * 0.05;
        if (star.opacity < 0.1) star.opacity = 0.1;
        if (star.opacity > 1) star.opacity = 1;

        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// --- NEW: Atmospheric Halo Function ---
function drawAtmosphere(x, y, size) {
    ctx.save();
    
    // Outer Glow (The Halo)
    let atmosphere = ctx.createRadialGradient(x, y, size * 0.4, x, y, size * 0.6);
    // Greenish-blue for Eco theme
    atmosphere.addColorStop(0, "rgba(34, 197, 94, 0.2)"); 
    atmosphere.addColorStop(0.5, "rgba(0, 150, 255, 0.1)");
    atmosphere.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim lighting (Atmospheric edge)
    ctx.strokeStyle = "rgba(100, 255, 200, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawEarth() {
    let size = Math.min(canvas.width, canvas.height) * 0.7;
    let x = canvas.width / 2;
    let y = canvas.height / 2;

    // 1. Draw Atmosphere First (behind Earth)
    drawAtmosphere(x, y, size);

    // 2. Draw Earth
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.filter = "brightness(1.1) contrast(1.1)";
    ctx.drawImage(earthImg, -size / 2, -size / 2, size, size);
    ctx.filter = "none";
    ctx.restore();

    // 3. Shadow Overlay (Gives 3D depth)
    let shadow = ctx.createRadialGradient(x - size*0.1, y - size*0.1, size*0.2, x, y, size*0.5);
    shadow.addColorStop(0, "rgba(0,0,0,0)");
    shadow.addColorStop(1, "rgba(0,0,0,0.7)");
    
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlanets() {
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    planets.forEach(p => {
        let x = centerX + Math.cos(p.angle) * p.radius;
        let y = centerY + Math.sin(p.angle) * p.radius * 0.5;

        let gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
        gradient.addColorStop(0, "rgba(34, 197, 94, 1)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();

        p.angle += p.speed;
    });
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStars();
    drawPlanets();
    drawEarth();

    angle += 0.0015; 
    requestAnimationFrame(animate);
}

earthImg.onload = animate;