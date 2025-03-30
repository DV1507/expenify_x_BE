import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

export function sendResponse(
  res: Response,
  data: object,
  message = 'Success',
  toast = false,
  statusCode: HttpStatus = HttpStatus.OK,
) {
  return res.status(statusCode).json({
    statusCode,
    toast,
    message,
    data,
  });
}
