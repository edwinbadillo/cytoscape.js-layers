import { ILayerAdapter } from './ABaseLayer';
import { ADOMBaseLayer } from './ADOMBaseLayer';
import { IHTMLLayer, IHTMLStaticLayer, ILayerElement, ILayerImpl } from './interfaces';

export class HTMLLayer extends ADOMBaseLayer<HTMLElement> implements IHTMLLayer, ILayerImpl {
  readonly type = 'html';
  readonly node: HTMLDivElement & ILayerElement;
  updateOnTransform = false;

  constructor(adapter: ILayerAdapter, doc: Document) {
    super(adapter, doc.createElement('div'));
    this.root.__cy_layer = this;
    this.node = (doc.createElement('div') as unknown) as HTMLDivElement & ILayerElement;
    this.node.__cy_layer = this;
    this.node.style.position = 'absolute';
    this.node.style.left = '0px';
    this.node.style.top = '0px';
    this.root.appendChild(this.node);
  }

  setViewport(tx: number, ty: number, zoom: number) {
    this.node.style.transform = `translate(${tx}px,${ty}px)scale(${zoom})`;
    if (this.updateOnTransform) {
      this.update();
    }
  }
}

export class HTMLStaticLayer extends ADOMBaseLayer<HTMLElement> implements IHTMLStaticLayer, ILayerImpl {
  readonly type = 'html-static';

  constructor(adapter: ILayerAdapter, doc: Document) {
    super(adapter, doc.createElement('div'));
    this.node.__cy_layer = this;
  }

  get node() {
    return this.root;
  }

  setViewport() {
    // dummy
  }
}
