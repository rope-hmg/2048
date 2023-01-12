export class HslColour {
    constructor(h, s, l) {
        this.h = h;
        this.s = s;
        this.l = l;
    }

    /**
     * Formats this colour in the CSS HSL colour property format.
     */
    background() {
        return `hsl(${this.h} ${this.s}% ${this.l}%)`;
    }

    /**
     * Slightly darkens the colour and then formats in the CSS HSL colour property format.
     */
    border() {
        return `hsl(${this.h} ${this.s - 5}% ${this.l - 15}%)`;
    }
}
