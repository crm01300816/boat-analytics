# GitHub Pagesへの公開

環境のPublishは開発環境の保存です。アプリの公開にはGitHub側の操作が必要です。
この変更ではGitHubへのpushやPages設定の変更をまだ実行していません。

1. ローカルで `node --test tests/*.test.mjs`、`node scripts/build-site.mjs` を実行します。
2. 今回の追加ファイルをGitHubの `crm01300816/boat-analytics` のmainへ反映します。通常はブランチとPRでレビューしてマージします。
3. GitHubでリポジトリの **Settings → Pages → Build and deployment → Source → GitHub Actions** を選択します。
4. **Actions → Test and publish GitHub Pages** を確認します。設定を後から行った場合は **Run workflow → main** で実行します。
5. testとdeployが成功した後、**Settings → Pages → Visit site** または成功したdeployのURLを開きます。実際の公開URLはこの表示で確認してください。
6. AndroidのChrome / iPhoneのSafariから開き、日付、場・レース切替、表の横スクロール、予想、エラー時の再試行を確認します。ホーム画面への追加はブラウザのメニューで行えます。オフライン対応PWAではありません。

Actionsは既存機能と評価処理のテスト後、`_site` の5ファイルだけをPagesへ渡します。ZIP、評価用データ、スナップショット、テストは配信しません。ブラウザ用アプリのビルド依存は増やしていません。

## 公開できない場合

- Pagesの設定が表示されない場合: 管理権限と契約プランを管理者に確認します。Privateリポジトリを無断でPublicへ変更しないでください。
- Actionsが停止している場合: **Settings → Actions → General** でActionsと使用アクションの許可を確認します。組織のポリシーがある場合は管理者へ依頼します。
- github-pagesの承認待ちの場合: **Settings → Environments → github-pages** の保護ルールに従って承認します。
- 外部CSVが失敗する場合: 実機の開発者ツールでHTTP status/CORSを確認します。主配信元は `boatracecsv.github.io`、代替は `raw.githubusercontent.com` です。未配信のレース情報は架空の数値で補いません。
- クラウドから公開状況を調べるには、ネットワーク許可に `api.github.com` と `crm01300816.github.io` が必要です。Git読取権限だけではPages設定のAPI権限は証明できません。既存認証で再試行し、認証が必要ならGitHubの接続設定で許可してください。トークンをチャットへ貼らないでください。

2026-10-29の確認では主CSV配信元の接続は復旧しました。一方、GitHub APIと公開サイトの接続はクラウドの通信ポリシーにより403で、Pages設定と公開URLは未確認です。
