import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
} );

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL || '';
  return `${publicUrl}/${key}`;
}
