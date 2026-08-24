ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS meal_type text NOT NULL DEFAULT 'pranzo';
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;
ALTER TABLE public.meals ADD CONSTRAINT meals_meal_type_check CHECK (meal_type IN ('colazione','pranzo','snack','cena'));