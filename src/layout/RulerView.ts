import { createHorizontalRulerTicks, mmToPx, pxToMm } from './RulerModel';

export type RulerMarginSide = 'left' | 'right';
export type RulerMarginChangeHandler = (side: RulerMarginSide, valueMm: number) => void;

export interface RulerViewOptions {
  pageWidthMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}

export function renderHorizontalRuler(
  root: HTMLElement,
  options: RulerViewOptions,
  onMarginChange?: RulerMarginChangeHandler,
): void {
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

  const contentStart = createMarginMarker(root, 'left', options.marginLeftMm, options, onMarginChange);
  const contentEnd = createMarginMarker(root, 'right', options.marginRightMm, options, onMarginChange);

  fragment.append(contentStart, contentEnd);
  root.appendChild(fragment);
}

function createMarginMarker(
  root: HTMLElement,
  side: RulerMarginSide,
  marginMm: number,
  options: RulerViewOptions,
  onMarginChange?: RulerMarginChangeHandler,
): HTMLElement {
  const marker = root.ownerDocument.createElement('span');
  marker.className = `ruler-margin-marker ruler-margin-${side}`;
  marker.style.left = `${mmToPx(side === 'left' ? marginMm : options.pageWidthMm - marginMm)}px`;
  marker.setAttribute('role', 'slider');
  marker.setAttribute('tabindex', '0');
  marker.setAttribute('aria-label', side === 'left' ? 'Margem esquerda' : 'Margem direita');
  marker.setAttribute('aria-valuemin', '0');
  marker.setAttribute('aria-valuemax', String(maxMarginMm(side, options)));
  marker.setAttribute('aria-valuenow', String(marginMm));
  marker.setAttribute('aria-valuetext', `${marginMm} milímetros`);
  marker.setAttribute('title', `${side === 'left' ? 'Margem esquerda' : 'Margem direita'}: ${marginMm} mm`);

  if (!onMarginChange) return marker;

  let dragging = false;

  const updateFromClientX = (clientX: number): void => {
    const rect = root.getBoundingClientRect();
    if (rect.width <= 0) return;

    const positionPx = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const positionMm = Math.round(pxToMm(positionPx));
    const valueMm = side === 'left'
      ? clampMargin(positionMm, maxMarginMm(side, options))
      : clampMargin(options.pageWidthMm - positionMm, maxMarginMm(side, options));

    onMarginChange(side, valueMm);
  };

  marker.addEventListener('pointerdown', (event) => {
    dragging = true;
    marker.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  marker.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  });

  const stopDragging = (): void => {
    dragging = false;
  };

  marker.addEventListener('pointerup', stopDragging);
  marker.addEventListener('pointercancel', stopDragging);

  marker.addEventListener('keydown', (event) => {
    let delta = 0;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = 1;
    if (event.shiftKey && delta !== 0) delta *= 10;

    if (event.key === 'Home') {
      delta = -marginMm;
    } else if (event.key === 'End') {
      delta = maxMarginMm(side, options) - marginMm;
    }

    if (delta === 0) return;
    event.preventDefault();
    onMarginChange(side, clampMargin(marginMm + delta, maxMarginMm(side, options)));
  });

  return marker;
}

function maxMarginMm(side: RulerMarginSide, options: RulerViewOptions): number {
  return Math.max(0, options.pageWidthMm - (side === 'left' ? options.marginRightMm : options.marginLeftMm));
}

function clampMargin(valueMm: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, Math.round(valueMm)));
}
