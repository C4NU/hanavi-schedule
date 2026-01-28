-- Function to decrement sort_order of remaining characters when one is removed
-- This fills the gap left by a deleted member (e.g. if 2 is deleted, 3 -> 2, 4 -> 3...)

CREATE OR REPLACE FUNCTION decrement_sort_orders(removed_order INT)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET sort_order = sort_order - 1
  WHERE sort_order > removed_order;
END;
$$ LANGUAGE plpgsql;
