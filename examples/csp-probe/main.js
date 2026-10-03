const params = new URLSearchParams(location.search)
const output = document.getElementById('result')
const show = (label, value) => {
  output.textContent = label + ': ' + JSON.stringify(value, null, 2)
  console.log('[csp-probe]', label, JSON.stringify(value))
}

Araute(params.get('client_secret'), { apiBase: params.get('api_base') ?? 'https://api.araute.com' })
  .mountCard('#card', {
    theme: params.get('theme') === 'none' ? 'none' : 'classic',
    onResult: (result) => show('onResult', result),
    onError: (error) => show('onError', { code: error.code, message: error.message }),
  })
  .then(() => show('mountCard', 'montado'))
  .catch((error) => show('mountCard erro', { code: error.code, message: error.message }))
