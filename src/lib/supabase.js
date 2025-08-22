import { createClient } from '@supabase/supabase-js'

// 👇 paste your own keys here
const supabaseUrl = "https://srvxwyeoxsdnloynugxt.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydnh3eWVveHNkbmxveW51Z3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzgzNTcsImV4cCI6MjA3MTQxNDM1N30.Mk2-Q_dOO1SgZQMbe8y07AWgzL9ebptb8hBWlqZEHKA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
