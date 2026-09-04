import { CompanyRepository } from "@/repositories/CompanyRepository";
import { TeamRepository } from "@/repositories/TeamRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { RESOURCE_TYPES, ResourceType } from "@/config/constants";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

class CompanyServiceImpl {
  async getOverview() {
    const company = await CompanyRepository.getOrCreate();
    const projects = await CompanyRepository.findProjects(company.id);
    return { company, projects };
  }

  async contribute(employeeId: string, projectId: string, resourceType: ResourceType, amount: number) {
    const employee = await EmployeeRepository.findById(employeeId);
    if (!employee?.teamId) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "You are not in a team", "Bad Request");
    }

    const team = await TeamRepository.findById(employee.teamId);
    const project = await CompanyRepository.findProjectById(projectId);
    if (!team || !project) throw new ApiError(HttpStatus.NOT_FOUND, "Not found", "Not Found");
    if (project.unlocked) throw new ApiError(HttpStatus.BAD_REQUEST, "Project already unlocked", "Bad Request");

    if (team[resourceType] < amount) {
      throw new ApiError(HttpStatus.BAD_REQUEST, `Team does not have enough ${resourceType}`, "Bad Request");
    }

    await TeamRepository.decrementResource(team.id, resourceType, amount);
    await CompanyRepository.contributeToProject(project.id, team.id, resourceType, amount);

    const fresh = await CompanyRepository.findProjectById(project.id);
    if (!fresh) throw new ApiError(HttpStatus.NOT_FOUND, "Not found", "Not Found");

    const isComplete = RESOURCE_TYPES.every(
      (r) => fresh[`${r}Contributed` as const] >= fresh[`${r}Needed` as const]
    );

    if (isComplete && !fresh.unlocked) {
      await CompanyRepository.unlockProject(project.id);
    }

    const updatedProject = await CompanyRepository.findProjectById(project.id);
    return { project: updatedProject, unlocked: isComplete };
  }
}

export const CompanyService = new CompanyServiceImpl();
