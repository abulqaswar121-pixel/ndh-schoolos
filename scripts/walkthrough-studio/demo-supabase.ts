// In-memory branding reads for the recording harness. No network client exists here.
const forbidden = () => {
  throw new Error("Recording only: account/branding writes are disabled.");
};
export const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { slug: "demo-academy" }, error: null }) }),
    }),
    upsert: forbidden,
  }),
  auth: { resetPasswordForEmail: forbidden },
};
