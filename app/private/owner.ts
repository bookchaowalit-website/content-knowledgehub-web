import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { readConfig, StoreReader, verifyAccess } from '@/lib/private';

/** The store reader for a verified owner request; anything else is a plain 404. */
export async function ownerReader(): Promise<{ reader: StoreReader; spaces: string[] }> {
  const config = readConfig();
  if (!config) notFound();
  const email = await verifyAccess((await headers()).get('cf-access-jwt-assertion'), config);
  if (!email) notFound();
  return { reader: new StoreReader(config), spaces: config.spaces };
}
