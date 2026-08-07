import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "@/config/env";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

// Self-registration may only pick these — ADMIN is never selectable at
// signup, it can only be granted by an existing admin via /employees/:id/role.
const SELF_REGISTERABLE_ROLES: Role[] = [Role.EMPLOYEE, Role.MANAGER];

export interface JwtPayload {
  employeeId: string;
}

class AuthServiceImpl {
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  }

  async register(email: string, password: string, name: string, role: Role = Role.EMPLOYEE) {
    const existing = await EmployeeRepository.findByEmail(email);
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "An account with this email already exists", "Conflict");
    }
    if (!SELF_REGISTERABLE_ROLES.includes(role)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid role", "Bad Request");
    }

    const passwordHash = await this.hashPassword(password);
    const employee = await EmployeeRepository.create({ email, passwordHash, name, role });
    const token = this.signToken({ employeeId: employee.id });

    return { token, employee, hasCompanion: false };
  }

  async login(email: string, password: string) {
    const employee = await EmployeeRepository.findByEmailWithCompanion(email);
    if (!employee) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid email or password", "Unauthorized");
    }

    const valid = await this.verifyPassword(password, employee.passwordHash);
    if (!valid) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid email or password", "Unauthorized");
    }

    const token = this.signToken({ employeeId: employee.id });
    return { token, employee, hasCompanion: Boolean(employee.companion) };
  }

  async getProfile(employeeId: string) {
    const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
    if (!employee) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Employee not found", "Not Found");
    }
    const { passwordHash: _unused, ...safeEmployee } = employee;
    return safeEmployee;
  }
}

export const AuthService = new AuthServiceImpl();
