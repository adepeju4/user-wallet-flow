import { Response } from "express";

export type anyObject = Record<string, unknown>;

export interface ResponseParams {
  res: Response;
  message?: string;
  data?: unknown;
  statusCode?: number;
  errors?: Record<string, unknown>;
}
