export class Time {
    constructor() {
        // Keep track of some points in time to help us calculate the frame delta.
        this.cTime = performance.now();
        this.pTime;
    }

    delta(currentTimeStamp) {
        this.pTime = this.cTime;
        this.cTime = currentTimeStamp;

        return this.cTime - this.pTime;
    }
}
