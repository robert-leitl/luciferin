import { quat, vec3 } from 'gl-matrix';

export class OrbitControl {

    // latitue thresholds in degrees
    maxLatitude = 80;
    minLatitude = -80;

    // angular velocity in degrees / deltaTime [longitude, latitude]
    velocity = [0, 0];

    constructor(canvas, camera, updateCallback) {
        this.pointerDown = false;
        this.pointerDownPos = { x: 0, y: 0 };
        this.pointerPos = { x: 0, y: 0 };
        this.followPos = { x: 0, y: 0 };
        this.prevFollowPos = {x: 0, y: 0};
        this.phi = 0.;
        this.theta = 0.;
        this.camera = camera;
        this.updateCallback = updateCallback;

        canvas.style.touchAction = 'none';

        canvas.addEventListener('pointerdown', e => {
            this.pointerDownPos = { x: e.clientX, y: e.clientY }
            this.followPos = { x: e.clientX, y: e.clientY }
            this.pointerPos = { x: e.clientX, y: e.clientY }
            this.prevFollowPos = { x: e.clientX, y: e.clientY }
            this.pointerDownCameraUp = [...this.camera.up];
            this.pointerDownRotation = [...this.camera.rotation];
            this.pointerDown = true;
        });
        canvas.addEventListener('pointerup', e => {
            this.pointerDown = false;
        });
        canvas.addEventListener('pointermove', e => {
            if (this.pointerDown) {
                this.pointerPos = { x: e.clientX, y: e.clientY }
            }
        });
    }

    update(deltaTime) {
        const timeScale = 16 / (deltaTime + 0.01);

        if (this.pointerDown) {
            const damping = 10 * timeScale;
            this.followPos.x += (this.pointerPos.x - this.followPos.x) / damping;
            this.followPos.y += (this.pointerPos.y - this.followPos.y) / damping;

            const delta = {
                x: this.followPos.x - this.prevFollowPos.x,
                y: this.followPos.y - this.prevFollowPos.y
            };
            this.prevFollowPos = { ...this.followPos };

            const speed = 0.2 * timeScale;
            this.phi = delta.x * speed;
            this.theta = delta.y * speed;
        } else {
            const decc = 0.96 / Math.max(.5 * timeScale, 1);
            this.phi *= decc;
            this.theta *= decc;
        }

        const prevRotation = [...this.camera.rotation];

        this.camera.rotation[0] -= this.theta;
        this.camera.rotation[1] -= this.phi;

        this.velocity[0] = this.camera.rotation[0] - prevRotation[0];
        this.velocity[1] = this.camera.rotation[1] - prevRotation[1];

        const thetaLimitUp = this.maxLatitude;
        const thetaLimitDown = this.minLatitude;
        if (this.camera.rotation[0] > thetaLimitUp) {
            this.camera.rotation[0] = thetaLimitUp;
        } else if (this.camera.rotation[0] < thetaLimitDown) {
            this.camera.rotation[0] = thetaLimitDown;
        }

        quat.fromEuler(this.camera.orbit, this.camera.rotation[0], this.camera.rotation[1], this.camera.rotation[2]);
        vec3.transformQuat(this.camera.position, [0, 0, this.camera.distance], this.camera.orbit);

        this.updateCallback();
    }

}