import { HttpStatus } from "./httpStatus";

class ApiError extends Error {
  public statusCode: HttpStatus;
  public error: string;
  public success: boolean;

  constructor(statusCode: HttpStatus, message = "Something went wrong", error = "Unexpected Error") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.success = false;
    this.error = error;

    Error.captureStackTrace(this, this.constructor);
  }
}

export { ApiError };
