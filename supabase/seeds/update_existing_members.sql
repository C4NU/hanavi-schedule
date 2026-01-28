-- Update existing members with default time, regular holidays, and color codes

-- Varessa
UPDATE public.characters
SET 
    default_time = '08:00',
    regular_holiday = 'THU,SUN',
    color_bg = '#F8F7FE',
    color_border = '#6A6792'
WHERE id = 'varessa';

-- Cherii
UPDATE public.characters
SET 
    default_time = '10:00',
    regular_holiday = NULL,
    color_bg = '#FFF1D6',
    color_border = '#E38D53'
WHERE id = 'cherii';

-- Nemu
UPDATE public.characters
SET 
    default_time = '12:00',
    regular_holiday = 'MON,THU',
    color_bg = '#E1ECFD',
    color_border = '#6994F7'
WHERE id = 'nemu';

-- Maroka
UPDATE public.characters
SET 
    default_time = '14:00',
    regular_holiday = 'TUE,SAT',
    color_bg = '#F2FFFC',
    color_border = '#7ACFB2'
WHERE id = 'maroka';

-- Mirai
UPDATE public.characters
SET 
    default_time = '15:00',
    regular_holiday = 'MON,THU',
    color_bg = '#F0EDFD',
    color_border = '#765FF6'
WHERE id = 'mirai';

-- Aella
UPDATE public.characters
SET 
    default_time = '17:00',
    regular_holiday = NULL,
    color_bg = '#D4D4E4',
    color_border = '#6A7196'
WHERE id = 'aella';

-- Ruvi
UPDATE public.characters
SET 
    default_time = '19:00',
    regular_holiday = 'WED,SUN',
    color_bg = '#FDF2F4',
    color_border = '#DF3F58'
WHERE id = 'ruvi';

-- Iriya
UPDATE public.characters
SET 
    default_time = '24:00',
    regular_holiday = 'TUE,SAT',
    color_bg = '#D4D2D3',
    color_border = '#212221'
WHERE id = 'iriya';
