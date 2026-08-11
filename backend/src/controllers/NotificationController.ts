import { Response } from "express";
import { NotificationService } from "@/services/NotificationService";
import { AuthedRequest } from "@/middleware/requireAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { HttpStatus } from "@/utils/httpStatus";

export const NotificationController = {
  async list(req: AuthedRequest, res: Response) {
    const { notifications, unreadCount } = await NotificationService.listFor(req.employeeId!);
    return res
      .status(HttpStatus.OK)
      .json(new ApiResponse(HttpStatus.OK, "Notifications fetched", { notifications, unreadCount }));
  },

  async markAllRead(req: AuthedRequest, res: Response) {
    await NotificationService.markAllRead(req.employeeId!);
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Marked all as read", null));
  },

  async markRead(req: AuthedRequest, res: Response) {
    await NotificationService.markRead(req.employeeId!, String(req.params.id));
    return res.status(HttpStatus.OK).json(new ApiResponse(HttpStatus.OK, "Marked as read", null));
  },
};
