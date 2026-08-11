import { NotificationRepository } from "@/repositories/NotificationRepository";
import { EmployeeRepository } from "@/repositories/EmployeeRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

// How long after picking a companion an unfinished profile counts as
// "stalled" — long enough that it's not just mid-signup, short enough to
// still be a useful nudge rather than nagging someone weeks later.
const ONBOARDING_STALL_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

class NotificationServiceImpl {
  /** Fire-and-forget: an employee's guild manager (if any) is notified they redeemed a reward. */
  async notifyRewardClaimed(params: {
    employeeName: string;
    employeeId: string;
    managerId?: string | null;
    itemName: string;
  }) {
    if (!params.managerId) return;
    await NotificationRepository.create({
      recipientId: params.managerId,
      actorId: params.employeeId,
      type: "REWARD_CLAIMED",
      title: "Reward claimed",
      body: `${params.employeeName} redeemed "${params.itemName}".`,
    });
  }

  /**
   * Checked on every login (no scheduler exists in this app — this is the
   * cheapest real trigger point). If this employee picked a companion a
   * while ago but never finished their work profile, and hasn't already
   * been nudged, sends a one-time reminder notification to themself.
   * Best-effort: never throws, since login must never fail because of this.
   */
  async checkOnboardingStall(employeeId: string) {
    try {
      const employee = await EmployeeRepository.findByIdWithRelations(employeeId);
      if (!employee || !employee.companion || employee.profileCompletedAt || employee.onboardingNudgeSentAt) {
        return;
      }

      const stalledSince = Date.now() - employee.companion.createdAt.getTime();
      if (stalledSince < ONBOARDING_STALL_THRESHOLD_MS) return;

      await NotificationRepository.create({
        recipientId: employeeId,
        type: "ONBOARDING_STALLED",
        title: "Finish setting up",
        body: `${employee.companion.name} is ready to help — just finish your work profile to start getting daily adventures.`,
      });
      await EmployeeRepository.update(employeeId, { onboardingNudgeSentAt: new Date() });
    } catch {
      // Never let a notification hiccup block login.
    }
  }

  async listFor(employeeId: string) {
    const [notifications, unreadCount] = await Promise.all([
      NotificationRepository.findForRecipient(employeeId),
      NotificationRepository.countUnread(employeeId),
    ]);
    return { notifications, unreadCount };
  }

  async markAllRead(employeeId: string) {
    await NotificationRepository.markAllRead(employeeId);
  }

  async markRead(employeeId: string, notificationId: string) {
    const result = await NotificationRepository.markRead(notificationId, employeeId);
    if (result.count === 0) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Notification not found", "Not Found");
    }
  }
}

export const NotificationService = new NotificationServiceImpl();
