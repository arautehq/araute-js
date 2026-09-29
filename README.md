# @araute/js

SDK de navegador da Araute para uma coisa só: montar o campo de cartão do checkout transparente na sua página. Todo o resto (criar o `PaymentIntent`, Pix, consultar status, conciliar) é feito pela API pública, do seu backend, com a chave secreta.

Guia completo, com exemplo de ponta a ponta: https://docs.araute.com/guias/checkout-transparente

Sem dependência em tempo de execução. O pacote traz um build ESM, para empacotadores, e um bundle global, para uso direto por `<script>`. O número do cartão nunca passa pelo seu backend nem por este SDK: ele é digitado num formulário seguro, dentro de um iframe da instituição parceira.

## Instalação

```bash
pnpm add @araute/js
```

Com npm: `npm install @araute/js`.

Sem empacotador, direto de `js.araute.com`; o SDK fica disponível como `Araute`:

```html
<script src="https://js.araute.com/araute.global.js"></script>
```

## Modelo do `client_secret`

1. O seu backend cria o `PaymentIntent` (`POST /v1/payment_intents`, com a chave secreta e `payment_method_types: ["card"]`) e recebe um `client_secret`.
2. O backend entrega só o `client_secret` à página do comprador, nunca a chave secreta.
3. O navegador usa o `client_secret` só para montar e renovar o formulário de cartão.

O `client_secret` viaja sempre no header `Authorization`, nunca na URL. Não o coloque em query string nem no fragmento (`#`) da sua página: ele acabaria no `Referer`, em log de servidor e no histórico do navegador.

## Uso

```html
<div id="card"></div>
```

```js
import { Araute, ArauteError } from '@araute/js'

const araute = Araute(clientSecret)

try {
  await araute.mountCard('#card', {
    onResult: (result) => {
      // result.paid === true: o pagamento foi aprovado no navegador do comprador.
      // Troque a tela. Não libere o pedido aqui: quem libera é o webhook no seu backend.
      showThanks(result.paid)
    },
    onError: (error) => {
      // Só falhas da renovação automática, depois da montagem.
      showError(error.code)
    },
  })
} catch (error) {
  if (error instanceof ArauteError) showError(error.code)
}
```

`mountCard` devolve `{ unmount }`; `araute.unmount()` desmonta tudo que aquela instância montou. Chame ao sair da tela numa SPA.

### O que o `mountCard` faz por você

1. Confirma o `PaymentIntent` com o `client_secret`, a partir do navegador do comprador, para que a análise antifraude receba o IP real dele.
2. Monta dentro do seu elemento o formulário seguro: campos de cartão, botão de pagar e área de erro.
3. O comprador digita dentro do iframe; o número do cartão nunca toca a sua página.
4. Renova o formulário antes dos 15 minutos de validade, adiando enquanto a aba estiver oculta e refazendo na hora se o envio pegar um formulário vencido. O que o comprador já digitou é preservado.
5. Entrega o resultado em `onResult`.

## `onResult` não é confirmação de pagamento

`result` é o que o formulário devolve no navegador do comprador. Serve para trocar a tela, e só: um navegador é controlado por quem está do outro lado.

A confirmação definitiva é o webhook `payment_intent.succeeded` no seu backend, ou um `GET /v1/payment_intents/{id}` com a sua chave secreta. Libere o produto ou serviço lá, nunca aqui.

## Opções do `mountCard`

| Opção | Para quê |
| --- | --- |
| `paymentButtonLabel` | Texto do botão de pagar (padrão: `Confirmar pagamento`) |
| `placeholders` | Placeholders dos campos (`pan`, `expiryDate`, `securityCode`) |
| `theme` | `'classic'` carrega o tema pronto do formulário seguro; `'none'` deixa o CSS por sua conta |
| `scriptSrc` | Sobrescreve a URL do script do formulário (só para ambiente próprio) |

## Erros

Todo erro é um `ArauteError`, com `code` (estável), `message` e, quando houver, `status`, `traceId` e `cause`.

Lançados como exceção por `Araute(...)` ou por `await mountCard(...)`, antes de o formulário aparecer:

| `code` | Quando acontece |
| --- | --- |
| `invalid_client_secret` | O `client_secret` não tem o formato esperado. |
| `mount_target_not_found` | O seletor passado a `mountCard` não existe na página. |
| `network_error` | A chamada à API da Araute não completou. |
| `api_error` | A API da Araute respondeu com erro. |
| `unexpected_next_action` | O `PaymentIntent` não está pronto para receber cartão. |
| `krypton_load_failed` | O script do formulário de cartão não carregou. |
| `krypton_unavailable` | O formulário de cartão não ficou disponível na página. |

Entregue em `onError` depois de montado, quando a renovação automática do formulário falha:

| `code` | Quando acontece |
| --- | --- |
| `api_error` | A API da Araute recusou a renovação. `status` 409 quando o `PaymentIntent` esgotou os 20 formulários ou não está mais aguardando o cartão. |
| `network_error` | A chamada de renovação não completou. |
| `refresh_failed` | Qualquer outra falha na renovação. |

Em qualquer um deles, crie um `PaymentIntent` novo e monte de novo.

## Ambiente de teste

Não há host separado: o modo de teste ou produção vem do `client_secret`, que herda o modo da chave que criou o `PaymentIntent`. Crie o `PaymentIntent` com `sk_test_` para testar. `apiBase` só existe para apontar o SDK a um ambiente próprio.

## Build

```bash
pnpm install
pnpm build      # dist/index.js (ESM), dist/araute.global.js (global), dist/index.d.ts
pnpm typecheck
```

## Licença

MIT.
