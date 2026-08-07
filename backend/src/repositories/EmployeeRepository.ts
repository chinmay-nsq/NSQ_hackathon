import { prisma } from "@/config/db";
import { Prisma, Role } from "@prisma/client";

export const EmployeeRepository = {
  findByEmail(email: string) {
    return prisma.employee.findUnique({ where: { email } });
  },

  findByEmailWithCompanion(email: string) {
    return prisma.employee.findUnique({ where: { email }, include: { companion: true } });
  },

  findById(id: string) {
    return prisma.employee.findUnique({ where: { id } });
  },

  findByIdWithRelations(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: { companion: true, guild: true },
    });
  },

  create(data: { email: string; passwordHash: string; name: string; role?: Role }) {
    return prisma.employee.create({ data });
  },

  update(id: string, data: Prisma.EmployeeUpdateInput) {
    return prisma.employee.update({ where: { id }, data });
  },

  setGuild(id: string, guildId: string) {
    return prisma.employee.update({ where: { id }, data: { guildId } });
  },
};
