-- Add new members to characters table

insert into public.characters (id, name, color_theme, avatar_url, chzzk_url) values
('cherii', '체리', 'cherii', 'https://nng-phinf.pstatic.net/MjAyNjAxMTlfMjA3/MDAxNzY4NzU0MDQ5Njg1.SE9NeW02-JCF2Ri0c6ROWa5qxvrIV1MQUw9zX7VlSysg.3c4uo89fihxlx-vpctMdFNhqh-Q70cPxxHlhbNX3YrQg.JPEG/image.jpg', 'https://chzzk.naver.com/c3702f874360da3f81ae24ddf1f0343e'),
('aella', '아엘라', 'aella', 'https://nng-phinf.pstatic.net/MjAyNjAxMTlfMjcx/MDAxNzY4NzUwNjM2MjM5.s3Qm6eqY6FcdmaJE5IXmooOrRhncvftpvr9isR0RjaYg.Cvh3ZU41QnDiteSFNiaeGUUCoSu6wdGzOBg4VZV9r8Eg.JPEG/image.jpg', 'https://chzzk.naver.com/9d1aaaca8c18fd5e4d25ea19710ad789')
on conflict (id) do update set
    name = excluded.name,
    color_theme = excluded.color_theme,
    avatar_url = excluded.avatar_url,
    chzzk_url = excluded.chzzk_url;
