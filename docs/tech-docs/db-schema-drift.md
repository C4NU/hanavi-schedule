# DB 스키마 기준 불일치 조사 (2026-08-21)

운영 Supabase(`koqhvkhsnunqpnjcgxpa`)를 PostgREST 스펙·행 수 실측으로 대조한 결과.

## 핵심 결론

**운영 DB는 SQL Editor 수동 반영으로 구성되어 있고, `supabase/migrations/` 이력과 동기화되어 있지 않다.**

- `supabase migration list`: 타임스탬프 마이그레이션 11개 전부 `remote: ""` (원격 이력 없음)
- `migration_*.sql` 10개는 CLI 네이밍 패턴(`<timestamp>_name.sql`) 불일치로 인식 자체가 안 됨
- → **CLI `db push` 사용 불가.** 스키마 변경은 SQL Editor 직접 실행이 현실 기준.
- `schema.sql`, `setup_full.sql`, `remote_schema.sql` 덤프도 운영과 불일치 (아래 참조)

## 발견된 불일치

| 항목 | 상태 | 처리 |
|---|---|---|
| `schedule_items.category` 누락 | 코드(관리자 칩, 씨미 cron)는 사용하는데 운영 DB에 컬럼 없음 → 저장/동기화 실패 | `20260821_add_schedule_items_category.sql`로 수정 + `saveScheduleToSupabase`/`getScheduleFromSupabase` 매핑 추가 |
| `schedules.merged_days` | 운영 DB에만 존재, 코드 미사용 | 유물 — 유지 (삭제 시 기존 데이터 소실 우려, 영향 없음) |
| 레거시 테이블 `songs`(3행) / `subscriptions`(13행) / `user_fcm_tokens`(0행) | 앱 코드 미사용 | `20260821_drop_legacy_tables.sql` — SQL Editor에서 실행 |

## 운영 DB 실측 스냅샷 (public 스키마)

- `characters` 18컬럼 — 코드 사용 필드 전부 존재
- `schedules` 6컬럼 — id, week_range, is_active, created_at, updated_at, merged_days
- `schedule_items` 10컬럼 — category 추가 전 기준
- `schedule_item_memos` 4컬럼, `user_roles` 4컬럼, `global_settings` 3컬럼(1행)

## 향후 규칙

1. **운영 DB가 유일한 기준.** 로컬 SQL 덤프 파일은 참고용으로만.
2. 스키마 변경 시: `migrations/`에 타임스탬프 파일 추가 → **SQL Editor에서 동일 내용 실행** → 이 문서의 스냅샷 갱신.
3. CLI push를 쓰려면 `supabase migration repair`로 기존 11개를 applied 표기한 뒤 시작해야 함 (별도 작업).
4. `subscriptions` DROP 전 백업 권장 (푸시 endpoint 키 포함, 13행).
