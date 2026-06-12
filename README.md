# 料理素材プランナー

ポケモンスリープの料理レシピをもとに、料理ごとの作成回数または週間献立から必要食材を集計する静的Webアプリです。

## 技術構成

- Vite
- React
- TypeScript
- GitHub Pages project site
- レシピデータ: `public/recipes.json`
- ユーザー入力: ブラウザのLocalStorage

## 開発

```bash
npm install
npm run dev
```

## 検証

```bash
npm run validate:recipes
npm run build
```

## レシピデータ

公開アプリが読み込むレシピデータは `public/recipes.json` です。

公開用JSONには、取得元URL・取得日時・スクレイピング関連情報を含めません。レシピ取得スクリプトは、この公開リポジトリとは別のprivate repositoryで管理する前提です。

## デプロイ

`main` ブランチへのpushでGitHub Actionsが以下を実行します。

1. 依存関係のインストール
2. `recipes.json` の検証
3. アプリのビルド
4. GitHub Pagesへのデプロイ

公開URLは以下のproject site形式を想定します。

```text
https://<user>.github.io/<repository>/
```
