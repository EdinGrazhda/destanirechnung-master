import { JsonWebTokenError } from "jsonwebtoken";

export default function isJwtError(error: unknown): error is JsonWebTokenError {
  return typeof error === 'object' && error !== null && 'name' in error && 'message' in error;
}