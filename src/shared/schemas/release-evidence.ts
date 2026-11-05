import { z } from 'zod';

const PEOPLE_PER_LANGUAGE = 5;
const SUCCESS_RATE = 0.8;

const Pending = z.strictObject({ status: z.literal('pending') });

const Usability = z
  .strictObject({
    status: z.literal('passed'),
    en: z.number().int(),
    th: z.number().int(),
    successes: z.number().int(),
  })
  .refine(
    (u) =>
      u.en >= PEOPLE_PER_LANGUAGE &&
      u.th >= PEOPLE_PER_LANGUAGE &&
      u.successes >= (u.en + u.th) * SUCCESS_RATE,
    'Needs five observed people per language and four of five succeeding',
  );

const Review = z.strictObject({
  status: z.literal('passed'),
  reviewers: z.array(z.string().min(1)).min(2),
});

/** Human gates. Automated tests can never fill these in. */
export const ReleaseEvidenceSchema = z.strictObject({
  usability: z.union([Pending, Usability]),
  languageReview: z.union([Pending, Review]),
});
