import { URL } from 'url';
import { BadRequestException } from '@nestjs/common';

export function normalizeUrl(url: string): string {
  try {
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);

    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.hostname}${path}`;
  } catch {
    throw new BadRequestException(`Invalid repoUrl provided: ${url}`);
  }
}