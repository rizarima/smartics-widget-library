// plain constants shared by the server actions, the cron cleanup route, and client components
// (kept out of build-actions.js because a 'use server' file may only export async functions)
export const BUILD_BUCKET = 'widget-builds';
export const BATCH_SIZE = 40; // widgets per batch; keeps each server-action call well under a serverless timeout
export const RETENTION_DAYS = 2; // ZIP auto-expires after this many days (free-plan Storage stays small)
