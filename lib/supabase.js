import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cexsawqxlkjdcfutbqws.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNleHNhd3F4bGtqZGNmdXRicXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk1MDAsImV4cCI6MjA4OTMyNTUwMH0.v2wFKQSv1oOJz8s02xIvHhi9_NeTxLkbTiUwxdN6xj8";

export const supabase = createClient(supabaseUrl, supabaseKey);