-- Function to increment sort_order of existing characters to make space for a new one
-- This is used when inserting a new member at a specific position (e.g. inserting at 2 shifts 2, 3, 4... up by 1)

CREATE OR REPLACE FUNCTION increment_sort_orders(start_order INT)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET sort_order = sort_order + 1
  WHERE sort_order >= start_order;
END;
$$ LANGUAGE plpgsql;
