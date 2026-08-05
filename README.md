# @araute/js

SDK de navegador da Araute para **uma coisa só**: montar o campo de cartão do checkout transparente
(SmartForm da Lyra/PayZen, via Krypton) na sua página. Todo o resto — criar o `PaymentIntent`, Pix,
consultar status, conciliar — é a API pública, feita do seu backend com a `sk_`. Veja a referência em
https://docs.araute.com.

Zero dependência de runtime; build ESM (para bundlers) e um bundle global IIFE (para `<script>` direto).
Nenhum dado de cartão passa pelo seu backend nem por este SDK: o PAN/CVV vai do iframe do SmartForm
direto para a Lyra.

## Instalação

```bash
npm install @araute/js
```

Ou via `<script>`, direto de `js.araute.com`:

```html
<script src="https://js.araute.com/araute.global.js"></script>
<script>
  const araute = Araute('pi_..._secret_...')
</script>
```

## Modelo (client_secret, como o Stripe)

1. Seu backend cria o `PaymentIntent` (`POST /v1/payment_intents`, com sua `sk_`, `payment_method_types: ["card"]`) e recebe um `client_secret`.
2. Seu backend entrega esse `client_secret` para a página do comprador (nunca a `sk_`).
3. O navegador do comprador usa o `client_secret` só para mintar e re-mintar o SmartForm — mais nada.

O `client_secret` viaja sempre no header `Authorization`, nunca na URL. Não o coloque em query string nem
no fragmento (`#`) da sua página: ele acabaria em `Referer`, em log de servidor e no histórico do navegador.

## Uso

```html
<div id="card"></div>
```

```js
import { Araute } from '@araute/js'

const araute = Araute(clientSecret)

await araute.mountCard('#card', {
  onResult: (result) => {
    // result.paid === true  -> o provedor aprovou no navegador do comprador.
    // Troque a tela. NÃO libere o pedido aqui: quem libera é o webhook no seu backend.
    showThanks(result.paid)
  },
  onError: (error) => {
    // Falha do SDK: alvo inexistente, Krypton indisponível, re-mint do token falhou.
    showError(error.code, error.message)
  },
})
```

`mountCard` devolve `{ unmount }`; `araute.unmount()` desmonta tudo que aquela instância montou (chame ao
sair da tela em SPA).

### O que o `mountCard` faz por você

1. `POST /v1/payment_intents/{id}/confirm` com o `client_secret` (cartão, sem token) — o mint sai com o IP
   real do comprador, que é o que o antifraude do provedor precisa.
2. Injeta os campos (`kr-pan`, `kr-expiry`, `kr-security-code`, botão e área de erro) dentro do seu
   elemento e carrega o Krypton com a `public_key` devolvida.
3. O comprador digita **dentro dos iframes do PayZen** e submete; o PAN nunca toca a sua página.
4. Re-minta o `form_token` (`POST .../refresh_card_token`) antes dos 15 minutos de validade, adiando
   enquanto a aba estiver oculta e refazendo na hora se o submit pegar um token já expirado (`PSP_108`).
   O que o comprador já digitou é preservado.
5. Entrega o resultado do provedor em `onResult`.

## `onResult` não é confirmação de pagamento

`result` é o que o Krypton devolve **no navegador do comprador** — serve para trocar a tela, e só. Um
navegador é controlado por quem está do outro lado.

A confirmação definitiva é o webhook `payment_intent.succeeded` / `charge.succeeded` no seu backend, ou
um `GET /v1/payment_intents/{id}` com a sua `sk_`. Libere produto/serviço lá, nunca aqui.

## Opções do `mountCard`

| Opção | Para quê |
|---|---|
| `paymentButtonLabel` | Texto do botão de pagar (padrão: `Confirmar pagamento`) |
| `placeholders` | Placeholders dos campos (`pan`, `expiryDate`, `securityCode`) |
| `theme` | `'classic'` carrega o tema pronto do PayZen; `'none'` deixa o CSS por sua conta |
| `scriptSrc` | Sobrescreve a URL do Krypton (só para ambiente próprio) |

## Erros

```js
import { ArauteError, ArauteErrorCode } from '@araute/js'

try {
  await araute.mountCard('#card', { onResult })
} catch (error) {
  if (error instanceof ArauteError && error.code === ArauteErrorCode.MountTargetNotFound) {
    // ...
  }
}
```

`ArauteError` tem `code` (estável), `message` (pt-BR), `status` e `cause` quando existir. Falhas que
acontecem depois da montagem (re-mint do token, por exemplo) chegam em `onError`, não como exceção.

## Ambiente de teste

Não há host separado: o modo (test/live) vem do `client_secret`, que herda o modo da chave que criou o
`PaymentIntent`. Crie o intent com `sk_test_` e use os cartões de teste do provedor. `apiBase` só existe
para apontar o SDK a um ambiente próprio.

## Build

```bash
pnpm install
pnpm build      # dist/index.js (ESM), dist/araute.global.js (IIFE), dist/index.d.ts
pnpm typecheck
```
