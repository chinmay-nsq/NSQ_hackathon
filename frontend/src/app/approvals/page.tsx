"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { PendingApproval } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { flyCoinsToBalance } from "@/lib/gsap/coinFly";
import { AssignTaskDialog } from "@/components/adventures/AssignTaskDialog";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ApprovalsPage() {
  const { employee, fetchMe } = useAuthStore();
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const load = useCallback(() => {
    return api
      .get<{ pending: PendingApproval[] }>("/adventures/pending")
      .then((data) => setPending(data.pending))
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
            ? "Every pending submission, company-wide."
            : "Submissions from your team, waiting on your review."
        }
        action={<AssignTaskDialog onAssigned={load} />}
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-px">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
          <Clock className="size-6" />
          Nothing waiting on you right now.
        </div>
      ) : (
        <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[pending.length]}>
          {pending.map((item) => (
            <div key={item.id} className="flex items-start gap-4 py-5">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="font-display bg-accent text-accent-foreground">
                  {initials(item.employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.employee.name}</p>
                  <span className="text-xs text-muted-foreground">{item.employee.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                    {item.adventure.title}
                  </Badge>
                  <span className="tabular font-mono text-xs text-primary">
                    +{item.adventure.xpReward} XP · +{item.adventure.coinReward} coins
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.adventure.description}</p>
                {item.submission && (
                  <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">{item.submission}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
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
            </div>
          ))}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
