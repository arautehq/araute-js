window.__cspViolations = []
document.addEventListener('securitypolicyviolation', (event) => {
  const violation = {
    violatedDirective: event.violatedDirective,
    effectiveDirective: event.effectiveDirective,
    blockedURI: event.blockedURI,
    sourceFile: event.sourceFile,
  }
  window.__cspViolations.push(violation)
  console.log('[csp-probe]', JSON.stringify(violation))
  const item = document.createElement('li')
  item.textContent = JSON.stringify(violation)
  document.getElementById('violations').appendChild(item)
})
