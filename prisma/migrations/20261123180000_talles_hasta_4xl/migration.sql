-- Talles hasta 4XL: después de "XL" se agregan 2XL, 3XL y 4XL (solo en los productos que todavía no los tienen)
UPDATE "Producto"
SET "talles" = "talles"[1:array_position("talles", 'XL')] || ARRAY['2XL', '3XL', '4XL'] || "talles"[array_position("talles", 'XL') + 1:]
WHERE 'XL' = ANY("talles") AND NOT ('2XL' = ANY("talles"));
