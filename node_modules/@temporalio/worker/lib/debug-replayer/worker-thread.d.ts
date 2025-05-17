/**
 * Request from parent thread, the worker thread should signal a "runner" when it gets this request.
 */
export interface Request {
    type: 'wft-started';
    /**
     * Event ID of the started request.
     */
    eventId: number;
    /**
     * Used to signal back that the request is complete.
     */
    responseBuffer: Int32Array;
}
