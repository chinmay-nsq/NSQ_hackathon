import { NotificationRepository } from "@/repositories/NotificationRepository";
import { ApiError } from "@/utils/apiError";
import { HttpStatus } from "@/utils/httpStatus";

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
