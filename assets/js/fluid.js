/* ================================================================
   WEBGL FLUID SIMULATION — fluid.js
   Navier-Stokes "stable fluids" solver (advection → vorticity →
   pressure projection → dye advection). The dye is rendered as an
   ALPHA MASK over a background plate (or flat gray) — not as smoke.
   Public API: window.FluidSim = { splat, getFluidAlpha,
   getRegionPixels, setBgImage, loadStaticBg }
   ================================================================ */
(function () {
  'use strict';

  /* ── Config ───────────────────────────────────────────────────── */
  var CFG = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.980,
    VELOCITY_DISSIPATION: 0.995,
    PRESSURE: 0.80,
    PRESSURE_ITERATIONS: 20,
    CURL: 25,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000
  };
  if (window.FluidSimOverride) {
    Object.keys(window.FluidSimOverride).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(CFG, k)) CFG[k] = window.FluidSimOverride[k];
    });
  }
  window.FluidSimConfig = CFG;

  /* ── Context ──────────────────────────────────────────────────── */
  var canvas = document.getElementById('fluidCanvas');
  var gl = null;
  if (canvas) {
    var opts = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  }
  if (!gl) {
    console.error('[FluidSim] WebGL unavailable — fluid disabled');
    return;
  }
  gl.clearColor(0, 0, 0, 0);

  /* ── Extensions ───────────────────────────────────────────────── */
  var ext = {};
  (function () {
    var halfFloat = gl.getExtension('OES_texture_half_float');
    if (!halfFloat) { ext.type = gl.UNSIGNED_BYTE; ext.format = gl.RGBA; }
    else {
      ext.type = halfFloat.HALF_FLOAT_OES;
      var linear = gl.getExtension('OES_texture_half_float_linear');
      ext.linearFiltering = !!linear;
      ext.format = gl.RGBA;
    }
    /* Verify the format actually renders */
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, ext.type, null);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      ext.type = gl.UNSIGNED_BYTE; /* graceful degrade */
      ext.linearFiltering = false;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(tex);
  })();

  /* ── Shader sources ───────────────────────────────────────────── */
  var VERT = [
    'precision highp float;',
    'attribute vec2 aPosition;',
    'varying vec2 vUv, vL, vR, vT, vB;',
    'uniform vec2 texelSize;',
    'void main () {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  vL = vUv - vec2(texelSize.x, 0.0);',
    '  vR = vUv + vec2(texelSize.x, 0.0);',
    '  vT = vUv + vec2(0.0, texelSize.y);',
    '  vB = vUv - vec2(0.0, texelSize.y);',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = {
    clear: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv;',
      'uniform sampler2D uTexture;',
      'uniform float value;',
      'void main () { gl_FragColor = value * texture2D(uTexture, vUv); }'
    ].join('\n'),

    splat: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv;',
      'uniform sampler2D uTarget;',
      'uniform float aspectRatio;',
      'uniform vec3 color;',
      'uniform vec2 point;',
      'uniform float radius;',
      'void main () {',
      '  vec2 p = vUv - point.xy;',
      '  p.x *= aspectRatio;',
      '  vec3 splat = exp(-dot(p, p) / radius) * color;',
      '  vec3 base = texture2D(uTarget, vUv).xyz;',
      '  gl_FragColor = vec4(base + splat, 1.0);',
      '}'
    ].join('\n'),

    advection: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv;',
      'uniform sampler2D uVelocity;',
      'uniform sampler2D uSource;',
      'uniform vec2 texelSize;',
      'uniform vec2 dyeTexelSize;',
      'uniform float dt;',
      'uniform float dissipation;',
      'vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {',
      '  vec2 st = uv / tsize - 0.5;',
      '  vec2 iuv = floor(st);',
      '  vec2 fuv = fract(st);',
      '  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);',
      '  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);',
      '  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);',
      '  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);',
      '  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);',
      '}',
      'void main () {',
      '  ' + (ext.linearFiltering
        ? 'vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n' +
          '  vec4 result = texture2D(uSource, coord);'
        : 'vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n' +
          '  vec4 result = bilerp(uSource, coord, dyeTexelSize);'),
      '  float decay = 1.0 + dissipation * dt;',
      '  gl_FragColor = result / decay;',
      '}'
    ].join('\n'),

    divergence: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uVelocity;',
      'void main () {',
      '  float L = texture2D(uVelocity, vL).x;',
      '  float R = texture2D(uVelocity, vR).x;',
      '  float T = texture2D(uVelocity, vT).y;',
      '  float B = texture2D(uVelocity, vB).y;',
      '  vec2 C = texture2D(uVelocity, vUv).xy;',
      '  if (vL.x < 0.0) { L = -C.x; }',
      '  if (vR.x > 1.0) { R = -C.x; }',
      '  if (vT.y > 1.0) { T = -C.y; }',
      '  if (vB.y < 0.0) { B = -C.y; }',
      '  float div = 0.5 * (R - L + T - B);',
      '  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    curl: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uVelocity;',
      'void main () {',
      '  float L = texture2D(uVelocity, vL).y;',
      '  float R = texture2D(uVelocity, vR).y;',
      '  float T = texture2D(uVelocity, vT).x;',
      '  float B = texture2D(uVelocity, vB).x;',
      '  float vorticity = R - L - T + B;',
      '  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    vorticity: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uVelocity;',
      'uniform sampler2D uCurl;',
      'uniform float curl;',
      'uniform float dt;',
      'void main () {',
      '  float L = texture2D(uCurl, vL).x;',
      '  float R = texture2D(uCurl, vR).x;',
      '  float T = texture2D(uCurl, vT).x;',
      '  float B = texture2D(uCurl, vB).x;',
      '  float C = texture2D(uCurl, vUv).x;',
      '  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
      '  force /= length(force) + 0.0001;',
      '  force *= curl * C;',
      '  force.y *= -1.0;',
      '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
      '  velocity += force * dt;',
      '  velocity = min(max(velocity, -1000.0), 1000.0);',
      '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
      '}'
    ].join('\n'),

    pressure: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uPressure;',
      'uniform sampler2D uDivergence;',
      'void main () {',
      '  float L = texture2D(uPressure, vL).x;',
      '  float R = texture2D(uPressure, vR).x;',
      '  float T = texture2D(uPressure, vT).x;',
      '  float B = texture2D(uPressure, vB).x;',
      '  float divergence = texture2D(uDivergence, vUv).x;',
      '  float pressure = (L + R + B + T - divergence) * 0.25;',
      '  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    gradientSubtract: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv, vL, vR, vT, vB;',
      'uniform sampler2D uPressure;',
      'uniform sampler2D uVelocity;',
      'void main () {',
      '  float L = texture2D(uPressure, vL).x;',
      '  float R = texture2D(uPressure, vR).x;',
      '  float T = texture2D(uPressure, vT).x;',
      '  float B = texture2D(uPressure, vB).x;',
      '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
      '  velocity.xy -= vec2(R - L, T - B);',
      '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
      '}'
    ].join('\n'),

    display: [
      'precision highp float; precision highp sampler2D;',
      'varying vec2 vUv;',
      'uniform sampler2D uTexture;',
      'uniform sampler2D uBgImage;',
      'uniform float uHasBgImage;',
      'uniform float uBgAspect;',
      'uniform float uCanvasAspect;',
      'uniform float uEdgeLow;',
      'uniform float uEdgeHigh;',
      'uniform float uGrayR;',
      'uniform float uGrayG;',
      'uniform float uGrayB;',
      'void main () {',
      '  vec3 d = texture2D(uTexture, vUv).rgb;',
      '  float density = max(d.r, max(d.g, d.b));',
      '  float alpha = smoothstep(uEdgeLow, uEdgeHigh, density);',
      '  if (alpha < 0.004) { gl_FragColor = vec4(0.0); return; }',
      '  vec3 col;',
      '  if (uHasBgImage > 0.5) {',
      '    vec2 uv = vUv;',
      '    float s;',
      '    if (uCanvasAspect > uBgAspect) {',
      '      s = uCanvasAspect / uBgAspect;',
      '      uv.y = (uv.y - 0.5) / s + 0.5;',
      '    } else {',
      '      s = uBgAspect / uCanvasAspect;',
      '      uv.x = (uv.x - 0.5) / s + 0.5;',
      '    }',
      '    col = texture2D(uBgImage, clamp(uv, 0.0, 1.0)).rgb;',
      '  } else {',
      '    col = vec3(uGrayR / 255.0, uGrayG / 255.0, uGrayB / 255.0);',
      '  }',
      '  gl_FragColor = vec4(col, alpha);',
      '}'
    ].join('\n')
  };

  /* ── Program helpers ──────────────────────────────────────────── */
  function compile(type, source, name) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[FluidSim] ' + name + ' compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  var quadPrograms = [];
  function createProgram(fragSource, name) {
    var vs = compile(gl.VERTEX_SHADER, VERT, name + '-vert');
    var fs = compile(gl.FRAGMENT_SHADER, fragSource, name + '-frag');
    if (!vs || !fs) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[FluidSim] ' + name + ' link error:', gl.getProgramInfoLog(program));
      return null;
    }
    var uniforms = {};
    var n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(program, i);
      uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms, name: name };
  }

  var progClear      = createProgram(FRAG.clear, 'clear');
  var progSplat      = createProgram(FRAG.splat, 'splat');
  var progAdvection  = createProgram(FRAG.advection, 'advection');
  var progDivergence = createProgram(FRAG.divergence, 'divergence');
  var progCurl       = createProgram(FRAG.curl, 'curl');
  var progVorticity  = createProgram(FRAG.vorticity, 'vorticity');
  var progPressure   = createProgram(FRAG.pressure, 'pressure');
  var progGradient   = createProgram(FRAG.gradientSubtract, 'gradientSubtract');
  var progDisplay    = createProgram(FRAG.display, 'display');
  if (!progClear || !progSplat || !progAdvection || !progDivergence ||
      !progCurl || !progVorticity || !progPressure || !progGradient || !progDisplay) {
    console.error('[FluidSim] shader init failed — fluid disabled');
    return;
  }

  /* Static fullscreen quad */
  var quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  -1, 1,   1, 1,
    -1, -1,   1, 1,   1, -1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function blit(target) {
    if (target === null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ── Framebuffers ─────────────────────────────────────────────── */
  function createFBO(w, h, filter) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, ext.type, null);

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture: texture, fbo: fbo, width: w, height: h,
      attach: function (id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  function createDoubleFBO(w, h, filter) {
    var a = createFBO(w, h, filter);
    var b = createFBO(w, h, filter);
    return {
      width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
      get read() { return a; }, set read(v) { a = v; },
      get write() { return b; }, set write(v) { b = v; },
      swap: function () { var t = a; a = b; b = t; }
    };
  }

  function getResolution(base) {
    var ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    var mn = Math.round(base), mx = Math.round(base * ar);
    return (gl.drawingBufferWidth > gl.drawingBufferHeight)
      ? { width: mx, height: mn }
      : { width: mn, height: mx };
  }

  var velocity, dye, divergence, curlFBO, pressure;
  function initFramebuffers() {
    var simRes = getResolution(CFG.SIM_RESOLUTION);
    var dyeRes = getResolution(CFG.DYE_RESOLUTION);
    var texType = ext.linearFiltering ? gl.LINEAR : gl.NEAREST;
    velocity   = createDoubleFBO(simRes.width, simRes.height, texType);
    dye        = createDoubleFBO(dyeRes.width, dyeRes.height, texType);
    divergence = createFBO(simRes.width, simRes.height, gl.NEAREST);
    curlFBO    = createFBO(simRes.width, simRes.height, gl.NEAREST);
    pressure   = createDoubleFBO(simRes.width, simRes.height, gl.NEAREST);
  }

  function resizeCanvas() {
    var w = canvas.width !== window.innerWidth ? window.innerWidth : canvas.width;
    var h = canvas.height !== window.innerHeight ? window.innerHeight : canvas.height;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  /* ── Background plate ─────────────────────────────────────────── */
  var bgImageTex = null, bgImageAspect = 1;
  function makeTextureFromImage(img, flipY) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  function setBgImage(url) {
    if (!url) {
      if (bgImageTex) { gl.deleteTexture(bgImageTex); bgImageTex = null; }
      return;
    }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      if (bgImageTex) gl.deleteTexture(bgImageTex);
      bgImageAspect = img.naturalWidth / img.naturalHeight;
      bgImageTex = makeTextureFromImage(img, true);
    };
    img.onerror = function () {
      console.warn('[FluidSim] bg image failed to load:', url);
    };
    img.src = url;
  }

  /* ── Simulation step ──────────────────────────────────────────── */
  function step(dt) {
    gl.disable(gl.BLEND);

    /* curl */
    gl.useProgram(progCurl.program);
    gl.uniform2f(progCurl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progCurl.uniforms.uVelocity, velocity.read.attach(0));
    blit(curlFBO);

    /* vorticity */
    gl.useProgram(progVorticity.program);
    gl.uniform2f(progVorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progVorticity.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(progVorticity.uniforms.uCurl, curlFBO.attach(1));
    gl.uniform1f(progVorticity.uniforms.curl, CFG.CURL);
    gl.uniform1f(progVorticity.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    /* divergence */
    gl.useProgram(progDivergence.program);
    gl.uniform2f(progDivergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progDivergence.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    /* decay pressure */
    gl.useProgram(progClear.program);
    gl.uniform1i(progClear.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(progClear.uniforms.value, CFG.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    /* pressure solve */
    gl.useProgram(progPressure.program);
    gl.uniform2f(progPressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progPressure.uniforms.uDivergence, divergence.attach(0));
    for (var i = 0; i < CFG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(progPressure.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    /* gradient subtract */
    gl.useProgram(progGradient.program);
    gl.uniform2f(progGradient.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progGradient.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(progGradient.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    /* advect velocity */
    gl.useProgram(progAdvection.program);
    gl.uniform2f(progAdvection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.linearFiltering) {
      gl.uniform2f(progAdvection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    }
    var velocityId = velocity.read.attach(0);
    gl.uniform1i(progAdvection.uniforms.uVelocity, velocityId);
    gl.uniform1i(progAdvection.uniforms.uSource, velocityId);
    gl.uniform1f(progAdvection.uniforms.dt, dt);
    gl.uniform1f(progAdvection.uniforms.dissipation, CFG.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    /* advect dye */
    if (!ext.linearFiltering) {
      gl.uniform2f(progAdvection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    }
    gl.uniform1i(progAdvection.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(progAdvection.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(progAdvection.uniforms.dissipation, CFG.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  /* ── Render: dye as alpha mask ────────────────────────────────── */
  function render() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var bg = window.BgConfig || {};
    gl.useProgram(progDisplay.program);
    gl.uniform2f(progDisplay.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(progDisplay.uniforms.uTexture, dye.read.attach(0));
    gl.uniform1f(progDisplay.uniforms.uEdgeLow, bg.EDGE_LOW !== undefined ? bg.EDGE_LOW : 0.08);
    gl.uniform1f(progDisplay.uniforms.uEdgeHigh, bg.EDGE_HIGH !== undefined ? bg.EDGE_HIGH : 0.09);
    gl.uniform1f(progDisplay.uniforms.uGrayR, bg.GRAY_R !== undefined ? bg.GRAY_R : 194);
    gl.uniform1f(progDisplay.uniforms.uGrayG, bg.GRAY_G !== undefined ? bg.GRAY_G : 194);
    gl.uniform1f(progDisplay.uniforms.uGrayB, bg.GRAY_B !== undefined ? bg.GRAY_B : 194);
    if (bgImageTex) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgImageTex);
      gl.uniform1i(progDisplay.uniforms.uBgImage, 1);
      gl.uniform1f(progDisplay.uniforms.uHasBgImage, 1.0);
      gl.uniform1f(progDisplay.uniforms.uBgAspect, bgImageAspect);
    } else {
      gl.uniform1f(progDisplay.uniforms.uHasBgImage, 0.0);
    }
    gl.uniform1f(progDisplay.uniforms.uCanvasAspect,
      gl.drawingBufferWidth / gl.drawingBufferHeight);
    blit(null);

    gl.disable(gl.BLEND);
  }

  /* ── Splats ───────────────────────────────────────────────────── */
  function doSplat(x, y, dx, dy, color) {
    var ar = canvas.width / canvas.height;
    var radius = (CFG.SPLAT_RADIUS / 100) * Math.max(ar, 1);
    var pointX = x / canvas.width;
    var pointY = 1.0 - y / canvas.height;

    /* velocity splat */
    gl.useProgram(progSplat.program);
    gl.uniform2f(progSplat.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(progSplat.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(progSplat.uniforms.aspectRatio, ar);
    gl.uniform2f(progSplat.uniforms.point, pointX, pointY);
    gl.uniform1f(progSplat.uniforms.radius, radius);
    gl.uniform3f(progSplat.uniforms.color, dx, -dy, 0.0);
    blit(velocity.write);
    velocity.swap();

    /* dye splat */
    gl.uniform2f(progSplat.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(progSplat.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(progSplat.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function splat(x, y, dx, dy, color) {
    gl.disable(gl.BLEND);
    var c = color || { r: 0.76, g: 0.76, b: 0.76 };
    doSplat(x, y, dx * CFG.SPLAT_FORCE, dy * CFG.SPLAT_FORCE, c);
  }

  /* ── Readback ─────────────────────────────────────────────────── */
  var _px = new Uint8Array(4);
  function getFluidAlpha(x, y) {
    var px = Math.round(x), py = Math.round(y);
    var gy = canvas.height - py;
    if (px < 0 || px >= canvas.width || gy < 0 || gy >= canvas.height) return 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(px, gy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
    return _px[3] / 255;
  }

  function getRegionPixels(x, y, w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    var sx = Math.round(x), sy = Math.round(y);
    var gy = canvas.height - sy - h;
    if (gy < 0) { h += gy; gy = 0; }
    if (sx < 0) { w += sx; sx = 0; }
    w = Math.min(w, canvas.width - sx);
    h = Math.min(h, canvas.height - gy);
    var out = new Uint8Array(w * h * 4);
    if (w > 0 && h > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(sx, gy, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    }
    /* rows are bottom-to-top (WebGL y-flip) — caller accounts for it */
    return out;
  }

  /* ── Main loop ────────────────────────────────────────────────── */
  var lastTime = Date.now();
  function update() {
    var now = Date.now();
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (resizeCanvas()) initFramebuffers();
    step(dt);
    render();
    requestAnimationFrame(update);
  }

  function start() {
    if (!canvas) return;
    resizeCanvas();
    initFramebuffers();
    requestAnimationFrame(update);
  }

  /* ── Public API ───────────────────────────────────────────────── */
  window.FluidSim = {
    splat: splat,
    getFluidAlpha: getFluidAlpha,
    getRegionPixels: getRegionPixels,
    setBgImage: setBgImage,
    loadStaticBg: function () { setBgImage('assets/images/fluid-bg.jpg?v=3'); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
