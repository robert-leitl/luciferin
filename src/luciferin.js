import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import { OrbitControl } from './utils/orbit-control';
import { Particles } from './particles';
import { createAndSetupTexture, createFramebuffer, createProgram, makeBuffer, makeVertexArray, resizeCanvasToDisplaySize } from './utils/webgl-utils';
import { RoundedBoxGeometry } from './utils/rounded-box-geometry';

import colorVertShaderSource from './shader/color.vert';
import colorFragShaderSource from './shader/color.frag';
import particleVertShaderSource from './shader/particle.vert';
import particleFragShaderSource from './shader/particle.frag';

export class Luciferin {
    oninit;

    #time = 0;
    #frames = 0;
    #deltaTime = 0;
    #isDestroyed = false;

    camera = {
        matrix: mat4.create(),
        near: 80,
        far: 150,
        distance: 120,
        orbit: quat.create(),
        position: vec3.create(),
        rotation: vec3.create(),
        up: vec3.fromValues(0, 1, 0)
    };

    constructor(canvas, pane, oninit = null) {
        this.canvas = canvas;
        this.pane = pane;
        this.oninit = oninit;

        this.#init();
    }

    resize() {
        const gl = this.gl;

        const needsResize = resizeCanvasToDisplaySize(gl.canvas);
        
        if (needsResize) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            this.#resizeTextures(gl);
        }
        
        this.#updateProjectionMatrix(gl);
    }

    run(time = 0) {
        this.fpsGraph.begin();

        this.#deltaTime = Math.min(32, time - this.#time);
        this.#time = time;
        this.#frames += this.#deltaTime / 16;

        if (this.#isDestroyed) return;

        this.particlesPositionBufferIndex = this.particles.update(this.#frames, this.#deltaTime);
        this.control.update(this.#deltaTime);

        this.#render();

        this.fpsGraph.end();

        requestAnimationFrame((t) => this.run(t));
    }

    #render() {
        /** @type {WebGLRenderingContext} */
        const gl = this.gl;


        // draw the particles
        gl.useProgram(this.particleProgram);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
        gl.uniformMatrix4fv(this.particleLocations.u_worldMatrix, false, this.drawUniforms.u_worldMatrix);
        gl.uniformMatrix4fv(this.particleLocations.u_viewMatrix, false, this.drawUniforms.u_viewMatrix);
        gl.uniformMatrix4fv(this.particleLocations.u_projectionMatrix, false, this.drawUniforms.u_projectionMatrix);
        gl.bindVertexArray(this.particleVAOs[this.particlesPositionBufferIndex]);
        gl.drawArrays(gl.POINTS, 0, this.particles.NUM_PARTICLES);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        // draw capsule
        gl.useProgram(this.colorProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniformMatrix4fv(this.colorLocations.u_viewMatrix, false, this.drawUniforms.u_viewMatrix);
        gl.uniformMatrix4fv(this.colorLocations.u_projectionMatrix, false, this.drawUniforms.u_projectionMatrix);
        gl.uniform3f(this.colorLocations.u_cameraPosition, this.camera.position[0], this.camera.position[1], this.camera.position[2]);
        const worldInverseTransposeMatrix = mat4.create();
        mat4.invert(worldInverseTransposeMatrix, this.drawUniforms.u_worldMatrix);
        mat4.transpose(worldInverseTransposeMatrix, worldInverseTransposeMatrix);
        gl.uniformMatrix4fv(this.colorLocations.u_worldMatrix, false, this.drawUniforms.u_worldMatrix);
        gl.uniformMatrix4fv(this.colorLocations.u_worldInverseTransposeMatrix, false, worldInverseTransposeMatrix);
        gl.bindVertexArray(this.capsuleVAO);
        gl.drawElements(gl.TRIANGLES, this.capsuleBuffers.numElem, gl.UNSIGNED_SHORT, 0);
    }

    destroy() {
        this.#isDestroyed = true;
    }

    #init() {
        this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false });

        /** @type {WebGLRenderingContext} */
        const gl = this.gl;

        if (!gl) {
            throw new Error('No WebGL 2 context!')
        }


        /////////////////////////////////// PARTICLES SETUP

        this.particles = new Particles(gl, 6000);

        ///////////////////////////////////  PROGRAM SETUP

        // setup programs
        this.colorProgram = createProgram(gl, [colorVertShaderSource, colorFragShaderSource], null, { a_position: 0, a_normal: 1, a_uv: 2 });
        this.particleProgram = createProgram(gl, [particleVertShaderSource, particleFragShaderSource], null, { a_position: 0 });

        // find the locations
        this.colorLocations = {
            a_position: gl.getAttribLocation(this.colorProgram, 'a_position'),
            a_normal: gl.getAttribLocation(this.colorProgram, 'a_normal'),
            a_uv: gl.getAttribLocation(this.colorProgram, 'a_uv'),
            u_worldMatrix: gl.getUniformLocation(this.colorProgram, 'u_worldMatrix'),
            u_viewMatrix: gl.getUniformLocation(this.colorProgram, 'u_viewMatrix'),
            u_projectionMatrix: gl.getUniformLocation(this.colorProgram, 'u_projectionMatrix'),
            u_worldInverseTransposeMatrix: gl.getUniformLocation(this.colorProgram, 'u_worldInverseTransposeMatrix'),
            u_cameraPosition: gl.getUniformLocation(this.colorProgram, 'u_cameraPosition')
        };
        this.particleLocations = {
            a_position: gl.getAttribLocation(this.particleProgram, 'a_position'),
            u_worldMatrix: gl.getUniformLocation(this.particleProgram, 'u_worldMatrix'),
            u_viewMatrix: gl.getUniformLocation(this.particleProgram, 'u_viewMatrix'),
            u_projectionMatrix: gl.getUniformLocation(this.particleProgram, 'u_projectionMatrix')
        };
        
        // setup uniforms
        this.drawUniforms = {
            u_worldMatrix: mat4.create(),
            u_viewMatrix: mat4.create(),
            u_projectionMatrix: mat4.create(),
            u_worldInverseTransposeMatrix: mat4.create()
        };

        mat4.rotate(this.drawUniforms.u_worldMatrix, this.drawUniforms.u_worldMatrix, 0, [1, 0, 0]);
        mat4.scale(this.drawUniforms.u_worldMatrix, this.drawUniforms.u_worldMatrix, [30, 30, 30]);
        mat4.translate(this.drawUniforms.u_worldMatrix, this.drawUniforms.u_worldMatrix, [0, 0, 0]);

        /////////////////////////////////// GEOMETRY / MESH SETUP

        // create the particles draw VAOs
        this.particleVAOs = [
            makeVertexArray(this.gl, [
                [this.particles.positionBuffers[0], this.particleLocations.a_position, 3]
            ]),
            makeVertexArray(this.gl, [
                [this.particles.positionBuffers[1], this.particleLocations.a_position, 3]
            ])
        ];

        // create quad VAO
        const quadPositions = [
            -1, -1,
            3, -1,
            -1, 3
        ];
        this.quadBuffers = {
            position: makeBuffer(gl, new Float32Array(quadPositions), gl.STATIC_DRAW),
            numElem: quadPositions.length / 2
        };
        this.quadVAO = makeVertexArray(gl, [[this.quadBuffers.position, this.colorLocations.a_position, 2]]);

        // create capsule VAO
        this.capsuleGeometry = new RoundedBoxGeometry(1, 2, 1, .5, 16);
        this.capsuleBuffers = { 
            position: makeBuffer(gl, this.capsuleGeometry.vertices, gl.STATIC_DRAW),
            normal: makeBuffer(gl, this.capsuleGeometry.normals, gl.STATIC_DRAW),
            numElem: this.capsuleGeometry.count
        };
        this.capsuleVAO = makeVertexArray(gl, [
            [this.capsuleBuffers.position, this.colorLocations.a_position, 3],
            [this.capsuleBuffers.normal, this.colorLocations.a_normal, 3]
        ], this.capsuleGeometry.indices);

        /////////////////////////////////// FRAMEBUFFER SETUP

        // initial client dimensions
        const clientSize = vec2.fromValues(gl.canvas.clientWidth, gl.canvas.clientHeight);
        this.particleFBOSize = vec2.clone(clientSize);

        this.particleTexture = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.particleFBOSize[0], this.particleFBOSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this.particleFBO = createFramebuffer(gl, [this.particleTexture]);

        this.resize();

        this.#updateCameraMatrix();
        this.#updateProjectionMatrix(gl);

        this.#initOrbitControls();
        this.#initTweakpane();

        if (this.oninit) this.oninit(this);
    }

    #initEnvMap() {
        const gl = this.gl;

        /*this.envMapTexture = this.#createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, this.envMapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 100, 500, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const img = new Image();
        img.src = new URL('./assets/studio024.jpg', import.meta.url);
        img.addEventListener('load', () => {
            gl.bindTexture(gl.TEXTURE_2D, this.envMapTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 100, 500, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
        });*/
    }

    #initOrbitControls() {
        this.control = new OrbitControl(this.canvas, this.camera, () => this.#updateCameraMatrix());
    }

    #resizeTextures(gl) {
        const clientSize = vec2.fromValues(gl.canvas.clientWidth, gl.canvas.clientHeight);
        this.particleFBOSize = vec2.clone(clientSize);
        
        // resize particle texture
        gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.particleFBOSize[0], this.particleFBOSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        // reset bindings
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    #updateCameraMatrix() {
        mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
        mat4.invert(this.drawUniforms.u_viewMatrix, this.camera.matrix);
    }

    #updateProjectionMatrix(gl) {
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(this.drawUniforms.u_projectionMatrix, Math.PI / 4, aspect, this.camera.near, this.camera.far);
    }

    #initTweakpane() {
        if (this.pane) {
            const maxFar = 200;

            this.fpsGraph = this.pane.addBlade({
                view: 'fpsgraph',
                label: 'fps',
                lineCount: 1,
                maxValue: 120,
                minValue: 0
            });

            const cameraFolder = this.pane.addFolder({ title: 'Camera' });
            this.#createTweakpaneSlider(cameraFolder, this.camera, 'near', 'near', 1, maxFar, null, () => this.#updateProjectionMatrix(this.gl));
            this.#createTweakpaneSlider(cameraFolder, this.camera, 'far', 'far', 1, maxFar, null, () => this.#updateProjectionMatrix(this.gl));
        }
    }

    #createTweakpaneSlider(folder, obj, propName, label, min, max, stepSize = null, callback) {
        const slider = folder.addBlade({
            view: 'slider',
            label,
            min,
            max,
            step: stepSize,
            value: obj[propName],
        });
        slider.on('change', e => {
            obj[propName] = e.value;
            if(callback) callback();
        });
    }
}
