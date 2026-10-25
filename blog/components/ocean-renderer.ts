const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float dark;

// Height and analytic slopes of several travelling swells. Narrow crests and
// broad troughs keep the surface from looking like parallel sine-wave ribbons.
vec3 swell(vec2 p, vec2 direction, float frequency, float speed, float amplitude, float phase) {
  float angle = dot(p, direction) * frequency + time * speed + phase;
  float crest = exp(1.6 * (sin(angle) - 1.0));
  float slope = 1.6 * crest * cos(angle) * frequency * amplitude;
  return vec3(crest * amplitude, direction * slope);
}
vec3 water(vec2 p) {
  vec3 surface = swell(p, vec2(.18, .98), 2.1, .64, .22, .0);
  surface += swell(p, vec2(-.35, .94), 3.3, .82, .12, 1.8);
  surface += swell(p, vec2(.62, .78), 5.8, 1.05, .055, 3.1);
  surface += swell(p, vec2(-.72, .69), 10.4, 1.30, .018, 4.7);
  surface += swell(p, vec2(.88, .47), 16.7, 1.65, .007, .9);
  return surface;
}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float aspect = resolution.x / resolution.y;
  vec3 ray = normalize(vec3((uv.x - .5) * aspect * .38, -.72 + uv.y * .50, 1.0));
  vec3 origin = vec3(0.0, 2.0, 0.0);
  float distance = -origin.y / ray.y;
  // Refine the ray/surface intersection, giving the advancing swells parallax.
  for (int i = 0; i < 4; i++) {
    vec3 point = origin + ray * distance;
    distance = (water(point.xz).x - origin.y) / ray.y;
  }
  vec3 point = origin + ray * distance;
  vec3 surface = water(point.xz);
  vec3 normal = normalize(vec3(-surface.y, 1.0, -surface.z));
  vec3 reflection = reflect(ray, normal);
  vec3 light = normalize(vec3(-.45, .85, -.25));
  float diffuse = max(0.0, dot(normal, light));
  float glint = pow(max(0.0, dot(reflection, light)), 24.0);
  float fresnel = pow(1.0 - max(0.0, dot(normal, -ray)), 3.0);
  float tone = clamp(.35 + (diffuse - .8) * 1.4 + reflection.y * .65 + glint * .6 + fresnel * .15, .03, .95);
  // Neutral, translucent water: keep both themes quiet instead of painting
  // an opaque ocean over the page. The upper edge dissolves into the paper.
  vec3 color = vec3(tone);
  float fade = 1.0 - smoothstep(.05, .95, uv.y);
  float alpha = mix(.075, .065, dark) * fade;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** One small GPU pass; no textures, simulation buffers, or React frame updates. */
export function createOceanRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: "low-power",
  });
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  function dispose() {
    gl!.useProgram(null);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, null);
    gl!.deleteBuffer(buffer);
    gl!.deleteProgram(program);
    shaders.forEach(shader => gl!.deleteShader(shader));
  }
  if (!program || !buffer) { dispose(); return null; }
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
    const shader = gl.createShader(type);
    if (!shader) { dispose(); return null; }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { dispose(); return null; }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return null; }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "resolution");
  const time = gl.getUniformLocation(program, "time");
  const dark = gl.getUniformLocation(program, "dark");

  return {
    resize() {
      const { width, height } = canvas.getBoundingClientRect();
      // Soft background water does not need Retina resolution.
      const scale = Math.min(1, 1440 / Math.max(1, width));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    },
    draw(seconds: number, isDark: boolean) {
      gl.uniform1f(time, seconds);
      gl.uniform1f(dark, isDark ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}
