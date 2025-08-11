import type { PrismaClient as ImportedPrismaClient } from '@prisma-arg/client';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient: RequiredPrismaClient } = require('@prisma-arg/client');

const _PrismaClient: typeof ImportedPrismaClient = RequiredPrismaClient;

class PrismaClient extends _PrismaClient {}

const prismaArg = new PrismaClient();

export default prismaArg;
