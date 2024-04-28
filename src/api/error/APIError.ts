

export class APIError extends Error {
    constructor(message: string, private exposable = false) {
        super(message);
        this.name = "APIError";
    }

    public isExposable() {
        return this.exposable;
    }
}