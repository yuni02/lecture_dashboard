import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // 따옴표 escape 규칙 비활성화
      "react/no-unescaped-entities": "off",
      // 사용하지 않는 변수 경고만 표시 (에러로 처리 안함)
      "@typescript-eslint/no-unused-vars": "warn",
      // any 타입 사용 허용
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
