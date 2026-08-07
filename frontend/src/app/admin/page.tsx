"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Shield, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { CompanyOverview, Role } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CountUp } from "@/components/motion/CountUp";
import { CreateGuildDialog } from "@/components/guilds/CreateGuildDialog";

interface AdminEmployeeRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  level: number;
  xp: number;
  coins: number;
  guildId: string | null;
  guild: { id: string; name: string } | null;
}

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

function OverviewTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3.5 px-2 py-1">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="tabular font-display text-xl leading-tight">
          <CountUp value={value} />
        </p>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { employee: currentEmployee } = useAuthStore();
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [employees, setEmployees] = useState<AdminEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return Promise.all([
      api.get<{ overview: CompanyOverview }>("/employees/overview"),
      api.get<{ employees: AdminEmployeeRow[] }>("/employees"),
    ])
      .then(([overviewData, employeesData]) => {
        setOverview(overviewData.overview);
        setEmployees(employeesData.employees);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load admin data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSetRole(id: string, role: Role) {
    try {
      await api.post(`/employees/${id}/role`, { role });
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)));
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not update role.");
    }
  }

  if (currentEmployee && currentEmployee.role !== "ADMIN") {
    return (
      <PageIn>
        <PageHeader title="Admin" description="You don't have permission to view this page." />
      </PageIn>
    );
  }

  return (
    <PageIn>
      <PageHeader
        title="Admin"
        description="Company-wide oversight — roles, teams, and pending approvals."
        action={<CreateGuildDialog onCreated={load} />}
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading || !overview ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="mb-10 grid divide-y divide-border/60 border border-border/60 rounded-xl sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <OverviewTile icon={Users} label="Employees" value={overview.employeeCount} />
          <OverviewTile icon={Shield} label="Teams" value={overview.guildCount} />
          <OverviewTile icon={Clock} label="Pending Approvals" value={overview.pendingApprovals} />
          <OverviewTile icon={Star} label="Total XP Earned" value={overview.totalXp} />
        </div>
      )}

      <h2 className="mb-4 font-display text-xl tracking-wide uppercase">People</h2>

      {loading ? (
        <div className="space-y-px">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[employees.length]}>
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{emp.name}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{emp.guild?.name ?? "No team"}</span>
              <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tracking-wide uppercase">
                Lvl {emp.level}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="shrink-0 font-mono text-xs tracking-wide uppercase">
                      {ROLE_LABEL[emp.role]}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {(["EMPLOYEE", "MANAGER", "ADMIN"] as Role[]).map((role) => (
                    <DropdownMenuItem key={role} onClick={() => handleSetRole(emp.id, role)}>
                      {ROLE_LABEL[role]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
