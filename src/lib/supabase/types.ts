/**
 * Minimal Supabase database type — enough for the query builder to accept
 * our row shapes. Replace with generated types once the schema is stable:
 * `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts`
 */
export interface Database {
  public: {
    Tables: {
      scenarios: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      scenario_versions: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      clips: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
