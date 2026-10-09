/** An expected failure with an HTTP status and a message that is safe to show people. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
