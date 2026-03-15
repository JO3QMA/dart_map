# シェアボタンで使用しているロゴの入手先とライセンス

本アプリのシェアボタンでは、Mastodon および Misskey のロゴを使用しています。  
Web サイトやアプリの UI に組み込む際は、以下のガイドラインに従って利用しています。

---

## 1. Mastodon（マストドン）のロゴ

- **公式配布元:** [Mastodon Brand Assets (joinmastodon.org)](https://joinmastodon.org/branding)
- **ライセンス・規定:**
  - ロゴは **Mastodon gGmbH** によって商標登録されています。
  - **許可されること:** Mastodon 上のアカウントへのリンクや、投稿（トゥート）の共有を目的としたボタンへの使用。
  - **禁止事項:** ロゴの変形、色の変更、他の要素との重ね合わせ、Mastodon 公式と誤認させるような商用利用。
- **推奨カラー:** Logo Blue `#6364FF`、または白抜き・黒。

本アプリでは、シェア用リンク（donshare.net）へのボタンとして使用しており、上記の許可範囲内で利用しています。  
アイコンは [Simple Icons](https://simpleicons.org/) の SVG を参照して実装しています。

---

## 2. Misskey（ミスキー）のロゴ

- **公式配布元:** [Misskey Hub - 素材データ](https://misskey-hub.net/ja/docs/for-users/assets/)（[Brand Assets（英語）](https://misskey-hub.net/en/brand-assets/)）
- **ライセンス・規定:**
  - ロゴの著作権は Misskey の開発者（syuilo 氏）に帰属しますが、**Misskey を紹介・言及する目的**であれば自由に使用できます。
  - **許可されること:** シェアボタン、紹介記事、プロフィールへのリンクなど。
  - **禁止事項:** 著しい改変（色変更やアスペクト比の変更）、公式と偽る行為、公序良俗に反するサイトでの使用。
- **形式:** SVG および PNG 形式が配布されています。
- **ブランドカラー:** 公式では `#A1CA03` などが案内されています。

本アプリでは、シェア用リンク（misskeyshare.link）へのボタンとして使用しており、紹介・言及目的の範囲内で利用しています。  
アイコンは [Simple Icons](https://simpleicons.org/) の Misskey 用 SVG を参照して実装しています。

---

## 3. 参照しているアイコンセット

| サービス名       | Mastodon | Misskey | 備考                                             |
| ---------------- | -------- | ------- | ------------------------------------------------ |
| **Simple Icons** | あり     | あり    | 本アプリではここから SVG path を参照しています。 |

- **Simple Icons:** [https://simpleicons.org/](https://simpleicons.org/)  
  両方のロゴを同じトーン（SVG）で利用でき、ブランドカラーの 16 進数コードも確認できます。

---

## 4. 実装時の配慮

- **余白（クリアランス）:** ロゴの周囲に余白を設け、他の要素と接触しないように配置しています。
- **アクセシビリティ:** 各ボタンに `aria-label` および `title` を付与し、スクリーンリーダーとツールチップに対応しています。
- **リンク先:** 特定の 1 インスタンスに限定せず、[donshare.net](https://donshare.net/)（Mastodon）および [misskeyshare.link](https://misskeyshare.link/)（Misskey）の共有用インテントへリンクしており、利用者が自分のサーバーを選べるようにしています。

---

上記の規定に従い、本アプリでは Mastodon および Misskey のロゴをシェアボタンに使用しています。
