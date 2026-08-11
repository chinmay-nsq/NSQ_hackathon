"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { AssignedTask, PendingApproval } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageIn } from "@/components/motion/PageIn";
import { flyCoinsToBalance } from "@/lib/gsap/coinFly";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function EmployeeCell({ name, title }: { name: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="font-display bg-accent text-accent-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="whitespace-normal py-10 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function ApprovalsPage() {
  const { employee, fetchMe } = useAuthStore();
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [approved, setApproved] = useState<PendingApproval[]>([]);
  const [assigned, setAssigned] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const load = useCallback(() => {
    return api
      .get<{ pending: PendingApproval[]; approved: PendingApproval[]; assigned: AssignedTask[] }>(
        "/adventures/pending"
      )
      .then((data) => {
        setPending(data.pending);
        setApproved(data.approved);
        setAssigned(data.assigned);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load approvals."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(item: PendingApproval) {
    setActingId(item.id);
    try {
      await api.post(`/adventures/${item.adventureId}/approve/${item.employeeId}`);

      const btn = rowRefs.current[item.id];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        flyCoinsToBalance({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 8);
      }

      toast.success(`Approved ${item.adventure.title}`, {
        description: `${item.employee.name} earned +${item.adventure.xpReward} XP, +${item.adventure.coinReward} coins.`,
      });
      setPending((prev) => prev.filter((p) => p.id !== item.id));
      setApproved((prev) => [{ ...item, adventure: item.adventure }, ...prev]);
      // If the approver is also crediting themself indirectly via guild totals, refresh their own stats too.
      await fetchMe();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not approve this submission.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(item: PendingApproval) {
    setActingId(item.id);
    try {
      await api.post(`/adventures/${item.adventureId}/reject/${item.employeeId}`, {
        note: "Not approved — try again with more detail.",
      });
      toast.success(`Rejected ${item.adventure.title}`);
      setPending((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not reject this submission.");
    } finally {
      setActingId(null);
    }
  }

  if (employee && employee.role === "EMPLOYEE") {
    return (
      <PageIn>
        <PageHeader title="Approvals" description="You don't have permission to view this page." />
      </PageIn>
    );
  }

  return (
    <PageIn>
      <PageHeader
        title="Approvals"
        description={
          employee?.role === "ADMIN"
            ? "Every assigned and pending submission, company-wide."
            : "Tasks you've assigned, and submissions waiting on your review."
        }
      />

      <Tabs defaultValue="assigned">
        <TabsList className="mb-6">
          <TabsTrigger value="assigned">Assigned ({assigned.length})</TabsTrigger>
          <TabsTrigger value="review">Under Review ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({approved.length})</TabsTrigger>
        </TabsList>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="space-y-px">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <>
            <TabsContent value="assigned">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead className="whitespace-normal">Description</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.length === 0 ? (
                    <EmptyRow colSpan={5} message="Nothing assigned right now." />
                  ) : (
                    assigned.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <EmployeeCell name={task.assignee.name} title={task.assignee.title} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                            {task.title}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="tabular font-mono text-xs text-primary">
                            +{task.xpReward} XP · +{task.coinReward} coins
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm whitespace-normal text-muted-foreground">
                          {task.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                            Not started
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="review">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead className="whitespace-normal">Submission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <EmptyRow colSpan={5} message="Nothing waiting on you right now." />
                  ) : (
                    pending.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <EmployeeCell name={item.employee.name} title={item.employee.title} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                            {item.adventure.title}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="tabular font-mono text-xs text-primary">
                            +{item.adventure.xpReward} XP · +{item.adventure.coinReward} coins
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm whitespace-normal text-muted-foreground">
                          {item.submission ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={actingId === item.id}
                              onClick={() => handleReject(item)}
                            >
                              <X />
                            </Button>
                            <Button
                              ref={(el) => {
                                rowRefs.current[item.id] = el;
                              }}
                              size="sm"
                              className="glow-primary"
                              disabled={actingId === item.id}
                              onClick={() => handleApprove(item)}
                            >
                              <Check />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="completed">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead className="whitespace-normal">Description</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approved.length === 0 ? (
                    <EmptyRow colSpan={5} message="Nothing approved yet." />
                  ) : (
                    approved.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <EmployeeCell name={item.employee.name} title={item.employee.title} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                            {item.adventure.title}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="tabular font-mono text-xs text-primary">
                            +{item.adventure.xpReward} XP · +{item.adventure.coinReward} coins
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm whitespace-normal text-muted-foreground">
                          {item.adventure.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-[10px] tracking-wide text-success uppercase">
                            Approved
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageIn>
  );
}
