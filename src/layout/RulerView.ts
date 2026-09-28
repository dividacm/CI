import { createHorizontalRulerTicks, mmToPx } from './RulerModel';

export interface RulerViewOptions {
  pageWidthMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}

export function renderHorizontalRuler(root: HTMLElement, options: RulerViewOptions): void {
  const ticks = createHorizontalRulerTicks(options.pageWidthMm, 10);
  const fragment = root.ownerDocument.createDocumentFragment();

  root.innerHTML = '';
  root.setAttribute('aria-label', 'Régua horizontal em milímetros');
  root.setAttribute('role', 'img');

  for (const tick of ticks) {
    const mark = root.ownerDocument.createElement('span');
    mark.className = tick.major ? 'ruler-tick ruler-tick-major' : 'ruler-tick';
    mark.style.left = `${tick.positionPx}px`;
    mark.setAttribute('aria-hidden', 'true');

    const label = root.ownerDocument.createElement('span');
    label.className = 'ruler-label';
    label.textContent = String(tick.valueMm);
    label.setAttribute('aria-hidden', 'true');

    mark.appendChild(label);
    fragment.appendChild(mark);
  }

  const contentStart = root.ownerDocument.createElement('span');
  contentStart.className = 'ruler-margin-marker ruler-margin-left';
  contentStart.style.left = `${mmToPx(options.marginLeftMm)}px`;
  contentStart.setAttribute('aria-hidden', 'true');

  const contentEnd = root.ownerDocument.createElement('span');
  contentEnd.className = 'ruler-margin-marker ruler-margin-right';
  contentEnd.style.left = `${mmToPx(options.pageWidthMm - options.marginRightMm)}px`;
  contentEnd.setAttribute('aria-hidden', 'true');

  fragment.append(contentStart, contentEnd);
  root.appendChild(fragment);
}
