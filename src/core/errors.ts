export class BusinessRuleViolation extends Error {
  readonly name = 'BusinessRuleViolation';
  private retriable: boolean;

  constructor(public readonly reason: string, public readonly details?: any, retriable = false) {
    super(reason);
    this.retriable = retriable;
  }
}