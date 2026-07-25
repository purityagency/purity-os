// Erreurs applicatives typées — permettent de distinguer une erreur métier
// attendue (à afficher) d'un bug réel (à logger sans détail côté client).
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Accès refusé") {
    super(message, "UNAUTHORIZED", 401)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} introuvable`, "NOT_FOUND", 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 422)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409)
  }
}
