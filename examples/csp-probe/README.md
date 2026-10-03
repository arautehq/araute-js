# csp-probe

Ferramenta interna para medir os domínios que o formulário de cartão do `@araute/js` precisa na CSP do lojista. Não faz parte do pacote publicado.

```bash
pnpm build
node examples/csp-probe/server.mjs
```

Parâmetros da página: `client_secret`, `api_base` (padrão `https://api.araute.com`) e `theme` (`classic` ou `none`).

- Descoberta: `http://localhost:4321/?mode=discover&client_secret=...`. Usa `Content-Security-Policy-Report-Only` restritiva; os relatórios saem no stdout (`[csp-report]`) e acumulam em `http://localhost:4321/csp-reports`.
- Validação: `http://localhost:4321/?mode=enforce&client_secret=...`. Aplica a política de `policy.txt`; as violações aparecem na página e em `window.__cspViolations`.

O fluxo completo exige um `client_secret` real de `PaymentIntent` de teste: com um falso a confirmação falha e o script do formulário nunca é pedido.
