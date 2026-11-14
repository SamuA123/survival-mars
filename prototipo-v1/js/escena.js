// =====================================================================
//  ESCENA: dibuja la base marciana en un <canvas> y la anima.
//  Lee el estado del juego en cada cuadro (no modifica nada).
// =====================================================================

const Escena = (() => {
  const W = 800, H = 360, SUELO = 268;
  let ctx, getEstado, t = 0, flash = 0, sacudida = 0;
  const polvo = [];

  function init(canvas, getter) {
    ctx = canvas.getContext('2d');
    getEstado = getter;
    for (let i = 0; i < 200; i++) polvo.push({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 5, r: 1 + Math.random() * 2.5 });
    requestAnimationFrame(loop);
  }

  const destello = () => { flash = 1; };
  const sacudir = () => { sacudida = 1; };

  function loop() {
    t += 1 / 60;
    dibujar();
    flash = Math.max(0, flash - 0.012);
    sacudida = Math.max(0, sacudida - 0.02);
    requestAnimationFrame(loop);
  }

  const DEF = { polvo: false, paneles: true, eficiencia: 1, niveles: { vital: 2, invernadero: 2, calor: 2, radio: 1 }, blindaje: 0, invSalud: 1, energia: true, eva: false, refugio: false };

  function dibujar() {
    const e = getEstado() || DEF;
    ctx.save();
    if (sacudida > 0) ctx.translate((Math.random() - 0.5) * 12 * sacudida, (Math.random() - 0.5) * 8 * sacudida);

    // --- Cielo marciano (color caramelo; más oscuro en tormenta) ---
    const g = ctx.createLinearGradient(0, 0, 0, SUELO);
    if (e.polvo) { g.addColorStop(0, '#5e3a24'); g.addColorStop(1, '#9a6a45'); }
    else { g.addColorStop(0, '#b98663'); g.addColorStop(1, '#ecc9a4'); }
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, SUELO + 20);

    // Fobos y Deimos, las dos lunas de Marte
    if (!e.polvo) {
      ctx.fillStyle = 'rgba(120,100,90,0.55)';
      ctx.beginPath(); ctx.ellipse(150, 60, 7, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(250, 40, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,40,30,0.55)'; ctx.font = '11px Nunito, sans-serif';
      ctx.fillText('Fobos', 132, 80); ctx.fillText('Deimos', 236, 56);
    }

    // --- Sol (se ve más pequeño desde Marte) ---
    const sx = 680, sy = 70, sr = 15, brillo = e.polvo ? 0.25 : 1;
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr * 4);
    sg.addColorStop(0, `rgba(255,250,230,${brillo})`); sg.addColorStop(0.3, `rgba(255,235,190,${0.5 * brillo})`); sg.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,251,235,${brillo})`; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // --- Colinas y suelo rojizo ---
    ctx.fillStyle = '#9c4a28';
    ctx.beginPath(); ctx.moveTo(0, SUELO);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, SUELO - 30 - 22 * Math.sin(x * 0.012) - 12 * Math.sin(x * 0.031));
    ctx.lineTo(W, SUELO); ctx.fill();
    ctx.fillStyle = '#b85b33'; ctx.fillRect(-20, SUELO, W + 40, H - SUELO + 20);
    ctx.fillStyle = '#9e4b29';
    [[70, 315, 34], [300, 335, 22], [560, 320, 30], [730, 300, 18], [450, 345, 14]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#7d3a1e';
    [[40, 290, 8], [610, 335, 6], [760, 320, 10], [330, 300, 5]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill(); });

    // --- Paneles solares ---
    const sucio = 1 - e.eficiencia;
    [110, 180, 250].forEach((x, i) => {
      ctx.fillStyle = '#ccc'; ctx.fillRect(x - 2, SUELO - 48, 4, 48);
      if (e.paneles) {
        const balanceo = e.polvo ? Math.sin(t * 6 + i) * 1.5 : 0;
        ctx.save(); ctx.translate(x, SUELO - 50 + balanceo); ctx.rotate(-0.35);
        ctx.fillStyle = mezclar('#1f4fa8', '#8a5a38', sucio);
        ctx.fillRect(-32, -14, 64, 28);
        ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 1;
        for (let k = -32; k <= 32; k += 16) { ctx.beginPath(); ctx.moveTo(k, -14); ctx.lineTo(k, 14); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = '#28448a'; ctx.fillRect(x - 6, SUELO - 64, 12, 18);
        ctx.strokeStyle = '#9fb4e6'; ctx.strokeRect(x - 6, SUELO - 64, 12, 18);
      }
    });

    // --- Reactor nuclear (cilindro con luz) ---
    ctx.fillStyle = '#d9d9de'; ctx.fillRect(712, SUELO - 40, 26, 40);
    ctx.fillStyle = '#bfc2c9'; ctx.beginPath(); ctx.ellipse(725, SUELO - 40, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc33'; ctx.fillRect(719, SUELO - 28, 12, 6);

    // --- Antena ---
    ctx.fillStyle = '#ddd'; ctx.fillRect(648, SUELO - 60, 4, 60);
    ctx.save(); ctx.translate(650, SUELO - 62); ctx.rotate(-0.6);
    ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI); ctx.fill();
    ctx.restore();
    const radioOn = e.niveles.radio > 0 && e.energia && !e.conjuncion;
    if (radioOn) {
      ctx.strokeStyle = 'rgba(80,200,255,0.8)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const r = ((t * 30 + k * 18) % 54) + 8;
        ctx.globalAlpha = 1 - r / 62;
        ctx.beginPath(); ctx.arc(650, SUELO - 66, r, -2.4, -1.4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = (radioOn && Math.sin(t * 5) > 0) ? '#ff4d4d' : '#702020';
    ctx.beginPath(); ctx.arc(650, SUELO - 62, 3, 0, Math.PI * 2); ctx.fill();

    // --- Túnel, hábitat e invernadero ---
    ctx.fillStyle = '#c9ccd4'; ctx.fillRect(450, SUELO - 22, 50, 18);
    ctx.fillStyle = '#e9ebf0';
    ctx.beginPath(); ctx.arc(400, SUELO, 62, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#a7abb6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(400, SUELO, 62, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(400, SUELO, 44, Math.PI, 0); ctx.stroke();

    if (e.blindaje > 0) { // blindaje de regolito (crece de izquierda a derecha)
      ctx.fillStyle = 'rgba(150,70,38,0.97)';
      ctx.beginPath(); ctx.moveTo(400, SUELO);
      ctx.arc(400, SUELO, 72, Math.PI, Math.PI + Math.PI * Math.min(1, e.blindaje / 3)); ctx.closePath(); ctx.fill();
      if (e.blindaje >= 3) {
        ctx.fillStyle = '#83391d';
        for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 9; ctx.beginPath(); ctx.arc(400 + Math.cos(a) * 64, SUELO + Math.sin(a) * 64, 5, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    ctx.fillStyle = 'rgba(160,230,255,0.25)';
    ctx.beginPath(); ctx.arc(540, SUELO, 42, Math.PI, 0); ctx.fill();
    const plantas = Math.round(e.niveles.invernadero * 3 * e.invSalud);
    for (let k = 0; k < 9; k++) {
      const px = 510 + k * 7.5, alto = 8 + (k % 3) * 4;
      ctx.fillStyle = k < plantas ? '#3fbf5a' : '#7a5a3a';
      ctx.beginPath(); ctx.ellipse(px, SUELO - alto, 4, alto * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(540, SUELO, 42, Math.PI, 0); ctx.stroke();
    if (e.invSalud < 1) {
      ctx.strokeStyle = '#ff3333'; ctx.beginPath(); ctx.moveTo(560, SUELO - 36); ctx.lineTo(553, SUELO - 26); ctx.lineTo(561, SUELO - 20); ctx.stroke();
    }

    if (e.eva) astronauta(150 + Math.sin(t) * 60, SUELO + 10);

    // --- Tormenta de polvo ---
    if (e.polvo) {
      ctx.fillStyle = 'rgba(150,85,50,0.35)'; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.fillStyle = 'rgba(220,150,100,0.7)';
      for (const p of polvo) {
        p.x += p.v; if (p.x > W) { p.x = -5; p.y = Math.random() * H; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Ventanas: encendidas si hay energía
    [370, 400, 430].forEach(x => {
      ctx.fillStyle = e.energia ? '#ffd86b' : '#333';
      if (e.energia && e.polvo) { ctx.shadowColor = '#ffd86b'; ctx.shadowBlur = 14; }
      ctx.beginPath(); ctx.arc(x, SUELO - 30, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    if (e.refugio) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(342, SUELO - 100, 116, 24);
      ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 13px Nunito, sans-serif'; ctx.fillText('🛡️ En el refugio', 350, SUELO - 83);
    }

    if (flash > 0) { ctx.fillStyle = `rgba(255,240,180,${flash * 0.8})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }

  function astronauta(x, y) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 6, y - 26, 12, 16);
    ctx.beginPath(); ctx.arc(x, y - 32, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8a33a'; ctx.beginPath(); ctx.arc(x + 2, y - 32, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    const paso = Math.sin(t * 6) * 3;
    ctx.fillRect(x - 6, y - 10, 4, 10 + paso); ctx.fillRect(x + 2, y - 10, 4, 10 - paso);
  }

  function mezclar(a, b, k) {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',') + ')';
  }

  return { init, destello, sacudir };
})();
