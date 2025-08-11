import { Response } from 'express';
import { anyObject, ResponseParams } from '../@types';


export const sendResponse = ({
  res,
  message,
  statusCode = 200,
  data,
  errors,
}: ResponseParams): Response => {
  const response: anyObject = {
    success: statusCode < 400,
    message,
  };

  if (errors) {
    response.errors = errors;
  } else if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};
