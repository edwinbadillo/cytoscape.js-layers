import cy from 'cytoscape';
import {
  HTMLLayer,
  ICytoscapeDragLayer,
  ICytoscapeNodeLayer,
  ICytoscapeSelectBoxLayer,
  ILayer,
  ISVGLayer,
  ICanvasLayer,
  IHTMLLayer,
  CytoscapeNodeLayer,
  CytoscapeDragLayer,
  CytoscapeSelectBoxLayer,
  ILayerImpl,
  ILayerElement,
  CanvasLayer,
  SVGLayer,
  IMoveAbleLayer,
  IRenderFunction,
} from './layers';
import { ILayerAdapter } from './layers/ABaseLayer';

export default class LayersPlugin {
  readonly cy: cy.Core;

  readonly nodeLayer: ICytoscapeNodeLayer;
  readonly dragLayer: ICytoscapeDragLayer;
  readonly selectBoxLayer: ICytoscapeSelectBoxLayer;

  private readonly adapter: ILayerAdapter = {
    insert: (where: 'before' | 'after', layer: IMoveAbleLayer, type) =>
      this.insert(where, layer as ILayer & ILayerImpl, type),
    move: (layer: IMoveAbleLayer, offset) => this.move(layer as ILayer & ILayerImpl, offset),
  };

  constructor(cy: cy.Core) {
    this.cy = cy;

    const container = cy.container()!;

    const nodeLayer = new CytoscapeNodeLayer(
      this.adapter,
      container.querySelector<HTMLCanvasElement>('[data-id="layer2-node"]')!
    );
    this.nodeLayer = nodeLayer;

    const dragLayer = new CytoscapeDragLayer(
      this.adapter,
      container.querySelector<HTMLCanvasElement>('[data-id="layer1-drag"]')!
    );
    this.dragLayer = dragLayer;

    const selectBox = new CytoscapeSelectBoxLayer(
      this.adapter,
      container.querySelector<HTMLCanvasElement>('[data-id="layer0-selectbox"]')!
    );
    this.selectBoxLayer = selectBox;

    cy.on('viewport', this.zoomed);
    cy.on('resize', this.resize);
    cy.on('destroy', this.destroy);
  }

  private move(layer: ILayer & ILayerImpl, offset: number) {
    const l = this.layers;
    const index = l.indexOf(layer);
    const target = Math.max(Math.min(index + offset, l.length, 0));
    if (target === index) {
      return;
    }
    if (index >= l.length - 1) {
      this.root.appendChild(layer.root);
    } else {
      this.root.insertBefore(layer.root, l[target].root);
    }
  }

  get document() {
    return this.cy.container()!.ownerDocument;
  }

  get root() {
    return this.nodeLayer.node.parentElement! as HTMLElement;
  }

  private get layers(): readonly (ILayer & ILayerImpl)[] {
    return Array.from(this.root.children)
      .map((d) => ((d as unknown) as ILayerElement).__cy_layer)
      .filter((d) => d != null);
  }

  getLayers(): readonly ILayer[] {
    return this.layers;
  }

  private readonly resize = () => {
    const width = this.cy.width();
    const height = this.cy.height();

    for (const layer of this.layers) {
      layer.resize(width, height);
    }
  };

  private readonly destroy = () => {
    for (const layer of this.layers) {
      layer.remove();
    }

    this.cy.off('destroy', undefined, this.destroy);
    this.cy.off('viewport', undefined, this.zoomed);
    this.cy.off('resize', undefined, this.resize);
    this.cy.scratch('_layers', undefined);
  };

  private readonly zoomed = () => {
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    for (const layer of this.layers) {
      layer.setViewport(pan.x, pan.y, zoom);
    }
  };

  private init<T extends ILayer & ILayerImpl>(layer: T): T {
    layer.resize(this.cy.width(), this.cy.height());
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    layer.setViewport(pan.x, pan.y, zoom);
    return layer;
  }

  update() {
    this.zoomed();
    for (const layer of this.layers) {
      if (layer instanceof CanvasLayer) {
        layer.draw();
      }
    }
  }

  private createLayer(type: 'svg' | 'html' | IRenderFunction) {
    switch (type) {
      case 'svg':
        return this.init(new SVGLayer(this.adapter, this.document));
      case 'html':
        return this.init(new HTMLLayer(this.adapter, this.document));
      default:
        return this.init(new CanvasLayer(this.adapter, this.document, type));
    }
  }

  append(type: 'svg'): ISVGLayer;
  append(type: IRenderFunction): ICanvasLayer;
  append(type: 'html'): IHTMLLayer;
  append(type: 'svg' | 'html' | IRenderFunction) {
    const layer = this.createLayer(type);
    this.root.appendChild(layer.root);
    return layer as any;
  }

  insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'svg'): ISVGLayer;
  insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: IRenderFunction): ICanvasLayer;
  insert(where: 'before' | 'after', layer: ILayer & ILayerImpl, type: 'html'): IHTMLLayer;
  insert(
    where: 'before' | 'after',
    layer: ILayer & ILayerImpl,
    type: 'svg' | 'html' | IRenderFunction
  ): ISVGLayer | ICanvasLayer | IHTMLLayer;
  insert(where: 'before' | 'after', ref: ILayer & ILayerImpl, type: 'svg' | 'html' | IRenderFunction) {
    const layer = this.createLayer(type);
    ref.root.insertAdjacentElement(where === 'before' ? 'beforebegin' : 'afterend', layer.root);
    return layer as any;
  }

  getLast(): ILayer | null {
    const layers = this.layers;
    return layers[layers.length - 1] ?? null;
  }

  getFirst(): ILayer | null {
    const layers = this.layers;
    return layers[0] ?? null;
  }
}

export function layers(this: cy.Core, cy: cy.Core = this) {
  if (!cy.container()) {
    throw new Error('layers plugin does not work in headless environments');
  }
  // ensure just one instance exists
  const singleton = cy.scratch('_layers') as LayersPlugin;
  if (singleton) {
    return singleton;
  }
  const plugin = new LayersPlugin(cy);
  cy.scratch('_layers', plugin);
  return plugin;
}
