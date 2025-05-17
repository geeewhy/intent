import { PayloadCodec } from '@temporalio/common';
import { Decoded } from '@temporalio/common/lib/internal-non-workflow';
import { coresdk } from '@temporalio/proto';
/**
 * Helper class for decoding Workflow activations and encoding Workflow completions.
 */
export declare class WorkflowCodecRunner {
    protected readonly codecs: PayloadCodec[];
    constructor(codecs: PayloadCodec[]);
    /**
     * Run codec.decode on the Payloads in the Activation message.
     */
    decodeActivation<T extends coresdk.workflow_activation.IWorkflowActivation>(activation: T): Promise<Decoded<T>>;
    /**
     * Run codec.encode on the Payloads inside the Completion message.
     */
    encodeCompletion(completion: coresdk.workflow_completion.IWorkflowActivationCompletion): Promise<Uint8Array>;
}
