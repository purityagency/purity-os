export abstract class DomainEvent {
  public readonly id: string;
  public readonly occurredOn: Date;

  constructor(public readonly eventName: string) {
    this.id = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
