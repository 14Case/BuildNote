import { baremeSchema, type Bareme, type TypeBareme } from '@buildnote/shared';

/** Convertit une ligne `bareme` (numeric → string en base) en objet du modèle canonique. */
export function toBareme(row: {
  type: string;
  min: string | number;
  max: string | number;
  pas: string | number | null;
}): Bareme {
  return baremeSchema.parse({
    type: row.type as TypeBareme,
    min: Number(row.min),
    max: Number(row.max),
    pas: row.pas == null ? null : Number(row.pas),
  });
}
