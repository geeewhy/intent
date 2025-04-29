export class BusinessRuleViolation extends Error {
  readonly name = 'BusinessRuleViolation';

  constructor(public readonly reason: string) {
    super(reason);
  }
}