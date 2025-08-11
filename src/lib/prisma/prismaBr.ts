import type { PrismaClient as ImportedPrismaClient } from '@prisma-br/client';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient: RequiredPrismaClient } = require('@prisma-br/client');

const _PrismaClient: typeof ImportedPrismaClient = RequiredPrismaClient;

class PrismaClient extends _PrismaClient {}

const prismaBr = new PrismaClient();

export default prismaBr;
