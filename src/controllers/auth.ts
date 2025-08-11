import { NotFoundError, UserError, ValidationError } from "../error";
import logger from "../utils/logger";
import prisma from "../utils/prisma";
import bcrypt from 'bcrypt';
import { registerSchema } from "../validators/auth";
import { createChargebeeCustomer, createChargebeeVirtualBankAccount } from "../utils/chargebee";
import { generateWebToken } from "../utils/jwt";
import { sendResponse } from "../utils/sendResponse";
import { NextFunction, Request, Response } from "express";



export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, firstName, lastName, phoneNumber } = validatedData;

    logger.info('Signup attempt');

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new UserError('User with this email already exists'));
    }

    const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

    const customer = await createChargebeeCustomer({
      email,
      firstName,
      lastName,
      phoneNumber,
    });

  
    const virtualBankAccount = await createChargebeeVirtualBankAccount(customer.id, email);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phoneNumber,
        passwordHash,
        cbCustomerId: customer.id,
        wallet: {
          create: {
            balanceCents: 0,
            status: 'active',
            currency: 'USD',
            accountNumber: virtualBankAccount?.account_number || '',
            routingNumber: virtualBankAccount?.routing_number || '',
            bankName: virtualBankAccount?.bank_name || 'Chargebee Virtual Account',
            bankAddress: 'Virtual',
            bankCountry: 'US',
            bankCurrency: 'USD',
            cbVbaId: virtualBankAccount?.id,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    const token = generateWebToken(user.id, user.email);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return sendResponse({
      res,
      statusCode: 201,
      message: 'User created successfully',
      data: {
        user: userWithoutPassword,
        token,
        chargebeeCustomerId: customer.id,
      },
    });
  } catch (error: any) {
    logger.error('Signup failed');

    if (error.name === 'ZodError') {
      return next(
        new ValidationError(
          'Invalid input data: ' + error.errors.map((e: any) => e.message).join(', ')
        )
      );
    }

    return next(error);
  }
};

export const login =  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return next(new NotFoundError('User not found'));

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return next(new UserError('Invalid email or password'));
    }

    const token = generateWebToken(user.id, user.email);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error: any) {
    logger.error('Login failed');

    if (error.name === 'ZodError') {
      return next(
        new ValidationError(
          'Invalid input data: ' + error.errors.map((e: any) => e.message).join(', ')
        )
      );
    }

    return next(error);
  }
}