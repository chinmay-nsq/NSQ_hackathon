"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, Gift, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { AssignedTask, PendingApproval, RewardClaim } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageIn } from "@/components/motion/PageIn";
import { flyCoinsToBalance } from "@/lib/gsap/coinFly";
import { REWARD_ICONS } from "@/lib/rewardIcons";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Reward claims a manager approves/rejects — this is now the Approvals page's primary content (tasks moved to a secondary tab, see below). */
function RewardClaimsSection() {
  const [pending, setPending] = useState<RewardClaim[]>([]);
  const [recent, setRecent] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { fetchMe } = useAuthStore();

  const load = useCallback(() => {
    return Promise.all([
      api.get<{ claims: RewardClaim[] }>("/marketplace/claims/pending"),
      api.get<{ decisions: RewardClaim[] }>("/marketplace/claims/recent"),
    ])
      .then(([p, r]) => {
        setPending(p.claims);
        setRecent(r.decisions);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load reward claims."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(claim: RewardClaim) {
    setActingId(claim.id);
    try {
      await api.post(`/marketplace/claims/${claim.id}/approve`);

      const btn = rowRefs.current[claim.id];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        flyCoinsToBalance({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 8);
      }

      toast.success(`Claimed for ${claim.employee.name}`, { description: claim.item.name });
      setPending((prev) => prev.filter((c) => c.id !== claim.id));
      setRecent((prev) => [{ ...claim, approval: "APPROVED" }, ...prev]);
      await fetchMe();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not approve this claim.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(claim: RewardClaim) {
    setActingId(claim.id);
    try {
      await api.post(`/marketplace/claims/${claim.id}/reject`);
      toast.success(`Rejected — coins refunded to ${claim.employee.name}`);
      setPending((prev) => prev.filter((c) => c.id !== claim.id));
      setRecent((prev) => [{ ...claim, approval: "REJECTED" }, ...prev]);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not reject this claim.");
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-px">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <h3 className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Pending claims ({pending.length})
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 ? (
              <EmptyRow colSpan={5} message="No reward claims waiting on you right now." />
            ) : (
              pending.map((claim) => {
                const Icon = REWARD_ICONS[claim.item.icon] ?? Gift;
                return (
                  <TableRow key={claim.id}>
                    <TableCell>
                      <EmployeeCell name={claim.employee.name} title={claim.employee.title} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                          {claim.item.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="tabular font-mono text-xs text-currency">{claim.item.cost} coins</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(claim.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={actingId === claim.id}
                          onClick={() => handleReject(claim)}
                        >
                          <X />
                        </Button>
                        <Button
                          ref={(el) => {
                            rowRefs.current[claim.id] = el;
                          }}
                          size="sm"
                          className="glow-primary"
                          disabled={actingId === claim.id}
                          onClick={() => handleApprove(claim)}
                        >
                          <Check />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">Recent decisions</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.length === 0 ? (
              <EmptyRow colSpan={4} message="No decisions yet." />
            ) : (
              recent.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>
                    <EmployeeCell name={claim.employee.name} title={claim.employee.title} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                      {claim.item.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="tabular font-mono text-xs text-currency">{claim.item.cost} coins</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono text-[10px] tracking-wide uppercase ${
                        claim.approval === "APPROVED" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {claim.approval === "APPROVED" ? "Claimed" : "Rejected"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Task-submission review — kept intact and fully functional (it's still how assigned-task XP/coins get credited), just moved to a secondary tab now that reward claims are the primary Approvals content. */
function TaskSubmissionsSection() {
  const { fetchMe } = useAuthStore();
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [approved, setApproved] = useState<PendingApproval[]>([]);
  const [assigned, setAssigned] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(null);
  const [rejectNote, setRejectNote] = useState("");
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
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load task submissions."))
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
      await fetchMe();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not approve this submission.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectNote.trim()) return;
    const item = rejectTarget;
    setActingId(item.id);
    try {
      await api.post(`/adventures/${item.adventureId}/reject/${item.employeeId}`, { note: rejectNote.trim() });
      toast.success(`Rejected ${item.adventure.title}`);
      setPending((prev) => prev.filter((p) => p.id !== item.id));
      setRejectTarget(null);
      setRejectNote("");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not reject this submission.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
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
                        {item.submission ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={actingId === item.id}
                            onClick={() => setRejectTarget(item)}
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
                        <span className="font-mono text-[10px] tracking-wide text-success uppercase">Approved</span>
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

    <Dialog
      open={rejectTarget !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRejectTarget(null);
          setRejectNote("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide uppercase">Reject submission</DialogTitle>
          <DialogDescription>
            {rejectTarget &&
              `Let ${rejectTarget.employee.name} know what needs to change before resubmitting "${rejectTarget.adventure.title}".`}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="What needs to change?"
          rows={3}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setRejectTarget(null);
              setRejectNote("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!rejectNote.trim() || actingId === rejectTarget?.id}
            onClick={handleReject}
          >
            {actingId === rejectTarget?.id ? "Rejecting…" : "Confirm reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function ApprovalsPage() {
  const { employee } = useAuthStore();

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
            ? "Reward claims and task submissions, company-wide."
            : "Reward claims from your team, and task submissions waiting on your review."
        }
      />

      <Tabs defaultValue="rewards">
        <TabsList className="mb-6">
          <TabsTrigger value="rewards">
            <Gift className="size-3.5" />
            Reward Claims
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="size-3.5" />
            Task Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <RewardClaimsSection />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskSubmissionsSection />
        </TabsContent>
      </Tabs>
    </PageIn>
  );
}
