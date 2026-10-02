    interactions.setElements([createGraphicElement({
      id: 'smartart-render-process',
      kind: 'smartart',
      smartArt: {
        layout: 'process',
        nodes: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ],
      },
    })]);

    expect([...root.querySelectorAll('.smartart-process .smartart-node')].map((node) => node.textContent)).toEqual(['A', 'B', 'C']);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-render-process"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    expect(interactions.setSelectedSmartArtLayout('cycle')).toBe(true);
    expect([...root.querySelectorAll('.smartart-cycle .smartart-node')].map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
  });

});