export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly url: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}
