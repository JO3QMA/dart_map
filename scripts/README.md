# scripts

- **generateRegionsFromGeolonia.ts** … Geolonia 住所データから地域データを取得し、`seed.sql`（D1 用スキーマ＋データ）を 1 ファイルで生成する。
- **seed.sql** … 上記スクリプトの出力。ローカル／リモートともこの 1 ファイルを `wrangler d1 execute` で流す。

実行手順はプロジェクトルートの [README.md](../README.md) を参照。
