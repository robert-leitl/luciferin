import { mat4, quat, vec3 } from 'gl-matrix';
import { OrbitControl } from './utils/orbit-control';

import colorVertShaderSource from './shader/color.vert';
import colorFragShaderSource from './shader/color.frag';

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

        this.#resizeCanvasToDisplaySize(gl.canvas);
        
        // When you need to set the viewport to match the size of the canvas's
        // drawingBuffer this will always be correct
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        // resize the framebuffer textures
        this.#resizeTextures(gl);

        this.#updateProjectionMatrix(gl);
    }

    run(time = 0) {+
        this.fpsGraph.begin();

        this.#deltaTime = time - this.#time;
        this.#time = time;
        this.#frames += this.#deltaTime / 16;

        if (this.#isDestroyed) return;

        this.control.update(this.#deltaTime);

        this.#render();

        this.fpsGraph.end();

        requestAnimationFrame((t) => this.run(t));
    }

    #render() {
        /** @type {WebGLRenderingContext} */
        const gl = this.gl;

        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        gl.useProgram(this.colorProgram);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(this.colorLocations.u_worldMatrix, false, this.colorUniforms.u_worldMatrix);
        gl.uniformMatrix4fv(this.colorLocations.u_viewMatrix, false, this.colorUniforms.u_viewMatrix);
        gl.uniformMatrix4fv(this.colorLocations.u_projectionMatrix, false, this.colorUniforms.u_projectionMatrix);
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, this.quadBuffers.numElem);
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

        ///////////////////////////////////  PROGRAM SETUP

        // setup programs
        this.colorProgram = this.#createProgram(gl, [colorVertShaderSource, colorFragShaderSource], null, { a_position: 0, a_normal: 1, a_uv: 2 });

        // find the locations
        this.colorLocations = {
            a_position: gl.getAttribLocation(this.colorProgram, 'a_position'),
            a_normal: gl.getAttribLocation(this.colorProgram, 'a_normal'),
            a_uv: gl.getAttribLocation(this.colorProgram, 'a_uv'),
            u_worldMatrix: gl.getUniformLocation(this.colorProgram, 'u_worldMatrix'),
            u_viewMatrix: gl.getUniformLocation(this.colorProgram, 'u_viewMatrix'),
            u_projectionMatrix: gl.getUniformLocation(this.colorProgram, 'u_projectionMatrix')
        };
        
        // setup uniforms
        this.colorUniforms = {
            u_worldMatrix: mat4.create(),
            u_viewMatrix: mat4.create(),
            u_projectionMatrix: mat4.create()
        };
        mat4.rotate(this.colorUniforms.u_worldMatrix, this.colorUniforms.u_worldMatrix, 0, [1, 0, 0]);
        mat4.scale(this.colorUniforms.u_worldMatrix, this.colorUniforms.u_worldMatrix, [5, 5, 5]);
        mat4.translate(this.colorUniforms.u_worldMatrix, this.colorUniforms.u_worldMatrix, [0, 0, 0]);

        /////////////////////////////////// GEOMETRY / MESH SETUP

        // create quad VAO
        const quadPositions = [
            -1, -1,
            3, -1,
            -1, 3
        ];
        this.quadBuffers = {
            position: this.#createBuffer(gl, quadPositions),
            numElem: quadPositions.length / 2
        };
        this.quadVAO = this.#makeVertexArray(gl, [[this.quadBuffers.position, this.colorLocations.a_position, 2]]);

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

    #createBuffer(gl, data) {
        const buffer = this.gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return buffer;
    }

    #initOrbitControls() {
        this.control = new OrbitControl(this.canvas, this.camera, () => this.#updateCameraMatrix());
    }

    #createFramebuffer(gl, colorAttachements, depthAttachement) {
        const fbo = gl.createFramebuffer();
        const drawBuffers = [];
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        colorAttachements.forEach((texture, ndx) => {
            const attachmentPoint = gl[`COLOR_ATTACHMENT${ndx}`];
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                attachmentPoint,
                gl.TEXTURE_2D, 
                texture,
                0);
            drawBuffers.push(attachmentPoint);
        });
        if (depthAttachement) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthAttachement, 0);
        }
        gl.drawBuffers(drawBuffers);

        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
            console.error('could not complete render framebuffer setup', gl.checkFramebufferStatus(gl.FRAMEBUFFER))
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return fbo;
    }

    #makeVertexArray(gl, bufLocNumElmPairs, indices) {
        const va = gl.createVertexArray();
        gl.bindVertexArray(va);
        for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
            if(loc == -1) continue;

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(
                loc,      // attribute location
                numElem,        // number of elements
                gl.FLOAT, // type of data
                false,    // normalize
                0,        // stride (0 = auto)
                0,        // offset
            );
        }
        if (indices) {
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        }
        gl.bindVertexArray(null);
        return va;
    }

    #createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

        if (success) {
            return shader;
        }

        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    #createProgram(gl, shaderSources, transformFeedbackVaryings, attribLocations) {
        const program = gl.createProgram();

        [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
            const shader = this.#createShader(gl, type, shaderSources[ndx]);
            gl.attachShader(program, shader);
        });

        if (transformFeedbackVaryings) {
            gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
        }

        if (attribLocations) {
            for(const attrib in attribLocations) {
                gl.bindAttribLocation(program, attribLocations[attrib], attrib);
            }
        }

        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);

        if (success) {
            return program;
        }

        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    #setFramebuffer(gl, fbo, width, height) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); // all draw commands will affect the framebuffer
        gl.viewport(0, 0, width, height);
    }

    #createAndSetupTexture(gl, minFilter, magFilter) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        return texture;
    }

    #resizeTextures(gl) {
        
        
        // reset bindings
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    #updateCameraMatrix() {
        mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
        mat4.invert(this.colorUniforms.u_viewMatrix, this.camera.matrix);
    }

    #updateProjectionMatrix(gl) {
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(this.colorUniforms.u_projectionMatrix, Math.PI / 4, aspect, this.camera.near, this.camera.far);
    }

    #resizeCanvasToDisplaySize(canvas) {
        // Lookup the size the browser is displaying the canvas in CSS pixels.
        const displayWidth  = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
       
        // Check if the canvas is not the same size.
        const needResize = canvas.width  !== displayWidth ||
                           canvas.height !== displayHeight;
       
        if (needResize) {
          // Make the canvas the same size
          canvas.width  = displayWidth;
          canvas.height = displayHeight;
        }
       
        return needResize;
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
