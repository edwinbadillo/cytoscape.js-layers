import { ILayerAdapter } from './ABaseLayer';
import { ADOMBaseLayer } from './ADOMBaseLayer';
import { ILayerElement, ILayerImpl, ISVGLayer, ISVGStaticLayer } from './interfaces';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export class SVGLayer extends ADOMBaseLayer<SVGElement> implements ISVGLayer, ILayerImpl {
  readonly type = 'svg';
  readonly node: SVGGElement & ILayerElement;
  updateOnTransform = false;

  constructor(adapter: ILayerAdapter, doc: Document) {
    super(adapter, doc.createElementNS(SVG_NS, 'svg'));
    this.root.__cy_layer = this;
    this.node = (doc.createElementNS(SVG_NS, 'g') as unknown) as SVGGElement & ILayerElement;
    this.node.__cy_layer = this;
    this.root.appendChild(this.node);
  }

  setViewport(tx: number, ty: number, zoom: number) {
    this.node.setAttribute('transform', `translate(${tx},${ty})scale(${zoom})`);
    if (this.updateOnTransform) {
      this.update();
    }
  }
}

export class SVGStaticLayer extends ADOMBaseLayer<SVGElement> implements ISVGStaticLayer, ILayerImpl {
  readonly type = 'svg-static';
  readonly node: SVGGElement & ILayerElement;

  constructor(adapter: ILayerAdapter, doc: Document) {
    super(adapter, doc.createElementNS(SVG_NS, 'svg'));
    this.root.__cy_layer = this;
    this.node = (doc.createElementNS(SVG_NS, 'g') as unknown) as SVGGElement & ILayerElement;
    this.node.__cy_layer = this;
    this.root.appendChild(this.node);
  }

  setViewport() {
    // dummy
  }
}
