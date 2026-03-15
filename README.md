## ダーツの旅（dart_map）

ランダムに選ばれた地点をもとに、バーチャルな「ダーツの旅」を楽しむ Web アプリケーションです。

---

### ローカル開発環境の構築から実行まで

#### 前提

- **Node.js** 18 以上（推奨: 20 以上）
- **npm** 9 以上

#### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <リポジトリURL>
cd dart_map
npm install
```

#### 2. D1 データベースの準備（初回のみ）

**ローカル開発用**の D1 は `wrangler dev` 実行時に自動作成されます。  
**リモート（本番）** に D1 を作る場合のみ、以下を実行します。

```bash
npx wrangler d1 create dart-map-regions
```

表示された `database_id` を `wrangler.toml` の `[[d1_databases]]` の `database_id` に設定します。

#### 3. シードデータの生成と投入

地域データ（都道府県・市区町村）は Geolonia 住所データから生成し、SQL で D1 に投入します。

```bash
# シード用 SQL を生成（scripts/seed.sql）
npm run generate:seed

# ローカル D1 に投入
npx wrangler d1 execute dart-map-regions --local --file=./scripts/seed.sql
```

リモート D1 に投入する場合:

```bash
npx wrangler d1 execute dart-map-regions --remote --file=./scripts/seed.sql
```

#### 4. ビルドと開発サーバーの起動

```bash
npm run dev:wrangler
```

- フロント＋Worker（API）がまとめて起動します。
- ブラウザで表示される URL（例: `http://localhost:8788`）にアクセスして動作を確認します。

#### 5. よく使うコマンド

| コマンド                | 説明                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`           | Vite のみでフロント開発（API は別途 Worker が必要）                                          |
| `npm run build`         | シード生成 ＋ TypeScript ビルド ＋ Vite ビルド                                               |
| `npm run generate:seed` | `scripts/seed.sql` を再生成（上書き時は `FORCE_REGENERATE_REGIONS=1 npm run generate:seed`） |
| `npm run dev:wrangler`  | ビルド後に Wrangler 開発サーバー起動（推奨）                                                 |

---

### 利用データについて

本アプリケーションでは、住所情報として **Geolonia 住所データ** を利用しています。

- データ提供元: Geolonia 住所データ
- ライセンス: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

利用にあたっては、上記ライセンスおよび Geolonia の利用規約に従っています。
