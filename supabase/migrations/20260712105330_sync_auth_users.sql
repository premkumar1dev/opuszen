-- Alter password column to have default empty string
ALTER TABLE public.users ALTER COLUMN password SET DEFAULT '';

-- Create trigger function to sync new auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, password, name, phone_number, account_balance, total_orders, total_spent)
  VALUES (
    new.id,
    new.email,
    '', -- Empty password for auth-based users
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    0.00,
    0,
    0.00
  )
  ON CONFLICT (username) DO UPDATE
  SET id = EXCLUDED.id,
      name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
