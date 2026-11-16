import { z } from 'zod';

export const donneeLineageSchema = z.object({
  id: z.string().uuid(),
  entiteType: z.string(),
  entiteId: z.string().uuid(),
  operation: z.enum(['insert', 'update', 'upsert']),
  importLotId: z.string().uuid().optional(),
  source: z.object({
    type: z.string(),
    ref: z.string(),
  }),
  transformations: z.array(z.string()).default([]),
  cleRapprochement: z.string(),
  horodatage: z.string(),
  decideur: z.enum(['systeme', 'manuel']).default('systeme'),
});
export type DonneeLineage = z.infer<typeof donneeLineageSchema>;
