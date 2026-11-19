import { profiles } from './data.ts'
import type { Bowl, IngredientId, Level } from './types.ts'

const icons = {
  bell: '<path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3zm4 11h4M12 2v1"/>',
  storefront: '<path d="M3 10v10h18V10M2 10l2-6h16l2 6M2 10c0 3 4 3 5 0 1 3 4 3 5 0 1 3 4 3 5 0 1 3 5 3 5 0M9 20v-6h6v6M8 4l-1 6m9-6 1 6"/>',
  volume: '<path d="M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6"/>',
  star: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.2-.9z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  book: '<path d="M12 20c-2-2-5-3-9-2V5c4-1 7 0 9 2 2-2 5-3 9-2v13c-4-1-7 0-9 2V7"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15.5 10a3.5 3.5 0 1 0 0 4M7 12h6"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M8 3v5m8-5v5M4 10h16m-13 4h2m3 0h2m3 0h1m-11 3h2m3 0h2"/>',
  basket: '<path d="M3 10h18l-2 9H5zm5 0 4-6 4 6m-7 3v3m6-3v3"/>',
  menu: '<rect x="3.8" y="4" width="16.4" height="14" rx="2"/><path d="m8 18-2 3m10-3 2 3M8 8h8m-8 4h8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  lock: '<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V8a4 4 0 0 1 8 0v2m-4 4v2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4 2.2c-1 .7-1.5 1.2-1.5 2.5m0 3.3h.01"/>',
  trash: '<path d="M3 6h18m-15 0 1 14h10l1-14M9 6V3h6v3m-5 4v6m4-6v6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  ledger: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4m-4 5h4m-4 5h4m4-9h5m-5 4h5m-5 4h3"/>',
  mix: '<path d="M3 12h18c-1 5-4 8-9 8s-8-3-9-8zm5-2 5-7m0 7 5-6M5 16h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.7-.3-3.9-.9L4 21l1.2-4.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11.5h.01m4.5 0h.01m4.5 0h.01"/>',
}

export function icon(name: keyof typeof icons, size = 20): string {
  return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>'
}

const outlines = 'stroke="#5c3d2e" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"'

const dryStrips = (color: string, light: string) => `
  <path d="M9 29c7-3 5-14 18-15l3 4c-7 2-10 5-9 9l10-5 7 1-6 9-14 3-9-2z" fill="${color}"/>
  <path d="M13 30c7 3 4-10 15-12m-8 15c4-7 11-7 13-8m-7 9 5-3" fill="none" stroke="${light}"/>
  <path d="m8 22 3-5 6-2m18 1 4 4m-8 17 5-2" fill="none" stroke="${color}"/>`

const bottle = (liquid: string, label: string, top = '#efd18a') => `
  <path d="M19 9h10v8l4 6v16H15V23l4-6z" fill="${liquid}"/>
  <path d="M18 7h12v6H18z" fill="${top}"/>
  <path d="M15 24h18v10H15z" fill="${label}"/>
  <path d="M21 29h6m-8 8h10" fill="none" opacity=".55"/>`

const riceStrips = `
  <ellipse cx="24" cy="36" rx="18" ry="4" fill="#664b37" stroke="none" opacity=".2"/>
  <g stroke="#846f58" stroke-width=".65" stroke-opacity=".84">
    <path d="M3 31 7 26c8-2 13-11 28-15l3 2C25 17 18 29 7 31l-3 3Z" fill="#dcdacf" fill-opacity=".88"/>
    <path d="M12 10c7 7 15 7 20 13 4 5 6 10 12 15l-2 3c-7-4-10-13-13-15-7-6-15-6-19-13Z" fill="#eeeade" fill-opacity=".8"/>
    <path d="M43 18c-9 0-14 8-19 12-6 4-13 4-19 10l-2-3c6-7 14-7 19-10 5-4 13-12 22-12Z" fill="#f5f0e0" fill-opacity=".92"/>
    <path d="M4 19c10 3 14 0 24 5 8 4 12 4 17 3v3c-7 2-13-1-19-3-7-4-13-1-22-5Z" fill="#fcf9ed" fill-opacity=".83"/>
    <path d="M16 40c2-3 4-7 2-11-1-4-6-6-5-11 0-4 2-7 4-10l2 2c-2 3-4 5-3 9 0 3 4 6 5 9 2 5 1 8-2 13Z" fill="#fffbef" fill-opacity=".9"/>
    <path d="M25 7c3 5 4 7 2 13-2 5-1 8 3 11 2 3 3 6 3 10l-3-1c1-3-1-6-3-8-4-4-5-8-3-13 2-4 0-8-1-11Z" fill="#faf6e6" fill-opacity=".9"/>
    <path d="M7 15c8-4 16 1 23 0 4-1 7-4 9-6l2 2c-4 4-7 7-12 7-7 1-15-3-21 0Z" fill="#fffdf3"/>
    <path d="M10 34c6 1 8-2 12-6 4-3 5-5 12-6l2 2c-6 1-8 4-11 7-5 5-9 7-16 6Z" fill="#fefbef" fill-opacity=".93"/>
    <path d="M12 24c7-3 13-3 18 0 4 2 6 4 12 7l-1 2c-6-1-10-6-13-7-4-2-9-1-15 1Z" fill="#e6e8e0" fill-opacity=".72"/>
    <path d="M36 16c-5 5-3 10-6 15-2 3-6 5-10 7l1 2c6-2 11-5 12-9 4-6 1-10 5-13Z" fill="#fffdf3" fill-opacity=".9"/>
  </g>
  <path d="m8 15 4-.8m17 2.3 7-3m-12 2 .2 3.8M17 29l-3 5m21-5 4 2" fill="none" stroke="#fffef9" stroke-width=".8" stroke-opacity=".85"/>`

const ingredientArt: Record<IngredientId, string> = {
  rice: riceStrips,
  kumquat: '<path d="M23 17c0-6 5-9 12-9-1 5-6 9-12 9z" fill="#66945c"/><path d="M22 18c-3-3-2-7-1-9" fill="none"/><ellipse cx="19" cy="26" rx="10" ry="12" transform="rotate(24 19 26)" fill="#94ac64"/><circle cx="31" cy="29" r="10" fill="#f2ab4e"/><circle cx="31" cy="29" r="7.5" fill="#ffd687"/><path d="M31 22v14m-7-7h14m-12-5 10 10m0-10-10 10" fill="none" stroke="#e79146"/>',
  shrimpSalt: '<path d="M12 26c5-1 5-7 9-7 2-5 7-4 10 1 3 1 5 4 5 6" fill="#e58451"/><path d="M8 26h32c-1 8-6 13-16 13S9 34 8 26z" fill="#f7bdba"/><path d="M13 33c5 3 17 4 22 0" fill="none" stroke="#ad6e69"/><path d="m22 22 1 1m6-2 1 1m-13 1h.1" fill="none"/>',
  chili: '<path d="M33 15c2-6 5-7 8-5" fill="none" stroke="#6c915c" stroke-width="2.5"/><path d="M33 13c9 3 5 10-2 13-5 2-10-1-18 4 6-7 7-15 14-17z" fill="#dd6d56"/><path d="M12 28c6 8 17 6 23 2-2 8-15 11-24 5l-3-5z" fill="#ed9375"/><path d="M24 18c-2 1-3 3-4 5" fill="none" stroke="#ffc1a4"/>',
  oil: bottle('#e4a850', '#e8edc7'),
  mango: '<path d="M23 16c2-6 6-8 12-8-2 5-6 8-12 8z" fill="#719371"/><path d="M10 26c3-11 10-15 18-10 6 5 1 13-6 17-6 4-14 0-12-7z" fill="#acbe72"/><path d="M24 35c7-5 5-11 14-12l1 5c-6 2-5 8-12 11zm-6 1 10-7 2 5-9 7z" fill="#f6d377"/>',
  cilantro: '<path d="M24 37c0-11 3-16 7-23M24 36c-5-9-8-13-15-18" fill="none" stroke="#6f944d" stroke-width="2.4"/><path d="M25 24C20 12 32 8 38 9c-1 9-4 15-13 15zM22 29c-11 1-15-6-15-15 9 0 17 6 15 15zM26 34c3-8 9-8 14-7-1 6-7 9-14 7z" fill="#89a96a"/><path d="m25 24 9-11M11 18l11 11m5 5 9-5" fill="none" stroke="#557a4e"/>',
  egg: '<path d="M10 31c0-7 5-16 11-16s11 9 11 16c0 6-5 8-11 8s-11-2-11-8z" fill="#fff5dc"/><path d="M22 24c0-6 4-13 9-13s9 7 9 13c0 4-4 7-9 7s-9-3-9-7z" fill="#f9ead8"/><ellipse cx="21" cy="29" rx="5.9" ry="6.4" fill="#f5bd58"/><path d="m29 17 1 1m5 4 .5.5" fill="none" stroke="#ad7356"/>',
  peanut: '<path d="M9 24c-1-4 4-7 7-6 4 1 3 5 8 6 4 2 5 7 2 10-3 2-7 1-10-2-5-1-7-4-7-8zm17-2c-1-6 6-13 10-10 5 2 4 8 1 11-1 4-4 6-8 5-3-1-4-3-3-6z" fill="#dfa66b"/><path d="m12 24 12 7m-8-9-2 4m21-12-6 11m8-7-5-1" fill="none" stroke="#aa664a"/>',
  shallot: '<path d="M8 31c6-10 8-17 22-17l3 4c-11 0-14 13-20 16zm13 4c4-6 7-11 17-12l2 4c-7 1-10 6-15 11z" fill="#d9965d"/><path d="M11 31c6-6 9-14 19-15m-4 19c3-4 6-7 12-9" fill="none" stroke="#f9c87a"/>',
  redBeef: dryStrips('#c9765b', '#f0ad80'),
  blackBeef: dryStrips('#815046', '#bc806a'),
  chicken: dryStrips('#e6aa6a', '#f7ce93') + '<path d="M28 17c5-5 8-5 12-5-3 4-6 6-12 5z" fill="#7b9d62"/>',
  tamarind: bottle('#aa694e', '#f7d7a0', '#e7ad77'),
  blackSauce: bottle('#6e4841', '#e9c9cf', '#c98485'),
  squid: dryStrips('#d88b77', '#ffbea2') + '<path d="M15 20c-3 2-8 2-9 5m28 5c5-3 5 1 7 2" fill="none" stroke="#d88b77"/>',
  pack: '<path d="M13 13h21l4 25H9zm0 2v-4l4-3m17 7v-4l-4-3" fill="#fcf0dc"/><path d="m19 34 17-24m-12 25 16-24" stroke="#b47e51" stroke-width="2.2"/><path d="M10 38c5-6 23-6 27 0" fill="none" stroke="#dfb39c"/>',
}

export function food(id: IngredientId): string {
  return '<svg aria-hidden="true" viewBox="0 0 48 48" class="food-art" fill="none"><g ' + outlines + '>' + ingredientArt[id] + '</g></svg>'
}

function portrait(index: number): string {
  const person = profiles[index]
  const hat = person.style === 'rider'
    ? '<path d="M9 22C7 10 14 5 24 5c9 0 16 6 15 16l-10 1-4-6-7 7z" fill="#5c9975"/><path d="M13 13h10" stroke="#cde0ad"/>'
    : person.style === 'reviewer'
      ? '<path d="M9 19c1-10 11-15 21-11l5 8-13 2-8 5zM13 17c-3 0-7 1-8 4 8 2 10-1 18-3" fill="#d38b65"/>'
      : '<path d="M9 24C5 14 11 7 20 7c4-3 12 0 15 3 5 6 3 13 2 16l-5-7c-8 1-12-3-14-5-3 7-7 6-9 10z" fill="' + person.hair + '"/>'
  const collar = person.style === 'school'
    ? '<path d="m16 36 4 4 4-4 4 4 4-4" fill="#fff4e1"/><path d="m24 38-3 7 3 2 3-2z" fill="#c5655c"/>'
    : '<path d="m17 36 7 5 7-5" fill="none" opacity=".55"/>'
  return `<g ${outlines}>
      <path d="M6 48c0-8 8-13 18-13s17 5 18 13z" fill="${person.tint}"/>${collar}
      <path d="M9 26c-1-4-1-8 1-12 2-4 6-7 14-7 9 0 14 5 14 13l-1 9-3 8-20-1z" fill="${person.hair}"/>
      <path d="M11 23c-4-1-5 5-2 7l3 1m24-8c4-1 5 5 2 7l-3 1" fill="${person.skin}"/>
      <path d="M12 19c3-7 19-8 24 1v8c-1 7-6 10-12 10-7 0-12-5-12-12z" fill="${person.skin}"/>${hat}
      <path d="M18 25h.1m11 0h.1" stroke-width="2.5"/><path d="M21 30c1.4 1.6 4.1 1.5 5.4 0" fill="none"/>
      <path d="m14 29 2 .4m16 0 2-.4" stroke="#e58583" opacity=".75"/>
      ${person.style === 'office' ? '<path d="M13 23h8v5h-8zm12 0h8v5h-8zm-4 2h4" fill="none" stroke-width="1"/>' : ''}
      ${person.style === 'school' ? '<path d="m30 16 4 2m-5 0 4 2" stroke="#f8d28c" stroke-width="1.8"/>' : ''}
    </g>`
}

export function avatar(index: number): string {
  return `<svg aria-hidden="true" viewBox="0 0 48 48" class="avatar-art">${portrait(index)}</svg>`
}

export function guestSprite(index: number): string {
  const { tint, skin, hair, style } = profiles[index]
  return `<svg aria-hidden="true" viewBox="0 0 54 68" class="guest-sprite">
    <ellipse cx="27" cy="65" rx="14" ry="2" fill="#bc8f73" opacity=".34"/>
    <g ${outlines}>
      <path class="guest-leg left" d="M19 47h9l-1 14-6 1-2 3H13v-4l5-2z" fill="#887268"/>
      <path class="guest-leg right" d="M29 47h9v15l-4 3H22v-4l7-2z" fill="#97776b"/>
      <path d="M21 33c-5 4-8 10-8 16l10 3 15-3-1-13-7-5z" fill="${tint}"/>
      <path d="m29 38-2 14c0 4 6 5 7 1l2-14" fill="${skin}"/>
      <path d="M20 11c-6 3-7 8-7 13l-4 3 5 3c0 7 5 9 14 8l8-7V15z" fill="${skin}"/>
      <path d="M17 19C10 8 23 2 33 6c12 2 14 17 9 25l-6 5-5-5 2-11c-6 0-11-4-13-7z" fill="${hair}"/>
      ${style === 'office' || style === 'neighbor' ? `<circle cx="42" cy="29" r="6" fill="${hair}"/>` : ''}
      <path d="M30 25c5-3 7 4 2 6" fill="${skin}"/>
      <path d="M17 23h.1" stroke-width="2.5"/>
      <path d="M14 31c2 2 4 2 6 0" fill="none" stroke-width="1"/>
      ${style === 'office' ? '<path d="M11 20h10v7H11zm10 2h10" fill="none" stroke-width="1.2"/>' : ''}
      ${style === 'rider' ? '<path d="M15 17C11 4 38 0 42 15v7H27l-4-5z" fill="#5c9975"/><path d="M11 17h16m-4-7h9" fill="none"/>' : ''}
      ${style === 'reviewer' ? '<path d="M15 15C16 3 34 3 39 15l-14 3H9l-4-3z" fill="#d38b65"/>' : ''}
      ${style === 'school' ? '<path d="m32 11 5 2m-6 1 5 2" stroke="#f8d28c" stroke-width="2"/>' : ''}
    </g>
  </svg>`
}

function cactus(x: number, y: number, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M13 29V16c-12 3-12-9-7-10 5 0 2 7 7 6V8c0-12 11-11 11-1v10c5 1 2-9 7-8 6 1 5 14-7 14v7" fill="#91aa73"/>
    <path d="m17 6 1 3m2 5v4m-3 3 1 3m11-9 2 1" fill="none" stroke="#62855d"/>
    <path d="m8 28 4 14h14l4-14z" fill="#dc9778"/><path d="M7 28h24v4H7z" rx="1" fill="#efb58f"/>
  </g>`
}

function cat(x: number, y: number, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M2 23c5-9 48-11 60-1l-3 9-52 1z" fill="#eab1ae"/><path d="M8 27c10 3 41 2 49-1" fill="none" stroke="#c97e83"/>
    <g class="cat-breathe">
      <path d="M12 22c-3-10 4-16 14-16l4-5 4 7 7 1 5-5 1 9c4 3 3 8 0 11-9 5-26 5-35-2z" fill="#e4a16e"/>
      <path d="M32 22c4-6 13-6 17-1-2 6-15 7-17 1z" fill="#ffe5c7"/>
      <path d="M18 25c8 1 16-1 14-6-2-3-8-3-11 0m1-11 2 5m5-5 2 4m-15 0 3 4m21-3 1 3" fill="none" stroke="#a86c53"/>
      <path d="M35 18c1.4 1.3 2.5 1.2 3.5-.1m5 .6c1.3 1 2.4 1 3.4-.2" fill="none" stroke-width="1.1"/>
      <path d="M40.6 21h.5" stroke="#b66768" stroke-width="1.7"/>
    </g>
  </g>`
}

export function storefront(level: Level): string {
  return `<svg class="store-art" role="img" aria-label="Xe bánh tráng vỉa hè với mái sọc hồng, đèn lồng, chậu cây và mèo mướp ngủ" viewBox="0 0 390 282" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#f5dfcd"/><stop offset="1" stop-color="#fae6c8"/></linearGradient>
      <pattern id="floor" width="52" height="25" patternUnits="userSpaceOnUse" patternTransform="skewX(-27)">
        <path d="M0 0h52v25" stroke="#caa283" stroke-width="1" fill="none" opacity=".48"/>
      </pattern>
    </defs>
    <path d="M0 0h390v282H0z" fill="url(#sky)"/>
    <circle cx="307" cy="68" r="35" fill="#f8d8a6"/>
    <path d="M5 40c10-9 19-10 26-3 10-2 15 2 16 7-11 2-25 3-42 0zm241-21c8-8 17-9 24-3 8-2 15 0 18 5-12 4-26 3-42 1z" fill="#fff4df" opacity=".8"/>
    <g stroke="#aa8c73" stroke-width="1.2" stroke-linejoin="round">
      <path d="M0 173V106l31-24 34 18v73zm329 1v-65l26-16 35 14v67z" fill="#e8bfae"/>
      <path d="M0 105 30 80l37 20m261 11 26-19 36 14" fill="none"/>
      <path d="M16 126h22v38H16zm340-2h20v40h-20z" fill="#e9cdb2"/>
      <path d="M24 126v35m-8-22h22m327-15v40m-9-26h20" fill="none"/>
      <path d="M0 172c63-4 113 5 165 0s148 0 225-1v111H0z" fill="#e8c7aa"/>
      <path d="M0 202h390v80H0z" fill="url(#floor)"/>
      <path d="M0 200c72-3 131 0 196-1s129-4 194 1" fill="none"/>
    </g>
    <g ${outlines}>
      <path d="M29 202c-1-19-1-43-3-59m3 40c8-14 14-23 25-27m-25 22C20 165 13 157 4 151" fill="none" stroke="#6f8661"/>
      <path d="M26 161c-14-3-24-11-23-28 13 2 23 12 23 28zm6 11c7-17 15-19 28-17-4 10-15 17-28 17zm-2-15c-5-8-4-23 7-33 6 13 4 25-7 33z" fill="#a4b384" stroke="#7e916f"/>
      <path d="m12 187 5 26h26l6-26z" fill="#dca084"/><path d="M10 185h41v6H10z" fill="#eeb99a"/>
      <path d="M365 196c0-14 6-28 16-36m-16 29c-1-10-7-19-16-25" fill="none" stroke="#69845e"/>
      <path d="M365 184c-12-2-17-8-20-19 10-1 18 8 20 19zm3-3c2-11 9-20 20-21 1 11-10 18-20 21z" fill="#95a879" stroke="#7c9269"/>
      <path d="m352 195 4 17h18l5-17z" fill="#e5ad85"/>
    </g>
    <ellipse cx="199" cy="247" rx="123" ry="12" fill="#b98b75" opacity=".22"/>
    <g ${outlines} ${level >= 2 ? 'transform="translate(-17 0) scale(1.09 1)"' : ''}>
      <path d="M89 90h10v138H89zm200 1h10v137h-10z" fill="#b77d58"/>
      <path d="M98 109h191v104H98z" fill="#dfad87"/>
      <path d="M106 116h175v64H106z" fill="#a87963"/>
      <path d="M112 121h163v57H112z" fill="#c99071"/>
      <path d="M124 161h121m-121-23h121" fill="none" stroke="#a87460"/>
      <path d="M108 179h178v14H108z" fill="#e9be90"/>
      <path d="M100 198h194v36H100z" rx="4" fill="#e3ae85"/>
      <path d="M104 206h183m-183 13h183m-183 10h183" fill="none" stroke="#bc8867"/>
      <path d="M94 189h206l11 9v8H84v-8z" fill="#b67f5f"/>
      <path d="M84 198h226v7H84z" fill="#ecbb91"/>
      <path d="M297 213h22c4 0 5-3 5-6" fill="none" stroke-width="3"/>
      <circle cx="110" cy="230" r="20" fill="#855e4f"/><circle cx="110" cy="230" r="14" fill="#edc490"/>
      <path d="M110 216v28m-14-14h28m-24-10 20 20m0-20-20 20" stroke="#ac785b"/><circle cx="110" cy="230" r="4" fill="#9d6e55"/>
      <path d="M284 226v18m11-18v18" stroke-width="3"/>
      <path d="M143 213c38-3 72-2 108 0v16c-34 3-68 4-108 0z" fill="#f9d9ad"/>
      <path d="M149 225c0-4 5-7 7-4 2 2-3 6-7 4zm87 0c0-4 5-6 7-4 2 3-3 6-7 4z" fill="#d58e78" stroke="none"/>
      <text x="196" y="225" text-anchor="middle" font-size="8.5" font-weight="900" letter-spacing="1.4" fill="#7a4e3e" stroke="none">TÂY NINH</text>
      <path d="M123 62h144l23 21 10 21H87l10-22z" fill="#f7b8bb"/>
      <path d="m122 62-25 42h27l19-42zm42 0-8 42h25l4-42zm42 0 4 42h25l-8-42zm42 0 17 42h26l-23-42z" fill="#fff1e0" stroke="none"/>
      <path d="M91 102h208v9c-4 8-19 9-25 0-6 9-19 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-7 9-20 8-27 0z" fill="#df8c95"/>
      <path d="M118 103h26v8c-6 9-20 9-26 0zm52 0h26v8c-6 9-20 9-26 0zm52 0h26v8c-6 9-20 9-26 0zm52 0h25v8c-6 9-19 9-25 0z" fill="#fce6d4" stroke="none"/>
      <path d="M91 102h208v9c-4 8-19 9-25 0-6 9-19 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-6 9-20 9-26 0-7 9-20 8-27 0z" fill="none"/>
      <path d="M143 48h104l5 17h-114z" fill="#b7825d"/>
      <path d="${level >= 3 ? 'M114 42c29-7 131-7 160 0l-2 28c-48 5-103 5-156 0z' : 'M131 46c21-4 106-4 126 0l-2 23c-39 3-81 3-122 0z'}" fill="#f7d5a5"/>
      <text x="194" y="61" text-anchor="middle" font-size="${level >= 3 ? 12.8 : 10.4}" font-weight="900" letter-spacing=".65" fill="#704637" stroke="none">BÁNH TRÁNG TRỘN</text>
      <path d="M105 119v9m0 17v7" fill="none"/><ellipse cx="105" cy="137" rx="10" ry="9" fill="#e9a177"/>
      <path d="M102 129c-4 6-4 10 0 16m6-16c4 6 4 10 0 16m-7 5h8" fill="none" stroke="#a96856"/>
      <path d="M192 177h35v9h-35z" fill="#ead6ac"/><path d="M191 174h37v6h-37z" fill="#95a575"/>
      <path d="M179 171h8v15h-8zm-1-3h10v4h-10z" fill="#c97358"/>
      <path d="M154 178h18l-4 8h-11z" fill="#e8a393"/><path d="m155 178 4-5 5 3 4-5 4 7z" fill="#98ad6f"/>
      ${cactus(119, 160, .67)}
      ${cat(232, 159, .93)}
      ${level >= 2 ? '<path d="M114 117c30 14 113 17 163 0" stroke="#845f4d" fill="none"/><g fill="#f9dc8a"><circle cx="134" cy="124" r="3.2"/><circle cx="158" cy="128" r="3.2"/><circle cx="185" cy="130" r="3.2"/><circle cx="214" cy="130" r="3.2"/><circle cx="242" cy="126" r="3.2"/><circle cx="263" cy="121" r="3.2"/></g>' : ''}
      ${level >= 3 ? '<path d="M66 203h11v34H66zm-29 31 9-39 22 2 5 39z" fill="#52705e"/><path d="M44 207h17m-19 7h15m-17 7h19" stroke="#f8e1b1"/><path d="M209 154c2-8 8-8 11 0l5-4v11c-1 6-17 7-18 0v-11z" fill="#ffeed4"/><path d="M207 162h18m-12 2 3 5 3-5" stroke="#b96858"/>' : ''}
      ${level >= 4 ? '<path d="M308 99c20 2 35 6 50 0m-44 0 5 11 7-9m8 2 6 9 6-10m2-1 5 8 5-10" fill="#edaeaa"/><path d="M136 48c22-4 93-4 119 0" stroke="#c78a54" stroke-width="3"/>' : ''}
      <path d="m71 68 2-5 2 5 5 2-5 2-2 5-2-5-5-2zm248 7 2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="#fff2cd" stroke="#b18465" stroke-width="1.1"/>
    </g>
    <path d="M58 260h31m-13 7h37m182-12h33m-9 6h48M11 226h26m321 8h18" stroke="#bb9076" stroke-width="1.1" stroke-linecap="round" opacity=".58"/>
  </svg>`
}

export function bowlArt(bowl?: Bowl): string {
  if (bowl?.pack) {
    const packageArt = bowl.pack === 'bag'
      ? '<path d="M75 30h69l17 61c-21 6-79 6-100 0z" fill="#fff1db" fill-opacity=".84"/><path d="M75 30c0-13 15-21 26-18l8 10 9-10c15-3 26 5 26 18" fill="none"/><path d="M76 80c7-18 50-24 67-7l5 13c-25 4-48 5-77 0z" fill="#e4b77d"/><path d="m87 79 9-5m16 7 7-3m14-3 7 4" stroke="#78975e"/>'
      : '<path d="M55 45h110l-5 42-17 9H78l-18-9z" fill="#e6b88a"/><path d="m65 29 15-13h62l15 11 17 19-11 12H57L45 46z" fill="#f8d8a4"/><path d="M94 38h31" stroke="#a6724d"/>'
    return `<svg class="bowl-art" aria-hidden="true" viewBox="0 0 220 110"><ellipse cx="112" cy="98" rx="69" ry="7" fill="#bc9378" opacity=".22"/><g ${outlines}>${packageArt}<path d="m133 75 43-54m-38 57 43-54" stroke="#99673f" stroke-width="2.6"/></g></svg>`
  }
  const hasRice = !!bowl?.ingredients.rice
  const hasGreen = !!(bowl?.ingredients.cilantro || bowl?.ingredients.mango)
  const hasProtein = !!(bowl?.ingredients.egg || bowl?.ingredients.redBeef || bowl?.ingredients.blackBeef || bowl?.ingredients.chicken || bowl?.ingredients.squid)
  return `<svg class="bowl-art${bowl?.mixing ? ' mixing' : ''}" aria-hidden="true" viewBox="0 0 220 110">
    <ellipse cx="112" cy="96" rx="77" ry="9" fill="#bc9378" opacity=".22"/>
    <g ${outlines} stroke-width="1.8">
      <path d="M24 41c4 32 29 54 86 54 56 0 80-23 86-54z" fill="#b9c2c3"/>
      <path d="M35 58c22 27 100 38 150 4-14 21-39 32-75 32S50 81 35 58z" fill="#96a6a6" stroke="none"/>
      <path d="M42 60c14 14 36 21 55 23m69-11c7-3 11-7 14-10" fill="none" stroke="#f2efdf" stroke-width="2.6"/>
      <ellipse cx="110" cy="40" rx="86" ry="28" fill="#edf0e7"/>
      <ellipse cx="110" cy="40" rx="77" ry="21" fill="#abb8b6"/>
      ${hasRice
        ? `<g transform="translate(44 14) scale(1.98 .94)">${riceStrips}</g>
           <g transform="translate(181 16) scale(-1.98 .91)">${riceStrips}</g>`
        : '<path d="M53 38c23-10 85-14 117 2m-106 9c20 8 68 8 91 2" fill="none" stroke="#d5dfd7" stroke-width="3"/>'}
      ${hasGreen ? '<path d="m64 41 9-5m9 12 10-6m29-3 9 5m17-11 10 4m-6 10 12-5" stroke="#78975e" stroke-width="3"/>' : ''}
      ${bowl?.ingredients.chili ? '<path d="m61 47 7-2m30-3 2 2m36-5 5 2m25 4 4-3" stroke="#b95743" stroke-width="2.2"/>' : ''}
      ${hasProtein ? '<path d="m103 49 11-3m43-8 9 1" stroke="#9d5946" stroke-width="3"/><ellipse cx="119" cy="33" rx="8" ry="4.4" fill="#fff0d6"/><ellipse cx="119" cy="33" rx="3.1" ry="2.1" fill="#e8a94c" stroke="none"/>' : ''}
      ${bowl?.ingredients.peanut || bowl?.ingredients.shallot ? '<path d="m75 48 1 1m27-11 1 1m40 6 1 1m9 3 1 1" stroke="#bc884f" stroke-width="3"/>' : ''}
      <path class="bowl-chopsticks" d="m131 44 57-37m-50 39 58-36" fill="none" stroke="#a87250" stroke-width="3"/>
    </g>
  </svg>`
}


const filledTrays: Partial<Record<IngredientId, string>> = {
  rice: riceStrips,
  mango: '<path d="M5 32 30 12l4 4-25 20zm8 5 21-23 4 3-21 23zm8 2 20-21 4 4-20 20zM5 25l17-14 4 4L9 29zm22 16 16-14 2 5-13 11z" fill="#f1ca68"/><path d="m4 31 5-3m23-13 4-2m6 8 3 1" stroke="#8aa25f" stroke-width="2.4"/>',
  cilantro: '<path d="M9 39 31 13m-9 28L39 18M17 38l-4-17m10 18 10-15" fill="none" stroke="#6c965b"/><path d="M12 30C2 27 4 18 4 16c9 0 14 6 8 14zm6 2c-6-8 0-18 8-20 1 7-1 14-8 20zm12-10c-1-7 5-13 13-12-1 7-6 11-13 12zm-4 12c3-7 13-9 17-5-4 6-9 9-17 5zm-5 8c4-5 11-4 15-1-5 5-10 5-15 1z" fill="#88aa6e"/>',
  egg: '<ellipse cx="15" cy="28" rx="9" ry="10" fill="#fff0da"/><ellipse cx="33" cy="27" rx="9" ry="10" fill="#fff8e5"/><ellipse cx="24" cy="33" rx="8" ry="9" fill="#fff6df"/><ellipse cx="24" cy="33" rx="4" ry="4.8" fill="#efb85e"/><path d="m11 24 .5.3m21-1 .5.4m5 5 .4.3" stroke="#b96854"/>',
  shrimpSalt: '<path d="M7 34c1-6 5-8 8-10 1-4 6-5 8-8 4-1 7 3 9 5 5 2 7 5 9 13-8 7-25 8-34 0z" fill="#d88354"/><path d="M12 34c4 2 16 4 24 0m-20-5h.1m6-6h.1m4 6h.1m5-4h.1m-13 10h.1m13 0h.1" stroke="#f2bd7b" stroke-width="2"/>',
  chili: '<ellipse cx="24" cy="28" rx="18" ry="13" fill="#ecdcbc"/><ellipse cx="24" cy="26" rx="15" ry="10" fill="#af4e39"/><path d="M12 25c9-6 20-6 25 3m-18-4 .5 1m6-2 .5 1m5 3 .5 1m-12 2 .5 1" fill="none" stroke="#f0a262" stroke-width="1.9"/><path d="m27 25 14-14" stroke="#dbb994" stroke-width="3.4"/>',
}

export function trayContents(id: IngredientId): string {
  const art = ingredientArt[id]
  const liquidBottle = id === 'oil' || id === 'tamarind' || id === 'blackSauce'
  const contents = filledTrays[id] ?? (liquidBottle
    ? art
    : `<g transform="translate(15 0) scale(.72)">${art}</g><g transform="translate(0 6) scale(.84)">${art}</g>`)
  return `<svg aria-hidden="true" class="tray-contents" viewBox="0 0 48 48"><g ${outlines}>${contents}</g></svg>`
}
