declare module 'prompts' {
  export interface PromptObject<T extends string = string> {
    type: string;
    name: T;
    message: string;
    initial?: any;
    validate?: (value: any) => string | boolean;
    choices?: Array<{ title: string; value: any }>;
    hint?: string;
    format?: (value: any) => any;
    onRender?: (kleur: any) => void;
    onState?: (state: any) => void;
  }

  export default function prompt<T extends string = string>(
    questions: PromptObject<T> | Array<PromptObject<T>>,
    options?: {
      onSubmit?: (prompt: PromptObject<T>, answer: any, answers: Record<T, any>) => void;
      onCancel?: (prompt: PromptObject<T>, answers: Record<T, any>) => void;
    }
  ): Promise<Record<T, any>>;
}