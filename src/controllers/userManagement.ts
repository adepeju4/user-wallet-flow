import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { NotFoundError, UserError, ValidationError } from "../error";
import logger from "../utils/logger";
import { sendResponse } from "../utils/sendResponse";




export const updateUserTag = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tag = req.body.tag;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        publicHandle: true,
      },
    });

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    const existingTag = await prisma.user.findFirst({
      where: {
        publicHandle: tag,
        id: { not: userId },
      },
    });

    if (existingTag) {
      return next(new UserError('Tag already taken'));
    }

    // Update user with new public tag
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { publicHandle: tag },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        publicHandle: true,
      },
    });

    logger.info('Public tag generated/updated');

    return sendResponse({
      res,
      statusCode: 200,
      message: user.publicHandle
        ? 'Public tag updated successfully'
        : 'Public tag created successfully',
      data: {
        user: updatedUser,
        publicTag: tag,
      },
    });
  } catch (error: any) {
    logger.error('Failed to generate public tag');
    return next(error);
  }
};


export const getUserTag =   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          publicHandle: true,
        },
      });

      if (!user) {
        return next(new NotFoundError('User not found'));
      }

      return sendResponse({
        res,
        statusCode: 200,
        message: 'Public tag retrieved successfully',
        data: {
          user: user,
          hasPublicTag: !!user.publicHandle,
        },
      });
    } catch (error: any) {
      logger.error('Failed to retrieve public tag');
      return next(error);
    }
}
  
export const validateTag =   async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tag } = req.query;
      const currentUserId = req.user!.id;

      if (!tag) {
        return next(new ValidationError('Public tag is required'));
      }

      const user = await prisma.user.findFirst({
        where: {
          publicHandle: String(tag),
          id: { not: currentUserId },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          publicHandle: true,
        },
      });

      const isValid = !!user;

      return sendResponse({
        res,
        statusCode: 200,
        message: isValid ? 'Valid recipient' : 'Recipient not found',
        data: {
          isValid,
          recipient: isValid
            ? {
                name: `${user!.firstName} ${user!.lastName}`,
                publicTag: user!.publicHandle,
              }
            : null,
        },
      });
    } catch (error: any) {
      logger.error('Failed to validate public tag');
      return next(error);
    }
  }